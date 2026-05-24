// Shared "tease / sweat" timing module for any game where a trigger symbol
// can land progressively across stopping reels (or cells). Used by:
//   - Diamond Riches: COIN + WILD count toward the free-spin bonus trigger
//   - the upcoming 6-themed ways game: JP_SYMBOL count toward jackpot tier
//
// Concept:
//   - Once at least `SWEAT_TRIGGER_MIN` trigger symbols are visible on
//     stopped reels, the remaining reels enter a SWEAT state — slower
//     stops with escalating visual intensity per additional trigger.
//   - Any reel that *would land another trigger symbol* while sweat is
//     active gets its stop time stretched to `HOLD_MIN_MS` (10s) so the
//     moment never feels cheap.
//
// Caller imports `sweatTierFor` for the visual class, `stopDurationMs`
// for the per-stop delay, and `shouldHoldForTrigger` to decide if this
// particular stop is the "headline" trigger-landing stop.

/** Count of trigger symbols (already visible on stopped reels) at which
 *  the sweat begins. */
export const SWEAT_TRIGGER_MIN = 2

/** Minimum milliseconds a sweat-active reel that is about to land another
 *  trigger symbol must hold in the spinning state before revealing. */
export const HOLD_MIN_MS = 10_000

/** Visual class progression. Higher = more dramatic pulse / brighter glow. */
export type SweatTier = 'normal' | 'sweat-2' | 'sweat-3' | 'sweat-4' | 'sweat-5'

/** Per-stop duration in ms, indexed by visible trigger count.
 *  - normal: pre-sweat (caller supplies its own game-specific base)
 *  - sweat-2: 2 visible, sweating toward 3 (first trigger threshold)
 *  - sweat-3: 3 visible, lowest tier locked, sweating for upgrade
 *  - sweat-4: 4 visible, mid-tier locked, sweating for top tier
 *  - sweat-5: top tier locked, race to celebration */
const SWEAT_STOP_MS: Record<Exclude<SweatTier, 'normal'>, number> = {
  'sweat-2': 700,
  'sweat-3': 900,
  'sweat-4': 1200,
  'sweat-5': 400,
}

/** Map a current visible-trigger-count to a sweat tier. */
export function sweatTierFor(triggerCount: number): SweatTier {
  if (triggerCount >= 5) return 'sweat-5'
  if (triggerCount >= 4) return 'sweat-4'
  if (triggerCount >= 3) return 'sweat-3'
  if (triggerCount >= SWEAT_TRIGGER_MIN) return 'sweat-2'
  return 'normal'
}

/** Stop duration for a single reel/cell at the given visible trigger count.
 *  If the count is below the sweat threshold, falls back to the game-specific
 *  `baseNormalMs` (so each game keeps its natural pre-sweat cadence). */
export function stopDurationMs(triggerCount: number, baseNormalMs: number): number {
  const tier = sweatTierFor(triggerCount)
  if (tier === 'normal') return baseNormalMs
  return SWEAT_STOP_MS[tier]
}

/** Should the current reel/cell stop be held (≥ 10s) because:
 *   1. Sweat is already active (>= SWEAT_TRIGGER_MIN visible), AND
 *   2. This stop is going to land one or more additional trigger symbols.
 *
 *  When true, the caller should use HOLD_MIN_MS (or longer) as the stop
 *  delay. The "moment of trigger" never feels rushed. */
export function shouldHoldForTrigger(visibleCount: number, willAddMore: boolean): boolean {
  return visibleCount >= SWEAT_TRIGGER_MIN && willAddMore
}

/** Convenience: compute the actual stop delay for a single reel/cell given
 *  the current trigger count, whether this stop will add more triggers, and
 *  the game's pre-sweat base duration. Combines `stopDurationMs` and the
 *  hold rule into one call. */
export function computeStopDelayMs(
  visibleCount: number,
  willAddMore: boolean,
  baseNormalMs: number,
): number {
  const base = stopDurationMs(visibleCount, baseNormalMs)
  if (shouldHoldForTrigger(visibleCount, willAddMore)) {
    return Math.max(base, HOLD_MIN_MS)
  }
  return base
}
