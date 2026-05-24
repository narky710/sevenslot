import { useCallback, useEffect, useState } from 'react'
import { supabase } from './client'

export interface PlaySessionState {
  sessionId: string | null
  serverSeedHash: string | null
  openedAt: string | null
  maxLossCents: number | null
  lossCents: number | null
  loading: boolean
  open: () => Promise<void>
  close: () => Promise<{ seedHex: string; lossCents: number; spinCount: number } | null>
  refresh: () => Promise<void>
}

export function usePlaySession(userId: string | null): PlaySessionState {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [serverSeedHash, setServerSeedHash] = useState<string | null>(null)
  const [openedAt, setOpenedAt] = useState<string | null>(null)
  const [maxLossCents, setMaxLossCents] = useState<number | null>(null)
  const [lossCents, setLossCents] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!userId) {
      setSessionId(null); setServerSeedHash(null); setOpenedAt(null)
      setMaxLossCents(null); setLossCents(null); setLoading(false)
      return
    }
    const { data } = await supabase
      .from('play_sessions')
      .select('id, server_seed_hash, opened_at, max_loss_cents, loss_cents')
      .eq('user_id', userId)
      .is('closed_at', null)
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data) {
      setSessionId(data.id)
      setServerSeedHash(data.server_seed_hash)
      setOpenedAt(data.opened_at)
      setMaxLossCents(data.max_loss_cents)
      setLossCents(data.loss_cents)
    } else {
      setSessionId(null); setServerSeedHash(null); setOpenedAt(null)
      setMaxLossCents(null); setLossCents(null)
    }
    setLoading(false)
  }, [userId])

  useEffect(() => { void refresh() }, [refresh])

  const open = useCallback(async () => {
    const { data, error } = await supabase.rpc('open_play_session', {})
    if (error) throw error
    const row = data?.[0]
    if (row) {
      setSessionId(row.session_id)
      setServerSeedHash(row.server_seed_hash)
      setOpenedAt(row.opened_at)
      setMaxLossCents(row.max_loss_cents)
      setLossCents(0)
    }
  }, [])

  const close = useCallback(async () => {
    const { data, error } = await supabase.rpc('close_play_session')
    if (error) throw error
    const row = data?.[0]
    setSessionId(null); setServerSeedHash(null); setOpenedAt(null)
    setMaxLossCents(null); setLossCents(null)
    return row ? { seedHex: row.server_seed_hex, lossCents: row.loss_cents, spinCount: row.spin_count } : null
  }, [])

  return { sessionId, serverSeedHash, openedAt, maxLossCents, lossCents, loading, open, close, refresh }
}
