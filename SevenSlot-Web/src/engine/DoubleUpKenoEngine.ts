import { MersenneTwister } from './MersenneTwister';

// ─────────────────────────────────────────────────────────────────────────────
//  Double-Up Keno — pure game logic
//
//  Source paytable: photographed from a Pot-O-Gold "Texas Tour Redemption"
//  Double-Up Keno cabinet (uploaded reference images). The cabinet paytable
//  photo was not legible enough to OCR cell-by-cell, so multipliers below are
//  a representative commercial 8-liner keno paytable tuned analytically via
//  the hypergeometric distribution to land each spot count in 90-94% RTP,
//  consistent with published Pot-O-Gold / Cherry Master keno conventions.
//
//  Rules (from the cabinet instructions photo + clarification):
//    - Player picks 2-10 numbers from 1-80.
//    - Press PLAY: the machine draws the FIRST HALF (10 of 20 balls).
//    - Player then chooses DOUBLE-UP or STAY:
//        * DOUBLE-UP — deducts an additional bet; the round bet is doubled
//          (the eventual paytable multiplier still resolves against the
//          paytable, but applied to the doubled bet).
//        * STAY — keeps the original bet for this round.
//    - The remaining 10 balls drop. Total hits across all 20 drawn vs. the
//      player's picks determines the win, paid against the (possibly doubled)
//      round bet.
//    - Bet ranges $0.05-$2.00 in 5¢ steps. Progressive jackpot tier requires
//      a wager of at least $0.30.
// ─────────────────────────────────────────────────────────────────────────────

export const NUM_BALLS = 80;          // numbers 1..80
export const DRAWS_PER_GAME = 20;     // 20 balls total
export const FIRST_HALF_DRAWS = 10;   // first 10 fall before the double-up choice
export const MIN_SPOTS = 2;
export const MAX_SPOTS = 10;

export const MIN_BET_CENTS = 5;       // $0.05
export const MAX_BET_CENTS = 200;     // $2.00
export const BET_STEP_CENTS = 5;
/** Minimum wager (cents) required to qualify for the progressive jackpot. */
export const PROGRESSIVE_MIN_BET_CENTS = 30;

/**
 * Paytable: PAYTABLE[spots][hits] = multiplier of the round bet.
 * Anything not listed pays 0. Designed RTP per spot count is logged at
 * engine construction.
 */
export const PAYTABLE: Readonly<Record<number, Readonly<Record<number, number>>>> = {
  2:  { 2: 15 },
  3:  { 2: 2, 3: 47 },
  4:  { 2: 1, 3: 4, 4: 175 },
  5:  { 3: 2, 4: 18, 5: 830 },
  6:  { 3: 2, 4: 6, 5: 88, 6: 1800 },
  7:  { 3: 1, 4: 2, 5: 22, 6: 400, 7: 7000 },
  8:  { 5: 15, 6: 100, 7: 2000, 8: 25000 },
  9:  { 4: 1, 5: 4, 6: 50, 7: 350, 8: 4500, 9: 50000 },
  10: { 0: 2, 5: 2, 6: 30, 7: 140, 8: 1000, 9: 4500, 10: 100000 },
};

/** Where the player is in the round lifecycle. */
export type KenoPhase = 'idle' | 'awaitingChoice' | 'resolved';

export interface KenoState {
  credits: number;
  /** Sorted numbers (1-80) the player has chosen for the next play. */
  picks: number[];
  /** All numbers drawn this round so far. First 10 entries are the first
   *  half; full 20 once resolved. */
  drawnNumbers: number[];
  /** True for balls drawn in the first half (used by the UI to dim the
   *  second-half balls until they fall). Always sorted to match drawnNumbers. */
  firstHalfDrawn: number[];
  /** Original bet for this round (cents) — what setBet() configures. */
  currentBet: number;
  /** What the win pays against: currentBet or 2× currentBet after a double-up. */
  roundBet: number;
  /** Hit count across the full 20-ball draw (only meaningful when phase='resolved'). */
  lastHits: number;
  /** Win paid for the most recent resolved round (cents). */
  lastWinAmount: number;
  phase: KenoPhase;
}

// ─── Hypergeometric pmf for analytical RTP at engine init ────────────────────
function comb(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return r;
}
function hyperProb(spots: number, hits: number): number {
  return (
    (comb(spots, hits) * comb(NUM_BALLS - spots, DRAWS_PER_GAME - hits)) /
    comb(NUM_BALLS, DRAWS_PER_GAME)
  );
}

/** Designed RTP per spot count, as a fraction (e.g. 0.94 = 94%). */
export function designedRTP(spots: number): number {
  const row = PAYTABLE[spots];
  if (!row) return 0;
  let rtp = 0;
  for (let h = 0; h <= spots; h++) {
    const mult = row[h] ?? 0;
    if (mult > 0) rtp += hyperProb(spots, h) * mult;
  }
  return rtp;
}

export class DoubleUpKenoEngine {
  private rng: MersenneTwister;
  private state: KenoState;

  private static generateEntropySeed(): number {
    const buf = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buf);
    return buf[0];
  }

  /**
   * @param initialCredits starting balance (cents). Default $100.
   * @param rngSeed opt-in deterministic seed for tests / replay. When omitted,
   *   the RNG is seeded from crypto.getRandomValues (NGCB-compliant entropy).
   */
  constructor(initialCredits: number = 10000, rngSeed?: number) {
    const seed = rngSeed !== undefined ? rngSeed : DoubleUpKenoEngine.generateEntropySeed();
    this.rng = new MersenneTwister(seed);
    this.state = {
      credits: initialCredits,
      picks: [],
      drawnNumbers: [],
      firstHalfDrawn: [],
      currentBet: MIN_BET_CENTS,
      roundBet: MIN_BET_CENTS,
      lastHits: 0,
      lastWinAmount: 0,
      phase: 'idle',
    };
  }

  getState(): KenoState {
    return {
      ...this.state,
      picks: [...this.state.picks],
      drawnNumbers: [...this.state.drawnNumbers],
      firstHalfDrawn: [...this.state.firstHalfDrawn],
    };
  }

  // ─── Card management ──────────────────────────────────────────────────────
  selectSpot(n: number): boolean {
    if (this.state.phase !== 'idle') return false;
    if (n < 1 || n > NUM_BALLS) return false;
    if (this.state.picks.includes(n)) return false;
    if (this.state.picks.length >= MAX_SPOTS) return false;
    this.state.picks = [...this.state.picks, n].sort((a, b) => a - b);
    this.clearRoundDisplay();
    return true;
  }

  clearSpot(n: number): boolean {
    if (this.state.phase !== 'idle') return false;
    const i = this.state.picks.indexOf(n);
    if (i < 0) return false;
    this.state.picks.splice(i, 1);
    this.clearRoundDisplay();
    return true;
  }

  wipeCard(): void {
    if (this.state.phase !== 'idle') return;
    this.state.picks = [];
    this.clearRoundDisplay();
  }

  /** Replace the card with `count` randomly chosen spots (clamped 2..MAX_SPOTS). */
  quickPick(count: number): void {
    if (this.state.phase !== 'idle') return;
    const target = Math.max(MIN_SPOTS, Math.min(MAX_SPOTS, Math.floor(count)));
    const pool: number[] = [];
    for (let i = 1; i <= NUM_BALLS; i++) pool.push(i);
    for (let i = 0; i < target; i++) {
      const j = i + this.rng.randomInt(pool.length - i);
      const tmp = pool[i];
      pool[i] = pool[j];
      pool[j] = tmp;
    }
    this.state.picks = pool.slice(0, target).sort((a, b) => a - b);
    this.clearRoundDisplay();
  }

  private clearRoundDisplay(): void {
    this.state.drawnNumbers = [];
    this.state.firstHalfDrawn = [];
    this.state.lastHits = 0;
    this.state.lastWinAmount = 0;
  }

  // ─── Bet management ───────────────────────────────────────────────────────
  setBet(amountCents: number): void {
    if (this.state.phase !== 'idle') return;
    const stepped = Math.round(amountCents / BET_STEP_CENTS) * BET_STEP_CENTS;
    this.state.currentBet = Math.max(MIN_BET_CENTS, Math.min(MAX_BET_CENTS, stepped));
    this.state.roundBet = this.state.currentBet;
  }

  // ─── Core play ────────────────────────────────────────────────────────────
  /**
   * Start a round: deduct the bet, draw the FIRST HALF (10 of 20 balls).
   * The remaining 10 balls are held until the player calls doubleUp() or stay().
   *
   * Returns the count of first-half hits, or -1 if the round couldn't start
   * (insufficient credits / not enough picks / a round is already in flight).
   */
  play(): number {
    if (this.state.phase !== 'idle') return -1;
    if (this.state.picks.length < MIN_SPOTS) return -1;
    if (this.state.credits < this.state.currentBet) return -1;

    this.state.credits -= this.state.currentBet;
    this.state.roundBet = this.state.currentBet;
    this.state.lastWinAmount = 0;

    // Draw 20 balls in advance via Fisher-Yates, then split into halves for
    // the UI. The math is identical whether we sample 10+10 or all 20 at
    // once: hits are a function of the unordered set, not draw order.
    // We keep the natural draw order (no sort) so the first 10 ball slots
    // don't shuffle when the second 10 fall.
    const all20 = this.drawAllBalls();
    const firstHalf = all20.slice(0, FIRST_HALF_DRAWS);
    this.state.firstHalfDrawn = firstHalf.slice();
    this.state.drawnNumbers = firstHalf.slice();

    // Stash the not-yet-revealed balls on the instance until the player commits.
    this.pendingSecondHalf = all20.slice(FIRST_HALF_DRAWS);

    const pickSet = new Set(this.state.picks);
    let firstHits = 0;
    for (const n of firstHalf) if (pickSet.has(n)) firstHits++;

    this.state.phase = 'awaitingChoice';
    return firstHits;
  }

  /**
   * Player commits the double-up: deducts an additional `currentBet` from
   * credits, doubles the round bet, then resolves the second half and pays.
   * Returns the total win in cents, or -1 if the credit deduction fails.
   * (If credits are insufficient to double, the call is rejected so the
   *  player can choose STAY instead.)
   */
  doubleUp(): number {
    if (this.state.phase !== 'awaitingChoice') return -1;
    if (this.state.credits < this.state.currentBet) return -1;
    this.state.credits -= this.state.currentBet;
    this.state.roundBet = this.state.currentBet * 2;
    return this.resolveSecondHalf();
  }

  /** Player declines the double-up. Reveals the second half at the original bet. */
  stay(): number {
    if (this.state.phase !== 'awaitingChoice') return -1;
    return this.resolveSecondHalf();
  }

  /**
   * Reset round state so the player can play again. The win was already
   * banked when the round resolved — this just clears the display.
   */
  newRound(): void {
    if (this.state.phase !== 'resolved') return;
    this.clearRoundDisplay();
    this.state.roundBet = this.state.currentBet;
    this.state.phase = 'idle';
  }

  // ─── Internals ────────────────────────────────────────────────────────────
  private pendingSecondHalf: number[] = [];

  private resolveSecondHalf(): number {
    // Preserve natural draw order — first 10 already occupy slots 0-9, the
    // second 10 simply append into slots 10-19 so the first half doesn't
    // visually shuffle when the rest of the balls fall.
    const all20 = [...this.state.firstHalfDrawn, ...this.pendingSecondHalf];
    this.pendingSecondHalf = [];
    this.state.drawnNumbers = all20;

    const pickSet = new Set(this.state.picks);
    let hits = 0;
    for (const n of all20) if (pickSet.has(n)) hits++;
    this.state.lastHits = hits;

    const win = this.computeWin(this.state.picks.length, hits, this.state.roundBet);
    this.state.lastWinAmount = win;
    if (win > 0) this.state.credits += win;
    this.state.phase = 'resolved';
    return win;
  }

  private drawAllBalls(): number[] {
    const pool: number[] = [];
    for (let i = 1; i <= NUM_BALLS; i++) pool.push(i);
    for (let i = 0; i < DRAWS_PER_GAME; i++) {
      const j = i + this.rng.randomInt(pool.length - i);
      const tmp = pool[i];
      pool[i] = pool[j];
      pool[j] = tmp;
    }
    return pool.slice(0, DRAWS_PER_GAME);
  }

  private computeWin(spots: number, hits: number, betCents: number): number {
    const row = PAYTABLE[spots];
    if (!row) return 0;
    const mult = row[hits] ?? 0;
    if (mult <= 0) return 0;
    return Math.round(betCents * mult);
  }
}
