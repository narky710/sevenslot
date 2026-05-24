import React, { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase/client'
import { validateAccountId } from '../supabase/auth'
import SessionDetailDrawer from './SessionDetailDrawer'

interface Props {
  onExit: () => void
}

type Tab = 'create' | 'adjust' | 'sessions'
type SessionFilter = 'all' | 'active' | 'closed'

export default function AdminPage({ onExit }: Props) {
  const [tab, setTab] = useState<Tab>('create')
  return (
    <div style={styles.stage}>
      <div style={styles.header}>
        <button onClick={onExit} style={styles.back}>← Back</button>
        <h1 style={styles.title}>Admin</h1>
      </div>
      <div style={styles.tabs}>
        <TabButton active={tab === 'create'} onClick={() => setTab('create')}>Create account</TabButton>
        <TabButton active={tab === 'adjust'} onClick={() => setTab('adjust')}>Adjust funds</TabButton>
        <TabButton active={tab === 'sessions'} onClick={() => setTab('sessions')}>Sessions</TabButton>
      </div>
      {tab === 'create' && <CreateAccountTab />}
      {tab === 'adjust' && <AdjustFundsTab />}
      {tab === 'sessions' && <SessionsTab />}
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ ...styles.tab, ...(active ? styles.tabActive : {}) }}>
      {children}
    </button>
  )
}

interface CreatedAccount {
  account_id: string
  password: string
  password_was_generated: boolean
  user_id: string
}

function CreateAccountTab() {
  const [accountId, setAccountId] = useState('')
  const [password, setPassword] = useState('')
  const [autoPassword, setAutoPassword] = useState(true)
  const [grantCents, setGrantCents] = useState('5000')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<CreatedAccount | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setCreated(null)
    const idErr = validateAccountId(accountId)
    if (idErr) { setError(idErr); return }
    if (!autoPassword && password.length < 8) {
      setError('Password must be at least 8 characters (or use auto-generate)')
      return
    }
    const grant = Math.max(0, Math.floor(Number(grantCents) || 0))
    setBusy(true)
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke('admin-create-account', {
        body: { account_id: accountId, password: autoPassword ? undefined : password, grant_cents: grant },
      })
      if (invokeErr) throw invokeErr
      if (data?.error) throw new Error(data.error)
      setCreated(data as CreatedAccount)
      setAccountId(''); setPassword('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} style={styles.card}>
        <label style={styles.label}>
          Account ID
          <input value={accountId} onChange={(e) => setAccountId(e.target.value)}
            placeholder="2–24 letters/numbers/underscore" style={styles.input} disabled={busy} autoComplete="off" />
        </label>
        <label style={styles.checkboxRow}>
          <input type="checkbox" checked={autoPassword} onChange={(e) => setAutoPassword(e.target.checked)} disabled={busy} />
          Auto-generate a 14-character password
        </label>
        {!autoPassword && (
          <label style={styles.label}>
            Password
            <input type="text" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters" style={styles.input} disabled={busy} autoComplete="off" />
          </label>
        )}
        <label style={styles.label}>
          Starting balance (cents)
          <input type="number" min={0} step={100} value={grantCents}
            onChange={(e) => setGrantCents(e.target.value)} style={styles.input} disabled={busy} />
          <span style={styles.hint}>Default 5000 = $50.00. Overrides the standard signup grant.</span>
        </label>
        {error && <div style={styles.error}>{error}</div>}
        <button type="submit" disabled={busy} style={styles.primary}>{busy ? 'Creating…' : 'Create account'}</button>
      </form>

      {created && (
        <div style={styles.created}>
          <h2 style={styles.createdHeading}>Account created — share these credentials with the player</h2>
          <div style={styles.credRow}>
            <span style={styles.credLabel}>Account ID</span>
            <code style={styles.credValue}>{created.account_id}</code>
            <button onClick={() => navigator.clipboard.writeText(created.account_id)} style={styles.copyBtn}>Copy</button>
          </div>
          <div style={styles.credRow}>
            <span style={styles.credLabel}>Password {created.password_was_generated && '(auto-generated)'}</span>
            <code style={styles.credValue}>{created.password}</code>
            <button onClick={() => navigator.clipboard.writeText(created.password)} style={styles.copyBtn}>Copy</button>
          </div>
          <p style={styles.warn}>This password is shown <strong>once</strong>. Copy it now.</p>
          <button onClick={() => setCreated(null)} style={styles.secondary}>Dismiss</button>
        </div>
      )}
    </>
  )
}

interface AccountRow {
  user_id: string
  username: string
  balance_cents: number
  free_play_cents: number
  total_funds_cents: number
  is_admin: boolean
  created_at: string
}

type FundType = 'regular' | 'free_play'

function AdjustFundsTab() {
  const [accounts, setAccounts] = useState<AccountRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const fetchAccounts = useCallback(async () => {
    try {
      const { data, error: rpcErr } = await supabase.rpc('admin_list_accounts')
      if (rpcErr) throw rpcErr
      setAccounts((data ?? []) as AccountRow[])
      setError(null)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchAccounts() }, [fetchAccounts])

  const updateBalances = useCallback((userId: string, newBalanceCents: number, newFreePlayCents: number) => {
    setAccounts((prev) => prev.map((a) =>
      a.user_id === userId
        ? { ...a, balance_cents: newBalanceCents, free_play_cents: newFreePlayCents, total_funds_cents: newBalanceCents + newFreePlayCents }
        : a))
  }, [])

  const q = query.trim().toLowerCase()
  const filtered = q ? accounts.filter((a) => a.username.toLowerCase().includes(q)) : accounts

  return (
    <div style={{ ...styles.card, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, opacity: 0.7 }}>
          {loading ? 'Loading…' : `${accounts.length} account${accounts.length === 1 ? '' : 's'}`}
        </span>
        <button onClick={fetchAccounts} style={styles.secondary}>Refresh</button>
      </div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter by username…"
        style={{ ...styles.input, marginBottom: 10 }}
      />
      {error && <div style={styles.error}>{error}</div>}
      {!loading && filtered.length === 0 && <div style={styles.empty}>No accounts match.</div>}
      <div style={styles.cardList}>
        {filtered.map((a) => (
          <AccountRowItem key={a.user_id} account={a} onApplied={updateBalances} />
        ))}
      </div>
    </div>
  )
}

const AccountRowItem = React.memo(function AccountRowItem({
  account, onApplied,
}: { account: AccountRow; onApplied: (userId: string, newBalance: number, newFreePlay: number) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [deltaDollars, setDeltaDollars] = useState('')
  const [reason, setReason] = useState('')
  const [fundType, setFundType] = useState<FundType>('regular')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function onApply(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setSuccess(null)
    const cents = Math.round(Number(deltaDollars) * 100)
    if (!Number.isFinite(cents) || cents === 0) { setError('Delta must be a nonzero dollar amount'); return }
    if (!reason.trim()) { setError('Reason is required'); return }
    setBusy(true)
    try {
      const { data, error: rpcErr } = await supabase.rpc('admin_adjust_funds', {
        p_account_id: account.username,
        p_delta_cents: cents,
        p_reason: reason.trim(),
        p_fund_type: fundType,
      })
      if (rpcErr) throw rpcErr
      const row = data?.[0] as { new_balance_cents: number; new_free_play_cents: number } | undefined
      if (row) {
        onApplied(account.user_id, row.new_balance_cents, row.new_free_play_cents)
        const label = fundType === 'free_play' ? 'free-play' : 'regular'
        setSuccess(`${cents > 0 ? '+' : ''}${formatCents(cents)} (${label}) applied. Regular ${formatCents(row.new_balance_cents)} · FP ${formatCents(row.new_free_play_cents)}.`)
        setDeltaDollars(''); setReason('')
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={styles.sessionCard}>
      <div style={styles.cardHeader}>
        <span style={styles.cardAccount}>
          {account.username}
          {account.is_admin && <span style={{ ...styles.badgeClosed, marginLeft: 8 }}>ADMIN</span>}
        </span>
        <span style={{ ...styles.cardCellValue, marginTop: 0 }}>{formatCents(account.total_funds_cents)}</span>
      </div>
      <div style={styles.cardSubhead}>
        Regular {formatCents(account.balance_cents)} · FP {formatCents(account.free_play_cents)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => setExpanded((v) => !v)} style={styles.secondary}>
          {expanded ? 'Cancel' : 'Adjust funds'}
        </button>
      </div>
      {expanded && (
        <form onSubmit={onApply} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={styles.chipRow}>
            <FilterChip active={fundType === 'regular'} onClick={() => setFundType('regular')}>Regular</FilterChip>
            <FilterChip active={fundType === 'free_play'} onClick={() => setFundType('free_play')}>Free Play</FilterChip>
          </div>
          <label style={styles.label}>
            Delta (dollars — negative to remove)
            <input type="number" step="0.01" value={deltaDollars}
              onChange={(e) => setDeltaDollars(e.target.value)} style={styles.input} disabled={busy}
              placeholder="e.g. 25.00 or -10.50" />
          </label>
          <label style={styles.label}>
            Reason (audit log)
            <input value={reason} onChange={(e) => setReason(e.target.value)}
              style={styles.input} disabled={busy} placeholder="e.g. promo credit, refund" />
          </label>
          {error && <div style={styles.error}>{error}</div>}
          {success && <div style={styles.success}>{success}</div>}
          <button type="submit" disabled={busy} style={styles.primary}>{busy ? 'Applying…' : 'Apply adjustment'}</button>
        </form>
      )}
    </div>
  )
})

interface SessionRecord {
  session_id: string
  user_id: string
  username: string
  game: string | null
  status: 'active' | 'closed'
  opened_at: string
  closed_at: string | null
  loss_cents: number
  max_loss_cents: number
  spin_count: number
  balance_cents: number
  free_play_cents: number
  total_funds_cents: number
  wagered_cents: number
  returned_cents: number
}

const RTP_NOISY_THRESHOLD = 20

function rtpDisplay(row: SessionRecord): { text: string; dim: boolean } {
  if (row.wagered_cents <= 0) return { text: '—', dim: true }
  const pct = (row.returned_cents / row.wagered_cents) * 100
  const noisy = row.spin_count < RTP_NOISY_THRESHOLD
  return { text: `${noisy ? '~' : ''}${pct.toFixed(1)}%`, dim: noisy }
}

function avgBetDisplay(row: SessionRecord): string {
  if (row.spin_count <= 0) return '—'
  return formatCents(Math.round(row.wagered_cents / row.spin_count))
}

function durationLabel(row: SessionRecord): string {
  if (row.status === 'active') return relativeTime(row.opened_at)
  if (!row.closed_at) return relativeTime(row.opened_at)
  const ms = new Date(row.closed_at).getTime() - new Date(row.opened_at).getTime()
  const m = Math.max(0, Math.floor(ms / 60000))
  if (m < 1) return '<1m'
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function useIsNarrow(breakpoint = 640): boolean {
  const get = () => typeof window !== 'undefined' && window.innerWidth < breakpoint
  const [narrow, setNarrow] = useState(get)
  useEffect(() => {
    const onResize = () => setNarrow(get())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [breakpoint])
  return narrow
}

function SessionsTab() {
  const [rows, setRows] = useState<SessionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0) // re-tick clock for relative times
  const [filter, setFilter] = useState<SessionFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const lastFetchRef = useRef<number>(0)
  const narrow = useIsNarrow()

  const fetchRows = useCallback(async () => {
    try {
      const { data, error: rpcErr } = await supabase.rpc('admin_list_sessions', { p_closed_limit: 50 })
      if (rpcErr) throw rpcErr
      setRows((data ?? []) as SessionRecord[])
      setError(null)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
      lastFetchRef.current = Date.now()
    }
  }, [])

  const filtered = rows.filter((r) => filter === 'all' || r.status === filter)
  const activeCount = rows.filter((r) => r.status === 'active').length
  const closedCount = rows.length - activeCount

  useEffect(() => {
    void fetchRows()
    const id = window.setInterval(fetchRows, 5000)
    return () => window.clearInterval(id)
  }, [fetchRows])

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 15000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div style={{ ...styles.card, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, opacity: 0.7 }}>
          {loading ? 'Loading…' : `${activeCount} active · ${closedCount} recent closed — refreshes every 5s`}
        </span>
        <button onClick={fetchRows} style={styles.secondary}>Refresh</button>
      </div>
      <div style={styles.chipRow}>
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>All ({rows.length})</FilterChip>
        <FilterChip active={filter === 'active'} onClick={() => setFilter('active')}>Active ({activeCount})</FilterChip>
        <FilterChip active={filter === 'closed'} onClick={() => setFilter('closed')}>Closed ({closedCount})</FilterChip>
      </div>
      {error && <div style={styles.error}>{error}</div>}
      {!loading && filtered.length === 0 && <div style={styles.empty}>No sessions to show.</div>}
      {filtered.length > 0 && narrow && (
        <div style={styles.cardList}>
          {filtered.map((r) => <SessionCard key={r.session_id} row={r} tick={tick} />)}
        </div>
      )}
      {filtered.length > 0 && !narrow && (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Account</th>
                <th style={styles.th}>Game</th>
                <th style={styles.th}>Opened</th>
                <th style={styles.thNum}>Balance</th>
                <th style={styles.thNum}>P/L</th>
                <th style={styles.thNum}>Cap</th>
                <th style={styles.thNum}>% to cap</th>
                <th style={styles.thNum}>RTP</th>
                <th style={styles.thNum}>Spins</th>
                <th style={styles.thNum}>Avg bet</th>
                <th style={styles.thNum}>Play-through</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => <SessionRow key={r.session_id} row={r} tick={tick} onClick={() => setSelectedId(r.session_id)} />)}
            </tbody>
          </table>
        </div>
      )}
      {selectedId && (() => {
        const selected = rows.find((r) => r.session_id === selectedId)
        if (!selected) { setSelectedId(null); return null }
        return <SessionDetailDrawer row={selected} onClose={() => setSelectedId(null)} />
      })()}
    </div>
  )
}

function pctToCap(row: SessionRecord): number {
  return row.max_loss_cents > 0 ? Math.min(100, Math.max(0, (row.loss_cents / row.max_loss_cents) * 100)) : 0
}
function plColor(row: SessionRecord): string {
  return row.loss_cents > 0 ? '#ff8a8a' : row.loss_cents < 0 ? '#7CFC9F' : '#ddd'
}
function plFormatted(row: SessionRecord): string {
  const sign = row.loss_cents > 0 ? '-' : row.loss_cents < 0 ? '+' : ''
  return `${sign}${formatCents(Math.abs(row.loss_cents))}`
}

function StatusBadge({ status }: { status: 'active' | 'closed' }) {
  return (
    <span style={status === 'active' ? styles.badgeActive : styles.badgeClosed}>
      {status === 'active' ? '● ACTIVE' : 'CLOSED'}
    </span>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ ...styles.chip, ...(active ? styles.chipActive : {}) }}>{children}</button>
  )
}

const SessionRow = React.memo(function SessionRow({ row, tick: _tick, onClick }: { row: SessionRecord; tick: number; onClick?: () => void }) {
  const dim = row.status === 'closed' ? { opacity: 0.78 } : null
  return (
    <tr style={{ ...(dim ?? {}), cursor: onClick ? 'pointer' : undefined }} onClick={onClick}>
      <td style={styles.td}><StatusBadge status={row.status} /></td>
      <td style={styles.td}>{row.username}</td>
      <td style={styles.td}>{row.game ?? '—'}</td>
      <td style={styles.td}>{row.status === 'active' ? relativeTime(row.opened_at) : `${durationLabel(row)} session`}</td>
      <td style={styles.tdNum}>
        {formatCents(row.total_funds_cents)}
        {row.free_play_cents > 0 && (
          <div style={{ fontSize: 10, opacity: 0.65 }}>FP {formatCents(row.free_play_cents)}</div>
        )}
      </td>
      <td style={{ ...styles.tdNum, color: plColor(row) }}>{plFormatted(row)}</td>
      <td style={styles.tdNum}>{formatCents(row.max_loss_cents)}</td>
      <td style={styles.tdNum}>{pctToCap(row).toFixed(0)}%</td>
      <td style={{ ...styles.tdNum, opacity: rtpDisplay(row).dim ? 0.55 : 1 }}>{rtpDisplay(row).text}</td>
      <td style={styles.tdNum}>{row.spin_count}</td>
      <td style={styles.tdNum}>{avgBetDisplay(row)}</td>
      <td style={styles.tdNum}>{formatCents(row.wagered_cents)}</td>
    </tr>
  )
})

const SessionCard = React.memo(function SessionCard({ row, tick: _tick }: { row: SessionRecord; tick: number }) {
  return (
    <div style={{ ...styles.sessionCard, ...(row.status === 'closed' ? { opacity: 0.85 } : null) }}>
      <div style={styles.cardHeader}>
        <span style={styles.cardAccount}>{row.username}</span>
        <span style={styles.cardGame}>{row.game ?? '—'}</span>
      </div>
      <div style={styles.cardSubhead}>
        <StatusBadge status={row.status} />
        {' · '}
        {row.status === 'active'
          ? `Opened ${relativeTime(row.opened_at)}`
          : `Lasted ${durationLabel(row)}`}
        {' · '}{row.spin_count} spin{row.spin_count === 1 ? '' : 's'}
      </div>
      <div style={styles.cardGrid}>
        <CardCell label="Total funds" value={formatCents(row.total_funds_cents)} />
        <CardCell label="P/L" value={plFormatted(row)} valueColor={plColor(row)} />
        <CardCell label="Regular" value={formatCents(row.balance_cents)} />
        <CardCell label="Free play" value={formatCents(row.free_play_cents)} dim={row.free_play_cents === 0} />
        <CardCell label="Play-through" value={formatCents(row.wagered_cents)} />
        <CardCell label="RTP" value={rtpDisplay(row).text} dim={rtpDisplay(row).dim} />
        <CardCell label="Avg bet" value={avgBetDisplay(row)} />
        <CardCell label="% to cap" value={`${pctToCap(row).toFixed(0)}%`} />
      </div>
    </div>
  )
})

function CardCell({ label, value, valueColor, dim }: { label: string; value: string; valueColor?: string; dim?: boolean }) {
  return (
    <div style={styles.cardCell}>
      <div style={styles.cardCellLabel}>{label}</div>
      <div style={{ ...styles.cardCellValue, ...(valueColor ? { color: valueColor } : null), ...(dim ? { opacity: 0.55 } : null) }}>{value}</div>
    </div>
  )
}

function formatCents(n: number): string {
  const negative = n < 0
  const dollars = Math.abs(n) / 100
  return `${negative ? '-' : ''}$${dollars.toFixed(2)}`
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Math.max(0, Date.now() - then)
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  const rm = m % 60
  return `${h}h ${rm}m ago`
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
  stage: {
    maxWidth: 880, margin: '0 auto', padding: 24, color: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 },
  back: { background: 'transparent', border: '1px solid #2A56D8', color: '#8AA4FF', padding: '6px 12px', borderRadius: 4, cursor: 'pointer' },
  title: { margin: 0, fontSize: 22, fontWeight: 700, color: '#FFD93D' },
  tabs: { display: 'flex', gap: 6, marginBottom: 16, borderBottom: '1px solid #2A56D8', paddingBottom: 4 },
  tab: { padding: '8px 14px', background: 'transparent', border: 'none', color: '#8AA4FF', cursor: 'pointer', fontSize: 13, borderRadius: 4 },
  tabActive: { background: '#16162a', color: '#FFD93D', fontWeight: 700 },
  card: { background: '#16162a', border: '1px solid #2A56D8', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 },
  label: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, opacity: 0.9 },
  input: { padding: '10px 12px', background: '#0d0d18', border: '1px solid #2A56D8', color: '#fff', borderRadius: 6, fontSize: 14 },
  checkboxRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 },
  hint: { fontSize: 11, opacity: 0.6 },
  error: { background: '#3a1212', border: '1px solid #ff5252', color: '#ffb3b3', padding: 10, borderRadius: 6, fontSize: 13 },
  success: { background: '#0e3a1a', border: '1px solid #7CFC9F', color: '#7CFC9F', padding: 10, borderRadius: 6, fontSize: 13 },
  primary: { padding: '10px 16px', background: '#FFD93D', border: 'none', color: '#0d0d18', fontWeight: 700, borderRadius: 6, cursor: 'pointer' },
  created: {
    marginTop: 20, background: '#0e3a1a', border: '1px solid #7CFC9F', borderRadius: 12, padding: 20,
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  createdHeading: { margin: 0, fontSize: 16, fontWeight: 700, color: '#7CFC9F' },
  credRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 },
  credLabel: { width: 100, opacity: 0.8 },
  credValue: { flex: 1, padding: '6px 10px', background: '#0d0d18', borderRadius: 4, fontFamily: 'ui-monospace, monospace', wordBreak: 'break-all' },
  copyBtn: { padding: '6px 10px', background: '#16162a', border: '1px solid #7CFC9F', color: '#7CFC9F', borderRadius: 4, cursor: 'pointer', fontSize: 12 },
  warn: { fontSize: 12, opacity: 0.8, margin: 0 },
  secondary: { padding: '6px 12px', background: 'transparent', border: '1px solid #7CFC9F', color: '#7CFC9F', borderRadius: 4, cursor: 'pointer', fontSize: 12 },
  empty: { padding: 20, textAlign: 'center', opacity: 0.6, fontSize: 13 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: { textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #2A56D8', color: '#8AA4FF', fontWeight: 600 },
  thNum: { textAlign: 'right', padding: '8px 10px', borderBottom: '1px solid #2A56D8', color: '#8AA4FF', fontWeight: 600 },
  td: { padding: '8px 10px', borderBottom: '1px solid #1a1a30' },
  tdNum: { padding: '8px 10px', borderBottom: '1px solid #1a1a30', textAlign: 'right', fontFamily: 'ui-monospace, monospace' },
  cardList: { display: 'flex', flexDirection: 'column', gap: 8 },
  sessionCard: { background: '#0d0d18', border: '1px solid #2A56D8', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  cardAccount: { fontWeight: 700, color: '#FFD93D', fontSize: 14, wordBreak: 'break-all' },
  cardGame: { fontSize: 12, color: '#8AA4FF', textAlign: 'right' },
  cardSubhead: { fontSize: 11, opacity: 0.7 },
  cardGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  cardCell: { background: '#16162a', borderRadius: 6, padding: '6px 10px' },
  cardCellLabel: { fontSize: 10, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardCellValue: { fontSize: 14, fontFamily: 'ui-monospace, monospace', marginTop: 2 },
  chipRow: { display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  chip: { padding: '4px 10px', background: 'transparent', border: '1px solid #2A56D8', color: '#8AA4FF', borderRadius: 999, cursor: 'pointer', fontSize: 11 },
  chipActive: { background: '#FFD93D', borderColor: '#FFD93D', color: '#0d0d18', fontWeight: 700 },
  badgeActive: { display: 'inline-block', padding: '2px 6px', background: '#0e3a1a', color: '#7CFC9F', border: '1px solid #7CFC9F', borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: 0.5 },
  badgeClosed: { display: 'inline-block', padding: '2px 6px', background: '#16162a', color: '#8AA4FF', border: '1px solid #2A56D8', borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: 0.5 },
}
