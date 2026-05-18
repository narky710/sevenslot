# 02 · Design System — Foundations

All values are extracted from `src/styles/index.css` (`:root` and
`.lux-stage` scopes). Machine-readable copies live in `tokens/`.

---

## 1. Color

### 1.1 Shared chassis palette (all three games)

| Token | Hex | Use |
|---|---|---|
| `--col-cabinet-1` | `#F2F2F4` | Cabinet bezel highlight (Triple Sevens/Keno) |
| `--col-cabinet-2` | `#BFC2CC` | Cabinet mid |
| `--col-cabinet-3` | `#5C5F6B` | Cabinet shade |
| `--col-cabinet-4` | `#2A2C34` | Cabinet deep |
| `--col-field-1` | `#2A56D8` | Play-field blue (top of radial) |
| `--col-field-2` | `#1A38B0` | Play-field mid |
| `--col-field-3` | `#0E1F6E` | Play-field deep |
| `--col-field-deep` | `#061548` | Play-field darkest |
| `--col-cell-bg` | `#0A1C4E` | Reel cell base |
| `--col-cell-bg-hi` | `#1F3AA0` | Reel cell highlight |
| `--col-red` | `#E51E1E` | Alert / Triple-Sevens accent |
| `--col-red-deep` | `#A50F0F` | Red shade |
| `--col-red-glow` | `#FF6262` | Red glow |
| `--col-gold` | `#FFD93D` | Primary gold (LED, badges) |
| `--col-gold-hot` | `#FFC828` | Gold hot |
| `--col-gold-deep` | `#A88810` | Gold shade / borders |
| `--col-cream` | `#FFF6D8` | Label text on dark |
| `--col-amber-led` | `#FFB23D` | Amber LED numerics |
| `--col-chrome-1..deep` | `#F4F5F8 / #B4B8C2 / #6E7280 / #2A2C34` | Chrome controls |

### 1.2 Diamond Riches accent palette (`.lux-stage` scope only)

| Token | Hex | Use |
|---|---|---|
| `--lux-navy` | `#0A1A4A` | Theme base / cabinet bezel (replaces chrome) |
| `--lux-cyan` | `#00D4FF` | Primary accent — reel borders, active rails, pips |
| `--lux-gold` | `#D4AF37` | Secondary accent — jackpot meters, CTA, frames |
| `--lux-diamond` | `#7FE3F5` | Diamond/wild gem, winning payline stroke |
| `--lux-diamond-deep` | `#2A8FC8` | Diamond shade |

Cabinet-inner field (lux): `radial-gradient(circle at 50% 30%, #16348A,
#0A1A4A 60%, #050F30 100%)`. Cabinet bezel (lux, white frame removed):
`linear-gradient(180deg, #0A1A4A, #061230 60%, #03081C 100%)`.

### 1.3 Win-tier color mapping

| Tier | Threshold (× total bet) | Treatment |
|---|---|---|
| WIN | ≥ 3× | Amber LED, subtle badge |
| BIG | ≥ 10× | Gold badge + celebration glow + particles, **auto-play pauses** |
| MEGA | ≥ 25× | Brighter, more particles |
| EPIC | ≥ 50× | Max spectacle (reuses "jackpot" celebration), "★ EPIC WIN ★" |

### 1.4 Functional colors

- Bonus screens — **red velvet**: `radial-gradient(ellipse, rgba(120,12,20,.65),
  rgba(40,4,8,.92))` over `repeating-linear-gradient(115deg,#6E0C14 0 14px,
  #5A0A10 14px 28px)`, framed in `3px double var(--lux-gold)`.
- FEVER tier borders: FEVER 1 `#D4AF37`, FEVER 2 `#C0C6D2`, FEVER 3 `#C77B3A`.
- Active-line preview: one hue per line via golden-angle
  `hsl((i × 137.508) mod 360, 92%, {54% | 66% alternating})`.
- Winning payline (any/all): single uniform `#7FE3F5`.

### 1.5 Contrast

Primary numerics are amber/gold (`#FFB23D`/`#FFD93D`) on near-black
(`rgba(0,0,0,.5)`) → ≥ 7:1. Cream labels (`#FFF6D8`) on navy → ≥ 7:1. Cyan
on navy meets ≥ 4.5:1 for the ≥18 px / bold UI it is used on. Maintain these
ratios in any reskin (see `06-accessibility.md`).

---

## 2. Typography

| Role | Family stack | Weight | Notes |
|---|---|---|---|
| App base | `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif` | 400–800 | All chrome/labels |
| Game title "DIAMOND RICHES" | `'Snell Roundhand','Apple Chancery','Cochin',Georgia,serif` | 700 | Script display, gold gradient, `white-space:nowrap`, `clamp(15px,5vw,28px)`, letter-spacing 1px |
| Bonus display script | `'Snell Roundhand','Apple Chancery',Georgia,serif` | 800 | `clamp(22px,6vw,38px)` |
| LED numerics (credit, bet, multiplier, jackpot) | `'Menlo','Consolas',monospace` | 900 | Tabular feel; glow text-shadow |
| Labels (CREDIT, LINES…) | base sans | 800 | 8–11px, letter-spacing 0.8–2px, UPPERCASE, `--col-cream` |

Type scale in use (px): 8 (micro-label), 9 (pip count/row no.), 10–11
(labels/secondary), 13–14 (readout values), 18–22 (stepper/step buttons),
26 (bonus multiplier), `clamp` display for title & banners.

> The script faces are system fonts (Apple). For cross-platform parity an
> agency should specify a licensed substitute (e.g. a formal English-roundhand
> like *Tangier*, *Bickham*, or *Pinyon Script* webfont) and a monospace
> (e.g. *JetBrains Mono* / *IBM Plex Mono*) for the LED role.

---

## 3. Spacing & sizing

- **Base unit:** 4 px. Common gaps: 2/3/4/5/6/8 px (dense, mobile-first).
- **Tap target:** `--tap-target: 48px` (utility icons, primary buttons).
  Compact bottom-panel steppers are 32 px (still ≥ the 24 px WCAG 2.2 floor;
  see a11y note) with generous surrounding hit area.
- **Cabinet:** `width: min(94vmin, 540px)`, `height: min(94dvh, 940px)`,
  locked `aspect-ratio: 9/16`, `padding: 7px` (lux; 16 px on other games).
- **Radii:** `--radius-cabinet: 22px`, `--radius-md: 8px`,
  `--radius-sm: 4px`; reel cell 5–6 px; pills 5–8 px.
- **Content gap:** `.lux-content` vertical rhythm `gap: 5px` (tight portrait
  stack).

---

## 4. Grid — the play area

- **Reel matrix:** 3 columns × 5 rows = 15 cells. (Engine data model is
  `grid[reel 0..4][row 0..2]`; the view transposes it so reel-index → row,
  row-index → column. Do **not** "fix" this — it is the rotated design.)
- **Reel band:** a horizontal row, `flex-direction:row`, 3 equal cells,
  5 px inner gap, dark inset trough.
- **Matrix container:** `flex-direction:column`, 6 px gap between the 5
  bands, 8 px padding, 2 px cyan-tinted border, inset shadow.
- **Row rail:** 14 px left column, numerals 1–5 top→bottom, cyan @ 55%.
- **Payline overlay viewBox:** `0 0 300 500` (x = column·100+50,
  y = rowBand·100+50). Winning lines = uniform diamond stroke, width 5,
  draw-on animation. Preview lines = per-line hue, width 3.

---

## 5. Elevation & material

| Surface | Treatment |
|---|---|
| Cabinet bezel | Dark navy gradient + `--shadow-cabinet` (`0 22px 40px rgba(0,0,0,.75)`) |
| Cabinet inner field | Navy radial + `inset 0 0 24px rgba(0,0,0,.55)` |
| Reel matrix | Black-to-transparent gradient, cyan ring `0 0 0 1px rgba(0,212,255,.35)` + soft cyan glow |
| Reel cell | `radial-gradient` sheen over `linear(#20407E,#0C1F50)`, 3 px cyan border @ 55% |
| LED pill | Near-black inset, 1 px hairline, amber glow on value |
| Primary CTA (SPIN) | Diamond-blue radial+linear, `0 4px 0 #0E4763` base + drop, inset highlights, press = translateY |
| Modals | Dark panel, gold-ish header rule, `overlayFade` backdrop blur 4 px |
| Bonus banner | Fixed full-screen red-velvet, `3px double gold` frame, `luxBannerPop` |

Glare/vignette overlays (`.cabinet-glare`, `.cabinet-vignette`) sit above the
field at z 1–2 for a glass-front feel.

---

## 6. Iconography & symbol art

12 reel symbols, original geometric SVG, `viewBox 0 0 100 100`, shared
gradient defs (`assets/symbols/` ships them standalone & self-contained):

`JET, YACHT, CAR, MONEY, RING, WATCH, GOLD_BARS, SILVER_BARS, GOLD_BAR,
WILD (diamond + "Double" ribbon), SCATTER (gold coin on blue burst), BLANK`.

Utility glyphs are text/emoji in chrome (`✕`, `🔊/🔇`, `i`, `📖`). An agency
deliverable should replace emoji with a custom 1.5–2 px stroke icon set on a
24 px grid for brand consistency and cross-platform rendering.

---

## 7. Z-index ladder

`0` field · `1` glare · `2` vignette · `4` line-preview · `5` winning
payline · `8` collecting cell · `≈200` celebration overlays ·
`220` bonus banner · modals above. Keep this order in any rebuild.
