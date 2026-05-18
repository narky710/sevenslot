# Triple Sevens — Nevada Gaming Control Board Compliance Audit

**Audited build:** branch `claude/jovial-cray-25fca3` · commit `c302aba` ("Update betting system to 5 cent increments")
**Date:** 2026-05-12
**Auditor:** Engineering review (Claude)
**Scope:** `src/engine/TripleSevenEngine.ts`, `src/engine/MersenneTwister.ts`, `src/App.tsx`, `src/styles/index.css`, `stress-test-report.md`

---

## ⚠️ Important caveats — read first

1. **This is engineering / design feedback, not a legal certification.** Real NGCB certification requires
   submission through Nevada Gaming Control Board's New Gaming Device Submission process and lab testing
   by an approved Independent Testing Laboratory (typically GLI-11 or BMM-equivalent). This audit is a
   pre-flight quality bar, not a substitute for that pipeline. See
   [NGCB New Gaming Device Submission Package](https://www.gaming.nv.gov/siteassets/content/forms/NewGamingDeviceSubmissionPackage.pdf).
2. **NGCB rules only legally apply to real-money gambling devices operated by a Nevada licensee.** If this
   app is distributed as social / free-play casino, or distributed outside Nevada real-money venues
   (App Store, Google Play, web), Nevada Gaming Control Board rules are a **quality bar, not a legal
   requirement**. The applicable regime would instead be the consumer-protection / app-store rules of the
   target jurisdiction (FTC, App Store guideline 5.3, etc.). The codebase contains no indication of which
   distribution mode is intended — every "Fail" verdict below is conditional on the assumption that this is
   targeting real-money play in a Nevada-licensed venue. **Resolve distribution scope before treating any
   failure as blocking.**
3. **Even if this is intended for real-money Nevada play, the current implementation is a web/React app
   with no hardware integration, no accounting trail, no attendant interface, and no certification artifacts.**
   It is closer to a UX prototype than to a submittable EGM. The "Fail" rows below are meaningful as a gap
   list but should not be read as "is 80% there" — substantial integration work is required for any path to
   certification.

---

## 1. Executive summary

| Verdict | Count |
|---|---|
| ✅ Pass | 6 |
| ⚠️ Concern | 5 |
| ❌ Fail | 9 |
| ➖ N/A or unresolved | 4 |
| **Total requirements audited** | **24** |

**Bottom line.** Math and presentation fundamentals are sound: the designed 92.6% RTP exceeds the 75%
NGCB floor by a wide margin, the paytable is on-screen and accurate, and the stress data shows
1M-spin convergence within ~0.6 pp of theoretical. **However, three categories of gap would block
certification today**: (a) the RNG is seeded with a hard-coded constant (`MersenneTwister` default
`seed = 5489`), (b) there is no audit / accounting meter infrastructure, no tilt-condition handling, and
no power-loss recovery, and (c) several player-protection items (W-2G handpay flow, LDW prevention,
responsible-gambling tools) are missing or thin. None of the gaps are math/design problems — they are
integration / platform problems consistent with this being a UX prototype.

---

## 2. Per-requirement table

Legend: ✅ Pass · ⚠️ Concern · ❌ Fail · ➖ N/A

| # | Requirement | Reference | Game state | Verdict | Notes |
|---|---|---|---|---|---|
| 1 | **Minimum 75% theoretical RTP per wager** | [NV Reg 14.040(1)(a)](https://www.gaming.nv.gov/siteassets/content/home/features/Regulation14.pdf) | 92.6% theoretical; 92.2–92.6% observed at 500k+ spins. Single fixed reel weighting → no RTP variation across wager amounts. | ✅ Pass | See [TripleSevenEngine.ts:77–93](SevenSlot-Web/src/engine/TripleSevenEngine.ts:77) (`REEL_WEIGHTS`) and [stress-test-report.md](SevenSlot-Web/stress-test-report.md) lines 264–286 (1M-spin run @ 91.996%). |
| 2 | **RNG must not use a static seed upon initialization** | [Tech Standards §RNG](https://www.gaming.nv.gov/siteassets/content/home/features/TechnicalStandard1.pdf) | `MersenneTwister` is constructed with `new MersenneTwister()` — the constructor default seed is `5489` (Matsumoto's reference seed). Every fresh session starts the *identical* stream. | ❌ **Fail (critical)** | [MersenneTwister.ts:14](SevenSlot-Web/src/engine/MersenneTwister.ts:14) `constructor(seed: number = 5489)`; [TripleSevenEngine.ts:144](SevenSlot-Web/src/engine/TripleSevenEngine.ts:144) `this.rng = new MersenneTwister();` |
| 3 | **RNG must cycle continuously at ≥ 100Hz when idle** | Tech Standards §RNG (cycle rate) | RNG is only invoked at spin time (9 draws per spin). Between spins the generator is dormant; no free-run. | ❌ Fail | [TripleSevenEngine.ts:281–291](SevenSlot-Web/src/engine/TripleSevenEngine.ts:281) — `pickWeightedSymbol()` runs 9× per spin, then idle. |
| 4 | **RNG must not draw values for future play** | Tech Standards §RNG | Spin draws are taken at spin time, in-line for the current spin only. No precomputed result table. | ✅ Pass | [TripleSevenEngine.ts:268–304](SevenSlot-Web/src/engine/TripleSevenEngine.ts:268). |
| 5 | **RNG passes statistical randomness tests over millions of spins; result is monitored** | Tech Standards / GLI-11 §RNG | MT19937 itself is widely accepted in regulated gaming after careful seeding. Stress test passes for RTP/hit-frequency at 1M spins. **However:** modulo reduction in `randomInt(n) = random() % n` introduces theoretical modulo bias for any `n` not dividing 2³². At `n = 73` (`TOTAL_WEIGHT`) the bias is ≈ 1 / 2³² ≈ negligible, but lab review may still flag it. No runtime chi-squared monitoring loop. | ⚠️ Concern | [MersenneTwister.ts:71–73](SevenSlot-Web/src/engine/MersenneTwister.ts:71). Replace with rejection sampling for hard pass. |
| 6 | **Tilt condition (programmed error state)** | Tech Standards §Tilt | No tilt state exists. The only "error" handling is: if `state.credits < totalBetCents` the spin returns `0`. No detection of malfunction, no recovery prompt, no service-needed indicator. | ❌ Fail | [TripleSevenEngine.ts:269–272](SevenSlot-Web/src/engine/TripleSevenEngine.ts:269); [App.tsx:178–179](SevenSlot-Web/src/App.tsx:178). |
| 7 | **Power-loss recovery — game state must be retained ≥ 72h** | Tech Standards §Recovery | All state is in-memory React refs. Reload constructs a fresh `TripleSevenEngine(10000)` — every reload **resets the player's credit balance to $100.00**. | ❌ **Fail (critical)** | [App.tsx:114](SevenSlot-Web/src/App.tsx:114) `useRef(new TripleSevenEngine(10000));` |
| 8 | **Continuous on-screen credit meter, bet meter, win readout** | Tech Standards §Meters | Credit meter, bet meter, last-win readout all visible on the cabinet at all times. | ✅ Pass | [App.tsx:690–699](SevenSlot-Web/src/App.tsx:690) (footer); [App.tsx:598–614](SevenSlot-Web/src/App.tsx:598) (win box). |
| 9 | **Paytable on-demand access from gameplay** | Tech Standards §Information | "PAYS" button in secondary controls opens modal with full payouts + rules + paylines diagram. **However, the button is `disabled={isSpinning}`** — so the paytable is NOT accessible during a spin. NGCB requires on-demand at any time. | ⚠️ Concern | [App.tsx:678–687](SevenSlot-Web/src/App.tsx:678) — drop the `disabled={isSpinning}`. |
| 10 | **Paytable accuracy (displayed matches engine)** | Tech Standards §Paytable | Spot-checked: Rainbow ×10,000, Same-color 7 ×1,000, Mixed 7 ×500, Bell ×100, Triple BAR ×50, Mixed BAR ×10, Cherry 3 / 2 / 1 → ×8 / ×5 / ×2, fruit ×25/×15/×10/×10/×10 — all match engine. | ✅ Pass | [App.tsx:745–769](SevenSlot-Web/src/App.tsx:745) vs [TripleSevenEngine.ts:198–255](SevenSlot-Web/src/engine/TripleSevenEngine.ts:198). |
| 11 | **Theoretical payback % displayed** | Tech Standards §Paytable (per-paytable RTP visibility) | `92.6%` shown on Rules tab and Game Info modal. | ✅ Pass | [App.tsx:73,798,825](SevenSlot-Web/src/App.tsx:73). |
| 12 | **Game name / identification visible** | Tech Standards §Game Identification | "TRIPLE SEVENS" marquee plus cabinet watermark "SS7". | ✅ Pass | [App.tsx:475](SevenSlot-Web/src/App.tsx:475), [App.tsx:437](SevenSlot-Web/src/App.tsx:437). |
| 13 | **Denomination displayed** | Tech Standards §Information | Credit/bet shown in dollars + cents (`formatCents`), and the rules text describes 5¢ credit. No explicit on-cabinet denomination plate. | ⚠️ Concern | [App.tsx:90–97](SevenSlot-Web/src/App.tsx:90) and [TripleSevenEngine.ts:11](SevenSlot-Web/src/engine/TripleSevenEngine.ts:11). |
| 14 | **Accounting meters (coin in, coin out, handle, drop, jackpot, attendant pay)** | Tech Standards §Meters; [MICS v9 Slots](https://www.gaming.nv.gov/siteassets/content/divisions/audit/mics/v9-slots.pdf) | No accounting meters of any kind. There is no `coinIn`, `coinOut`, `jackpot`, `handpay`, `drop` accumulator. No attendant/audit screen. | ❌ **Fail (critical)** | Engine state is just `{ credits, reelPositions, lastWinAmount, isSpinning }` — [TripleSevenEngine.ts:3–8](SevenSlot-Web/src/engine/TripleSevenEngine.ts:3). |
| 15 | **Game cycle is testable / outcomes determinable** | Tech Standards §Game Cycle | RNG state is observable (MT19937 is fully deterministic given seed), and there are exactly 73^9 ≈ 5.1×10¹⁶ raw symbol-grid outcomes — well within finite-cycle testability. | ✅ Pass | [TripleSevenEngine.ts:77–93](SevenSlot-Web/src/engine/TripleSevenEngine.ts:77). |
| 16 | **Hit frequency reported / consistent** | Tech Standards §Game Cycle | Observed ~51.1% hit frequency, stable across all sample sizes. Tier mix is consistent (jackpot ~0.0023%, mega ~0.06%, big ~0.67%). | ✅ Pass | [stress-test-report.md:155–166](SevenSlot-Web/stress-test-report.md:155). |
| 17 | **Single-spin max payout / win cap** | Tech Standards §Maximum Award | Max single-line payout is 10,000 × per-line bet = at max bet (25¢/line) → $2,500. Max stress-observed multi-line win = $2,630 (1313× total bet). No explicit cap in code — the value is bounded only by the paytable. | ⚠️ Concern | [TripleSevenEngine.ts:198–200](SevenSlot-Web/src/engine/TripleSevenEngine.ts:198). |
| 18 | **W-2G handpay threshold — 2026 threshold is $2,000** | [IRS §6041 amended 2026-01-01](https://www.casino.org/news/irs-releases-draft-for-2000-slot-tax-threshold/) | A Rainbow-7 jackpot at max bet pays $2,500 — above the $2,000 W-2G threshold. There is no handpay flow, no machine lock, no W-2G data capture. | ❌ Fail | [TripleSevenEngine.ts:296–298](SevenSlot-Web/src/engine/TripleSevenEngine.ts:296) — winnings just get added directly to `state.credits`. |
| 19 | **Misleading win presentation / "Losses Disguised as Wins"** | Industry / responsible-gaming guidance; some jurisdictions (UK, AU) prohibit | `classifyWinTier` returns `'small'` for **any** `winCents > 0`. With 8 paylines + round-robin credit distribution, you can bet $2.00 and win $0.10 on a single Lemon-line (1 credit × 10 = 50¢… actually 2 credits-on-that-line × 10 = $1.00; on the lowest active line `1 credit × ×10 fruit = $0.05` against the $2.00 stake) — that result triggers the "WIN" badge, win audio, and count-up animation despite being a **net loss**. Classic LDW. | ⚠️ Concern | [App.tsx:80–88](SevenSlot-Web/src/App.tsx:80), [App.tsx:303–304](SevenSlot-Web/src/App.tsx:303). NGCB doesn't explicitly prohibit, but lab reports and many jurisdictions flag this. |
| 20 | **Responsible gambling features** | NGCB encouraged; required for interactive gaming per Reg 5A | RG hotline link + "Play Responsibly" copy in info modal. No session loss limit, no time-out enforcement, no self-exclusion, no reality-check timer. Auto-spin pauses only on a sevens win — not on session-time or loss thresholds. | ❌ Fail (against interactive-gaming standard) / ⚠️ Concern (against device-only) | [App.tsx:839–854](SevenSlot-Web/src/App.tsx:839). |
| 21 | **Volatility / variance disclosed** | Tech Standards §Information | Game Info modal claims "Medium" volatility. Stress data: std-dev $16–17 per $2 spin → coefficient of variation ≈ 8.5, with longest losing streak up to 19 → consistent with medium-to-medium-high. Claim is broadly accurate. | ✅ Pass | [App.tsx:828](SevenSlot-Web/src/App.tsx:828); [stress-test-report.md:264–273](SevenSlot-Web/stress-test-report.md:264). |
| 22 | **Theoretical payback variance across wagers ≤ 4 pp** | Tech Standards §Paytable | Reel weighting is bet-independent; all eight paylines pay on a flat ×bet multiplier. RTP is constant across all bet levels by construction. | ✅ Pass | [TripleSevenEngine.ts:157–177](SevenSlot-Web/src/engine/TripleSevenEngine.ts:157). |
| 23 | **Interactive / mobile gaming framework — core servers in Nevada; intra-state only** | [NV Reg 5A](https://www.gaming.nv.gov/siteassets/content/home/features/Regulation5A.pdf) | The audited code is a client-only React app with no server. If this ships as an interactive gaming product under NV Reg 5A, "core components of an interactive gaming system, including servers and databases running the games... must be located in the State of Nevada." That cannot be satisfied with a pure-client game. | ➖ N/A or Fail depending on scope | Distribution model not specified. |
| 24 | **Independent Testing Laboratory certification** | NV Reg 14.050; Tech Standards §Approval | None. There are no certification artifacts, no source-revision sealing, no production-build hashing. | ➖ Not yet attempted | Out of scope of the codebase but required before deployment. |

---

## 3. Critical gaps (would block certification or harm players)

### CG-1 · RNG seeded with a hard-coded constant
**Reference:** Nevada Tech Standards §RNG: "shall not use static seed upon initialization."

`MersenneTwister`'s constructor defaults to seed `5489`
([MersenneTwister.ts:14](SevenSlot-Web/src/engine/MersenneTwister.ts:14)) and the engine constructs it
with no argument ([TripleSevenEngine.ts:144](SevenSlot-Web/src/engine/TripleSevenEngine.ts:144)). Every
fresh page load therefore produces the **exact same sequence of spins**. A player who knows the seed
(it's in the source) can pre-compute every outcome. This is an immediate-fail item for any lab review,
and is exploitable by players against any leaderboard, tournament, or prize aspect of the game.

Suggested fix direction: seed from `crypto.getRandomValues(new Uint32Array(N))` and use that 624-word
state as the initial MT vector (or replace the RNG with a CSPRNG like ChaCha20 keyed from
`crypto.getRandomValues`).

### CG-2 · No persistence / no power-loss recovery
**Reference:** Nevada Tech Standards §Recovery: "Data must be retained in the event of loss of power…
for a period of at least seventy-two (72) hours."

The game's credit balance lives only in a React `useRef` and `useState`
([App.tsx:114,116](SevenSlot-Web/src/App.tsx:114)). On reload the player gets a new $100.00 balance —
which means a player can either (a) keep refreshing to get free money in a real-money context, or
(b) lose a balance after a crash. Either way it's non-compliant.

### CG-3 · No accounting meters or audit trail
**Reference:** Nevada Tech Standards §Meters; NGCB MICS v9 (Slots).

Engine state holds no `coinIn`, `coinOut`, `handle`, `drop`, `attendantPay`, `jackpot`, or `theoreticalHold`
counters. There is also no game-event log of spins / bets / outcomes. Without these, the device cannot
be audited per MICS, and disputed-spin reconciliation is impossible.

### CG-4 · No tilt / error state, no handpay flow
**Reference:** Nevada Tech Standards §Tilt; W-2G threshold IRS §6041 ($2,000 from 2026-01-01).

A jackpot at max bet pays $2,500 — over the W-2G threshold — but
[TripleSevenEngine.ts:297](SevenSlot-Web/src/engine/TripleSevenEngine.ts:297) just adds the win directly
to credits. A real EGM would lock, surface a handpay request, and capture W-2G data. Likewise, any
malfunction has no detection path.

---

## 4. Quick wins (non-blocking)

1. **Re-seed the RNG on construction.** Replace
   `this.rng = new MersenneTwister();` with
   `this.rng = new MersenneTwister(crypto.getRandomValues(new Uint32Array(1))[0]);` (or seed the full
   624-word state). Closes CG-1's most obvious tail without rewriting the RNG. (Note: a real device
   would also need a continuously cycling RNG — see Concern row 3.)
   [TripleSevenEngine.ts:144](SevenSlot-Web/src/engine/TripleSevenEngine.ts:144).

2. **Remove `disabled={isSpinning}` from the PAYS button.** Paytable on-demand access must be available
   at any time. [App.tsx:681](SevenSlot-Web/src/App.tsx:681).

3. **Replace `random() % n` with rejection sampling** in `MersenneTwister.randomInt` to remove modulo bias
   (theoretical at our `n`, but lab-flaggable).
   [MersenneTwister.ts:71–73](SevenSlot-Web/src/engine/MersenneTwister.ts:71).

4. **Gate the "WIN" badge / win sound / count-up on `winCents ≥ betCents`.** A net-loss spin should not
   present as a win. This is the cheapest LDW mitigation and aligns with UK/AU guidance.
   [App.tsx:80–88](SevenSlot-Web/src/App.tsx:80), [App.tsx:303–304](SevenSlot-Web/src/App.tsx:303).

5. **Persist credits to `localStorage`** with a write on every win and bet. Not a substitute for
   server-side persistence in a regulated context, but closes the trivial "refresh for free money"
   path. [App.tsx:114](SevenSlot-Web/src/App.tsx:114).

6. **Add a `denomination` plate** to the cabinet ("5¢ credit / $0.05–$2.00 bet range") so denomination
   is explicit, not derived.

7. **Display a static "Game ID / Build" string** somewhere on the cabinet (commit SHA or
   `package.json` version) — needed for any audit/incident trail.

8. **Add a `gameEvents` log** in-engine: append `{ts, totalBetCents, perLineBets, positions, winCents}`
   per spin. Even an in-memory ring buffer of the last ~1000 events would dramatically improve disputed-spin
   investigability, and is the minimum hook future audit infrastructure can plug into.

9. **Surface auto-spin loss limit + time limit.** Auto-spin currently stops only on a sevens win
   ([App.tsx:290–298](SevenSlot-Web/src/App.tsx:290)) — adding a loss cap and elapsed-time cap is a
   low-effort responsible-gaming improvement.

---

## 5. Out-of-scope / clarifications needed

These items materially change which rules apply. **Resolve before treating any "Fail" verdict above as
blocking.**

1. **Real-money vs social / free-play.** If this is free-play with no purchase-of-credits flow, NGCB
   doesn't apply legally — the relevant regime is FTC / consumer-protection, App Store rule 5.3
   ("Gaming, Gambling, and Lotteries"), and equivalent in other stores. We saw no purchase or wallet code
   in the audited surface.
2. **Distribution channel.** App Store, Google Play, web, native iOS, in-cabinet? Each has different
   constraints. The codebase is React + web — there is no iOS / Android wrapper visible in the audited
   files.
3. **Jurisdiction.** Even if real-money, only NV venues invoke NGCB. NJ DGE, MGCB (Michigan), PGCB
   (Pennsylvania), MGC (Massachusetts) all have parallel but distinct rule sets — most importantly
   different minimum RTPs (NJ also 75%, but with stricter labeling) and different RNG monitoring rules.
4. **Single-player vs networked.** The engine is single-instance and single-player. If this is intended
   to become an inter-casino linked progressive (the marquee shows "JACKPOT ×10,000" which is a fixed
   multiplier today, but is positioned like a progressive plate), NV Reg 14 §"Inter-Casino Linked
   Systems" and §"On-Line Slot Metering Systems" add a substantial layer of rules not audited here.

---

## Sources

- [Nevada Gaming Control Board — Regulation 14 (Rev. 12/24)](https://www.gaming.nv.gov/siteassets/content/home/features/Regulation14.pdf)
- [Nevada Gaming Control Board — Technical Standards for Gaming Devices and Associated Equipment (Standard 1)](https://www.gaming.nv.gov/siteassets/content/home/features/TechnicalStandard1.pdf)
- [Nevada Gaming Control Board — Technical Standards (Standard 2)](https://www.gaming.nv.gov/siteassets/content/home/features/TechnicalStandard2.pdf)
- [Nevada Gaming Control Board — Technical Standards (Standard 3)](https://www.gaming.nv.gov/siteassets/content/home/features/TechnicalStandard3.pdf)
- [Nevada Gaming Control Board — Regulation 5A, Operation of Interactive Gaming (Rev. 05/24)](https://www.gaming.nv.gov/siteassets/content/home/features/Regulation5A.pdf)
- [Nevada Gaming Control Board — MICS v9 (Slots)](https://www.gaming.nv.gov/siteassets/content/divisions/audit/mics/v9-slots.pdf)
- [Nevada Gaming Control Board — New Gaming Device Submission Package](https://www.gaming.nv.gov/siteassets/content/forms/NewGamingDeviceSubmissionPackage.pdf)
- [Nevada Gaming Control Board — Statutes & Regulations index](https://www.gaming.nv.gov/regulations/gaming-statutes-regulations/)
- [GLI-11 Standard, v2.0 — Gaming Devices in Casinos](https://gaminglabs.com/wp-content/uploads/2018/09/GLI-11-v2-0-Standard-FINAL.pdf)
- [GLI Technical Specifications for RNG Testing](https://gaminglabs.com/getting-started/technical-specifications-for-rng-testing/)
- [IRS — W-2G threshold raised to $2,000 effective 2026-01-01 (CPA Practice Advisor)](https://www.cpapracticeadvisor.com/2025/12/18/irs-confirms-2k-slot-jackpot-threshold-set-to-being-in-2026/175276/)
- [Casino.org — IRS releases draft for $2,000 slot tax threshold](https://www.casino.org/news/irs-releases-draft-for-2000-slot-tax-threshold/)
- Background on Losses Disguised as Wins: [Dixon et al. — Losses disguised as wins in modern multi-line video slot machines](https://uwaterloo.ca/reasoning-decision-making-lab/sites/default/files/uploads/files/DixFugetal_10c.pdf)
