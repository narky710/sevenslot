/**
 * Diamond Riches RTP Monte-Carlo (spec §13.3).
 *
 * Drives the build mirror's exact production math: each spin wagers the total
 * bet, spins BASE_REELS, evaluates; 3+ scatters runs the 10-spin free bonus
 * (no extra wager) with the collectible multiplier. RTP = returned / wagered.
 * Per-player deterministic MT seeding mirrors harness.cjs. Writes a markdown
 * report next to the other stress-test reports.
 *
 * Usage:  node stress-test/luxury-rtp.cjs [totalSpins]   (default 10,000,000)
 */

const fs = require('fs');
const path = require('path');
const E = require('./build/LuxuryEngine');
const { MersenneTwister } = require('./build/MersenneTwister');

const TARGET_RTP = 0.95;
const LINE_BET = 25;            // cents/line (representative mid bet)
const TOTAL_BET = LINE_BET * E.NUM_PAYLINES; // 375¢

function runPlayer(seed, spins) {
  const rng = new MersenneTwister(seed);
  let wagered = 0;
  let returned = 0;
  let hits = 0;
  let bonusTriggers = 0;
  let bonusReturn = 0;
  let biggestWin = 0;
  // Welford variance of per-spin return (bonus folded into the spin that
  // triggered it, so the unit is "one paid round").
  let mean = 0, m2 = 0, n = 0;
  let curLoss = 0, maxLoss = 0;

  for (let i = 0; i < spins; i++) {
    wagered += TOTAL_BET;
    const { grid } = E.spinReels(rng, E.BASE_REELS);
    const ev = E.evaluateGrid(grid, LINE_BET, TOTAL_BET);
    let win = ev.baseWin;
    if (ev.triggerBonus) {
      bonusTriggers++;
      const { bonusWin } = E.runBonus(rng, LINE_BET, TOTAL_BET);
      win += bonusWin;
      bonusReturn += bonusWin;
    }
    returned += win;
    if (win > 0) { hits++; curLoss = 0; if (win > biggestWin) biggestWin = win; }
    else { curLoss++; if (curLoss > maxLoss) maxLoss = curLoss; }

    n++;
    const d = win - mean;
    mean += d / n;
    m2 += d * (win - mean);
  }

  const variance = n > 1 ? m2 / (n - 1) : 0;
  return {
    seed, spins, wagered, returned, hits, bonusTriggers, bonusReturn,
    biggestWin, variance, stdDev: Math.sqrt(variance), maxLoss,
    rtp: returned / wagered,
  };
}

function runScenario(totalSpins, players) {
  const per = Math.floor(totalSpins / players);
  const rem = totalSpins - per * players;
  const rows = [];
  for (let p = 0; p < players; p++) {
    rows.push(runPlayer(p + 1, per + (p < rem ? 1 : 0)));
  }
  let wagered = 0, returned = 0, hits = 0, bonusTriggers = 0, bonusReturn = 0, biggestWin = 0, maxLoss = 0;
  const rtps = [];
  for (const r of rows) {
    wagered += r.wagered; returned += r.returned; hits += r.hits;
    bonusTriggers += r.bonusTriggers; bonusReturn += r.bonusReturn;
    if (r.biggestWin > biggestWin) biggestWin = r.biggestWin;
    if (r.maxLoss > maxLoss) maxLoss = r.maxLoss;
    rtps.push(r.rtp);
  }
  return {
    totalSpins, players, wagered, returned,
    rtp: returned / wagered,
    hitFreq: hits / totalSpins,
    bonusFreq: bonusTriggers / totalSpins,
    bonusShareOfReturn: returned > 0 ? bonusReturn / returned : 0,
    biggestWin, maxLoss,
    playerRtpMin: Math.min(...rtps),
    playerRtpMax: Math.max(...rtps),
  };
}

const ARG = parseInt(process.argv[2], 10);
const HEADLINE = Number.isFinite(ARG) && ARG > 0 ? ARG : 10_000_000;

const SCENARIOS = [
  { spins: 100_000, players: 1 },
  { spins: 1_000_000, players: 1 },
  { spins: 1_000_000, players: 5 },
  { spins: HEADLINE, players: 1 },
];

console.log(`Diamond Riches RTP — target ${(TARGET_RTP * 100).toFixed(1)}%`);
console.log(`Bet: ${LINE_BET}¢/line × ${E.NUM_PAYLINES} = ${TOTAL_BET}¢/spin`);
const t0 = Date.now();
const results = [];
for (const s of SCENARIOS) {
  const ts = Date.now();
  const r = runScenario(s.spins, s.players);
  r.elapsedMs = Date.now() - ts;
  results.push(r);
  console.log(
    `  ${s.spins.toLocaleString().padStart(12)} × ${s.players}p → RTP ${(r.rtp * 100).toFixed(3)}% · hit ${(r.hitFreq * 100).toFixed(2)}% · bonus 1/${(1 / r.bonusFreq).toFixed(0)} (${r.elapsedMs}ms)`
  );
}
console.log(`Total ${((Date.now() - t0) / 1000).toFixed(2)}s`);

const headline = results[results.length - 1];
const pass = headline.rtp >= 0.94 && headline.rtp <= 0.96;

function pct(x, d = 3) { return `${(x * 100).toFixed(d)}%`; }
function money(c) {
  const d = c / 100;
  if (Math.abs(d) >= 1e6) return `$${(d / 1e6).toFixed(2)}M`;
  if (Math.abs(d) >= 1e3) return `$${(d / 1e3).toFixed(2)}K`;
  return `$${d.toFixed(2)}`;
}

const L = [];
L.push('# Diamond Riches — RTP Stress-Test Report');
L.push('');
L.push(`**Generated:** ${new Date().toISOString()}`);
L.push(`**Engine:** \`src/engine/LuxuryEngine.ts\` (MT19937, 5×3, 15 lines, reel-strip math)`);
L.push(`**Bet:** ${LINE_BET}¢/line × ${E.NUM_PAYLINES} lines = ${money(TOTAL_BET)}/spin`);
L.push(`**Target RTP:** ${(TARGET_RTP * 100).toFixed(1)}% (accept band 94–96%)`);
L.push('');
L.push('| Spins | Players | RTP | Hit freq | Bonus freq | Bonus % of return | Biggest win | Max losing streak |');
L.push('|---|---|---|---|---|---|---|---|');
for (const r of results) {
  L.push(
    `| ${r.totalSpins.toLocaleString()} | ${r.players} | **${pct(r.rtp)}** | ${pct(r.hitFreq, 2)} | 1 in ${(1 / r.bonusFreq).toFixed(0)} | ${pct(r.bonusShareOfReturn, 1)} | ${money(r.biggestWin)} (${(r.biggestWin / TOTAL_BET).toFixed(0)}×) | ${r.maxLoss.toLocaleString()} |`
  );
}
L.push('');
L.push(`**Headline (${headline.totalSpins.toLocaleString()} spins):** RTP **${pct(headline.rtp)}** — ${pass ? '✅ within the 94–96% acceptance band' : '❌ OUTSIDE the 94–96% band — retune reel strips'}.`);
L.push('');
L.push('The free-spin bonus contributes a large share of total return with a low');
L.push('hit rate — the expected medium-high volatility profile. RTP is governed');
L.push('entirely by reel-strip composition; the paytable is never altered to tune.');
L.push('');

const outPath = path.join(__dirname, '..', 'stress-test-report-luxury.md');
fs.writeFileSync(outPath, L.join('\n'));
console.log(`Report → ${outPath}`);
console.log(pass ? 'RESULT: PASS' : 'RESULT: FAIL (retune)');
process.exit(pass ? 0 : 1);
