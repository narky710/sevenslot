# POG 510C — Multi-Game Cabinet Style Guide

> Drop this entire document into the **Design / Look** portion of your Claude Code prompt. It defines the visual identity for the **POG 510C** (Pot-O-Gold 510C) multi-game cabinet by **Leisure Time Technology, Inc.** (© 1986–1999), which ships with **16 games** spanning reel slots, video poker, keno, blackjack, bingo, lotto, and side-game formats. The cabinet aesthetic — royal blue field, chrome bezel, red touchscreen buttons, magenta paytable titles, yellow chunky multipliers — is **identical across every game**. Only the central play area changes.

---

## 1. Cabinet Identity

- **Cabinet:** Pot-O-Gold 510C (`POG_510C / R510POG2`)
- **Manufacturer:** Leisure Time Technology, Inc.
- **Copyright:** 1986–1999
- **Form factor:** Touchscreen multi-game arcade/8-liner cabinet, ~17–19" CRT or LCD.
- **Player flow:** Power on → attract loop → **Game Select Menu** → tap a game → play → tap EXIT GAME → return to menu.
- **Visual identity (locked across all games):**
  - Deep royal blue radial field with glass-screen glare.
  - Chrome / silver bezels and dividers with iconic chrome studs at intersections.
  - Red plastic-dome 3D touchscreen buttons; SPIN/DEAL/START always the visual anchor.
  - Magenta/pink display title font, yellow chunky multiplier font, white Oswald body text.
  - Pixel-art sprite symbols upscaled with gloss in gameplay; flatter pixel-art in paytables.
- **Feel:** Late-90s arcade. Glossy, slightly garish, heavy chrome, deep blues, hot reds. Not modern flat design — embrace bevels, gradients, reflective highlights, and the occasional jaggy sprite edge.

---

## 2. The Game Catalog

All 16 games on POG 510C, grouped by play pattern. Sections 11–17 cover each family in detail.

### Reel Slots (§11) — 3×3 grid, 8 paylines
- **Triple Sevens** (canonical reference, see §22)
- **Shamrock 7's** (Irish theme, green tint)
- **Respin 777** (gold-accented respin variant)
- **Respin Gold Row** (gold-row hold-and-respin)

### Video Poker (§12) — 5-card hand, hold/draw
- **Jacks or Better** (classic)
- **Deuces Wild** (2s wild)
- **Wild Jokers** (joker wild)

### Keno (§13) — 8×10 number grid
- **Touch Easy Keno**
- **Super Ball Keno**
- **Double-Up Keno**

### Blackjack (§14) — Dealer vs. player
- **Black Gold 21** (black-felt premium theme)
- **Spin Jack 21** (blackjack with a side-spin bonus reel)

### Bingo / Lotto (§15)
- **Super Gold Bingo** (5×5 card)
- **Super Pick Lotto** (number-pick lotto)

### Bonus / Side Games (§16)
- **Super Double-Up** (red/black card-flip double-or-nothing — also embeds inside other games as a win-doubler)
- **Spin Ball Bonus** (ball-drop / roulette-style bonus screen)

---

## 3. Canvas & Layout

Design at a base resolution of **1280 × 800** (~16:10, the standard POG 510C touchscreen). Layout scales proportionally.

### Universal screen template
Every screen — menu, slot, poker, keno, blackjack, paytable — uses the same three-zone layout:

```
┌──────────────────────────────────────────────────────────┐
│                                              ┌──────────┐│
│                                              │ EXIT GAME││
│        CENTRAL PLAY AREA                     ├──────────┤│
│        (game-specific)                       │   HELP   ││
│                                              ├──────────┤│
│                                              │   SHOW   ││
│                                              │ PAYTABLE ││
│                                              ├──────────┤│
│                                              │  CREDIT  ││
│                                              │   BET    ││
│                                              │   WIN    ││
│  [instruction text]      [game-specific action buttons]  │
└──────────────────────────────────────────────────────────┘
```

### Zone sizes
| Zone | Width | Height | Notes |
|---|---|---|---|
| Central play area | ~76% (left + center) | ~84% (top + middle) | What changes per game |
| Right control rail | ~24% | ~70% | EXIT/HELP/PAYTABLE + readouts |
| Bottom action bar | 100% | ~14% | Instruction + game-specific actions |

### Outer spacing
- Canvas padding: **24 px**
- Right-rail button gap: **14 px**
- Bottom-bar button gap: **10 px**

---

## 4. Color Palette

All tokens shared across every game. **Per-game theme tints** (§17) override only the cell-background or accent colors, never the chrome/button/text tokens.

### Background (royal blue field — default)
| Token | Hex | Use |
|---|---|---|
| `--bg-blue-deep` | `#0E1F6E` | Radial gradient outer |
| `--bg-blue-mid` | `#1A38B0` | Mid stop |
| `--bg-blue-bright` | `#2A56D8` | Center / light source |
| `--bg-blue-cell` | `#1C3AB3` | Solid cell fill inside reel/grid |

Background fill: **radial gradient** centered ~50% / 40%, `--bg-blue-bright → --bg-blue-mid → --bg-blue-deep` at edges.

### Chrome / silver bezel
| Token | Hex | Use |
|---|---|---|
| `--chrome-light` | `#F2F2F4` | Bezel top highlight |
| `--chrome-mid` | `#BFC2CC` | Bezel mid |
| `--chrome-shadow` | `#5C5F6B` | Bezel bottom shadow |
| `--chrome-edge` | `#2A2C34` | 1 px outer outline |

### Reds (buttons + symbols + accents)
| Token | Hex | Use |
|---|---|---|
| `--red-bright` | `#E51E1E` | Button face top, symbol fills |
| `--red-deep` | `#A50F0F` | Button face bottom |
| `--red-glow` | `#FF6262` | Specular highlight, idle glow |
| `--red-darkest` | `#4A0808` | Button outer ring |

### Golds / yellows
| Token | Hex | Use |
|---|---|---|
| `--gold-bright` | `#FFD93D` | Multiplier text, payline tags |
| `--gold-deep` | `#C99A1F` | Gold shadow side |
| `--gold-glow` | `#FFF089` | Active/winning highlight |

### Text / readouts
| Token | Hex | Use |
|---|---|---|
| `--text-white` | `#FFFFFF` | Primary text |
| `--text-cream` | `#FFF6D8` | Number readouts (credit/bet/win) |
| `--text-shadow` | `rgba(0,0,0,0.6)` | Drop-shadow under white-on-blue text |

### Paytable screen
| Token | Hex | Use |
|---|---|---|
| `--paytable-bg` | `#D0D0D0` | Light gray panel |
| `--paytable-cell` | `#E8E8E8` | Symbol plaque on paytable |
| `--paytable-title` | `#C825A0` | Magenta title + JACKPOT text |
| `--paytable-footer-text` | `#404040` | Dev string + copyright |

### Card / felt (poker & blackjack)
| Token | Hex | Use |
|---|---|---|
| `--card-face` | `#FAFAF2` | Card face |
| `--card-edge` | `#1A1A1A` | Card border |
| `--card-back-blue` | `#2A56D8` | Card back (matches cabinet blue) |
| `--card-back-pattern` | `#0E1F6E` | Card back diamond pattern |
| `--suit-red` | `#D62828` | Hearts / Diamonds |
| `--suit-black` | `#1A1A1A` | Spades / Clubs |
| `--felt-green` | `#0A5C2A` | Default blackjack felt |
| `--felt-blackgold` | `#0A0A0A` | Black Gold 21 felt |

### Game-specific accents (used in §17 theme tints)
| Token | Hex | Use |
|---|---|---|
| `--shamrock-green` | `#1E7A2C` | Shamrock 7's accent |
| `--shamrock-gold` | `#F5C520` | Shamrock 7's gold trim |
| `--joker-purple` | `#5A2A8C` | Wild Jokers accent |
| `--joker-magenta` | `#C825A0` | Wild Jokers jester contrast |
| `--keno-blue-glow` | `#3DCEFF` | Drawn keno number glow |

---

## 5. Typography

| Role | Font | Weight | Size | Notes |
|---|---|---|---|---|
| Display title (game name on menu, "TRIPLE SEVENS PAYTABLE", etc.) | `Anton` (Google Fonts) | 400 | 36–48 px | All caps, wide letter-spacing (4–8 px), magenta or color-themed |
| Big symbol "7" | `Anton` / `Oswald` 900 / `Arial Black` | 900 | 110 px | Italic skew, 3D extrude |
| BAR plaque text | `Anton` / `Arial Black` | 900 | 20 px | Letter-spacing 2 px, red on cream |
| Button labels (EXIT GAME, SPIN, DEAL, etc.) | `Oswald` | 800 | 22–26 px | All caps, slight shadow |
| Readout labels (CREDIT, BET, WIN) | `Oswald` | 800 | 18 px | All caps |
| Readout values ($138.25) | `Oswald` | 800 | 24 px | Tabular numerals, cream |
| Multiplier numbers (X10000, X25) | `Anton` | 400 | 32–40 px | Yellow with black stroke |
| Instruction text | `Oswald` | 700 | 14 px | All caps |
| Payline / payout small text | `Oswald` | 800 | 14–16 px | Bold |
| Dev/copyright meta | `VT323` (Google Fonts) | 400 | 14 px | Monospace, dark gray |
| Card pip values (A, K, Q, J, 10, etc.) | `Georgia` (serif fallback) or `Playfair Display` | 700 | 28 px | Classic playing-card serif |

**Text effects (universal):**
- White on blue: 2 px black drop shadow @ 60% alpha.
- Symbol "7" and "BAR": 2 px dark inner shadow + 1 px white top highlight.
- Button labels: 1 px dark text shadow below.
- Yellow multipliers: 1.5 px black `text-stroke` for the chunky outlined look.

---

## 6. The Cabinet Chrome (universal frame)

This is the persistent visual frame around every screen. Reuse component for menu, slot, poker, keno, etc.

### Outer bezel
- Thickness: **22 px** around the active screen content.
- Layered chrome look (outside → inside):
  1. 1 px outer line: `--chrome-edge`
  2. Linear gradient face: `--chrome-light` (top) → `--chrome-mid` (middle) → `--chrome-shadow` (bottom)
  3. 1 px inner shadow line: `--chrome-shadow`
- Corner radius: **6 px** (slightly rounded).

### Internal dividers (used in 3×3 reel grids, keno grids, etc.)
- Thickness: **14 px**
- Same gradient as bezel but mirrored to look raised.
- At grid intersections, render a small inset chrome **stud** (8 px circle) — this is iconic to POG cabinets.

### Glass screen overlays (applied to every screen)
1. **Screen glare:** very subtle diagonal white-to-transparent gradient (5% max opacity) top-left to bottom-right.
2. **CRT vignette:** radial gradient darkening corners by ~15%.
3. **Idle shimmer (optional):** every ~6 s, a thin white gradient line sweeps across the chrome bezel left-to-right in 700 ms.

---

## 7. Buttons (universal red 3D button)

The signature touchscreen button. Used everywhere: right rail, action bar, paytable footer, blackjack actions, keno actions.

### Base style (`.btn-red`)
- **Shape:** rounded rectangle, radius **10 px**.
- **Default size:** ~180 × 70 px (right rail); ~110 × 70 px (action bar); ~140 × 74 px (`spin` modifier).
- **Face:** linear gradient `--red-bright` (top) → `--red-deep` (bottom).
- **Top highlight:** 18%-tall pseudo-element with `linear-gradient(180deg, rgba(255,255,255,0.45), transparent)` for the glass dome.
- **Border:** 2 px outer ring in `--red-darkest`.
- **Drop shadow:** `0 4px 0 #5C0808, 0 6px 10px rgba(0,0,0,0.4)` — hard offset plastic-button shadow.
- **Text:** white, `Oswald` 800, 22 px, all caps, 1 px dark shadow below.
- **Press feedback:** translate down 4 px, remove the `0 4px 0` shadow.

### Variants
| Modifier | Use |
|---|---|
| `.spin` / `.deal` / `.start` | Primary action; 1.1× scale, idle red glow |
| `.yellow-text` | Paytable footer buttons (yellow `--gold-bright` text instead of white) |
| `.two-line` | Stacked label ("PREVIOUS / PAGE", "MAX / BET") |
| `.bet-arrow` | Up/down arrow above "BET" |
| `.small` | Reduced height for keno number selectors |

### Special: Hold buttons (video poker)
Same `.btn-red` style with `.hold` modifier:
- Width matches card width (~120 px).
- Two-state: idle (red), held (`--gold-bright` background with black "HELD" text, gold glow).

### Special: Number buttons (keno / lotto)
Square `.btn-red` 56 × 56 px with the number centered in white `Oswald` 800 28 px. Active state swaps to `--gold-bright` background.

---

## 8. Right Control Rail (universal)

A vertical stack persistent on every game screen.

### Stack order (top → bottom)
1. **EXIT GAME** — returns to the Game Select Menu (§10)
2. **HELP** — opens contextual help overlay
3. **SHOW PAYTABLE** — opens the per-game paytable screen (§18)
4. **Readout block** (below the buttons, not a button)
   - `CREDIT $XXX.XX`
   - `BET    $  X.XX`
   - `WIN    $XXX.XX`

### Readout block
- Width ~220 px, labels left-aligned in white, values right-aligned in `--text-cream`.
- Monospace alignment so decimal points line up.
- Each row separated by a 1 px white line at 10% alpha.

---

## 9. Bottom Action Bar (game-specific actions)

Universal layout:
- **Left:** instruction text (2 lines, white, 14 px, all caps, max ~280 px wide).
- **Right:** game-specific action buttons (right-aligned), 10 px gap.

### Per-game action sets
| Game family | Buttons (left to right) | Notes |
|---|---|---|
| Reel slots | BET ▼, BET ▲, MAX BET, SPIN | SPIN is the anchor |
| Video poker | BET ▼, BET ▲, MAX BET, DEAL / DRAW | DEAL/DRAW toggles depending on hand state |
| Keno | CLEAR PICKS, AUTO PICK, BET ▼, BET ▲, START | START is the anchor |
| Blackjack | DEAL, HIT, STAND, DOUBLE, SPLIT | Disabled state for inactive actions |
| Bingo | BET ▼, BET ▲, NEW CARD, DAUB ALL, CALL | "CALL" is the anchor |
| Lotto | QUICK PICK, CLEAR, BET, PLAY | |
| Super Double-Up (bonus) | RED, BLACK, COLLECT | RED/BLACK side-by-side as the primary choice |
| Spin Ball Bonus | SPIN, STOP, COLLECT | Sometimes just SPIN |

---

## 10. Game Selection Menu (POG 510C boot screen)

When the cabinet starts (or when EXIT GAME is tapped), the player sees a **menu screen** with 16 tiles.

### Layout
- **Title bar (top):** "POT-O-GOLD" in magenta `Anton` 56 px with letter-spacing 6 px, centered. Subtitle "SELECT A GAME" in cream `Oswald` 18 px below.
- **4 × 4 tile grid:** 16 game tiles, ~240 × 130 px each, with 16 px gap.
- **Footer (bottom right):** the same right-rail readouts (CREDIT only — no BET/WIN on menu) and a single red **HELP** button.
- **Background:** the standard royal blue radial field with a faint POG logo watermark at 6% opacity behind the grid.

### Game tile (`.game-tile`)
- **Frame:** chrome bezel (same as reel bezel but 6 px thick).
- **Interior:** royal-blue cell with a small **icon** (16 × 16 px sprite or SVG) and the **game name** in `Oswald` 700 18 px, white, all caps, centered. Newly added games can show a yellow "NEW" pill in the top-right corner.
- **Hover/press:** chrome shimmers (one shimmer sweep) and the interior cell brightens to `--bg-blue-bright`.
- **Optional:** a tiny progress dot row at the bottom of each tile showing "play credits remaining" if applicable.

### Tile icons
Use a representative symbol from each game:
| Game | Icon |
|---|---|
| Triple Sevens | Red 7 |
| Shamrock 7's | Green shamrock |
| Respin 777 | Three small gold 7s |
| Respin Gold Row | Gold bar with "ROW" arrow |
| Jacks or Better | Jack playing card |
| Deuces Wild | 2 of hearts |
| Wild Jokers | Joker face |
| Super Pick Lotto | Lotto ball |
| Touch Easy Keno | Keno grid icon |
| Super Ball Keno | Numbered ball |
| Double-Up Keno | "K×2" badge |
| Super Gold Bingo | "B" letter on yellow card |
| Black Gold 21 | Black A♠ |
| Spin Jack 21 | A♠ + tiny spin reel |
| Super Double-Up | Two cards flipping (red/black) |
| Spin Ball Bonus | White ball + arrow |

### Menu layout grid (recommended visual order)
```
[ Triple Sevens ] [ Shamrock 7's ] [ Respin 777 ]      [ Respin Gold Row ]
[ Jacks/Better  ] [ Deuces Wild  ] [ Wild Jokers ]    [ Super Pick Lotto ]
[ Touch Keno    ] [ Super Ball K ] [ Double-Up K ]    [ Super Gold Bingo ]
[ Black Gold 21 ] [ Spin Jack 21 ] [ Super DoubleUp ] [ Spin Ball Bonus  ]
```

---

## 11. Reel-Slot Games — Layout & Mechanics

Used by **Triple Sevens**, **Shamrock 7's**, **Respin 777**, **Respin Gold Row**.

### 11.1 Reel bezel + grid (universal across all 4)
- 3 columns × 3 rows, cells **180 × 180 px** on 1280×800 canvas.
- 22 px chrome bezel, 14 px internal dividers, chrome studs at the 4 internal intersections.
- Cell fill: `--bg-blue-cell` with a soft top-left radial highlight.
- 8 fixed paylines (3 rows + 3 columns + 2 diagonals).

### 11.2 Payline indicators
- Gold tag boxes around the perimeter of the grid (34 × 28 px each, gradient `--gold-bright → --gold-deep`).
- Labels show payline number / bet level (e.g., "1/5", "5/5").
- Active payline glows `--gold-glow` and pulses at 1 Hz.

### 11.3 Win-line overlay
- Red stroke (6 px) with 8 px outer glow at 60% alpha, drawn across the 3 winning cells.
- Diagonal, horizontal, or vertical based on which payline hit.

### 11.4 Reel spin animation
- Each column scrolls vertically with 6 px Y-axis motion blur.
- Stop times stagger: col 1 stops first, col 2 ~400 ms later, col 3 ~800 ms later.
- Easing: `cubic-bezier(0.2, 0.8, 0.2, 1)`.

### 11.5 Per-game variations
| Game | What changes | Theme |
|---|---|---|
| **Triple Sevens** | Default. Full 14-symbol set (see §22). | Royal blue field, no theme tint. |
| **Shamrock 7's** | Symbol set swaps: 7s → green 7s with shamrock topper; one fruit slot replaced by a **gold shamrock** bonus symbol; Bell stays. | **Tint:** background uses `--shamrock-green` accents on the bezel edges and a tiled four-leaf-clover watermark at 5% behind the cells. |
| **Respin 777** | Adds a **hold-and-respin** mechanic: after a partial 7-line, the matching 7s lock with a gold border, and only the missing reel respins. UI shows a "RESPIN" badge in the top-left corner during this state. | Default blue, gold accents on locked cells. |
| **Respin Gold Row** | Like Respin 777 but specifically rewards filling an **entire row** of gold-tier symbols. A "GOLD ROW" indicator lights up along whichever horizontal row completed. | Gold-row highlight uses `--gold-bright` glow under the row. |

---

## 12. Video Poker Games — Layout & Mechanics

Used by **Jacks or Better**, **Deuces Wild**, **Wild Jokers**.

### 12.1 Hand layout
- **5 cards** centered in the play area, left-to-right.
- Card size: **150 × 220 px**, 12 px gap between cards.
- A **HOLD button** sits directly below each card (same width as card, 50 px tall).

### 12.2 Card design (universal — also reused by blackjack)
- **Face:** `--card-face` background, **8 px rounded corners**, 2 px `--card-edge` border.
- **Pip layout:** classic four-corner layout (top-left + bottom-right rotated 180°), with the rank letter and suit pip stacked, plus a large center suit pip.
- **Suit colors:** `--suit-red` for hearts/diamonds, `--suit-black` for spades/clubs.
- **Rank font:** `Georgia` or `Playfair Display` 700, 28 px (corner) / 64 px (center).
- **Card back:** `--card-back-blue` field with a tight diamond grid in `--card-back-pattern`, 1 px lines, plus a 4 px inner gold frame.

### 12.3 Hold button states
- **Idle:** standard red `.btn-red` with "HOLD" label.
- **Held:** `--gold-bright` background, "HELD" in black `Oswald` 800, with a `--gold-glow` outer glow.
- Press toggles the state.

### 12.4 Deal / Draw button (action bar)
- Single button labeled **DEAL** before a hand, swaps to **DRAW** after holds are selected.
- Uses the `.spin` button styling (anchor button).

### 12.5 Paytable strip
- Above the hand (or to the left), a small persistent paytable lists payouts for the current bet level.
- Hand names: Royal Flush, Straight Flush, Four of a Kind, Full House, Flush, Straight, Three of a Kind, Two Pair, Jacks or Better (or game-specific lowest hand).
- Each row: hand name (white) | payout multiplier (yellow `--gold-bright` with black stroke).
- Highlighted row when the current hand qualifies (background pulses gold).

### 12.6 Per-game variations
| Game | Wildcards | Lowest paying hand | Notes |
|---|---|---|---|
| **Jacks or Better** | None | Pair of Jacks | Classic 9/6 style paytable |
| **Deuces Wild** | Four 2s | Three of a Kind | Add "Natural Royal Flush" and "Four Deuces" top tiers |
| **Wild Jokers** | One Joker | Two Pair (Kings or Better) | Joker card has a purple `--joker-purple` background with a smiling jester face; standout in the deck |

### 12.7 Joker card design (Wild Jokers only)
- Background: `--joker-purple` with `--joker-magenta` diamond pattern.
- Centered illustration: a stylized jester face — three-pointed hat with bell tips (cream), classic comedy/tragedy smiling face, vibrant colors.
- "JOKER" text in cream `Anton` along top and bottom edges.

---

## 13. Keno Games — Layout & Mechanics

Used by **Touch Easy Keno**, **Super Ball Keno**, **Double-Up Keno**.

### 13.1 The 8 × 10 grid
- 80 number tiles arranged in 8 columns × 10 rows (numbers 1–80).
- Tile size: **64 × 56 px**, 4 px gap.
- Chrome-framed (same bezel style as reel grid but lighter — 10 px thickness).
- Tile background: `--bg-blue-cell`, white number in `Oswald` 800 24 px.

### 13.2 Tile states
- **Unselected:** dark blue, white number.
- **Selected (player pick):** `--gold-bright` background, black number, with a 2 px gold glow.
- **Drawn (game pick):** `--keno-blue-glow` cyan background, white number with cyan glow halo. Animated draw-in (scale 0 → 1.1 → 1.0, 300 ms).
- **Hit (selected + drawn):** combined gold + cyan with a `--gold-glow` outer ring and a small white star sparkle.

### 13.3 Side panel
- A narrow strip to the right of the keno grid (within the play area, not in the right rail) shows:
  - Number of picks selected (e.g., "PICKS: 7 / 10")
  - Number of hits so far ("HITS: 3")
  - Current payout based on hits ("PAY: ×15")
  - Mini paytable for the current pick count

### 13.4 Action bar buttons
`CLEAR PICKS` · `AUTO PICK` · `BET ▼` · `BET ▲` · `START`

### 13.5 Per-game variations
| Game | Twist |
|---|---|
| **Touch Easy Keno** | Standard keno, the "easy touch" UI baseline. |
| **Super Ball Keno** | Adds a "Super Ball" — one drawn number is highlighted with a 3D animated ball icon; if it's a hit, the payout doubles. |
| **Double-Up Keno** | After any win, player can enter Super Double-Up (§16) to risk the win on a red/black card flip. |

### 13.6 Drawn-ball animation (Super Ball Keno)
- A glossy white sphere with the number stamped on it bounces in from off-screen, settles on the tile, then flashes.
- Use CSS `transform` translateY + scale keyframes for the bounce.

---

## 14. Blackjack Games — Layout & Mechanics

Used by **Black Gold 21**, **Spin Jack 21**.

### 14.1 Felt layout
- Central play area shows a **green felt** semicircle (`--felt-green`) for standard 21, or **black felt** (`--felt-blackgold`) with gold trim for Black Gold 21.
- Dealer's hand at top, player's hand at bottom, both centered horizontally.
- Cards overlap horizontally with a 50 px stagger (the classic fanned-hand look).

### 14.2 Hand readouts
- **Dealer total** in white `Anton` 32 px above the dealer's cards (hidden on the dealer's hole card until reveal).
- **Player total** in `--gold-bright` `Anton` 32 px below the player's cards.
- Bust (>21): flash red, then "BUST" stamp in red across the hand.
- Blackjack (21 on 2 cards): "BLACKJACK!" stamp in gold across the player's hand with a pulse.

### 14.3 Action bar
`DEAL · HIT · STAND · DOUBLE · SPLIT`
- Disabled actions render at 40% opacity and don't respond to touch.
- DEAL becomes the anchor button before a hand; STAND becomes the anchor during a hand.

### 14.4 Card design
Reuse video poker card style (§12.2). Cards are slightly smaller (130 × 190 px) to fit fanned hands.

### 14.5 Per-game variations
| Game | Twist |
|---|---|
| **Black Gold 21** | Black felt, gold trim everywhere (chrome bezels swap a gold tint via `--gold-deep`), gold "21" stamp when player hits 21. |
| **Spin Jack 21** | Standard green felt **plus** a small side reel (~200 × 220 px to the right of the player's hand) that spins when DEAL is pressed. The reel result applies a bonus multiplier to the hand if player wins (×2, ×3, or "BUST PROTECT"). |

### 14.6 Spin Jack side-reel
- Vertical 3-position reel showing the multiplier symbols.
- Same chrome bezel as the main reel slots but smaller (8 px bezel, 6 px studs).
- Visible during the entire hand; landed multiplier highlighted with `--gold-glow`.

---

## 15. Bingo & Lotto Games — Layout & Mechanics

### 15.1 Super Gold Bingo (5 × 5 card)
- 5 × 5 grid in the play area.
- Top header bar: 5 columns labeled **B – I – N – G – O** in `Anton` 36 px, alternating gold/white.
- Card cells: `--bg-blue-cell` with a number centered in white `Oswald` 800 28 px.
- Center cell ("FREE"): permanent gold `--gold-bright` square with a tiny gold star.
- Called numbers: cell background switches to `--gold-bright`, number becomes black.
- Winning line (any row/col/diag): all 5 cells pulse with a gold glow ring and the connecting line draws across in red (same payline style as slot wins).

#### Caller readout
- Above or beside the card: the last 5 called numbers in a scrolling strip.
- Current call: huge `Anton` 96 px gold number with a `BINGO` letter prefix (e.g., "B 12", "N 41").

### 15.2 Super Pick Lotto
- Similar to Keno but smaller pick range (typically 1–49 or 1–60).
- 7 × 7 or 7 × 9 grid of number tiles, same tile design as Keno.
- Player picks 6 numbers (or game-defined count); machine draws the matching count.
- Side panel shows pick count and matching payout.
- Action bar: `QUICK PICK · CLEAR · BET · PLAY`

---

## 16. Bonus / Side Games

### 16.1 Super Double-Up
Also embeds inside other games as a "double your win" option after any payout.

#### Layout
- Single large card flipped face-down in the center, ~280 × 420 px.
- Behind it: the four previously revealed cards in a small row above (for context).
- Two giant action buttons centered below: **RED** (`--red-bright`) and **BLACK** (`--card-edge` near-black with red outline).
- COLLECT button to the right of RED/BLACK to cash out the current win.

#### Game flow
- Player taps RED or BLACK.
- Card flips with a 3D flip animation (CSS `rotateY` 600 ms).
- Win → win is doubled and a new card appears for the next round (up to a max round count).
- Loss → win is lost, game returns to the parent game.

#### Visual emphasis
- The face-down card back uses `--card-back-blue` with a `--gold-bright` "?" centered.
- On flip: face card revealed with classic playing-card design.
- Win flash: full screen gold flash + "WIN DOUBLED" text in magenta `Anton` 56 px.

### 16.2 Spin Ball Bonus

#### Layout
- Central area shows a **roulette-style wheel** (or pachinko ball drop) — vary by implementation.
- Wheel ~480 px diameter, divided into 12–16 colored segments labeled with prize amounts (multiplied bet) and a "BUST" segment.
- A small ball indicator above the wheel.

#### Wheel design
- Concentric rings:
  1. Outer chrome bezel (matches cabinet).
  2. Numbered prize segments (gold and royal-blue alternating, with the magenta `--paytable-title` BUST segment standing out).
  3. Inner hub with the "POG" logo or game logo.
- Active segment under the ball pointer: `--gold-glow` highlight.

#### Animation
- SPIN: wheel rotates with a `cubic-bezier(0.1, 0.9, 0.4, 1.0)` ease-out over 4–6 seconds.
- Ball jitter: small horizontal bounce on the pointer once the wheel slows.

#### Action bar
`SPIN · STOP · COLLECT`

---

## 17. Per-Game Theme Tints

Each game keeps the cabinet aesthetic (chrome bezel, red buttons, magenta paytable titles, etc.) but can apply a light **theme tint** to the play-area background and accents. Tints **only override**:
- Cell background fill (instead of `--bg-blue-cell`).
- Optional thin accent ring around the chrome bezel.
- Optional thematic watermark behind the play area (max 8% opacity).

**Tints never change:** chrome, red buttons, gold multipliers, magenta titles, text colors. Those are sacred.

| Game | Cell tint | Accent ring | Watermark |
|---|---|---|---|
| Triple Sevens | `--bg-blue-cell` (default) | none | none |
| Shamrock 7's | Mix 80% `--bg-blue-cell` + 20% `--shamrock-green` → `#1F4A8F` | thin `--shamrock-gold` ring inside chrome bezel | Four-leaf clover tile pattern, 6% opacity |
| Respin 777 | default blue | thin `--gold-bright` ring on locked cells | none |
| Respin Gold Row | default blue | `--gold-bright` glow under the active row | "GOLD ROW" banner pixel-art |
| Jacks or Better | default blue | none | playing-card suit watermark, 5% |
| Deuces Wild | default blue | none | giant "2" watermark behind the hand |
| Wild Jokers | Mix 80% default + 20% `--joker-purple` → `#2F2C9A` | `--joker-magenta` ring | jester silhouette watermark |
| Touch Easy Keno | default blue | none | "K" grid watermark |
| Super Ball Keno | default blue | none | sparse white-circle ball pattern |
| Double-Up Keno | default blue | none | "×2" repeated watermark |
| Black Gold 21 | swap to black `#1A1A1A` | gold ring + gold trim on bezel highlights | gold "21" embossed |
| Spin Jack 21 | default blue (green felt area is felt color) | none | none |
| Super Gold Bingo | default blue | `--gold-bright` ring | "BINGO" letters watermark |
| Super Pick Lotto | default blue | none | lotto-ball pattern |
| Super Double-Up | default blue (but the card area dominates) | red/black split background optional | none |
| Spin Ball Bonus | default blue | none | wheel segment pattern |

---

## 18. Paytable Screen (universal pattern)

Every game has a paytable accessible via the right-rail **SHOW PAYTABLE** button. The structure is identical across games; only the content differs.

### Layout
- **Background:** `--paytable-bg` light gray panel with chrome inner frame.
- **Title:** `"[GAME NAME]   PAYTABLE"` in `--paytable-title` magenta `Anton` 42 px, centered, with 8 px letter-spacing and a soft black drop shadow.
- **Body:** payout rows in 1 or 2 columns.
- **Footer:** three red buttons with **yellow** text: `PREVIOUS PAGE · NEXT PAGE · EXIT HELP`
- **Meta strings (bottom corners):**
  - Bottom-left: `POG_510C/R510POG2 IND B:01 G:000001` in `VT323` 14 px dark gray.
  - Bottom-right: `© 1986-99 LEISURE TIME TECH., INC` in `VT323` 14 px dark gray.

### Payout row format
- For slot/bingo: three symbol plaques + "X" + multiplier (yellow chunky).
- For poker: hand name (white serif) + payout per bet (yellow chunky), with the current bet column highlighted.
- For keno: pick count + match count + payout (multi-column matrix).
- For blackjack: rules summary + side-bet payouts.

### Jackpot row (special)
For games with a top jackpot (Triple Sevens, Shamrock 7's, Wild Jokers Royal, etc.):
- Magenta "JACKPOT" text in `Anton` 24 px.
- Subtitle "WITH X CREDITS BET" in dark `Oswald` 700 11 px.
- Yellow chunky multiplier (e.g., `X10000`) below.

---

## 19. Visual Effects & Polish (universal)

1. **Screen glare:** subtle diagonal white-to-transparent gradient (5% opacity) across the entire canvas.
2. **CRT vignette:** corners darkened ~15% via radial gradient.
3. **Idle shimmer:** chrome bezel shimmer sweep every ~6 seconds.
4. **Button press:** translate-down 4 px, remove `0 4px 0` shadow.
5. **Win celebration (any game):**
   - Pulse winning symbols/cards (scale 1.0 → 1.08 → 1.0, 600 ms loop).
   - Draw win-line overlay (slot/bingo).
   - Flash matching payline/payout row.
   - WIN amount in readout counts up from 0 to final value (~1.2 s).
6. **Big-win celebration (≥ 50× bet):**
   - Full-screen `--gold-glow` flash (180 ms).
   - "BIG WIN!" stamp in magenta `Anton` 96 px center-screen.
   - Coin-shower particle effect (small gold circles falling from top).
7. **Jackpot celebration (top-tier win):**
   - Multiple rapid screen flashes alternating gold/magenta.
   - "JACKPOT!" stamp 144 px, persistent for 4 seconds.
   - Cabinet sound: extended arpeggio with coin shower.

---

## 20. Sound (reference, not visual)

| Event | Sound |
|---|---|
| Reel spin | classic whirring, mid-pitched |
| Reel stop | three short "tk-tk-tk" thuds, staggered per column |
| Card deal | quick "fwip" per card |
| Card flip (Super Double-Up) | crisp single flip sound |
| Keno number draw | low "thunk" per ball |
| Button press | dry "click" |
| Small win | three ascending chimes |
| Big win | arcade coin shower + ascending arpeggio |
| Jackpot | extended fanfare + persistent coin shower |
| Bust / loss | descending sad-trombone (subtle) |

---

## 21. Implementation Notes for Claude Code

- **Stack:** HTML + CSS + vanilla JS for prototyping; React + Tailwind acceptable for production.
- **SVG everywhere:** all symbols, card pips, icons as inline SVG with `<symbol>` defs. Never raster.
- **CSS variables:** all colors from §4 as `:root` custom properties. Per-game tints override only the cell-bg and accent variables.
- **Cabinet shell as a component:** wrap every screen in a `<Cabinet>` component that provides the chrome frame, right rail, bottom action bar slots, and glass-screen overlays. Each game is a child that fills the central play area.
- **Aspect ratio:** lock to 16:10, scale via `transform: scale()` to fit viewport.
- **State management:** keep per-game state in component-scoped React state; persist credit balance across games via a top-level store (or in-memory only if running in a sandbox without browser storage).
- **No browser storage** in sandboxed/artifact environments — keep all state in memory.
- **Accessibility:** real `<button>` elements with `aria-label` for every interactive control; decorative chrome and gloss `aria-hidden="true"`.
- **Animation:** CSS `transform` + `transition` for buttons and tile states; `requestAnimationFrame` for reel spin and wheel rotation.

---

## 22. Worked Example — Triple Sevens

The canonical implementation of the reel-slot template. Below is the full Triple Sevens spec. **Use this as the template** when implementing the other three reel slots (Shamrock 7's, Respin 777, Respin Gold Row) — swap symbol art and apply theme tints from §17.

### 22.1 Complete symbol set (14 symbols)

#### The "7" family (5 variants)
All share the same italic blocky base shape (~12° skew, thick top bar, tapered diagonal stem, 2 px black outline, white top-left highlight, dark inner shadow on bottom-right). They differ only in color and topper.

| Variant | Body color | Topper | Notes |
|---|---|---|---|
| **Crown Blue 7** (jackpot) | royal blue gradient | Tall ornate **crown** with three peaks and tiny gold gem dots | Slightly taller; add faint cream halo glow |
| **Winged Blue 7** | royal blue gradient | Horizontal **flange / wings** extending past top bar | Smaller topper than crown |
| **Plain Blue 7** | royal blue gradient | none | The base Blue 7 |
| **Silver 7** | chrome gradient | none | Uses the same chrome ramp as the bezel |
| **Red 7** | red gradient | none | Classic candy red |

#### The BAR family (3 variants)
Each BAR plaque: cream/gold rectangle (gradient `#F4ECC8 → #D9CFA0`), 2 px black outline, rounded corners, the word **BAR** in `--red-bright` `Anton` 20 px letter-spacing 2 px.
- **Triple BAR:** 3 plaques stacked
- **Double BAR:** 2 plaques stacked
- **Single BAR:** 1 plaque centered

#### Bell
Gold dinner bell with brown handle, cream highlight, dark mouth opening at the bottom, tiny clapper. 2 px black outline.

#### Fruit (6 symbols)
| Symbol | Construction |
|---|---|
| **Apple** | Round red body, green leaf top-right, brown stem, light pink specular |
| **Watermelon** | Triangular wedge: green rind → lighter stripe → pink flesh with black seeds |
| **Orange** | Round orange body with **prominent green leaf** upper-right, subtle segment arcs |
| **Plum** | Oval purple body with tiny brown stem nub, no visible leaf, subtle vertical groove |
| **Lemon** | Yellow oval with pointed tips top-right and bottom-left, pale highlight |
| **Cherries** | Two red orbs on a shared Y-stem with one or two green leaves at the joint |

### 22.2 Official Triple Sevens paytable

**Left column — 7s, Bells, BARs**
| Combo (3 in a line) | Payout |
|---|---|
| 3× Crown Blue 7 *(with 16 credits bet)* | **×10,000** (Jackpot) |
| 3× Winged Blue 7 | ×1,000 |
| 3× Plain Blue 7 | ×1,000 |
| 3× Silver 7 | ×1,000 |
| 3× Red 7 | ×1,000 |
| 3× Any Seven (mixed) | ×500 |
| 3× Bell | ×100 |
| 3× Triple BAR | ×50 |
| 3× Double BAR | ×40 |
| 3× Single BAR | ×30 |

**Right column — Fruit + Any BAR + Cherries**
| Combo (3 in a line) | Payout |
|---|---|
| 3× Apple | ×25 |
| 3× Watermelon | ×15 |
| 3× Orange | ×10 |
| 3× Plum | ×10 |
| 3× Lemon | ×10 |
| 3× Any BAR (mixed) | ×10 |
| 3× Cherries | ×8 |
| 2× Cherries (first 2 positions) | ×5 |
| 1× Cherries (first position only) | ×2 |

### 22.3 Symbol inventory (JS data)

```js
const TRIPLE_SEVENS_SYMBOLS = [
  { id: '7_crown_blue',  name: 'Crown Blue Seven',  payout: 10000, jackpot: true },
  { id: '7_winged_blue', name: 'Winged Blue Seven', payout: 1000 },
  { id: '7_plain_blue',  name: 'Plain Blue Seven',  payout: 1000 },
  { id: '7_silver',      name: 'Silver Seven',      payout: 1000 },
  { id: '7_red',         name: 'Red Seven',         payout: 1000 },
  { id: 'bar_triple',    name: 'Triple BAR',        payout: 50 },
  { id: 'bar_double',    name: 'Double BAR',        payout: 40 },
  { id: 'bar_single',    name: 'Single BAR',        payout: 30 },
  { id: 'bell',          name: 'Bell',              payout: 100 },
  { id: 'apple',         name: 'Apple',             payout: 25 },
  { id: 'watermelon',    name: 'Watermelon',        payout: 15 },
  { id: 'orange',        name: 'Orange',            payout: 10 },
  { id: 'plum',          name: 'Plum',              payout: 10 },
  { id: 'lemon',         name: 'Lemon',             payout: 10 },
  { id: 'cherries',      name: 'Cherries',          payout: [2, 5, 8] }, // for 1/2/3 in a line
];
```

---

## 23. Don't / Do (universal)

| ❌ Don't | ✅ Do |
|---|---|
| Use flat modern UI (Material, iOS) | Heavy bevels, gradients, chrome |
| Pastel or muted colors | Saturated reds, deep blues, bright gold, hot magenta |
| Thin sans-serif typography | Heavy condensed/italic display fonts (Anton, Oswald 800) |
| Fully rounded pill buttons | Slightly rounded rectangles (10 px radius) |
| Soft blurred drop shadows | Sharp offset shadows (`0 4px 0`) for plastic buttons |
| Subtle hover states | Bold press feedback, glow, pulse |
| Realistic photo fruit / cards | Cartoonish vector/pixel sprites with 2 px outlines |
| Modern typographic numerals | Italic, blocky, slot-machine "7"s with 3D extrude |
| Per-game UI reinvention | Cabinet shell is sacred; only the play area changes |
| Mute the cabinet between games | Always render chrome, right rail, action bar — never blank screen |

---

**End of style guide.** This document is the design contract for **all 16 games** on the POG 510C cabinet. The cabinet shell, color palette, typography, buttons, chrome, and paytable pattern are sacred across every game. Per-game-family layouts (§§11–16) define the play area; per-game theme tints (§17) define optional accent variations. Triple Sevens (§22) is the worked example.
