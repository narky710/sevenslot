// ─────────────────────────────────────────────────────────────────────────────
//  Progressive jackpots — backend-agnostic abstraction (revised spec §4)
//
//  The three FEVER meters are GLOBALLY SHARED across every player of the game:
//  one player's contribution bumps everyone's meter; a win resets everyone's
//  meter to seed. That state therefore cannot live in localStorage or a single
//  device — it needs a real backend. The game talks only to the JackpotService
//  interface so the storage layer can be swapped without touching game logic.
//
//  Ships with:
//    • MockJackpotService   — in-memory, single-device, fully playable in dev.
//    • RemoteJackpotService — stub documenting the contract; throws until a
//                             backend is chosen and wired up.
//
//  Money note: bets are in CREDITS (1 credit = $0.01); jackpot meters are in
//  DOLLARS. contribute() takes the spin's total bet in credits and converts.
// ─────────────────────────────────────────────────────────────────────────────

import { CREDIT_VALUE_DOLLARS } from './LuxuryEngine';

export type JackpotTier = 'fever1' | 'fever2' | 'fever3';

export interface MetersSnapshot {
  fever1: number;
  fever2: number;
  fever3: number;
  /** unix ms of the last change. */
  lastUpdated: number;
  /** Tier most recently reset by a win (any player), for a brief UI flash. */
  lastWonTier?: JackpotTier | null;
}

export interface JackpotService {
  /** Current meter values for all tiers (called on load + periodically). */
  getMeters(): Promise<MetersSnapshot>;
  /**
   * Subscribe to real-time meter updates (any player's contribution or win).
   * Returns an unsubscribe function.
   */
  subscribe(callback: (meters: MetersSnapshot) => void): () => void;
  /** Add the configured contribution to each meter for this spin's bet. */
  contribute(totalBetCredits: number): Promise<void>;
  /**
   * Atomically claim a tier: returns its current value and resets it to seed.
   * A real backend MUST enforce single-winner-per-trigger via a transaction.
   */
  claim(tier: JackpotTier): Promise<{ amount: number; newSeedValue: number }>;
}

export interface JackpotTierConfig {
  seedValue: number;       // dollars
  contributionRate: number; // fraction of total bet (in dollars)
  triggerOdds: number;      // approx per-spin odds at MAX bet
  label: string;
}

export const JACKPOT_CONFIG: Readonly<Record<JackpotTier, JackpotTierConfig>> = {
  fever1: { seedValue: 1000.0, contributionRate: 0.01, triggerOdds: 1 / 50000, label: 'FEVER 1' },
  fever2: { seedValue: 500.0, contributionRate: 0.005, triggerOdds: 1 / 10000, label: 'FEVER 2' },
  fever3: { seedValue: 250.0, contributionRate: 0.003, triggerOdds: 1 / 2500, label: 'FEVER 3' },
};

export const JACKPOT_TIERS: ReadonlyArray<JackpotTier> = ['fever1', 'fever2', 'fever3'];

/** Base trigger odds map (consumed by LuxuryEngine.rollJackpotTriggers). */
export const JACKPOT_BASE_ODDS = {
  fever1: JACKPOT_CONFIG.fever1.triggerOdds,
  fever2: JACKPOT_CONFIG.fever2.triggerOdds,
  fever3: JACKPOT_CONFIG.fever3.triggerOdds,
};

/**
 * Toggle the backend. Defaults to the in-memory mock; flip the Vite env var
 * VITE_USE_REMOTE_JACKPOTS=true (or this const) once a backend is wired.
 */
export const USE_REMOTE_JACKPOTS: boolean =
  ((import.meta as unknown as { env?: Record<string, string> }).env
    ?.VITE_USE_REMOTE_JACKPOTS ?? 'false') === 'true';

// ─── Mock (in-memory, single device) ─────────────────────────────────────────
export class MockJackpotService implements JackpotService {
  // Seeded near the cabinet-photo example values so the meters look alive
  // immediately rather than sitting at the bare seed.
  private meters: MetersSnapshot = {
    fever1: 1481.26,
    fever2: 597.74,
    fever3: 475.35,
    lastUpdated: Date.now(),
    lastWonTier: null,
  };
  private subs = new Set<(m: MetersSnapshot) => void>();

  // No-op constructor. The previous build ran a setInterval that used
  // Math.random to "drift" the meters every 4s to simulate other players
  // contributing — purely visual. Removed once FEVER was retired from the
  // Diamond UI (the meters aren't rendered anywhere), and removed from
  // here too to keep Math.random off any code path that touches what
  // looks like outcome state. (Class III: no client-side randomness in
  // outcome-bearing data — see docs/rng-architecture.md.)
  constructor() { /* intentionally empty */ }

  /** Tear down (called on game unmount). */
  dispose(): void {
    this.subs.clear();
  }

  private emit(): void {
    for (const cb of this.subs) {
      try {
        cb({ ...this.meters });
      } catch {
        /* a bad subscriber must never break the game loop */
      }
    }
  }

  async getMeters(): Promise<MetersSnapshot> {
    return { ...this.meters };
  }

  subscribe(callback: (m: MetersSnapshot) => void): () => void {
    this.subs.add(callback);
    callback({ ...this.meters });
    return () => this.subs.delete(callback);
  }

  async contribute(totalBetCredits: number): Promise<void> {
    const betDollars = totalBetCredits * CREDIT_VALUE_DOLLARS;
    this.meters = {
      ...this.meters,
      fever1: round2(this.meters.fever1 + betDollars * JACKPOT_CONFIG.fever1.contributionRate),
      fever2: round2(this.meters.fever2 + betDollars * JACKPOT_CONFIG.fever2.contributionRate),
      fever3: round2(this.meters.fever3 + betDollars * JACKPOT_CONFIG.fever3.contributionRate),
      lastUpdated: Date.now(),
      lastWonTier: null,
    };
    this.emit();
  }

  async claim(tier: JackpotTier): Promise<{ amount: number; newSeedValue: number }> {
    const amount = this.meters[tier];
    const seed = JACKPOT_CONFIG[tier].seedValue;
    this.meters = {
      ...this.meters,
      [tier]: seed,
      lastUpdated: Date.now(),
      lastWonTier: tier,
    };
    this.emit();
    return { amount: round2(amount), newSeedValue: seed };
  }
}

// ─── Remote (stub — fill in when a backend is chosen) ────────────────────────
export class RemoteJackpotService implements JackpotService {
  // Implementation guidance for whoever wires the backend:
  //  • getMeters  → single read of the shared meter document/row.
  //  • subscribe  → realtime channel (Firebase onValue / Supabase realtime /
  //                 Durable Object WebSocket / SSE) → invoke callback on push.
  //  • contribute → server-side atomic increment of all three meters by
  //                 contributionRate × (totalBetCredits × $0.01).
  //  • claim      → server-side TRANSACTION: read tier, reset to seedValue,
  //                 return prior value. Must reject a second concurrent claim
  //                 for the same trigger event (idempotency / single winner).
  private static readonly MSG =
    'RemoteJackpotService not implemented — wire a backend (Firebase RTDB / ' +
    'Supabase / Cloudflare Durable Objects / Node+Postgres) to the ' +
    'JackpotService contract, then set VITE_USE_REMOTE_JACKPOTS=true.';

  async getMeters(): Promise<MetersSnapshot> {
    throw new Error(RemoteJackpotService.MSG);
  }
  subscribe(): () => void {
    throw new Error(RemoteJackpotService.MSG);
  }
  async contribute(): Promise<void> {
    throw new Error(RemoteJackpotService.MSG);
  }
  async claim(): Promise<{ amount: number; newSeedValue: number }> {
    throw new Error(RemoteJackpotService.MSG);
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Selects the implementation per USE_REMOTE_JACKPOTS. */
export function createJackpotService(): JackpotService {
  return USE_REMOTE_JACKPOTS ? new RemoteJackpotService() : new MockJackpotService();
}
