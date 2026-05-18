# Diamond Riches — Web App Design Package

> **Point-in-time handoff doc.** This package was written at a specific snapshot
> of the codebase and may not reflect current `src/`. For live specs, read the
> source at `src/games/diamondRiches/` and `src/engine/LuxuryEngine.ts` directly.
> Screenshots in `screenshots/` were captured from the deployed app and are current.

Prepared for external design-agency handoff. This package documents the
**Diamond Riches** HTML5 slot game (a title within the *SevenSlot Web*
collection) at a level of detail sufficient for an agency to redesign,
re-skin, extend, or produce production art and motion against.

> Source of truth: the live build at `src/games/diamondRiches/` +
> `src/engine/LuxuryEngine.ts`. Everything in this package is extracted from
> the shipping code, not invented. Where a value is product-configurable it
> is called out explicitly.

---

## Contents

| File | Purpose |
|------|---------|
| `01-design-brief.md` | Product & creative brief — what the game is, who it's for, brand pillars. |
| `02-design-system.md` | Foundations: color, type, spacing, grid, elevation, iconography. |
| `03-component-library.md` | Every UI component, its anatomy, states, and specs. |
| `04-screens-and-states.md` | All screens & runtime states with annotated layout specs. |
| `05-motion-and-interaction.md` | Animation, timing, easing, haptics, audio cues. |
| `06-accessibility.md` | A11y requirements, reduced-motion, focus, ARIA, contrast. |
| `07-developer-handoff.md` | Architecture, breakpoints, asset pipeline, redline rules. |
| `tokens/design-tokens.json` | Machine-readable design tokens (Style Dictionary-compatible shape). |
| `tokens/design-tokens.css` | The same tokens as CSS custom properties. |
| `assets/symbols/*.svg` | The 12 production reel symbols as standalone, self-contained SVGs. |
| `mockups/mockup-gallery.html` | **Visual mockups** — open in any browser. Pixel-faithful renders of every screen/state using the real tokens + symbol art. |
| `screenshots/index.html` | **Live screenshots** — open in any browser. Real captures from the deployed app at 430 × 932 (iPhone 14 Pro), organized by game. |
| `screenshots/lobby/` | Lobby captures. |
| `screenshots/triple-sevens/` | Triple Sevens: idle, game info, paytable, after-spin. |
| `screenshots/double-up-keno/` | Double-Up Keno: idle, paytable, spots selected, result. |
| `screenshots/diamond-riches/` | Diamond Riches: idle, game info, paytable, spin, free spins won & active. |

## How to use this package

1. Open `mockups/mockup-gallery.html` in a browser first — it is the fastest
   way to understand the product visually. Every screen state is rendered
   side-by-side at the real 9:16 portrait aspect with annotations.
2. Read `01` → `02` → `03` → `04` in order for a full mental model.
3. `tokens/` and `assets/` are drop-in for Figma (import SVG; paste tokens
   via the Tokens Studio plugin or Style Dictionary).
4. `07-developer-handoff.md` closes the loop back to the codebase.

## Game at a glance

- **Format:** 3-column × 5-row video slot (reels spin left→right; paylines
  evaluate top→bottom). 20 fixed paylines, 1–20 selectable.
- **Bet:** 1 credit = $0.01. Per-line 1/2/3/5/10/20 credits × 1–20 lines.
  Max bet **$4.00** (20 lines × 20¢).
- **Math:** ~95% RTP, medium-high volatility, Mersenne-Twister RNG.
- **Signature mechanics:** Diamond WILD (doubles a line it completes,
  rows 2–4), Gold-Coin SCATTER, 12-free-spin collectible-multiplier bonus
  (2×→29×, retriggers add +12), three globally-shared FEVER progressive
  jackpots.
- **Platform:** Responsive single-page web app (mobile-first portrait),
  React 18 + TypeScript + Vite. Touch + pointer + keyboard.
- **Orientation:** Portrait only, 9:16 cabinet.

## Out of scope for this package

Server/backend for the progressive jackpots (the game ships a documented
`JackpotService` interface + mock; the agency does not need to design the
backend). Regulatory/jurisdictional UI (RG panels exist but localized
compliance copy is owned by the operator).
