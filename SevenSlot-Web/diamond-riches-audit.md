# Diamond Riches — Code / Mechanics / Compliance Audit

**Date:** 2026-05-23
**Scope:** Server functions `public.play_diamond`, `public._luxury_evaluate`,
`public._luxury_line_mult`, `public._luxury_spin_reels`,
`public._roll_jackpot_trigger`, `public._csprng_uint`,
`public._apply_bet`, `public._credit_win`, `public._apply_spin_to_play_session`;
client adapter `src/games/diamondRiches/DiamondRichesServerAdapter.ts`;
view `src/games/diamondRiches/DiamondRichesView.tsx`.
Companion: [diamond-riches-stress-test.md](diamond-riches-stress-test.md).

**Audit framework reused from** [`nv-gaming-audit.md`](nv-gaming-audit.md) (Triple Sevens audit) — same NGCB / Tech Standards / GLI-11 row set, same verdicts.

---

## ⚠️ Caveats — read first

All three preamble caveats from the Triple Sevens audit still apply verbatim
and aren't re-derived here: (a) this is engineering feedback, not legal
certification; (b) NGCB rules only legally bind real-money play in NV-licensed
venues; (c) Diamond Riches is a web React+Postgres prototype, not a
submittable EGM. See `nv-gaming-audit.md` §⚠️ for full text.

---

## 1. Executive summary

| Verdict | Count |
|---|---|
| ✅ Pass | 9 |
| ⚠️ Concern | 4 |
| ❌ Fail | 6 |
| ➖ N/A or unresolved | 5 |
| **Total requirements audited** | **24** |

**Bottom line.** The server-side RNG and bet-flow plumbing are materially
better than Triple Sevens (CSPRNG with rejection sampling, single
authoritative wallet update, idempotent replay on `spin_id`). **But the math
is broken:** measured RTP is ~144.6%, ~50 pp above the 95% design target
(see stress report). Two clear bugs (paytable stub, WILD-counted-as-SCATTER)
explain it. Until those are fixed, this game cannot ship as a real-money
device under any jurisdiction.

---

## 2. Mechanic-by-mechanic walkthrough

### 2.1 Base game

- 5 reels × 3 rows; reel strips from `luxury_config.base_outer` (cols 1, 5)
  and `base_inner` (cols 2, 3, 4); strip length 34 (server constant
  in `_luxury_spin_reels`).
- Each spin: per-reel stop drawn by `_csprng_uint(34)` (uniform CSPRNG with
  rejection sampling); visible window is `[stop, stop+1, stop+2] mod 34`.
- Bet validation in `play_diamond` (around lines for `v_line_count` and
  `v_line_bet`): `line_count ∈ [1, 20]`, `line_bet ∈ {1, 2, 3, 5, 10, 20}`,
  `total = line_bet × line_count ≤ public.games.max_bet_cents` (400 = $4.00).
- Bet is debited via `_apply_bet` (drains free-play first, then regular).
- 20 paylines defined in `luxury_config.paylines`.

### 2.2 Symbol set & paytable

Server pins five symbol indices and leaves the rest unnamed:

| Index | Role |
|------:|------|
| 0     | BLANK (excluded from line eval & trigger count) |
| 10    | CAR (5-of-a-kind = ×1 line_bet) |
| 12    | JET (5-of-a-kind = ×3 line_bet; also fallback "lead" for a WILD-led line) |
| 13    | WILD (substitutes for any line lead; **also counted in scatter total**) |
| 14    | SCATTER (3+ anywhere → ×1 total_bet) |
| 1–9, 11 | unnamed payable symbols — `_luxury_line_mult` returns 0 for every match count |

`_luxury_line_mult`:
```sql
case
  when p_count = 5 and p_symbol = 12 then 3   -- JET
  when p_count = 5 and p_symbol = 10 then 1   -- CAR
  else 0
end;
```

That's the **entire** line paytable. No 3-of-a-kind, no 4-of-a-kind, no
other symbol. Concern: this is clearly placeholder, not designed.

### 2.3 WILD behavior

- Substitutes inside a line run (`_luxury_evaluate` — `s = v_lead` or
  `s = 13` extends the run; `wild_used` flag doubles the line win).
- A line whose left-anchor is WILD with no other payable symbol pays as JET
  (server: `if v_lead is null and v_symbols[1] = 13 then v_lead := 12;`).
- **Counted in the scatter trigger total** — see §2.5 below. This is the
  central RTP bug.

### 2.4 Scatter pay

- Counts all cells where `grid[c] = SCATTER (14) OR WILD (13)`.
- 3+ pays `total_bet × 1`. No 4+/5+ tiered payout.
- Pays anywhere — no line dependency.

### 2.5 Bonus trigger & free spins

- 3+ "trigger" cells (SCATTER **or** WILD) → enter bonus phase.
- `play_diamond` inserts a `game_sessions` row with `phase = 'bonus'`,
  `free_spins_remaining = 10`, and locks in the trigger bet
  (`bonus_line_bet`, `bonus_line_count`).
- During bonus, spins use `free_outer` / `free_inner` reel sets.
- Bonus spins **do not debit the wallet** — meta records `bet_cents = 0`.
- Each bonus spin re-evaluates with the trigger bet for line/scatter values.
- Diamond-collection multiplier: per spin, count WILDs (server symbol 13)
  appearing on inner reels (columns 2, 3, 4); cap at 5 total per session.
  Multiplier applied = `2 + min(diamonds, 5)`, i.e. 2× → 7×.
- `spin_win = base_win × multiplier`.
- Retrigger: 3+ trigger cells during a bonus spin adds another 10 free spins.
- Free spins remaining decrements by 1 each bonus spin; session resolves when
  it hits 0.
- Bonus rolls jackpots once per bonus spin at the trigger bet (so a long
  bonus chain effectively rolls jackpot many times — the stress report
  accounts for this).

### 2.6 Jackpot tiers

- `jackpot_config`:
  | tier   | contribution_bps | trigger_per_million | label |
  |--------|-----------------:|--------------------:|-------|
  | fever1 | 100              | 20                  | FEVER 1 |
  | fever2 | 50               | 100                 | FEVER 2 |
  | fever3 | 30               | 400                 | FEVER 3 |
- Triggered by `_roll_jackpot_trigger`: per-tier scaled odds =
  `trigger_per_million × bet / max_bet`, then a single `_csprng_uint(1e6)` roll.
- Server pays the live meter amount, then resets the meter to `seed_cents`.
- Per-bet contribution: `bet × contribution_bps / 10000`.

### 2.7 Wallet flow

- Bet: `_apply_bet(user, total_bet)` → drains `free_play_cents` first, then
  `balance_cents`; refuses if combined funds < bet.
- Wins (including jackpots): `_credit_win(user, total_win, 'regular')` —
  credited to regular balance only.
- `game_events` row written with `bet_cents`, `win_cents`,
  `balance_after_cents`, and `meta` carrying `fp_debited_cents`,
  `regular_debited_cents`, jackpot info, grid, winning_lines, etc.
- `play_sessions.loss_cents` incremented by `(bet − win)` per spin via
  `_apply_spin_to_play_session`; session auto-closes when
  `loss_cents ≥ max_loss_cents`.
- Idempotency: `play_diamond` checks for a pre-existing `game_events` row
  with the same `(user_id, spin_id)` and short-circuits with the cached
  result.

---

## 3. Fairness

### RNG source

- Server: `_csprng_uint` uses `extensions.gen_random_bytes(4)` (pgcrypto on
  Postgres, backed by the OS CSPRNG) plus rejection sampling against the
  `2^32 / max × max` cutoff to remove modulo bias. **This is materially
  better than Triple Sevens' Mersenne-Twister-with-hardcoded-seed.**
- Seed handling: no app-level seed at all — every roll pulls four fresh
  bytes from the OS CSPRNG.
- Cycle rate: rolls happen only on spin, not free-running between spins
  (same gap as Triple Sevens — see Concern row 3 below).
- Modulo bias: explicitly removed via rejection sampling
  (`_csprng_uint` lines: `v_cutoff := (4294967296 / p_max) * p_max; loop
  ... exit when v_val < v_cutoff;`).

### Determinism check

- `_luxury_spin_reels` is declared `LANGUAGE plpgsql` with **no** `IMMUTABLE`
  marker (correct — it depends on RNG side-effects). `_luxury_evaluate` is
  correctly `IMMUTABLE`.
- No precomputed result table, no "draw for future play."
- Replay protection: identical `(user_id, spin_id)` returns the same row
  without re-rolling — required for idempotent retry.

---

## 4. Paytable accuracy

- Public paytable shown to the player (`DiamondRichesView` paytable modal)
  lists multiple named symbols with implied multipliers. **The server
  honors only JET-5 and CAR-5.** Every other named symbol pays nothing.
  ❌ This is a player-trust failure independent of RTP — the screen
  promises pays the engine never delivers.
- No 3-of-a-kind or 4-of-a-kind payouts at all.
- Scatter pays a single tier (3+ = ×1 total_bet). No 4+/5+ steps.
- Jackpot amounts: server pays the live `jackpot_meters.amount_cents` and
  resets to `seed_cents`. The seed values aren't visible to the player on
  the cabinet today (no on-cabinet jackpot meter — only the per-spin
  result populates the `jackpot_amount_cents` field).

---

## 5. Boundary cases

| Case | Behavior | Risk |
|------|----------|------|
| Max bet ($4.00) | Bet validated against `games.max_bet_cents = 400`. Pass. | OK |
| Sub-min bet | `_apply_bet` raises 22023 if line_count/line_bet out of range. Pass. | OK |
| Insufficient funds | `_apply_bet` raises `53100` before grid is rolled. Pass. | OK |
| Concurrent spins on same wallet | `_apply_bet` does `for update` on the wallet row → serialized. Pass. | OK |
| Bonus retrigger storm | Each retrigger adds 10 free spins; no cap. Verified in stress: 186,521 retriggers / 1M base = ~18% retrigger rate. Bonus chains can run unbounded in principle. | ⚠️ Concern — no max-free-spin cap |
| Jackpot during bonus | Each bonus spin rolls jackpot at the trigger bet. Stress shows ~4.9× the base-spin jackpot rate over a session. Server's design (multiple rolls per bonus chain) is intentional but increases volatility. | ⚠️ Concern |
| Self-exclusion | `play_diamond` calls `_assert_not_self_excluded` before each spin. Pass. | OK |
| Daily loss limit | `play_diamond` calls `_assert_under_daily_loss` per spin. Pass. | OK |
| Session loss cap | `_apply_spin_to_play_session` closes the play session when `loss_cents ≥ max_loss_cents`. Pass. | OK |
| Idempotency | Pre-existing `(user_id, spin_id)` returns cached result without re-rolling. Pass. | OK |

---

## 6. NGCB / Tech Standards / GLI-11 — per-row verdicts

(Same row set as Triple Sevens audit; references unchanged.)

| # | Requirement | Reference | Game state | Verdict | Notes |
|---|---|---|---|---|---|
| 1 | Min 75% theoretical RTP per wager | NV Reg 14.040(1)(a) | Designed 95%, measured 144.6%. *Over* the floor — but the spec mismatch itself is a Fail because RTP cannot be both 95% and 144%. | ❌ **Fail** — RTP not certifiable until the math matches the spec. See [diamond-riches-stress-test.md](diamond-riches-stress-test.md). |
| 2 | No static RNG seed | Tech Standards §RNG | Server `_csprng_uint` reads four fresh bytes from `gen_random_bytes` per roll. No app seed. | ✅ Pass |
| 3 | RNG cycles continuously ≥100 Hz idle | Tech Standards §RNG | RNG only fires at spin time. Same gap as Triple Sevens. | ❌ Fail |
| 4 | RNG must not pre-draw future plays | Tech Standards §RNG | Bytes drawn inline per spin. | ✅ Pass |
| 5 | No modulo bias | Tech Standards §RNG | `_csprng_uint` rejection-samples via cutoff. | ✅ Pass — **better than Triple Sevens** |
| 6 | Outcomes server-authoritative | NV Reg 14 / Tech Std §EGM | `play_diamond` is the sole credit/debit path; client adapter has no outcome logic. | ✅ Pass |
| 7 | Idempotent spin retry | Tech Std §EGM (disputed-spin) | `(user_id, spin_id)` short-circuit. | ✅ Pass |
| 8 | Audit/accounting trail | NV Reg 6 / MICS Slots | `game_events` row per spin, `daily_stats` rollup, `wallet_grants` for admin adjustments. Concern: no signed-statement export, no W-2G handpay flow. | ⚠️ Concern |
| 9 | Wallet integrity under concurrency | Tech Std §EGM | `for update` lock on `wallets` row inside `_apply_bet`. | ✅ Pass |
| 10 | Power-loss recovery | NV Reg 14.040(2) | Spin idempotency covers double-submit; no `play_sessions.phase = 'in_flight'` recovery layer for partial-credit scenarios. | ⚠️ Concern |
| 11 | Self-exclusion enforcement | NV Reg 14 — RG | `_assert_not_self_excluded` called per spin. | ✅ Pass |
| 12 | Daily loss limit | NV Reg 14 — RG | `_assert_under_daily_loss` called per spin. | ✅ Pass |
| 13 | Session loss cap | NV Reg 14 — RG | `play_sessions.max_loss_cents` + auto-close on hit. | ✅ Pass |
| 14 | Paytable accuracy (display matches engine) | Tech Std §Display | View paytable modal advertises symbols the engine pays nothing for. | ❌ Fail — `DiamondRichesView.tsx` paytable modal lists named symbols; `_luxury_line_mult` only pays JET-5 and CAR-5. |
| 15 | On-demand paytable | Tech Std §Display | Paytable button always available. | ✅ Pass |
| 16 | Bet denomination plate | Tech Std §Display | Bet selector visible; no separate denomination plate. Same as Triple Sevens. | ⚠️ Concern |
| 17 | Game ID / build string visible | Tech Std §Display | None visible on Diamond cabinet. Same gap as Triple Sevens. | ❌ Fail |
| 18 | No LDW ("loss disguised as win") | Tech Std §Display (UK/AU guidance) | Win sound/celebration fires on any positive win, even if < bet. No `win >= bet` gate. | ❌ Fail |
| 19 | Tilt / malfunction handling | Tech Std §EGM | No tilt state, no error logging hook visible. | ❌ Fail |
| 20 | Disputed-spin re-creation | Tech Std §EGM | `game_events.meta` carries grid + winning_lines + seed_hash; sufficient to reconstruct. | ✅ Pass |
| 21 | Inter-casino linked progressives | NV Reg 14 ICLS | Jackpot meters are single-cabinet (one Supabase table per project); not networked. | ➖ N/A (single-cabinet only) |
| 22 | Player ID/age verification | NV Reg 5A (interactive) | Out of scope of the audited surface. | ➖ N/A |
| 23 | Geolocation enforcement | NV Reg 5A | Out of scope. | ➖ N/A |
| 24 | Anti-cheating: client-server desync | Tech Std §EGM | Client adapter trusts the server response; no outcome reroll on client. | ✅ Pass |

Totals: 9 Pass · 4 Concern · 6 Fail · 5 N/A.

---

## 7. Critical gaps (with file:line citations)

1. **`_luxury_line_mult` is a 2-symbol stub** — paytable is missing for 12 of
   14 symbols. The displayed paytable claims pays the engine doesn't deliver.
   `_luxury_line_mult` source (Postgres function definition).
   **Block-fix before any real-money play.**

2. **WILD counted in scatter total in `_luxury_evaluate`** (`if v_cell = 14
   or v_cell = 13 then v_scatter_count := v_scatter_count + 1;`). At ~9% WILD
   density on inner reels this forces the bonus to fire at ~1-in-5 spins and
   blows RTP to 144.6%. Either:
   - drop WILD from the trigger count (compute scatter and WILD separately,
     trigger bonus only on `scatter_count >= 3`), or
   - keep the rule but rebuild the strips so combined `(SCATTER|WILD)` density
     yields a target trigger rate.

3. **Bonus retrigger has no cap.** `play_diamond` adds `FREE_SPINS_AWARDED`
   each time `v_retriggered` is true in bonus mode. Theoretical worst case
   is unbounded; stress measured ~18% retrigger rate per bonus session, with
   no game-side ceiling on chained free spins. Add a per-session free-spin
   cap (e.g. 500) and surface it in the paytable.

4. **LDW (loss disguised as win)** —
   [`DiamondRichesView.tsx` win-celebration path] fires for any `total_win > 0`.
   Add `total_win >= total_bet` gate, mirroring the Quick Win recommended for
   Triple Sevens.

5. **No game ID / build string on the cabinet** —
   `DiamondRichesView.tsx` chrome bar (the `chrome-bar` toolbar)
   carries only EXIT + paytable buttons. Adds visible commit SHA or version.

6. **RNG free-run (≥100 Hz idle)** — `_csprng_uint` is invoked only at spin
   time. To satisfy NV Tech Std cycling-rate, the underlying RNG would have
   to cycle continuously. Same gap as Triple Sevens; closes only with an
   integration-level change.

---

## 8. Comparison to Triple Sevens audit

Same row set, different outcomes:

| Area | Triple Sevens | Diamond Riches | Note |
|------|---------------|----------------|------|
| RNG quality | ❌ Fail (MT, static seed, `% n` bias) | ✅ Pass (CSPRNG, rejection sampling, no app seed) | **Diamond is materially better** — the server engine rolled this back to first principles. |
| RTP within design band | ✅ Pass (92.6% designed ≈ 92.2% observed) | ❌ Fail (95% designed, 144.6% observed) | Diamond's math is broken. |
| Paytable accuracy | ✅ Pass | ❌ Fail (line paytable is a 2-symbol stub) | Triple Sevens's paytable is complete; Diamond's isn't. |
| Server-authoritative | ✅ Pass (via play_triple7 + adapter) | ✅ Pass (via play_diamond + adapter) | Both ship the same architecture. |
| Idempotency | ✅ Pass | ✅ Pass | Same `(user_id, spin_id)` short-circuit. |
| LDW | ❌ Fail | ❌ Fail | Same issue in both views; same one-line fix. |
| Tilt/malfunction handling | ❌ Fail | ❌ Fail | Platform gap. |
| Audit trail | ⚠️ Concern | ⚠️ Concern | Same gap. |
| Bonus / free spins | N/A (no bonus mode) | ⚠️ Concern — uncapped retrigger | Triple Sevens has no bonus phase, so no comparable risk. |

**Net assessment.** Diamond Riches's *platform* (RNG, wallet, server flow) is
in better shape than Triple Sevens — it benefits from the same migration
cycle that hardened FP credits + idempotency. The *math* is worse: the
paytable is incomplete and the bonus-trigger rule is broken, so RTP is wildly
out of band. The fixes are surgical (one CASE in `_luxury_line_mult`, one
boolean in `_luxury_evaluate`) but cannot ship without an updated
stress-test pass.

---

## 9. Quick wins (non-blocking)

1. **Split SCATTER and WILD counters** in `_luxury_evaluate` — fix the bonus
   trigger and re-run the stress harness.
2. **Fill out `_luxury_line_mult`** with the paytable the View modal already
   advertises. Re-run RTP to retarget 95%.
3. **`win >= bet` gate** on the celebration / WIN audio in
   `DiamondRichesView.tsx`. Same one-line fix as Triple Sevens Quick Win #4.
4. **Cap bonus retriggers** at e.g. 500 free spins per chain.
5. **Game ID / build string** on the cabinet (same as Triple Sevens #7).
6. **Surface live jackpot meters** on the cabinet so players can see
   `jackpot_meters.amount_cents` per tier — common slot UX and required for
   any progressive plate that claims to "build."

---

## 10. Out-of-scope / unresolved

Same four items as `nv-gaming-audit.md` §5: real-money vs social, distribution
channel, jurisdiction, single-player vs networked. Resolution unchanged.

## Sources

Same as `nv-gaming-audit.md` §Sources. No new citations added in this audit.
