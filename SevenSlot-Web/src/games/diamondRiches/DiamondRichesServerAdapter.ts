import { supabase } from '../../supabase/client'
import { notifyActivity } from '../../idle/IdleSignal'
import {
  DEFAULT_LINE_BET_CENTS,
  DEFAULT_LINE_COUNT,
  LINE_BET_STEPS_CENTS,
  MAX_SELECTABLE_LINES,
  NUM_REELS,
  NUM_ROWS,
  PAYLINES,
  BONUS_BASE_MULTIPLIER,
  FREE_SPINS_AWARDED,
  type Grid,
  type LuxuryState,
  type SpinResult,
  type SymbolId,
  type WinningLine,
} from '../../engine/LuxuryEngine'
import type { JackpotTier } from '../../engine/JackpotService'

// Server-side symbol ordering. Source of truth = public._luxury_line_mult
// (Pot-O-Gold source-faithful rebuild):
//   1=YACHT, 2=MOTORBOAT, 3=SPORTS_CAR, 4=RING, 5=CASH_WADS, 6=WHEEL,
//   7=GOLD_BARS, 8=WHITE_CARD, 9=GOLD_SMALL, 13=WILD, 14=SCATTER.
// Indices 10/11/12 are retired (server never emits them) — mapped to BLANK
// here as a defensive default so a stray value can't crash the renderer.
const SYMBOL_BY_INDEX: SymbolId[] = [
  'BLANK',        //  0 — server: BLANK (skipped by line eval)
  'YACHT',        //  1
  'MOTORBOAT',    //  2
  'SPORTS_CAR',   //  3
  'RING',         //  4
  'CASH_WADS',    //  5
  'WHEEL',        //  6
  'GOLD_BARS',    //  7
  'WHITE_CARD',   //  8
  'GOLD_SMALL',   //  9
  'BLANK',        // 10 — retired
  'BLANK',        // 11 — retired
  'BLANK',        // 12 — retired
  'WILD',         // 13 — server: WILD (substitutes; counted with SCATTER)
  'SCATTER',      // 14 — server: SCATTER (3+ triggers bonus)
]

function reshapeFlatGrid(flat: number[]): Grid {
  const out: Grid = []
  for (let r = 0; r < NUM_REELS; r++) {
    const reel: SymbolId[] = []
    for (let row = 0; row < NUM_ROWS; row++) {
      const v = flat[r * NUM_ROWS + row]
      reel.push(SYMBOL_BY_INDEX[v] ?? 'BLANK' as SymbolId)
    }
    out.push(reel)
  }
  return out
}

function makeSpinId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `dr-${Date.now()}-${Math.floor(Math.random() * 1e9).toString(16)}`
}

interface ServerDiamondRow {
  grid: number[]
  reel_stops: number[]
  winning_lines: WinningLine[] | null
  scatter_count: number
  base_win_cents: number
  is_bonus_spin: boolean
  multiplier_applied: number
  total_win_cents: number
  diamonds_collected: number
  free_spins_remaining: number
  bonus_triggered: boolean
  retriggered: boolean
  jackpot_won: string | null
  jackpot_amount_cents: number
  new_balance_cents: number
}

/**
 * Server-authoritative renderer adapter for Diamond Riches. Mirrors the
 * LuxuryEngine surface so the view doesn't need a structural rewrite — bet
 * controls + state shape stay the same, but spin/bonusSpin call `play_diamond`
 * on Supabase and reshape the response into the engine's SpinResult format.
 */
export class DiamondRichesServerAdapter {
  private state: LuxuryState
  // Captured from the most recent server spin response. Server already
  // credited the win; this is purely so the view can fire its celebration
  // animation. `consumePendingJackpot()` returns and clears it.
  private pendingJackpot: { tier: JackpotTier; amount: number } | null = null

  constructor(initialBalanceCents: number) {
    this.state = {
      credits: initialBalanceCents,
      phase: 'base',
      lineBetCents: DEFAULT_LINE_BET_CENTS,
      lineCount: DEFAULT_LINE_COUNT,
      totalBetCents: DEFAULT_LINE_BET_CENTS * DEFAULT_LINE_COUNT,
      grid: blankGrid(),
      reelStops: Array(NUM_REELS).fill(0),
      lastWinAmount: 0,
      isSpinning: false,
      freeSpinsRemaining: 0,
      freeSpinsTotal: 0,
      diamondsCollected: 0,
      bonusMultiplier: BONUS_BASE_MULTIPLIER,
      bonusWin: 0,
      bonusLineBetCents: DEFAULT_LINE_BET_CENTS,
      bonusLineCount: DEFAULT_LINE_COUNT,
      spinCount: 0,
      coinIn: 0,
      coinOut: 0,
      gameEvents: [],
    }
  }

  setBalance(cents: number): void { this.state.credits = cents }
  getState(): LuxuryState {
    return {
      ...this.state,
      grid: this.state.grid.map((reel) => [...reel]),
      reelStops: [...this.state.reelStops],
    }
  }
  getPaylines() { return PAYLINES }

  // ─── Bet controls ───
  private recompute() { this.state.totalBetCents = this.state.lineBetCents * this.state.lineCount }
  setLineBet(cents: number): void {
    if (this.state.phase !== 'base' || this.state.isSpinning) return
    let best = LINE_BET_STEPS_CENTS[0]
    for (const step of LINE_BET_STEPS_CENTS) {
      if (Math.abs(step - cents) < Math.abs(best - cents)) best = step
    }
    this.state.lineBetCents = best
    this.recompute()
  }
  stepLineBet(dir: 1 | -1): void {
    if (this.state.phase !== 'base' || this.state.isSpinning) return
    const i = LINE_BET_STEPS_CENTS.indexOf(this.state.lineBetCents)
    const next = Math.max(0, Math.min(LINE_BET_STEPS_CENTS.length - 1, i + dir))
    this.state.lineBetCents = LINE_BET_STEPS_CENTS[next]
    this.recompute()
  }
  setLineCount(count: number): void {
    if (this.state.phase !== 'base' || this.state.isSpinning) return
    this.state.lineCount = Math.max(1, Math.min(MAX_SELECTABLE_LINES, Math.round(count)))
    this.recompute()
  }
  stepLineCount(dir: 1 | -1): void {
    if (this.state.phase !== 'base' || this.state.isSpinning) return
    this.state.lineCount = Math.max(1, Math.min(MAX_SELECTABLE_LINES, this.state.lineCount + dir))
    this.recompute()
  }

  pickRandomDisplayGrid(): { grid: Grid; stops: number[] } {
    // Intentionally blank. ALL randomness — including the initial load-time
    // grid — must come from the server's CSPRNG via fetchInitialGrid(). This
    // synchronous method exists only to satisfy the view's first render
    // before the RPC resolves; the view immediately overwrites with the
    // server response.
    return { grid: blankGrid(), stops: Array(NUM_REELS).fill(0) }
  }

  /**
   * Server-authoritative initial reel positions. Calls `diamond_preview_grid`
   * which uses the same CSPRNG-driven `_luxury_spin_reels` helper that real
   * spins use — no bet debit, no session writes, no event log. Returns null
   * on any failure so the caller can keep its local fallback in place.
   */
  async fetchInitialGrid(): Promise<{ grid: Grid; stops: number[] } | null> {
    try {
      const { data, error } = await supabase.rpc('diamond_preview_grid')
      if (error) throw error
      const row = data?.[0]
      if (!row) return null
      const flat = row.grid as number[]
      const stops = row.reel_stops as number[]
      return { grid: reshapeFlatGrid(flat), stops: [...stops] }
    } catch {
      return null
    }
  }

  // ─── Spin paths ───
  async spin(): Promise<SpinResult | null> { return this.callPlayDiamond() }
  async bonusSpin(): Promise<SpinResult | null> { return this.callPlayDiamond() }

  /**
   * Bonus & free-spin orchestration is server-side (game_sessions phase). On
   * the client these only need to track the freeSpinsRemaining state surfaced
   * by the server's SpinResult.
   */
  beginBonusSpins(): void {
    this.state.phase = 'bonus'
    this.state.bonusLineBetCents = this.state.lineBetCents
    this.state.bonusLineCount = this.state.lineCount
    this.state.diamondsCollected = 0
    this.state.bonusMultiplier = BONUS_BASE_MULTIPLIER
    this.state.bonusWin = 0
    this.state.freeSpinsRemaining = FREE_SPINS_AWARDED
    this.state.freeSpinsTotal = FREE_SPINS_AWARDED
  }
  endBonus(): void {
    this.state.phase = 'base'
    this.state.freeSpinsRemaining = 0
    this.state.bonusWin = 0
  }

  // Server already rolls and credits jackpots inside play_diamond. The view
  // calls rollJackpotTriggers() in its post-spin flow — return whatever tier
  // the server reported on the most recent spin so the celebration can fire.
  rollJackpotTriggers(_bet: number, _baseOdds: unknown): JackpotTier[] {
    return this.pendingJackpot ? [this.pendingJackpot.tier] : []
  }
  addJackpotWin(_amount: number): void { /* server already credited */ }
  /** Returns the most recent server-reported jackpot (tier + cent amount) and
   * clears it. Returns null if none. The view uses this to drive its
   * full-screen celebration with the server-authoritative payout. */
  consumePendingJackpot(): { tier: JackpotTier; amount: number } | null {
    const p = this.pendingJackpot
    this.pendingJackpot = null
    return p
  }

  private async callPlayDiamond(): Promise<SpinResult | null> {
    const spinId = makeSpinId()
    this.state.isSpinning = true
    try {
      const { data, error } = await supabase.rpc('play_diamond', {
        p_spin_id: spinId,
        p_line_bet_cents: this.state.lineBetCents,
        p_line_count: this.state.lineCount,
      })
      if (error) throw error
      const row = (data?.[0] ?? null) as ServerDiamondRow | null
      if (!row) throw new Error('play_diamond returned no row')

      // Successful play RPC counts as activity for the 15-min auto-signout.
      notifyActivity()

      const grid = reshapeFlatGrid(row.grid)
      const winningLines: WinningLine[] = Array.isArray(row.winning_lines) ? row.winning_lines : []

      this.state.grid = grid
      this.state.reelStops = [...row.reel_stops]
      this.state.lastWinAmount = Number(row.total_win_cents)
      this.state.credits = Number(row.new_balance_cents)
      this.state.diamondsCollected = Number(row.diamonds_collected)
      this.state.freeSpinsRemaining = Number(row.free_spins_remaining)
      this.state.spinCount += 1
      this.state.coinIn += row.is_bonus_spin ? 0 : this.state.totalBetCents
      this.state.coinOut += Number(row.total_win_cents)

      if (row.is_bonus_spin) this.state.bonusWin += Number(row.total_win_cents)
      else this.state.bonusWin = 0

      // ── Phase transitions ──────────────────────────────────────────────
      // Server is the source of truth on `bonus_triggered` and
      // `is_bonus_spin` + `free_spins_remaining`. Map those flags to the
      // view's phase state machine so the intro banner, bonus-mode visuals,
      // multiplier display, and outro banner all fire.
      //
      // Without these transitions the bonus session still PAYS correctly
      // (server runs the free spins regardless) but the player never sees
      // the BONUS celebration, free-spins counter, or multiplier — they
      // just see "base" spins with surprise wins. Confirmed bug from a
      // production session audit.
      if (row.bonus_triggered && !row.is_bonus_spin) {
        // Trigger spin: bank the bonus bet config and move to intro.
        this.state.phase = 'bonusIntro'
        this.state.bonusLineBetCents = this.state.lineBetCents
        this.state.bonusLineCount = this.state.lineCount
        this.state.bonusMultiplier = BONUS_BASE_MULTIPLIER
        this.state.bonusWin = 0
        this.state.freeSpinsTotal = Number(row.free_spins_remaining)
      } else if (row.is_bonus_spin && Number(row.free_spins_remaining) <= 0) {
        // Last free spin just resolved — move to outro so the banner fires.
        this.state.phase = 'bonusOutro'
        this.state.bonusMultiplier = Number(row.multiplier_applied)
      } else if (row.is_bonus_spin) {
        // Mid-bonus spin: keep phase='bonus' and track the live multiplier.
        if (this.state.phase !== 'bonus') this.state.phase = 'bonus'
        this.state.bonusMultiplier = Number(row.multiplier_applied)
      }

      // Capture any server-reported jackpot so the view can fire its
      // celebration via consumePendingJackpot(). Tier strings ('fever1' …)
      // match the JackpotTier union.
      this.pendingJackpot =
        row.jackpot_won && Number(row.jackpot_amount_cents) > 0
          ? { tier: row.jackpot_won as JackpotTier, amount: Number(row.jackpot_amount_cents) }
          : null

      const result: SpinResult = {
        grid,
        reelStops: [...row.reel_stops],
        winningLines,
        lineWin: winningLines.reduce((s, w) => s + (w.win ?? 0), 0),
        scatterCount: Number(row.scatter_count),
        scatterWin: 0,
        baseWin: Number(row.base_win_cents),
        triggerBonus: Boolean(row.bonus_triggered),
        isBonusSpin: Boolean(row.is_bonus_spin),
        multiplierApplied: Number(row.multiplier_applied),
        totalWin: Number(row.total_win_cents),
        collectedWilds: [],
        diamondsCollected: Number(row.diamonds_collected),
        bonusMultiplierAfter: Number(row.multiplier_applied),
        freeSpinsRemaining: Number(row.free_spins_remaining),
        retriggered: Boolean(row.retriggered),
        freeSpinsAdded: row.retriggered ? FREE_SPINS_AWARDED : 0,
      }
      return result
    } finally {
      this.state.isSpinning = false
    }
  }
}

function blankGrid(): Grid {
  // Pre-RPC placeholder. Uses the BLANK symbol (renders as a dim plate) so
  // the player never sees a flash of legacy art before diamond_preview_grid
  // returns. Was previously filled with BOW_TIE/SUNGLASSES/PERFUME which
  // are no longer in the source-faithful symbol set.
  return Array.from({ length: NUM_REELS }, () =>
    Array.from({ length: NUM_ROWS }, () => 'BLANK' as SymbolId),
  )
}
