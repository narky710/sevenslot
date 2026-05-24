import { supabase } from '../../supabase/client'
import { notifyActivity } from '../../idle/IdleSignal'
import type { GameState } from '../../engine/TripleSevenEngine'

const SYMBOL_NAMES = [
  'Red 7','White 7','Blue 7','Rainbow 7',
  'Triple BAR','Double BAR','Single BAR',
  'Bell',
  'Cherry','Apple','Watermelon','Orange','Plum','Lemon',
]

const REEL_WEIGHTS = [2,2,2,1,3,4,5,3,8,7,8,9,9,10]
const TOTAL_WEIGHT = 73

const PAYLINES: ReadonlyArray<readonly [number, number, number]> = [
  [3,4,5],[0,1,2],[6,7,8],[0,4,8],[6,4,2],[0,3,6],[1,4,7],[2,5,8],
]

function makeSpinId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `t7-${Date.now()}-${Math.floor(Math.random() * 1e9).toString(16)}`
}

/**
 * Client-side renderer adapter for Triple Sevens. The server owns outcomes;
 * this class just calls play_triple7 and shapes the response into the
 * GameState the existing view expects.
 */
export class Triple7ServerAdapter {
  private credits: number
  private reelPositions: [number, number, number, number, number, number, number, number, number]
  private lastWinAmount = 0
  private isSpinning = false
  private spinCount = 0
  private coinIn = 0
  private coinOut = 0
  private lastWinningLines: number[] = []
  private lastJackpotWon: string | null = null
  private lastJackpotAmount = 0

  constructor(initialBalanceCents: number) {
    this.credits = initialBalanceCents
    this.reelPositions = [0,0,0,0,0,0,0,0,0]
  }

  setBalance(cents: number): void { this.credits = cents }

  pickRandomSymbolIndex(): number {
    const r = Math.floor(Math.random() * TOTAL_WEIGHT)
    let cum = 0
    for (let i = 0; i < REEL_WEIGHTS.length; i++) {
      cum += REEL_WEIGHTS[i]
      if (r < cum) return i
    }
    return REEL_WEIGHTS.length - 1
  }

  getSymbolNames(): string[] { return SYMBOL_NAMES }
  getPaylines(): ReadonlyArray<readonly [number, number, number]> { return PAYLINES }

  getState(): GameState {
    return {
      credits: this.credits,
      reelPositions: this.reelPositions,
      lastWinAmount: this.lastWinAmount,
      isSpinning: this.isSpinning,
      spinCount: this.spinCount,
      coinIn: this.coinIn,
      coinOut: this.coinOut,
      gameEvents: [],
    }
  }

  getWinningLines(_positions: number[], _bet?: number): number[] {
    return this.lastWinningLines
  }

  getLastJackpot(): { tier: string; amountCents: number } | null {
    if (!this.lastJackpotWon) return null
    return { tier: this.lastJackpotWon, amountCents: this.lastJackpotAmount }
  }

  async spin(totalBetCents: number): Promise<number> {
    this.isSpinning = true
    const spinId = makeSpinId()
    const { data, error } = await supabase.rpc('play_triple7', {
      p_spin_id: spinId,
      p_total_bet_cents: totalBetCents,
    })
    this.isSpinning = false
    if (error) throw error
    const row = data?.[0]
    if (!row) throw new Error('play_triple7 returned no row')

    // Successful play RPC counts as activity for the 15-min auto-signout.
    notifyActivity()

    this.reelPositions = row.grid as [number, number, number, number, number, number, number, number, number]
    this.lastWinAmount = Number(row.total_win_cents)
    this.lastWinningLines = (row.winning_lines as number[]).map((n) => n - 1)
    this.lastJackpotWon = row.jackpot_won
    this.lastJackpotAmount = Number(row.jackpot_amount_cents)
    this.credits = Number(row.new_balance_cents)
    this.spinCount += 1
    this.coinIn += totalBetCents
    this.coinOut += this.lastWinAmount

    return this.lastWinAmount
  }
}
