"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TripleSevenEngine = exports.MAX_CREDITS_PER_LINE = exports.NUM_PAYLINES = exports.MIN_TOTAL_CREDITS = exports.MAX_TOTAL_CREDITS = exports.CREDIT_VALUE_CENTS = void 0;
exports.distributeCredits = distributeCredits;
exports.distributeBetCents = distributeBetCents;
const MersenneTwister_1 = require("./MersenneTwister");
/** 1 credit = 5 cents. Bets are denominated in whole credits. */
exports.CREDIT_VALUE_CENTS = 5;
/** Max 5 credits per line × 8 lines = 40 credits = $2.00 */
exports.MAX_TOTAL_CREDITS = 40;
exports.MIN_TOTAL_CREDITS = 1;
exports.NUM_PAYLINES = 8;
exports.MAX_CREDITS_PER_LINE = 5;
/**
 * Distribute a total credit bet across 8 paylines, round-robin starting
 * from Line 1. Each line caps at MAX_CREDITS_PER_LINE.
 *
 * Example: 10 credits → [2, 2, 1, 1, 1, 1, 1, 1] — Lines 1-2 have 2 credits
 * (10¢ each), Lines 3-8 have 1 credit (5¢ each).
 *
 * Returns an array of credits-per-line (length 8). Multiply by
 * CREDIT_VALUE_CENTS to get cents-per-line.
 */
function distributeCredits(totalCredits) {
    const clamped = Math.max(0, Math.min(exports.MAX_TOTAL_CREDITS, Math.floor(totalCredits)));
    const base = Math.floor(clamped / exports.NUM_PAYLINES);
    const extra = clamped % exports.NUM_PAYLINES;
    return Array.from({ length: exports.NUM_PAYLINES }, (_, i) => base + (i < extra ? 1 : 0));
}
/** Convenience: returns per-line bet in cents for a total cent bet. */
function distributeBetCents(totalCents) {
    const credits = Math.floor(totalCents / exports.CREDIT_VALUE_CENTS);
    return distributeCredits(credits).map((c) => c * exports.CREDIT_VALUE_CENTS);
}
class TripleSevenEngine {
    /**
     * Draw a single symbol index from the weighted reel strip. This is the
     * sole source of randomness for reel positions during a real spin.
     */
    pickWeightedSymbol() {
        const r = this.rng.randomInt(TripleSevenEngine.TOTAL_WEIGHT);
        let cumulative = 0;
        const weights = TripleSevenEngine.REEL_WEIGHTS;
        for (let i = 0; i < weights.length; i++) {
            cumulative += weights[i];
            if (r < cumulative)
                return i;
        }
        return weights.length - 1; // unreachable, defensive
    }
    /**
     * Public helper for the UI to draw a random symbol with the same
     * weighting as a real spin — used to populate the initial display
     * positions when the game first loads. Uses the engine's RNG.
     */
    pickRandomSymbolIndex() {
        return this.pickWeightedSymbol();
    }
    /**
     * Generate a 32-bit unsigned integer seed from the host's CSPRNG.
     * Used by default so every fresh engine instance starts with an
     * unpredictable RNG stream (NGCB Tech Standards prohibit static seeds).
     */
    static generateEntropySeed() {
        const buf = new Uint32Array(1);
        globalThis.crypto.getRandomValues(buf);
        return buf[0];
    }
    /**
     * @param initialCredits starting credit balance (in cents)
     * @param rngSeed OPT-IN deterministic seed for tests / replay. When omitted
     *   (production path), the RNG is seeded with fresh entropy from
     *   `crypto.getRandomValues` — never a static default.
     */
    constructor(initialCredits = 100000, rngSeed) {
        // Reel configuration: 14 symbols per POG 510C style guide §22.1
        // 7 variants (4), BAR variants (3), Bell (1), Fruit (6) = 14 total
        this.symbolNames = [
            'Red 7', // 0
            'White 7', // 1
            'Blue 7', // 2
            'Rainbow 7', // 3 - Jackpot
            'Triple BAR', // 4
            'Double BAR', // 5
            'Single BAR', // 6
            'Bell', // 7
            'Cherry', // 8 - Highest-paying fruit; classic arcade staple
            'Apple', // 9
            'Watermelon', // 10
            'Orange', // 11
            'Plum', // 12
            'Lemon', // 13
        ];
        this.reelSymbolCount = 14;
        const seed = rngSeed !== undefined ? rngSeed : TripleSevenEngine.generateEntropySeed();
        this.rng = new MersenneTwister_1.MersenneTwister(seed);
        this.state = {
            credits: initialCredits,
            reelPositions: [0, 0, 0, 0, 0, 0, 0, 0, 0], // 3x3 grid
            lastWinAmount: 0,
            isSpinning: false
        };
    }
    getState() {
        return { ...this.state };
    }
    calculateWinAll8Lines(positions, perLineBets) {
        // Grid layout: 0 1 2 / 3 4 5 / 6 7 8 (row by row).
        // Only lines whose bet > 0 are "active" and can pay out.
        let totalWin = 0;
        for (let i = 0; i < TripleSevenEngine.PAYLINES.length; i++) {
            const bet = perLineBets[i] ?? 0;
            if (bet <= 0)
                continue; // Inactive line — no payout possible
            const line = TripleSevenEngine.PAYLINES[i];
            const linePositions = [
                positions[line[0]],
                positions[line[1]],
                positions[line[2]],
            ];
            totalWin += this.calculateWin(linePositions, bet);
        }
        return totalWin;
    }
    calculateWin(positions, betAmount) {
        const symbols = positions.map(p => this.symbolNames[p]);
        const [s1, s2, s3] = symbols;
        // Helper: check if symbol is any type of 7
        const isSeven = (symbol) => {
            return symbol.includes('7');
        };
        // Helper: check if symbol is any type of BAR
        const isBAR = (symbol) => {
            return symbol.includes('BAR');
        };
        // === SEVENS ===
        // Payouts are × per-line bet. At max bet (5 credits / 25¢ per line):
        //   3 Rainbow 7s    → ×10,000 × 25¢ = $2,500  (jackpot, marquee value)
        //   3 same color    → ×1,000  × 25¢ =   $250
        //   3 mixed sevens  → ×500    × 25¢ =   $125
        if (isSeven(s1) && isSeven(s2) && isSeven(s3)) {
            if (s1 === 'Rainbow 7' && s2 === 'Rainbow 7' && s3 === 'Rainbow 7') {
                return betAmount * 10000;
            }
            if (s1 === s2 && s2 === s3) {
                return betAmount * 1000;
            }
            return betAmount * 500;
        }
        // === BELLS ===
        if (s1 === 'Bell' && s2 === 'Bell' && s3 === 'Bell') {
            return betAmount * 100;
        }
        // === BARS ===
        // All three BARs are the same type
        if (isBAR(s1) && isBAR(s2) && isBAR(s3)) {
            if (s1 === s2 && s2 === s3) {
                if (s1 === 'Triple BAR')
                    return betAmount * 50;
                if (s1 === 'Double BAR')
                    return betAmount * 40;
                if (s1 === 'Single BAR')
                    return betAmount * 30;
            }
            // Mixed BARs
            return betAmount * 10;
        }
        // === FRUIT ===
        // Cherry rule: cherries must be CONSECUTIVE FROM THE BEGINNING of the
        // payline to qualify. The "beginning" is the leftmost cell for horizontal
        // paylines and the topmost cell for vertical / diagonal paylines — this
        // is the cell at index 0 of the payline tuple by convention.
        //   1 cherry at start  → 2× bet
        //   2 cherries at start → 5× bet
        //   3 cherries (full line) → 8× bet
        // Cherry win takes precedence over the rest of the logic for this line
        // (a cherry at position 0 precludes any 3-of-a-kind on this payline).
        if (symbols[0] === 'Cherry') {
            if (symbols[1] === 'Cherry' && symbols[2] === 'Cherry')
                return betAmount * 8;
            if (symbols[1] === 'Cherry')
                return betAmount * 5;
            return betAmount * 2;
        }
        if (s1 === 'Apple' && s2 === 'Apple' && s3 === 'Apple') {
            return betAmount * 25;
        }
        if (s1 === 'Watermelon' && s2 === 'Watermelon' && s3 === 'Watermelon') {
            return betAmount * 15;
        }
        if (s1 === 'Orange' && s2 === 'Orange' && s3 === 'Orange') {
            return betAmount * 10;
        }
        if (s1 === 'Plum' && s2 === 'Plum' && s3 === 'Plum') {
            return betAmount * 10;
        }
        if (s1 === 'Lemon' && s2 === 'Lemon' && s3 === 'Lemon') {
            return betAmount * 10;
        }
        return 0;
    }
    /**
     * Run a spin with a given TOTAL bet in cents. The total is split across
     * the 8 paylines using the round-robin credit distribution: every 5¢ adds
     * one credit to the next line in order, looping back when all 8 are
     * filled at the current credit level.
     *
     * Returns the total win amount in cents.
     */
    async spin(totalBetCents) {
        if (this.state.credits < totalBetCents) {
            return 0;
        }
        const perLineBets = distributeBetCents(totalBetCents);
        this.state.isSpinning = true;
        this.state.credits -= totalBetCents;
        // Generate 9 weighted random symbol indices for the 3x3 grid. The
        // reel strip weighting (REEL_WEIGHTS) is what produces the target
        // ~92.6% RTP without touching paytable multipliers.
        const positions = [
            this.pickWeightedSymbol(),
            this.pickWeightedSymbol(),
            this.pickWeightedSymbol(),
            this.pickWeightedSymbol(),
            this.pickWeightedSymbol(),
            this.pickWeightedSymbol(),
            this.pickWeightedSymbol(),
            this.pickWeightedSymbol(),
            this.pickWeightedSymbol(),
        ];
        this.state.reelPositions = positions;
        const winAmount = this.calculateWinAll8Lines(positions, perLineBets);
        if (winAmount > 0) {
            this.state.credits += winAmount;
            this.state.lastWinAmount = winAmount;
        }
        else {
            this.state.lastWinAmount = 0;
        }
        this.state.isSpinning = false;
        return winAmount;
    }
    getSymbolNames() {
        return this.symbolNames;
    }
    // Public accessor for the canonical payline list — used by the UI to
    // draw payline overlays and the Rules & Paylines diagram.
    getPaylines() {
        return TripleSevenEngine.PAYLINES;
    }
    /**
     * Get which paylines are winners for the given positions, gated by which
     * lines were active for this spin's total bet. A line that mathematically
     * matches but had 0 credits on it pays nothing and is NOT returned.
     *
     * Returns indices into the PAYLINES array (so [0, 3] means Line 1 and Line 4
     * won and were active).
     */
    getWinningLines(positions, totalBetCents) {
        // If a total bet is provided, gate by active lines; otherwise treat all 8
        // as active (back-compat for any caller that doesn't yet pass the bet).
        const perLineBets = totalBetCents !== undefined ? distributeBetCents(totalBetCents) : new Array(exports.NUM_PAYLINES).fill(1);
        const winningLines = [];
        for (let i = 0; i < TripleSevenEngine.PAYLINES.length; i++) {
            if ((perLineBets[i] ?? 0) <= 0)
                continue; // Inactive line — skip
            const line = TripleSevenEngine.PAYLINES[i];
            const linePositions = [
                positions[line[0]],
                positions[line[1]],
                positions[line[2]],
            ];
            const lineWin = this.calculateWin(linePositions, 100); // dummy bet; only need >0 check
            if (lineWin > 0) {
                winningLines.push(i);
            }
        }
        return winningLines;
    }
}
exports.TripleSevenEngine = TripleSevenEngine;
// ────────────────────────────────────────────────────────────────────
//  REEL WEIGHTING — drives RTP without touching the paytable
// ────────────────────────────────────────────────────────────────────
// Index matches symbolNames above. The weight is the number of "stops"
// each symbol occupies on the virtual reel strip. Rare symbols (Rainbow 7)
// get 1 stop; common symbols (Lemon) get 10. Total: 73 stops per reel.
//
// This weighting yields a theoretical RTP of approximately 92.6% at
// max bet, putting the game in industry-standard casino range.
TripleSevenEngine.REEL_WEIGHTS = [
    2, // 0  Red 7
    2, // 1  White 7
    2, // 2  Blue 7
    1, // 3  Rainbow 7        ← rarest (jackpot)
    3, // 4  Triple BAR
    4, // 5  Double BAR
    5, // 6  Single BAR
    3, // 7  Bell
    8, // 8  Cherry           ← common (drives small wins)
    7, // 9  Apple
    8, // 10 Watermelon
    9, // 11 Orange
    9, // 12 Plum
    10, // 13 Lemon            ← most common
];
TripleSevenEngine.TOTAL_WEIGHT = 73;
// The 8 paylines, ordered by player-facing priority:
// horizontals (middle first), then diagonals, then verticals.
//
// The tuple ORDER matters: index [0] is the "start" of the line for any
// start-anchored rules (notably the cherry payout, which only qualifies
// when cherries sit at the beginning). Convention:
//   - Horizontal lines start on the LEFT (lowest cell index in the row)
//   - Vertical lines start on the TOP (lowest cell index in the column)
//   - Diagonals: when one end is on the left and the other on top,
//     LEFT WINS — so the TR→BL diagonal starts at the bottom-left cell.
//
// This is the single source of truth — anywhere else that needs the line
// list must call getPaylines() rather than re-declaring.
TripleSevenEngine.PAYLINES = [
    [3, 4, 5], // Line 1 — Horizontal middle
    [0, 1, 2], // Line 2 — Horizontal top
    [6, 7, 8], // Line 3 — Horizontal bottom
    [0, 4, 8], // Line 4 — Diagonal TL→BR (start at top-left)
    [6, 4, 2], // Line 5 — Diagonal BL→TR (start at BOTTOM-LEFT)
    [0, 3, 6], // Line 6 — Vertical left
    [1, 4, 7], // Line 7 — Vertical middle
    [2, 5, 8], // Line 8 — Vertical right
];
