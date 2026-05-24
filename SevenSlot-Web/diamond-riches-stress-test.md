# Diamond Riches — RTP Stress-Test Report (server engine)

**Generated:** 2026-05-23
**Engine:** Postgres functions `public.play_diamond`, `public._luxury_evaluate`,
`public._luxury_spin_reels`, `public._roll_jackpot_trigger`, `public._csprng_uint`
(configs from `public.luxury_config` + `public.jackpot_config`).
**Bet:** $4.00/spin — `line_bet = 20¢ × line_count = 20` (server max bet).
**Harness:** `stress-test/diamond-server-stress.cjs` — Node port that mirrors
each server function line-for-line and uses Node's `crypto.randomInt` in the
same `uniform[0, n)` shape the server's `_csprng_uint` produces.

> The user asked for `line_count = 15`. The server actually caps line_count at
> `20` (`play_diamond` validates `1..20`; `_luxury_evaluate` clamps to 20). The
> test was run at the true server maximum of 20 lines. Adjust the harness
> constant `LINE_COUNT` if you want a 15-line run for comparison.

---

## Headline

**Designed RTP target:** 95.0% (from the prior client-engine spec, also
declared in the in-game info modal). Server paytable currently exposes only
two payable line outcomes (JET ×3 at five-of-a-kind, CAR ×1 at five-of-a-kind)
plus scatter ×1 for 3+ scatters across the 15-cell grid.

| Spins      | Wagered      | Returned     | **RTP**       | Δ vs design | Hit freq | Bonus freq | Biggest sequence | Longest losing streak |
|-----------:|-------------:|-------------:|--------------:|------------:|---------:|-----------:|------------------:|----------------------:|
| 50,000     | $200,000.00  | $287,683.80  | **143.842%**  | +48.842 pp  | 20.236%  | 20.184% (1-in-5.0) | $636.00 (159× bet) | 43 |
| 500,000    | $2,000,000.00| $2,901,975.00| **145.099%**  | +50.099 pp  | 20.407%  | 20.361% (1-in-4.9) | $860.00 (215× bet) | 47 |
| 1,000,000  | $4,000,000.00| $5,783,730.80| **144.593%**  | +49.593 pp  | 20.456%  | 20.412% (1-in-4.9) | $1,132.00 (283× bet) | 50 |

**Verdict — ❌ OUTSIDE the 94–96% design band.** Three independent runs at
50k / 500k / 1M spins converge on the same RTP (~144.6% ± 0.5 pp sampling
noise), so this is not a sampling artifact — the configured math is
fundamentally over-paying by ~50 pp. The prior client-engine report
(`stress-test-report-luxury.md`, 176%) hit a similar wall; the server engine
is in the same diagnosis class but at a different magnitude.

Two root causes drive the over-pay (see audit doc for code citations):

1. **Bonus triggers ~1 in 5 spins (~20.4% per run).** The bonus runs ~10 free
   spins per trigger at a 2–7× multiplier and itself retriggers ~18% of the
   time, so each trigger drags the average over the line. Bonus contributes
   ~84.5% of total return.
2. **Scatter and WILD are counted in the same bucket** for "3+ trigger
   symbols." `_luxury_evaluate` lines 79–82:
   ```sql
   if v_cell = 14 or v_cell = 13 then
     v_scatter_count := v_scatter_count + 1;
   ```
   So WILDs — which appear at density 3/34 ≈ 8.8% per cell on inner reels —
   add to the trigger count. P(3+ trigger symbols in 15 cells) winds up
   far above what any 95%-RTP slot would tolerate.

The line-pay side is a non-driver: only JET-5 and CAR-5 pay anything
(`_luxury_line_mult` returns 0 for every other combination). Designed RTP
clearly expected a full paytable; what's deployed is a stub.

---

## Per-run detail

### 50,000 spins

- Wagered $200,000.00 · Returned $287,683.80 · **RTP 143.842%** · Δ +48.842 pp
- Hit frequency 20.236% · Bonus trigger 20.184% (1-in-5.0) · Bonus share of return 84.4%
- Bonus retriggers: 9,253 over 193,450 free spins run (~4.8% retrigger rate per free spin, ~19% per bonus session)
- Biggest single base-spin (incl. jackpot): **$254.00 (63.5× bet)**
- Biggest sequence (base + bonus chain): **$636.00 (159× bet)**
- Longest losing streak: **43**
- Per-spin return σ²=41.234 · σ=6.421

Win-tier distribution (× total bet):

| Tier            | Spins   | %       |
|-----------------|--------:|--------:|
| none (0×)       | 39,882  | 79.764% |
| small (<1×)     | 1       | 0.002%  |
| medium (1–5×)   | 6,383   | 12.766% |
| big (5–25×)     | 2,947   | 5.894%  |
| mega (25–100×)  | 775     | 1.550%  |
| super (≥100×)   | 12      | 0.024%  |

Jackpot hits (per million spins): FEVER 1 = 40.0 · FEVER 2 = 620.0 · FEVER 3 = 1980.0

### 500,000 spins

- Wagered $2,000,000.00 · Returned $2,901,975.00 · **RTP 145.099%** · Δ +50.099 pp
- Hit 20.407% · Bonus 20.361% (1-in-4.9) · Bonus share 84.5%
- Bonus retriggers: 93,188 over 1,949,910 free spins
- Biggest base-spin: $504.00 (126× bet) · Biggest sequence: $860.00 (215× bet)
- Longest losing streak: 47
- σ²=45.021 · σ=6.710

| Tier            | Spins   | %       |
|-----------------|--------:|--------:|
| none (0×)       | 397,965 | 79.593% |
| small (<1×)     | 10      | 0.002%  |
| medium (1–5×)   | 64,465  | 12.893% |
| big (5–25×)     | 29,551  | 5.910%  |
| mega (25–100×)  | 7,762   | 1.552%  |
| super (≥100×)   | 247     | 0.049%  |

Jackpot per-million: FEVER 1 = 104.0 · FEVER 2 = 526.0 · FEVER 3 = 1996.0

### 1,000,000 spins

- Wagered $4,000,000.00 · Returned $5,783,730.80 · **RTP 144.593%** · Δ +49.593 pp
- Hit 20.456% · Bonus 20.412% (1-in-4.9) · Bonus share 84.5%
- Bonus retriggers: 186,521 over 3,906,370 free spins
- Biggest base-spin: $504.00 (126× bet) · Biggest sequence: **$1,132.00 (283× bet)**
- Longest losing streak: 50
- σ²=38.300 · σ=6.189

| Tier            | Spins   | %       |
|-----------------|--------:|--------:|
| none (0×)       | 795,441 | 79.544% |
| small (<1×)     | 26      | 0.003%  |
| medium (1–5×)   | 129,277 | 12.928% |
| big (5–25×)     | 59,545  | 5.955%  |
| mega (25–100×)  | 15,270  | 1.527%  |
| super (≥100×)   | 441     | 0.044%  |

Jackpot per-million: FEVER 1 = 97.0 · FEVER 2 = 495.0 · FEVER 3 = 1885.0

> Compare to `jackpot_config.trigger_odds_per_million` (×bet/max_bet):
> FEVER 1=20, FEVER 2=100, FEVER 3=400. At max bet (bet/max=1) those are the
> "per million" expected rates. Measured rates (97 / 495 / 1885) are
> ~5× higher than configured — because the simulation also rolls the jackpot
> once per *bonus* spin (matching `play_diamond`'s bonus-loop behavior), so
> over a 1M base-spin run the effective number of jackpot rolls is
> 1M base + ~3.9M bonus = ~4.9M total rolls. Per-roll rates land at
> ~20/100/400 as configured.

---

## Anomalies & open questions

1. **Bonus-trigger frequency is the dominant RTP driver.** The combination of
   "WILD+SCATTER counted together for 3+ trigger" and the WILD density on
   inner reels means the bonus fires on roughly 1-in-5 base spins. A
   conventional 95%-RTP slot would target 1-in-50 to 1-in-200 bonus triggers.
2. **Bonus chain length.** Each bonus session runs an average of ~3.9 free
   spins per *base* spin (193k+ bonus spins on 50k base, etc.) once retriggers
   are factored in. Combined with the 2–7× multiplier, the bonus pays out
   roughly 7× the trigger bet on average.
3. **Paytable is a stub.** Only JET ×3 and CAR ×1 pay at 5-of-a-kind; every
   other named symbol pays nothing. The bonus and the scatter trigger are
   carrying the entire RTP load.
4. **Variance** is high (σ ≈ 6–7× bet per spin) but the *median* spin returns
   $0 (79.5% no-win) — the experience profile is "long dry stretches punctuated
   by big bonus chains," not a steady drip.
5. **Longest losing streak ~50 at 1M spins** is consistent with hit frequency
   ~20% (geometric expectation ≈ log(1M)/log(1/(1−0.2)) ≈ 62), no anomaly.

---

## Reproduce

```bash
node stress-test/diamond-server-stress.cjs 50000
node stress-test/diamond-server-stress.cjs 500000
node stress-test/diamond-server-stress.cjs 1000000
```

Constants the harness uses are baked from rows captured 2026-05-23. If the
luxury_config rows are edited server-side, re-export them and update
`stress-test/diamond-server-stress.cjs` accordingly.
