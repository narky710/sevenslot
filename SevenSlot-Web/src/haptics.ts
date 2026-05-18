/**
 * Haptic feedback layer.
 *
 * Uses the Vibration API where available (Android Chrome, Samsung Internet,
 * some Firefox). iOS Safari does not expose the Vibration API; iOS haptics
 * would require a native shell. Calls degrade silently on unsupported devices.
 *
 * Patterns are tuned for casino feel — short, crisp, never longer than 60ms
 * for routine actions so they don't feel sluggish.
 */

const vibrate = (pattern: number | number[]): void => {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // silent fail
  }
};

let enabled = true;

export const haptics = {
  setEnabled(on: boolean) {
    enabled = on;
  },
  isEnabled() {
    return enabled;
  },

  /** Light tap — bet adjust, secondary buttons */
  light() {
    if (!enabled) return;
    vibrate(8);
  },

  /** Medium tap — primary action (spin start) */
  medium() {
    if (!enabled) return;
    vibrate(18);
  },

  /** Reel stop — sharp short tap */
  reelStop() {
    if (!enabled) return;
    vibrate(12);
  },

  /** Win — short stutter */
  win() {
    if (!enabled) return;
    vibrate([18, 30, 18]);
  },

  /** Jackpot — extended pattern */
  jackpot() {
    if (!enabled) return;
    vibrate([30, 40, 30, 40, 30, 40, 60]);
  },
};
