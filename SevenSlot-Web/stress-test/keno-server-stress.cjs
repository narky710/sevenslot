/**
 * Double-Up Keno — server-faithful stress harness.
 *
 * Mirrors:
 *   public._keno_draw_20    (uniform 20-distinct from 80 via _csprng_uint)
 *   public._keno_pay_mult    (paytable per (spots, hits))
 *   public.play_keno_open + public.play_keno_resolve (open + optional double-up)
 *
 * For RTP measurement we run base play only (no double-up). Double-up is a
 * symmetric coin-flip-ish gamble that doesn't change the underlying paytable
 * RTP — its impact is on session bankroll variance, not house edge.
 *
 * The harness exercises all 9 spot counts (2-10) equally so the reported
 * RTP is the across-all-spot-counts average; per-spot RTPs are also printed.
 *
 * Usage: node stress-test/keno-server-stress.cjs [trials-per-spot]
 */
const crypto = require('crypto')

// Paytable from public._keno_pay_mult (verified 2026-05-25 via
// SELECT pg_get_functiondef). Values are × bet_cents.
const PAYTABLE = {
  // spots: { hits: multiplier }
  2:  {                                                    2: 15 },
  3:  {                                              2: 2, 3: 47 },
  4:  {                                        2: 1, 3: 4, 4: 175 },
  5:  {                                  3: 2, 4: 18, 5: 830 },
  6:  {                            3: 2, 4: 6, 5: 88, 6: 1800 },
  7:  {                      3: 1, 4: 2, 5: 22, 6: 400, 7: 7000 },
  8:  {                            5: 15, 6: 100, 7: 2000, 8: 25000 },
  9:  {                      4: 1, 5: 4, 6: 50, 7: 350, 8: 4500, 9: 50000 },
  10: { 0: 2,                5: 2, 6: 30, 7: 140, 8: 1000, 9: 4500, 10: 100000 },
}

const NUM_BALLS = 80
const NUM_DRAWN = 20

function uint(n) { return crypto.randomInt(n) }

// _keno_draw_20: pick 20 distinct from 80 via rejection sampling
function draw20() {
  const picked = new Set()
  const out = []
  while (out.length < NUM_DRAWN) {
    const v = uint(NUM_BALLS) + 1
    if (!picked.has(v)) { picked.add(v); out.push(v) }
  }
  return out
}

function payMult(spots, hits) {
  const row = PAYTABLE[spots]
  if (!row) return 0
  return row[hits] || 0
}

function autoPick(spots) {
  // Random N distinct from 1..80 — mirrors server's keno_quick_pick.
  const picked = new Set()
  while (picked.size < spots) picked.add(uint(NUM_BALLS) + 1)
  return [...picked]
}

function runSpots(spots, trials, betCents) {
  let wagered = 0
  let returned = 0
  let hits = 0
  let biggest = 0
  for (let i = 0; i < trials; i++) {
    const playerPicks = autoPick(spots)
    const drawn = draw20()
    const drawnSet = new Set(drawn)
    let matchCount = 0
    for (const p of playerPicks) if (drawnSet.has(p)) matchCount++
    const win = payMult(spots, matchCount) * betCents
    wagered += betCents
    returned += win
    if (win > 0) hits++
    if (win > biggest) biggest = win
  }
  return {
    spots, trials, wagered, returned, hits, biggest,
    rtp: returned / wagered,
    hitFreq: hits / trials,
  }
}

function fmtPct(x, d = 3) { return (x * 100).toFixed(d) + '%' }

function main() {
  const arg = parseInt(process.argv[2] || '1000000', 10)
  const trialsPerSpot = Number.isFinite(arg) && arg > 0 ? arg : 1_000_000
  const betCents = 200  // max bet ($2.00)
  console.log(`Double-Up Keno stress (server-faithful, no double-up) — ${trialsPerSpot.toLocaleString()} trials × 9 spot counts (${(trialsPerSpot * 9).toLocaleString()} total) @ $${(betCents / 100).toFixed(2)}/play`)
  const t0 = Date.now()
  let total = { wagered: 0, returned: 0, hits: 0, biggest: 0, trials: 0 }
  const perSpot = []
  for (let s = 2; s <= 10; s++) {
    const r = runSpots(s, trialsPerSpot, betCents)
    perSpot.push(r)
    total.wagered += r.wagered
    total.returned += r.returned
    total.hits += r.hits
    total.trials += r.trials
    if (r.biggest > total.biggest) total.biggest = r.biggest
  }
  const elapsed = (Date.now() - t0) / 1000
  console.log()
  console.log('  Per-spot RTP:')
  for (const r of perSpot) {
    console.log(`    ${r.spots.toString().padStart(2)} spots: RTP ${fmtPct(r.rtp)}  hit ${fmtPct(r.hitFreq, 2)}  biggest $${(r.biggest / 100).toFixed(2)} (${(r.biggest / betCents).toFixed(0)}×)`)
  }
  console.log()
  console.log(`  Across all spot counts:`)
  console.log(`  Wagered:        $${(total.wagered / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`)
  console.log(`  Returned:       $${(total.returned / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`)
  console.log(`  **Actual RTP (avg across spot counts):** **${fmtPct(total.returned / total.wagered)}**`)
  console.log(`  Hit frequency:  ${fmtPct(total.hits / total.trials)}`)
  console.log(`  Biggest win:    $${(total.biggest / 100).toFixed(2)} (${(total.biggest / betCents).toFixed(0)}× bet)`)
  console.log(`  Elapsed: ${elapsed.toFixed(1)}s`)
}

if (require.main === module) main()
module.exports = { runSpots, draw20 }
