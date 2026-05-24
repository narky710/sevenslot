"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LuxuryEngine = exports.WILD_COLLECT_REELS = exports.SCATTERS_TO_TRIGGER = exports.MAX_BONUS_MULTIPLIER = exports.MAX_DIAMONDS = exports.BONUS_BASE_MULTIPLIER = exports.FREE_SPINS_AWARDED = exports.FREE_SPIN_REELS = exports.BASE_REELS = exports.PAYLINES = exports.PAYTABLE = exports.MAX_TOTAL_BET_CENTS = exports.DEFAULT_LINE_COUNT = exports.LINE_COUNT_OPTIONS = exports.DEFAULT_LINE_BET_CENTS = exports.MAX_LINE_BET_CENTS = exports.MIN_LINE_BET_CENTS = exports.LINE_BET_STEPS_CENTS = exports.creditsToDollars = exports.CREDIT_VALUE_DOLLARS = exports.NUM_PAYLINES = exports.NUM_ROWS = exports.NUM_REELS = void 0;
exports.bonusMultiplierFor = bonusMultiplierFor;
const MersenneTwister_1 = require("./MersenneTwister");
exports.NUM_REELS = 5;
exports.NUM_ROWS = 3;
/** 20 fixed paylines (cabinet-accurate per the revised spec). */
exports.NUM_PAYLINES = 20;
/**
 * Money is denominated in CREDITS. Per the cabinet, 1 credit = $0.01, so the
 * 400-credit max bet (20 lines × 20 credits/line) is exactly $4.00. The engine
 * stores everything as integer credits; `creditsToDollars` is only for the
 * jackpot/$ displays. (Internally identical to a cents model — 1 credit ≡ 1¢.)
 */
exports.CREDIT_VALUE_DOLLARS = 0.01;
const creditsToDollars = (credits) => credits * exports.CREDIT_VALUE_DOLLARS;
exports.creditsToDollars = creditsToDollars;
/**
 * Bet levers: number of active paylines × credits wagered per line.
 * Per-line options 1/2/3/5/10/20 credits; default 20 → 20×20 = 400 max.
 * (Kept the LINE_BET_*_CENTS names to avoid a churny rename; 1 credit ≡ 1¢.)
 */
exports.LINE_BET_STEPS_CENTS = [1, 2, 3, 5, 10, 20];
exports.MIN_LINE_BET_CENTS = exports.LINE_BET_STEPS_CENTS[0];
exports.MAX_LINE_BET_CENTS = exports.LINE_BET_STEPS_CENTS[exports.LINE_BET_STEPS_CENTS.length - 1];
exports.DEFAULT_LINE_BET_CENTS = 20;
/**
 * Selectable line counts. Paylines are priority-ordered in PAYLINES (line 1 =
 * middle horizontal first), so activating N lines means the first N entries.
 * Default = all 20 (the cabinet ships all 20 active).
 */
exports.LINE_COUNT_OPTIONS = [1, 5, 10, 15, 20];
exports.DEFAULT_LINE_COUNT = exports.NUM_PAYLINES;
/** Max total bet in credits (= cents) — used to bet-scale jackpot odds. */
exports.MAX_TOTAL_BET_CENTS = exports.MAX_LINE_BET_CENTS * exports.NUM_PAYLINES; // 20 × 20 = 400 ($4.00)
/**
 * Line-win multipliers, applied to BET PER LINE. A win needs 3+ consecutive
 * matches from reel 1 (left→right); only JET also pays for 2 of a kind.
 * SCATTER pays as a scatter (× TOTAL bet, anywhere on the grid).
 * Rebalanced down ~15-20% for the 20-line + retrigger configuration (§8 of
 * the revised spec); reel strips are then Monte-Carlo tuned to 94–96% RTP.
 */
exports.PAYTABLE = {
    JET: { 2: 0, 3: 0, 4: 0, 5: 3 },
    YACHT: { 3: 0, 4: 0, 5: 0 },
    CAR: { 3: 0, 4: 0, 5: 1 },
    MONEY: { 3: 0, 4: 0, 5: 0 },
    RING: { 3: 0, 4: 0, 5: 0 },
    WATCH: { 3: 0, 4: 0, 5: 0 },
    GOLD_BARS: { 3: 0, 4: 0, 5: 0 },
    SILVER_BARS: { 3: 0, 4: 0, 5: 0 },
    GOLD_BAR: { 3: 0, 4: 0, 5: 0 },
    BOW_TIE: { 5: 0 },
    SUNGLASSES: { 5: 0 },
    PERFUME: { 5: 0 },
    SCATTER: { 3: 1, 4: 1, 5: 1 },
    WILD: {},
    BLANK: {},
};
/**
 * The 20 fixed paylines. Each entry is [R1,R2,R3,R4,R5] where the value is the
 * row index on that reel (top=0, middle=1, bottom=2). Single source of truth —
 * the view reads getPaylines() rather than re-declaring.
 */
exports.PAYLINES = [
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
exports.BASE_REELS = [
    ['GOLD_BAR', 'GOLD_BARS', 'SCATTER', 'MONEY', 'WATCH', 'BLANK', 'YACHT', 'CAR', 'JET',
        'RING', 'SILVER_BARS', 'GOLD_BAR', 'GOLD_BARS', 'SCATTER', 'MONEY', 'WATCH', 'BLANK', 'RING',
        'SILVER_BARS', 'GOLD_BAR', 'BLANK', 'BLANK', 'BLANK', 'BLANK', 'BLANK', 'BLANK', 'BLANK',
        'BLANK', 'BLANK', 'BLANK', 'BLANK', 'BLANK', 'BLANK', 'BLANK'],
    ['GOLD_BAR', 'GOLD_BARS', 'SCATTER', 'MONEY', 'WATCH', 'BLANK', 'YACHT', 'CAR', 'JET',
        'RING', 'WILD', 'SILVER_BARS', 'GOLD_BAR', 'GOLD_BARS', 'SCATTER', 'MONEY', 'WATCH', 'BLANK',
        'RING', 'WILD', 'SILVER_BARS', 'GOLD_BAR', 'BLANK', 'WILD', 'BLANK', 'BLANK', 'BLANK',
        'BLANK', 'BLANK', 'BLANK', 'BLANK', 'BLANK', 'BLANK', 'BLANK'],
    ['GOLD_BAR', 'GOLD_BARS', 'SCATTER', 'MONEY', 'WATCH', 'BLANK', 'YACHT', 'CAR', 'JET',
        'RING', 'WILD', 'SILVER_BARS', 'GOLD_BAR', 'GOLD_BARS', 'SCATTER', 'MONEY', 'WATCH', 'BLANK',
        'RING', 'WILD', 'SILVER_BARS', 'GOLD_BAR', 'BLANK', 'WILD', 'BLANK', 'BLANK', 'BLANK',
        'BLANK', 'BLANK', 'BLANK', 'BLANK', 'BLANK', 'BLANK', 'BLANK'],
    ['GOLD_BAR', 'GOLD_BARS', 'SCATTER', 'MONEY', 'WATCH', 'BLANK', 'YACHT', 'CAR', 'JET',
        'RING', 'WILD', 'SILVER_BARS', 'GOLD_BAR', 'GOLD_BARS', 'SCATTER', 'MONEY', 'WATCH', 'BLANK',
        'RING', 'WILD', 'SILVER_BARS', 'GOLD_BAR', 'BLANK', 'WILD', 'BLANK', 'BLANK', 'BLANK',
        'BLANK', 'BLANK', 'BLANK', 'BLANK', 'BLANK', 'BLANK', 'BLANK'],
    ['GOLD_BAR', 'GOLD_BARS', 'SCATTER', 'MONEY', 'WATCH', 'BLANK', 'YACHT', 'CAR', 'JET',
        'RING', 'SILVER_BARS', 'GOLD_BAR', 'GOLD_BARS', 'SCATTER', 'MONEY', 'WATCH', 'BLANK', 'RING',
        'SILVER_BARS', 'GOLD_BAR', 'BLANK', 'BLANK', 'BLANK', 'BLANK', 'BLANK', 'BLANK', 'BLANK',
        'BLANK', 'BLANK', 'BLANK', 'BLANK', 'BLANK', 'BLANK', 'BLANK'],
];
/**
 * Free-spin reel strips. NO SCATTER anywhere (retriggers are structurally
 * impossible), and reels 2/3/4 are heavy with WILD to feed the diamond-
 * collection multiplier. Reels 1/5 carry no WILD and no SCATTER.
 */
exports.FREE_SPIN_REELS = [
    ['GOLD_BAR', 'GOLD_BARS', 'SCATTER', 'MONEY', 'WATCH', 'BLANK', 'YACHT', 'CAR', 'JET',
        'RING', 'SILVER_BARS', 'GOLD_BAR', 'GOLD_BARS', 'MONEY', 'WATCH', 'BLANK', 'CAR', 'RING',
        'SILVER_BARS', 'GOLD_BAR', 'GOLD_BARS', 'MONEY', 'WATCH', 'BLANK', 'RING', 'SILVER_BARS', 'GOLD_BAR',
        'GOLD_BARS', 'WATCH', 'BLANK', 'SILVER_BARS', 'GOLD_BAR', 'BLANK', 'BLANK'],
    ['GOLD_BAR', 'GOLD_BARS', 'SCATTER', 'MONEY', 'WATCH', 'BLANK', 'YACHT', 'CAR', 'JET',
        'RING', 'WILD', 'SILVER_BARS', 'GOLD_BAR', 'GOLD_BARS', 'MONEY', 'WATCH', 'BLANK', 'CAR',
        'RING', 'WILD', 'SILVER_BARS', 'GOLD_BAR', 'GOLD_BARS', 'MONEY', 'WATCH', 'BLANK', 'RING',
        'GOLD_BAR', 'GOLD_BARS', 'WATCH', 'BLANK', 'SILVER_BARS', 'GOLD_BAR', 'BLANK'],
    ['GOLD_BAR', 'GOLD_BARS', 'SCATTER', 'MONEY', 'WATCH', 'BLANK', 'YACHT', 'CAR', 'JET',
        'RING', 'WILD', 'SILVER_BARS', 'GOLD_BAR', 'GOLD_BARS', 'MONEY', 'WATCH', 'BLANK', 'CAR',
        'RING', 'WILD', 'SILVER_BARS', 'GOLD_BAR', 'GOLD_BARS', 'MONEY', 'WATCH', 'BLANK', 'RING',
        'GOLD_BAR', 'GOLD_BARS', 'WATCH', 'BLANK', 'SILVER_BARS', 'GOLD_BAR', 'BLANK'],
    ['GOLD_BAR', 'GOLD_BARS', 'SCATTER', 'MONEY', 'WATCH', 'BLANK', 'YACHT', 'CAR', 'JET',
        'RING', 'WILD', 'SILVER_BARS', 'GOLD_BAR', 'GOLD_BARS', 'MONEY', 'WATCH', 'BLANK', 'CAR',
        'RING', 'WILD', 'SILVER_BARS', 'GOLD_BAR', 'GOLD_BARS', 'MONEY', 'WATCH', 'BLANK', 'RING',
        'GOLD_BAR', 'GOLD_BARS', 'WATCH', 'BLANK', 'SILVER_BARS', 'GOLD_BAR', 'BLANK'],
    ['GOLD_BAR', 'GOLD_BARS', 'SCATTER', 'MONEY', 'WATCH', 'BLANK', 'YACHT', 'CAR', 'JET',
        'RING', 'SILVER_BARS', 'GOLD_BAR', 'GOLD_BARS', 'MONEY', 'WATCH', 'BLANK', 'CAR', 'RING',
        'SILVER_BARS', 'GOLD_BAR', 'GOLD_BARS', 'MONEY', 'WATCH', 'BLANK', 'RING', 'SILVER_BARS', 'GOLD_BAR',
        'GOLD_BARS', 'WATCH', 'BLANK', 'SILVER_BARS', 'GOLD_BAR', 'BLANK', 'BLANK'],
];
// ─── Bonus tuning ────────────────────────────────────────────────────────────
/** Free spins awarded on 3+ scatters (and added again on each retrigger). */
exports.FREE_SPINS_AWARDED = 10;
exports.BONUS_BASE_MULTIPLIER = 2;
exports.MAX_DIAMONDS = 27;
exports.MAX_BONUS_MULTIPLIER = exports.BONUS_BASE_MULTIPLIER + exports.MAX_DIAMONDS; // 29
exports.SCATTERS_TO_TRIGGER = 3;
/** Wilds are collected from reels 2/3/4 — 0-based reel indices [1,2,3]. */
exports.WILD_COLLECT_REELS = [1, 2, 3];
/** multiplier = min(2 + diamonds, 29). */
function bonusMultiplierFor(diamondsCollected) {
    return Math.min(exports.BONUS_BASE_MULTIPLIER + diamondsCollected, exports.MAX_BONUS_MULTIPLIER);
}
class LuxuryEngine {
    /**
     * 32-bit unsigned seed from the host CSPRNG. Used by default so every fresh
     * engine starts with an unpredictable RNG stream (NGCB Tech Standards
     * prohibit static seed initialization for gaming RNGs).
     */
    static generateEntropySeed() {
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
    constructor(initialCredits = 5000, rngSeed) {
        const seed = rngSeed !== undefined ? rngSeed : LuxuryEngine.generateEntropySeed();
        this.rng = new MersenneTwister_1.MersenneTwister(seed);
        this.state = {
            credits: initialCredits,
            phase: 'base',
            lineBetCents: exports.DEFAULT_LINE_BET_CENTS,
            lineCount: exports.DEFAULT_LINE_COUNT,
            totalBetCents: exports.DEFAULT_LINE_BET_CENTS * exports.DEFAULT_LINE_COUNT,
            grid: LuxuryEngine.blankGrid(),
            reelStops: [0, 0, 0, 0, 0],
            lastWinAmount: 0,
            isSpinning: false,
            freeSpinsRemaining: 0,
            freeSpinsTotal: 0,
            diamondsCollected: 0,
            bonusMultiplier: exports.BONUS_BASE_MULTIPLIER,
            bonusWin: 0,
            bonusLineBetCents: exports.DEFAULT_LINE_BET_CENTS,
            bonusLineCount: exports.DEFAULT_LINE_COUNT,
        };
    }
    static blankGrid() {
        const syms = ['BOW_TIE', 'SUNGLASSES', 'PERFUME'];
        return Array.from({ length: exports.NUM_REELS }, (_, r) => Array.from({ length: exports.NUM_ROWS }, (_, row) => syms[(r * exports.NUM_ROWS + row) % 3]));
    }
    getState() {
        return {
            ...this.state,
            grid: this.state.grid.map((reel) => [...reel]),
            reelStops: [...this.state.reelStops],
        };
    }
    getPaylines() {
        return exports.PAYLINES;
    }
    // ─── Bet management ───────────────────────────────────────────────────────
    // Total bet = per-line bet × active line count. Both levers are locked
    // while a bonus is in flight (the wager is pinned to the trigger bet).
    recomputeTotalBet() {
        this.state.totalBetCents = this.state.lineBetCents * this.state.lineCount;
    }
    /** Set the per-line bet (cents). Snaps to the nearest configured step. */
    setLineBet(cents) {
        if (this.state.phase !== 'base' || this.state.isSpinning)
            return;
        let best = exports.LINE_BET_STEPS_CENTS[0];
        for (const step of exports.LINE_BET_STEPS_CENTS) {
            if (Math.abs(step - cents) < Math.abs(best - cents))
                best = step;
        }
        this.state.lineBetCents = best;
        this.recomputeTotalBet();
    }
    /** Step the per-line bet up/down through LINE_BET_STEPS_CENTS. */
    stepLineBet(direction) {
        if (this.state.phase !== 'base' || this.state.isSpinning)
            return;
        const i = exports.LINE_BET_STEPS_CENTS.indexOf(this.state.lineBetCents);
        const next = Math.max(0, Math.min(exports.LINE_BET_STEPS_CENTS.length - 1, i + direction));
        this.state.lineBetCents = exports.LINE_BET_STEPS_CENTS[next];
        this.recomputeTotalBet();
    }
    /** Set the active line count. Clamped to 1..NUM_PAYLINES (whole lines). */
    setLineCount(count) {
        if (this.state.phase !== 'base' || this.state.isSpinning)
            return;
        const n = Math.round(count);
        this.state.lineCount = Math.max(1, Math.min(exports.NUM_PAYLINES, n));
        this.recomputeTotalBet();
    }
    /** Step the active line count by exactly one, clamped to 1..NUM_PAYLINES. */
    stepLineCount(direction) {
        if (this.state.phase !== 'base' || this.state.isSpinning)
            return;
        this.state.lineCount = Math.max(1, Math.min(exports.NUM_PAYLINES, this.state.lineCount + direction));
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
    spinReels(reels) {
        const grid = [];
        const stops = [];
        for (let r = 0; r < exports.NUM_REELS; r++) {
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
    pickRandomDisplayGrid() {
        return this.spinReels(exports.BASE_REELS);
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
    static evaluateGrid(grid, betPerLine, totalBet, activeLines = exports.PAYLINES.length) {
        const winningLines = [];
        let lineWin = 0;
        const lines = Math.max(0, Math.min(activeLines, exports.PAYLINES.length));
        for (let lineIdx = 0; lineIdx < lines; lineIdx++) {
            const line = exports.PAYLINES[lineIdx];
            const symbolsOnLine = line.map((row, reel) => grid[reel][row]);
            // Lead symbol = leftmost symbol that isn't WILD/BLANK/SCATTER.
            let leadSymbol = null;
            for (const s of symbolsOnLine) {
                if (s !== 'WILD' && s !== 'BLANK' && s !== 'SCATTER') {
                    leadSymbol = s;
                    break;
                }
            }
            // A line opening with WILD and no other payable symbol pays as JET.
            if (!leadSymbol && symbolsOnLine[0] === 'WILD')
                leadSymbol = 'JET';
            if (!leadSymbol)
                continue;
            // Count consecutive matches from reel 1; WILD substitutes, SCATTER and
            // BLANK break the chain.
            let matchCount = 0;
            let wildUsed = false;
            for (let r = 0; r < exports.NUM_REELS; r++) {
                const s = symbolsOnLine[r];
                if (s === leadSymbol) {
                    matchCount++;
                }
                else if (s === 'WILD') {
                    matchCount++;
                    wildUsed = true;
                }
                else {
                    break;
                }
            }
            const payRow = exports.PAYTABLE[leadSymbol];
            const mult = payRow ? payRow[matchCount] : undefined;
            if (mult) {
                let win = mult * betPerLine;
                if (wildUsed)
                    win *= 2;
                lineWin += win;
                winningLines.push({ line: lineIdx, symbol: leadSymbol, count: matchCount, wildUsed, win });
            }
        }
        // Scatters pay anywhere; only the single highest scatter award counts.
        // The Diamond WILD substitutes for the SCATTER too, so every WILD cell
        // also counts toward the scatter total (and the 3+ bonus trigger).
        let scatterCount = 0;
        for (let r = 0; r < exports.NUM_REELS; r++) {
            for (let row = 0; row < exports.NUM_ROWS; row++) {
                const cell = grid[r][row];
                if (cell === 'SCATTER' || cell === 'WILD')
                    scatterCount++;
            }
        }
        let scatterWin = 0;
        if (scatterCount >= exports.SCATTERS_TO_TRIGGER) {
            const capped = Math.min(scatterCount, 5);
            const scatterMult = exports.PAYTABLE.SCATTER[capped] || 0;
            scatterWin = scatterMult * totalBet;
        }
        return {
            winningLines,
            lineWin,
            scatterCount,
            scatterWin,
            baseWin: lineWin + scatterWin,
            triggerBonus: scatterCount >= exports.SCATTERS_TO_TRIGGER,
        };
    }
    // ─── Base game ────────────────────────────────────────────────────────────
    /**
     * Run one base-game spin. Deducts the total bet, spins BASE_REELS, evaluates,
     * credits the win, and — on 3+ scatters — arms the free-spin bonus (phase
     * → 'bonusIntro'). Returns null if the spin can't start (wrong phase,
     * already spinning, or insufficient credits).
     */
    spin() {
        if (this.state.phase !== 'base')
            return null;
        if (this.state.isSpinning)
            return null;
        const totalBet = this.state.totalBetCents;
        if (this.state.credits < totalBet)
            return null;
        this.state.credits -= totalBet;
        this.state.lastWinAmount = 0;
        const { grid, stops } = this.spinReels(exports.BASE_REELS);
        const evalResult = LuxuryEngine.evaluateGrid(grid, this.state.lineBetCents, totalBet, this.state.lineCount);
        this.state.grid = grid;
        this.state.reelStops = stops;
        const totalWin = evalResult.baseWin; // no multiplier in the base game
        if (totalWin > 0) {
            this.state.credits += totalWin;
            this.state.lastWinAmount = totalWin;
        }
        if (evalResult.triggerBonus) {
            this.state.phase = 'bonusIntro';
            this.state.freeSpinsTotal = exports.FREE_SPINS_AWARDED;
            this.state.freeSpinsRemaining = exports.FREE_SPINS_AWARDED;
            this.state.diamondsCollected = 0;
            this.state.bonusMultiplier = exports.BONUS_BASE_MULTIPLIER;
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
    beginBonusSpins() {
        if (this.state.phase === 'bonusIntro')
            this.state.phase = 'bonus';
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
    bonusSpin() {
        if (this.state.phase !== 'bonus')
            return null;
        if (this.state.isSpinning)
            return null;
        if (this.state.freeSpinsRemaining <= 0)
            return null;
        const lineBet = this.state.bonusLineBetCents;
        const lineCount = this.state.bonusLineCount;
        const totalBet = lineBet * lineCount;
        const multiplier = bonusMultiplierFor(this.state.diamondsCollected);
        const { grid, stops } = this.spinReels(exports.FREE_SPIN_REELS);
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
        const collectedWilds = [];
        for (const reel of exports.WILD_COLLECT_REELS) {
            for (let row = 0; row < exports.NUM_ROWS; row++) {
                if (grid[reel][row] === 'WILD' && this.state.diamondsCollected < exports.MAX_DIAMONDS) {
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
            freeSpinsAdded = exports.FREE_SPINS_AWARDED;
            this.state.freeSpinsRemaining += exports.FREE_SPINS_AWARDED;
            this.state.freeSpinsTotal += exports.FREE_SPINS_AWARDED;
        }
        this.state.freeSpinsRemaining--;
        if (this.state.freeSpinsRemaining <= 0)
            this.state.phase = 'bonusOutro';
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
    endBonus() {
        if (this.state.phase !== 'bonusOutro')
            return 0;
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
    addJackpotWin(dollars) {
        this.state.credits += Math.round(dollars / exports.CREDIT_VALUE_DOLLARS);
        this.state.lastWinAmount = Math.round(dollars / exports.CREDIT_VALUE_DOLLARS);
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
    rollJackpotTriggers(totalBetCents, baseOdds) {
        const betFactor = exports.MAX_TOTAL_BET_CENTS > 0
            ? Math.min(1, totalBetCents / exports.MAX_TOTAL_BET_CENTS)
            : 0;
        const tiers = [];
        for (const tier of ['fever1', 'fever2', 'fever3']) {
            // rng.random() is a uint32; normalise to [0,1).
            const r = this.rng.random() / 4294967296;
            if (r < baseOdds[tier] * betFactor)
                tiers.push(tier);
        }
        return tiers;
    }
}
exports.LuxuryEngine = LuxuryEngine;
