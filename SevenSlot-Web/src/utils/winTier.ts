/**
 * Shared win-tier classification utility.
 *
 * Centralises the win/bet ratio → display tier mapping that was previously
 * duplicated in each game view. Each game has different thresholds because
 * their bet structures and top-end multipliers differ:
 *
 *   'slot'    — Triple Sevens (8-line reel, jackpot flagged externally)
 *   'keno'    — Double-Up Keno (ratio-based jackpot at 1000×)
 *   'luxury'  — Diamond Riches (20-line video slot, lower ratio needed for 'mega')
 *
 * The canonical WinTier type lives in audio.ts so the audio system and the
 * visual system share one definition.
 */

export type { WinTier } from '../audio';

export type WinTierPreset = 'slot' | 'keno' | 'luxury';

/**
 * Classify a win amount into a display tier.
 *
 * @param winCents     - Amount won this round (cents / credits).
 * @param betCents     - Total bet for the round (cents / credits).
 * @param preset       - Game preset that selects the threshold table.
 * @param isJackpot    - Optional flag (slot preset only): force 'jackpot' tier
 *                       regardless of ratio (used for progressive jackpot wins).
 * @returns WinTier string, or null if there was no win.
 */
export function classifyWinTier(
  winCents: number,
  betCents: number,
  preset: WinTierPreset,
  isJackpot = false
): import('../audio').WinTier | null {
  if (winCents <= 0 || betCents <= 0) return null;
  if (isJackpot) return 'jackpot';

  const ratio = winCents / betCents;

  switch (preset) {
    case 'slot':
      // Triple Sevens — 8-line reel, max multiplier ~10,000×
      if (ratio >= 100) return 'mega';
      if (ratio >= 25)  return 'big';
      if (ratio >= 5)   return 'win';
      return 'small';

    case 'keno':
      // Double-Up Keno — top multiplier 100,000×, ratio-based jackpot tier
      if (ratio >= 1000) return 'jackpot';
      if (ratio >= 100)  return 'mega';
      if (ratio >= 25)   return 'big';
      if (ratio >= 5)    return 'win';
      return 'small';

    case 'luxury':
      // Diamond Riches — 20-line video slot, lower ratios needed for celebrations
      if (ratio >= 50) return 'jackpot'; // was 'epic' locally; maps same to audio
      if (ratio >= 25) return 'mega';
      if (ratio >= 10) return 'big';
      if (ratio >= 3)  return 'win';
      return 'small';
  }
}
