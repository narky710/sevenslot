/**
 * Diamond Riches RTP Monte-Carlo (spec §13.3).
 *
 * Drives the build mirror's exact production math: each spin wagers the total
 * bet, spins BASE_REELS, evaluates; 3+ scatters runs the free-spin bonus
 * (no extra wager) with the collectible multiplier. RTP = returned / wagered.
 * Per-player deterministic MT seeding mirrors harness.cjs. Writes a markdown
 * report next to the other stress-test reports.
 *
 * Usage:  node stress-test/luxury-rtp.cjs [totalSpins]   (default 10,000,000)
 */

const fs = require('fs');
const path = require('path');
const { LuxuryEngine } = require('./build/LuxuryEngine');
const { MersenneTwister } = require('./build/MersenneTwister');

const TARGET_RTP = 0.95;
const LINE_BET = 25;            // cents/line (representative mid bet)

function runPlayer(seed, spins) {
  const engine = new LuxuryEngine(999999, seed); // abundant credits, deterministic seed

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

  // Set up betting: LINE_BET cents per line, all 20 lines
  engine.setLineBet(LINE_BET);
  engine.setLineCount(20);
  const TOTAL_BET = LINE_BET * 20;

  for (let i = 0; i < spins; i++) {
    wagered += TOTAL_BET; // Only base game spins are wagered

    // Main spin (costs TOTAL_BET)
    const spinResult = engine.spin();
    if (!spinResult) continue;
    let baseWin = spinResult.totalWin;
    returned += baseWin;

    if (spinResult.triggerBonus) {
      bonusTriggers++;
      let bonusWinTotal = 0;

      // Run all bonus spins until completion (no wager on these)
      engine.beginBonusSpins();
      while (engine.state.freeSpinsRemaining > 0) {
        const bonusResult = engine.bonusSpin();
        if (!bonusResult) break;
        bonusWinTotal += bonusResult.totalWin;
      }
      engine.endBonus();
      returned += bonusWinTotal;
      bonusReturn += bonusWinTotal;

      if (bonusWinTotal > 0 && bonusWinTotal > (biggestWin - baseWin)) biggestWin = baseWin + bonusWinTotal;
    } else {
      if (baseWin > 0 && baseWin > biggestWin) biggestWin = baseWin;
    }

    // Track losing spins (before bonus wins)
    if (baseWin > 0) { hits++; curLoss = 0; }
    else { curLoss++; if (curLoss > maxLoss) maxLoss = curLoss; }
  }

  return {
    seed, spins, wagered, returned, hits, bonusTriggers, bonusReturn,
    biggestWin, maxLoss,
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
  { spins: 1_000_000, players: 10 },
  { spins: HEADLINE, players: 1 },
  { spins: HEADLINE, players: 5 },
  { spins: HEADLINE, players: 10 },
];

const NUM_PAYLINES = 20;
const TOTAL_BET = LINE_BET * NUM_PAYLINES;

console.log(`Diamond Riches RTP — target ${(TARGET_RTP * 100).toFixed(1)}%`);
console.log(`Bet: ${LINE_BET}¢/line × ${NUM_PAYLINES} = ${TOTAL_BET}¢/spin`);
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
L.push(`**Bet:** ${LINE_BET}¢/line × ${NUM_PAYLINES} lines = ${money(TOTAL_BET)}/spin`);
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
