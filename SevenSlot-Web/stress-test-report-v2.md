# Triple Sevens — Stress-Test Report v2 (entropy-seeded RNG)

**Generated:** 2026-05-12T11:07:09.108Z

**RNG path:** production / entropy-derived. Each engine instance constructed with no `rngSeed` argument, triggering `generateEntropySeed()` → `crypto.getRandomValues()` (32-bit fresh entropy per player).
**Bet level:** max bet — 200¢ ($2.00) per spin
**Designed RTP:** 92.6%

### Win tier definitions (same as v1)

| Tier | Range (× total bet) |
|---|---|
| small | (0, 1×] |
| medium | (1×, 10×] |
| big | (10×, 100×] |
| mega | (100×, 1000×] |
| jackpot | > 1000× |

---

## 50,000 spins × 1 player

Spins per player: 50,000  ·  Compute: 174ms

| Metric | Value |
|---|---|
| Total spins | 50,000 |
| Total wagered | $100.00K |
| Total returned | $90.38K |
| Actual RTP | **90.384%** |
| RTP delta vs 92.6% | -2.216 pp |
| Hit frequency | 51.08% |
| Biggest single win | $2.50K (1250× bet) |
| Avg win on winning spin | $3.54 |
| Std dev of per-spin return | $16.07 |
| Longest losing streak | 15 spins |

**Win-tier distribution:**

| Tier | Count | % of all spins |
|---|---|---|
| no-win | 24,459 | 48.92% |
| small | 17,793 | 35.5860% |
| medium | 7,393 | 14.7860% |
| big | 325 | 0.6500% |
| mega | 29 | 0.0580% |
| jackpot | 1 | 0.0020% |

---

## 50,000 spins × 5 players

Spins per player: 10,000  ·  Compute: 151ms

| Metric | Value |
|---|---|
| Total spins | 50,000 |
| Total wagered | $100.00K |
| Total returned | $95.76K |
| Actual RTP | **95.757%** |
| RTP delta vs 92.6% | +3.157 pp |
| Hit frequency | 51.44% |
| Biggest single win | $2.50K (1250× bet) |
| Avg win on winning spin | $3.72 |
| Std dev of per-spin return | $16.43 |
| Longest losing streak | 14 spins |

**Win-tier distribution:**

| Tier | Count | % of all spins |
|---|---|---|
| no-win | 24,278 | 48.56% |
| small | 17,831 | 35.6620% |
| medium | 7,496 | 14.9920% |
| big | 368 | 0.7360% |
| mega | 26 | 0.0520% |
| jackpot | 1 | 0.0020% |

**Per-player RTP:**

- Min: 85.777% · Max: 107.213% · Spread: 21.435 pp

| Player | RTP |
|---|---|
| 1 | 86.880% |
| 2 | 107.213% |
| 3 | 85.777% |
| 4 | 99.708% |
| 5 | 99.208% |

---

## 50,000 spins × 10 players

Spins per player: 5,000  ·  Compute: 155ms

| Metric | Value |
|---|---|
| Total spins | 50,000 |
| Total wagered | $100.00K |
| Total returned | $87.88K |
| Actual RTP | **87.881%** |
| RTP delta vs 92.6% | -4.719 pp |
| Hit frequency | 51.27% |
| Biggest single win | $500.00 (250× bet) |
| Avg win on winning spin | $3.43 |
| Std dev of per-spin return | $11.66 |
| Longest losing streak | 16 spins |

**Win-tier distribution:**

| Tier | Count | % of all spins |
|---|---|---|
| no-win | 24,367 | 48.73% |
| small | 17,922 | 35.8440% |
| medium | 7,359 | 14.7180% |
| big | 320 | 0.6400% |
| mega | 32 | 0.0640% |
| jackpot | 0 | 0.0000% |

**Per-player RTP:**

- Min: 73.265% · Max: 98.858% · Spread: 25.592 pp

| Player | RTP |
|---|---|
| 1 | 91.507% |
| 2 | 82.970% |
| 3 | 94.460% |
| 4 | 89.543% |
| 5 | 92.127% |
| 6 | 83.662% |
| 7 | 98.858% |
| 8 | 73.265% |
| 9 | 81.013% |
| 10 | 91.403% |

---

## 500,000 spins × 1 player

Spins per player: 500,000  ·  Compute: 1501ms

| Metric | Value |
|---|---|
| Total spins | 500,000 |
| Total wagered | $1.00M |
| Total returned | $921.90K |
| Actual RTP | **92.190%** |
| RTP delta vs 92.6% | -0.410 pp |
| Hit frequency | 51.11% |
| Biggest single win | $2.50K (1251× bet) |
| Avg win on winning spin | $3.61 |
| Std dev of per-spin return | $16.25 |
| Longest losing streak | 19 spins |

**Win-tier distribution:**

| Tier | Count | % of all spins |
|---|---|---|
| no-win | 244,459 | 48.89% |
| small | 178,417 | 35.6834% |
| medium | 73,424 | 14.6848% |
| big | 3,374 | 0.6748% |
| mega | 316 | 0.0632% |
| jackpot | 10 | 0.0020% |

---

## 500,000 spins × 5 players

Spins per player: 100,000  ·  Compute: 1515ms

| Metric | Value |
|---|---|
| Total spins | 500,000 |
| Total wagered | $1.00M |
| Total returned | $942.74K |
| Actual RTP | **94.274%** |
| RTP delta vs 92.6% | +1.674 pp |
| Hit frequency | 51.08% |
| Biggest single win | $2.50K (1251× bet) |
| Avg win on winning spin | $3.69 |
| Std dev of per-spin return | $17.22 |
| Longest losing streak | 19 spins |

**Win-tier distribution:**

| Tier | Count | % of all spins |
|---|---|---|
| no-win | 244,596 | 48.92% |
| small | 178,068 | 35.6136% |
| medium | 73,549 | 14.7098% |
| big | 3,437 | 0.6874% |
| mega | 338 | 0.0676% |
| jackpot | 12 | 0.0024% |

**Per-player RTP:**

- Min: 91.706% · Max: 95.291% · Spread: 3.584 pp

| Player | RTP |
|---|---|
| 1 | 94.946% |
| 2 | 94.649% |
| 3 | 95.291% |
| 4 | 94.777% |
| 5 | 91.706% |

---

## 500,000 spins × 10 players

Spins per player: 50,000  ·  Compute: 1527ms

| Metric | Value |
|---|---|
| Total spins | 500,000 |
| Total wagered | $1.00M |
| Total returned | $947.83K |
| Actual RTP | **94.783%** |
| RTP delta vs 92.6% | +2.183 pp |
| Hit frequency | 51.19% |
| Biggest single win | $2.50K (1250× bet) |
| Avg win on winning spin | $3.70 |
| Std dev of per-spin return | $17.48 |
| Longest losing streak | 18 spins |

**Win-tier distribution:**

| Tier | Count | % of all spins |
|---|---|---|
| no-win | 244,074 | 48.81% |
| small | 178,450 | 35.6900% |
| medium | 73,650 | 14.7300% |
| big | 3,496 | 0.6992% |
| mega | 317 | 0.0634% |
| jackpot | 13 | 0.0026% |

**Per-player RTP:**

- Min: 89.685% · Max: 102.037% · Spread: 12.352 pp

| Player | RTP |
|---|---|
| 1 | 95.831% |
| 2 | 102.019% |
| 3 | 91.793% |
| 4 | 93.995% |
| 5 | 102.037% |
| 6 | 89.685% |
| 7 | 94.160% |
| 8 | 91.000% |
| 9 | 91.683% |
| 10 | 95.625% |

---

## 1,000,000 spins × 1 player

Spins per player: 1,000,000  ·  Compute: 3076ms

| Metric | Value |
|---|---|
| Total spins | 1,000,000 |
| Total wagered | $2.00M |
| Total returned | $1.84M |
| Actual RTP | **92.101%** |
| RTP delta vs 92.6% | -0.499 pp |
| Hit frequency | 51.09% |
| Biggest single win | $2.50K (1251× bet) |
| Avg win on winning spin | $3.61 |
| Std dev of per-spin return | $16.78 |
| Longest losing streak | 18 spins |

**Win-tier distribution:**

| Tier | Count | % of all spins |
|---|---|---|
| no-win | 489,116 | 48.91% |
| small | 356,728 | 35.6728% |
| medium | 146,833 | 14.6833% |
| big | 6,679 | 0.6679% |
| mega | 621 | 0.0621% |
| jackpot | 23 | 0.0023% |

---

## 1,000,000 spins × 5 players

Spins per player: 200,000  ·  Compute: 3170ms

| Metric | Value |
|---|---|
| Total spins | 1,000,000 |
| Total wagered | $2.00M |
| Total returned | $1.88M |
| Actual RTP | **94.099%** |
| RTP delta vs 92.6% | +1.499 pp |
| Hit frequency | 51.10% |
| Biggest single win | $2.75K (1375× bet) |
| Avg win on winning spin | $3.68 |
| Std dev of per-spin return | $17.57 |
| Longest losing streak | 23 spins |

**Win-tier distribution:**

| Tier | Count | % of all spins |
|---|---|---|
| no-win | 488,959 | 48.90% |
| small | 356,432 | 35.6432% |
| medium | 147,089 | 14.7089% |
| big | 6,817 | 0.6817% |
| mega | 677 | 0.0677% |
| jackpot | 26 | 0.0026% |

**Per-player RTP:**

- Min: 92.284% · Max: 96.413% · Spread: 4.129 pp

| Player | RTP |
|---|---|
| 1 | 96.413% |
| 2 | 92.284% |
| 3 | 93.750% |
| 4 | 95.556% |
| 5 | 92.491% |

---

## 1,000,000 spins × 10 players

Spins per player: 100,000  ·  Compute: 3167ms

| Metric | Value |
|---|---|
| Total spins | 1,000,000 |
| Total wagered | $2.00M |
| Total returned | $1.85M |
| Actual RTP | **92.291%** |
| RTP delta vs 92.6% | -0.309 pp |
| Hit frequency | 51.14% |
| Biggest single win | $2.50K (1251× bet) |
| Avg win on winning spin | $3.61 |
| Std dev of per-spin return | $15.71 |
| Longest losing streak | 18 spins |

**Win-tier distribution:**

| Tier | Count | % of all spins |
|---|---|---|
| no-win | 488,557 | 48.86% |
| small | 356,424 | 35.6424% |
| medium | 147,537 | 14.7537% |
| big | 6,846 | 0.6846% |
| mega | 619 | 0.0619% |
| jackpot | 17 | 0.0017% |

**Per-player RTP:**

- Min: 86.748% · Max: 100.001% · Spread: 13.254 pp

| Player | RTP |
|---|---|
| 1 | 94.029% |
| 2 | 87.925% |
| 3 | 86.748% |
| 4 | 95.059% |
| 5 | 90.317% |
| 6 | 100.001% |
| 7 | 90.228% |
| 8 | 94.231% |
| 9 | 90.626% |
| 10 | 93.740% |

---

## Old (v1, seeded MT) vs. New (v2, entropy-seeded MT)

Both runs use the same `TripleSevenEngine` paytable and reel weighting. The only difference is how each player's RNG is seeded: v1 used deterministic seeds 1..N derived from the master; v2 lets the production constructor pull fresh entropy from `crypto.getRandomValues()`.

### Aggregate RTP

| Scenario | v1 RTP | v2 RTP | Δ (v2 − v1) | v2 − 92.6% |
|---|---|---|---|---|
| 50,000 × 1 | 94.759% | 90.384% | -4.375 pp | -2.216 pp |
| 50,000 × 5 | 92.281% | 95.757% | +3.476 pp | +3.157 pp |
| 50,000 × 10 | 88.523% | 87.881% | -0.642 pp | -4.719 pp |
| 500,000 × 1 | 92.568% | 92.190% | -0.378 pp | -0.410 pp |
| 500,000 × 5 | 92.590% | 94.274% | +1.684 pp | +1.674 pp |
| 500,000 × 10 | 92.287% | 94.783% | +2.496 pp | +2.183 pp |
| 1,000,000 × 1 | 91.996% | 92.101% | +0.105 pp | -0.499 pp |
| 1,000,000 × 5 | 92.255% | 94.099% | +1.844 pp | +1.499 pp |
| 1,000,000 × 10 | 92.194% | 92.291% | +0.097 pp | -0.309 pp |

### Hit frequency

| Scenario | v1 hit freq | v2 hit freq | Δ (pp) |
|---|---|---|---|
| 50,000 × 1 | 50.89% | 51.08% | +0.19 pp |
| 50,000 × 5 | 51.08% | 51.44% | +0.36 pp |
| 50,000 × 10 | 50.89% | 51.27% | +0.38 pp |
| 500,000 × 1 | 51.08% | 51.11% | +0.03 pp |
| 500,000 × 5 | 51.08% | 51.08% | +0.00 pp |
| 500,000 × 10 | 51.08% | 51.19% | +0.11 pp |
| 1,000,000 × 1 | 51.08% | 51.09% | +0.01 pp |
| 1,000,000 × 5 | 51.08% | 51.10% | +0.02 pp |
| 1,000,000 × 10 | 51.08% | 51.14% | +0.06 pp |

### Jackpot counts (> 1000× bet)

| Scenario | v1 | v2 | Δ |
|---|---|---|---|
| 50,000 × 1 | 3 | 1 | -2 |
| 50,000 × 5 | 1 | 1 | +0 |
| 50,000 × 10 | 1 | 0 | -1 |
| 500,000 × 1 | 12 | 10 | -2 |
| 500,000 × 5 | 13 | 12 | -1 |
| 500,000 × 10 | 13 | 13 | +0 |
| 1,000,000 × 1 | 23 | 23 | +0 |
| 1,000,000 × 5 | 22 | 26 | +4 |
| 1,000,000 × 10 | 19 | 17 | -2 |
| **Total** | **107** | **103** | -4 |

### Biggest single win & longest losing streak

| Scenario | v1 biggest | v2 biggest | v1 max-loss | v2 max-loss |
|---|---|---|---|---|
| 50,000 × 1 | $2.50K | $2.50K | 13 | 15 |
| 50,000 × 5 | $2.50K | $2.50K | 13 | 14 |
| 50,000 × 10 | $2.50K | $500.00 | 13 | 16 |
| 500,000 × 1 | $2.50K | $2.50K | 17 | 19 |
| 500,000 × 5 | $2.50K | $2.50K | 17 | 19 |
| 500,000 × 10 | $2.50K | $2.50K | 17 | 18 |
| 1,000,000 × 1 | $2.50K | $2.50K | 18 | 18 |
| 1,000,000 × 5 | $2.50K | $2.75K | 18 | 23 |
| 1,000,000 × 10 | $2.50K | $2.50K | 18 | 18 |

(Biggest win and longest losing streak are extreme-value samples — they will not match exactly across independent random sequences. We expect both runs to land in roughly the same neighborhood.)

### Verdict

Spin-weighted aggregate RTP: **v1 92.246% vs v2 93.078%** — designed 92.6%. v1 sits −0.35 pp from design; v2 sits +0.48 pp from design. The std-error of the RTP estimator at 4.65M spins is ≈ 0.37 pp, so both runs land inside ≈ 1.3 σ of the design target — i.e., each is individually consistent with 92.6%. The std-error of the v2−v1 difference is ≈ 0.52 pp, so the observed 0.83 pp gap is ≈ 1.6 σ — comfortably within the range of two independent samples drawn from the same distribution. Of the 9 v2 scenarios, 4 came in above the design RTP and 5 below, with no directional bias.

Hit frequency, win-tier mix (small/medium/big/mega/jackpot proportions), biggest-win extremes, and longest-losing-streak extremes all match v1 within their respective sampling noise. Jackpot totals: v1 107, v2 103 — Δ4 across 4.65M spins each (well inside Poisson noise for a ≈ 1/45k event).

**Verdict: Within sampling noise.** The F1 entropy-seeded RNG path preserves the engine's statistical behavior. Paytable math, hit frequency, tier mix, and extreme-value samples are all consistent with the v1 run. No regression introduced by F1.
