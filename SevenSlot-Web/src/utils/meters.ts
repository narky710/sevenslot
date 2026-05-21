/**
 * Accounting meters — Phase 2
 *
 * Shared types and helpers for per-session coin-in / coin-out tracking and
 * the game event log.  Each engine embeds GameMeters in its state and calls
 * recordSpin() after every resolved wager.
 *
 * Design notes:
 *   - spinId is human-readable: "<game>-<spinCount>" (e.g. "triple7-42").
 *   - gameEvents is capped at MAX_EVENT_LOG entries; oldest are dropped first.
 *   - Everything stays in-memory (session-scoped).  Persistence across sessions
 *     is intentionally deferred — in production this would flush to a server
 *     audit trail.
 */

export type GameTag = 'triple7' | 'keno' | 'diamond';

/** One entry in the event log, written after each resolved spin/round. */
export interface GameEvent {
  /** "<game>-<spinCount>", e.g. "triple7-5". */
  spinId: string;
  game: GameTag;
  /** Unix ms timestamp at the moment the spin resolved. */
  timestamp: number;
  /** Wager deducted for this spin (cents). */
  betCents: number;
  /** Amount credited as a win (0 if no win, cents). */
  winCents: number;
  /** Optional game-specific detail (hits, lines, bonus flag, etc.). */
  meta?: Record<string, unknown>;
}

/** The accounting sub-object embedded in every engine's state. */
export interface GameMeters {
  /** Total number of spins/rounds played this session. */
  spinCount: number;
  /** Cumulative wager deducted this session (cents). */
  coinIn: number;
  /** Cumulative credits paid out this session (cents). */
  coinOut: number;
  /** Rolling log of the last MAX_EVENT_LOG events, newest last. */
  gameEvents: GameEvent[];
}

/** Maximum number of events kept in the in-memory log. */
export const MAX_EVENT_LOG = 100;

/** Build the zero-value meters object used in each engine's constructor. */
export function initMeters(): GameMeters {
  return { spinCount: 0, coinIn: 0, coinOut: 0, gameEvents: [] };
}

/**
 * Record a single spin result into the meters.  Mutates `meters` in place.
 *
 * @param meters  The engine's meters object (mutated).
 * @param game    Which game the spin belongs to.
 * @param betCents  Amount wagered this spin (always positive).
 * @param winCents  Amount won this spin (0 if no win).
 * @param meta    Optional game-specific extras.
 * @returns The spinId string that was written into the event.
 */
export function recordSpin(
  meters: GameMeters,
  game: GameTag,
  betCents: number,
  winCents: number,
  meta?: Record<string, unknown>,
): string {
  meters.spinCount += 1;
  meters.coinIn += betCents;
  meters.coinOut += winCents;

  const spinId = `${game}-${meters.spinCount}`;
  const event: GameEvent = {
    spinId,
    game,
    timestamp: Date.now(),
    betCents,
    winCents,
    ...(meta !== undefined ? { meta } : {}),
  };

  meters.gameEvents.push(event);
  if (meters.gameEvents.length > MAX_EVENT_LOG) {
    meters.gameEvents.shift(); // drop oldest
  }

  return spinId;
}

/** Shallow-clone meters (deep-copies the events array). */
export function cloneMeters(m: GameMeters): GameMeters {
  return {
    spinCount: m.spinCount,
    coinIn: m.coinIn,
    coinOut: m.coinOut,
    gameEvents: [...m.gameEvents],
  };
}
