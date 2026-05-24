import React, { useState } from 'react'
import { supabase } from '../supabase/client'
import { signOut } from '../supabase/auth'
import type { WalletState } from '../supabase/useWallet'
import type { PlaySessionState } from '../supabase/usePlaySession'

interface Props {
  wallet: WalletState
  session: PlaySessionState
  onOpenAdmin?: () => void
}

// Top bar. Sit Down / Cash Out are now automatic (sit on game enter, cash on
// game exit) and live in App.tsx — removed from here. We keep the session
// indicator so the player can see when a session is open and how close the
// loss meter is to the cap.
export default function Chrome({ wallet, session, onOpenAdmin }: Props) {
  const [busy, setBusy] = useState(false)
  const [grant, setGrant] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function onClaimGrant() {
    setBusy(true); setErr(null); setGrant(null)
    try {
      const { data, error } = await supabase.rpc('claim_daily_grant')
      if (error) throw error
      const row = data?.[0]
      if (row) {
        setGrant(row.granted_cents > 0
          ? `+${formatCents(row.granted_cents)} added`
          : `Already claimed today. Next at ${new Date(row.next_claim_at).toLocaleString()}`)
        await wallet.refresh()
      }
    } catch (e) { setErr(errorMessage(e)) }
    finally { setBusy(false) }
  }

  return (
    <div style={styles.bar}>
      <div style={styles.left}>
        <span style={styles.user}>{wallet.username ?? '…'}</span>
        <div style={styles.balanceBlock}>
          <span style={styles.balance}>{formatCents(wallet.totalCents ?? wallet.balanceCents ?? 0)}</span>
          {wallet.freePlayCents != null && wallet.freePlayCents > 0 && (
            <span style={styles.fpHint}>incl. {formatCents(wallet.freePlayCents)} free play</span>
          )}
        </div>
      </div>

      <div style={styles.middle}>
        {session.sessionId ? (
          <>
            <span style={styles.sessionLabel}>SESSION OPEN</span>
            <span style={styles.lossMeter}>
              Loss {formatCents(session.lossCents ?? 0)} / {formatCents(session.maxLossCents ?? 0)}
            </span>
          </>
        ) : (
          <span style={styles.sessionLabelDim}>No session</span>
        )}
      </div>

      <div style={styles.right}>
        {onOpenAdmin && (
          <button onClick={onOpenAdmin} disabled={busy} style={styles.btnGhost}>Admin</button>
        )}
        <button onClick={onClaimGrant} disabled={busy} style={styles.btnGhost}>Daily +$5</button>
        <button onClick={() => signOut()} disabled={busy} style={styles.btnGhost}>Sign out</button>
      </div>

      {(grant || err) && (
        <div style={styles.toastRow}>
          {grant && <div style={styles.toastOk}>{grant}</div>}
          {err && <div style={styles.toastErr}>{err}</div>}
        </div>
      )}
    </div>
  )
}

function formatCents(n: number): string {
  const dollars = n / 100
  return `$${dollars.toFixed(2)}`
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

const styles: Record<string, React.CSSProperties> = {
  bar: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    background: '#0d0d18',
    borderBottom: '1px solid #2A56D8',
    padding: '10px 16px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
    color: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 13,
  },
  left: { display: 'flex', alignItems: 'center', gap: 12 },
  user: { fontWeight: 700, color: '#FFD93D' },
  balanceBlock: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 },
  balance: { padding: '4px 10px', background: '#16162a', borderRadius: 4, fontFamily: 'ui-monospace, monospace' },
  fpHint: { fontSize: 10, opacity: 0.7, paddingLeft: 4 },
  middle: { flex: 1, display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' },
  sessionLabel: { color: '#7CFC9F', fontWeight: 700, letterSpacing: 1 },
  sessionLabelDim: { opacity: 0.5 },
  lossMeter: { fontSize: 12, opacity: 0.85, fontFamily: 'ui-monospace, monospace' },
  right: { display: 'flex', gap: 8 },
  btnGhost: { padding: '6px 12px', background: 'transparent', color: '#8AA4FF', border: '1px solid #2A56D8', borderRadius: 4, cursor: 'pointer' },
  toastRow: { flexBasis: '100%', display: 'flex', flexDirection: 'column', gap: 6 },
  toastOk: { background: '#0e3a1a', color: '#7CFC9F', padding: 8, borderRadius: 4, fontSize: 12 },
  toastErr: { background: '#3a1212', color: '#ffb3b3', padding: 8, borderRadius: 4, fontSize: 12 },
}
