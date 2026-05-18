/**
 * Diamond Riches — evaluation & bonus invariants (spec §13.1 / §13.2).
 *
 * Standalone Node assertions over the build mirror (same convention as
 * keno-sanity.cjs / verify-rng-seed.cjs). Exits non-zero on first failure.
 */

const E = require('./build/LuxuryEngine');
const { MersenneTwister } = require('./build/MersenneTwister');

let passed = 0;
let failed = 0;
function ok(name, cond, extra) {
  if (cond) { passed++; }
  else { failed++; console.error(`  ✗ ${name}${extra ? ' — ' + extra : ''}`); }
}
function eq(name, got, want) {
  ok(name, got === want, `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
}

// Build a 5×3 grid from a top-row array; rows 1 & 2 are BLANK unless given.
function grid(top, mid, bot) {
  const m = mid || ['BLANK','BLANK','BLANK','BLANK','BLANK'];
  const b = bot || ['BLANK','BLANK','BLANK','BLANK','BLANK'];
  return [0,1,2,3,4].map((r) => [top[r], m[r], b[r]]);
}
function lineEntry(ev, lineIdx) {
  return ev.winningLines.find((w) => w.line === lineIdx);
}

const BET = 10;                      // credits per line
const TOTAL = BET * E.NUM_PAYLINES;  // 20 lines → 200

console.log('Diamond Riches — eval & bonus invariants\n');

// ── §13.1 Symbol pays: 3 / 4 / 5 of a kind (+ JET 2) ────────────────────────
const PAYABLE = ['JET','YACHT','CAR','MONEY','RING','WATCH','GOLD_BARS','SILVER_BARS','GOLD_BAR'];
for (const sym of PAYABLE) {
  const filler = sym === 'GOLD_BAR' ? 'RING' : 'GOLD_BAR';
  for (const count of [3, 4, 5]) {
    const top = [0,1,2,3,4].map((i) => (i < count ? sym : filler));
    const ev = E.evaluateGrid(grid(top), BET, TOTAL);
    const want = E.PAYTABLE[sym][count] * BET;
    const got = lineEntry(ev, 0); // line index 0 = middle? no — line 1 array is index 0
    // PAYLINES[1] (index 1) is the TOP horizontal — use that for top-row tests.
    const topLine = lineEntry(ev, 1);
    ok(`${sym} ×${count}`, topLine && topLine.win === want && topLine.count === count,
      topLine ? `win ${topLine.win} want ${want} count ${topLine.count}` : 'no win on top line');
    void got;
  }
}
{
  const ev = E.evaluateGrid(grid(['JET','JET','RING','RING','RING']), BET, TOTAL);
  const tl = lineEntry(ev, 1);
  ok('JET pays 2-of-a-kind', tl && tl.win === E.PAYTABLE.JET[2] * BET && tl.count === 2,
    tl ? `win ${tl.win}` : 'no win');
}
{
  const ev = E.evaluateGrid(grid(['YACHT','YACHT','RING','RING','RING']), BET, TOTAL);
  ok('non-JET does NOT pay 2-of-a-kind', !lineEntry(ev, 1));
}

// ── §13.1 Wild substitution + doubling ──────────────────────────────────────
{
  const ev = E.evaluateGrid(grid(['JET','WILD','JET','RING','RING']), BET, TOTAL);
  const tl = lineEntry(ev, 1);
  eq('JET WILD JET → 3 of a kind JET (count)', tl && tl.count, 3);
  ok('wild doubles the win', tl && tl.win === E.PAYTABLE.JET[3] * BET * 2,
    tl ? `win ${tl.win} want ${E.PAYTABLE.JET[3] * BET * 2}` : 'no win');
  ok('wildUsed flag set', tl && tl.wildUsed === true);
}
{
  const ev = E.evaluateGrid(grid(['JET','JET','JET','RING','RING']), BET, TOTAL);
  const tl = lineEntry(ev, 1);
  ok('no wild → not doubled', tl && tl.win === E.PAYTABLE.JET[3] * BET && tl.wildUsed === false,
    tl ? `win ${tl.win}` : 'no win');
}

// ── §13.1 Wild ALSO substitutes for scatter ─────────────────────────────────
// A WILD now counts toward the scatter total and the 3+ bonus trigger.
// (Line evaluation is unchanged: a SCATTER still breaks a line chain — only
// scatter COUNTING changed, not the wild's line behaviour.)
{
  // Top row all scatter: 3 scatters → scatter pays, no line pay via wild.
  const ev = E.evaluateGrid(grid(['SCATTER','SCATTER','SCATTER','RING','RING']), BET, TOTAL);
  ok('3 scatters on a line do not form a line win', !lineEntry(ev, 1));
  eq('…but scatter still pays (× total bet)', ev.scatterWin, E.PAYTABLE.SCATTER[3] * TOTAL);
}
{
  // 3 WILDs (no actual SCATTER) now count as 3 scatters → bonus + scatter pay.
  const ev = E.evaluateGrid(grid(['WILD','BLANK','WILD','BLANK','WILD']), BET, TOTAL);
  eq('3 wilds count as 3 scatters', ev.scatterCount, 3);
  ok('3 wilds → triggerBonus (wild substitutes scatter)', ev.triggerBonus === true);
  eq('3 wilds pay the scatter award (× total bet)', ev.scatterWin, E.PAYTABLE.SCATTER[3] * TOTAL);
}
{
  // Mixed: 2 real SCATTER + 1 WILD = 3 toward the trigger.
  const ev = E.evaluateGrid(
    grid(['SCATTER','BLANK','WILD','BLANK','SCATTER']), BET, TOTAL);
  eq('2 scatter + 1 wild → scatterCount 3', ev.scatterCount, 3);
  ok('2 scatter + 1 wild → triggerBonus', ev.triggerBonus === true);
}
{
  // JET WILD SCATTER JET JET → line eval unchanged: the SCATTER at reel 3
  // still breaks the JET chain, so the line pays JET ×2 (reel1 JET + reel2
  // WILD) doubled. But scatterCount now = 2 (the WILD + the SCATTER).
  const ev = E.evaluateGrid(grid(['JET','WILD','SCATTER','JET','JET']), BET, TOTAL);
  const tl = lineEntry(ev, 1);
  eq('JET WILD SCATTER JET JET → line count 2 (scatter breaks chain)', tl && tl.count, 2);
  ok('line still pays JET×2 doubled (line logic unchanged)',
    tl && tl.win === E.PAYTABLE.JET[2] * BET * 2,
    tl ? `win ${tl.win} want ${E.PAYTABLE.JET[2] * BET * 2}` : 'no win');
  eq('wild + scatter both count → scatterCount 2', ev.scatterCount, 2);
  ok('only 2 scatter-equivalents → no bonus', ev.triggerBonus === false);
}
{
  // All-wild lead with no other payable symbol → line still pays as JET ×3
  // doubled; AND the 3 wilds now also trigger the bonus as scatters.
  const ev = E.evaluateGrid(grid(['WILD','WILD','WILD','BLANK','BLANK']), BET, TOTAL);
  const tl = lineEntry(ev, 1);
  eq('WILD WILD WILD (no other symbol) → JET count 3', tl && tl.count, 3);
  ok('all-wild line pays JET ×3 doubled',
    tl && tl.win === E.PAYTABLE.JET[3] * BET * 2,
    tl ? `win ${tl.win}` : 'no win');
  ok('all-wild line also triggers the bonus (3 wilds = 3 scatters)',
    ev.triggerBonus === true);
}

// ── §13.1 Scatter: anywhere, × total bet, 3+ triggers ───────────────────────
{
  // Scatters placed off any single payline shape, in row 2.
  const ev = E.evaluateGrid(
    grid(['BLANK','BLANK','BLANK','BLANK','BLANK'],
         ['BLANK','BLANK','BLANK','BLANK','BLANK'],
         ['SCATTER','BLANK','SCATTER','BLANK','SCATTER']),
    BET, TOTAL
  );
  eq('scatter count anywhere', ev.scatterCount, 3);
  eq('scatter pays × TOTAL bet (not line bet)', ev.scatterWin, 2 * TOTAL);
  ok('scatter win ≠ line-bet scaled', ev.scatterWin !== 2 * BET);
  ok('3 scatters → triggerBonus', ev.triggerBonus === true);
}
{
  const ev = E.evaluateGrid(
    grid(['SCATTER','BLANK','SCATTER','BLANK','BLANK']), BET, TOTAL
  );
  eq('2 scatters → no scatter win', ev.scatterWin, 0);
  ok('2 scatters → triggerBonus false', ev.triggerBonus === false);
}
{
  const ev = E.evaluateGrid(
    grid(['SCATTER','SCATTER','BLANK','BLANK','BLANK'],
         ['BLANK','BLANK','SCATTER','BLANK','BLANK'],
         ['BLANK','BLANK','BLANK','SCATTER','SCATTER']),
    BET, TOTAL
  );
  eq('5 scatters → ×100 total bet', ev.scatterWin, E.PAYTABLE.SCATTER[5] * TOTAL);
  ok('5 scatters → triggerBonus', ev.triggerBonus === true);
}

// ── Selectable line count: only the first N priority-ordered lines pay ──────
{
  // Middle row all JET (PAYLINES[0] = [1,1,1,1,1]) AND top row all JET
  // (PAYLINES[1] = [0,0,0,0,0]). With 1 active line only the middle pays.
  const g1 = grid(['JET','JET','JET','JET','JET'], ['JET','JET','JET','JET','JET']);
  const evAll = E.evaluateGrid(g1, BET, TOTAL);            // default 15
  const ev1 = E.evaluateGrid(g1, BET, TOTAL, 1);           // 1 line
  ok('all lines: both top & middle JET lines win',
    !!evAll.winningLines.find((w) => w.line === 0) &&
    !!evAll.winningLines.find((w) => w.line === 1));
  ok('1 active line: middle JET line (idx 0) still pays',
    !!ev1.winningLines.find((w) => w.line === 0));
  ok('1 active line: top JET line (idx 1) does NOT pay',
    !ev1.winningLines.find((w) => w.line === 1));
  eq('1 active line: exactly one winning line', ev1.winningLines.length, 1);
}
{
  // Scatter is unaffected by line count — pays anywhere even with 1 line.
  const gs = grid(['SCATTER','BLANK','SCATTER','BLANK','SCATTER']);
  const ev = E.evaluateGrid(gs, BET, TOTAL, 1);
  eq('scatter pays regardless of active line count', ev.scatterWin, E.PAYTABLE.SCATTER[3] * TOTAL);
  ok('scatter still triggers bonus with 1 line', ev.triggerBonus === true);
}
{
  const g = grid(['JET','JET','JET','JET','JET'], ['JET','JET','JET','JET','JET'],
                 ['JET','JET','JET','JET','JET']);
  const ev5 = E.evaluateGrid(g, BET, TOTAL, 5);
  ok('5 active lines: no winning line index ≥ 5',
    ev5.winningLines.every((w) => w.line < 5));
}

// ── §13.2 Bonus state-machine invariants (revised spec) ─────────────────────
eq('12 free spins awarded', E.FREE_SPINS_AWARDED, 12);
eq('multiplier starts at 2× (0 diamonds)', E.bonusMultiplierFor(0), 2);
eq('1 diamond → 3×', E.bonusMultiplierFor(1), 3);
eq('10 diamonds → 12×', E.bonusMultiplierFor(10), 12);
eq('27 diamonds → 29× (max)', E.bonusMultiplierFor(27), 29);
eq('28 diamonds → still 29× (capped)', E.bonusMultiplierFor(28), 29);
eq('100 diamonds → still 29× (capped)', E.bonusMultiplierFor(100), 29);
eq('MAX_BONUS_MULTIPLIER', E.MAX_BONUS_MULTIPLIER, 29);

// Each diamond increments the multiplier by exactly 1 until the cap.
let monotone = true;
for (let d = 0; d < 27; d++) {
  if (E.bonusMultiplierFor(d + 1) - E.bonusMultiplierFor(d) !== 1) monotone = false;
}
ok('each diamond = +1 multiplier (until cap)', monotone);

// Free-spin reels (revised §3): NOW carry scatters (retrigger enabled).
// WILD still only on reels 2/3/4.
ok('free-spin reels DO contain scatter (retrigger enabled)',
  E.FREE_SPIN_REELS.every((reel) => reel.includes('SCATTER')));
ok('free reel 1 has no WILD', !E.FREE_SPIN_REELS[0].includes('WILD'));
ok('free reel 5 has no WILD', !E.FREE_SPIN_REELS[4].includes('WILD'));
ok('free reels 2/3/4 carry WILD',
  E.FREE_SPIN_REELS[1].includes('WILD') &&
  E.FREE_SPIN_REELS[2].includes('WILD') &&
  E.FREE_SPIN_REELS[3].includes('WILD'));

// Base reels: WILD only on reels 2/3/4, SCATTER present on all 5.
ok('base reel 1 has no WILD', !E.BASE_REELS[0].includes('WILD'));
ok('base reel 5 has no WILD', !E.BASE_REELS[4].includes('WILD'));
ok('base reels 2/3/4 carry WILD',
  E.BASE_REELS[1].includes('WILD') &&
  E.BASE_REELS[2].includes('WILD') &&
  E.BASE_REELS[3].includes('WILD'));
ok('every base reel carries SCATTER',
  E.BASE_REELS.every((reel) => reel.includes('SCATTER')));

// A driven bonus runs ≥12 spins (retriggers only add), never >27 diamonds.
{
  const rng = new MersenneTwister(12345);
  const { bonusWin, diamonds, spinsRun } = E.runBonus(rng, BET, TOTAL);
  ok('runBonus runs ≥ 12 spins', spinsRun >= 12, `spinsRun ${spinsRun}`);
  ok('runBonus diamonds ≤ 27', diamonds <= 27, `diamonds ${diamonds}`);
  ok('runBonus bonusWin ≥ 0', bonusWin >= 0);
}

// Retrigger: a free grid with 3+ scatters reports triggerBonus (engine adds
// +12 and the multiplier persists — verified live; here the eval gate).
{
  const g = grid(['SCATTER','BLANK','SCATTER','BLANK','SCATTER']);
  const ev = E.evaluateGrid(g, BET, TOTAL);
  ok('3+ scatters in free mode → triggerBonus (retrigger)', ev.triggerBonus === true);
}

// PAYLINES structural sanity (now 20).
eq('20 paylines', E.PAYLINES.length, 20);
ok('each payline is 5 reels of row 0..2',
  E.PAYLINES.every((l) => l.length === 5 && l.every((r) => r >= 0 && r <= 2)));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
