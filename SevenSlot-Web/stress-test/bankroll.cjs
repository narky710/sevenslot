/**
 * Bankroll simulation: 10,000 players bring $500 each, bet $2/spin at max bet.
 * Four session-length policies. Same compiled engine + RNG seeding pattern as
 * the main stress test.
 */

const { TripleSevenEngine, MAX_TOTAL_CREDITS, CREDIT_VALUE_CENTS, distributeBetCents } = require('./build/TripleSevenEngine');
const { MersenneTwister } = require('./build/MersenneTwister');

const BET_CENTS = MAX_TOTAL_CREDITS * CREDIT_VALUE_CENTS; // 200
const START_BANKROLL_CENTS = 50000; // $500
const N_PLAYERS = 10_000;
const PER_LINE = distributeBetCents(BET_CENTS);
// Hard ceiling for "play to bust" to prevent pathological streaks from looping
// forever. Way above the expected ~3.4k spins to bust at 7.4% margin.
const PLAY_TO_BUST_CAP = 200_000;

const SCENARIOS = [
  { name: 'Play to bust',     maxSpins: PLAY_TO_BUST_CAP, label: 'bust' },
  { name: '1-hour (~600)',    maxSpins: 600,              label: '1h' },
  { name: '2-hour (~1200)',   maxSpins: 1200,             label: '2h' },
  { name: '4-hour (~2400)',   maxSpins: 2400,             label: '4h' },
];

function runPlayer(seed, maxSpins) {
  const engine = new TripleSevenEngine(Number.MAX_SAFE_INTEGER);
  engine.rng = new MersenneTwister(seed);
  let balance = START_BANKROLL_CENTS;
  let spins = 0;
  while (spins < maxSpins && balance >= BET_CENTS) {
    balance -= BET_CENTS;
    const positions = [
      engine.pickRandomSymbolIndex(), engine.pickRandomSymbolIndex(), engine.pickRandomSymbolIndex(),
      engine.pickRandomSymbolIndex(), engine.pickRandomSymbolIndex(), engine.pickRandomSymbolIndex(),
      engine.pickRandomSymbolIndex(), engine.pickRandomSymbolIndex(), engine.pickRandomSymbolIndex(),
    ];
    balance += engine.calculateWinAll8Lines(positions, PER_LINE);
    spins++;
  }
  return { finalBalance: balance, spins, busted: balance < BET_CENTS };
}

function pct(p, arr) {
  const i = Math.min(arr.length - 1, Math.floor(p * arr.length));
  return arr[i];
}

const results = [];
const t0 = Date.now();
for (let s = 0; s < SCENARIOS.length; s++) {
  const sc = SCENARIOS[s];
  const seedBase = (s + 1) * 10_000_000;
  const finals = [];
  let bust = 0;
  let walk = 0;
  let totalSpins = 0;
  for (let p = 0; p < N_PLAYERS; p++) {
    const r = runPlayer(seedBase + p, sc.maxSpins);
    finals.push(r.finalBalance);
    totalSpins += r.spins;
    if (r.busted) bust++; else walk++;
  }
  finals.sort((a, b) => a - b);
  const sum = finals.reduce((a, b) => a + b, 0);
  const avgFinal = sum / N_PLAYERS;
  const avgProfit = START_BANKROLL_CENTS - avgFinal;
  results.push({
    name: sc.name,
    bustPct: (bust / N_PLAYERS) * 100,
    walkPct: (walk / N_PLAYERS) * 100,
    avgFinal,
    avgProfit,
    median: pct(0.5, finals),
    worst: finals[0],
    best: finals[finals.length - 1],
    takePctOfStart: (avgProfit / START_BANKROLL_CENTS) * 100,
    avgSpins: totalSpins / N_PLAYERS,
  });
}
console.error(`elapsed ${((Date.now() - t0) / 1000).toFixed(1)}s`);

function $(c) { return `$${(c / 100).toFixed(2)}`; }
function $K(c) {
  const d = c / 100;
  if (Math.abs(d) >= 1000) return `$${(d / 1000).toFixed(2)}K`;
  return `$${d.toFixed(2)}`;
}

console.log('| Scenario | Avg spins | Bust % | Walk-away % | Avg final | Median final | Worst | Best | Avg house profit | House take (% of $500) |');
console.log('|---|---|---|---|---|---|---|---|---|---|');
for (const r of results) {
  console.log(`| ${r.name} | ${r.avgSpins.toFixed(0)} | ${r.bustPct.toFixed(1)}% | ${r.walkPct.toFixed(1)}% | ${$(r.avgFinal)} | ${$(r.median)} | ${$(r.worst)} | ${$K(r.best)} | ${$(r.avgProfit)} | ${r.takePctOfStart.toFixed(1)}% |`);
}
