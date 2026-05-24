import React, { useEffect, useRef, useState } from 'react'
import { GAMES, GameId } from './catalog/games'
import TripleSevensView from './games/tripleSevens/TripleSevensView'
import DoubleUpKenoView from './games/doubleUpKeno/DoubleUpKenoView'
import DiamondRichesView from './games/diamondRiches/DiamondRichesView'
import { useSession } from './supabase/useSession'
import { useWallet } from './supabase/useWallet'
import { usePlaySession } from './supabase/usePlaySession'
import { supabase } from './supabase/client'
import { isAutoSpinningNow, subscribeActivity, subscribeAutoSpin } from './idle/IdleSignal'
import AuthScreen from './components/AuthScreen'
import Chrome from './components/Chrome'
import AdminPage from './components/AdminPage'
import './styles/index.css'

type Route = { kind: 'lobby' } | { kind: 'game'; id: GameId } | { kind: 'admin' }

export default function App() {
  const { session, loading } = useSession()

  if (loading) return <div style={loadingStyle}>Loading…</div>
  if (!session) return <AuthScreen />
  return <Authenticated userId={session.user.id} />
}

function Authenticated({ userId }: { userId: string }) {
  const wallet = useWallet(userId)
  const playSession = usePlaySession(userId)
  const [route, setRoute] = useState<Route>({ kind: 'lobby' })
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  // True while we're intentionally closing the session via the exit flow;
  // this suppresses the "auto-closed by idle" detector that would otherwise
  // also fire when sessionId transitions to null.
  const expectingCloseRef = useRef(false)

  // ── Idle auto-signout (15 min of no user input).
  //    Admin accounts are exempt — they often leave the dashboard open.
  //    Reset triggers: mousemove, mousedown, keydown, touchstart on document,
  //    plus any successful play RPC via IdleSignal.notifyActivity. The timer
  //    is fully suspended while a game is running AUTO SPIN — the user is
  //    engaged with the game even if their fingers aren't on the screen.
  useEffect(() => {
    if (wallet.isAdmin) return
    const IDLE_MS = 15 * 60 * 1000
    let timer: number | null = null
    let autoSpinning = isAutoSpinningNow()
    const clearTimer = () => {
      if (timer !== null) { window.clearTimeout(timer); timer = null }
    }
    const reset = () => {
      clearTimer()
      if (autoSpinning) return // suspended while auto-spinning
      timer = window.setTimeout(async () => {
        try {
          window.sessionStorage.setItem('sevenslot:signedOutReason', 'inactivity')
        } catch { /* sessionStorage can throw in private mode */ }
        await supabase.auth.signOut()
      }, IDLE_MS)
    }
    const events: Array<keyof DocumentEventMap> = ['mousemove','mousedown','keydown','touchstart']
    events.forEach((e) => document.addEventListener(e, reset, { passive: true }))
    const unsubAct = subscribeActivity(reset)
    const unsubAuto = subscribeAutoSpin((running) => {
      autoSpinning = running
      reset() // re-evaluates the timer with the new flag
    })
    reset()
    return () => {
      clearTimer()
      events.forEach((e) => document.removeEventListener(e, reset))
      unsubAct()
      unsubAuto()
    }
  }, [wallet.isAdmin])

  // Poll the play session while inside a game route. If the server auto-closes
  // the session (10-min idle sweeper), this is how the client notices.
  useEffect(() => {
    if (route.kind !== 'game') return
    const id = window.setInterval(() => { void playSession.refresh() }, 30_000)
    return () => window.clearInterval(id)
  }, [route.kind, playSession])

  // When sessionId drops to null while we're still in a game route AND we
  // weren't the ones who closed it → it was the idle sweeper. Toast + lobby.
  useEffect(() => {
    if (route.kind === 'game' && !playSession.loading && playSession.sessionId === null) {
      if (!expectingCloseRef.current) {
        setNotice('Session ended due to inactivity, please re-enter.')
        setRoute({ kind: 'lobby' })
      }
    }
    if (playSession.sessionId !== null) {
      expectingCloseRef.current = false
    }
  }, [route, playSession.sessionId, playSession.loading])

  async function selectGame(id: GameId) {
    if (busy) return
    setBusy(true); setNotice(null)
    try {
      await playSession.open()
      await wallet.refresh()
      setRoute({ kind: 'game', id })
    } catch (e) {
      setNotice(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function exitGame() {
    if (busy) return
    setBusy(true)
    expectingCloseRef.current = true
    try {
      await playSession.close()
      await wallet.refresh()
    } catch (e) {
      // Even if close fails, route back to lobby — but report what went wrong.
      setNotice(errorMessage(e))
    } finally {
      setRoute({ kind: 'lobby' })
      setBusy(false)
    }
  }

  const goLobby = () => setRoute({ kind: 'lobby' })

  let body: React.ReactNode
  if (route.kind === 'admin') {
    body = <AdminPage onExit={goLobby} />
  } else if (route.kind === 'game' && route.id === 'tripleSevens') {
    body = (
      <TripleSevensView
        onExit={exitGame}
        initialBalanceCents={wallet.balanceCents ?? 0}
        freePlayCents={wallet.freePlayCents ?? 0}
        onBalanceChange={(cents) => { wallet.setBalance(cents); void wallet.refresh() }}
      />
    )
  } else if (route.kind === 'game' && route.id === 'doubleUpKeno') {
    body = (
      <DoubleUpKenoView
        onExit={exitGame}
        initialBalanceCents={wallet.balanceCents ?? 0}
        freePlayCents={wallet.freePlayCents ?? 0}
        onBalanceChange={(cents) => { wallet.setBalance(cents); void wallet.refresh() }}
      />
    )
  } else if (route.kind === 'game' && route.id === 'diamondRiches') {
    body = (
      <DiamondRichesView
        onExit={exitGame}
        initialBalanceCents={wallet.balanceCents ?? 0}
        freePlayCents={wallet.freePlayCents ?? 0}
        onBalanceChange={(cents) => { wallet.setBalance(cents); void wallet.refresh() }}
      />
    )
  } else {
    body = (
      <Lobby
        onSelect={selectGame}
        busy={busy}
        notice={notice}
        onDismissNotice={() => setNotice(null)}
      />
    )
  }

  const scrollableRoute = route.kind === 'admin'
  return (
    <div style={scrollableRoute ? scrollWrapStyle : undefined}>
      <Chrome
        wallet={wallet}
        session={playSession}
        onOpenAdmin={wallet.isAdmin ? () => setRoute({ kind: 'admin' }) : undefined}
      />
      {body}
    </div>
  )
}

const scrollWrapStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  overflowY: 'auto',
  overflowX: 'hidden',
  WebkitOverflowScrolling: 'touch',
}

interface LobbyProps {
  onSelect: (id: GameId) => void
  busy: boolean
  notice: string | null
  onDismissNotice: () => void
}

function Lobby({ onSelect, busy, notice, onDismissNotice }: LobbyProps) {
  return (
    <div style={lobbyStyles.stage}>
      <h1 style={lobbyStyles.title}>SEVENSLOT</h1>
      <p style={lobbyStyles.subtitle}>
        {busy ? 'Opening session…' : 'Choose a game'}
      </p>
      {notice && (
        <div style={lobbyStyles.notice} role="status">
          <span>{notice}</span>
          <button onClick={onDismissNotice} style={lobbyStyles.noticeClose} aria-label="Dismiss">×</button>
        </div>
      )}
      <div style={lobbyStyles.grid}>
        {GAMES.map((g) => {
          const enabled = g.playable && !busy
          return (
            <button
              key={g.id}
              onClick={() => enabled && onSelect(g.id)}
              disabled={!enabled}
              style={{
                ...lobbyStyles.card,
                opacity: enabled ? 1 : 0.5,
                cursor: enabled ? 'pointer' : 'default',
                borderColor: g.featured ? '#FFD93D' : '#2A56D8',
              }}
              aria-label={`${g.title}${g.featured ? ', featured' : ''}`}
            >
              {g.featured && <span style={lobbyStyles.badge}>NEW</span>}
              <h2 style={lobbyStyles.cardTitle}>{g.title}</h2>
              <p style={lobbyStyles.tagline}>{g.tagline}</p>
              <span style={lobbyStyles.status}>
                {!g.playable ? 'COMING SOON' : busy ? 'OPENING…' : 'PLAY'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function errorMessage(e: unknown): string {
  if (typeof e === 'string') return e
  if (e && typeof e === 'object') {
    const obj = e as Record<string, unknown>
    if (typeof obj.message === 'string' && obj.message) return obj.message
    const inner = obj.error
    if (inner && typeof inner === 'object' && typeof (inner as Record<string, unknown>).message === 'string') {
      return (inner as Record<string, string>).message
    }
    if (typeof obj.hint === 'string' && obj.hint) return obj.hint
    if (typeof obj.details === 'string' && obj.details) return obj.details
    try { return JSON.stringify(e) } catch { /* fall through */ }
  }
  return String(e)
}

const loadingStyle: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: '#0d0d18', color: '#fff', fontFamily: '-apple-system, sans-serif',
}

const lobbyStyles: Record<string, React.CSSProperties> = {
  stage: {
    width: '100%',
    maxWidth: 720,
    margin: '0 auto',
    padding: 24,
    color: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    textAlign: 'center',
  },
  title: { fontSize: 32, fontWeight: 800, color: '#FFD93D', letterSpacing: 2, margin: '12px 0 4px' },
  subtitle: { fontSize: 14, opacity: 0.7, marginBottom: 24 },
  notice: {
    background: '#3a1212',
    color: '#ffb3b3',
    border: '1px solid #ff5252',
    padding: '10px 12px',
    borderRadius: 6,
    fontSize: 13,
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    textAlign: 'left',
  },
  noticeClose: {
    background: 'transparent',
    color: '#ffb3b3',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
    padding: 0,
    lineHeight: 1,
  },
  grid: { display: 'grid', gridTemplateColumns: '1fr', gap: 12 },
  card: {
    position: 'relative',
    background: '#16162a',
    border: '2px solid #2A56D8',
    borderRadius: 12,
    padding: 20,
    color: '#fff',
    textAlign: 'left',
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    background: '#FFD93D',
    color: '#0d0d18',
    fontSize: 11,
    fontWeight: 800,
    padding: '2px 8px',
    borderRadius: 4,
  },
  cardTitle: { margin: 0, fontSize: 18, fontWeight: 700 },
  tagline: { margin: '6px 0 8px', fontSize: 13, opacity: 0.7 },
  status: { fontSize: 12, color: '#8AA4FF', fontWeight: 700, letterSpacing: 1 },
}
