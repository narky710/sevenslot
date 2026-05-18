import { MersenneTwister } from './MersenneTwister';

// ─────────────────────────────────────────────────────────────────────────────
//  Diamond Riches — pure game logic
//
//  A 5×3, 20-fixed-line luxury-lifestyle video slot. Signature mechanics:
//
//    • Diamond WILD (reels 2/3/4 only) substitutes for EVERY symbol —
//      including the gold-coin SCATTER (a WILD counts toward scatter pays and
//      the 3+ bonus trigger) — and DOUBLES any line it completes.
//    • A 12-spin free-game bonus on an alternate reel set that DOES contain
//      scatters: 3+ scatters during the bonus RETRIGGER (+12 spins, stacking
//      indefinitely). Every wild on reels 2/3/4 during the bonus is
//      "collected"; each diamond permanently raises a persistent multiplier
//      (2× → 29×, +1 per diamond, cap 27 diamonds) that PERSISTS across
//      retriggers.
//    • Three globally-shared progressive jackpots (see JackpotService.ts);
//      the engine only rolls bet-scaled triggers — the service owns the money.
//
//  Math model: classic physical reel strips. Each reel draws one random stop;
//  the visible window is the three consecutive symbols [stop, stop+1, stop+2]
//  (mod strip length). RTP is governed by strip composition; the paytable was
//  reduced per revised-spec §8 to land the 20-line + retrigger build in the
//  94–96% band. Verified by Monte-Carlo (stress-test/luxury-rtp.cjs, 10M).
//
//  Money is integer CREDITS (1 credit = $0.01; 400-credit max = $4.00). Line
//  wins multiply BET PER LINE; scatter wins multiply TOTAL BET; bonus wins
//  multiply by the current bonus multiplier.
// ─────────────────────────────────────────────────────────────────────────────

export type SymbolId =
  | 'JET'
  | 'YACHT'
  | 'CAR'
  | 'MONEY'
  | 'RING'
  | 'WATCH'
  | 'GOLD_BARS'
  | 'SILVER_BARS'
  | 'GOLD_BAR'
  | 'WILD'
  | 'SCATTER'
  | 'BLANK';

export const NUM_REELS = 5;
export const NUM_ROWS = 3;
/** 20 fixed paylines (cabinet-accurate per the revised spec). */
export const NUM_PAYLINES = 20;

/**
 * Money is denominated in CREDITS. Per the cabinet, 1 credit = $0.01, so the
 * 400-credit max bet (20 lines × 20 credits/line) is exactly $4.00. The engine
 * stores everything as integer credits; `creditsToDollars` is only for the
 * jackpot/$ displays. (Internally identical to a cents model — 1 credit ≡ 1¢.)
 */
export const CREDIT_VALUE_DOLLARS = 0.01;
export const creditsToDollars = (credits: number): number => credits * CREDIT_VALUE_DOLLARS;

/**
 * Bet levers: number of active paylines × credits wagered per line.
 * Per-line options 1/2/3/5/10/20 credits; default 20 → 20×20 = 400 max.
 * (Kept the LINE_BET_*_CENTS names to avoid a churny rename; 1 credit ≡ 1¢.)
 */
export const LINE_BET_STEPS_CENTS: ReadonlyArray<number> = [1, 2, 3, 5, 10, 20];
export const MIN_LINE_BET_CENTS = LINE_BET_STEPS_CENTS[0];
export const MAX_LINE_BET_CENTS = LINE_BET_STEPS_CENTS[LINE_BET_STEPS_CENTS.length - 1];
export const DEFAULT_LINE_BET_CENTS = 20;

/**
 * Selectable line counts. Paylines are priority-ordered in PAYLINES (line 1 =
 * middle horizontal first), so activating N lines means the first N entries.
 * Default = all 20 (the cabinet ships all 20 active).
 */
export const LINE_COUNT_OPTIONS: ReadonlyArray<number> = [1, 5, 10, 15, 20];
export const DEFAULT_LINE_COUNT = NUM_PAYLINES;

/** Max total bet in credits (= cents) — used to bet-scale jackpot odds. */
export const MAX_TOTAL_BET_CENTS =
  MAX_LINE_BET_CENTS * NUM_PAYLINES; // 20 × 20 = 400 ($4.00)

/**
 * Line-win multipliers, applied to BET PER LINE. A win needs 3+ consecutive
 * matches from reel 1 (left→right); only JET also pays for 2 of a kind.
 * SCATTER pays as a scatter (× TOTAL bet, anywhere on the grid).
 * Rebalanced down ~15-20% for the 20-line + retrigger configuration (§8 of
 * the revised spec); reel strips are then Monte-Carlo tuned to 94–96% RTP.
 */
export const PAYTABLE: Readonly<Record<SymbolId, Readonly<Record<number, number>>>> = {
  JET: { 2: 8, 3: 37, 4: 369, 5: 3686 },
  YACHT: { 3: 4, 4: 23, 5: 737 },
  CAR: { 3: 14, 4: 74, 5: 369 },
  MONEY: { 3: 8, 4: 37, 5: 147 },
  RING: { 3: 11, 4: 55, 5: 147 },
  WATCH: { 3: 8, 4: 23, 5: 111 },
  GOLD_BARS: { 3: 4, 4: 23, 5: 111 },
  SILVER_BARS: { 3: 4, 4: 18, 5: 92 },
  GOLD_BAR: { 3: 4, 4: 14, 5: 74 },
  SCATTER: { 3: 2, 4: 10, 5: 69 },
  WILD: {},
  BLANK: {},
};

/**
 * The 20 fixed paylines. Each entry is [R1,R2,R3,R4,R5] where the value is the
 * row index on that reel (top=0, middle=1, bottom=2). Single source of truth —
 * the view reads getPaylines() rather than re-declaring.
 */
export const PAYLINES: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [1, 1, 1, 1, 1], // 1.  Middle horizontal
  [0, 0, 0, 0, 0], // 2.  Top horizontal
  [2, 2, 2, 2, 2], // 3.  Bottom horizontal
  [0, 1, 2, 1, 0], // 4.  V
  [2, 1, 0, 1, 2], // 5.  Inverted V
  [1, 0, 0, 0, 1], // 6.  Top arc
  [1, 2, 2, 2, 1], // 7.  Bottom arc
  [0, 0, 1, 2, 2], // 8.  Diagonal down
  [2, 2, 1, 0, 0], // 9.  Diagonal up
  [1, 0, 1, 0, 1], // 10. Top zigzag (M)
  [1, 2, 1, 2, 1], // 11. Bottom zigzag (W)
  [0, 1, 1, 1, 0], // 12. Middle bow (top ends)
  [2, 1, 1, 1, 2], // 13. Middle bow (bottom ends)
  [0, 1, 0, 1, 0], // 14. Top double zigzag
  [2, 1, 2, 1, 2], // 15. Bottom double zigzag
  [0, 0, 2, 0, 0], // 16. Top-with-bottom-dip
  [2, 2, 0, 2, 2], // 17. Bottom-with-top-peak
  [1, 0, 2, 0, 1], // 18. Middle to corners
  [1, 2, 0, 2, 1], // 19. Middle to inverted corners
  [0, 2, 0, 2, 0], // 20. Extreme zigzag
];

/**
 * Base-game reel strips (one array per reel). WILD appears on reels 2/3/4
 * only; SCATTER appears on all five. Tuned by Monte-Carlo to land RTP in the
 * 94–96% band — see stress-test/luxury-rtp.cjs and stress-test-report-luxury.md.
 */
export const BASE_REELS: ReadonlyArray<ReadonlyArray<SymbolId>> = [
  ['GOLD_BAR','GOLD_BARS','SCATTER','MONEY','WATCH','BLANK','YACHT','CAR','JET',
   'RING','SILVER_BARS','GOLD_BAR','GOLD_BARS','SCATTER','MONEY','WATCH','BLANK','RING',
   'SILVER_BARS','GOLD_BAR','BLANK','BLANK','BLANK','BLANK','BLANK','BLANK','BLANK',
   'BLANK','BLANK','BLANK','BLANK','BLANK','BLANK','BLANK'],
  ['GOLD_BAR','GOLD_BARS','SCATTER','MONEY','WATCH','BLANK','YACHT','CAR','JET',
   'RING','WILD','SILVER_BARS','GOLD_BAR','GOLD_BARS','SCATTER','MONEY','WATCH','BLANK',
   'RING','WILD','SILVER_BARS','GOLD_BAR','BLANK','WILD','BLANK','BLANK','BLANK',
   'BLANK','BLANK','BLANK','BLANK','BLANK','BLANK','BLANK'],
  ['GOLD_BAR','GOLD_BARS','SCATTER','MONEY','WATCH','BLANK','YACHT','CAR','JET',
   'RING','WILD','SILVER_BARS','GOLD_BAR','GOLD_BARS','SCATTER','MONEY','WATCH','BLANK',
   'RING','WILD','SILVER_BARS','GOLD_BAR','BLANK','WILD','BLANK','BLANK','BLANK',
   'BLANK','BLANK','BLANK','BLANK','BLANK','BLANK','BLANK'],
  ['GOLD_BAR','GOLD_BARS','SCATTER','MONEY','WATCH','BLANK','YACHT','CAR','JET',
   'RING','WILD','SILVER_BARS','GOLD_BAR','GOLD_BARS','SCATTER','MONEY','WATCH','BLANK',
   'RING','WILD','SILVER_BARS','GOLD_BAR','BLANK','WILD','BLANK','BLANK','BLANK',
   'BLANK','BLANK','BLANK','BLANK','BLANK','BLANK','BLANK'],
  ['GOLD_BAR','GOLD_BARS','SCATTER','MONEY','WATCH','BLANK','YACHT','CAR','JET',
   'RING','SILVER_BARS','GOLD_BAR','GOLD_BARS','SCATTER','MONEY','WATCH','BLANK','RING',
   'SILVER_BARS','GOLD_BAR','BLANK','BLANK','BLANK','BLANK','BLANK','BLANK','BLANK',
   'BLANK','BLANK','BLANK','BLANK','BLANK','BLANK','BLANK'],
];

/**
 * Free-spin reel strips. NO SCATTER anywhere (retriggers are structurally
 * impossible), and reels 2/3/4 are heavy with WILD to feed the diamond-
 * collection multiplier. Reels 1/5 carry no WILD and no SCATTER.
 */
export const FREE_SPIN_REELS: ReadonlyArray<ReadonlyArray<SymbolId>> = [
  ['GOLD_BAR','GOLD_BARS','SCATTER','MONEY','WATCH','BLANK','YACHT','CAR','JET',
   'RING','SILVER_BARS','GOLD_BAR','GOLD_BARS','MONEY','WATCH','BLANK','CAR','RING',
   'SILVER_BARS','GOLD_BAR','GOLD_BARS','MONEY','WATCH','BLANK','RING','SILVER_BARS','GOLD_BAR',
   'GOLD_BARS','WATCH','BLANK','SILVER_BARS','GOLD_BAR','BLANK','BLANK'],
  ['GOLD_BAR','GOLD_BARS','SCATTER','MONEY','WATCH','BLANK','YACHT','CAR','JET',
   'RING','WILD','SILVER_BARS','GOLD_BAR','GOLD_BARS','MONEY','WATCH','BLANK','CAR',
   'RING','SILVER_BARS','GOLD_BAR','GOLD_BARS','MONEY','WATCH','BLANK','RING','SILVER_BARS',
   'GOLD_BAR','GOLD_BARS','WATCH','BLANK','SILVER_BARS','GOLD_BAR','BLANK'],
  ['GOLD_BAR','GOLD_BARS','SCATTER','MONEY','WATCH','BLANK','YACHT','CAR','JET',
   'RING','WILD','SILVER_BARS','GOLD_BAR','GOLD_BARS','MONEY','WATCH','BLANK','CAR',
   'RING','SILVER_BARS','GOLD_BAR','GOLD_BARS','MONEY','WATCH','BLANK','RING','SILVER_BARS',
   'GOLD_BAR','GOLD_BARS','WATCH','BLANK','SILVER_BARS','GOLD_BAR','BLANK'],
  ['GOLD_BAR','GOLD_BARS','SCATTER','MONEY','WATCH','BLANK','YACHT','CAR','JET',
   'RING','WILD','SILVER_BARS','GOLD_BAR','GOLD_BARS','MONEY','WATCH','BLANK','CAR',
   'RING','SILVER_BARS','GOLD_BAR','GOLD_BARS','MONEY','WATCH','BLANK','RING','SILVER_BARS',
   'GOLD_BAR','GOLD_BARS','WATCH','BLANK','SILVER_BARS','GOLD_BAR','BLANK'],
  ['GOLD_BAR','GOLD_BARS','SCATTER','MONEY','WATCH','BLANK','YACHT','CAR','JET',
   'RING','SILVER_BARS','GOLD_BAR','GOLD_BARS','MONEY','WATCH','BLANK','CAR','RING',
   'SILVER_BARS','GOLD_BAR','GOLD_BARS','MONEY','WATCH','BLANK','RING','SILVER_BARS','GOLD_BAR',
   'GOLD_BARS','WATCH','BLANK','SILVER_BARS','GOLD_BAR','BLANK','BLANK'],
];

// ─── Bonus tuning ────────────────────────────────────────────────────────────
/** Free spins awarded on 3+ scatters (and added again on each retrigger). */
export const FREE_SPINS_AWARDED = 12;
export const BONUS_BASE_MULTIPLIER = 2;
export const MAX_DIAMONDS = 27;
export const MAX_BONUS_MULTIPLIER = BONUS_BASE_MULTIPLIER + MAX_DIAMONDS; // 29
export const SCATTERS_TO_TRIGGER = 3;
/** Wilds are collected from reels 2/3/4 — 0-based reel indices [1,2,3]. */
export const WILD_COLLECT_REELS: ReadonlyArray<number> = [1, 2, 3];

/** multiplier = min(2 + diamonds, 29). */
export function bonusMultiplierFor(diamondsCollected: number): number {
  return Math.min(BONUS_BASE_MULTIPLIER + diamondsCollected, MAX_BONUS_MULTIPLIER);
}

/** Game lifecycle. Bonus runs intro → spinning → outro, then back to base. */
export type GamePhase = 'base' | 'bonusIntro' | 'bonus' | 'bonusOutro';

/** A 5×3 grid indexed grid[reel][row]; reel 0..4, row 0..2 (top→bottom). */
export type Grid = SymbolId[][];

export interface WinningLine {
  /** 0-based index into PAYLINES. */
  line: number;
  symbol: SymbolId;
  count: number;
  /** Whether a WILD substituted into the winning run (doubles the pay). */
  wildUsed: boolean;
  /** Win in cents BEFORE any bonus multiplier (already includes the ×2 wild). */
  win: number;
}

export interface SpinEvaluation {
  winningLines: WinningLine[];
  lineWin: number;
  scatterCount: number;
  scatterWin: number;
  /** lineWin + scatterWin, BEFORE any free-spin multiplier. */
  baseWin: number;
  triggerBonus: boolean;
}

export interface SpinResult extends SpinEvaluation {
  grid: Grid;
  /** The stop index chosen on each reel (top visible symbol). */
  reelStops: number[];
  /** True if this spin ran on the free-spin reel set. */
  isBonusSpin: boolean;
  /** Bonus multiplier applied to baseWin (1 in the base game). */
  multiplierApplied: number;
  /** Amount actually credited for this spin (baseWin × multiplierApplied). */
  totalWin: number;
  /** Wild cells collected this bonus spin, as [reel,row] pairs (bonus only). */
  collectedWilds: Array<[number, number]>;
  /** Diamonds collected so far in the bonus AFTER this spin. */
  diamondsCollected: number;
  /** Bonus multiplier value AFTER this spin's collection (for the next spin). */
  bonusMultiplierAfter: number;
  /** Free spins left AFTER this spin (includes any retrigger additions). */
  freeSpinsRemaining: number;
  /** True if this bonus spin landed 3+ scatters and retriggered (+12). */
  retriggered: boolean;
  /** Free spins added by a retrigger on this spin (0 or FREE_SPINS_AWARDED). */
  freeSpinsAdded: number;
}

export interface LuxuryState {
  credits: number;
  phase: GamePhase;
  lineBetCents: number;
  /** Number of active paylines (first N of the 20, priority-ordered). */
  lineCount: number;
  /** lineBetCents × lineCount (credits ≡ cents; 400 max = $4.00). */
  totalBetCents: number;
  grid: Grid;
  reelStops: number[];
  lastWinAmount: number;
  isSpinning: boolean;
  // ── Bonus ──
  freeSpinsRemaining: number;
  freeSpinsTotal: number;
  diamondsCollected: number;
  bonusMultiplier: number;
  bonusWin: number;
  /** Per-line bet locked at the moment the bonus triggered. */
  bonusLineBetCents: number;
  /** Active line count locked at the moment the bonus triggered. */
  bonusLineCount: number;
}

export class LuxuryEngine {
  private rng: MersenneTwister;
  private state: LuxuryState;

  /**
   * 32-bit unsigned seed from the host CSPRNG. Used by default so every fresh
   * engine starts with an unpredictable RNG stream (NGCB Tech Standards
   * prohibit static seed initialization for gaming RNGs).
   */
  private static generateEntropySeed(): number {
    const buf = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buf);
    return buf[0];
  }

  /**
   * @param initialCredits starting balance in cents (default $50.00).
   * @param rngSeed OPT-IN deterministic seed for tests / replay. When omitted
   *   (production path) the RNG is seeded with fresh entropy from
   *   crypto.getRandomValues — never a static default.
   */
  constructor(initialCredits: number = 5000, rngSeed?: number) {
    const seed = rngSeed !== undefined ? rngSeed : LuxuryEngine.generateEntropySeed();
    this.rng = new MersenneTwister(seed);
    this.state = {
      credits: initialCredits,
      phase: 'base',
      lineBetCents: DEFAULT_LINE_BET_CENTS,
      lineCount: DEFAULT_LINE_COUNT,
      totalBetCents: DEFAULT_LINE_BET_CENTS * DEFAULT_LINE_COUNT,
      grid: LuxuryEngine.blankGrid(),
      reelStops: [0, 0, 0, 0, 0],
      lastWinAmount: 0,
      isSpinning: false,
      freeSpinsRemaining: 0,
      freeSpinsTotal: 0,
      diamondsCollected: 0,
      bonusMultiplier: BONUS_BASE_MULTIPLIER,
      bonusWin: 0,
      bonusLineBetCents: DEFAULT_LINE_BET_CENTS,
      bonusLineCount: DEFAULT_LINE_COUNT,
    };
  }

  private static blankGrid(): Grid {
    return Array.from({ length: NUM_REELS }, () =>
      Array.from({ length: NUM_ROWS }, () => 'BLANK' as SymbolId)
    );
  }

  getState(): LuxuryState {
    return {
      ...this.state,
      grid: this.state.grid.map((reel) => [...reel]),
      reelStops: [...this.state.reelStops],
    };
  }

  getPaylines(): ReadonlyArray<readonly [number, number, number, number, number]> {
    return PAYLINES;
  }

  // ─── Bet management ───────────────────────────────────────────────────────
  // Total bet = per-line bet × active line count. Both levers are locked
  // while a bonus is in flight (the wager is pinned to the trigger bet).

  private recomputeTotalBet(): void {
    this.state.totalBetCents = this.state.lineBetCents * this.state.lineCount;
  }

  /** Set the per-line bet (cents). Snaps to the nearest configured step. */
  setLineBet(cents: number): void {
    if (this.state.phase !== 'base' || this.state.isSpinning) return;
    let best = LINE_BET_STEPS_CENTS[0];
    for (const step of LINE_BET_STEPS_CENTS) {
      if (Math.abs(step - cents) < Math.abs(best - cents)) best = step;
    }
    this.state.lineBetCents = best;
    this.recomputeTotalBet();
  }

  /** Step the per-line bet up/down through LINE_BET_STEPS_CENTS. */
  stepLineBet(direction: 1 | -1): void {
    if (this.state.phase !== 'base' || this.state.isSpinning) return;
    const i = LINE_BET_STEPS_CENTS.indexOf(this.state.lineBetCents);
    const next = Math.max(0, Math.min(LINE_BET_STEPS_CENTS.length - 1, i + direction));
    this.state.lineBetCents = LINE_BET_STEPS_CENTS[next];
    this.recomputeTotalBet();
  }

  /** Set the active line count. Clamped to 1..NUM_PAYLINES (whole lines). */
  setLineCount(count: number): void {
    if (this.state.phase !== 'base' || this.state.isSpinning) return;
    const n = Math.round(count);
    this.state.lineCount = Math.max(1, Math.min(NUM_PAYLINES, n));
    this.recomputeTotalBet();
  }

  /** Step the active line count by exactly one, clamped to 1..NUM_PAYLINES. */
  stepLineCount(direction: 1 | -1): void {
    if (this.state.phase !== 'base' || this.state.isSpinning) return;
    this.state.lineCount = Math.max(
      1,
      Math.min(NUM_PAYLINES, this.state.lineCount + direction)
    );
    this.recomputeTotalBet();
  }

  // ─── Reel helpers ─────────────────────────────────────────────────────────
  /**
   * Draw one random stop per reel and read the 3-symbol visible window
   * [stop, stop+1, stop+2] (mod strip length). Returns the 5×3 grid plus the
   * raw stop indices (the view uses the stops to drive reel-strip animation).
   * This weighted draw over the strip composition is the SOLE source of
   * randomness for a spin — RTP lives entirely in the strips.
   */
  private spinReels(reels: ReadonlyArray<ReadonlyArray<SymbolId>>): {
    grid: Grid;
    stops: number[];
  } {
    const grid: Grid = [];
    const stops: number[] = [];
    for (let r = 0; r < NUM_REELS; r++) {
      const strip = reels[r];
      const stop = this.rng.randomInt(strip.length);
      stops.push(stop);
      grid.push([
        strip[stop % strip.length],
        strip[(stop + 1) % strip.length],
        strip[(stop + 2) % strip.length],
      ]);
    }
    return { grid, stops };
  }

  /**
   * A cosmetic random base-game grid for the initial on-load display, drawn
   * with the same strips/RNG as a real spin so the load looks representative.
   */
  pickRandomDisplayGrid(): { grid: Grid; stops: number[] } {
    return this.spinReels(BASE_REELS);
  }

  // ─── Win evaluation ───────────────────────────────────────────────────────
  /**
   * Pure spin evaluator (§6 of the build spec). `grid` is 5×3 [reel][row].
   * Line wins multiply `betPerLine`; scatter wins multiply `totalBet`. Only
   * the first `activeLines` priority-ordered paylines can pay (scatter is
   * unaffected — it pays anywhere regardless of lines). `activeLines` defaults
   * to all 15 so the stress harness exercises the exact production code path.
   * Static + side-effect-free.
   */
  static evaluateGrid(
    grid: Grid,
    betPerLine: number,
    totalBet: number,
    activeLines: number = PAYLINES.length
  ): SpinEvaluation {
    const winningLines: WinningLine[] = [];
    let lineWin = 0;
    const lines = Math.max(0, Math.min(activeLines, PAYLINES.length));

    for (let lineIdx = 0; lineIdx < lines; lineIdx++) {
      const line = PAYLINES[lineIdx];
      const symbolsOnLine: SymbolId[] = line.map((row, reel) => grid[reel][row]);

      // Lead symbol = leftmost symbol that isn't WILD/BLANK/SCATTER.
      let leadSymbol: SymbolId | null = null;
      for (const s of symbolsOnLine) {
        if (s !== 'WILD' && s !== 'BLANK' && s !== 'SCATTER') {
          leadSymbol = s;
          break;
        }
      }
      // A line opening with WILD and no other payable symbol pays as JET.
      if (!leadSymbol && symbolsOnLine[0] === 'WILD') leadSymbol = 'JET';
      if (!leadSymbol) continue;

      // Count consecutive matches from reel 1; WILD substitutes, SCATTER and
      // BLANK break the chain.
      let matchCount = 0;
      let wildUsed = false;
      for (let r = 0; r < NUM_REELS; r++) {
        const s = symbolsOnLine[r];
        if (s === leadSymbol) {
          matchCount++;
        } else if (s === 'WILD') {
          matchCount++;
          wildUsed = true;
        } else {
          break;
        }
      }

      const payRow = PAYTABLE[leadSymbol];
      const mult = payRow ? payRow[matchCount] : undefined;
      if (mult) {
        let win = mult * betPerLine;
        if (wildUsed) win *= 2;
        lineWin += win;
        winningLines.push({ line: lineIdx, symbol: leadSymbol, count: matchCount, wildUsed, win });
      }
    }

    // Scatters pay anywhere; only the single highest scatter award counts.
    // The Diamond WILD substitutes for the SCATTER too, so every WILD cell
    // also counts toward the scatter total (and the 3+ bonus trigger).
    let scatterCount = 0;
    for (let r = 0; r < NUM_REELS; r++) {
      for (let row = 0; row < NUM_ROWS; row++) {
        const cell = grid[r][row];
        if (cell === 'SCATTER' || cell === 'WILD') scatterCount++;
      }
    }
    let scatterWin = 0;
    if (scatterCount >= SCATTERS_TO_TRIGGER) {
      const capped = Math.min(scatterCount, 5);
      const scatterMult = PAYTABLE.SCATTER[capped] || 0;
      scatterWin = scatterMult * totalBet;
    }

    return {
      winningLines,
      lineWin,
      scatterCount,
      scatterWin,
      baseWin: lineWin + scatterWin,
      triggerBonus: scatterCount >= SCATTERS_TO_TRIGGER,
    };
  }

  // ─── Base game ────────────────────────────────────────────────────────────
  /**
   * Run one base-game spin. Deducts the total bet, spins BASE_REELS, evaluates,
   * credits the win, and — on 3+ scatters — arms the free-spin bonus (phase
   * → 'bonusIntro'). Returns null if the spin can't start (wrong phase,
   * already spinning, or insufficient credits).
   */
  spin(): SpinResult | null {
    if (this.state.phase !== 'base') return null;
    if (this.state.isSpinning) return null;
    const totalBet = this.state.totalBetCents;
    if (this.state.credits < totalBet) return null;

    this.state.credits -= totalBet;
    this.state.lastWinAmount = 0;

    const { grid, stops } = this.spinReels(BASE_REELS);
    const evalResult = LuxuryEngine.evaluateGrid(
      grid,
      this.state.lineBetCents,
      totalBet,
      this.state.lineCount
    );

    this.state.grid = grid;
    this.state.reelStops = stops;
    const totalWin = evalResult.baseWin; // no multiplier in the base game
    if (totalWin > 0) {
      this.state.credits += totalWin;
      this.state.lastWinAmount = totalWin;
    }

    if (evalResult.triggerBonus) {
      this.state.phase = 'bonusIntro';
      this.state.freeSpinsTotal = FREE_SPINS_AWARDED;
      this.state.freeSpinsRemaining = FREE_SPINS_AWARDED;
      this.state.diamondsCollected = 0;
      this.state.bonusMultiplier = BONUS_BASE_MULTIPLIER;
      this.state.bonusWin = 0;
      // Bet (per-line × line count) is pinned to the triggering bet.
      this.state.bonusLineBetCents = this.state.lineBetCents;
      this.state.bonusLineCount = this.state.lineCount;
    }

    return {
      ...evalResult,
      grid,
      reelStops: stops,
      isBonusSpin: false,
      multiplierApplied: 1,
      totalWin,
      collectedWilds: [],
      diamondsCollected: this.state.diamondsCollected,
      bonusMultiplierAfter: this.state.bonusMultiplier,
      freeSpinsRemaining: this.state.freeSpinsRemaining,
      retriggered: false,
      freeSpinsAdded: 0,
    };
  }

  // ─── Free-spin bonus ──────────────────────────────────────────────────────
  /** Transition out of the intro banner into the spinning phase. */
  beginBonusSpins(): void {
    if (this.state.phase === 'bonusIntro') this.state.phase = 'bonus';
  }

  /**
   * Run one free spin (§7 + revised retrigger rule). Order: the CURRENT
   * multiplier is applied to this spin's win, THEN diamonds on reels 2/3/4
   * are collected to raise the multiplier, THEN a 3+-scatter retrigger adds
   * another FREE_SPINS_AWARDED (multiplier PERSISTS — diamonds/multiplier are
   * never reset by a retrigger). Free-spin reels include scatters so this can
   * stack indefinitely. When the last spin resolves → 'bonusOutro'. Returns
   * null if not in the spinning phase or no spins remain.
   */
  bonusSpin(): SpinResult | null {
    if (this.state.phase !== 'bonus') return null;
    if (this.state.isSpinning) return null;
    if (this.state.freeSpinsRemaining <= 0) return null;

    const lineBet = this.state.bonusLineBetCents;
    const lineCount = this.state.bonusLineCount;
    const totalBet = lineBet * lineCount;
    const multiplier = bonusMultiplierFor(this.state.diamondsCollected);

    const { grid, stops } = this.spinReels(FREE_SPIN_REELS);
    const evalResult = LuxuryEngine.evaluateGrid(grid, lineBet, totalBet, lineCount);

    const spinWin = evalResult.baseWin * multiplier;
    if (spinWin > 0) {
      this.state.credits += spinWin;
      this.state.bonusWin += spinWin;
    }
    this.state.lastWinAmount = spinWin;
    this.state.grid = grid;
    this.state.reelStops = stops;

    // Collect diamonds: every WILD on reels 2/3/4 (capped at MAX_DIAMONDS).
    const collectedWilds: Array<[number, number]> = [];
    for (const reel of WILD_COLLECT_REELS) {
      for (let row = 0; row < NUM_ROWS; row++) {
        if (grid[reel][row] === 'WILD' && this.state.diamondsCollected < MAX_DIAMONDS) {
          this.state.diamondsCollected++;
          collectedWilds.push([reel, row]);
        }
      }
    }
    this.state.bonusMultiplier = bonusMultiplierFor(this.state.diamondsCollected);

    // Retrigger: 3+ scatters during the bonus add another batch of free
    // spins. The diamond multiplier is intentionally NOT reset — it persists
    // and keeps climbing across retriggers.
    let retriggered = false;
    let freeSpinsAdded = 0;
    if (evalResult.triggerBonus) {
      retriggered = true;
      freeSpinsAdded = FREE_SPINS_AWARDED;
      this.state.freeSpinsRemaining += FREE_SPINS_AWARDED;
      this.state.freeSpinsTotal += FREE_SPINS_AWARDED;
    }

    this.state.freeSpinsRemaining--;
    if (this.state.freeSpinsRemaining <= 0) this.state.phase = 'bonusOutro';

    return {
      ...evalResult,
      grid,
      reelStops: stops,
      isBonusSpin: true,
      multiplierApplied: multiplier,
      totalWin: spinWin,
      collectedWilds,
      diamondsCollected: this.state.diamondsCollected,
      bonusMultiplierAfter: this.state.bonusMultiplier,
      freeSpinsRemaining: this.state.freeSpinsRemaining,
      retriggered,
      freeSpinsAdded,
    };
  }

  /** Close the bonus and return to the base game. Bonus winnings were already
      credited per-spin; this just clears the transient bonus display state. */
  endBonus(): number {
    if (this.state.phase !== 'bonusOutro') return 0;
    const total = this.state.bonusWin;
    this.state.phase = 'base';
    this.state.lastWinAmount = total;
    this.state.freeSpinsRemaining = 0;
    return total;
  }

  /**
   * Credit a won progressive jackpot. Jackpots live in dollars and are
   * separate from base RTP, but the player is of course paid: convert at
   * 1 credit = $0.01 and add to the balance.
   */
  addJackpotWin(dollars: number): void {
    this.state.credits += Math.round(dollars / CREDIT_VALUE_DOLLARS);
    this.state.lastWinAmount = Math.round(dollars / CREDIT_VALUE_DOLLARS);
  }

  // ─── Progressive jackpots ─────────────────────────────────────────────────
  /**
   * Roll the three FEVER jackpot triggers for a spin. Each tier rolls an
   * independent uniform from the engine RNG (same MT19937 stream — fair and
   * test-seedable) and triggers when it falls under
   *   baseOdds × (totalBet / maxBet)
   * so a larger bet has a proportionally higher chance (revised spec §4).
   * Pure w.r.t. game state — the JackpotService owns the actual money/claim.
   *
   * @param totalBetCents the spin's total bet (credits ≡ cents).
   * @param baseOdds per-tier base trigger probability at MAX bet.
   * @returns the tiers that triggered this spin (usually empty).
   */
  rollJackpotTriggers(
    totalBetCents: number,
    baseOdds: { fever1: number; fever2: number; fever3: number }
  ): Array<'fever1' | 'fever2' | 'fever3'> {
    const betFactor =
      MAX_TOTAL_BET_CENTS > 0
        ? Math.min(1, totalBetCents / MAX_TOTAL_BET_CENTS)
        : 0;
    const tiers: Array<'fever1' | 'fever2' | 'fever3'> = [];
    for (const tier of ['fever1', 'fever2', 'fever3'] as const) {
      // rng.random() is a uint32; normalise to [0,1).
      const r = this.rng.random() / 4294967296;
      if (r < baseOdds[tier] * betFactor) tiers.push(tier);
    }
    return tiers;
  }
}
