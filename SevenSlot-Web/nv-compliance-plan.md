# Triple Sevens — Compliance Remediation Plan

**Companion to:** [nv-gaming-audit.md](SevenSlot-Web/nv-gaming-audit.md)
**Date:** 2026-05-12
**Scope:** Fixes for every Fail and Concern in the audit, organized into three deployment-model phases.

> **Read this first.** Many of the "fixes" below add platform infrastructure (persistence, accounting,
> handpay, attendant interfaces) that only make sense if the game is heading toward real-money Nevada
> deployment. Don't build it all unless that's the target. The recommended starting point is
> [§"Recommended next 3 things to do"](#recommended-next-3-things-to-do) at the bottom.

---

## Per-item remediation details

Each row is keyed back to the audit row number (audit §2). Effort sizing:
**XS** ≤ 1 day · **S** 2–3 days · **M** 1–2 weeks · **L** 3–6 weeks · **XL** 6+ weeks.

---

### F1. RNG seeded with a hard-coded constant *(audit row 2 — Critical)*

**Plain-English.** The Mersenne Twister is constructed with no argument
([TripleSevenEngine.ts:144](SevenSlot-Web/src/engine/TripleSevenEngine.ts:144)) and its default seed is the
literal `5489` ([MersenneTwister.ts:14](SevenSlot-Web/src/engine/MersenneTwister.ts:14)) — Matsumoto's
reference seed published in the original paper. Every fresh page load therefore produces the same
sequence of spins. A player who reads the source can pre-compute every outcome of a session, and any
two players who load simultaneously see identical streams. To an auditor this is the single most
obvious "this isn't random" finding.

**Fix.** Two-step.
1. In `TripleSevenEngine` constructor, build a high-entropy seed:
   ```ts
   const seedWords = new Uint32Array(624);
   crypto.getRandomValues(seedWords);
   this.rng = new MersenneTwister(seedWords[0]); // or seed full state if MT is extended
   ```
2. Add an overload to `MersenneTwister` to accept a full 624-word state for true full-entropy
   initialization, not just one 32-bit word.

**Effort.** XS.
**Dependencies.** None — independent change.
**Verification.** Unit test: instantiate two engines back-to-back, draw N values from each, assert
the sequences differ. Stress-test: run 1M-spin sim twice, confirm distinct streams but same aggregate
RTP. Spot-check with browser devtools: refresh, hit spin, confirm first-spin positions are not
deterministic across reloads.

---

### F2. RNG does not free-run at ≥100 Hz *(audit row 3)*

**Plain-English.** Nevada Tech Standards say the RNG must cycle "at a minimum average rate of 100 Hz"
even between spins, so the value returned at the *instant* of a spin click can't be predicted by anyone
who knows the seed. Today the RNG sits idle between clicks and draws exactly 9 values per spin
([TripleSevenEngine.ts:281–291](SevenSlot-Web/src/engine/TripleSevenEngine.ts:281)).

**Fix.** Start a `setInterval` (or a `requestAnimationFrame` loop, since rAF runs at ~60 Hz and would
need supplementing with one setInterval tick) in the engine constructor that calls `rng.random()` at
least 100×/sec and throws the result away. On spin, the next 9 values consumed determine the grid.
Pause/resume around `visibilitychange` so backgrounded tabs don't burn battery, but ensure the loop
restarts on focus.

**Effort.** XS.
**Dependencies.** F1 (seed first; otherwise you're just churning a deterministic stream faster).
**Verification.** Devtools: after 10 seconds of idle, query the engine for "values consumed since
construction" — should be ≥ 1,000. Manual: time two spins clicked at slightly different moments,
confirm different outcomes even when input timing is close.

---

### F3. Modulo bias in `randomInt(n)` *(audit row 5)*

**Plain-English.** `randomInt(n) { return random() % n }` is biased when `n` doesn't divide `2³²` evenly.
The bias is mathematically negligible at our `n = 73` (about 1 part in 2³²), but it's a classic lab
finding and trivial to fix, so worth closing.

**Fix.** Rejection sampling:
```ts
randomInt(n: number): number {
  const max = Math.floor(2**32 / n) * n;
  let r;
  do { r = this.random(); } while (r >= max);
  return r % n;
}
```

**Effort.** XS.
**Dependencies.** None.
**Verification.** Unit test: histogram 10M draws at `n = 73`, assert all bins within ±0.05% of
expected count.

---

### F4. No tilt / error state *(audit row 6)*

**Plain-English.** A "tilt" is the EGM-industry term for the machine detecting that something is wrong
(internal error, integrity check failure, attempted cheat) and refusing to take further bets until a
technician clears it. Today, our only "error" handling is silently returning `0` when credits are short
([TripleSevenEngine.ts:269–272](SevenSlot-Web/src/engine/TripleSevenEngine.ts:269)). There is no concept
of a machine being "down."

**Fix.** Add a `tiltCode: string | null` field to `GameState`. Implement integrity checks (paytable
checksum on construct, RNG-state-not-NaN, credit meter non-negative invariant, max-payout sanity check
in `calculateWin`). On any failure, set tilt code and block `spin()`. Add a UI "MACHINE OUT OF SERVICE
— code XYZ" overlay that disables all controls and shows a "call attendant" message. Provide an
attendant clear via a dev-only key combo (real EGMs use a physical keyswitch).

**Effort.** S.
**Dependencies.** F6 (persistence) — tilt code must survive reload.
**Verification.** Unit tests for each forced fault path; manual: stub a paytable-checksum mismatch
and confirm the cabinet locks.

---

### F5. No power-loss recovery / no persistence *(audit row 7 — Critical)*

**Plain-English.** The player's credit balance lives only in React state
([App.tsx:114, 116](SevenSlot-Web/src/App.tsx:114)). Refresh the page → balance resets to $100. In a
real-money context this is either free money (player refreshes) or stolen money (browser crash). NV
Tech Standards require ≥72-hour state retention across power loss.

**Fix.**
- **Phase 0 / 1 floor:** persist `{credits, lastWinAmount, tiltCode, accountingMeters}` to
  `localStorage` on every state change. On engine construct, read from `localStorage` and resume.
- **Phase 2 floor:** add a server-authoritative wallet. Client becomes a display + control surface;
  every bet/win round-trips. State of record is server-side, replicated, durable.

Architecture sketch for Phase 2: a thin Node/Go service exposes `POST /spin {sessionId, betCents}` →
returns `{positions, winCents, newBalance, txId}`. Persist every spin to an append-only event log
(Postgres or DynamoDB). Cabinet/client never decides outcome — it just renders what the server returns.

**Effort.** S (localStorage) · L (server-authoritative).
**Dependencies.** None for localStorage; blocks F4 (tilt persistence), F8 (accounting meters), F9
(handpay), F11 (RG limits).
**Verification.** Manual: bet, win, refresh, confirm balance survives. For server version: kill the
client mid-spin during integration tests, confirm the spin either committed or didn't (no torn writes).

---

### F6. No accounting meters / audit trail *(audit row 14 — Critical)*

**Plain-English.** Real EGMs accumulate lifetime totals — total wagered ("coin in"), total paid out
("coin out"), jackpot count, attendant-paid amount, etc. These let auditors reconcile what the
machine claims against what the cage cashed. Today the engine state is just
`{credits, reelPositions, lastWinAmount, isSpinning}`
([TripleSevenEngine.ts:3–8](SevenSlot-Web/src/engine/TripleSevenEngine.ts:3)) — no totals exist at all.

**Fix.** Extend `GameState` with `meters: { coinInCents, coinOutCents, totalSpins, handpayCents,
jackpotCount, attendantPaidCents }`. Update inside `spin()` immediately after the bet deduction and
after the win settlement. Add an attendant audit screen (key-combo-gated, or behind a build flag for
the social version) that displays all meters. For phase 2, also append a per-spin event record to a
durable log.

**Effort.** S (in-engine meters + UI) · M (with durable event log).
**Dependencies.** F5 (persistence). Meters that don't survive reload are useless.
**Verification.** Run the existing stress harness; confirm `coinInCents` equals `spins × betCents`
and `coinOutCents` equals sum of `winAmount`.

---

### F7. Paytable button disabled during spin *(audit row 9 — Concern)*

**Plain-English.** Paytable must be on-demand at any time per Tech Standards §Information. The
PAYS button is `disabled={isSpinning}` ([App.tsx:681](SevenSlot-Web/src/App.tsx:681)) — a player
mid-spin can't open it.

**Fix.** Remove `disabled={isSpinning}` from the PAYS button. The modal already pauses auto-spin
via `modal === 'none'` check ([App.tsx:336](SevenSlot-Web/src/App.tsx:336)), so opening it during a
manual spin is safe.

**Effort.** XS.
**Dependencies.** None.
**Verification.** Manual: hit SPIN, while reels are tumbling, click PAYS, confirm modal opens.

---

### F8. No denomination plate *(audit row 13 — Concern)*

**Plain-English.** Tech Standards want the denomination (the credit value, here 5¢) explicitly
displayed, not just inferable from arithmetic. Today it's documented in code
([TripleSevenEngine.ts:11](SevenSlot-Web/src/engine/TripleSevenEngine.ts:11)) but the cabinet just
shows dollar amounts.

**Fix.** Add a small "5¢" or "$0.05 / CREDIT" plate to the marquee or footer of the cabinet
([App.tsx:474–480](SevenSlot-Web/src/App.tsx:474) or [App.tsx:690–699](SevenSlot-Web/src/App.tsx:690)).

**Effort.** XS.
**Dependencies.** None.
**Verification.** Visual review.

---

### F9. No single-spin maximum payout cap *(audit row 17 — Concern)*

**Plain-English.** Lab review will ask "what's the most a single spin can pay, and is that intentional?"
Right now the only bound is the paytable: `betAmount × 10000` per line for Rainbow 7s + add line wins
across all 8 lines. Stress observed $2,630 max ([stress-test-report.md:271](SevenSlot-Web/stress-test-report.md:271)).
There is no explicit cap or assertion in the engine.

**Fix.** Add `MAX_SINGLE_SPIN_WIN_CENTS = 1_000_000` (or whatever the business chooses — $10k feels
appropriate at this bet ceiling) as a tilt trigger: if `calculateWinAll8Lines` ever returns above it,
raise tilt and halt. This is belt-and-suspenders against paytable misconfiguration.

**Effort.** XS.
**Dependencies.** F4 (tilt infra).
**Verification.** Unit test: stub a paytable that yields > cap, confirm tilt raised, credits not paid.

---

### F10. W-2G handpay flow missing *(audit row 18)*

**Plain-English.** When a win meets/exceeds the IRS W-2G threshold ($2,000 from 2026-01-01), a real
EGM locks, alerts an attendant, captures the player's tax-ID details, and only resumes after the
attendant clears the lock. Today
[TripleSevenEngine.ts:296–298](SevenSlot-Web/src/engine/TripleSevenEngine.ts:296) just adds the win to
credits, no special handling. A Rainbow-7 max-bet jackpot is $2,500 — comfortably above threshold.

**Fix.** When `winAmount ≥ HANDPAY_THRESHOLD_CENTS` (=200000): set `state.handpayLocked = true`,
record the win in pending meters (not in `credits`), surface a "JACKPOT — call attendant" overlay,
disable spin button. Attendant clear (admin UI / key combo) collects W-2G form data and releases the
win into credits while recording it to the audit log.

**Effort.** M (well-trodden but lots of UX/state work).
**Dependencies.** F4 (tilt-equivalent lock infra), F5 (persistence), F6 (meters).
**Verification.** Force-trigger a jackpot in dev mode, confirm flow end-to-end and that the audit
record matches the W-2G form output.

---

### F11. Losses Disguised as Wins *(audit row 19 — Concern)*

**Plain-English.** `classifyWinTier` returns `'small'` for any `winCents > 0`
([App.tsx:80–88](SevenSlot-Web/src/App.tsx:80)). That means betting $2.00 and winning $0.10 lights up
the "WIN" badge, plays win audio, and runs the count-up animation — even though you net-lost $1.90.
UK and Australia regulators explicitly target this; NGCB doesn't prohibit but labs flag.

**Fix.** Gate the celebratory tier on `winCents >= betCents`:
```ts
function classifyWinTier(winCents, betCents, isJackpot): WinTier | null {
  if (winCents <= 0) return null;
  if (isJackpot) return 'jackpot';
  if (winCents < betCents) return null; // LDW — show net amount, no celebration
  ...
}
```
Plus: in the LDW case, render a neutral "+$X.XX" readout (not the celebratory amber LED treatment),
and skip the win audio. The `LAST WIN` value still shows the gross — it's just not framed as a victory.

**Effort.** XS.
**Dependencies.** None.
**Verification.** Manual: place a max bet on Lemon-only paying lines, confirm small partial-line wins
don't trigger celebration. Snapshot test on a known LDW seed.

---

### F12. Thin responsible-gambling features *(audit row 20)*

**Plain-English.** Today: a hotline link in the info modal ([App.tsx:839–854](SevenSlot-Web/src/App.tsx:839)).
That's the minimum, not an RG program. Required for NV interactive gaming (Reg 5A) and best-practice
for any consumer-facing slot UX:
- Session loss limit (player-set, hard cap)
- Session time limit + reality-check pop-up every N minutes
- Self-exclusion (24h / 7d / permanent)
- Visible session loss running total

**Fix.** Add an RG settings panel reachable from the info modal. Persist player preferences via F5.
On each spin: check accumulated session loss vs limit, check elapsed time vs reality-check interval.
Auto-spin must respect these limits too — extend the auto-spin stop conditions at
[App.tsx:290–298](SevenSlot-Web/src/App.tsx:290).

**Effort.** M.
**Dependencies.** F5 (persistence — limits must survive reload).
**Verification.** Set $5 loss limit, play until hit, confirm spin button locks. Set 5-min reality
check, wait, confirm modal interrupts gameplay.

---

### F13. No interactive-gaming server / NV server colocation *(audit row 23)*

**Plain-English.** If the product ships under NV Reg 5A (interactive gaming), the core servers must
physically live in Nevada and pass intra-state geo-fencing. The audited code is client-only; there is
no server at all.

**Fix.** Build the server-authoritative architecture from F5 Phase 2, deploy in a Nevada data center
(or a cloud region with NV-physical guarantees plus geo-fenced access). Add KYC/AML, geolocation
enforcement (Reg 5A also requires real-time geolocation per spin for intra-state players), age
verification, and an integrated payments processor.

**Effort.** XL — this is essentially "build the entire backend."
**Dependencies.** F5 (server-side persistence).
**Verification.** GLI-19 (interactive systems) test plus NV-specific lab certification.

---

### F14. Independent Testing Laboratory certification *(audit row 24)*

**Plain-English.** Even a perfect codebase must be sealed-and-tested by an NGCB-approved ITL (GLI or
BMM) before it can be deployed to a Nevada licensee. The lab reviews source code, certifies the
build hash, and runs millions of simulated spins.

**Fix.** Engage GLI or BMM. Provide: full source, build reproducibility (deterministic build → hash
seal), `stress-test-report.md` style stat sheet, paytable specification, RNG documentation, and the
fixes above already merged.

**Effort.** XL (calendar, not labor — 6–10 weeks lab time).
**Dependencies.** Every other Fail and Concern resolved first; lab will reject otherwise.
**Verification.** Certified report from the ITL.

---

### F15. Continuous RNG monitoring (chi-squared) *(audit row 5 sub-item)*

**Plain-English.** Tech Standards for hardware RNGs require a rolling chi-squared goodness-of-fit
test over the last 10,000 outcomes plus an event log of the last 10 such tests. Software RNGs aren't
strictly held to this, but it's the kind of in-production self-check labs love to see.

**Fix.** In-engine: maintain a ring buffer of the last 10,000 symbol-pick outcomes (index 0–13).
Every N spins compute a chi-squared statistic against expected frequencies and append `{ts, chi2, df,
pValue}` to a `rngHealth` log. Surface on the attendant audit screen. If p < 0.001 for 3 consecutive
runs → tilt (F4).

**Effort.** S.
**Dependencies.** F4 (tilt), F6 (meters/log infra).
**Verification.** Inject a deliberately-biased reel weight, confirm tilt triggers within a few
thousand spins.

---

## Phased plan

### Phase 0 — Universal hygiene (ship regardless of distribution model)

**Summary.** No-regret fixes that close obvious bugs and clean up presentation. Cheap, all-XS or -S,
no architecture decisions required. Worth doing even if this stays a personal demo. Eliminates the
"seed is hard-coded" embarrassment and the LDW pattern that's bad UX in any setting.

**Items, in suggested order:**
1. **F1** — Real RNG seed from `crypto.getRandomValues`. (XS)
2. **F3** — Rejection-sample to remove modulo bias. (XS)
3. **F2** — Free-running RNG between spins. (XS, depends on F1)
4. **F7** — Allow paytable open during spin. (XS)
5. **F8** — Denomination plate on cabinet. (XS)
6. **F11** — LDW guard in `classifyWinTier`. (XS)
7. **F5 (localStorage tier)** — Persist credits + meters to `localStorage`. (S)

**Cumulative effort.** ~1 person-week.

---

### Phase 1 — Social-casino / App Store distribution

**Summary.** Assumes ship-target is a free-play app on iOS / Android / web with no real-money cash-in.
NGCB doesn't bind, but Apple Rule 5.3 + Google Play "Simulated Gambling" policy + FTC fairness/disclosure
do. Adds basic accounting (so the player can see lifetime stats), responsible-gaming controls (Apple
specifically scrutinizes simulated gambling for predatory mechanics), and visible build/version info.
The bar is "does it look ethical and disclosable," not "could this pass GLI-11."

**Items, in suggested order (all of Phase 0, then):**
8. **F6 (in-engine meters tier)** — Lifetime totals + audit screen. (S, depends on F5)
9. **F4** — Tilt state for integrity faults (paytable checksum, max-payout sanity). (S, depends on F5)
10. **F9** — Single-spin max-payout assertion. (XS, depends on F4)
11. **F12** — RG controls: loss limit, time limit, reality check, self-exclude. (M, depends on F5)
12. **Build/version plate** — visible Game ID + commit SHA on the cabinet (audit row 24 quick-win).
    (XS)
13. **App-store policy compliance pass** — explicit "this is not real-money gambling" disclosure,
    minimum-age gate, paid-content separation per Apple 5.3.5 if any IAP is added later. (S)

**Cumulative effort.** ~3–4 person-weeks on top of Phase 0.

**Out-of-scope (deferred to Phase 2 even though they would tighten NGCB compliance):** W-2G handpay,
in-Nevada server, ITL certification, continuous RNG chi-squared.

---

### Phase 2 — Real-money NGCB licensed venue

**Summary.** Assumes the goal is for a Nevada licensee to deploy this on the floor (or as Reg-5A
interactive gaming with Nevada-resident players). Everything from Phase 0 and Phase 1 stays, plus the
heavy infrastructure: server-of-record for outcomes, durable accounting/audit log, handpay flow, KYC,
geo-fencing, and finally lab certification. This is where the project transitions from "web slot game"
to "gaming platform."

**Items, in suggested order (all of Phase 0 & 1, then):**
14. **F5 (server-authoritative tier)** — Outcome server + durable event log in NV-resident infra. (L)
15. **F6 (durable event log tier)** — Per-spin append-only audit log. (M, on top of F5 Phase 2)
16. **F10** — W-2G handpay flow + W-2G data capture. (M, depends on F5/F6)
17. **F15** — Continuous chi-squared RNG monitoring + tilt on failure. (S, depends on F4/F6)
18. **F13** — Reg 5A interactive gaming: geo-fencing, KYC/AML, age verification, payments
    integration, NV-resident server colocation. (XL, only if Reg-5A pathway chosen vs land-based EGM)
19. **F14** — GLI/BMM certification engagement and sealing. (XL — mostly calendar)

**Cumulative effort.** Multiple person-quarters on top of Phase 1, plus 2–3 months of regulatory
calendar. This is a "fund a team and a year" project, not a sprint.

---

## Recommended next 3 things to do

The user hasn't picked a distribution model yet. These three moves are blocking only the worst
present-tense problems, are all very small, are independently valuable, and don't commit to any path.

1. **F1 — Replace the hard-coded RNG seed.** Single line change in
   [TripleSevenEngine.ts:144](SevenSlot-Web/src/engine/TripleSevenEngine.ts:144); add a
   `crypto.getRandomValues`-derived seed. This is the highest-embarrassment item in the codebase: any
   inspection (lab, reviewer, hobbyist) immediately spots that every page-load runs the identical
   stream. Effort: XS. Risk: none. No architecture decision required.

2. **F11 — Stop calling losses "WINS."** Five-line edit to `classifyWinTier`
   ([App.tsx:80–88](SevenSlot-Web/src/App.tsx:80)) that returns `null` when `winCents < betCents`. It's
   a design improvement that also closes the LDW finding — relevant to every distribution path (Apple
   reviewers, FTC, NGCB, UK if you ever expand). Effort: XS.

3. **F5 (localStorage tier) — Persist credits to localStorage.** Closes the trivial "refresh = new $100"
   path, gives the player a credible balance across sessions, and lays the smallest possible
   foundation that every later fix (meters, RG limits, tilt) builds on. Architecturally non-committal —
   nothing about this rules out moving to a server later. Effort: S, maybe a day.

After these three, the right next move depends on which phase the user picks. If they don't know
yet — those three move the codebase from "demo with a broken-RNG smell" to "clean prototype that can
be honestly demoed."
