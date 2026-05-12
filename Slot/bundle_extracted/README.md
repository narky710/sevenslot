# POG 510C Cabinet Design Project — Handoff

## What this is
A design and reference package for recreating the **Pot-O-Gold 510C** multi-game arcade cabinet by Leisure Time Technology, Inc. (© 1986–1999). The final goal is to hand this package to a build agent (Claude Code or similar) which will produce a playable web mockup of all 16 games. This intermediate handoff is for a **research agent** to fill in the visual and mechanical gaps before the build phase begins.

## The 16 games on the board
**Reel slots:** Triple Sevens, Shamrock 7's, Respin 777, Respin Gold Row
**Video poker:** Jacks or Better, Deuces Wild, Wild Jokers
**Keno:** Touch Easy Keno, Super Ball Keno, Double-Up Keno
**Blackjack:** Black Gold 21, Spin Jack 21
**Bingo / Lotto:** Super Gold Bingo, Super Pick Lotto
**Bonus:** Super Double-Up, Spin Ball Bonus

## What's in this folder
| File | Purpose |
|---|---|
| `README.md` | This file — project context and status |
| `PROMPT.md` | Research instructions for the next agent |
| `pog510c-style-guide.md` | The visual design contract (777 lines) — color palette, typography, cabinet shell, per-family layouts, theme tints, paytable pattern, Triple Sevens worked example |
| `pog510c-mockups.html` | 17 visual mockups at 1280×800 — game select menu, all 16 games, paytable example, and symbol sheet |

## Current state

### ✅ Done
- Cabinet visual identity locked: royal blue field, chrome bezel with corner studs, red 3D buttons, magenta paytable titles, yellow chunky multipliers, white Oswald text.
- Universal cabinet shell defined: right rail (EXIT GAME / HELP / SHOW PAYTABLE + readouts), bottom action bar (instruction + game-specific buttons), screen glare and CRT vignette overlays.
- All 16 game layouts roughed in with representative mockups.
- Triple Sevens fully documented: 14-symbol set (5 tiers of 7s, 3 BAR tiers, Bell, 6 fruits) and official paytable with the ×10,000 jackpot on 3× Crown Blue 7 with 16 credits bet.
- Theme tint pattern established (Shamrock 7's green, Black Gold 21 black-felt, Wild Jokers purple, etc.).

### ⏳ Gaps the research agent needs to fill
- **Paytables** for the other 15 games (only Triple Sevens is confirmed).
- **Symbol sets** for Shamrock 7's, Respin 777, Respin Gold Row (current set is plausible but not verified).
- **Exact mechanics** for Respin 777 (which symbols lock?), Respin Gold Row (which row qualifies?), Spin Jack 21 (side-reel content?), Spin Ball Bonus (wheel segments? pachinko?).
- **Wild Jokers card design** (current joker is plausible but not verified against original art).
- **Game select menu layout** — does the real cabinet use a tile grid? List? Different?
- **Attract / boot sequence** — any branding, animations, or marquee art that should be referenced.
- **RTP / payback percentages** if findable.

## Project conventions
- Canvas: **1280 × 800** for every screen.
- Visual identity is **sacred** — the chrome / red buttons / magenta titles / yellow multipliers don't change across games. Only the central play area and theme tints vary.
- All assets are SVG (inline `<symbol>`), no rasters.
- No browser storage in mockups; state is in-memory only.
- Cabinet board code for paytable footers: `POG_510C/R510POG2 IND B:01 G:000001` · `© 1986-99 LEISURE TIME TECH., INC`.
