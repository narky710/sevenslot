import { useCallback, useEffect, useState } from 'react'
import { supabase } from './client'

export interface WalletState {
  balanceCents: number | null
  freePlayCents: number | null
  totalCents: number | null
  username: string | null
  isAdmin: boolean
  loading: boolean
  refresh: () => Promise<void>
  setBalance: (cents: number) => void
}

export function useWallet(userId: string | null): WalletState {
  const [balanceCents, setBalanceCents] = useState<number | null>(null)
  const [freePlayCents, setFreePlayCents] = useState<number | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!userId) {
      setBalanceCents(null)
      setFreePlayCents(null)
      setUsername(null)
      setIsAdmin(false)
      setLoading(false)
      return
    }
    const [{ data: w }, { data: p }] = await Promise.all([
      supabase.from('wallets').select('balance_cents, free_play_cents').eq('user_id', userId).maybeSingle(),
      supabase.from('profiles').select('username, is_admin').eq('id', userId).maybeSingle(),
    ])
    setBalanceCents(w?.balance_cents ?? 0)
    setFreePlayCents((w as { free_play_cents?: number } | null)?.free_play_cents ?? 0)
    setUsername(p?.username ?? null)
    setIsAdmin(p?.is_admin ?? false)
    setLoading(false)
  }, [userId])

  useEffect(() => { void refresh() }, [refresh])

  const totalCents = balanceCents == null && freePlayCents == null
    ? null
    : (balanceCents ?? 0) + (freePlayCents ?? 0)

  return {
    balanceCents,
    freePlayCents,
    totalCents,
    username,
    isAdmin,
    loading,
    refresh,
    setBalance: setBalanceCents,
  }
}
