# 03 · Component Library

Every component, its anatomy, props/variants, and states. Order ≈ top→bottom
of the cabinet. All scoped under `.lux-stage` unless noted as shared chassis.

---

## C1 · Cabinet shell

- **Cabinet frame** — 9:16 locked, `min(94vmin,540px)` wide. Lux: dark navy
  bezel, no white edge, 7 px pad. Decorative: 4 corner studs, watermark
  "DR", glare, vignette.
- **Cabinet inner** — navy radial field, clipped, inset shadow.
- States: static. Gains `lux-bonus-mode` class during bonus (warmer field).

## C2 · Chrome bar (toolbar)

Row at top. Left: **session clock** (pulsing dot + `MM:SS`). Right: **exit
✕** (disabled in bonus), **mute 🔊/🔇** (aria-pressed), **info i**.
- Variants: exit hidden if no `onExit`.
- States: default / hover / disabled (exit in bonus).
- Each 48 px tap target.

## C3 · Progressive jackpot strip (FEVER)

3 equal pills: `FEVER 1/2/3`, label + dollar value (`$1,234.56`), tier-tinted
border, slow "breath" glow.
- States: idle (live-ticking value), **hit** (value → "JACKPOT HIT!",
  flashing) for the won tier.
- Data: from `JackpotService` (mock drifts every 4 s + per-spin
  contribution).

## C4 · Marquee title

`DIAMOND RICHES` — script face, gold gradient, shine sweep, one line always.
- Variant: in bonus, swapped for `BONUS REELS IN PLAY` cyan subtitle.

## C5 · Bonus status bar *(bonus only)*

3-up grid: `SPINS REMAINING` (amber LED) · `MULTIPLIER n×` (gold, framed,
pulsing) · `BONUS $x.xx` (amber LED).

## C6 · Diamond collection meter *(bonus only)*

Row of 10 gem slots that fill as diamonds collect + a numeric count;
filled gem = cyan with pop animation.

## C7 · Reel matrix

3×5 cells inside 5 horizontal bands + left row-rail (1–5).
- **Cell** states: `idle` · `spinning` (blur + horizontal jitter, per-band)
  · `winning` (cyan border, pulse) · `dimmed` (non-winning during a win) ·
  `collecting` (bonus diamond pickup, scale + fade up).
- **Reel band** states: `idle` · `spinning` (shimmer). Bands stop in
  sequence **top→bottom**; optional anticipation slowdown on scatter tease.
- **Symbol** — one of 12 SVGs, 86% of cell, centered.

## C8 · Payline overlays (two distinct components)

1. **Winning lines** — shown post-spin. All winning lines share ONE color
   (`#7FE3F5`), width 5, draw-on + pulse. Vertical (top→bottom) polylines.
2. **Active-line preview** — shown while adjusting LINES (auto-fades 4.5 s or
   on any other action). Each of the first *N* paylines a DISTINCT hue
   (golden-angle), width 3. Never co-shown with winning lines.

## C9 · LED readout pills

Reusable: label (cream, upper) + value (amber/gold mono LED).
- Instances: `CREDIT`, `TOTAL BET`/`MULT`, `LAST WIN`/`BONUS WIN`.
- Win-tier class tints the value on LAST WIN.

## C10 · Active-lines pip strip

Sleek ~10 px bar: 20 pips, first *N* lit cyan + `n/20` mono count.
- States: idle (static lit/dim) · `is-active` (glowing + pip pulse while
  the preview is up).

## C11 · Bet steppers (LINES, BET/LINE)

Each: label + `[− ] [LED] [ +]`. **LINES** steps by **1**, range 1–20.
**BET/LINE** steps through `1,2,3,5,10,20`¢ (shown `$0.01…$0.20`).
- `−`/`+` 32 px; disabled at range ends or when spinning/in-bonus.
- TOTAL BET = lineCount × lineBet (always exactly representable).

## C12 · MAX button

Sets 20 lines × max line bet ($4.00). Gets `active` class (gold fill) when
already at max. Disabled while spinning/in-bonus.

## C13 · SPIN button (primary CTA)

Large diamond-blue 3D button. Label: `SPIN` → `SPIN…` (spinning) →
`FREE SPINS` (bonus, glowing). Press = depress (translateY). Disabled when
`!canSpin` (spinning / bonus / locked / insufficient credit).

## C14 · AUTO button

Cycles: `AUTO` → opens picker → `AUTO (n)` (active, counting) →
`RESUME (n)` (cyan pulse, paused by a BIG+ win). Disabled in bonus / locked /
insufficient credit. **Auto-play is preserved across the bonus and resumes
its remaining count afterward.**

## C15 · PAYS button

Icon (`📖`) + `PAYS` label → opens paytable modal. Disabled while spinning.

## C16 · Modals (shared shell)

Overlay (blurred backdrop, `overlayFade`) + panel + header (title + ✕). Tap
backdrop or ✕ to close.
- **Paytable** — tabs `PAYOUTS` / `RULES & LINES`. Payouts: symbol rows with
  art + multipliers; specials (WILD/SCATTER) + bonus rules. Rules: how-to,
  20 mini payline diagrams (3×5, top→bottom), fairness/RTP.
- **Info** — game spec dl, session timer, responsible-gaming + resources.
- **Auto-spin picker** — preset chips `5/10/25/50/100` + behaviour note
  (pauses on BIG+, resumes after bonus).

## C17 · Bonus banner (intro / outro) — interactive

Full-screen red-velvet, gold double-frame.
- **Intro:** title, `12 Free Spins Won!`, rules line, **TAP TO START** + a
  live `auto-starts in M:SS` countdown.
- **Outro:** `Congratulations!`, `$x.xx Won`, **TAP TO CONTINUE** +
  `auto-continues in M:SS`.
- Tap (or Enter/Space, or countdown expiry) proceeds. Countdown is **120 s
  intro / 60 s outro** in manual play, **15 s / 30 s** during an auto-spin
  run (player is away — keep it moving).

## C18 · Retrigger flash

Brief centered `+12 FREE SPINS!` burst during the bonus on 3+ scatters.

## C19 · Celebration layers (BIG/MEGA/EPIC)

Glow wash + particle field (count scales with tier), reduced-motion safe
(particles suppressed). EPIC reuses the jackpot-grade treatment.

## C20 · Jackpot celebration

Full-screen flash + confetti + `FEVER n JACKPOT!` + dollar amount + "Added
to your credits".

---

### Component state matrix (quick reference)

| Component | idle | hover | active/pressed | disabled | spinning | bonus |
|---|---|---|---|---|---|---|
| SPIN | ✓ | ✓ | ✓ (depress) | ✓ | "SPIN…" | "FREE SPINS" glow |
| AUTO | ✓ | ✓ | "AUTO (n)" | ✓ | — | preserved/resumes |
| Steppers | ✓ | ✓ | ✓ | end/spin/bonus | locked | locked |
| Reel cell | ✓ | — | — | — | blur | win/dim/collect |
| Bonus banner | — | — | tap | — | — | intro/outro |
