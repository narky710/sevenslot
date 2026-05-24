# RNG Architecture — Class III Compliance

> Single source of truth for how outcomes are determined across every game
> on the SevenSlot platform. **All new games and features must conform.**

## The principle

**Every outcome — base spin, free spin, pick-em, jackpot, gamble — must
trace back to a certified RNG event at the moment of its trigger. Visual
presentation that follows is just paint on a decision that's already been
made.**

This is the Class III architecture certified by US gaming regulators
(Nevada Gaming Control Board / GLI labs). It's also the most defensible
audit posture and keeps math-modeling simple.

In one line: **the RNG's job is to pick the result at the moment of the
trigger; the game's job is to show that result in a way that feels
interactive.**

## The certified RNG

All randomness comes from `public._csprng_uint(bigint)`, which:

- Calls `extensions.gen_random_bytes(4)` (pgcrypto-backed CSPRNG)
- Applies rejection sampling to produce a uniform integer in `[0, p_max)`
- Lives in the server; no game-determining randomness exists client-side

**Math.random / crypto.getRandomValues on the client is ONLY allowed for
purely visual effects** (sparkle positions, idle reel-spin flicker, win
tier confetti, etc.). The moment a client-side random call would affect
the player's payout, balance, or outcome, that's a regulatory violation
and a bug.

## Per-game / per-feature architecture

### Base spin (Triple Sevens, Diamond Riches, new ways game)

| When | What |
|---|---|
| Player taps SPIN | Client calls `play_<game>` RPC with `spin_id` |
| Server receives RPC | Captures RNG → rolls grid via `_csprng_uint` |
| Server evaluates | Wins computed; trigger flags (FS / BN / JP / respin) determined |
| Server returns | Full result struct (grid, wins, trigger flags, new balance) |
| Client animates | Pure presentation — reels stop on the predetermined positions |

### Replay safety

Every spin RPC takes a `spin_id` (UUID generated client-side). If the same
`spin_id` arrives twice (network retry, double-tap), the server returns
the original outcome from `game_events`, not a new roll. Idempotent and
audit-safe.

### Free spins

Two valid Class III models. We use **Model B** (independent per-spin RNG).

| Model A — fully painted | Model B — independent rolls (OURS) |
|---|---|
| Total bonus payout decided at trigger | Bonus *structure* decided at trigger (# free spins, multipliers, retrigger rules) |
| Each free spin's outcome is painted to add up to the total | Each free spin's outcome is rolled live via `_csprng_uint` |
| Less common on modern slots | What Diamond Riches uses today |
| Easier to enforce a fixed bonus RTP | Easier to math (each spin has same expected value as a base spin, scaled by multiplier) |

Either model is regulator-defensible. We picked Model B because:

- Simpler server logic (free spin is just `play_<game>` with `phase='bonus'`)
- Each spin is replay-safe via its own `spin_id`
- The bonus session's RTP emerges naturally from the strip math + the multiplier

**What IS locked at trigger:**
- Number of free spins awarded (rolled from 5-10 / 10-15 / 15-20 range for ways game; fixed at 11 for Diamond)
- The multiplier rule (2× during the session)
- Retrigger rule (+5 fixed)
- Session cap (50)

These structural parameters can't be changed mid-session because they're
recorded in `game_sessions.state` at the moment of trigger.

### Pick-em bonus

**This is the feature where Class III architecture matters most.** The
"illusion of choice" is fully legal under Nevada regs, but it requires
that the outcome be determined at trigger, not during picking.

| When | What |
|---|---|
| Spin RPC returns `pickem_triggered = true` | Server has already determined: |
|  | • The total pick-em payout (from a weighted distribution per scatter tier) |
|  | • How many picks the player will tap before COLLECT (or exhausts) |
|  | • The reveal sequence — which item type appears on each pick in tap order |
|  | • The filler items that fill unpicked positions in the 12-slot display |
| All of the above persisted in `game_sessions.state` | One RNG capture, one outcome locked in |
| Player taps items in the modal | Each tap reveals the next item in the predetermined sequence |
| Round ends (COLLECT or picks exhausted) | Player paid the predetermined total |

The unpicked items in the 12-slot display are revealed afterward purely
for entertainment — they're filler, never live outcomes. The player's
tap *order* is presentation; the reveal sequence is what they see in tap
order regardless of which physical position they tap.

### Gamble (double-or-nothing)

Each gamble round IS its own RNG event. When the player taps HIGH/LOW:

| When | What |
|---|---|
| Player taps HIGH or LOW | Client calls `gamble_card` RPC |
| Server | Captures RNG → rolls the card value via `_csprng_uint` (weighted to brief's spec) |
| Server evaluates | Compares to pivot card → win/loss/tie |
| Server returns | Card value, new pot, lockout flags |

A series of gamble rounds = a series of independent RNG events. Each
round's outcome is determined at the moment the player chose to risk.
Not pre-painted from the original trigger win.

### Jackpots

Two Class III models for jackpots:

| Symbol-driven (OURS) | Mystery |
|---|---|
| JP fires when a specific symbol combination lands on a base/respin/free spin | A separate RNG process picks a hidden credit threshold; whoever pushes spin when the meter crosses it wins |
| Traces directly to a normal RNG-driven reel result | Independent process; no symbol pattern required |
| What we use across all games (Diamond Riches' old FEVER, the new ways game's JP1/2/3) | Not used on this platform |

For the new ways game's JP system:

- The grid roll at spin tap determines JP_SYMBOL positions
- Respin (if it fires) can FILL additional JP positions per the "fill with JP" priority rule
- Final post-respin grid → count JP_SYMBOL → trigger JP3 / JP2 / JP1 if threshold met
- Pool payout calculation uses `(your_bet / max_bet) × pool` at moment of trigger

All deterministic from the original RNG capture once the spin is rolled.
Replay-safe via `spin_id`.

## Code locations

| Server-side RNG | Path |
|---|---|
| The CSPRNG helper | `public._csprng_uint(p_max bigint)` — DB function |
| Triple Sevens spin | `public.play_triple7` |
| Keno open/resolve | `public.play_keno_open` / `public.play_keno_resolve` |
| Diamond spin | `public.play_diamond` |
| Diamond grid preview (load-time RNG) | `public.diamond_preview_grid` |
| Ways game spin (planned) | `public.play_ways` |

| Client-side (visual only — never decides outcomes) | Path |
|---|---|
| Reel-animation flicker | `Math.random()` in `DiamondRichesView.tsx` tumble loop |
| Win-tier confetti positions | `Math.random()` in win celebration component |
| Idle animations / ambient effects | various |

If you're tempted to use `Math.random()` for ANYTHING outcome-related,
stop. Add a server RPC instead.

## Adding new features — checklist

Before adding a new bonus feature, confirm:

1. ☐ **RNG event happens at trigger**, not during the player's interaction
2. ☐ **Outcome is recorded in `game_sessions` or `game_events`** for replay/audit
3. ☐ **Player interaction reveals the outcome**, doesn't determine it
4. ☐ **Idempotency via `spin_id`** — re-calling the same trigger doesn't re-roll
5. ☐ **No client-side `Math.random`** in any code path that affects payouts
6. ☐ **Replay-safe** — if the player disconnects and reconnects mid-bonus, the bonus picks up where it left off using the persisted predetermined outcome

If any box is unchecked, the feature is not yet Class III compliant.
