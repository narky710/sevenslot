# 07 · Developer Handoff

Closes the loop from design back to the shipping codebase so an agency's
redesign drops in cleanly.

## 1. Stack & structure

- **React 18 + TypeScript + Vite**, single-page. No CSS framework — one
  hand-authored `src/styles/index.css` with CSS custom properties.
- Game lives at `src/games/diamondRiches/DiamondRichesView.tsx` (view +
  presentation state) over a pure engine `src/engine/LuxuryEngine.ts`
  (RNG, paylines, paytable, bonus state machine) and
  `src/engine/JackpotService.ts` (progressive abstraction).
- Symbols: `src/symbols/LuxurySymbols.tsx` — `getLuxurySymbolSVG(id)` switch
  + a single always-mounted `<LuxurySymbolDefs/>` holding shared gradient/
  filter defs (do NOT re-embed defs per symbol — duplicate SVG ids broke
  fills when reels re-rendered; the package SVGs are self-contained for
  external tooling only).
- Catalog/routing: `src/catalog/games.ts`, `src/App.tsx`.

## 2. Theming model (critical)

The cabinet chassis is shared by 3 games. Diamond Riches styles are **scoped
under `.lux-stage`** so Triple Sevens / Keno are untouched. Any reskin must
stay within `.lux-stage` (and the lux component classes) — do not edit base
`.cabinet-*`, `.spin-button`, `.modal-*` globals.

CSS class prefixes: `lux-` (this game), shared chassis (`cabinet-frame`,
`cabinet-inner`, `chrome-bar`, `spin-button`, `autospin-button`,
`paytable-icon-button`, `max-bet-button`, `bet-step-button`, `led-frame`,
`led-value`, `readout-label`, `modal-*`, `celebration-*`).

## 3. Tokens

`tokens/design-tokens.json` (nested, Style-Dictionary-shaped) and
`tokens/design-tokens.css` (`:root` + `.lux-stage` custom properties) mirror
the live `:root`/`.lux-stage` blocks. Reskin by overriding tokens first;
only touch component CSS for structural change.

## 4. Money / math contract (do not break)

- 1 credit = `$0.01` (`CREDIT_VALUE_DOLLARS`). Engine stores integer credits.
- Bet = `lineCount (1–20)` × `lineBet ∈ {1,2,3,5,10,20}` credits. Max = 400
  credits = **$4.00**. `recomputeTotalBet = lineBet × lineCount` — exact for
  any line count (LINES steps by 1).
- 20 paylines, priority-ordered; activating N lines = first N entries.
- Paytable multipliers apply to **bet-per-line**; SCATTER pays × **total**
  bet. RTP target **95%** (Monte-Carlo tuned; see `stress-test/`). Changing
  any payout/strip requires re-running `stress-test/luxury-rtp.cjs` and the
  77-assertion `luxury-eval.cjs`.

## 5. Layout contract

- Portrait only, cabinet `aspect-ratio: 9/16`, `min(94vmin,540px)` ×
  `min(94dvh,940px)`. Mobile-first; scales by `vmin/dvh` + `clamp()` — no JS
  breakpoints. Verify at 360×640 up to desktop.
- Reel render: outer loop `NUM_REELS(5)` → a band (CSS row);
  inner `NUM_ROWS(3)` → cells (CSS columns). `grid[reel][col]`. Visual is
  3 wide × 5 tall, paylines top→bottom. **This transposition is intentional
  — don't "correct" it.**
- WebKit/Chrome hardening already in CSS: `-webkit-font-smoothing`,
  GPU-promoted animated layers, `backface-visibility`,
  `touch-action: manipulation`, isolation/translateZ on reel layers.

## 6. Asset pipeline

- Symbols are inline SVG (no raster, no sprite sheet). `assets/symbols/*.svg`
  are standalone exports for Figma/Illustrator. To replace art: keep the
  `viewBox 0 0 100 100`, keep ids referenced by `LuxurySymbolDefs`, drop new
  `<svg>` bodies into the `getLuxurySymbolSVG` switch.
- Replace emoji utility glyphs (`✕ 🔊 🔇 i 📖`) and the 💰/◆ banner glyphs
  with a custom 24 px icon set as part of the redesign.
- Fonts: spec licensed webfonts for the script display + LED monospace (see
  `02-design-system.md §2`); currently relies on Apple system faces.

## 7. State ownership

- **Engine** owns: RNG, grid, evaluation, bonus state machine, bet levers,
  jackpot odds roll.
- **View** owns: presentation state (spinning, win count-up, banners,
  countdowns, preview, auto-spin scheduler, modals). Auto-spin is an
  effect-driven scheduler — preserve the idle-gating predicate and the
  bonus-continuity rule.
- **JackpotService**: `MockJackpotService` (in-memory, dev) implements the
  interface; `RemoteJackpotService` is a documented stub. Backend is out of
  scope for design; the UI only needs `MetersSnapshot`.

## 8. Acceptance checklist for a redesign

- [ ] All edits scoped to `.lux-stage` / `lux-*`; other games visually
      unchanged.
- [ ] `tsc --noEmit` clean; `stress-test/luxury-eval.cjs` 77/77;
      `luxury-rtp.cjs` within 94–96%.
- [ ] All 16 states (`04-screens-and-states.md`) render correctly at
      360 px and desktop, portrait.
- [ ] Reduced-motion path verified for every animation.
- [ ] Money math exact at every line count 1–20 × every line bet.
- [ ] BIG+ auto-pause + bonus tap-to-proceed + auto-resume-after-bonus
      intact.
- [ ] Keyboard + ARIA + focus-visible on every control; focus trap in
      modals added.

## 9. Known follow-ups (nice-to-have for the agency)

- Custom icon set replacing emoji.
- Licensed webfonts (script + mono).
- Modal focus-trap + focus restoration.
- Tokenised i18n/currency formatting.
- Optional: a landscape/desktop-optimised layout (currently portrait-locked
  by product decision — confirm before changing).
