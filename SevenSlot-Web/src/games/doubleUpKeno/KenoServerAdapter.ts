import { supabase } from '../../supabase/client'
import { notifyActivity } from '../../idle/IdleSignal'
import {
  KenoState,
  KenoPhase,
  MIN_BET_CENTS,
  MAX_BET_CENTS,
  BET_STEP_CENTS,
  MIN_SPOTS,
  MAX_SPOTS,
  NUM_BALLS,
} from '../../engine/DoubleUpKenoEngine'

function makeRoundId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `keno-${Date.now()}-${Math.floor(Math.random() * 1e9).toString(16)}`
}

/**
 * Server-authoritative renderer adapter for Double-Up Keno. Mirrors the
 * surface of DoubleUpKenoEngine so the existing view doesn't have to know
 * who's deciding outcomes — server RPCs drive bet/win + draws, this class
 * just reshapes responses into KenoState.
 */
export class KenoServerAdapter {
  private state: KenoState
  private currentRoundId: string | null = null

  constructor(initialBalanceCents: number) {
    this.state = {
      credits: initialBalanceCents,
      picks: [],
      drawnNumbers: [],
      firstHalfDrawn: [],
      currentBet: MIN_BET_CENTS,
      roundBet: MIN_BET_CENTS,
      lastHits: 0,
      lastWinAmount: 0,
      phase: 'idle',
      spinCount: 0,
      coinIn: 0,
      coinOut: 0,
      gameEvents: [],
    }
  }

  setBalance(cents: number): void { this.state.credits = cents }
  getState(): KenoState { return this.state }

  selectSpot(n: number): boolean {
    if (this.state.phase !== 'idle') return false
    if (n < 1 || n > NUM_BALLS) return false
    if (this.state.picks.length >= MAX_SPOTS) return false
    if (this.state.picks.includes(n)) return false
    this.state.picks = [...this.state.picks, n].sort((a, b) => a - b)
    return true
  }

  clearSpot(n: number): boolean {
    if (this.state.phase !== 'idle') return false
    if (!this.state.picks.includes(n)) return false
    this.state.picks = this.state.picks.filter((x) => x !== n)
    return true
  }

  wipeCard(): void {
    if (this.state.phase !== 'idle') return
    this.state.picks = []
  }

  quickPick(count: number): void {
    if (this.state.phase !== 'idle') return
    const want = Math.max(MIN_SPOTS, Math.min(MAX_SPOTS, Math.floor(count)))
    const all = new Set<number>()
    while (all.size < want) all.add(1 + Math.floor(Math.random() * NUM_BALLS))
    this.state.picks = [...all].sort((a, b) => a - b)
  }

  setBet(amountCents: number): void {
    if (this.state.phase !== 'idle') return
    const stepped = Math.round(amountCents / BET_STEP_CENTS) * BET_STEP_CENTS
    const clamped = Math.max(MIN_BET_CENTS, Math.min(MAX_BET_CENTS, stepped))
    this.state.currentBet = clamped
    this.state.roundBet = clamped
  }

  async play(): Promise<number> {
    if (this.state.phase !== 'idle') return 0
    if (this.state.picks.length < MIN_SPOTS) return 0

    const roundId = makeRoundId()
    const { data, error } = await supabase.rpc('play_keno_open', {
      p_round_id: roundId,
      p_picks: this.state.picks,
      p_bet_cents: this.state.currentBet,
    })
    if (error) throw error
    const row = data?.[0]
    if (!row) throw new Error('play_keno_open returned no row')

    // Successful play RPC counts as activity for the 15-min auto-signout.
    notifyActivity()

    this.currentRoundId = roundId
    this.state.drawnNumbers = [...row.first_half]
    this.state.firstHalfDrawn = [...row.first_half]
    this.state.roundBet = this.state.currentBet
    this.state.credits = Number(row.new_balance_cents)
    this.state.phase = 'awaitingChoice' as KenoPhase
    return Number(row.first_half_hits)
  }

  async doubleUp(): Promise<number> {
    return this.resolve(true)
  }

  async stay(): Promise<number> {
    return this.resolve(false)
  }

  private async resolve(doubleUp: boolean): Promise<number> {
    if (this.state.phase !== 'awaitingChoice' || !this.currentRoundId) return 0
    const { data, error } = await supabase.rpc('play_keno_resolve', {
      p_round_id: this.currentRoundId,
      p_double_up: doubleUp,
    })
    if (error) throw error
    const row = data?.[0]
    if (!row) throw new Error('play_keno_resolve returned no row')

    // Successful play RPC counts as activity for the 15-min auto-signout.
    notifyActivity()

    this.state.drawnNumbers = [...row.all_balls]
    this.state.lastHits = Number(row.total_hits)
    this.state.roundBet = Number(row.round_bet_cents)
    this.state.lastWinAmount = Number(row.total_win_cents)
    this.state.credits = Number(row.new_balance_cents)
    this.state.spinCount += 1
    this.state.coinIn += this.state.roundBet
    this.state.coinOut += this.state.lastWinAmount
    this.state.phase = 'resolved'
    return this.state.lastWinAmount
  }

  newRound(): void {
    this.currentRoundId = null
    this.state.drawnNumbers = []
    this.state.firstHalfDrawn = []
    this.state.lastHits = 0
    this.state.lastWinAmount = 0
    this.state.roundBet = this.state.currentBet
    this.state.phase = 'idle'
  }
}
