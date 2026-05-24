# Pick-em Bonus Modal — Build Brief

> Hand this brief to Claude Design (separate session) when ready to build
> the polished pick-em visual layer. Engineering side already has a
> functional placeholder at `previews/pickem-modal.html` wired via the
> data contract below.

## ⚠ Class III architecture — read this first

This modal IS NOT a random outcome machine. **The total payout and the
reveal sequence are predetermined by the server at the moment the pick-em
is triggered** (per Nevada Gaming Control Board / GLI-certified Class III
slot architecture — see `docs/rng-architecture.md`).

What this means for your build:

- The `items` array you receive on init is the **predetermined reveal
  sequence in tap order**, not a live shuffle to be picked from. Item at
  `items[0]` is what the player's FIRST tap reveals. Item at `items[1]`
  is what their SECOND tap reveals. And so on.
- **The player's tap order does NOT determine outcome.** Which physical
  door (display position) they tap is presentation only. Whatever door
  they tap first reveals `items[0]`; the door they tap second reveals
  `items[1]`; etc.
- Unpicked items in the 12-slot display can be revealed at round-end
  purely for entertainment — they're filler, never live outcomes.
- The "illusion of choice" is fully legal and standard. It's what every
  Class III pick-em slot does (Nevada-certified, GLI-tested).

In one line: **the host server already decided the outcome; you just
animate the predetermined story in tap order.**

## Goal

Build a standalone HTML/CSS/JS file (no React, no build step) that renders
a slot-machine "Pick-em" bonus round. The host React app communicates with
this modal via `window.postMessage`. Target polished cabinet-style visuals
matching a slot machine bonus screen.

## Integration model

- Host React app mounts your HTML in an iframe.
- On mount, host posts `{ type: 'init', payload: PickEmConfig }` to your iframe.
- You display the modal, accept the player's taps, post events back:
  - `{ type: 'pick_revealed', payload: PickEvent }` after each tap
  - `{ type: 'round_complete', payload: RoundComplete }` when the round ends
- Host unmounts the iframe after a 2-3 second celebration delay following
  `round_complete`.

## Data contract

### Input — `init` payload (`PickEmConfig`)

```ts
interface PickEmConfig {
  spinId: string                  // e.g. "spin-abc123" — for audit/replay
  themeId: 'lone-star-country'    // selects theme art set + strings
  picksAwarded: 5 | 7 | 9         // total picks (3/4/5 scatters → 5/7/9 picks)
  betCents: number                // total bet, 1–500 ($0.01–$5.00)
  // PREDETERMINED REVEAL SEQUENCE in tap order. items[0] = first tap
  // reveals this. items[1] = second tap reveals this. Etc. Player's
  // physical door choice doesn't change which item they see — they
  // always see items[i] on their i-th tap.
  items: PickEmItem[]             // length 12
  themeTitle: string              // e.g. "THE BUNKHOUSE" (Lone Star)
}

type PickEmItem =
  | { type: 'credit', value_cents: number }   // pay this on reveal
  | { type: 'pick_plus_one' }                  // adds 1 more pick
  | { type: 'multiplier_2x' }                  // doubles all FUTURE credit reveals
  | { type: 'collect' }                        // ends the round
```

**Guarantees from the server about the reveal sequence:**

- `items` is exactly 12 long, in **tap order** (items[0] = first tap, items[11] = 12th-if-they-tap-that-far)
- `collect` is in position 2 or later (first 2 reveals are guaranteed to NOT be COLLECT — the round can't end on tap 1 or 2)
- The pool always contains exactly: 4× small-credit, 3× medium-credit, 2× large-credit, 1× pick_plus_one, 1× multiplier_2x, 1× collect.
- The server has already determined the total payout (the sum of credits revealed before COLLECT or picks-exhaustion, factoring in 2× multiplier timing). The sequence is engineered to produce that total.

### Output — events posted back

```ts
type PickEmEvent =
  | { type: 'pick_revealed'
      payload: {
        pickIndex: number             // 0-based, which slot was tapped
        itemRevealed: PickEmItem      // what it was
        runningTotalCents: number     // total credits won so far
        currentMultiplier: 1 | 2      // 2 if multiplier_2x has been hit
        remainingPicks: number        // picks left
      }
    }
  | { type: 'round_complete'
      payload: {
        reason: 'collect_revealed' | 'picks_exhausted' | 'all_items_revealed'
        totalWinCents: number
        pickHistory: Array<{ pickIndex: number; itemRevealed: PickEmItem }>
      }
    }
```

## Rules to implement client-side

> Note: these rules describe what your animation should DO based on the
> predetermined reveal sequence, not what computes the outcome. The
> outcome is already decided server-side.

- **`multiplier_2x`** — once revealed, doubles all FUTURE `credit` reveals in
  the same round. Track this state and apply it to subsequent credit values
  reported in `runningTotalCents`.
- **`pick_plus_one`** — increments the remaining-picks counter by 1 (player
  gets to tap one more door beyond `picksAwarded`).
- **`collect`** — ends the round immediately. Post `round_complete` with
  `reason: 'collect_revealed'`.
- **Picks exhausted** — when remaining_picks drops to 0, end the round.
  Post `round_complete` with `reason: 'picks_exhausted'`.
- **All items revealed** — defensive case. If somehow all 12 items are
  revealed before COLLECT and before picks_exhausted, end the round.

## Visual requirements

### Lone Star Country theme

- **Backdrop**: rustic bunkhouse interior — wooden walls, candle lighting, leather
- **Title**: "THE BUNKHOUSE" in serif gold gradient at top
- **Picks remaining counter**: prominent, like a brand on a beam: "PICKS LEFT: {n}"
- **Running total**: ledger/handwritten style at bottom: "Won: $X.XX"
- **The 12 doors**: arranged in a 3-column × 4-row grid. Each door:
  - Closed state: wooden bunkhouse door with brass number plate (1-12) and a small wooden handle
  - Slightly tilted/varied so they don't look identical
  - Hover state: handle glow
  - Tap → door swings open (CSS transform, ~400ms swing)
  - Open state: reveals contents based on item type:
    - `credit` → glowing pile of poker chips with $X.XX amount over them
    - `pick_plus_one` → a "+1 PICK" gold star with cursive text
    - `multiplier_2x` → a "2× MULTIPLIER" stamp/badge with rays
    - `collect` → a "COLLECT" wooden sign with chain/lock; dimmed/somber visual
  - After reveal: door stays open, content shown but greyed/faded
  - Disabled state: already-revealed doors don't accept taps

### Animations

- Door swing: 400ms cubic ease
- Coin/chip celebration on `credit` reveal: bouncing chips + sparkle
- `multiplier_2x` reveal: bright gold flash + a brief "ALL FUTURE CREDITS DOUBLE!" subtitle
- `collect` reveal: slower, dimmer fade-in; subtle "round over" pulse
- `pick_plus_one` reveal: gold star with "+1 PICK!" sparkle
- Round complete: full-screen celebration banner showing total, then unmount after 2-3s

### Audio

- `pick_open` — wooden door creak
- `credit_reveal` — coin chime, pitch rises with value
- `pick_plus_one_reveal` — bonus ding
- `multiplier_2x_reveal` — big gold "DING" + crowd cheer subtle
- `collect_reveal` — chain rattle, somber finalize tone
- `round_complete` — celebration fanfare (varies by total amount)
- Respect a `audioEnabled: boolean` flag (default true, host can pass false)

## Accessibility

- All interactive doors have `aria-label` with their position ("Door 1 of 12, closed")
- Pick announcements via `aria-live="polite"` region: "Door 5 revealed: $3.00 credit. Running total: $4.50."
- Keyboard nav: tab through doors, Enter/Space to open
- Respect `@media (prefers-reduced-motion)` — skip swing animations

## Mobile-first responsive

- Target viewport: 360–420px wide (cabinet/phone aspect)
- Doors scale to fit, maintain ~1:1 aspect on the door front
- Touch hit area at least 44×44px per door

## Deliverable

A single self-contained HTML file. All CSS and JS inline. No external
dependencies. Should work standalone if opened in a browser with a
sensible default mock config when no `init` postMessage arrives.

Drop at `previews/pickem-modal.html` (replacing the placeholder).

## Mock config for local dev / testing

Include a `?mock=1` URL flag that fires a default `init` automatically so
the modal can be tested in isolation. Example mock:

```js
const MOCK_CONFIG = {
  spinId: 'mock-spin-001',
  themeId: 'lone-star-country',
  picksAwarded: 7,
  betCents: 150,
  items: [
    { type: 'credit', value_cents: 150 },
    { type: 'credit', value_cents: 150 },        // ← collect can't be in positions 0 or 1
    { type: 'multiplier_2x' },
    { type: 'credit', value_cents: 450 },
    { type: 'credit', value_cents: 1500 },
    { type: 'pick_plus_one' },
    { type: 'credit', value_cents: 150 },
    { type: 'collect' },                          // ← appears from position 2+ only
    { type: 'credit', value_cents: 150 },
    { type: 'credit', value_cents: 450 },
    { type: 'credit', value_cents: 150 },
    { type: 'credit', value_cents: 150 },
  ],
  themeTitle: 'THE BUNKHOUSE',
}
```

## Theme support hooks

While Lone Star is the first theme, the brief assumes 5 more themes will
plug into the same modal. Architect the HTML so theme-specific bits
(colors, item art, backdrop, title text, audio pack) come from the
`themeId` field. Hard-coded Lone Star is fine for v1, but isolate the
theming into a swappable section near the top of the file.
