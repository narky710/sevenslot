import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  TripleSevenEngine,
  GameState,
  distributeBetCents,
  CREDIT_VALUE_CENTS,
  MAX_TOTAL_CREDITS,
  MIN_TOTAL_CREDITS,
} from '../../engine/TripleSevenEngine';
import { getSymbolSVG } from '../../symbols/TripleSevensSymbols';
import { audio as rawAudio, type WinTier } from '../../audio';
import { haptics as rawHaptics } from '../../haptics';
import '../../styles/index.css';

/**
 * Safe wrappers: audio/haptics are pure enhancement. A bug or unsupported
 * device must never break the spin flow, so every cross-module call is
 * silently no-op'd on exception. This is a defense-in-depth layer in
 * addition to the try/catch in audio.ts itself.
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

// 8 paylines for a 3x3 grid, ordered by player-facing priority:
// horizontals (middle first as the most prominent), then diagonals, then verticals.
//
// Tuple order matters for start-anchored payouts (cherries): index [0] is the
// start. Horizontals start on the left, verticals start on the top, and for
// diagonals "left wins over top" — the BL→TR diagonal starts at bottom-left.
// Kept in sync with TripleSevenEngine.PAYLINES.
const PAYLINES: [number, number, number][] = [
  [3, 4, 5], // Line 1 — Horizontal middle
  [0, 1, 2], // Line 2 — Horizontal top
  [6, 7, 8], // Line 3 — Horizontal bottom
  [0, 4, 8], // Line 4 — Diagonal TL→BR
  [6, 4, 2], // Line 5 — Diagonal BL→TR (start at bottom-left)
  [0, 3, 6], // Line 6 — Vertical left
  [1, 4, 7], // Line 7 — Vertical middle
  [2, 5, 8], // Line 8 — Vertical right
];

// Three "reels" = three columns. Each reel covers 3 cells (top/mid/bottom of column).
const REEL_COLUMNS: [number, number, number][] = [
  [0, 3, 6], // Reel 1 — left column
  [1, 4, 7], // Reel 2 — middle column
  [2, 5, 8], // Reel 3 — right column
];

// Theoretical return to player — computed from the engine's reel weights
// and payout table. Published for transparency in the info modal.
const GAME_RTP = '92.6%';

type ModalState = 'none' | 'paytable' | 'info' | 'autospin';

// Auto-spin presets the player can pick when starting a session.
const AUTOSPIN_PRESETS = [5, 10, 25, 50, 100] as const;

function classifyWinTier(winCents: number, betCents: number, isJackpot: boolean): WinTier | null {
  if (winCents <= 0) return null;
  if (isJackpot) return 'jackpot';
  const ratio = winCents / betCents;
  if (ratio >= 100) return 'mega';
  if (ratio >= 25) return 'big';
  if (ratio >= 5) return 'win';
  return 'small';
}

function formatCents(cents: number): string {
  // Engine multipliers like ×62.5 can produce fractional cents; round to whole.
  const wholeCents = Math.round(cents);
  const dollars = Math.floor(wholeCents / 100);
  const remainingCents = wholeCents % 100;
  if (remainingCents === 0) return `$${dollars}`;
  return `$${dollars}.${remainingCents.toString().padStart(2, '0')}`;
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Props {
  onExit?: () => void;
}

export default function TripleSevensView({ onExit }: Props = {}) {
  const engineRef = useRef(new TripleSevenEngine(100000)); // $1000.00

  const [state, setState] = useState<GameState>(engineRef.current.getState());
  const [betAmountCents, setBetAmountCents] = useState(5);
  const [isSpinning, setIsSpinning] = useState(false);
  const [autoSpinEnabled, setAutoSpinEnabled] = useState(false);
  const [autoSpinCount, setAutoSpinCount] = useState(0);
  // Initial reel state is randomized so the player doesn't see a uniform
  // wall of Red 7s on load. Uses the engine's weighted reel strip — same
  // distribution as a real spin — so the load looks representative of
  // typical gameplay.
  const [displayPositions, setDisplayPositions] = useState<number[]>(() =>
    Array.from({ length: 9 }, () => engineRef.current.pickRandomSymbolIndex())
  );
  const [stoppedReels, setStoppedReels] = useState<boolean[]>([false, false, false]);
  const [winningLines, setWinningLines] = useState<number[]>([]);
  const [displayWinAmount, setDisplayWinAmount] = useState(0);
  const [winTier, setWinTier] = useState<WinTier | null>(null);
  const [modal, setModal] = useState<ModalState>('none');
  const [paytableTab, setPaytableTab] = useState<'pays' | 'rules'>('pays');
  const [muted, setMuted] = useState(false);
  const [sessionStart] = useState(() => Date.now());
  const [sessionMs, setSessionMs] = useState(0);

  const autoSpinIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const winCountIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spinTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reelStopTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const symbolNames = engineRef.current.getSymbolNames();
  const minBet = MIN_TOTAL_CREDITS * CREDIT_VALUE_CENTS; // 5¢
  const maxBet = MAX_TOTAL_CREDITS * CREDIT_VALUE_CENTS; // 200¢ ($2.00)
  const reduceMotion = prefersReducedMotion();

  // Per-line bet distribution for the current total bet. Drives which lines
  // are active in the UI and how much each winning line pays.
  const perLineBets = distributeBetCents(betAmountCents);
  // Same distribution expressed as credits (1 credit = 5¢) for the side-rail
  // line indicators around the reel grid.
  const perLineCredits = perLineBets.map((b) => Math.floor(b / CREDIT_VALUE_CENTS));
  const activeLineCount = perLineBets.filter((b) => b > 0).length;

  /** Returns true if the given payline index (0-based) won on the last spin. */
  const isLineWinning = (lineIdx: number) =>
    winningLines.includes(lineIdx) && !isSpinning;

  // ---------- Session clock ----------
  useEffect(() => {
    const id = setInterval(() => {
      setSessionMs(Date.now() - sessionStart);
    }, 1000);
    return () => clearInterval(id);
  }, [sessionStart]);

  // ---------- Spin lifecycle ----------
  const clearReelTimers = () => {
    reelStopTimersRef.current.forEach((t) => clearTimeout(t));
    reelStopTimersRef.current = [];
    if (spinTickRef.current) {
      clearInterval(spinTickRef.current);
      spinTickRef.current = null;
    }
  };

  const handleSpin = useCallback(() => {
    if (isSpinning || state.credits < betAmountCents) return;

    // First-tap audio unlock
    audio.unlock();
    audio.click();
    haptics.medium();
    audio.startSpin();

    setIsSpinning(true);
    setWinningLines([]);
    setDisplayWinAmount(0);
    setWinTier(null);
    setStoppedReels([false, false, false]);

    // Run engine immediately to determine final positions
    engineRef.current.spin(betAmountCents);
    const newState = engineRef.current.getState();
    const finalPositions = newState.reelPositions;

    // Sequential 3-reel stop (left → middle → right) with anticipation hold
    // when reels 1 and 2 land on jackpot-tier symbols.
    const tickIntervalMs = reduceMotion ? 0 : 60;
    const reel1StopMs = reduceMotion ? 80 : 900;
    const reel2StopMs = reduceMotion ? 160 : 1500;
    let reel3StopMs = reduceMotion ? 240 : 2100;
    let anticipated = false;

    // Live-tumble: each cell shuffles to a random symbol while reels haven't stopped
    if (!reduceMotion) {
      spinTickRef.current = setInterval(() => {
        setDisplayPositions((prev) =>
          prev.map((p, i) => {
            // After a reel has stopped, freeze those cells
            const reelIdx = Math.floor(i / 3) === 0
              ? (i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : 2)
              : 0;
            // Find which reel column this cell belongs to
            const col = i % 3;
            return Math.random() > 0.5 || REEL_COLUMNS[col]
              ? Math.floor(Math.random() * 13)
              : p;
          })
        );
      }, tickIntervalMs);
    }

    // Helper: stop a reel column. After all stopped → resolve win.
    const stopReel = (reelIdx: number) => {
      setDisplayPositions((prev) => {
        const next = [...prev];
        REEL_COLUMNS[reelIdx].forEach((cellIdx) => {
          next[cellIdx] = finalPositions[cellIdx];
        });
        return next;
      });
      setStoppedReels((prev) => {
        const next = [...prev];
        next[reelIdx] = true;
        return next;
      });
      audio.reelStop();
      haptics.reelStop();
    };

    // Determine if reels 1 and 2 will show a jackpot/seven on any payline
    // to trigger anticipation on reel 3.
    const reel1Symbols = REEL_COLUMNS[0].map((c) => symbolNames[finalPositions[c]]);
    const reel2Symbols = REEL_COLUMNS[1].map((c) => symbolNames[finalPositions[c]]);
    const hasMatchingSeven = reel1Symbols.some(
      (s, i) => s.includes('7') && reel2Symbols[i] === s
    );

    if (hasMatchingSeven && !reduceMotion) {
      anticipated = true;
      reel3StopMs += 700; // Hold reel 3 longer for anticipation
    }

    // Schedule stops
    reelStopTimersRef.current.push(setTimeout(() => stopReel(0), reel1StopMs));
    reelStopTimersRef.current.push(setTimeout(() => stopReel(1), reel2StopMs));
    if (anticipated) {
      reelStopTimersRef.current.push(
        setTimeout(() => audio.anticipation(), reel2StopMs + 100)
      );
    }
    reelStopTimersRef.current.push(
      setTimeout(() => {
        stopReel(2);
        // Settle everything
        clearReelTimers();
        audio.stopSpin();
        setState(newState);
        setDisplayPositions([...finalPositions]);
        setIsSpinning(false);

        const winning = engineRef.current.getWinningLines(finalPositions, betAmountCents);
        setWinningLines(winning);

        // Determine if jackpot was hit
        const isJackpot = winning.some((lineIdx) =>
          PAYLINES[lineIdx].every(
            (cellIdx) => symbolNames[finalPositions[cellIdx]] === 'Rainbow 7'
          )
        );

        // Auto-spin pause rule: if ANY winning line is "all sevens" (mixed
        // sevens, same-color sevens, or the Rainbow jackpot) we stop the
        // auto-spin run so the player can savor the win and decide whether
        // to continue. Called unconditionally — it's a no-op when no
        // auto-spin is running, and avoids stale closure issues with
        // autoSpinEnabled.
        const sevensWinHit = winning.some((lineIdx) =>
          PAYLINES[lineIdx].every((cellIdx) =>
            symbolNames[finalPositions[cellIdx]].includes('7')
          )
        );
        if (sevensWinHit) {
          setAutoSpinEnabled(false);
          setAutoSpinCount(0);
        }

        const tier = classifyWinTier(newState.lastWinAmount, betAmountCents, isJackpot);
        setWinTier(tier);

        if (tier) {
          audio.win(tier);
          if (tier === 'jackpot') haptics.jackpot();
          else if (tier === 'mega' || tier === 'big') haptics.win();

          // Count-up animation with chime ladder
          const finalWin = newState.lastWinAmount;
          const baseSteps = tier === 'jackpot' ? 60 : tier === 'mega' ? 45 : tier === 'big' ? 32 : 20;
          const stepMs = reduceMotion ? 0 : tier === 'jackpot' ? 32 : tier === 'mega' ? 30 : 28;
          let step = 0;
          const countUp = () => {
            step++;
            const current = Math.min(Math.floor((step / baseSteps) * finalWin), finalWin);
            setDisplayWinAmount(current);
            // Chime every 4th step for small/win, every 3rd for higher tiers
            const chimeMod = tier === 'jackpot' || tier === 'mega' ? 3 : 4;
            if (step % chimeMod === 0 && step < baseSteps) audio.coinChime(step);
            if (step < baseSteps) {
              winCountIntervalRef.current = setTimeout(countUp, stepMs);
            }
          };
          if (reduceMotion) {
            setDisplayWinAmount(finalWin);
          } else {
            countUp();
          }
        }
      }, reel3StopMs)
    );
  }, [isSpinning, state.credits, betAmountCents, symbolNames, reduceMotion]);

  // ---------- Auto-spin ----------
  useEffect(() => {
    if (autoSpinEnabled && autoSpinCount > 0 && !isSpinning && modal === 'none') {
      autoSpinIntervalRef.current = setTimeout(() => {
        if (state.credits >= betAmountCents) {
          setAutoSpinCount((p) => p - 1);
          handleSpin();
        } else {
          setAutoSpinEnabled(false);
        }
      }, 800);
    } else if (autoSpinCount === 0 && autoSpinEnabled) {
      setAutoSpinEnabled(false);
    }
    return () => {
      if (autoSpinIntervalRef.current) clearTimeout(autoSpinIntervalRef.current);
    };
  }, [autoSpinEnabled, autoSpinCount, isSpinning, state.credits, betAmountCents, modal, handleSpin]);

  // ---------- Cleanup ----------
  useEffect(() => {
    return () => {
      clearReelTimers();
      if (winCountIntervalRef.current) clearTimeout(winCountIntervalRef.current);
      if (autoSpinIntervalRef.current) clearTimeout(autoSpinIntervalRef.current);
      audio.stopSpin();
    };
  }, []);

  // ---------- Handlers ----------
  /** Tapping AUTO SPIN: if a run is in progress, stop it; otherwise open
      the count-picker modal so the player chooses how many spins to run. */
  const handleAutoSpinClick = () => {
    audio.unlock();
    audio.click();
    haptics.light();
    if (autoSpinEnabled) {
      setAutoSpinEnabled(false);
      setAutoSpinCount(0);
    } else {
      setModal('autospin');
    }
  };

  /** Begin an auto-spin run with the chosen spin count. */
  const startAutoSpin = (count: number) => {
    audio.click();
    haptics.light();
    setAutoSpinCount(count);
    setAutoSpinEnabled(true);
    setModal('none');
  };

  const adjustBet = (delta: number) => {
    audio.unlock();
    audio.tick();
    haptics.light();
    setBetAmountCents((b) => Math.max(minBet, Math.min(maxBet, b + delta)));
  };

  const handleMaxBet = () => {
    audio.unlock();
    audio.click();
    haptics.light();
    setBetAmountCents(maxBet);
  };

  const openModal = (m: ModalState) => {
    audio.unlock();
    audio.click();
    haptics.light();
    setModal(m);
  };

  const closeModal = () => {
    audio.click();
    setModal('none');
  };

  const toggleMute = () => {
    audio.unlock();
    audio.click();
    haptics.light();
    const next = !muted;
    setMuted(next);
    audio.setMuted(next);
    haptics.setEnabled(!next);
  };

  // ---------- Derived state ----------
  const isJackpotPending = winTier === 'jackpot';
  const winningCells = new Set<number>();
  winningLines.forEach((lineIdx) => PAYLINES[lineIdx].forEach((c) => winningCells.add(c)));

  // ---------- Render ----------
  return (
    <div
      className={`stage ${winTier ? `win-tier-${winTier}` : ''}`}
      aria-label="Triple Sevens slot machine"
    >
      {/* Cabinet bezel */}
      <div className="cabinet-frame">
        <div className="cabinet-inner">
          <div className="cabinet-watermark" aria-hidden="true">SS7</div>
          <div className="cabinet-glare" aria-hidden="true" />
          <div className="cabinet-vignette" aria-hidden="true" />

          {/* Cabinet rivets */}
          <div className="cabinet-stud stud-tl" aria-hidden="true" />
          <div className="cabinet-stud stud-tr" aria-hidden="true" />
          <div className="cabinet-stud stud-bl" aria-hidden="true" />
          <div className="cabinet-stud stud-br" aria-hidden="true" />

          <div className="cabinet-content">
            {/* Top chrome bar — session clock, mute, info */}
            <div className="chrome-bar" role="toolbar" aria-label="Game utilities">
              <div className="session-clock" aria-label={`Session time ${formatDuration(sessionMs)}`}>
                <span className="session-clock-dot" />
                <span className="session-clock-time">{formatDuration(sessionMs)}</span>
              </div>
              <div className="chrome-bar-right">
                {onExit && (
                  <button
                    className="utility-icon"
                    onClick={() => { audio.click(); onExit(); }}
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

            {/* Marquee */}
            <header className="marquee">
              <h1 className="marquee-title">TRIPLE SEVENS</h1>
              <div className="marquee-jackpot-plate" aria-label="Jackpot prize">
                <span className="marquee-jackpot-label">JACKPOT</span>
                <span className="marquee-jackpot-value">×10,000</span>
              </div>
            </header>

            {/* Reels — true 3-reel slot grid with column dividers and side-rail
                line indicators showing per-line credit allocation. */}
            <div className="reels-grid" role="grid" aria-label="Slot reels">
              {/* Left side rail — horizontal lines start here (top-to-bottom):
                  L4 (TL→BR diagonal, in the corner), L2, L1, L3,
                  L5 (BL→TR diagonal, in the corner). */}
              <PaylineChip
                lineNum={4}
                credits={perLineCredits[3]}
                isWinning={isLineWinning(3)}
                position="left-corner-tl"
              />
              <PaylineChip
                lineNum={2}
                credits={perLineCredits[1]}
                isWinning={isLineWinning(1)}
                position="left-row-1"
              />
              <PaylineChip
                lineNum={1}
                credits={perLineCredits[0]}
                isWinning={isLineWinning(0)}
                position="left-row-2"
              />
              <PaylineChip
                lineNum={3}
                credits={perLineCredits[2]}
                isWinning={isLineWinning(2)}
                position="left-row-3"
              />
              <PaylineChip
                lineNum={5}
                credits={perLineCredits[4]}
                isWinning={isLineWinning(4)}
                position="left-corner-bl"
              />

              {/* Top rail — vertical lines start here (left-to-right) */}
              <PaylineChip
                lineNum={6}
                credits={perLineCredits[5]}
                isWinning={isLineWinning(5)}
                position="top-col-1"
              />
              <PaylineChip
                lineNum={7}
                credits={perLineCredits[6]}
                isWinning={isLineWinning(6)}
                position="top-col-2"
              />
              <PaylineChip
                lineNum={8}
                credits={perLineCredits[7]}
                isWinning={isLineWinning(7)}
                position="top-col-3"
              />
              {/* Render three reel columns; each contains three cells */}
              {[0, 1, 2].map((col) => (
                <div
                  key={col}
                  className={`reel-column ${isSpinning && !stoppedReels[col] ? 'spinning' : ''}`}
                  role="presentation"
                >
                  {REEL_COLUMNS[col].map((cellIdx) => {
                    const pos = displayPositions[cellIdx];
                    const isWinning = winningCells.has(cellIdx);
                    const isDimmed = winningLines.length > 0 && !isWinning;
                    return (
                      <div
                        key={cellIdx}
                        className={`reel-cell ${isWinning ? 'winning' : ''} ${isDimmed ? 'dimmed' : ''}`}
                        role="gridcell"
                        aria-label={`Reel ${col + 1}, row ${Math.floor(cellIdx / 3) + 1}, ${symbolNames[pos]}`}
                      >
                        <div className="reel-symbol">{getSymbolSVG(symbolNames[pos])}</div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Animated payline overlays */}
              {winningLines.length > 0 && !isSpinning && (
                <svg className="payline-overlay" viewBox="0 0 300 300" aria-hidden="true">
                  {winningLines.map((lineIdx) => {
                    const line = PAYLINES[lineIdx];
                    // Each cell occupies a 100×100 block in the 300×300 viewBox
                    const center = (cellIdx: number) => ({
                      x: (cellIdx % 3) * 100 + 50,
                      y: Math.floor(cellIdx / 3) * 100 + 50,
                    });
                    const a = center(line[0]);
                    const b = center(line[1]);
                    const c = center(line[2]);
                    const isJp = line.every(
                      (cellIdx) => symbolNames[displayPositions[cellIdx]] === 'Rainbow 7'
                    );
                    return (
                      <polyline
                        key={lineIdx}
                        points={`${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y}`}
                        fill="none"
                        stroke={isJp ? '#FFD93D' : '#FFFFFF'}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.9"
                        className="payline-stroke"
                      />
                    );
                  })}
                </svg>
              )}
            </div>

            {/* Win readout */}
            <div className="win-display" aria-live="polite">
              <div className="win-box led-frame">
                <div className="readout-label">LAST WIN</div>
                <div className={`led-value led-amber ${winTier ? `tier-${winTier}` : ''}`}>
                  {formatCents(displayWinAmount)}
                </div>
              </div>
              {winTier && (
                <div className={`win-badge badge-${winTier}`} role="status">
                  {winTier === 'jackpot' && '★ JACKPOT ★'}
                  {winTier === 'mega' && '★ MEGA WIN ★'}
                  {winTier === 'big' && 'BIG WIN'}
                  {winTier === 'win' && 'WIN'}
                  {winTier === 'small' && 'WIN'}
                </div>
              )}
            </div>

            {/* Bet controls */}
            <section className="bet-section" aria-label="Bet controls">
              <div className="bet-row">
                <div className="bet-label">
                  <span className="bet-label-main">TOTAL BET</span>
                  <span className="bet-label-sub">
                    {activeLineCount} {activeLineCount === 1 ? 'line' : 'lines'}
                  </span>
                </div>
                <button
                  className="bet-step-button"
                  onClick={() => adjustBet(-CREDIT_VALUE_CENTS)}
                  disabled={isSpinning || betAmountCents <= minBet}
                  aria-label="Decrease bet by one credit"
                >
                  −
                </button>
                <div className="led-frame bet-readout-frame">
                  <div className="led-value led-amber">{formatCents(betAmountCents)}</div>
                </div>
                <button
                  className="bet-step-button"
                  onClick={() => adjustBet(CREDIT_VALUE_CENTS)}
                  disabled={isSpinning || betAmountCents >= maxBet}
                  aria-label="Increase bet by one credit"
                >
                  +
                </button>
                <button
                  className={`max-bet-button ${betAmountCents === maxBet ? 'active' : ''}`}
                  onClick={handleMaxBet}
                  disabled={isSpinning || betAmountCents === maxBet}
                  aria-label="Max bet"
                >
                  MAX
                </button>
              </div>
            </section>

            {/* Spin button — primary CTA */}
            <button
              className={`spin-button ${isSpinning ? 'spinning' : ''} ${isJackpotPending ? 'jackpot-glow' : ''}`}
              onClick={handleSpin}
              disabled={isSpinning || state.credits < betAmountCents}
              aria-label={isSpinning ? 'Spinning' : 'Spin reels'}
            >
              <span className="spin-button-inner">
                {isSpinning ? 'SPINNING…' : 'SPIN'}
              </span>
            </button>

            {/* Secondary controls row */}
            <div className="secondary-row">
              <button
                className={`autospin-button ${autoSpinEnabled ? 'active' : ''}`}
                onClick={handleAutoSpinClick}
                disabled={state.credits < betAmountCents}
                aria-label={autoSpinEnabled ? `Stop auto-spin (${autoSpinCount} remaining)` : 'Choose auto-spin count'}
                aria-pressed={autoSpinEnabled}
              >
                {autoSpinEnabled ? `AUTO (${autoSpinCount})` : 'AUTO SPIN'}
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

            {/* Footer instrumentation */}
            <footer className="footer">
              <div className="footer-readout led-frame">
                <span className="readout-label">CREDIT</span>
                <span className="led-value led-amber-sm">{formatCents(state.credits)}</span>
              </div>
              <div className="footer-readout led-frame">
                <span className="readout-label">BET</span>
                <span className="led-value led-amber-sm">{formatCents(betAmountCents)}</span>
              </div>
            </footer>
          </div>
        </div>
      </div>

      {/* ---------- PAYTABLE MODAL ---------- */}
      {modal === 'paytable' && (
        <div
          className="modal-overlay"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="paytable-title"
        >
          <div className="modal-panel paytable-modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2 id="paytable-title">TRIPLE SEVENS PAYTABLE</h2>
              <button className="modal-close" onClick={closeModal} aria-label="Close paytable">✕</button>
            </header>

            <nav className="paytable-tabs" role="tablist">
              <button
                role="tab"
                aria-selected={paytableTab === 'pays'}
                className={paytableTab === 'pays' ? 'tab-active' : ''}
                onClick={() => setPaytableTab('pays')}
              >
                PAYOUTS
              </button>
              <button
                role="tab"
                aria-selected={paytableTab === 'rules'}
                className={paytableTab === 'rules' ? 'tab-active' : ''}
                onClick={() => setPaytableTab('rules')}
              >
                RULES & PAYLINES
              </button>
            </nav>

            {paytableTab === 'pays' && (
              <div className="paytable-body">
                <div className="paytable-col">
                  <h3 className="paytable-col-header">
                    REEL COMBINATIONS
                    <span className="paytable-col-sub">Three across any payline</span>
                  </h3>
                  <PayRow combo={['Rainbow 7', 'Rainbow 7', 'Rainbow 7']} mult="×10,000" tier="jackpot" />
                  <PayRow combo={['Red 7', 'Red 7', 'Red 7']} mult="×1,000" />
                  <PayRow combo={['Red 7', 'White 7', 'Blue 7']} mult="×500" />
                  <PayRow combo={['Bell', 'Bell', 'Bell']} mult="×100" />
                  <PayRow combo={['Triple BAR', 'Triple BAR', 'Triple BAR']} mult="×50" />
                  <PayRow combo={['Double BAR', 'Double BAR', 'Double BAR']} mult="×40" />
                  <PayRow combo={['Single BAR', 'Single BAR', 'Single BAR']} mult="×30" />
                  <PayRow combo={['Triple BAR', 'Double BAR', 'Single BAR']} mult="×10" />
                  {/* Cherries — must be consecutive from the START of the payline.
                      Visual: cherries on the left, ANY placeholders on the right. */}
                  <PayRow combo={['Cherry', 'Cherry', 'Cherry']} mult="×8" />
                  <PayRow combo={['Cherry', 'Cherry']} mult="×5" trailAny={1} />
                  <PayRow combo={['Cherry']} mult="×2" trailAny={2} />
                </div>

                <div className="paytable-col">
                  <h3 className="paytable-col-header">
                    SYMBOL PAYOUTS
                    <span className="paytable-col-sub">Three of a kind on any line</span>
                  </h3>
                  <SymbolRow name="Apple" mult="×25" />
                  <SymbolRow name="Watermelon" mult="×15" />
                  <SymbolRow name="Orange" mult="×10" />
                  <SymbolRow name="Plum" mult="×10" />
                  <SymbolRow name="Lemon" mult="×10" />
                </div>
              </div>
            )}

            {paytableTab === 'rules' && (
              <div className="paytable-body rules-body">
                <section className="rules-section">
                  <h3>HOW TO PLAY</h3>
                  <ol>
                    <li>Select your bet amount with the − / + buttons or tap MAX.</li>
                    <li>Press SPIN to start the reels.</li>
                    <li>Three matching symbols on any active payline pays out.</li>
                    <li>Three Rainbow 7s anywhere on a payline triggers the jackpot.</li>
                  </ol>
                </section>

                <section className="rules-section">
                  <h3>8 PAYLINES</h3>
                  <div className="paylines-grid">
                    {PAYLINES.map((line, i) => (
                      <PaylineDiagram key={i} index={i} cells={line} />
                    ))}
                  </div>
                </section>

                <section className="rules-section">
                  <h3>FAIRNESS</h3>
                  <p>Outcomes are determined by a Mersenne Twister RNG seeded at game launch.</p>
                  <p>Theoretical return to player: <strong>{GAME_RTP}</strong></p>
                </section>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------- INFO MODAL ---------- */}
      {modal === 'info' && (
        <div
          className="modal-overlay"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="info-title"
        >
          <div className="modal-panel info-modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2 id="info-title">GAME INFO</h2>
              <button className="modal-close" onClick={closeModal} aria-label="Close info">✕</button>
            </header>
            <div className="info-body">
              <section className="info-section">
                <h3>Game</h3>
                <dl className="info-dl">
                  <dt>Title</dt><dd>Triple Sevens</dd>
                  <dt>RTP</dt><dd>{GAME_RTP}</dd>
                  <dt>Paylines</dt><dd>8 (3 horizontal, 3 vertical, 2 diagonal)</dd>
                  <dt>RNG</dt><dd>Mersenne Twister</dd>
                  <dt>Volatility</dt><dd>Medium</dd>
                </dl>
              </section>

              <section className="info-section">
                <h3>Session</h3>
                <dl className="info-dl">
                  <dt>Elapsed</dt><dd>{formatDuration(sessionMs)}</dd>
                </dl>
              </section>

              <section className="info-section rg-section">
                <h3>Play Responsibly</h3>
                <p>Set a budget. Take regular breaks. Gambling should be entertainment, not a way to make money.</p>
                <p className="rg-resources">
                  <strong>U.S.:</strong> 1-800-GAMBLER ·{' '}
                  <a href="https://www.ncpgambling.org" target="_blank" rel="noopener noreferrer">
                    ncpgambling.org
                  </a>
                </p>
                <p className="rg-resources">
                  <strong>UK:</strong>{' '}
                  <a href="https://www.gamcare.org.uk" target="_blank" rel="noopener noreferrer">
                    gamcare.org.uk
                  </a>
                </p>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* ---------- AUTO-SPIN COUNT PICKER ---------- */}
      {modal === 'autospin' && (
        <div
          className="modal-overlay"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="autospin-title"
        >
          <div
            className="modal-panel autospin-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="modal-header">
              <h2 id="autospin-title">AUTO SPIN</h2>
              <button className="modal-close" onClick={closeModal} aria-label="Close auto-spin picker">
                ✕
              </button>
            </header>
            <div className="autospin-body">
              <p className="autospin-prompt">CHOOSE NUMBER OF SPINS</p>
              <div className="autospin-options">
                {AUTOSPIN_PRESETS.map((n) => (
                  <button
                    key={n}
                    className="autospin-option-button"
                    onClick={() => startAutoSpin(n)}
                    aria-label={`Start ${n} auto-spins`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="autospin-stop-note">
                Auto-spin will <strong>pause automatically</strong> if you hit any
                three sevens (Mixed 7s, Same-Color 7s, or Jackpot).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ---------- CELEBRATION OVERLAY ---------- */}
      {winTier && (winTier === 'big' || winTier === 'mega' || winTier === 'jackpot') && (
        <div className={`celebration-overlay celebration-${winTier}`} aria-hidden="true">
          <div className="celebration-glow" />
          {!reduceMotion && (
            <div className="celebration-particles">
              {Array.from({ length: winTier === 'jackpot' ? 24 : winTier === 'mega' ? 16 : 8 }).map(
                (_, i) => (
                  <span
                    key={i}
                    className="particle"
                    style={{
                      left: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 0.6}s`,
                      animationDuration: `${1.4 + Math.random() * 1.2}s`,
                    }}
                  />
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Sub-components ----------

/**
 * Side-rail "LED chip" indicator showing how many credits are bet on a
 * specific payline. Sits at the geometric start of the payline (left edge,
 * top edge, or corner) so the player can read line-by-line at a glance.
 */
function PaylineChip({
  lineNum,
  credits,
  isWinning,
  position,
}: {
  lineNum: number;
  credits: number;
  isWinning: boolean;
  position: string;
}) {
  const isActive = credits > 0;
  const stateClass = isActive ? 'chip-active' : 'chip-inactive';
  const winClass = isWinning ? 'chip-winning' : '';
  const ariaLabel = isActive
    ? `Line ${lineNum}, ${credits} ${credits === 1 ? 'credit' : 'credits'}${isWinning ? ', winning' : ''}`
    : `Line ${lineNum}, inactive`;
  return (
    <div
      className={`payline-chip chip-pos-${position} ${stateClass} ${winClass}`}
      role="status"
      aria-label={ariaLabel}
    >
      <span className="chip-num">L{lineNum}</span>
      <span className="chip-credit">{isActive ? credits : '—'}</span>
    </div>
  );
}

function PayRow({
  combo,
  mult,
  tier,
  trailAny = 0,
}: {
  combo: string[];
  mult: string;
  tier?: 'jackpot';
  /** Number of "ANY" placeholder slots to append AFTER the combo. Used for
      cherry rows where the qualifying cherries sit at the start of the
      payline and the remaining positions can be any symbol. */
  trailAny?: number;
}) {
  const slots: (string | null)[] = [...combo, ...Array(trailAny).fill(null)];
  // Cherry rows are the only rows that use the trailAny placeholder (since
  // cherries are the only "any 1/2/3" symbol) — mark them with a class so
  // CSS can apply a red-tinted accent and visually separate them from the
  // standard "3 of a kind" rows.
  const isCherryRow = combo[0] === 'Cherry';
  return (
    <div
      className={[
        'pay-row',
        tier === 'jackpot' ? 'pay-row-jackpot' : '',
        isCherryRow ? 'pay-row-cherry' : '',
      ].filter(Boolean).join(' ')}
    >
      <div className="pay-combo">
        {slots.map((c, i) =>
          c ? (
            <div key={i} className="pay-icon">{getSymbolSVG(c)}</div>
          ) : (
            <div key={i} className="pay-icon pay-icon-empty" aria-hidden="true">
              <span className="pay-icon-any">ANY</span>
            </div>
          )
        )}
      </div>
      <div className={`pay-mult ${tier === 'jackpot' ? 'pay-mult-jackpot' : ''}`}>{mult}</div>
    </div>
  );
}

function SymbolRow({ name, mult }: { name: string; mult: string }) {
  return (
    <div className="symbol-row">
      <div className="symbol-icon">{getSymbolSVG(name)}</div>
      <span className="symbol-name">{name}</span>
      <span className="symbol-mult">{mult}</span>
    </div>
  );
}

function PaylineDiagram({ index, cells }: { index: number; cells: [number, number, number] }) {
  const center = (cellIdx: number) => ({
    x: (cellIdx % 3) * 30 + 15,
    y: Math.floor(cellIdx / 3) * 30 + 15,
  });
  const a = center(cells[0]);
  const b = center(cells[1]);
  const c = center(cells[2]);
  return (
    <div className="payline-diagram">
      <svg viewBox="0 0 90 90" aria-hidden="true">
        {[0, 1, 2].map((row) =>
          [0, 1, 2].map((colIdx) => (
            <rect
              key={`${row}-${colIdx}`}
              x={colIdx * 30 + 2}
              y={row * 30 + 2}
              width={26}
              height={26}
              rx={3}
              fill="#1c3ab3"
              stroke="#3a5fd9"
              strokeWidth="1"
            />
          ))
        )}
        <polyline
          points={`${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y}`}
          fill="none"
          stroke="#FFD93D"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="payline-label">Line {index + 1}</span>
    </div>
  );
}
