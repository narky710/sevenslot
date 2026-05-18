/**
 * Verifies the F1 fix: every fresh TripleSevenEngine must produce a
 * different RNG stream because the seed comes from crypto.getRandomValues,
 * not a static default. Pre-fix, two engines constructed back-to-back
 * produced identical sequences.
 *
 * Run: node stress-test/verify-rng-seed.cjs
 */
'use strict';

const { TripleSevenEngine } = require('./build/TripleSevenEngine');

const SPINS = 10;
const BET_CENTS = 100;

async function collectSpins(engine, n) {
  const outcomes = [];
  for (let i = 0; i < n; i++) {
    await engine.spin(BET_CENTS);
    outcomes.push(engine.getState().reelPositions.join(','));
  }
  return outcomes;
}

(async () => {
  const a = new TripleSevenEngine(Number.MAX_SAFE_INTEGER);
  const b = new TripleSevenEngine(Number.MAX_SAFE_INTEGER);

  const outA = await collectSpins(a, SPINS);
  const outB = await collectSpins(b, SPINS);

  console.log('Engine A first 10 spin positions:');
  outA.forEach((row, i) => console.log(`  ${i + 1}: [${row}]`));
  console.log('Engine B first 10 spin positions:');
  outB.forEach((row, i) => console.log(`  ${i + 1}: [${row}]`));

  const identical = outA.every((row, i) => row === outB[i]);
  if (identical) {
    console.error('\nFAIL: both engines produced the same sequence — seed is still static.');
    process.exit(1);
  }
  console.log('\nPASS: engines diverge — fresh entropy seed confirmed.');

  // Also confirm the opt-in deterministic path still works (stress-harness contract).
  const det1 = new TripleSevenEngine(Number.MAX_SAFE_INTEGER, 12345);
  const det2 = new TripleSevenEngine(Number.MAX_SAFE_INTEGER, 12345);
  const detA = await collectSpins(det1, SPINS);
  const detB = await collectSpins(det2, SPINS);
  const reproducible = detA.every((row, i) => row === detB[i]);
  if (!reproducible) {
    console.error('FAIL: explicit-seed path is not reproducible.');
    process.exit(1);
  }
  console.log('PASS: explicit-seed path remains reproducible (seed=12345 matches across two engines).');
})();
