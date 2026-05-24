# Diamond Riches — Source vs. Implementation Comparison

**Date:** 2026-05-23
**Source image:** user-uploaded composite of 9 help screens from the original
(Pot-O-Gold / Diamond Riches) cabinet.
**Implementation:** server functions `public.play_diamond`,
`public._luxury_evaluate`, `public._luxury_line_mult`, `public._luxury_spin_reels`,
`public.luxury_config` rows, plus the client adapter
`src/games/diamondRiches/DiamondRichesServerAdapter.ts` and view
`src/games/diamondRiches/DiamondRichesView.tsx`.

---

## 1. Source rules extracted from the image

(OCR confidence high where noted; **flagged** items need a clearer photo.)

### Free Spin Bonus (panel: middle row left and top-left help screen)

- **Trigger:** 3 or more scattered *diamond* symbols on the base reels.
- **Award:** **10 free spins** at an opening multiplier of **2×**.
- **Diamond collection:** During free spins, diamonds collected "below the
  reels." Each diamond collected increases the multiplier by **1** for all
  remaining free spins.
- **No retrigger:** "The Free Spin Bonus can not be re-triggered as there
  are no [diamond] symbols in the free spin bonus round." — i.e. the
  free-spin reel set deliberately contains NO scatter symbols. (The OCR
  text continues "If 3 or more scattered [diamond] appear on a single
  spin during the free spins..." but is cut off; the preceding sentence
  is unambiguous that retriggers don't exist.)
- **Bet locking:** "During the free spins the per line bet and the active
  pay lines remain the same as the spin that triggered the bonus."
- **Reel set:** "During the free spins an alternate set of reels is used.
  All payable winning combinations for these reels are identical to the
  base game."

### Diamond Awards table (panels: top-left + middle-left, continuous table)

| Diamonds collected | Multiplier |
|-------------------:|-----------:|
| 0                  | 2          |
| 1                  | 3          |
| 2                  | 4          |
| 3                  | 5          |
| 4                  | 6          |
| 5                  | 7          |
| 6                  | 8          |
| 7                  | 9          |
| 8                  | 10         |
| 9                  | 11         |
| 10                 | 12         |
| 11                 | 13         |
| 12                 | 14         |
| 13                 | 15         |
| 14                 | 16         |
| 15                 | 17         |
| 16                 | 18         |
| 17                 | 19         |
| 18                 | 20         |
| 19                 | 21         |
| 20                 | 22         |
| 21                 | 23         |
| 22                 | 24         |
| 23                 | 25         |
| 24                 | 26         |
| 25                 | 27         |
| 26                 | 28         |
| 27                 | 29         |

So the rule is plainly **multiplier = diamonds + 2**, with **no cap** in
the visible table (or a cap well beyond 27).

### Wild symbol (panel: middle-right)

- "[wild] appearing on reels 2, 3, and 4, are wild for all symbols."
- "If one or more [wild] substitutes in a pay, that pay is doubled."

### Lines (panel: bottom-left "HOW TO PLAY")

- "Select the amount of lines from **1 – 15** using the top row of
  mechanical buttons."
- "Win lines: 3 horizontal or V or inverted V across the 5 reels."
- Additional paylines also contribute; diagrams show varied zig-zag
  patterns. Total **15 paylines** available.

### Paytable — line + scatter pays (panels: top row, top-right corner)

**⚠️ OCR partial — values visible but per-symbol attribution is not fully
confident at this resolution.** Discernible 5-of-a-kind multipliers I
could read with reasonable confidence:

- A high-tier symbol pays **200** at 5-of-a-kind
- Another high symbol pays **150**
- Then **120**, **100**, **60**, **30**, **30** for the lower tiers
- Plus a "Coin" pays as a scatter at **100 / 15 / 2** for some
  (count tiers)
- A high-tier symbol shows 5-of-a-kind = 100, 3-of-a-kind = 20, and
  something at 5 (probably 2-of-a-kind for the top symbol only)

Rule text below the paytable (reads cleanly):
> "Only highest multitied paid per winning combination. All scatter pays
> are multiplied by the total bet. All line pays are multiplied by the
> line bet. Winning combinations pay left to right only. Wins must occur
> on adjacent reels, beginning with the leftmost reel, except scatters
> which pay any."

So the line-pay multiplier model matches our server (pay × line_bet,
left-to-right adjacency required, scatter × total_bet anywhere).

### Progressive / jackpot

**Not visible in the 9 panels OCR'd.** There may be a separate jackpot
screen in the source that wasn't included in this composite. The current
server has FEVER 1 / 2 / 3 progressives baked in via `jackpot_config`,
which is an added mechanic vs. what the source documents.

---

## 2. Current implementation summary

(File:line refs from this codebase.)

- **Free-spin trigger:** `_luxury_evaluate` counts true SCATTERs (symbol
  14) across the 15-cell grid; 3+ triggers `v_bonus_triggered`. ✓ source-aligned (after the WILD-not-scatter bug fix).
- **Free spins awarded:** Locked at **10** in `play_diamond`'s
  `jsonb_build_object('free_spins_remaining', 10, …)`. ✓
- **Free-spin retrigger:** Server allows retrigger (3+ scatters during
  bonus add 10 free spins, capped at 50 total per session). ✗ — source
  explicitly says NO retrigger because the free-spin reel set has no
  scatter symbols, but our `free_outer` / `free_inner` configs *do*
  contain SCATTER (14) cells.
- **Bonus base multiplier:** `v_base_mult int := 2` in `play_diamond`.
  ✓ — matches source's "10 free spins are awarded at 2x" opening.
- **Diamond collection:** Iterates inner reels (2, 3, 4), increments
  `v_diamonds` for every WILD (13) found. ⚠ — source says diamonds
  collect, but the *symbol* that gets collected is the **diamond /
  scatter** graphic, not the WILD. Server is using WILD as the
  collectible. This is a drift in collectible identity.
- **Diamond multiplier formula:** `v_multiplier := least(v_base_mult +
  v_diamonds, v_base_mult + v_max_diamonds)` with `v_max_diamonds := 5`.
  Source says **multiplier = diamonds + 2** with no visible cap up to
  27. So server caps at 5 diamonds → 7× max; source goes to at least
  27 diamonds → 29×.
- **Wild symbol:** `_luxury_evaluate` treats symbol 13 as a substitute
  in the line run; if `v_wild_used` flag is true, `v_win := v_win * 2`.
  ✓ matches "if one or more wild substitutes in a pay, that pay is
  doubled."
- **Wild placement:** Server has WILD on inner strips only (cols 2, 3,
  4 in `base_inner`); outer strips have no WILD originally — but iter 4
  of the RTP tune **added 1 WILD to `base_outer`** (cell 15), which is
  ✗ a drift from the source which says wilds only on reels 2, 3, 4.
- **Line count:** Server validates `line_count ∈ [1, 15]` (post-cap
  migration). ✓ matches "1 – 15".
- **Total paylines defined:** `luxury_config.paylines` has 20 entries,
  but only the first `least(active, 20)` are evaluated. ⚠ — source has
  15 paylines total; the 5 extra entries are unreachable in practice
  but should be trimmed for fidelity.
- **Paytable values:** `_luxury_line_mult` returns per-symbol multipliers
  for 3/4/5-of-a-kind. Current iter-4 values are commercial-tune values,
  not source values. The source paytable couldn't be cleanly OCR'd at
  the supplied resolution; ⚠ flagged as Drift (likely) but unverified.
- **Scatter pay:** `_luxury_evaluate` pays `total_bet × 4` for any
  3+ scatters. Source paytable suggests scatter pays at a tiered
  3/4/5-of-a-kind structure (e.g. coin scatter 2 / 15 / 100), not a
  flat 3+ multiplier. ✗ — server uses a single tier, source uses three.
- **Jackpots:** Server has FEVER 1/2/3 progressives rolled per spin.
  ➕ Extra — not documented in the source panels.

---

## 3. Differences table

| # | Rule | Source | Current implementation | Verdict |
|---|------|--------|------------------------|---------|
| 1 | Free-spin trigger | 3+ scatter (diamond) symbols | 3+ scatter (symbol 14) | ✅ Match |
| 2 | Free spins awarded | 10 | 10 | ✅ Match |
| 3 | Opening bonus multiplier | 2× | 2× | ✅ Match |
| 4 | Retrigger during free spins | **None** (no scatters on free reels) | Allowed (3+ scatters → +10, capped at 50 total) | ❌ Drift |
| 5 | Free-reel scatter density | Zero (per source text) | `free_outer` has 2 SCATTERs, `free_inner` has 1 | ❌ Drift |
| 6 | Diamond collectible identity | "Diamond" graphic (scatter-like) collected below reels | WILD (symbol 13) on inner reels | ❌ Drift |
| 7 | Diamond → multiplier formula | `diamonds + 2`, no cap visible up to 27+ | `2 + min(diamonds, 5)`, cap at 5 diamonds | ❌ Drift |
| 8 | Wild reels | Reels 2, 3, 4 only | Inner (2, 3, 4) **+ one WILD added to outer** in iter 4 | ❌ Drift (added in tuning) |
| 9 | Wild doubles pay | Yes | Yes (`v_wild_used` doubles `v_win`) | ✅ Match |
| 10 | Line count selectable | 1 – 15 | 1 – 15 (post-bet-cap) | ✅ Match |
| 11 | Total paylines defined | 15 | 20 (extra 5 unreachable) | ⚠ Extra (harmless but tidy) |
| 12 | Bet locked during bonus | Yes (line bet + line count) | Yes | ✅ Match |
| 13 | Free-reel pay table identical to base | Yes | Yes (`_luxury_evaluate` reused) | ✅ Match |
| 14 | Line pays | Per source paytable (e.g. one symbol 5oak=200) | Tuned commercial defaults from iter 4 | ⚠ Drift (paytable values not source-faithful — OCR insufficient to verify exact numbers) |
| 15 | Scatter pay structure | Tiered 3/4/5-of-a-kind (e.g. 2 / 15 / 100 for the coin-style scatter) | Flat × 4 for any 3+ scatters | ❌ Drift |
| 16 | Progressive jackpots (FEVER 1/2/3) | Not in source panels | Present | ➕ Extra |

Summary: **9 Match · 1 Extra (extra paylines) · 5 Drift · 1 Extra (jackpots)**.

---

## 4. Recommended adjustments (prioritized)

### Must-have for source fidelity

1. **Remove scatter from free-spin reel strips.** Source explicitly says
   "no diamond symbols in the free spin bonus round," which eliminates
   retriggers by construction. Migration: zero out the SCATTER (14)
   cells in `luxury_config.free_outer` and `luxury_config.free_inner`.
   The retrigger code in `play_diamond` then becomes dead — leaving it
   is harmless, but you can also short-circuit it for clarity.
2. **Fix diamond collectible.** Source says players collect the
   *diamond/scatter* graphic during free spins, not WILDs. Change the
   `play_diamond` diamond-counting loop to look for the dedicated
   diamond symbol (would need a new symbol index, OR re-use symbol 14
   SCATTER if the free reels actually drop diamonds without re-triggering
   the bonus). Today's loop counts WILD (13), which is wrong.
3. **Remove the diamond cap.** Source allows multiplier to grow with
   each diamond — no cap visible up to 27. Drop
   `v_max_diamonds := 5` to something much larger (e.g. 50) or remove
   the cap entirely.
4. **Revert the iter-4 base_outer WILD.** Source restricts wilds to
   reels 2, 3, 4 only. Restore base_outer cell 15 from `13` back to a
   non-WILD symbol.
5. **Switch scatter pay to tiered 3/4/5-of-a-kind** (e.g. 2 / 15 / 100,
   pending clearer OCR of the exact numbers). Replace the single
   `paytable_scatter_any3plus` row with three values and update
   `_luxury_evaluate` to look up the right tier by `v_scatter_count`.
6. **Trim `luxury_config.paylines` to 15 rows.** Cosmetic but matches
   source.

### Nice-to-have

7. **Replace `_luxury_line_mult` with the source paytable.** Need a
   clearer image first to assign 200/150/120/100/60/30/30 to specific
   symbols. ⚠ **Flagged — need clearer photo to do this with confidence.**
8. **Re-stress after every fidelity change** — RTP will move.

### Out of scope

9. **Jackpots.** Source doesn't document FEVER 1/2/3. Either trim the
   server's jackpot system or keep it as an explicit "our addition"
   modifier and ensure paytable / help text reflects it.

---

## 5. RTP implications

Current measured RTP is **97.42%** at $1.50/spin (line_count = 15,
line_bet = 10¢). Fidelity changes will move it as follows:

- **(1) Removing scatter from free reels:** kills retriggers entirely.
  Currently 13,941 retriggers / 81,877 sessions ≈ 0.17 per session.
  Bonus avg session length drops from ~12 spins to a flat 10. Expect
  RTP to drop ~3–6 pp (proportional to lost retrigger contribution).
- **(2) Diamond collectible identity:** This redefines what gets
  collected. If diamonds replace WILDs on inner free reels and
  accumulate freely with no cap, the multiplier ramp accelerates much
  faster — could *raise* RTP substantially. Hard to predict without
  re-stressing, but **could swing +15 pp or more** if uncapped.
- **(3) Removing diamond cap (combined with 2):** Compounds the above.
  Late-bonus multipliers up to 29× (vs current cap of 7×) will tail-pump
  the highest payouts.
- **(4) Reverting iter-4 outer WILD:** drops base-game line-extension
  benefit; expect **−2 to −4 pp**.
- **(5) Tiered scatter pay:** Tiers like (2 / 15 / 100) for exact
  3 / 4 / 5 scatters are higher-magnitude at the tail than flat × 4.
  Most events are exactly 3 scatters; at 2 per 3-scatter event, direct
  scatter contribution drops from ~33pp (8.18% × 4) to ~16pp (8.18% × 2).
  Tail 5-scatter pays at 100× would barely register (rare). Expect
  **−10 to −15 pp** on RTP from this change alone.

Combined, the source-fidelity changes will substantially reshape the
RTP curve. **A fresh stress-tune pass is required after applying any
of items 1–5.** Expect to land somewhere in the 75–90% range after
items 1, 4, 5; then lift back up via items 2/3 (uncapped diamonds) +
strip composition; finally re-tune line pays back into 93–97%.

---

## 6. Items flagged for clearer photo

The following need a higher-resolution image to OCR cleanly:

- **Top-row paytable panels** (the 5-of-a-kind payouts per symbol).
  At supplied resolution I can read the *numbers* (200, 150, 120, 100,
  60, 30, 30, plus a scatter tier 2/15/100) but not reliably match
  each number to its symbol icon. A close-up of those two panels
  would let me write the exact `_luxury_line_mult` table.
- **Scatter / "Coin" panel detail** — to confirm the exact 3 / 4 / 5
  scatter pay numbers (I read "100 / 15 / 2" but not in a confident
  left-to-right reading order).
- **Jackpot/progressive screen** if one exists in the source — not
  present in the 9 panels supplied.
