/**
 * Diamond Riches — server-faithful stress harness.
 *
 * Direct Node port of the production server logic:
 *   public._luxury_spin_reels  (uses base_outer/base_inner/free_outer/free_inner)
 *   public._luxury_evaluate    (line eval + scatter count)
 *   public._roll_jackpot_trigger (per-tier scaled odds against bet/max_bet)
 *   public.play_diamond          (base + bonus + jackpot orchestration)
 *
 * Config baked from public.luxury_config + public.jackpot_config + public.games
 * (rows captured 2026-05-23). RNG: Node's crypto.randomInt — same uniform[0,n)
 * shape as the server's _csprng_uint.
 *
 * Usage:
 *   node stress-test/diamond-server-stress.cjs <spins>
 * Spins default to 50,000.
 */
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

// ─── Server config snapshot (luxury_config) ────────────────────────────────
// Source-faithful rebuild (migration diamond_riches_source_faithful_rebuild)
// Symbol map: 0=BLANK, 1=YACHT, 2=MOTORBOAT, 3=SPORTS_CAR, 4=RING, 5=CASH,
//             6=WHEEL, 7=GOLD_BARS, 8=WHITE_CARD, 9=GOLD_SMALL,
//             13=WILD (inner reels only), 14=SCATTER (Coin)
// Iter 6: inner dead-anchor density 50% → 59% (20/34 cells).
// Option A tune (post-WILD-counts-as-scatter): trim trigger-counting density
// on base strips. 1 SCATTER each on outer/inner + 1 WILD on inner.
const BASE_OUTER = [4, 5, 6, 7, 8, 9, 4, 5, 6, 7, 8, 9, 14, 4, 5, 6, 7, 8, 9, 4, 5, 6, 7, 8, 9, 9, 9, 9, 9, 9, 9, 9, 9, 14]
const BASE_INNER = [1, 6, 2, 7, 3, 8, 1, 9, 2, 4, 3, 9, 1, 14, 2, 5, 3, 1, 6, 2, 7, 3, 8, 1, 9, 2, 9, 3, 13, 1, 1, 2, 3, 3]
// Coin (SCATTER) added to free strips as dead fillers during bonus.
const FREE_OUTER = [4, 5, 6, 7, 8, 9, 4, 5, 6, 7, 8, 9, 9, 4, 5, 6, 7, 8, 9, 4, 5, 6, 7, 8, 9, 9, 9, 9, 9, 9, 9, 9, 14, 9]
const FREE_INNER = [1, 6, 2, 7, 3, 8, 1, 9, 2, 4, 3, 9, 1, 9, 2, 5, 3, 1, 6, 2, 7, 3, 8, 1, 9, 2, 9, 3, 13, 1, 1, 2, 9, 3]
const STRIP_LEN = 34

const PAYLINES = [
  [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0], [2, 1, 0, 1, 2],
  [1, 0, 0, 0, 1], [1, 2, 2, 2, 1],
  [0, 0, 1, 2, 2], [2, 2, 1, 0, 0],
  [1, 0, 1, 0, 1], [1, 2, 1, 2, 1],
  [0, 1, 1, 1, 0], [2, 1, 1, 1, 2],
  [0, 1, 0, 1, 0], [2, 1, 2, 1, 2],
  [0, 0, 2, 0, 0], [2, 2, 0, 2, 2],
  [1, 0, 2, 0, 1], [1, 2, 0, 2, 1],
  [0, 2, 0, 2, 0],
]

// Source-faithful paytable (× line_bet). 2-of-a-kind pays only for YACHT (1)
// and MOTORBOAT (2) per source.
const LINE_PAY = {
  1: { 2: 10, 3: 50, 4: 500, 5: 5000 },  // YACHT
  2: { 2:  5, 3: 30, 4: 200, 5: 1000 },  // MOTORBOAT
  3: {        3: 20, 4: 100, 5:  500 },  // SPORTS CAR
  4: {        3: 15, 4:  75, 5:  200 },  // RING
  5: {        3: 10, 4:  50, 5:  200 },  // CASH WADS
  6: {        3: 10, 4:  30, 5:  150 },  // WHEEL
  7: {        3:  5, 4:  30, 5:  150 },  // GOLD BARS
  8: {        3:  5, 4:  25, 5:  120 },  // WHITE CARD
  9: {        3:  5, 4:  20, 5:  100 },  // GOLD SMALL
}

// Tiered scatter pay (Coin = SCATTER 14), × total_bet.
// 3-coin pay raised 2× → 3× in migration diamond_riches_rtp_94_96_iter1
// (2026-05-25) to land RTP in 94-96% band.
const SCATTER_PAY = { 3: 3, 4: 15, 5: 100 }

// Reserved symbol indices used by server code (post-rebuild).
const SYM = { BLANK: 0, WILD: 13, SCATTER: 14 }

// FEVER jackpots removed in source-faithful rebuild — play_diamond no longer
// rolls them, so harness drops them too.
const MAX_BET_CENTS = 150  // public.games.max_bet_cents — capped 2026-05-23

// ─── Bet config (player) ───────────────────────────────────────────────────
// Post-cap (migration diamond_riches_cap_bet_at_150): line_count 1..15,
// line_bet ∈ {1,2,3,5,10}, total ≤ 150. Stress runs at the new max.
const LINE_BET = 10
const LINE_COUNT = 15
const TOTAL_BET = LINE_BET * LINE_COUNT   // 150 cents = $1.50 (new server max bet)
const BONUS_BASE_MULT = 2
const MAX_DIAMONDS = 27  // source-faithful: 27 diamonds → 29× multiplier cap
const FREE_SPINS_AWARDED = 11  // tuned: raised from 10 to compensate for trimmed strips

// ─── RNG (matches server's _csprng_uint uniform[0,n)) ─────────────────────
function uint(n) { return crypto.randomInt(n) }

// ─── _luxury_spin_reels ───────────────────────────────────────────────────
function spinReels(isBonus) {
  const outer = isBonus ? FREE_OUTER : BASE_OUTER
  const inner = isBonus ? FREE_INNER : BASE_INNER
  const grid = new Array(15)
  const stops = new Array(5)
  for (let r = 0; r < 5; r++) {
    const strip = r === 0 || r === 4 ? outer : inner
    const stop = uint(STRIP_LEN)
    stops[r] = stop
    grid[r * 3 + 0] = strip[stop % STRIP_LEN]
    grid[r * 3 + 1] = strip[(stop + 1) % STRIP_LEN]
    grid[r * 3 + 2] = strip[(stop + 2) % STRIP_LEN]
  }
  return { grid, stops }
}

// ─── line_mult (server's _luxury_line_mult) ───────────────────────────────
function lineMult(symbol, count) {
  const row = LINE_PAY[symbol]
  if (!row) return 0
  return row[count] || 0
}

function scatterPay(count, totalBet) {
  if (count >= 5) return totalBet * SCATTER_PAY[5]
  if (count === 4) return totalBet * SCATTER_PAY[4]
  if (count === 3) return totalBet * SCATTER_PAY[3]
  return 0
}

// ─── _luxury_evaluate ──────────────────────────────────────────────────────
function evaluate(grid, lineBet, totalBet, activeLines, isBonus = false) {
  const lines = Math.min(activeLines, 15)  // source: max 15 paylines
  let lineWin = 0
  const winning = []
  for (let i = 0; i < lines; i++) {
    const p = PAYLINES[i]
    const symbols = [
      grid[0 * 3 + p[0]],
      grid[1 * 3 + p[1]],
      grid[2 * 3 + p[2]],
      grid[3 * 3 + p[3]],
      grid[4 * 3 + p[4]],
    ]
    let lead = null
    for (const s of symbols) {
      if (s !== SYM.BLANK && s !== SYM.WILD && s !== SYM.SCATTER) { lead = s; break }
    }
    if (lead === null && symbols[0] === SYM.WILD) lead = 1  // fallback → YACHT
    if (lead === null) continue

    let match = 0
    let wildUsed = false
    for (let r = 0; r < 5; r++) {
      const s = symbols[r]
      if (s === lead) match++
      else if (s === SYM.WILD) { match++; wildUsed = true }
      else break
    }
    const m = lineMult(lead, match)
    if (m > 0) {
      let win = m * lineBet
      if (wildUsed) win *= 2
      lineWin += win
      winning.push({ line: i, symbol: lead, count: match, wildUsed, win })
    }
  }

  // During bonus, COINs are dead fillers: skip scatter pay + trigger entirely.
  // Rule change (diamond_riches_wild_counts_scatter_for_trigger): WILDs count
  // toward the bonus trigger total along with COINs, but scatter PAYs still
  // fire only on coin-only count (WILDs never pay as scatters).
  let coinCount = 0
  let wildCount = 0
  let triggerCount = 0
  let scatterWin = 0
  if (!isBonus) {
    for (let c = 0; c < 15; c++) {
      if (grid[c] === SYM.SCATTER) coinCount++
      else if (grid[c] === SYM.WILD) wildCount++
    }
    triggerCount = coinCount + wildCount
    scatterWin = scatterPay(coinCount, totalBet)
  }
  const baseWin = lineWin + scatterWin
  return {
    lineWin,
    scatterCount: triggerCount,  // player-facing count: round things on screen
    scatterWin,
    baseWin,
    triggerBonus: !isBonus && triggerCount >= 3,
    winning,
  }
}

// (jackpot trigger removed — source-faithful Diamond Riches has no FEVER)

// ─── Win-tier classifier (relative to total bet) ───────────────────────────
function classifyTier(winCents, betCents) {
  if (winCents <= 0) return 'none'
  const x = winCents / betCents
  if (x < 1) return 'small'
  if (x < 5) return 'medium'
  if (x < 25) return 'big'
  if (x < 100) return 'mega'
  return 'super_mega'
}

// ─── Bonus session ─────────────────────────────────────────────────────────
// Safety cap to prevent harness runaway when retrigger rate ≥ 10%. The
// actual game has no server-side cap (audit flagged this); we cap here only
// to make stress runs terminate. Anything over BONUS_MAX_SPINS is silently
// truncated and counted in stats.bonusSessionsCapped.
const BONUS_MAX_SPINS = 5000
const BONUS_CHAIN_CAP = 50  // matches server play_diamond cap
function runBonusSession(triggerBet, triggerLineBet, triggerLineCount, stats) {
  let diamonds = 0
  let free = FREE_SPINS_AWARDED
  let totalAward = FREE_SPINS_AWARDED  // cumulative awards (initial 10)
  let bonusReturn = 0
  let retriggers = 0
  let bonusSpins = 0
  while (free > 0 && bonusSpins < BONUS_MAX_SPINS) {
    bonusSpins++
    const { grid } = spinReels(true)
    // Diamond (WILD on inner reels 2..4 = grid columns r=1,2,3) collection
    for (let r = 1; r <= 3; r++) {
      for (let row = 0; row < 3; row++) {
        if (grid[r * 3 + row] === SYM.WILD && diamonds < MAX_DIAMONDS) diamonds++
      }
    }
    const mult = BONUS_BASE_MULT + Math.min(diamonds, MAX_DIAMONDS)
    const ev = evaluate(grid, triggerLineBet, triggerBet, triggerLineCount, true)
    const spinWin = ev.baseWin * mult
    bonusReturn += spinWin
    // No retriggers in source-faithful build (free reels carry zero SCATTER).
    free--
  }
  stats.bonusRetriggers += retriggers
  stats.bonusSpinsRun += bonusSpins
  stats.maxDiamondsThisSession = Math.max(stats.maxDiamondsThisSession, diamonds)
  if (bonusSpins >= BONUS_MAX_SPINS) stats.bonusSessionsCapped++
  return bonusReturn
}

// ─── Simulation ────────────────────────────────────────────────────────────
function simulate(totalSpins) {
  const stats = {
    spins: 0,
    wagered: 0,
    returned: 0,
    hits: 0,
    losingStreak: 0,
    longestLosingStreak: 0,
    biggestBaseSpin: 0,
    biggestSequence: 0,    // base + bonus chain
    bonusTriggers: 0,
    bonusReturnTotal: 0,
    bonusSpinsRun: 0,
    bonusRetriggers: 0,
    bonusSessionsCapped: 0,
    maxDiamondsThisSession: 0,
    tiers: { none: 0, small: 0, medium: 0, big: 0, mega: 0, super_mega: 0 },
    perSpinReturns: [],     // for variance — sampled cap to keep memory bounded
    sampleEvery: Math.max(1, Math.floor(totalSpins / 50_000)),
  }
  for (let i = 0; i < totalSpins; i++) {
    stats.spins++
    stats.wagered += TOTAL_BET
    const { grid } = spinReels(false)
    const ev = evaluate(grid, LINE_BET, TOTAL_BET, LINE_COUNT)
    let totalWinThisSpin = ev.baseWin

    // No base-game jackpot roll (FEVER removed in source-faithful rebuild).

    let sequenceWin = totalWinThisSpin
    if (ev.triggerBonus) {
      stats.bonusTriggers++
      const bonusWin = runBonusSession(TOTAL_BET, LINE_BET, LINE_COUNT, stats)
      stats.bonusReturnTotal += bonusWin
      sequenceWin += bonusWin
    }

    stats.returned += sequenceWin
    if (sequenceWin > 0) {
      stats.hits++
      stats.losingStreak = 0
    } else {
      stats.losingStreak++
      if (stats.losingStreak > stats.longestLosingStreak) stats.longestLosingStreak = stats.losingStreak
    }
    if (totalWinThisSpin > stats.biggestBaseSpin) stats.biggestBaseSpin = totalWinThisSpin
    if (sequenceWin > stats.biggestSequence) stats.biggestSequence = sequenceWin
    stats.tiers[classifyTier(sequenceWin, TOTAL_BET)]++

    if (i % stats.sampleEvery === 0) stats.perSpinReturns.push(sequenceWin / TOTAL_BET)
  }
  // Variance / stddev of (return / bet) per spin, sampled
  const xs = stats.perSpinReturns
  const n = xs.length || 1
  const mean = xs.reduce((s, x) => s + x, 0) / n
  const v = xs.reduce((s, x) => s + (x - mean) * (x - mean), 0) / n
  stats.sampleMean = mean
  stats.sampleVariance = v
  stats.sampleStddev = Math.sqrt(v)
  delete stats.perSpinReturns
  return stats
}

// ─── Output ────────────────────────────────────────────────────────────────
function fmtMoney(cents) {
  return (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtPct(x, digits = 3) { return (x * 100).toFixed(digits) + '%' }

function main() {
  const arg = parseInt(process.argv[2] || '50000', 10)
  const totalSpins = Number.isFinite(arg) && arg > 0 ? arg : 50_000
  process.stdout.write(`Diamond Riches stress (server-faithful) — ${totalSpins.toLocaleString()} spins @ $${fmtMoney(TOTAL_BET)}/spin\n`)
  const t0 = Date.now()
  const s = simulate(totalSpins)
  const elapsed = (Date.now() - t0) / 1000

  const rtp = s.returned / s.wagered
  const hitFreq = s.hits / s.spins
  const bonusFreq = s.bonusTriggers / s.spins
  const bonusShareOfReturn = s.bonusReturnTotal / Math.max(1, s.returned)

  const tierPct = (k) => s.tiers[k] / s.spins
  const lines = [
    `### ${totalSpins.toLocaleString()} spins  ($${fmtMoney(TOTAL_BET)}/spin · line_bet=${LINE_BET}¢ × ${LINE_COUNT} lines)`,
    '',
    `- Wagered:           $${fmtMoney(s.wagered)}`,
    `- Returned:          $${fmtMoney(s.returned)}`,
    `- **Actual RTP:**    **${fmtPct(rtp, 3)}**   (designed 95.0% — Δ ${fmtPct(rtp - 0.95, 3)})`,
    `- Hit frequency:     ${fmtPct(hitFreq, 3)}`,
    `- Bonus trigger:     ${fmtPct(bonusFreq, 4)}  (1 in ${(1 / bonusFreq).toFixed(1)} spins)`,
    `- Bonus share of return:  ${fmtPct(bonusShareOfReturn, 1)}`,
    `- Bonus retriggers:  ${s.bonusRetriggers}  (over ${s.bonusSpinsRun.toLocaleString()} free spins run)`,
    `- Biggest single base-spin (incl. jackpot): $${fmtMoney(s.biggestBaseSpin)}  (${(s.biggestBaseSpin / TOTAL_BET).toFixed(1)}× bet)`,
    `- Biggest sequence (base + bonus chain):    $${fmtMoney(s.biggestSequence)}  (${(s.biggestSequence / TOTAL_BET).toFixed(1)}× bet)`,
    `- Longest losing streak:  ${s.longestLosingStreak}`,
    `- Per-spin return variance (sampled):  σ²=${s.sampleVariance.toFixed(3)}  σ=${s.sampleStddev.toFixed(3)}`,
    '',
    '#### Win-tier distribution (vs total bet)',
    '',
    '| Tier (× bet) | Spins | %       |',
    '|--------------|------:|--------:|',
    `| none (0×)     | ${s.tiers.none.toLocaleString()} | ${fmtPct(tierPct('none'),3)} |`,
    `| small (<1×)   | ${s.tiers.small.toLocaleString()} | ${fmtPct(tierPct('small'),3)} |`,
    `| medium (1–5×) | ${s.tiers.medium.toLocaleString()} | ${fmtPct(tierPct('medium'),3)} |`,
    `| big (5–25×)   | ${s.tiers.big.toLocaleString()} | ${fmtPct(tierPct('big'),3)} |`,
    `| mega (25–100×)| ${s.tiers.mega.toLocaleString()} | ${fmtPct(tierPct('mega'),3)} |`,
    `| super (≥100×) | ${s.tiers.super_mega.toLocaleString()} | ${fmtPct(tierPct('super_mega'),3)} |`,
    '',
    '',
    `_Elapsed:_ ${elapsed.toFixed(1)}s`,
  ]
  return { lines, summary: { totalSpins, rtp, hitFreq, bonusFreq, biggestSequence: s.biggestSequence, longestLosingStreak: s.longestLosingStreak, bonusReturnTotal: s.bonusReturnTotal, returned: s.returned } }
}

if (require.main === module) {
  const out = main()
  console.log(out.lines.join('\n'))
}

module.exports = { simulate, main, LINE_BET, LINE_COUNT, TOTAL_BET }
