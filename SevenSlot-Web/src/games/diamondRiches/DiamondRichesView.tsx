import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  LuxuryEngine,
  LuxuryState,
  SpinResult,
  PAYLINES,
  PAYTABLE,
  LINE_BET_STEPS_CENTS,
  NUM_REELS,
  NUM_ROWS,
  NUM_PAYLINES,
  FREE_SPINS_AWARDED,
  MAX_BONUS_MULTIPLIER,
  type SymbolId,
} from '../../engine/LuxuryEngine';
import {
  createJackpotService,
  JACKPOT_CONFIG,
  JACKPOT_TIERS,
  JACKPOT_BASE_ODDS,
  type JackpotService,
  type MetersSnapshot,
  type JackpotTier,
} from '../../engine/JackpotService';
import { getLuxurySymbolSVG, SYMBOL_LABELS, LuxurySymbolDefs } from '../../symbols/LuxurySymbols';
import { audio as rawAudio, type WinTier } from '../../audio';
import { haptics as rawHaptics } from '../../haptics';
import '../../styles/index.css';

/**
 * Safe wrappers — audio/haptics are pure enhancement and must never break the
 * spin/bonus flow (mirrors the pattern used by TripleSevensView).
 */
const safe = <T extends unknown[]>(fn: (...args: T) => unknown) =>
  (...args: T) => { try { fn(...args); } catch {} };

const audio = {
  unlock: safe(() => rawAudio.unlock()),
  click: safe(() => rawAudio.click()),
  tick: safe(() => rawAudio.tick()),
  startSpin: safe(() => rawAudio.startSpin()),
  stopSpin: safe(() => rawAudio.stopSpin()),
  reelStop: safe(() => rawAudio.reelStop()),
  anticipation: safe(() => rawAudio.anticipation()),
  coinChime: safe((n: number) => rawAudio.coinChime(n)),
  win: safe((tier: WinTier) => rawAudio.win(tier)),
  scatterLand: safe(() => rawAudio.scatterLand()),
  bonusTrigger: safe(() => rawAudio.bonusTrigger()),
  diamondCollect: safe(() => rawAudio.diamondCollect()),
  multiplierTick: safe(() => rawAudio.multiplierTick()),
  bonusOutro: safe(() => rawAudio.bonusOutro()),
  setMuted: safe((m: boolean) => rawAudio.setMuted(m)),
};

const haptics = {
  light: safe(() => rawHaptics.light()),
  medium: safe(() => rawHaptics.medium()),
  reelStop: safe(() => rawHaptics.reelStop()),
  win: safe(() => rawHaptics.win()),
  jackpot: safe(() => rawHaptics.jackpot()),
  setEnabled: safe((on: boolean) => rawHaptics.setEnabled(on)),
};

// Verified by Monte-Carlo simulation — see stress-test/luxury-rtp.cjs and
// stress-test-report-luxury.md. Published for transparency in the info modal.
const GAME_RTP = '95.0%';

const AUTOSPIN_PRESETS = [5, 10, 25, 50, 100] as const;

type ModalState = 'none' | 'paytable' | 'info' | 'autospin';
type LuxTier = 'small' | 'win' | 'big' | 'mega' | 'epic';

/** Map a luxury tier to the shared audio kit's WinTier (epic reuses jackpot). */
const audioTierFor = (t: LuxTier): WinTier =>
  t === 'epic' ? 'jackpot' : t === 'mega' ? 'mega' : t === 'big' ? 'big' : t === 'win' ? 'win' : 'small';

// Revised spec §5: BIG 10×, MEGA 25×, EPIC 50× total bet.
function classifyWinTier(winCents: number, totalBetCents: number): LuxTier | null {
  if (winCents <= 0 || totalBetCents <= 0) return null;
  const ratio = winCents / totalBetCents;
  if (ratio >= 50) return 'epic';
  if (ratio >= 25) return 'mega';
  if (ratio >= 10) return 'big';
  if (ratio >= 3) return 'win';
  return 'small';
}

/** Jackpot meters are dollars; bets/credits are credits (1 credit = $0.01). */
function formatDollars(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatCents(cents: number): string {
  const whole = Math.round(cents);
  const dollars = Math.floor(whole / 100);
  const rem = whole % 100;
  if (rem === 0) return `$${dollars.toLocaleString()}`;
  return `$${dollars.toLocaleString()}.${rem.toString().padStart(2, '0')}`;
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(m)}:${pad(s)}`;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const TUMBLE_POOL: SymbolId[] = [
  'JET', 'YACHT', 'CAR', 'MONEY', 'RING', 'WATCH', 'GOLD_BARS', 'SILVER_BARS', 'GOLD_BAR',
];

interface Props {
  onExit?: () => void;
}

export default function DiamondRichesView({ onExit }: Props = {}) {
  const engineRef = useRef(new LuxuryEngine(50000)); // 50,000 credits ($500)
  const jackpotRef = useRef<JackpotService>(createJackpotService());

  const [state, setState] = useState<LuxuryState>(engineRef.current.getState());
  const [meters, setMeters] = useState<MetersSnapshot | null>(null);
  const [jackpotWin, setJackpotWin] = useState<{ tier: JackpotTier; amount: number } | null>(null);
  const [retriggerFlash, setRetriggerFlash] = useState(false);
  const [inputLocked, setInputLocked] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [autoSpinEnabled, setAutoSpinEnabled] = useState(false);
  const [autoSpinCount, setAutoSpinCount] = useState(0);
  // Auto-spin pauses (keeps its remaining count) on a BIG/MEGA/EPIC win and
  // waits for the player to RESUME — it does not silently roll past a big win.
  const [autoSpinPaused, setAutoSpinPaused] = useState(false);
  // True from a base spin's start until its win presentation + jackpot +
  // pause decision fully resolve. The auto-spin scheduler waits on this so it
  // never starts the next spin before the big-win pause is applied.
  const [presenting, setPresenting] = useState(false);
  const [displayGrid, setDisplayGrid] = useState<SymbolId[][]>(
    () => engineRef.current.pickRandomDisplayGrid().grid
  );
  const [stoppedReels, setStoppedReels] = useState<boolean[]>(
    () => Array(NUM_REELS).fill(true)
  );
  const [activeWinLines, setActiveWinLines] = useState<number[]>([]);
  // Briefly overlays the active paylines on the reels when LINES changes.
  const [linePreview, setLinePreview] = useState(false);
  const [winCells, setWinCells] = useState<Set<string>>(new Set());
  const [displayWinAmount, setDisplayWinAmount] = useState(0);
  const [winTier, setWinTier] = useState<LuxTier | null>(null);
  const [collectingCells, setCollectingCells] = useState<Set<string>>(new Set());
  const [bonusBanner, setBonusBanner] = useState<'intro' | 'outro' | null>(null);
  // When set, the banner waits for a player tap before proceeding.
  const [bonusBannerPending, setBonusBannerPending] = useState<'intro' | 'outro' | null>(null);
  // Seconds left on the auto-proceed countdown shown on a pending banner.
  const [bannerSecs, setBannerSecs] = useState<number | null>(null);
  const [modal, setModal] = useState<ModalState>('none');
  const [paytableTab, setPaytableTab] = useState<'pays' | 'rules'>('pays');
  const [muted, setMuted] = useState(false);
  const [sessionStart] = useState(() => Date.now());
  const [sessionMs, setSessionMs] = useState(0);

  const reelStopTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Mutable snapshot so the tumble interval reads the latest stopped flags
  // without re-subscribing every state change.
  const stoppedReelsSnapshot = useRef<boolean[]>(Array(NUM_REELS).fill(true));
  const spinTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const winCountRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flowTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const autoSpinRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const linePreviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reduceMotion = prefersReducedMotion();
  const phase = state.phase;
  const inBonus = phase === 'bonusIntro' || phase === 'bonus' || phase === 'bonusOutro';

  // ---------- Session clock ----------
  useEffect(() => {
    const id = setInterval(() => setSessionMs(Date.now() - sessionStart), 1000);
    return () => clearInterval(id);
  }, [sessionStart]);

  // ---------- Progressive jackpots: load + real-time subscription ----------
  useEffect(() => {
    const svc = jackpotRef.current as JackpotService & { dispose?: () => void };
    let unsub = () => {};
    svc.getMeters().then(setMeters).catch(() => {});
    try {
      unsub = svc.subscribe(setMeters);
    } catch {
      // RemoteJackpotService stub throws until a backend is wired — the game
      // still runs; meters just won't update.
    }
    return () => {
      try { unsub(); } catch {}
      svc.dispose?.();
    };
  }, []);

  // ---------- Timer helpers ----------
  const clearAllTimers = useCallback(() => {
    reelStopTimersRef.current.forEach(clearTimeout);
    reelStopTimersRef.current = [];
    flowTimersRef.current.forEach(clearTimeout);
    flowTimersRef.current = [];
    if (spinTickRef.current) { clearInterval(spinTickRef.current); spinTickRef.current = null; }
    if (winCountRef.current) { clearTimeout(winCountRef.current); winCountRef.current = null; }
    if (autoSpinRef.current) { clearTimeout(autoSpinRef.current); autoSpinRef.current = null; }
    if (linePreviewTimerRef.current) { clearTimeout(linePreviewTimerRef.current); linePreviewTimerRef.current = null; }
  }, []);

  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    flowTimersRef.current.push(t);
    return t;
  };

  useEffect(() => () => { clearAllTimers(); audio.stopSpin(); }, [clearAllTimers]);

  // ---------- Progressive jackpots: contribute + trigger ----------
  /** Add this spin's contribution to the shared meters (fire-and-forget). */
  const contributeJackpots = useCallback((totalBetCents: number) => {
    jackpotRef.current.contribute(totalBetCents).catch(() => {});
  }, []);

  /**
   * Roll the three FEVER triggers for this spin. On a hit: claim atomically,
   * credit the player, lock input, run the full-screen jackpot celebration,
   * then call `done()`. No hit → `done()` immediately. Runs after the spin's
   * normal win presentation (base game and bonus alike, revised spec §4).
   */
  const resolveJackpots = useCallback(
    (totalBetCents: number, done: () => void) => {
      let tiers: JackpotTier[] = [];
      try {
        tiers = engineRef.current.rollJackpotTriggers(totalBetCents, JACKPOT_BASE_ODDS);
      } catch {
        tiers = [];
      }
      if (tiers.length === 0) { done(); return; }
      const tier = tiers[0]; // >1 in a single spin is astronomically rare
      setInputLocked(true);
      jackpotRef.current
        .claim(tier)
        .then(({ amount }) => {
          engineRef.current.addJackpotWin(amount);
          setState(engineRef.current.getState());
          setJackpotWin({ tier, amount });
          audio.win('jackpot');
          haptics.jackpot();
          later(() => {
            setJackpotWin(null);
            setInputLocked(false);
            done();
          }, reduceMotion ? 700 : 8500);
        })
        .catch(() => { setInputLocked(false); done(); });
    },
    [reduceMotion]
  );

  // ---------- Win count-up ----------
  const runCountUp = useCallback((finalWin: number, tier: LuxTier, onDone?: () => void) => {
    if (finalWin <= 0) { onDone?.(); return; }
    if (reduceMotion) { setDisplayWinAmount(finalWin); onDone?.(); return; }
    const steps = tier === 'epic' ? 55 : tier === 'mega' ? 44 : tier === 'big' ? 32 : 20;
    const stepMs = tier === 'epic' ? 30 : tier === 'mega' ? 28 : 26;
    let step = 0;
    const tickUp = () => {
      step++;
      setDisplayWinAmount(Math.min(Math.floor((step / steps) * finalWin), finalWin));
      if (step % 4 === 0 && step < steps) audio.coinChime(step);
      if (step < steps) {
        winCountRef.current = setTimeout(tickUp, stepMs);
      } else {
        setDisplayWinAmount(finalWin);
        onDone?.();
      }
    };
    tickUp();
  }, [reduceMotion]);

  // ---------- Reel animation (shared by base + bonus) ----------
  const animateReels = useCallback(
    (result: SpinResult, onSettled: (r: SpinResult) => void) => {
      const finalGrid = result.grid;
      setStoppedReels(Array(NUM_REELS).fill(false));

      const tickMs = reduceMotion ? 0 : 55;
      if (!reduceMotion) {
        spinTickRef.current = setInterval(() => {
          setDisplayGrid((prev) =>
            prev.map((reel, rIdx) =>
              stoppedReelsSnapshot.current[rIdx]
                ? reel
                : reel.map(() => TUMBLE_POOL[Math.floor(Math.random() * TUMBLE_POOL.length)])
            )
          );
        }, tickMs);
      }

      // Anticipation: 2+ scatters across reels 1 & 2 slows the back reels.
      const firstTwoScatters =
        finalGrid[0].filter((s) => s === 'SCATTER').length +
        finalGrid[1].filter((s) => s === 'SCATTER').length;
      const anticipate = firstTwoScatters >= 2 && !reduceMotion;

      const baseStop = reduceMotion ? 40 : 620;
      const stagger = reduceMotion ? 40 : 260;

      const stopReel = (reelIdx: number) => {
        stoppedReelsSnapshot.current[reelIdx] = true;
        setDisplayGrid((prev) => {
          const next = prev.map((r) => [...r]);
          next[reelIdx] = [...finalGrid[reelIdx]];
          return next;
        });
        setStoppedReels((prev) => {
          const n = [...prev];
          n[reelIdx] = true;
          return n;
        });
        audio.reelStop();
        haptics.reelStop();
        if (finalGrid[reelIdx].includes('SCATTER')) audio.scatterLand();
      };

      stoppedReelsSnapshot.current = Array(NUM_REELS).fill(false);
      let cumulative = baseStop;
      for (let r = 0; r < NUM_REELS; r++) {
        if (anticipate && r === 2) {
          reelStopTimersRef.current.push(
            setTimeout(() => audio.anticipation(), cumulative - 150)
          );
        }
        const extra = anticipate && r >= 2 ? 700 : 0;
        cumulative += (r === 0 ? 0 : stagger) + extra;
        const stopAt = cumulative;
        if (r < NUM_REELS - 1) {
          reelStopTimersRef.current.push(setTimeout(() => stopReel(r), stopAt));
        } else {
          reelStopTimersRef.current.push(
            setTimeout(() => {
              stopReel(r);
              if (spinTickRef.current) { clearInterval(spinTickRef.current); spinTickRef.current = null; }
              audio.stopSpin();
              setDisplayGrid(finalGrid.map((reel) => [...reel]));
              onSettled(result);
            }, stopAt)
          );
        }
      }
    },
    [reduceMotion]
  );

  // ---------- Winning-cell highlight ----------
  const winningCellKeys = useCallback((r: SpinResult): Set<string> => {
    const keys = new Set<string>();
    for (const wl of r.winningLines) {
      const line = PAYLINES[wl.line];
      for (let reel = 0; reel < wl.count; reel++) {
        keys.add(`${reel}:${line[reel]}`);
      }
    }
    if (r.scatterCount >= 3) {
      for (let reel = 0; reel < NUM_REELS; reel++) {
        for (let row = 0; row < NUM_ROWS; row++) {
          if (r.grid[reel][row] === 'SCATTER') keys.add(`${reel}:${row}`);
        }
      }
    }
    return keys;
  }, []);

  // ---------- Bonus flow ----------
  const runBonusSpin = useCallback(() => {
    const result = engineRef.current.bonusSpin();
    if (!result) return;
    setIsSpinning(true);
    setActiveWinLines([]);
    setWinCells(new Set());
    setDisplayWinAmount(0);
    setWinTier(null);
    audio.startSpin();
    {
      const bb = engineRef.current.getState();
      contributeJackpots(bb.bonusLineBetCents * bb.bonusLineCount);
    }

    animateReels(result, (r) => {
      setIsSpinning(false);
      setState(engineRef.current.getState());
      setActiveWinLines(r.winningLines.map((w) => w.line));
      setWinCells(winningCellKeys(r));
      const bs = engineRef.current.getState();
      const bonusTotalBet = bs.bonusLineBetCents * bs.bonusLineCount;
      // Retrigger: brief "+12 FREE SPINS!" flash (revised spec §3).
      if (r.retriggered) {
        setRetriggerFlash(true);
        audio.bonusTrigger();
        haptics.jackpot();
        later(() => setRetriggerFlash(false), reduceMotion ? 350 : 1100);
      }
      const tier = classifyWinTier(r.totalWin, bonusTotalBet);
      setWinTier(tier);
      if (tier) { audio.win(audioTierFor(tier)); haptics.win(); }

      runCountUp(r.totalWin, tier ?? 'small', () => {
        // Diamond collection animation, then advance.
        const collectStep = (i: number) => {
          if (i >= r.collectedWilds.length) {
            afterCollect(r);
            return;
          }
          const [reel, row] = r.collectedWilds[i];
          setCollectingCells((prev) => new Set(prev).add(`${reel}:${row}`));
          audio.diamondCollect();
          later(() => {
            audio.multiplierTick();
            haptics.light();
            setCollectingCells((prev) => {
              const n = new Set(prev);
              n.delete(`${reel}:${row}`);
              return n;
            });
            setState(engineRef.current.getState());
            collectStep(i + 1);
          }, reduceMotion ? 60 : 420);
        };
        collectStep(0);
      });
    });
  }, [animateReels, runCountUp, winningCellKeys, reduceMotion, contributeJackpots]);

  const afterCollect = useCallback(
    (r: SpinResult) => {
      const st = engineRef.current.getState();
      setState(st);
      const bonusTotalBet = st.bonusLineBetCents * st.bonusLineCount;
      // A jackpot can trigger on a bonus spin too — resolve it before
      // advancing to the next free spin or the outro.
      resolveJackpots(bonusTotalBet, () => {
        if (st.phase === 'bonusOutro') {
          // Bonus session total also drives the win-tier celebration.
          const sessionTier = classifyWinTier(st.bonusWin, bonusTotalBet);
          later(() => {
            setBonusBanner('outro');
            setBonusBannerPending('outro');
            if (sessionTier) { setWinTier(sessionTier); audio.win(audioTierFor(sessionTier)); }
            audio.bonusOutro();
            haptics.jackpot();
          }, 500);
        } else {
          later(() => runBonusSpin(), reduceMotion ? 120 : 850);
        }
      });
    },
    [runBonusSpin, reduceMotion, resolveJackpots]
  );

  // Show the intro banner and wait for the player to tap START.
  useEffect(() => {
    if (phase === 'bonusIntro' && bonusBanner === null) {
      setBonusBanner('intro');
      setBonusBannerPending('intro');
      audio.bonusTrigger();
      haptics.jackpot();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ---------- Banner tap — player dismisses intro or outro ----------
  const handleBannerTap = useCallback(() => {
    audio.click();
    haptics.medium();
    if (bonusBannerPending === 'intro') {
      setBonusBannerPending(null);
      setBonusBanner(null);
      engineRef.current.beginBonusSpins();
      setState(engineRef.current.getState());
      later(() => runBonusSpin(), reduceMotion ? 100 : 500);
    } else if (bonusBannerPending === 'outro') {
      setBonusBannerPending(null);
      setBonusBanner(null);
      engineRef.current.endBonus();
      setState(engineRef.current.getState());
      setActiveWinLines([]);
      setWinCells(new Set());
      setWinTier(null);
      setDisplayWinAmount(0);
      setPresenting(false);
    }
  }, [bonusBannerPending, runBonusSpin, reduceMotion]);

  // Auto-proceed countdown. Manual play gives a long grace period (intro 2 min,
  // outro 60 s). During an auto-spin run the player has stepped away, so keep
  // things moving: intro 15 s, outro 30 s. Tapping clears bonusBannerPending,
  // which tears this down.
  useEffect(() => {
    if (!bonusBannerPending) { setBannerSecs(null); return; }
    let remaining =
      bonusBannerPending === 'intro'
        ? (autoSpinEnabled ? 15 : 120)
        : (autoSpinEnabled ? 30 : 60);
    setBannerSecs(remaining);
    const id = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(id);
        setBannerSecs(0);
        handleBannerTap();
      } else {
        setBannerSecs(remaining);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [bonusBannerPending, autoSpinEnabled, handleBannerTap]);

  // ---------- Base spin ----------
  const handleSpin = useCallback(() => {
    if (isSpinning || inBonus || inputLocked) return;
    const totalBet = state.totalBetCents;
    const result = engineRef.current.spin();
    if (!result) return;

    audio.unlock();
    audio.click();
    haptics.medium();
    audio.startSpin();
    contributeJackpots(totalBet);

    if (linePreviewTimerRef.current) {
      clearTimeout(linePreviewTimerRef.current);
      linePreviewTimerRef.current = null;
    }
    setLinePreview(false);
    setPresenting(true);
    setIsSpinning(true);
    setActiveWinLines([]);
    setWinCells(new Set());
    setDisplayWinAmount(0);
    setWinTier(null);

    animateReels(result, (r) => {
      setIsSpinning(false);
      setState(engineRef.current.getState());
      setActiveWinLines(r.winningLines.map((w) => w.line));
      setWinCells(winningCellKeys(r));

      const tier = classifyWinTier(r.totalWin, state.totalBetCents);
      setWinTier(tier);
      if (tier) {
        audio.win(audioTierFor(tier));
        if (tier === 'epic' || tier === 'mega') haptics.jackpot();
        else haptics.win();
      }
      runCountUp(r.totalWin, tier ?? 'small', () => {
        resolveJackpots(totalBet, () => {
          if (r.triggerBonus) {
            // Engine has already moved to 'bonusIntro'; reflect it so the
            // bonus-intro effect fires.
            setState(engineRef.current.getState());
          } else if (
            autoSpinEnabled &&
            (tier === 'big' || tier === 'mega' || tier === 'epic')
          ) {
            // Pause the run on a BIG win or greater — the player must RESUME.
            setAutoSpinPaused(true);
          }
          // Presentation fully resolved (incl. pause decision). The
          // effect-driven scheduler may now continue the run if not paused.
          setPresenting(false);
        });
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpinning, inBonus, inputLocked, animateReels, runCountUp, winningCellKeys, state.totalBetCents, autoSpinEnabled, contributeJackpots, resolveJackpots]);

  // Auto-spin scheduler. Effect-driven (no recursive setTimeout in handleSpin,
  // which captured a stale count) so the run is robust. Schedules the next
  // spin only when fully idle and the run is active + not paused.
  useEffect(() => {
    if (
      autoSpinEnabled &&
      !autoSpinPaused &&
      autoSpinCount > 0 &&
      !isSpinning &&
      !presenting &&
      !inBonus &&
      !inputLocked &&
      modal === 'none' &&
      !bonusBanner &&
      !jackpotWin &&
      !retriggerFlash &&
      state.phase === 'base' &&
      state.credits >= state.totalBetCents
    ) {
      autoSpinRef.current = setTimeout(() => {
        setAutoSpinCount((c) => c - 1);
        handleSpin();
      }, reduceMotion ? 150 : 600);
    }
    return () => {
      if (autoSpinRef.current) { clearTimeout(autoSpinRef.current); autoSpinRef.current = null; }
    };
  }, [
    autoSpinEnabled, autoSpinPaused, autoSpinCount, isSpinning, presenting,
    inBonus, inputLocked, modal, bonusBanner, jackpotWin, retriggerFlash,
    state.phase, state.credits, state.totalBetCents, reduceMotion, handleSpin,
  ]);

  // End the run when its count is exhausted, or — once back in the base game —
  // the balance can't cover the next spin. A free-spin bonus does NOT end the
  // run: the scheduler is gated on !inBonus, so it simply waits out the bonus
  // and resumes with the remaining count when play returns to 'base'.
  useEffect(() => {
    if (!autoSpinEnabled) return;
    const exhausted = autoSpinCount <= 0;
    const brokeInBase =
      state.phase === 'base' && state.credits < state.totalBetCents;
    if (exhausted || brokeInBase) {
      setAutoSpinEnabled(false);
      setAutoSpinCount(0);
      setAutoSpinPaused(false);
    }
  }, [autoSpinEnabled, autoSpinCount, state.phase, state.credits, state.totalBetCents]);

  // ---------- Line-preview helpers ----------
  // Show the active paylines over the reels with an auto-fade; any non-line
  // action (spin, bet change, auto, modal) dismisses it immediately.
  const flashLinePreview = () => {
    setLinePreview(true);
    if (linePreviewTimerRef.current) clearTimeout(linePreviewTimerRef.current);
    linePreviewTimerRef.current = setTimeout(() => setLinePreview(false), 4500);
  };
  const dismissLinePreview = () => {
    if (linePreviewTimerRef.current) {
      clearTimeout(linePreviewTimerRef.current);
      linePreviewTimerRef.current = null;
    }
    setLinePreview(false);
  };

  // ---------- Handlers ----------
  const stepBet = (dir: 1 | -1) => {
    if (isSpinning || inBonus) return;
    audio.unlock();
    audio.tick();
    haptics.light();
    dismissLinePreview();
    engineRef.current.stepLineBet(dir);
    setState(engineRef.current.getState());
  };

  const stepLines = (dir: 1 | -1) => {
    if (isSpinning || inBonus) return;
    audio.unlock();
    audio.tick();
    haptics.light();
    engineRef.current.stepLineCount(dir);
    setState(engineRef.current.getState());
    flashLinePreview();
  };

  const handleMaxBet = () => {
    if (isSpinning || inBonus) return;
    audio.unlock();
    audio.click();
    haptics.light();
    // MAX = all lines at the top per-line bet.
    engineRef.current.setLineCount(NUM_PAYLINES);
    engineRef.current.setLineBet(LINE_BET_STEPS_CENTS[LINE_BET_STEPS_CENTS.length - 1]);
    setState(engineRef.current.getState());
    flashLinePreview();
  };

  const openModal = (m: ModalState) => {
    audio.unlock();
    audio.click();
    haptics.light();
    dismissLinePreview();
    setModal(m);
  };
  const closeModal = () => { audio.click(); setModal('none'); };

  const toggleMute = () => {
    audio.unlock();
    audio.click();
    haptics.light();
    const next = !muted;
    setMuted(next);
    audio.setMuted(next);
    haptics.setEnabled(!next);
  };

  const handleAutoSpinClick = () => {
    audio.unlock();
    audio.click();
    haptics.light();
    dismissLinePreview();
    if (autoSpinEnabled && autoSpinPaused) {
      // Resume a run paused by a big win.
      setAutoSpinPaused(false);
    } else if (autoSpinEnabled) {
      // Stop the run.
      setAutoSpinEnabled(false);
      setAutoSpinCount(0);
      setAutoSpinPaused(false);
    } else {
      setModal('autospin');
    }
  };
  const startAutoSpin = (count: number) => {
    audio.click();
    haptics.light();
    setAutoSpinCount(count);
    setAutoSpinPaused(false);
    setAutoSpinEnabled(true);
    setModal('none');
    // The auto-spin scheduler effect starts the run automatically.
  };

  // ---------- Derived ----------
  const multiplier = state.bonusMultiplier;
  const canSpin = !isSpinning && !inBonus && !inputLocked && state.credits >= state.totalBetCents;
  const diamondSlots = 10;

  // ---------- Render ----------
  return (
    <div
      className={`stage lux-stage ${winTier ? `win-tier-${winTier}` : ''} ${inBonus ? 'lux-bonus-mode' : ''}`}
      aria-label="Diamond Riches slot machine"
    >
      {/* Shared SVG gradient/filter defs — mounted once, never unmounts */}
      <LuxurySymbolDefs />
      <div className="cabinet-frame">
        <div className="cabinet-inner">
          <div className="cabinet-watermark" aria-hidden="true">DR</div>
          <div className="cabinet-glare" aria-hidden="true" />
          <div className="cabinet-vignette" aria-hidden="true" />
          <div className="cabinet-stud stud-tl" aria-hidden="true" />
          <div className="cabinet-stud stud-tr" aria-hidden="true" />
          <div className="cabinet-stud stud-bl" aria-hidden="true" />
          <div className="cabinet-stud stud-br" aria-hidden="true" />

          <div className="cabinet-content lux-content">
            {/* Chrome bar */}
            <div className="chrome-bar" role="toolbar" aria-label="Game utilities">
              <div className="session-clock" aria-label={`Session time ${formatDuration(sessionMs)}`}>
                <span className="session-clock-dot" />
                <span className="session-clock-time">{formatDuration(sessionMs)}</span>
              </div>
              <div className="chrome-bar-right">
                {onExit && (
                  <button
                    className="utility-icon"
                    onClick={() => { audio.click(); if (!inBonus) onExit(); }}
                    disabled={inBonus}
                    aria-label="Exit to lobby"
                  >
                    ✕
                  </button>
                )}
                <button
                  className="utility-icon"
                  onClick={toggleMute}
                  aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                  aria-pressed={muted}
                >
                  {muted ? '🔇' : '🔊'}
                </button>
                <button
                  className="utility-icon"
                  onClick={() => openModal('info')}
                  aria-label="Open info and responsible gaming"
                >
                  i
                </button>
              </div>
            </div>

            {/* Progressive jackpot meters (shared across all players) */}
            <div className="lux-jp-strip" role="status" aria-label="Progressive jackpots">
              {JACKPOT_TIERS.map((tier) => {
                const val = meters ? meters[tier] : JACKPOT_CONFIG[tier].seedValue;
                const justWon = meters?.lastWonTier === tier;
                return (
                  <div key={tier} className={`lux-jp lux-jp-${tier} ${justWon ? 'lux-jp-hit' : ''}`}>
                    <span className="lux-jp-label">{JACKPOT_CONFIG[tier].label}</span>
                    <span className="lux-jp-value">
                      {justWon ? 'JACKPOT HIT!' : formatDollars(val)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Marquee */}
            <header className="marquee lux-marquee">
              <h1 className="marquee-title lux-title">DIAMOND RICHES</h1>
              {inBonus && (
                <div className="lux-bonus-subtitle">BONUS REELS IN PLAY</div>
              )}
            </header>

            {/* Bonus status bar (free spins only) */}
            {inBonus && (
              <div className="lux-bonus-bar" role="status" aria-live="polite">
                <div className="lux-bonus-stat">
                  <span className="readout-label">SPINS REMAINING</span>
                  <span className="led-value led-amber-sm">{state.freeSpinsRemaining}</span>
                </div>
                <div className="lux-mult-display" aria-label={`Multiplier ${multiplier} times`}>
                  <span className="lux-mult-label">MULTIPLIER</span>
                  <span className="lux-mult-value">{multiplier}×</span>
                </div>
                <div className="lux-bonus-stat">
                  <span className="readout-label">BONUS</span>
                  <span className="led-value led-amber-sm">{formatCents(state.bonusWin)}</span>
                </div>
              </div>
            )}

            {/* Diamond meter (free spins only) */}
            {inBonus && (
              <div className="lux-diamond-meter" aria-label={`${state.diamondsCollected} diamonds collected`}>
                {Array.from({ length: diamondSlots }).map((_, i) => (
                  <span
                    key={i}
                    className={`lux-diamond-slot ${i < state.diamondsCollected ? 'filled' : ''}`}
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 100 100"><use href="#lux-meter-gem" /></svg>
                  </span>
                ))}
                <span className="lux-diamond-count">
                  {state.diamondsCollected}
                  {state.diamondsCollected >= diamondSlots ? ` 💎` : ''}
                </span>
                {/* shared gem def for the meter */}
                <svg width="0" height="0" aria-hidden="true">
                  <defs>
                    <radialGradient id="lux-meter-grad" cx="42%" cy="32%" r="75%">
                      <stop offset="0%" stopColor="#EAFBFF" />
                      <stop offset="45%" stopColor="#7FE3F5" />
                      <stop offset="100%" stopColor="#2A8FC8" />
                    </radialGradient>
                    <path id="lux-meter-gem" d="M 28 38 L 50 14 L 72 38 L 50 90 Z"
                      fill="url(#lux-meter-grad)" stroke="#1C6E96" strokeWidth="3" strokeLinejoin="round" />
                  </defs>
                </svg>
              </div>
            )}

            {/* Reels — 3 columns × 5 rows (rotated 90°), paylines top to bottom */}
            <div className="lux-reel-wrap">
              <div className="lux-row-labels" aria-hidden="true">
                {Array.from({ length: NUM_REELS }, (_, i) => (
                  <span key={i} className="lux-row-num">{i + 1}</span>
                ))}
              </div>
              <div
                className={`lux-reels ${isSpinning ? 'spinning' : ''}`}
                role="grid"
                aria-label="Slot reels, 3 columns by 5 rows"
              >
              {Array.from({ length: NUM_REELS }).map((_, reel) => (
                <div
                  key={reel}
                  className={`lux-reel ${isSpinning && !stoppedReels[reel] ? 'spinning' : ''}`}
                  role="row"
                >
                  {Array.from({ length: NUM_ROWS }).map((_, col) => {
                    const sym = displayGrid[reel]?.[col] ?? 'BLANK';
                    const key = `${reel}:${col}`;
                    const isWin = winCells.has(key);
                    const isCollecting = collectingCells.has(key);
                    const dim = winCells.size > 0 && !isWin && !isSpinning;
                    return (
                      <div
                        key={col}
                        className={`lux-cell ${isWin ? 'winning' : ''} ${dim ? 'dimmed' : ''} ${isCollecting ? 'collecting' : ''}`}
                        role="gridcell"
                        aria-label={`Row ${reel + 1} column ${col + 1}, ${SYMBOL_LABELS[sym]}`}
                      >
                        <div className="lux-symbol">{getLuxurySymbolSVG(sym)}</div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Winning payline overlay — vertical paths top-to-bottom */}
              {activeWinLines.length > 0 && !isSpinning && (
                <svg className="lux-payline-overlay" viewBox="0 0 300 500" aria-hidden="true" preserveAspectRatio="none">
                  {activeWinLines.map((lineIdx) => {
                    const line = PAYLINES[lineIdx];
                    // x = column position (0/1/2 → 50/150/250 in 300-wide box)
                    // y = row band    (0..4  → 50/150/250/350/450 in 500-tall box)
                    const pts = line
                      .map((colIdx, rowBand) => `${colIdx * 100 + 50},${rowBand * 100 + 50}`)
                      .join(' ');
                    return (
                      <polyline
                        key={lineIdx}
                        points={pts}
                        fill="none"
                        stroke="#7FE3F5"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.92"
                        className="lux-payline-stroke"
                      />
                    );
                  })}
                </svg>
              )}

              {/* Active-line preview — shown while adjusting LINES, fades on any action */}
              {linePreview && !isSpinning && !inBonus && activeWinLines.length === 0 && (
                <svg
                  className="lux-line-preview"
                  viewBox="0 0 300 500"
                  aria-hidden="true"
                  preserveAspectRatio="none"
                >
                  {PAYLINES.slice(0, state.lineCount).map((line, i) => {
                    const pts = line
                      .map((colIdx, rowBand) => `${colIdx * 100 + 50},${rowBand * 100 + 50}`)
                      .join(' ');
                    // Golden-angle hue spacing keeps every line a distinct
                    // colour; alternating lightness separates lines that
                    // share cells. (Winning lines render in one colour below.)
                    const hue = Math.round((i * 137.508) % 360);
                    const light = i % 2 === 0 ? 66 : 54;
                    return (
                      <polyline
                        key={i}
                        points={pts}
                        fill="none"
                        stroke={`hsl(${hue} 92% ${light}%)`}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lux-preview-stroke"
                      />
                    );
                  })}
                </svg>
              )}
              </div>
            </div>

            {/* Compact bottom control panel */}
            <div className="lux-bottom" role="region" aria-label="Game controls">

              {/* Row 1: LED readouts */}
              <div className="lux-readout-row">
                <div className="lux-readout-pill led-frame">
                  <span className="readout-label">CREDIT</span>
                  <span className="led-value led-amber-sm">{formatCents(state.credits)}</span>
                </div>
                <div className="lux-readout-pill led-frame">
                  <span className="readout-label">{inBonus ? 'MULT' : 'TOTAL BET'}</span>
                  <span className="led-value led-amber-sm">
                    {inBonus ? `${multiplier}×` : formatCents(state.totalBetCents)}
                  </span>
                </div>
                <div className="lux-readout-pill led-frame" aria-live="polite">
                  <span className="readout-label">{inBonus ? 'BONUS WIN' : 'LAST WIN'}</span>
                  <span className={`led-value led-amber-sm${winTier ? ` tier-${winTier === 'epic' ? 'jackpot' : winTier}` : ''}`}>
                    {formatCents(displayWinAmount)}
                  </span>
                </div>
              </div>

              {/* Active-lines pip strip — sleek indicator of which lines play */}
              <div
                className={`lux-line-pips${linePreview ? ' is-active' : ''}`}
                role="img"
                aria-label={`${state.lineCount} of ${NUM_PAYLINES} paylines active`}
              >
                {Array.from({ length: NUM_PAYLINES }).map((_, i) => (
                  <span key={i} className={`lux-pip${i < state.lineCount ? ' on' : ''}`} />
                ))}
                <span className="lux-pip-count">{state.lineCount}/{NUM_PAYLINES}</span>
              </div>

              {/* Row 2: Bet steppers + MAX */}
              <div className="lux-stepper-row">
                <div className="lux-stepper-group">
                  <span className="lux-stepper-label">LINES</span>
                  <div className="lux-stepper-controls">
                    <button
                      className="bet-step-button lux-step-sm"
                      onClick={() => stepLines(-1)}
                      disabled={isSpinning || inBonus || state.lineCount <= 1}
                      aria-label="Fewer lines"
                    >−</button>
                    <div className="led-frame lux-step-led">
                      <span className="led-value led-amber">{state.lineCount}</span>
                    </div>
                    <button
                      className="bet-step-button lux-step-sm"
                      onClick={() => stepLines(1)}
                      disabled={isSpinning || inBonus || state.lineCount >= NUM_PAYLINES}
                      aria-label="More lines"
                    >+</button>
                  </div>
                </div>
                <div className="lux-stepper-group">
                  <span className="lux-stepper-label">BET/LINE</span>
                  <div className="lux-stepper-controls">
                    <button
                      className="bet-step-button lux-step-sm"
                      onClick={() => stepBet(-1)}
                      disabled={isSpinning || inBonus || state.lineBetCents <= LINE_BET_STEPS_CENTS[0]}
                      aria-label="Lower bet"
                    >−</button>
                    <div className="led-frame lux-step-led">
                      <span className="led-value led-amber">{formatCents(state.lineBetCents)}</span>
                    </div>
                    <button
                      className="bet-step-button lux-step-sm"
                      onClick={() => stepBet(1)}
                      disabled={isSpinning || inBonus || state.lineBetCents >= LINE_BET_STEPS_CENTS[LINE_BET_STEPS_CENTS.length - 1]}
                      aria-label="Higher bet"
                    >+</button>
                  </div>
                </div>
                <button
                  className={`max-bet-button lux-max-btn${state.lineCount === NUM_PAYLINES && state.lineBetCents === LINE_BET_STEPS_CENTS[LINE_BET_STEPS_CENTS.length - 1] ? ' active' : ''}`}
                  onClick={handleMaxBet}
                  disabled={isSpinning || inBonus}
                  aria-label="Max bet"
                >MAX</button>
              </div>

              {/* Row 3: Spin + Auto + Pays */}
              <div className="lux-action-row">
                <button
                  className={`spin-button lux-spin${isSpinning ? ' spinning' : ''}${inBonus ? ' jackpot-glow' : ''}`}
                  onClick={handleSpin}
                  disabled={!canSpin}
                  aria-label={inBonus ? 'Free spins in progress' : isSpinning ? 'Spinning' : 'Spin reels'}
                >
                  <span className="spin-button-inner">
                    {inBonus ? 'FREE SPINS' : isSpinning ? 'SPIN…' : 'SPIN'}
                  </span>
                </button>
                <button
                  className={`autospin-button${autoSpinEnabled ? ' active' : ''}${autoSpinEnabled && autoSpinPaused ? ' autospin-paused' : ''}`}
                  onClick={handleAutoSpinClick}
                  disabled={inBonus || inputLocked || state.credits < state.totalBetCents}
                  aria-label={
                    autoSpinEnabled && autoSpinPaused
                      ? `Resume auto-spin (${autoSpinCount} left)`
                      : autoSpinEnabled
                      ? `Stop auto-spin (${autoSpinCount} left)`
                      : 'Choose auto-spin count'
                  }
                  aria-pressed={autoSpinEnabled}
                >
                  {autoSpinEnabled && autoSpinPaused
                    ? `RESUME (${autoSpinCount})`
                    : autoSpinEnabled
                    ? `AUTO (${autoSpinCount})`
                    : 'AUTO'}
                </button>
                <button
                  className="paytable-icon-button"
                  onClick={() => openModal('paytable')}
                  disabled={isSpinning}
                  aria-label="Open paytable"
                >
                  <span aria-hidden="true">📖</span>
                  <span className="paytable-icon-label">PAYS</span>
                </button>
              </div>

              {/* Win badge */}
              {winTier && (
                <div className={`win-badge lux-win-badge badge-${winTier === 'epic' ? 'jackpot' : winTier}`} role="status">
                  {winTier === 'epic' && '★ EPIC WIN ★'}
                  {winTier === 'mega' && '★ MEGA WIN ★'}
                  {winTier === 'big' && 'BIG WIN'}
                  {(winTier === 'win' || winTier === 'small') && 'WIN'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bonus intro / outro banner — red-velvet treatment; player taps to proceed */}
      {bonusBanner && (
        <div
          className={`lux-bonus-banner lux-velvet banner-${bonusBanner}${bonusBannerPending ? ' lux-banner-interactive' : ''}`}
          onClick={bonusBannerPending ? handleBannerTap : undefined}
          onKeyDown={bonusBannerPending ? (e) => { if (e.key === 'Enter' || e.key === ' ') handleBannerTap(); } : undefined}
          role={bonusBannerPending ? 'button' : undefined}
          tabIndex={bonusBannerPending ? 0 : undefined}
          aria-label={
            bonusBannerPending === 'intro' ? 'Tap to start free spins' :
            bonusBannerPending === 'outro' ? 'Tap to continue' : undefined
          }
        >
          <div className="lux-velvet-frame">
            {bonusBanner === 'intro' ? (
              <>
                <div className="lux-velvet-title">DIAMOND RICHES</div>
                <div className="lux-velvet-sub">BONUS REELS IN PLAY</div>
                <div className="lux-velvet-coin">💰</div>
                <div className="lux-velvet-cursive">Congratulations!</div>
                <div className="lux-banner-big">{FREE_SPINS_AWARDED} Free Spins Won!</div>
                <div className="lux-velvet-sub">
                  Collect diamonds — multiplier climbs to {MAX_BONUS_MULTIPLIER}× · retriggers add +{FREE_SPINS_AWARDED}
                </div>
                {bonusBannerPending && (
                  <div className="lux-banner-cta">
                    TAP TO START
                    {bannerSecs !== null && (
                      <span className="lux-banner-timer">
                        auto-starts in {formatDuration(bannerSecs * 1000)}
                      </span>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="lux-velvet-cursive">Congratulations!</div>
                <div className="lux-velvet-title">Free Spin Bonus</div>
                <div className="lux-velvet-row">
                  <span className="lux-velvet-gem">◆</span>
                  <span className="lux-banner-big">{formatCents(state.bonusWin)} Won</span>
                  <span className="lux-velvet-gem">◆</span>
                </div>
                {bonusBannerPending && (
                  <div className="lux-banner-cta">
                    TAP TO CONTINUE
                    {bannerSecs !== null && (
                      <span className="lux-banner-timer">
                        auto-continues in {formatDuration(bannerSecs * 1000)}
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Retrigger flash (revised spec §3) */}
      {retriggerFlash && (
        <div className="lux-retrigger-flash" aria-hidden="true">
          <div className="lux-retrigger-text">+{FREE_SPINS_AWARDED} FREE SPINS!</div>
        </div>
      )}

      {/* Progressive jackpot celebration (revised spec §5) */}
      {jackpotWin && (
        <div
          className={`lux-jp-celebration lux-jp-cel-${jackpotWin.tier}`}
          role="status"
          aria-label={`${JACKPOT_CONFIG[jackpotWin.tier].label} jackpot won`}
        >
          <div className="lux-jp-flash" />
          {!reduceMotion && (
            <div className="lux-jp-confetti">
              {Array.from({ length: 40 }).map((_, i) => (
                <span
                  key={i}
                  className="lux-jp-conf"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 1.2}s`,
                    animationDuration: `${2 + Math.random() * 2}s`,
                  }}
                />
              ))}
            </div>
          )}
          <div className="lux-jp-cel-inner">
            <div className="lux-jp-cel-title">{JACKPOT_CONFIG[jackpotWin.tier].label} JACKPOT!</div>
            <div className="lux-jp-cel-amount">{formatDollars(jackpotWin.amount)}</div>
            <div className="lux-jp-cel-sub">Added to your credits</div>
          </div>
        </div>
      )}

      {/* Celebration overlay (big / mega / epic) */}
      {winTier && (winTier === 'big' || winTier === 'mega' || winTier === 'epic') && (
        <div className={`celebration-overlay celebration-${winTier === 'epic' ? 'jackpot' : winTier}`} aria-hidden="true">
          <div className="celebration-glow" />
          {!reduceMotion && (
            <div className="celebration-particles">
              {Array.from({ length: winTier === 'epic' ? 24 : winTier === 'mega' ? 16 : 8 }).map((_, i) => (
                <span
                  key={i}
                  className="particle"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 0.6}s`,
                    animationDuration: `${1.4 + Math.random() * 1.2}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------- PAYTABLE MODAL ---------- */}
      {modal === 'paytable' && (
        <div className="modal-overlay" onClick={closeModal} role="dialog" aria-modal="true" aria-labelledby="lux-pt-title">
          <div className="modal-panel paytable-modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2 id="lux-pt-title">DIAMOND RICHES PAYTABLE</h2>
              <button className="modal-close" onClick={closeModal} aria-label="Close paytable">✕</button>
            </header>
            <nav className="paytable-tabs" role="tablist">
              <button role="tab" aria-selected={paytableTab === 'pays'}
                className={paytableTab === 'pays' ? 'tab-active' : ''}
                onClick={() => setPaytableTab('pays')}>PAYOUTS</button>
              <button role="tab" aria-selected={paytableTab === 'rules'}
                className={paytableTab === 'rules' ? 'tab-active' : ''}
                onClick={() => setPaytableTab('rules')}>RULES &amp; LINES</button>
            </nav>

            {paytableTab === 'pays' && (
              <div className="paytable-body">
                <div className="paytable-col">
                  <h3 className="paytable-col-header">
                    SYMBOL PAYS
                    <span className="paytable-col-sub">× bet per line · top→bottom from row 1</span>
                  </h3>
                  {(['JET','YACHT','CAR','MONEY','RING','WATCH','GOLD_BARS','SILVER_BARS','GOLD_BAR'] as SymbolId[]).map((id) => (
                    <div className="pay-row" key={id}>
                      <div className="pay-icon">{getLuxurySymbolSVG(id)}</div>
                      <span className="symbol-name">{SYMBOL_LABELS[id]}</span>
                      <span className="pay-mult">
                        {[5,4,3,2].filter((n) => PAYTABLE[id][n] !== undefined)
                          .map((n) => `${n}:×${PAYTABLE[id][n]}`).join('  ')}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="paytable-col">
                  <h3 className="paytable-col-header">
                    SPECIAL SYMBOLS
                    <span className="paytable-col-sub">wild · scatter · bonus</span>
                  </h3>
                  <div className="pay-row pay-row-jackpot">
                    <div className="pay-icon">{getLuxurySymbolSVG('WILD')}</div>
                    <span className="symbol-name">Diamond Wild — rows 2/3/4. Substitutes for every symbol incl. the Scatter, and doubles the line.</span>
                  </div>
                  <div className="pay-row pay-row-cherry">
                    <div className="pay-icon">{getLuxurySymbolSVG('SCATTER')}</div>
                    <span className="symbol-name">Gold Coin Scatter — pays × total bet (3:×2 4:×15 5:×100). Diamond Wilds count as Scatters; 3+ awards {FREE_SPINS_AWARDED} free spins.</span>
                  </div>
                  <div className="rules-section" style={{ marginTop: 10 }}>
                    <h3>FREE SPIN BONUS</h3>
                    <p>{FREE_SPINS_AWARDED} free spins on a richer reel set.
                      Every diamond wild on rows 2/3/4 is collected and permanently
                      raises a persistent multiplier — starting at 2× and climbing
                      +1 per diamond to a maximum of {MAX_BONUS_MULTIPLIER}×.</p>
                  </div>
                </div>
              </div>
            )}

            {paytableTab === 'rules' && (
              <div className="paytable-body rules-body">
                <section className="rules-section">
                  <h3>HOW TO PLAY</h3>
                  <ol>
                    <li>Choose how many of the {NUM_PAYLINES} lines to play and your bet per line (or tap MAX).</li>
                    <li>Press SPIN. Reels spin left→right; wins pay top→bottom from row 1, 3+ of a kind (Jet pays from 2).</li>
                    <li>A diamond wild on rows 2/3/4 doubles any line it completes.</li>
                    <li>3+ gold coins trigger {FREE_SPINS_AWARDED} free spins with a growing multiplier.</li>
                  </ol>
                </section>
                <section className="rules-section">
                  <h3>{NUM_PAYLINES} PAYLINES</h3>
                  <div className="paylines-grid">
                    {PAYLINES.map((line, i) => (
                      <LuxPaylineDiagram key={i} index={i} rows={line} />
                    ))}
                  </div>
                </section>
                <section className="rules-section">
                  <h3>FAIRNESS</h3>
                  <p>Outcomes use a Mersenne Twister RNG seeded at launch from system entropy.</p>
                  <p>Theoretical return to player: <strong>{GAME_RTP}</strong></p>
                </section>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------- INFO MODAL ---------- */}
      {modal === 'info' && (
        <div className="modal-overlay" onClick={closeModal} role="dialog" aria-modal="true" aria-labelledby="lux-info-title">
          <div className="modal-panel info-modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2 id="lux-info-title">GAME INFO</h2>
              <button className="modal-close" onClick={closeModal} aria-label="Close info">✕</button>
            </header>
            <div className="info-body">
              <section className="info-section">
                <h3>Game</h3>
                <dl className="info-dl">
                  <dt>Title</dt><dd>Diamond Riches</dd>
                  <dt>Layout</dt><dd>3 columns × 5 rows</dd>
                  <dt>Paylines</dt><dd>1–{NUM_PAYLINES} selectable</dd>
                  <dt>RTP</dt><dd>{GAME_RTP}</dd>
                  <dt>RNG</dt><dd>Mersenne Twister</dd>
                  <dt>Volatility</dt><dd>Medium-High</dd>
                </dl>
              </section>
              <section className="info-section">
                <h3>Session</h3>
                <dl className="info-dl"><dt>Elapsed</dt><dd>{formatDuration(sessionMs)}</dd></dl>
              </section>
              <section className="info-section rg-section">
                <h3>Play Responsibly</h3>
                <p>Set a budget. Take regular breaks. Gambling should be entertainment, not a way to make money.</p>
                <p className="rg-resources">
                  <strong>U.S.:</strong> 1-800-GAMBLER ·{' '}
                  <a href="https://www.ncpgambling.org" target="_blank" rel="noopener noreferrer">ncpgambling.org</a>
                </p>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* ---------- AUTO-SPIN PICKER ---------- */}
      {modal === 'autospin' && (
        <div className="modal-overlay" onClick={closeModal} role="dialog" aria-modal="true" aria-labelledby="lux-as-title">
          <div className="modal-panel autospin-modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2 id="lux-as-title">AUTO SPIN</h2>
              <button className="modal-close" onClick={closeModal} aria-label="Close auto-spin picker">✕</button>
            </header>
            <div className="autospin-body">
              <p className="autospin-prompt">CHOOSE NUMBER OF SPINS</p>
              <div className="autospin-options">
                {AUTOSPIN_PRESETS.map((n) => (
                  <button key={n} className="autospin-option-button"
                    onClick={() => startAutoSpin(n)} aria-label={`Start ${n} auto-spins`}>
                    {n}
                  </button>
                ))}
              </div>
              <p className="autospin-stop-note">
                Auto-spin <strong>pauses on a BIG win or greater</strong> and waits
                for you to tap <strong>RESUME</strong>. If a free-spin bonus is
                triggered it <strong>resumes the remaining count</strong> once the
                bonus finishes.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Sub-components ----------

function LuxPaylineDiagram({ index, rows }: { index: number; rows: readonly number[] }) {
  // 3 cols × 5 rows mini grid (each cell 18px in a 54×90 viewBox).
  // rows[band] = column position (0/1/2) for that row band (0..4), top→bottom.
  const pts = rows.map((colIdx, band) => `${colIdx * 18 + 9},${band * 18 + 9}`).join(' ');
  return (
    <div className="payline-diagram">
      <svg viewBox="0 0 54 90" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((band) =>
          [0, 1, 2].map((col) => (
            <rect key={`${band}-${col}`} x={col * 18 + 2} y={band * 18 + 2}
              width={14} height={14} rx={2} fill="#1c3ab3" stroke="#3a5fd9" strokeWidth="0.8" />
          ))
        )}
        <polyline points={pts} fill="none" stroke="#7FE3F5" strokeWidth="2.4"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="payline-label">Line {index + 1}</span>
    </div>
  );
}
