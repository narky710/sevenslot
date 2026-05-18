# 06 · Accessibility

Baseline already implemented in the build; treat these as **requirements to
preserve** in any redesign, plus called-out gaps to close.

## 1. Motion

- Honour `prefers-reduced-motion: reduce`. Every animation has a reduced
  path: particles suppressed, reel stop ~40 ms, banner/CTA/pip/jackpot
  pulses set to `none`, preview fade off. Never gate information behind
  motion alone.

## 2. Structure & semantics (current)

- Reel matrix: `role="grid"`, `aria-label="Slot reels, 3 columns by 5 rows"`;
  bands `role="row"`; cells `role="gridcell"` with
  `aria-label="Row R column C, {Symbol}"`.
- FEVER strip `role="status"`. Win readout `aria-live="polite"`.
- Bonus bar `role="status" aria-live="polite"`.
- Modals `role="dialog" aria-modal="true"` + `aria-labelledby`; paytable
  tabs `role="tablist"/"tab"` with `aria-selected`.
- Interactive bonus banner: `role="button"`, `tabIndex 0`, descriptive
  `aria-label` ("Tap to start free spins" / "Tap to continue"),
  Enter/Space activate. Pointer events enabled only when interactive.
- Every control has an explicit `aria-label`; toggles use `aria-pressed`.
- Decorative layers (`glare`, `vignette`, payline SVGs, particles, symbol
  art) are `aria-hidden`.

## 3. Keyboard

- All controls are real `<button>`s — focusable, Enter/Space activatable.
- Bonus banner keyboard-operable (Enter/Space) in addition to tap.
- **Gap to close:** modals should trap focus and restore focus to the
  invoking control on close; add a visible focus ring token (see below).

## 4. Focus visibility

- A focus-visible treatment exists for the bonus banner
  (`outline: 2px var(--lux-gold)`). **Requirement:** define one shared
  `--focus-ring` token (e.g. `0 0 0 3px rgba(0,212,255,.6)`) and apply
  `:focus-visible` to **all** interactive components in the reskin. Must be
  visible on both the dark field and the gold MAX button.

## 5. Color & contrast

- Primary numerics amber/gold on near-black ≥ 7:1; cream labels on navy
  ≥ 7:1 — maintain.
- Cyan accents are used for ≥ bold-18 px / non-text UI; keep ≥ 3:1 for
  non-text and ≥ 4.5:1 anywhere cyan carries text.
- Never encode state by hue alone: winning cells also pulse + border; the
  pip strip also shows a numeric `n/20`; win tiers also show a text badge;
  preview lines also change the pip count. Preserve these redundancies.

## 6. Target size

- Primary controls/utility icons = 48 px. Compact steppers render at 32 px;
  acceptable under WCAG 2.5.8 (≥ 24 px) but **prefer ≥ 44 px** in a redesign
  where vertical budget allows, or expand the hit area beyond the visual.

## 7. Timing & autonomy

- The BIG+ auto-play pause and the bonus tap-to-proceed gates are
  intentional anti-"walk-away-loss" affordances. The countdown auto-proceed
  exists so an away player isn't stuck, and is **lengthened in manual play**
  (120/60 s) so a present player is never rushed. Keep both halves.
- Session clock is always visible (responsible-gaming aid).

## 8. Content & RG

- Responsible-gaming statement + helpline/resource link in Info. Published
  RTP (95.0%) and RNG (Mersenne Twister) disclosed. Keep these surfaced;
  localized/jurisdictional copy is operator-owned.

## 9. Internationalization notes

- Money formatting is en-US ($, comma thousands, 2-dp). A localized build
  must tokenise currency/format. Labels are short uppercase English — leave
  ~30% expansion room in any redesign of the label pills/steppers.
