"use strict";
// CommonJS mirror of src/engine/LuxuryEngine.ts — pure logic only (no DOM,
// no crypto). Kept verbatim-faithful to the TS source so the stress harness
// exercises the exact production math. If LuxuryEngine.ts changes, update
// this file in lockstep (same convention as build/TripleSevenEngine.js).
Object.defineProperty(exports, "__esModule", { value: true });

const NUM_REELS = 5;
const NUM_ROWS = 3;
const NUM_PAYLINES = 20;
const FREE_SPINS_AWARDED = 12;
const BONUS_BASE_MULTIPLIER = 2;
const MAX_DIAMONDS = 27;
const MAX_BONUS_MULTIPLIER = BONUS_BASE_MULTIPLIER + MAX_DIAMONDS;
const SCATTERS_TO_TRIGGER = 3;
const WILD_COLLECT_REELS = [1, 2, 3];

const PAYTABLE = {
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

const PAYLINES = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 0, 1, 0, 1],
  [1, 2, 1, 2, 1],
  [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2],
  [0, 1, 0, 1, 0],
  [2, 1, 2, 1, 2],
  [0, 0, 2, 0, 0],
  [2, 2, 0, 2, 2],
  [1, 0, 2, 0, 1],
  [1, 2, 0, 2, 1],
  [0, 2, 0, 2, 0],
];

const BASE_REELS = [
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

const FREE_SPIN_REELS = [
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

function bonusMultiplierFor(diamonds) {
  return Math.min(BONUS_BASE_MULTIPLIER + diamonds, MAX_BONUS_MULTIPLIER);
}

/** Draw one stop per reel; visible window = [stop, stop+1, stop+2] mod len. */
function spinReels(rng, reels) {
  const grid = [];
  const stops = [];
  for (let r = 0; r < NUM_REELS; r++) {
    const strip = reels[r];
    const stop = rng.randomInt(strip.length);
    stops.push(stop);
    grid.push([
      strip[stop % strip.length],
      strip[(stop + 1) % strip.length],
      strip[(stop + 2) % strip.length],
    ]);
  }
  return { grid, stops };
}

/** Verbatim port of LuxuryEngine.evaluateGrid (§6). `activeLines` defaults to
 *  all 15 so the RTP/eval harnesses exercise the exact production path. */
function evaluateGrid(grid, betPerLine, totalBet, activeLines) {
  const winningLines = [];
  let lineWin = 0;
  const lines = Math.max(0, Math.min(
    activeLines === undefined ? PAYLINES.length : activeLines,
    PAYLINES.length
  ));

  for (let lineIdx = 0; lineIdx < lines; lineIdx++) {
    const line = PAYLINES[lineIdx];
    const symbolsOnLine = line.map((row, reel) => grid[reel][row]);

    let leadSymbol = null;
    for (const s of symbolsOnLine) {
      if (s !== 'WILD' && s !== 'BLANK' && s !== 'SCATTER') {
        leadSymbol = s;
        break;
      }
    }
    if (!leadSymbol && symbolsOnLine[0] === 'WILD') leadSymbol = 'JET';
    if (!leadSymbol) continue;

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

  // Diamond WILD substitutes for the SCATTER too — every WILD cell also
  // counts toward the scatter total / 3+ bonus trigger.
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

/**
 * Run the full free-spin bonus for the RTP model: 12 spins on FREE_SPIN_REELS
 * (which now CONTAIN scatters), current multiplier applied to each spin's win,
 * then diamonds collected from reels 2/3/4 (capped at 27). 3+ scatters during
 * the bonus RETRIGGER (+12 spins), can stack indefinitely, and the multiplier
 * PERSISTS across retriggers. Returns total bonus win (cents). No extra wager.
 * A hard cap guards against a pathological infinite-retrigger strip.
 */
function runBonus(rng, betPerLine, totalBet) {
  let spinsRemaining = FREE_SPINS_AWARDED;
  let diamonds = 0;
  let bonusWin = 0;
  let spinsRun = 0;
  const HARD_CAP = 100000; // safety only; real strips converge far sooner
  while (spinsRemaining > 0 && spinsRun < HARD_CAP) {
    const multiplier = bonusMultiplierFor(diamonds);
    const { grid } = spinReels(rng, FREE_SPIN_REELS);
    const ev = evaluateGrid(grid, betPerLine, totalBet);
    bonusWin += ev.baseWin * multiplier;
    for (const reel of WILD_COLLECT_REELS) {
      for (let row = 0; row < NUM_ROWS; row++) {
        if (grid[reel][row] === 'WILD' && diamonds < MAX_DIAMONDS) diamonds++;
      }
    }
    if (ev.triggerBonus) spinsRemaining += FREE_SPINS_AWARDED; // retrigger
    spinsRemaining--;
    spinsRun++;
  }
  return { bonusWin, diamonds, spinsRun };
}

module.exports = {
  NUM_REELS,
  NUM_ROWS,
  NUM_PAYLINES,
  FREE_SPINS_AWARDED,
  BONUS_BASE_MULTIPLIER,
  MAX_DIAMONDS,
  MAX_BONUS_MULTIPLIER,
  SCATTERS_TO_TRIGGER,
  WILD_COLLECT_REELS,
  PAYTABLE,
  PAYLINES,
  BASE_REELS,
  FREE_SPIN_REELS,
  bonusMultiplierFor,
  spinReels,
  evaluateGrid,
  runBonus,
};
