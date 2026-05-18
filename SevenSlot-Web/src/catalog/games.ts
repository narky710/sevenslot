// Single source of truth for the SevenSlot game catalog. Each entry describes
// one game's identity, status, and where its UI lives. The router in App.tsx
// reads this list to render the lobby and dispatch to a game view.

export type GameId = 'tripleSevens' | 'doubleUpKeno' | 'diamondRiches';

export interface GameEntry {
  id: GameId;
  title: string;
  /** One-line lobby description. */
  tagline: string;
  /** True if the game has a runnable engine + view; false → "coming soon". */
  playable: boolean;
  /** True to highlight in the lobby (e.g. new release). */
  featured: boolean;
}

export const GAMES: ReadonlyArray<GameEntry> = [
  {
    id: 'tripleSevens',
    title: 'Triple Sevens',
    tagline: '3×3 reel slot, 8 paylines, jackpot ×10,000.',
    playable: true,
    featured: false,
  },
  {
    id: 'doubleUpKeno',
    title: 'Double-Up Keno',
    tagline: 'Pick 2-10 spots from 1-80. Win → optional 50/50 double-or-nothing.',
    playable: true,
    featured: false,
  },
  {
    id: 'diamondRiches',
    title: 'Diamond Riches',
    tagline: '3×5 luxury slot, 20 lines. Diamond wilds & a collectible-multiplier free-spin bonus.',
    playable: true,
    featured: true,
  },
];
