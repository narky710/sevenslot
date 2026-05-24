import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import { supabase } from '../supabase/client'

interface Row {
  session_id: string
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

interface EventRow {
  event_id: number
  created_at: string
  game: string
  wagered_cents: number
  returned_cents: number
  fp_debited_cents: number
  regular_debited_cents: number
  balance_after_cents: number
}

interface Props {
  row: Row
  onClose: () => void
}

function errorMessage(e: unknown): string {
  if (typeof e === 'string') return e
  if (e && typeof e === 'object') {
    const obj = e as Record<string, unknown>
    if (typeof obj.message === 'string' && obj.message) return obj.message
    try { return JSON.stringify(e) } catch { /* fall through */ }
  }
  return String(e)
}

function formatCents(n: number): string {
  const neg = n < 0
  const dollars = Math.abs(n) / 100
  return `${neg ? '-' : ''}$${dollars.toFixed(2)}`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function SessionDetailDrawer({ row, onClose }: Props) {
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)

  const fetchEvents = useCallback(async () => {
    try {
      const { data, error: rpcErr } = await supabase.rpc('admin_get_session_events', { p_session_id: row.session_id })
      if (rpcErr) throw rpcErr
      setEvents((data ?? []) as EventRow[])
      setError(null)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [row.session_id])

  useEffect(() => {
    void fetchEvents()
    if (row.status === 'active') {
      const id = window.setInterval(fetchEvents, 5000)
      return () => window.clearInterval(id)
    }
  }, [fetchEvents, row.status])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const t0 = useMemo(() => new Date(row.opened_at).getTime(), [row.opened_at])

  const balanceSeries = useMemo(
    () =>
      events.map((e) => {
        const ts = new Date(e.created_at).getTime()
        const wagered = e.wagered_cents
        const returned = e.returned_cents
        return {
          t: ts,
          tLabel: formatTime(e.created_at),
          balance: e.balance_after_cents,
          pl: returned - wagered,
        }
      }),
    [events],
  )

  const runningRtpSeries = useMemo(() => {
    let cumWager = 0
    let cumReturn = 0
    return events.map((e) => {
      cumWager += e.wagered_cents
      cumReturn += e.returned_cents
      const rtp = cumWager > 0 ? (cumReturn / cumWager) * 100 : 0
      return { tLabel: formatTime(e.created_at), rtp, cumWager, cumReturn }
    })
  }, [events])

  const betSeries = useMemo(
    () =>
      events.map((e, i) => ({
        idx: i + 1,
        fp: e.fp_debited_cents,
        regular: Math.max(e.regular_debited_cents, e.wagered_cents - e.fp_debited_cents),
        tLabel: formatTime(e.created_at),
      })),
    [events],
  )

  return (
    <div
      ref={overlayRef}
      onMouseDown={(e) => { if (e.target === overlayRef.current) onClose() }}
      style={styles.overlay}
      role="dialog"
      aria-modal="true"
    >
      <div style={styles.drawer} onMouseDown={(e) => e.stopPropagation()}>
        <header style={styles.header}>
          <div>
            <div style={styles.title}>
              <span style={styles.username}>{row.username}</span>
              <span style={row.status === 'active' ? styles.badgeActive : styles.badgeClosed}>
                {row.status === 'active' ? '● ACTIVE' : 'CLOSED'}
              </span>
            </div>
            <div style={styles.subhead}>
              {row.game ?? '—'} · {row.spin_count} spin{row.spin_count === 1 ? '' : 's'} · opened {new Date(row.opened_at).toLocaleString()}
              {row.closed_at && ` · closed ${new Date(row.closed_at).toLocaleString()}`}
            </div>
          </div>
          <button onClick={onClose} style={styles.close} aria-label="Close">✕</button>
        </header>

        <section style={styles.metrics}>
          <Metric label="Total funds" value={formatCents(row.total_funds_cents)} />
          <Metric label="Regular" value={formatCents(row.balance_cents)} />
          <Metric label="Free play" value={formatCents(row.free_play_cents)} />
          <Metric label="P/L" value={`${row.loss_cents > 0 ? '-' : row.loss_cents < 0 ? '+' : ''}${formatCents(Math.abs(row.loss_cents))}`} />
          <Metric label="Wagered" value={formatCents(row.wagered_cents)} />
          <Metric label="Returned" value={formatCents(row.returned_cents)} />
        </section>

        {error && <div style={styles.error}>{error}</div>}
        {loading && events.length === 0 && <div style={styles.empty}>Loading events…</div>}
        {!loading && events.length === 0 && <div style={styles.empty}>No spin events recorded for this session.</div>}

        {events.length > 0 && (
          <>
            <ChartBlock title="Balance over time">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={balanceSeries}>
                  <CartesianGrid stroke="#2A56D8" strokeOpacity={0.25} />
                  <XAxis dataKey="tLabel" stroke="#8AA4FF" tick={{ fontSize: 10 }} minTickGap={40} />
                  <YAxis stroke="#8AA4FF" tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 100).toFixed(0)}`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCents(v)} />
                  <Legend wrapperStyle={legendStyle} />
                  <Line type="monotone" dataKey="balance" stroke="#FFD93D" dot={false} name="Balance" />
                  <Line type="monotone" dataKey="pl" stroke="#7CFC9F" dot={false} name="Per-event P/L" />
                </LineChart>
              </ResponsiveContainer>
            </ChartBlock>

            <ChartBlock title="Running RTP">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={runningRtpSeries}>
                  <CartesianGrid stroke="#2A56D8" strokeOpacity={0.25} />
                  <XAxis dataKey="tLabel" stroke="#8AA4FF" tick={{ fontSize: 10 }} minTickGap={40} />
                  <YAxis stroke="#8AA4FF" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v.toFixed(1)}%`} />
                  <Line type="monotone" dataKey="rtp" stroke="#FFD93D" dot={false} name="Cumulative RTP" />
                </LineChart>
              </ResponsiveContainer>
            </ChartBlock>

            <ChartBlock title="Bet size per event (FP vs regular)">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={betSeries}>
                  <CartesianGrid stroke="#2A56D8" strokeOpacity={0.25} />
                  <XAxis dataKey="idx" stroke="#8AA4FF" tick={{ fontSize: 10 }} minTickGap={20} />
                  <YAxis stroke="#8AA4FF" tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 100).toFixed(2)}`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCents(v)} labelFormatter={(_, p) => p?.[0]?.payload?.tLabel ?? ''} />
                  <Legend wrapperStyle={legendStyle} />
                  <Bar dataKey="fp" stackId="bet" fill="#7CFC9F" name="Free play" />
                  <Bar dataKey="regular" stackId="bet" fill="#FFD93D" name="Regular" />
                </BarChart>
              </ResponsiveContainer>
            </ChartBlock>
          </>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.metric}>
      <div style={styles.metricLabel}>{label}</div>
      <div style={styles.metricValue}>{value}</div>
    </div>
  )
}

function ChartBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={styles.chartBlock}>
      <h3 style={styles.chartTitle}>{title}</h3>
      {children}
    </section>
  )
}

const tooltipStyle: React.CSSProperties = {
  background: '#0d0d18',
  border: '1px solid #2A56D8',
  borderRadius: 6,
  color: '#fff',
  fontSize: 12,
}
const legendStyle: React.CSSProperties = { fontSize: 11 }

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
    display: 'flex', justifyContent: 'flex-end', zIndex: 1000,
  },
  drawer: {
    width: 'min(680px, 60vw)', maxWidth: '95vw', height: '100%',
    background: '#0d0d18', color: '#fff', overflowY: 'auto', padding: 20,
    borderLeft: '1px solid #2A56D8',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: 'flex', flexDirection: 'column', gap: 16,
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  title: { display: 'flex', alignItems: 'center', gap: 10 },
  username: { fontSize: 18, fontWeight: 700, color: '#FFD93D' },
  subhead: { marginTop: 4, fontSize: 12, opacity: 0.75 },
  close: { background: 'transparent', border: '1px solid #2A56D8', color: '#8AA4FF', padding: '6px 12px', borderRadius: 4, cursor: 'pointer' },
  metrics: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 },
  metric: { background: '#16162a', borderRadius: 6, padding: '8px 10px' },
  metricLabel: { fontSize: 10, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 0.5 },
  metricValue: { fontSize: 14, fontFamily: 'ui-monospace, monospace', marginTop: 2 },
  chartBlock: { background: '#16162a', border: '1px solid #2A56D8', borderRadius: 8, padding: 12 },
  chartTitle: { margin: 0, marginBottom: 8, fontSize: 13, color: '#FFD93D' },
  error: { background: '#3a1212', border: '1px solid #ff5252', color: '#ffb3b3', padding: 10, borderRadius: 6, fontSize: 12 },
  empty: { padding: 20, textAlign: 'center', opacity: 0.65, fontSize: 13 },
  badgeActive: { display: 'inline-block', padding: '2px 8px', background: '#0e3a1a', color: '#7CFC9F', border: '1px solid #7CFC9F', borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: 0.5 },
  badgeClosed: { display: 'inline-block', padding: '2px 8px', background: '#16162a', color: '#8AA4FF', border: '1px solid #2A56D8', borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: 0.5 },
}
