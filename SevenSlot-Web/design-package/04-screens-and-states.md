# 04 · Screens & States

The game is a single portrait cabinet; "screens" are runtime states layered
over it. Visual renders of every state are in
`mockups/mockup-gallery.html` (open in a browser). Vertical stack order is
fixed; below is the annotated spec per state.

Cabinet stack (top → bottom): Chrome bar → FEVER strip → Marquee →
[Bonus bar + Diamond meter, bonus only] → Reel matrix (row-rail + 3×5) →
Readout pills → Pip strip → Bet steppers + MAX → SPIN / AUTO / PAYS →
[Win badge].

---

## S1 · Base — idle (default)

The resting state. Quiet navy, all 12 symbols may show, no overlays.
- Readouts: `CREDIT $500.00`, `TOTAL BET $4.00`, `LAST WIN $0`.
- Pip strip `20/20`. LINES `20`, BET/LINE `$0.20`, MAX active.
- SPIN enabled. Acceptance: legible at 360 px in bright light.

## S2 · Base — line adjusting (preview)

Triggered by LINES − / + / MAX. Each active payline drawn over the matrix in
its own distinct hue (golden-angle); pip strip glows + count updates live
(e.g. `13/20`); TOTAL BET recomputes (e.g. 13 × $0.20 = `$2.60`).
- Auto-dismiss after 4.5 s or on any non-line action (SPIN, BET, AUTO,
  PAYS). Never shown with winning lines.

## S3 · Base — spinning

Bands blur + horizontal jitter; symbols tumble; bands settle **top→bottom**
in sequence. SPIN → `SPIN…` & disabled. Optional anticipation slow-down when
2+ scatters are teasing. Controls locked.

## S4 · Base — win resolved

Winning cells get cyan border + pulse; non-winning cells dim; **all**
winning paylines drawn in the single diamond color; LAST WIN counts up;
tier badge if ≥3×. Then returns to S1 (or escalates S5).

## S5 · Win celebration — BIG / MEGA / EPIC

≥10× / ≥25× / ≥50× total bet. Full-cabinet glow wash + particle field
(8 / 16 / 24 particles), badge `BIG WIN` / `★ MEGA WIN ★` / `★ EPIC WIN ★`.
**If auto-spinning, the run pauses** and AUTO → `RESUME (n)` (cyan pulse) —
the player must acknowledge. Reduced-motion: glow only, no particles.

## S6 · Bonus — intro banner (interactive)

Full-screen red-velvet, gold double frame: `DIAMOND RICHES` /
`BONUS REELS IN PLAY` / 💰 / `Congratulations!` / `12 Free Spins Won!` /
rules line / **TAP TO START** + `auto-starts in M:SS`.
- Countdown: **120 s** manual, **15 s** if reached during an auto-run.
- Proceed: tap anywhere on banner, Enter/Space, or countdown expiry.
- Pointer events are enabled only while interactive.

## S7 · Bonus — free spins in play

Field warms (`lux-bonus-mode`). Marquee → `BONUS REELS IN PLAY`. Bonus bar
(`SPINS REMAINING` / `MULTIPLIER n×` / `BONUS $`) + diamond meter visible.
Reels auto-advance; SPIN shows `FREE SPINS` (glow, non-interactive).
Footer readouts swap BET→`MULT`. Exit ✕ disabled.

## S8 · Bonus — diamond collect / multiplier climb

Each diamond WILD on a band scales-up & fades into the meter; meter slot
fills; `MULTIPLIER` ticks +1 (2× → max 29×). Audio: collect + tick.

## S9 · Bonus — retrigger

3+ scatters during the bonus → centered `+12 FREE SPINS!` flash; spins added;
multiplier persists. Brief, non-blocking.

## S10 · Bonus — outro banner (interactive)

Red-velvet: `Congratulations!` / `Free Spin Bonus` / ◆ `$x.xx Won` ◆ /
**TAP TO CONTINUE** + `auto-continues in M:SS`.
- Countdown: **60 s** manual, **30 s** during an auto-run.
- On proceed: bonus ends, state resets, returns to S1; **auto-spin resumes
  its remaining count** if a run was active.

## S11 · Progressive jackpot won

Full-screen flash + confetti, `FEVER n JACKPOT!`, dollar amount, "Added to
your credits". FEVER strip shows `JACKPOT HIT!` on that tier, then reseeds.
Can occur on a base or bonus spin.

## S12 · Modal — Paytable › PAYOUTS

Symbol pay rows (art + `5:×.. 4:×.. 3:×..`, JET also `2:`), note
"× bet per line · top→bottom from row 1"; specials: Diamond Wild
(rows 2/3/4, substitutes every symbol incl. Scatter, doubles),
Gold-Coin Scatter (× total bet, 3+ → 12 free spins; Wilds count as
Scatters); Free-Spin Bonus rules block.

## S13 · Modal — Paytable › RULES & LINES

How-to (4 steps, "Reels spin left→right; wins pay top→bottom"), then a grid
of **20 mini payline diagrams** — each a 3-wide × 5-tall cell map with the
line drawn top→bottom — then fairness + RTP 95%.

## S14 · Modal — Info

`dl`: Title, Layout `3 columns × 5 rows`, Paylines `1–20 selectable`, RTP
`95.0%`, RNG `Mersenne Twister`, Volatility `Medium-High`; session elapsed;
responsible-gaming statement + resources link.

## S15 · Modal — Auto-spin picker

Prompt + preset chips `5 / 10 / 25 / 50 / 100`; note: pauses on BIG+ (tap
RESUME), and resumes the remaining count after a free-spin bonus.

## S16 · Empty / insufficient credit

If credits < total bet: SPIN disabled; an active auto-run ends (when back in
base). No modal; the disabled CTA + CREDIT readout communicate it. (Operator
may layer a re-up flow — out of scope here.)

---

### State transition map

```
            ┌───────────────────────────────────────────┐
            ▼                                             │
  S1 idle ──(LINES±)──► S2 preview ──(any action)──► S1   │
   │  ▲                                                   │
 (SPIN/AUTO)                                              │
   ▼  │                                                   │
  S3 spinning ──► S4 win ──(≥10×)──► S5 celebrate ──► S1 ─┘
   │                       (auto: pause→RESUME)
   │ (3+ scatter)
   ▼
  S6 intro ──(tap/timer)──► S7 spins ──► S8 collect
                               │  ▲ └─(3+sc)─► S9 retrigger
                               ▼  │
                            S10 outro ──(tap/timer)──► S1
                                                  (auto resumes)
  (any spin) ──(jackpot RNG)──► S11 jackpot ──► back to prior flow
  Modals S12–S15 overlay S1 (open from PAYS / i / AUTO), close → S1
```
