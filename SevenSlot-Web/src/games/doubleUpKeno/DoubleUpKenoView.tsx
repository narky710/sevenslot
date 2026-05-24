import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  KenoState,
  PAYTABLE,
  MIN_BET_CENTS,
  MAX_BET_CENTS,
  BET_STEP_CENTS,
  MIN_SPOTS,
  MAX_SPOTS,
  NUM_BALLS,
  PROGRESSIVE_MIN_BET_CENTS,
  designedRTP,
} from '../../engine/DoubleUpKenoEngine';
import '../../styles/index.css';
import { classifyWinTier } from '../../utils/winTier';
import { KenoServerAdapter } from './KenoServerAdapter';

interface Props {
  onExit: () => void;
  initialBalanceCents: number;
  freePlayCents?: number;
  onBalanceChange: (cents: number) => void;
}

function errorMessage(e: unknown): string {
  if (typeof e === 'string') return e;
  if (e && typeof e === 'object') {
    const obj = e as Record<string, unknown>;
    if (typeof obj.message === 'string' && obj.message) return obj.message;
    const inner = obj.error;
    if (inner && typeof inner === 'object' && typeof (inner as Record<string, unknown>).message === 'string') {
      return (inner as Record<string, string>).message;
    }
    try { return JSON.stringify(e); } catch { /* fall through */ }
  }
  return String(e);
}

function formatCents(cents: number): string {
  const c = Math.round(cents);
  const dollars = Math.floor(c / 100);
  const rem = c % 100;
  return rem === 0 ? `$${dollars}` : `$${dollars}.${rem.toString().padStart(2, '0')}`;
}

export default function DoubleUpKenoView({ onExit, initialBalanceCents, freePlayCents = 0, onBalanceChange }: Props) {
  const engineRef = useRef(new KenoServerAdapter(initialBalanceCents));
  const [state, setState] = useState<KenoState>(() => engineRef.current.getState());
  const [showPaytable, setShowPaytable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep adapter's local credit shadow in sync when the parent wallet updates
  // (e.g. after another game's spin or an admin adjustment landing while idle).
  useEffect(() => {
    engineRef.current.setBalance(initialBalanceCents);
    setState({ ...engineRef.current.getState() });
  }, [initialBalanceCents]);

  const sync = () => {
    const s = engineRef.current.getState();
    setState({ ...s });
    onBalanceChange(s.credits);
  };

  const togglePick = (n: number) => {
    if (state.phase !== 'idle') return;
    if (state.picks.includes(n)) engineRef.current.clearSpot(n);
    else engineRef.current.selectSpot(n);
    sync();
  };

  const handlePlay = async () => {
    if (state.picks.length < MIN_SPOTS || busy) return;
    setBusy(true); setError(null);
    try { await engineRef.current.play(); sync(); }
    catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  };

  const handleDoubleUp = async () => {
    if (busy) return;
    setBusy(true); setError(null);
    try { await engineRef.current.doubleUp(); sync(); }
    catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  };
  const handleStay = async () => {
    if (busy) return;
    setBusy(true); setError(null);
    try { await engineRef.current.stay(); sync(); }
    catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  };
  const handleNewRound = () => { engineRef.current.newRound(); sync(); };

  const adjustBet = (delta: number) => {
    engineRef.current.setBet(state.currentBet + delta);
    sync();
  };

  const handleQuickPick = () => {
    const count = state.picks.length >= MIN_SPOTS ? state.picks.length : 10;
    engineRef.current.quickPick(count);
    sync();
  };

  const handleWipe = () => { engineRef.current.wipeCard(); sync(); };

  const drawnSet = useMemo(() => new Set(state.drawnNumbers), [state.drawnNumbers]);
  const firstHalfSet = useMemo(
    () => new Set(state.firstHalfDrawn),
    [state.firstHalfDrawn]
  );
  const pickSet = useMemo(() => new Set(state.picks), [state.picks]);

  const spotsPlayed = state.picks.length;
  const firstHalfHits = useMemo(() => {
    let n = 0;
    for (const x of state.firstHalfDrawn) if (pickSet.has(x)) n++;
    return n;
  }, [state.firstHalfDrawn, pickSet]);

  const canPlay = spotsPlayed >= MIN_SPOTS && state.phase === 'idle' && !busy;
  const canDouble = state.phase === 'awaitingChoice' && !busy;

  const winTier =
    state.phase === 'resolved' && state.lastWinAmount > 0
      ? classifyWinTier(state.lastWinAmount, state.roundBet, 'keno')
      : null;

  // Drawn-strip rendering: pad to 20 cells so the strip keeps its shape
  // even when no balls have fallen yet.
  const drawSlots: Array<number | null> = useMemo(() => {
    const slots: Array<number | null> = Array(20).fill(null);
    state.drawnNumbers.forEach((n, i) => { if (i < 20) slots[i] = n; });
    return slots;
  }, [state.drawnNumbers]);

  return (
    <div
      className={`stage ${winTier ? `win-tier-${winTier}` : ''}`}
      aria-label="Double-Up Keno"
    >
      <div className="cabinet-frame">
        <div className="cabinet-inner">
          <div className="cabinet-watermark" aria-hidden="true">SS7</div>
          <div className="cabinet-glare" aria-hidden="true" />
          <div className="cabinet-vignette" aria-hidden="true" />

          <div className="cabinet-stud stud-tl" aria-hidden="true" />
          <div className="cabinet-stud stud-tr" aria-hidden="true" />
          <div className="cabinet-stud stud-bl" aria-hidden="true" />
          <div className="cabinet-stud stud-br" aria-hidden="true" />

          <div className="cabinet-content keno-content">
            {/* Top chrome bar — EXIT + paytable utility */}
            <div className="chrome-bar" role="toolbar" aria-label="Game utilities">
              <button
                className="utility-icon"
                onClick={onExit}
                aria-label="Exit to lobby"
              >
                ✕
              </button>
              <div className="chrome-bar-right">
                <button
                  className="utility-icon"
                  onClick={() => setShowPaytable(true)}
                  aria-label="Open paytable"
                >
                  i
                </button>
              </div>
            </div>

            {/* Marquee */}
            <header className="marquee">
              <h1 className="marquee-title keno-title">DOUBLE-UP KENO</h1>
            </header>

            {/* Drawn-numbers strip */}
            <div className="keno-draw-strip" data-phase={state.phase} aria-label="Drawn numbers">
              {/* Label sits above the slots so the 20-ball grid spans the
                  full strip width and ball positions never shift between
                  pre-play / first-10 / all-20 states. */}
              <div className="keno-draw-header">
                <span className="keno-draw-label-pill keno-draw-label-1">
                  FIRST 10
                </span>
                <span className="keno-draw-label-pill keno-draw-label-2">
                  LAST 10
                </span>
              </div>
              {/* Two distinct half-blocks separated by a gold divider. The
                  --i custom property drives staggered roll-in animation per
                  ball — first half rolls in from the left, last half from
                  the right. */}
              <div className="keno-draw-balls">
                <div className="keno-draw-half keno-draw-half-first">
                  {drawSlots.slice(0, 10).map((n, i) => {
                    if (n === null) {
                      return <span key={i} className="keno-draw-ball ball-empty" aria-hidden="true" />;
                    }
                    const isHit = pickSet.has(n);
                    const cls = isHit ? 'ball-hit' : 'ball-first';
                    return (
                      <span
                        key={i}
                        className={`keno-draw-ball ${cls}`}
                        style={{ ['--i' as any]: i }}
                      >
                        {n}
                      </span>
                    );
                  })}
                </div>
                <div className="keno-draw-divider" aria-hidden="true" />
                <div className="keno-draw-half keno-draw-half-last">
                  {drawSlots.slice(10, 20).map((n, i) => {
                    if (n === null) {
                      return <span key={i} className="keno-draw-ball ball-empty" aria-hidden="true" />;
                    }
                    const isHit = pickSet.has(n);
                    // n is from firstHalfSet only if it appeared in the first
                    // 10 draws; here we know the slot is in the last 10 so
                    // it's always second-half unless it's a hit on a pick.
                    const cls = isHit ? 'ball-hit' : 'ball-second';
                    return (
                      <span
                        key={i}
                        className={`keno-draw-ball ${cls}`}
                        style={{ ['--i' as any]: i }}
                      >
                        {n}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 10x8 grid of 80 numbers — centerpiece */}
            <div className="keno-grid" role="grid" aria-label="Keno card">
              {Array.from({ length: NUM_BALLS }, (_, i) => {
                const n = i + 1;
                const picked = pickSet.has(n);
                const drawn = drawnSet.has(n);
                const inFirstHalf = firstHalfSet.has(n);
                const hit = picked && drawn;
                let stateClass = 'spot-blank';
                if (hit) stateClass = 'spot-hit';
                else if (picked) stateClass = 'spot-picked';
                else if (drawn) stateClass = inFirstHalf ? 'spot-drawn' : 'spot-drawn-late';
                return (
                  <button
                    key={n}
                    onClick={() => togglePick(n)}
                    disabled={state.phase !== 'idle'}
                    className={`keno-spot ${stateClass}`}
                    aria-label={`Number ${n}${picked ? ', picked' : ''}${drawn ? ', drawn' : ''}`}
                    aria-pressed={picked}
                  >
                    {n}
                  </button>
                );
              })}
            </div>

            {/* Status row — compact LED readouts */}
            <div className="keno-status">
              <div className="led-frame keno-stat">
                <span className="readout-label">SPOTS</span>
                <span className="led-amber-sm">{spotsPlayed}</span>
              </div>
              <div className="led-frame keno-stat">
                <span className="readout-label">HITS</span>
                <span className="led-amber-sm">
                  {state.phase === 'awaitingChoice' ? `${firstHalfHits}/?` : state.lastHits}
                </span>
              </div>
              <div className="led-frame keno-stat">
                <span className="readout-label">BET</span>
                <span className="led-amber-sm">
                  {formatCents(state.roundBet)}
                  {state.roundBet > state.currentBet ? ' ×2' : ''}
                </span>
              </div>
              <div className="led-frame keno-stat">
                <span className="readout-label">WIN</span>
                <span className={`led-amber-sm ${winTier ? `tier-${winTier}` : ''}`}>
                  {formatCents(state.lastWinAmount)}
                </span>
              </div>
              <div className="led-frame keno-stat">
                <span className="readout-label">CREDIT</span>
                <span className="led-amber-sm">{formatCents(state.credits + freePlayCents)}</span>
              </div>
            </div>

            {/* Bet controls */}
            <section className="bet-section" aria-label="Bet controls">
              <div className="bet-row">
                <div className="bet-label">
                  <span className="bet-label-main">BET</span>
                  <span className="bet-label-sub">5¢ STEP</span>
                </div>
                <button
                  className="bet-step-button"
                  onClick={() => adjustBet(-BET_STEP_CENTS)}
                  disabled={state.phase !== 'idle' || state.currentBet <= MIN_BET_CENTS}
                  aria-label="Decrease bet"
                >
                  −
                </button>
                <div className="led-frame bet-readout-frame">
                  <div className="led-value led-amber">{formatCents(state.currentBet)}</div>
                </div>
                <button
                  className="bet-step-button"
                  onClick={() => adjustBet(BET_STEP_CENTS)}
                  disabled={state.phase !== 'idle' || state.currentBet >= MAX_BET_CENTS}
                  aria-label="Increase bet"
                >
                  +
                </button>
                <button
                  className={`max-bet-button ${state.currentBet === MAX_BET_CENTS ? 'active' : ''}`}
                  onClick={() => { engineRef.current.setBet(MAX_BET_CENTS); sync(); }}
                  disabled={state.phase !== 'idle' || state.currentBet === MAX_BET_CENTS}
                  aria-label="Max bet"
                >
                  MAX
                </button>
              </div>
            </section>

            {/* Primary CTA — PLAY GAME / NEW ROUND, or inline DOUBLE-UP/STAY
                after the first 10 balls drop. Kept inline (not a modal) so
                the player can see the drawn card while choosing. */}
            {state.phase === 'idle' && (
              <button
                className="spin-button"
                onClick={handlePlay}
                disabled={!canPlay}
                aria-label="Play game"
              >
                <span className="spin-button-inner">PLAY GAME</span>
              </button>
            )}
            {state.phase === 'resolved' && (
              <button
                className="spin-button"
                onClick={handleNewRound}
                aria-label="New round"
              >
                <span className="spin-button-inner">NEW ROUND</span>
              </button>
            )}
            {state.phase === 'awaitingChoice' && (
              <div className="keno-du-inline" role="group" aria-label="Double-up choice">
                <button
                  className="keno-du-double"
                  onClick={handleDoubleUp}
                  disabled={!canDouble}
                  aria-label={`Double up to ${formatCents(state.currentBet * 2)}`}
                >
                  DOUBLE-UP
                  <span className="keno-du-sub">{formatCents(state.currentBet * 2)}</span>
                </button>
                <button
                  className="keno-du-collect"
                  onClick={handleStay}
                  aria-label={`Stay at ${formatCents(state.currentBet)}`}
                >
                  STAY
                  <span className="keno-du-sub">{formatCents(state.currentBet)}</span>
                </button>
              </div>
            )}
            {error && (
              <p className="keno-du-warn" role="alert" onClick={() => setError(null)}>
                {error}
              </p>
            )}

            {/* Secondary row — WIPE + QUICK PICK */}
            <div className="secondary-row">
              <button
                className="autospin-button"
                onClick={handleWipe}
                disabled={state.phase !== 'idle' || spotsPlayed === 0}
              >
                WIPE CARD
              </button>
              <button
                className="autospin-button"
                onClick={handleQuickPick}
                disabled={state.phase !== 'idle'}
              >
                QUICK PICK
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Paytable modal */}
      {showPaytable && (
        <div
          className="modal-overlay"
          onClick={() => setShowPaytable(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="keno-paytable-title"
        >
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2 id="keno-paytable-title">DOUBLE-UP KENO</h2>
              <button
                className="modal-close"
                onClick={() => setShowPaytable(false)}
                aria-label="Close paytable"
              >
                ✕
              </button>
            </header>
            <div className="paytable-body keno-paytable-body">
              <div className="paytable-col">
                <h3 className="paytable-col-header">
                  HOW TO PLAY
                  <span className="paytable-col-sub">Pick 2–10 spots, then play</span>
                </h3>
                <ol className="keno-rules">
                  <li>Mark {MIN_SPOTS}–{MAX_SPOTS} numbers on the card.</li>
                  <li>Set your bet (5¢ steps, max {formatCents(MAX_BET_CENTS)}).</li>
                  <li>PLAY GAME drops the first 10 balls.</li>
                  <li>DOUBLE-UP doubles your bet for the next 10 balls — or STAY.</li>
                  <li>Final hits across all 20 balls determine your payout.</li>
                </ol>
                <p className="keno-rules-foot">
                  Progressive jackpot requires a wager of at least{' '}
                  {formatCents(PROGRESSIVE_MIN_BET_CENTS)}.
                </p>
              </div>

              {spotsPlayed >= MIN_SPOTS && (
                <div className="paytable-col">
                  <h3 className="paytable-col-header">
                    PAYS FOR {spotsPlayed} SPOTS
                    <span className="paytable-col-sub">
                      Designed RTP {(designedRTP(spotsPlayed) * 100).toFixed(1)}%
                    </span>
                  </h3>
                  <div className="keno-pay-grid">
                    <div className="keno-pay-head">HITS</div>
                    <div className="keno-pay-head">× BET</div>
                    <div className="keno-pay-head">@ {formatCents(state.currentBet)}</div>
                    {Object.entries(PAYTABLE[spotsPlayed] || {})
                      .sort((a, b) => Number(b[0]) - Number(a[0]))
                      .map(([h, mult]) => (
                        <React.Fragment key={h}>
                          <div className="keno-pay-cell">{h}</div>
                          <div className="keno-pay-cell keno-pay-mult">×{mult}</div>
                          <div className="keno-pay-cell">
                            {formatCents(state.currentBet * (mult as number))}
                          </div>
                        </React.Fragment>
                      ))}
                  </div>
                </div>
              )}

              <div className="paytable-col">
                <h3 className="paytable-col-header">FAIRNESS</h3>
                <p>Outcomes use a Mersenne Twister RNG seeded at launch from system entropy.</p>
                <p>Theoretical return to player: <strong>95.0%</strong></p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
