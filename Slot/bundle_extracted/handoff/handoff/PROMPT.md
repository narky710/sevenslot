# Research Prompt — POG 510C Cabinet

## Your role
You are a research agent. Your job is to fill in the gaps in an existing design package for the **Pot-O-Gold 510C** multi-game arcade cabinet by **Leisure Time Technology, Inc.** (© 1986–1999), so it can later be handed to a build agent to produce a playable web mockup. **Start by reading `README.md` and `pog510c-style-guide.md` in this folder.** Open `pog510c-mockups.html` in a browser to see the current visual state of all 17 screens.

## What's already locked
The cabinet's visual identity is fixed — chrome bezel, royal blue radial field, red 3D plastic-dome buttons, magenta paytable titles, yellow chunky outlined multipliers, white Oswald body text, late-90s arcade glow. **Do not propose changes to this aesthetic.** Your work fills in *contents*: paytables, symbol sets, exact mechanics, and any visual reference for individual games.

## Primary research targets

For each of the **15 games other than Triple Sevens** (which is already complete), find and document:

1. **Official or community-documented paytable** — what each symbol combination / hand / pick count pays at what bet level.
2. **Complete symbol set or card / number art** — for reel games, the full reel strip / symbol inventory; for video poker, the deck and any custom cards (especially the Joker for Wild Jokers); for keno/bingo/lotto, the grid range and any special tiles.
3. **Exact mechanics** — game flow, special rules, bonus triggers. Pay special attention to:
   - **Respin 777** — which symbols qualify for the hold-and-respin? Just 7s, or any matching pair?
   - **Respin Gold Row** — does only the middle row qualify, or any row? What completes the row?
   - **Super Ball Keno** — does the Super Ball double the win, or apply a different multiplier?
   - **Double-Up Keno** — is the double-up an integrated screen or a side-game?
   - **Spin Jack 21** — what are the side-reel symbols / multipliers? When does it trigger?
   - **Spin Ball Bonus** — is it a roulette wheel, a pachinko drop, or something else? What are the segments / payouts?
   - **Super Double-Up** — how many doubling rounds max? Standalone or only as a win-doubler in other games?

4. **Boot / attract / game-select screen** — does the real cabinet show a 4×4 menu grid (as in the current mockup), a list, or something different? What's the boot sequence?

## Secondary research targets

- RTP / payback percentage for each game (if documented anywhere).
- Cabinet sound effects per game (spin / win / jackpot signatures).
- Variations of the POG board — the project targets the 510C, but if 510A/B or 580 variants share assets, note any reusable references.
- Original marquee / cabinet artwork — for any branding context.

## Where to look

- **YouTube** — search for "Pot-O-Gold 510C", "POG 510C [game name]", "Leisure Time Technology arcade", "8-liner [game name]". Many uploaders have filmed long sessions on these cabinets. Capture screenshots from videos that show paytables, win states, and the menu screen.
- **Arcade emulation and preservation sites** — KLOV (klov.com), Arcade Museum, MAME/MESS development notes if a ROM dump exists.
- **8-liner and sweepstakes parlor forums** — operators discussing paytable settings, jackpot configs, and game variations.
- **Texas / Georgia / Alabama state regulatory filings** — these states have approved/regulated POG games and sometimes publish paytable specifications.
- **Reddit** — r/arcade, r/slots, r/gambling for community references.

## Method notes

- **Cite sources** for every paytable and mechanic claim — URL, timestamp for videos, page number for documents.
- **Flag uncertainty** — if a value is your best guess from incomplete evidence, label it `[UNVERIFIED]`.
- **Don't invent paytables** — if the actual numbers aren't findable, say so explicitly rather than filling in plausible-looking values.
- **Note variations** — the same game may have different paytables across operator settings. Document the most common one and note the range.

## Deliverables

Produce these files in a folder named `research-output/`:

1. **`paytables.md`** — one section per game with the verified paytable. Use the Triple Sevens section in `pog510c-style-guide.md` §22.2 as the format template.

2. **`symbols-and-art.md`** — one section per game listing every symbol / card / tile / wheel segment, with:
   - Name
   - Description of the artwork
   - Approximate colors / dominant features
   - A source link or "see [video]" reference
   - For symbols that exist on real cabinets, screenshots embedded or linked

3. **`mechanics.md`** — one section per game, ~150-300 words, explaining the flow: bet, deal/spin/draw, bonus triggers, win conditions, double-up availability.

4. **`screenshots/`** — folder of captured reference images, named like `respin-777-paytable.png`, `wild-jokers-hand.png`, etc. Include the source (video URL + timestamp) in a `screenshots/sources.md`.

5. **`style-guide-changes.md`** — a focused list of suggested edits to `pog510c-style-guide.md`:
   - Sections that need correction with current spec vs. researched spec
   - New sections that should be added
   - Tints / accents that should be adjusted

6. **`mockup-changes.md`** — a focused list of suggested edits to `pog510c-mockups.html`:
   - Per game: what's correct, what's wrong, what should change
   - Any new mockups that should be added (e.g., bonus rounds, double-up flows, attract screens)

7. **`open-questions.md`** — anything you couldn't answer and what evidence would be needed to resolve it.

## Quality bar

A successful handoff lets the *next* agent (the build agent) produce a faithful playable mockup from the style guide + your research with **zero further questions** about content. The visual identity is already locked; you're locking the content.

## Out of scope

- Audio engineering / sound design — note references only, don't try to source actual audio files.
- Legal review of game rules / regional compliance — note state regulations as references only.
- Writing or modifying code — the build agent handles implementation.
- Sourcing original Leisure Time Technology assets that are still under copyright — describe what's seen in reference videos rather than reproducing copyrighted art directly.

## Start here
1. Read `README.md` (project context and current state).
2. Read `pog510c-style-guide.md` end-to-end (the design contract).
3. Open `pog510c-mockups.html` in a browser (visual reference for all 17 screens).
4. Pick one game family at a time and work through it. Suggested order: Reel Slots → Video Poker → Keno → Blackjack → Bingo/Lotto → Bonus.
5. Drop your findings into `research-output/` as you go. Update `open-questions.md` continuously.

Once everything in **Primary research targets** has a documented answer or a `[UNVERIFIED]` flag, the handoff is complete.
