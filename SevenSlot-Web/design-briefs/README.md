# Design Briefs

Specs ready to hand to **Claude Design** when we're ready to build the
polished visual layer for each modal/screen. Each brief is self-contained:

- The data contract the host React app sends in / receives back
- Required behavior and animations
- Theme art mapping per game
- Acceptance criteria

## Workflow

1. Build the **engine + integration host** in this codebase (Claude Code session).
2. Wire each modal to a **placeholder HTML** in `previews/` that satisfies
   the data contract end-to-end. This keeps the game playable while the
   visuals are temporary.
3. Hand the brief in this folder to **Claude Design** (separate session).
4. Receive polished HTML back, drop it into `previews/` (or wherever it
   integrates), replace the placeholder. **Data contract guarantees the
   swap is mechanical — no engine changes required.**

## Briefs in this folder

| File | Modal | Status |
|---|---|---|
| `pickem-modal.md` | Pick-em bonus (5/7/9 picks) | Brief written; placeholder live in `previews/pickem-modal.html` |

## Related platform docs

- `/docs/rng-architecture.md` — Class III RNG / outcome-determination rules.
  All designs in this folder must comply.
