/**
 * Triple Sevens — server-faithful stress harness.
 *
 * Direct Node port of:
 *   public._t7_pick_symbol   (14-symbol weighted strip, _csprng_uint(73))
 *   public._t7_line_win      (line eval — sevens / bells / bars / cherry / fruit)
 *   public._t7_distribute_credits (credit-per-line spread; matches client distributeBetCents)
 *   public.play_triple7       (orchestration: split bet, eval 8 lines, sum)
 *
 * Symbol map (matches src/engine/TripleSevenEngine.ts):
 *   0 Red 7 · 1 White 7 · 2 Blue 7 · 3 Rainbow 7
 *   4 Triple BAR · 5 Double BAR · 6 Single BAR
 *   7 Bell · 8 Cherry
 *   9 Apple · 10 Watermelon · 11 Orange · 12 Plum · 13 Lemon
 *
 * Usage: node stress-test/triple7-server-stress.cjs [spins]
 */
const crypto = require('crypto')

// Weights from public._t7_pick_symbol (sum = 73)
const REEL_WEIGHTS = [2, 2, 2, 1, 3, 4, 5, 3, 8, 7, 8, 9, 9, 10]
const TOTAL_WEIGHT = 73

// Paylines (0-indexed): server uses 1-indexed [4,5,6]..., these are 0-indexed.
// Order matches server: middle row, top, bottom, diag TL→BR, diag BL→TR,
// vertical L, vertical M, vertical R.
const PAYLINES = [
  [3, 4, 5], [0, 1, 2], [6, 7, 8],
  [0, 4, 8], [6, 4, 2],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
]

// Max bet from public.games.max_bet_cents for triple7 = 200¢ ($2.00)
const MAX_BET_CENTS = 200
const CREDIT_VALUE_CENTS = 5
const MAX_CREDITS = MAX_BET_CENTS / CREDIT_VALUE_CENTS  // 40 credits at max bet

function uint(n) { return crypto.randomInt(n) }

// _t7_pick_symbol equivalent
function pickSymbol() {
  const r = uint(TOTAL_WEIGHT)
  let cum = 0
  for (let i = 0; i < REEL_WEIGHTS.length; i++) {
    cum += REEL_WEIGHTS[i]
    if (r < cum) return i
  }
  return REEL_WEIGHTS.length - 1
}

// _t7_distribute_credits: spread N credits across 8 lines round-robin
// (matches client `distributeCredits` / `distributeBetCents`).
function distributeCredits(credits) {
  // 5 credits per line max × 8 lines = 40 credits cap
  const perLine = new Array(8).fill(0)
  let remaining = Math.min(credits, 40)
  let i = 0
  while (remaining > 0) {
    perLine[i % 8]++
    remaining--
    i++
  }
  // Return per-line bets in cents
  return perLine.map((c) => c * CREDIT_VALUE_CENTS)
}

// _t7_line_win: matches server SQL exactly
function lineWin(s1, s2, s3, bet) {
  if (bet <= 0) return 0
  // SEVENS (0..3)
  if (s1 >= 0 && s1 <= 3 && s2 >= 0 && s2 <= 3 && s3 >= 0 && s3 <= 3) {
    if (s1 === 3 && s2 === 3 && s3 === 3) return bet * 10000
    if (s1 === s2 && s2 === s3) return bet * 1000
    return bet * 500
  }
  // BELL (7)
  if (s1 === 7 && s2 === 7 && s3 === 7) return bet * 100
  // BARS (4..6)
  if (s1 >= 4 && s1 <= 6 && s2 >= 4 && s2 <= 6 && s3 >= 4 && s3 <= 6) {
    if (s1 === s2 && s2 === s3) {
      if (s1 === 4) return bet * 50
      if (s1 === 5) return bet * 40
      if (s1 === 6) return bet * 30
    }
    return bet * 10
  }
  // CHERRY (8) at position 0
  if (s1 === 8) {
    if (s2 === 8 && s3 === 8) return bet * 8
    if (s2 === 8) return bet * 5
    return bet * 2
  }
  // FRUITS — three of a kind
  if (s1 === s2 && s2 === s3) {
    if (s1 === 9) return bet * 25
    if (s1 === 10) return bet * 15
    if (s1 === 11 || s1 === 12 || s1 === 13) return bet * 10
  }
  return 0
}

function tierFor(winCents, betCents) {
  if (winCents === 0) return 'none'
  const m = winCents / betCents
  if (m < 1) return 'small'
  if (m < 5) return 'medium'
  if (m < 25) return 'big'
  if (m < 100) return 'mega'
  return 'super_mega'
}

function simulate(totalSpins, betCents) {
  const perLine = distributeCredits(betCents / CREDIT_VALUE_CENTS)
  let wagered = 0
  let returned = 0
  let hits = 0
  let biggest = 0
  let curLoss = 0
  let longestLoss = 0
  const tiers = { none: 0, small: 0, medium: 0, big: 0, mega: 0, super_mega: 0 }
  const perSpinReturns = []
  const sampleEvery = Math.max(1, Math.floor(totalSpins / 50000))

  for (let i = 0; i < totalSpins; i++) {
    wagered += betCents
    const grid = [
      pickSymbol(), pickSymbol(), pickSymbol(),
      pickSymbol(), pickSymbol(), pickSymbol(),
      pickSymbol(), pickSymbol(), pickSymbol(),
    ]
    let win = 0
    for (let li = 0; li < 8; li++) {
      const [a, b, c] = PAYLINES[li]
      win += lineWin(grid[a], grid[b], grid[c], perLine[li])
    }
    returned += win
    if (win > 0) { hits++; curLoss = 0 }
    else { curLoss++; if (curLoss > longestLoss) longestLoss = curLoss }
    if (win > biggest) biggest = win
    tiers[tierFor(win, betCents)]++
    if (i % sampleEvery === 0) perSpinReturns.push(win / betCents)
  }
  const xs = perSpinReturns
  const n = xs.length || 1
  const mean = xs.reduce((s, x) => s + x, 0) / n
  const variance = xs.reduce((s, x) => s + (x - mean) * (x - mean), 0) / n
  return {
    spins: totalSpins,
    bet: betCents,
    wagered, returned, hits,
    rtp: returned / wagered,
    hitFreq: hits / totalSpins,
    biggest, longestLoss,
    variance, stddev: Math.sqrt(variance),
    tiers,
  }
}

function fmtPct(x, d = 3) { return (x * 100).toFixed(d) + '%' }

function main() {
  const arg = parseInt(process.argv[2] || '1000000', 10)
  const spins = Number.isFinite(arg) && arg > 0 ? arg : 1_000_000
  const bet = MAX_BET_CENTS
  console.log(`Triple Sevens stress (server-faithful) — ${spins.toLocaleString()} spins @ $${(bet / 100).toFixed(2)}/spin`)
  const t0 = Date.now()
  const s = simulate(spins, bet)
  const elapsed = (Date.now() - t0) / 1000
  console.log(`  Wagered:           $${(s.wagered / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`)
  console.log(`  Returned:          $${(s.returned / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`)
  console.log(`  **Actual RTP:**    **${fmtPct(s.rtp)}**`)
  console.log(`  Hit frequency:     ${fmtPct(s.hitFreq)}`)
  console.log(`  Biggest win:       $${(s.biggest / 100).toFixed(2)} (${(s.biggest / bet).toFixed(1)}× bet)`)
  console.log(`  Longest loss streak: ${s.longestLoss}`)
  console.log(`  σ² (per-spin return / bet, sampled): ${s.variance.toFixed(3)}   σ=${s.stddev.toFixed(3)}`)
  console.log(`  Win tiers: none=${fmtPct(s.tiers.none / spins, 2)}, small=${fmtPct(s.tiers.small / spins, 2)}, medium=${fmtPct(s.tiers.medium / spins, 2)}, big=${fmtPct(s.tiers.big / spins, 2)}, mega=${fmtPct(s.tiers.mega / spins, 2)}, super=${fmtPct(s.tiers.super_mega / spins, 2)}`)
  console.log(`  Elapsed: ${elapsed.toFixed(1)}s`)
}

if (require.main === module) main()
module.exports = { simulate }
