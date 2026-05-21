/**
 * Shared player wallet — single localStorage key across all games.
 *
 * All three games (Triple Sevens, Double-Up Keno, Diamond Riches) draw from
 * and write to the same balance. Credits are stored in cents (integer).
 *
 * Failures are always silenced — private browsing, storage-full errors, or
 * corrupted values must never break gameplay. The fallback is the default
 * starting balance.
 */

const WALLET_KEY = 'ss7_wallet';

/** Default starting balance in cents ($0.00). */
export const DEFAULT_WALLET_CENTS = 0;

/**
 * Read the player's saved wallet balance.
 * Returns `fallback` if nothing is stored, the value is corrupt,
 * or localStorage is unavailable.
 *
 * BETA: accepts zero and negative balances (overdraft allowed during testing).
 */
export function loadCredits(fallback = DEFAULT_WALLET_CENTS): number {
  try {
    const raw = localStorage.getItem(WALLET_KEY);
    if (raw === null) return fallback;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Persist the player's current wallet balance. Silently no-ops on any error.
 *
 * @param credits Current balance in cents (stored as integer).
 */
export function saveCredits(credits: number): void {
  try {
    localStorage.setItem(WALLET_KEY, String(Math.round(credits)));
  } catch {
    // Storage full or unavailable — credits are still live in memory.
  }
}
