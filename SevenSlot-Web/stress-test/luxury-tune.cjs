/**
 * Diamond Riches reel-strip tuner (dev tool — not shipped in the bundle).
 *
 * The spec's starter strips run ~1900% RTP (bonus-dominated). This searches a
 * parameterized strip generator for a composition that lands total RTP in the
 * 94–96% band, then prints the concrete BASE_REELS / FREE_SPIN_REELS arrays to
 * paste into both src/engine/LuxuryEngine.ts and build/LuxuryEngine.js.
 *
 * Reuses the build mirror's evaluateGrid/spinReels/runBonus so the tuned math
 * is exactly the production math.
 */
const E = require('./build/LuxuryEngine');
const { MersenneTwister } = require('./build/MersenneTwister');

const LEN = 34;
const LINE_BET = 25;
const TOTAL = LINE_BET * E.NUM_PAYLINES; // 20 lines now

// Per-reel non-blank composition. `hi` scales the high-pay symbols (rarer when
// small). `sc` = scatters per base reel. `wf` = wilds per FREE reel 2/3/4.
// `wb` = wilds per BASE reel 2/3/4. Blanks fill the remainder up to LEN.
function comp(hi) {
  return {
    JET: Math.max(1, Math.round(1 * hi)),
    YACHT: Math.max(1, Math.round(2 * hi)),
    CAR: Math.max(1, Math.round(3 * hi)),
    MONEY: Math.max(1, Math.round(4 * hi)),
    RING: Math.max(1, Math.round(4 * hi)),
    WATCH: Math.max(1, Math.round(5 * hi)),
    GOLD_BARS: Math.max(2, Math.round(6 * hi)),
    SILVER_BARS: Math.max(2, Math.round(6 * hi)),
    GOLD_BAR: Math.max(2, Math.round(7 * hi)),
  };
}

function fillReel(counts) {
  const a = [];
  for (const [sym, n] of Object.entries(counts)) for (let i = 0; i < n; i++) a.push(sym);
  while (a.length < LEN) a.push('BLANK');
  // Deterministic spread so identical symbols aren't all adjacent (matters for
  // 3-window reads): interleave by index hashing.
  a.sort((x, y) => (hash(x) % 7) - (hash(y) % 7) || x.localeCompare(y));
  // Rotate-interleave to avoid long same-symbol runs.
  const out = [];
  const buckets = {};
  for (const s of a) (buckets[s] = buckets[s] || []).push(s);
  const keys = Object.keys(buckets);
  let left = a.length;
  let k = 0;
  while (left > 0) {
    const key = keys[k % keys.length];
    if (buckets[key].length) { out.push(buckets[key].pop()); left--; }
    k++;
  }
  return out;
}
function hash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }

function build(params) {
  const { hiBase, hiFree, sc, scFree, wb, wf } = params;
  const base = [];
  for (let r = 0; r < 5; r++) {
    const c = { ...comp(hiBase), SCATTER: sc };
    if (r === 1 || r === 2 || r === 3) c.WILD = wb;
    base.push(fillReel(c));
  }
  const free = [];
  for (let r = 0; r < 5; r++) {
    // Free reels NOW carry scatters (retrigger-enabled, revised spec §3).
    const c = { ...comp(hiFree), SCATTER: scFree };
    if (r === 1 || r === 2 || r === 3) c.WILD = wf;
    free.push(fillReel(c));
  }
  return { base, free };
}

function measure(reels, spins, seed) {
  const rng = new MersenneTwister(seed || 99);
  let wag = 0, ret = 0, baseRet = 0, bonusRet = 0, triggers = 0, hits = 0;
  for (let i = 0; i < spins; i++) {
    wag += TOTAL;
    const { grid } = E.spinReels(rng, reels.base);
    const ev = E.evaluateGrid(grid, LINE_BET, TOTAL);
    baseRet += ev.baseWin;
    let win = ev.baseWin;
    if (ev.triggerBonus) {
      triggers++;
      const { bonusWin } = runBonusOn(rng, reels.free);
      bonusRet += bonusWin;
      win += bonusWin;
    }
    ret += win;
    if (win > 0) hits++;
  }
  return {
    rtp: ret / wag,
    baseRtp: baseRet / wag,
    bonusRtp: bonusRet / wag,
    bonusFreq: triggers / spins,
    hitFreq: hits / spins,
  };
}

// runBonus against arbitrary free reels (mirror's runBonus is hard-wired to
// E.FREE_SPIN_REELS, so replicate its loop here against the candidate strips).
function runBonusOn(rng, freeReels) {
  // Cap MUST match the engine/mirror (100000) — a smaller cap truncates the
  // retrigger fat tail and makes the tuner under-estimate RTP (it probed 94%
  // while the real engine ran 99.7%). scFree=1 keeps retriggers rare so the
  // cap effectively never binds and the search stays fast.
  let spins = E.FREE_SPINS_AWARDED, diamonds = 0, bonusWin = 0, run = 0;
  while (spins > 0 && run < 100000) {
    const mult = E.bonusMultiplierFor(diamonds);
    const { grid } = E.spinReels(rng, freeReels);
    const ev = E.evaluateGrid(grid, LINE_BET, TOTAL);
    bonusWin += ev.baseWin * mult;
    for (const reel of E.WILD_COLLECT_REELS) {
      for (let row = 0; row < 3; row++) {
        if (grid[reel][row] === 'WILD' && diamonds < E.MAX_DIAMONDS) diamonds++;
      }
    }
    if (ev.triggerBonus) spins += E.FREE_SPINS_AWARDED; // retrigger, mult persists
    spins--; run++;
  }
  return { bonusWin };
}

// ── Search ──────────────────────────────────────────────────────────────────
// The bonus is high-variance, so average two seeds at a large sample. For a
// few discrete (sc, wf) structures, bisect the continuous hiFree knob to hit
// 95% RTP, then prefer the combo with a sensible bonus rate (~1/80–1/200).
// The retrigger bonus is fat-tailed, so a single small sample badly mis-
// estimates RTP (a v5 pick that probed 94% truly ran 99.7% at 10M). Average
// several large seeded samples so the bisection lands on the real RTP.
const SAMPLE = 1_200_000;
const SEEDS = [11, 5077, 90909];
function evalParams(params) {
  const reels = build(params);
  let rtp = 0, baseRtp = 0, bonusRtp = 0, bonusFreq = 0, hitFreq = 0;
  for (const s of SEEDS) {
    const m = measure(reels, SAMPLE, s);
    rtp += m.rtp; baseRtp += m.baseRtp; bonusRtp += m.bonusRtp;
    bonusFreq += m.bonusFreq; hitFreq += m.hitFreq;
  }
  const n = SEEDS.length;
  return { reels, rtp: rtp / n, baseRtp: baseRtp / n, bonusRtp: bonusRtp / n, bonusFreq: bonusFreq / n, hitFreq: hitFreq / n };
}

// 20 lines + 12-spin retrigger bonus is far hotter than the old build, so base
// scatter (sc=1) and free scatter (scFree=1) stay low — scFree>1 risks a
// divergent retrigger EV — and hiFree (free-reel high-pay scaling) is the
// bisection knob.
// Two-stage solve per structure: (A) bisect hiBase so base-only RTP ≈ 0.55
// (base RTP is independent of the bonus), then (B) bisect hiFree so TOTAL
// RTP ≈ 0.95 (the bonus supplies the remaining ~0.40).
const TARGET_BASE = 0.50;
const TARGET_TOTAL = 0.95;
const structures = [
  { sc: 2, scFree: 1, wb: 3, wf: 1 },
];

function bisect(lo, hi, f, target, iters) {
  let m = null;
  for (let i = 0; i < iters; i++) {
    const mid = (lo + hi) / 2;
    m = f(mid);
    if (m.val < target) lo = mid;
    else hi = mid;
  }
  return { x: (lo + hi) / 2, m };
}

const solved = [];
for (const s of structures) {
  process.stderr.write(`probing wf${s.wf}…\n`);
  // (A) hiBase → base RTP ≈ TARGET_BASE
  const aRes = bisect(0.15, 1.1, (hiBase) => {
    const m = evalParams({ ...s, hiBase, hiFree: 0.5 });
    return { ...m, val: m.baseRtp };
  }, TARGET_BASE, 7);
  const hiBase = aRes.x;
  // (B) hiFree → total RTP ≈ TARGET_TOTAL
  const bRes = bisect(0.2, 1.6, (hiFree) => {
    const m = evalParams({ ...s, hiBase, hiFree });
    return { ...m, val: m.rtp };
  }, TARGET_TOTAL, 8);
  const params = { ...s, hiBase, hiFree: bRes.x };
  const m = bRes.m;
  console.log(
    `wf${s.wf} → hiBase≈${hiBase.toFixed(3)} hiFree≈${bRes.x.toFixed(3)}  rtp ${(m.rtp * 100).toFixed(2)}%  base ${(m.baseRtp * 100).toFixed(1)}  bonus ${(m.bonusRtp * 100).toFixed(1)}  bonusFreq 1/${(1 / m.bonusFreq).toFixed(0)}  hit ${(m.hitFreq * 100).toFixed(1)}%`
  );
  solved.push({ params, m });
}

solved.sort((a, b) => Math.abs(a.m.rtp - 0.95) - Math.abs(b.m.rtp - 0.95));
const pick = { ...solved[0], reels: build(solved[0].params) };
console.log(`\nPICK ${JSON.stringify(pick.params)} → RTP ${(pick.m.rtp * 100).toFixed(2)}%`);

const conf = measure(pick.reels, 3_000_000, 909090);
console.log(`Confirm @3M (seed 909090): RTP ${(conf.rtp * 100).toFixed(3)}%  base ${(conf.baseRtp * 100).toFixed(1)}  bonus ${(conf.bonusRtp * 100).toFixed(1)}  hit ${(conf.hitFreq * 100).toFixed(2)}%  bonus 1/${(1 / conf.bonusFreq).toFixed(0)}`);

function fmtReels(name, reels) {
  const lines = [`const ${name} = [`];
  reels.forEach((reel) => {
    const chunks = [];
    for (let i = 0; i < reel.length; i += 9) chunks.push(reel.slice(i, i + 9).map((s) => `'${s}'`).join(','));
    lines.push('  [' + chunks.join(',\n   ') + '],');
  });
  lines.push('];');
  return lines.join('\n');
}
console.log('\n// ===== PASTE INTO LuxuryEngine.ts (typed) AND build/LuxuryEngine.js =====');
console.log(fmtReels('BASE_REELS', pick.reels.base));
console.log(fmtReels('FREE_SPIN_REELS', pick.reels.free));
