/**
 * Diamond Riches — parameterizable stress harness.
 *
 * Same server-faithful math as diamond-server-stress.cjs but lets you pass
 * candidate reel strips via env vars or args so RTP iterations can run
 * without editing the harness each pass.
 *
 * Usage:
 *   node stress-test/diamond-iter-harness.cjs <spins> [json-file] [label]
 *
 * The JSON file shape:
 *   { "base_outer": [...], "base_inner": [...],
 *     "free_outer": [...], "free_inner": [...],
 *     "scatter_pay": { "3": 2, "4": 15, "5": 100 } }   // scatter_pay optional
 *
 * Missing keys fall back to the currently-deployed luxury_config values.
 */
const crypto = require('crypto')
const fs = require('fs')

// Deployed (current) config — keep in sync with luxury_config table.
const DEFAULT_CFG = {
  base_outer: [4, 5, 6, 7, 8, 9, 4, 5, 6, 7, 8, 9, 14, 4, 5, 6, 7, 8, 9, 4, 5, 6, 7, 8, 9, 9, 9, 9, 9, 9, 9, 9, 9, 14],
  base_inner: [1, 6, 2, 7, 3, 8, 1, 9, 2, 4, 3, 9, 1, 14, 2, 5, 3, 1, 6, 2, 7, 3, 8, 1, 9, 2, 9, 3, 13, 1, 1, 2, 3, 3],
  free_outer: [4, 5, 6, 7, 8, 9, 4, 5, 6, 7, 8, 9, 9, 4, 5, 6, 7, 8, 9, 4, 5, 6, 7, 8, 9, 9, 9, 9, 9, 9, 9, 9, 14, 9],
  free_inner: [1, 6, 2, 7, 3, 8, 1, 9, 2, 4, 3, 9, 1, 9, 2, 5, 3, 1, 6, 2, 7, 3, 8, 1, 9, 2, 9, 3, 13, 1, 1, 2, 9, 3],
  // 3-coin pay raised 2× → 3× in migration diamond_riches_rtp_94_96_iter1
  // to lift RTP from ~94.0% (edge) into the 94-96% band (~95.3% mean).
  scatter_pay: { 3: 3, 4: 15, 5: 100 },
}

const cfgPath = process.argv[3]
const label = process.argv[4] || (cfgPath ? cfgPath.split('/').pop() : 'baseline')
let cfg = { ...DEFAULT_CFG }
if (cfgPath && fs.existsSync(cfgPath)) {
  const raw = JSON.parse(fs.readFileSync(cfgPath, 'utf8'))
  cfg = { ...cfg, ...raw }
  if (raw.scatter_pay) cfg.scatter_pay = { ...DEFAULT_CFG.scatter_pay, ...raw.scatter_pay }
}

const BASE_OUTER = cfg.base_outer
const BASE_INNER = cfg.base_inner
const FREE_OUTER = cfg.free_outer
const FREE_INNER = cfg.free_inner
const SCATTER_PAY = cfg.scatter_pay
const STRIP_LEN = BASE_OUTER.length

if (BASE_OUTER.length !== STRIP_LEN || BASE_INNER.length !== STRIP_LEN ||
    FREE_OUTER.length !== STRIP_LEN || FREE_INNER.length !== STRIP_LEN) {
  console.error('All strips must have identical length.')
  process.exit(1)
}

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
const LINE_PAY = {
  1: { 2: 10, 3: 50, 4: 500, 5: 5000 },
  2: { 2: 5,  3: 30, 4: 200, 5: 1000 },
  3: {        3: 20, 4: 100, 5:  500 },
  4: {        3: 15, 4:  75, 5:  200 },
  5: {        3: 10, 4:  50, 5:  200 },
  6: {        3: 10, 4:  30, 5:  150 },
  7: {        3:  5, 4:  30, 5:  150 },
  8: {        3:  5, 4:  25, 5:  120 },
  9: {        3:  5, 4:  20, 5:  100 },
}
const SYM = { BLANK: 0, WILD: 13, SCATTER: 14 }
const LINE_BET = 10
const LINE_COUNT = 15
const TOTAL_BET = LINE_BET * LINE_COUNT
const BONUS_BASE_MULT = 2
const MAX_DIAMONDS = 27
const FREE_SPINS_AWARDED = 11

function uint(n) { return crypto.randomInt(n) }

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

function evaluate(grid, lineBet, totalBet, activeLines, isBonus = false) {
  const lines = Math.min(activeLines, 15)
  let lineWin = 0
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
    if (lead === null && symbols[0] === SYM.WILD) lead = 1
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
    }
  }
  let coinCount = 0
  let wildCount = 0
  let scatterWin = 0
  if (!isBonus) {
    for (let c = 0; c < 15; c++) {
      if (grid[c] === SYM.SCATTER) coinCount++
      else if (grid[c] === SYM.WILD) wildCount++
    }
    scatterWin = scatterPay(coinCount, totalBet)
  }
  const triggerCount = coinCount + wildCount
  const baseWin = lineWin + scatterWin
  return { baseWin, triggerBonus: !isBonus && triggerCount >= 3 }
}

const BONUS_MAX_SPINS = 5000
function runBonusSession(triggerBet, triggerLineBet, triggerLineCount) {
  let diamonds = 0
  let free = FREE_SPINS_AWARDED
  let bonusReturn = 0
  let bonusSpins = 0
  while (free > 0 && bonusSpins < BONUS_MAX_SPINS) {
    bonusSpins++
    const { grid } = spinReels(true)
    for (let r = 1; r <= 3; r++) {
      for (let row = 0; row < 3; row++) {
        if (grid[r * 3 + row] === SYM.WILD && diamonds < MAX_DIAMONDS) diamonds++
      }
    }
    const mult = BONUS_BASE_MULT + Math.min(diamonds, MAX_DIAMONDS)
    const ev = evaluate(grid, triggerLineBet, triggerBet, triggerLineCount, true)
    bonusReturn += ev.baseWin * mult
    free--
  }
  return bonusReturn
}

function simulate(totalSpins) {
  let wagered = 0
  let returned = 0
  let hits = 0
  let bonusTriggers = 0
  let bonusReturnTotal = 0
  let longestLoss = 0
  let curLoss = 0
  let biggestSeq = 0
  for (let i = 0; i < totalSpins; i++) {
    wagered += TOTAL_BET
    const { grid } = spinReels(false)
    const ev = evaluate(grid, LINE_BET, TOTAL_BET, LINE_COUNT)
    let seq = ev.baseWin
    if (ev.triggerBonus) {
      bonusTriggers++
      const b = runBonusSession(TOTAL_BET, LINE_BET, LINE_COUNT)
      bonusReturnTotal += b
      seq += b
    }
    returned += seq
    if (seq > 0) { hits++; curLoss = 0 }
    else { curLoss++; if (curLoss > longestLoss) longestLoss = curLoss }
    if (seq > biggestSeq) biggestSeq = seq
  }
  return {
    spins: totalSpins, wagered, returned, hits,
    rtp: returned / wagered,
    hitFreq: hits / totalSpins,
    bonusFreq: bonusTriggers / totalSpins,
    bonusShare: bonusReturnTotal / Math.max(1, returned),
    longestLoss, biggestSeq,
  }
}

function main() {
  const arg = parseInt(process.argv[2] || '100000', 10)
  const spins = Number.isFinite(arg) && arg > 0 ? arg : 100000
  const t0 = Date.now()
  const r = simulate(spins)
  const elapsed = (Date.now() - t0) / 1000
  const pct = (x, d = 3) => (x * 100).toFixed(d) + '%'
  console.log(`[${label}] ${spins.toLocaleString()} spins @ $${(TOTAL_BET / 100).toFixed(2)}/spin`)
  console.log(`  RTP:        ${pct(r.rtp)}    (target 94-96%)`)
  console.log(`  Hit freq:   ${pct(r.hitFreq)}`)
  console.log(`  Bonus freq: ${pct(r.bonusFreq, 4)}  (1 in ${(1 / r.bonusFreq).toFixed(1)})`)
  console.log(`  Bonus share: ${pct(r.bonusShare, 1)}`)
  console.log(`  Biggest seq: $${(r.biggestSeq / 100).toFixed(2)}  (${(r.biggestSeq / TOTAL_BET).toFixed(1)}× bet)`)
  console.log(`  Longest loss streak: ${r.longestLoss}`)
  console.log(`  Elapsed: ${elapsed.toFixed(1)}s`)
  return r
}

if (require.main === module) main()
module.exports = { simulate, DEFAULT_CFG }
