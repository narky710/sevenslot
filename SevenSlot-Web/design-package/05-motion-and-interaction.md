# 05 · Motion & Interaction

Timings/easings are extracted from `index.css` keyframes and the view's
animation scheduler. Every motion has a `prefers-reduced-motion` fallback.

---

## 1. Reel motion

| Phase | Spec |
|---|---|
| Spin start | All bands enter spinning; symbols swap to a tumble pool. |
| Band shimmer | `luxReelShimmerH` 0.2 s linear ∞ (inset glow breathe). |
| Symbol blur | `luxBlurH` 0.12 s linear ∞ — `blur(1.4px)`, `opacity .85`, `translateX 0→-3→0` (horizontal, matching left→right spin). |
| Base stop | first band ≈ **620 ms**; **stagger 260 ms** per subsequent band (top→bottom). Reduced-motion: 40 ms / 40 ms. |
| Anticipation | If 2+ scatters teasing on bands 1–2, bands 3+ slow by **+700 ms** with an audio sting at `stop−150 ms`. |
| Settle | band stop → reelStop SFX + haptic; scatter land → scatter SFX. |

## 2. Win presentation

- Winning cell: `luxWinPulse` 0.9 s ease-in-out ∞ (`scale 1→1.05`), cyan
  border + glow. Non-winning cells → `opacity .4` (250 ms).
- Payline draw: `paylineDraw` 0.6 s ease-out (stroke-dashoffset 1200→0) then
  `paylinePulse` 1.2 s ∞.
- Win count-up: numeric ramp on LAST WIN; coin chimes scale with tier.
- Celebration: `celebration-glow` wash + particle field
  (`1.4–2.6 s` varied), counts 8/16/24 for BIG/MEGA/EPIC. EPIC = jackpot
  grade. Reduced-motion: **glow only, particles suppressed**.

## 3. Bonus motion

- Banner enter: `luxBannerPop` 0.5 s cubic-bezier(.34,1.56,.64,1) (overshoot).
- CTA: `luxBannerCtaPulse` 0.9 s ∞ (opacity+scale breathe). Countdown line
  is steady (no pulse) for readability.
- Diamond collect: `luxCollect` 0.42 s ease-in (scale 1→1.18→0.7,
  translateY −40%, fade) → meter gem `luxGemPop` 0.4 s overshoot.
- Multiplier: `luxMultPulse` 1.4 s ∞ (scale 1→1.07).
- Retrigger flash: brief enter/hold/exit ≈ 1.1 s (350 ms reduced).
- Jackpot: full flash + confetti (`2–4 s` varied, 40 pieces),
  `luxJpHit` 0.4 s steps(2) ×6 on the won meter.

## 4. Ambient

- FEVER pills: `luxJpBreath` 3.2 s ∞ (subtle gold glow breathe).
- Title shine sweep (gradient translate).
- Session-clock dot pulse.
- Line preview: `luxPreviewFade` 0.22 s ease-out in; pips
  `luxPipPulse` 1 s ∞ while active.
- Modal/banners backdrop: `overlayFade` 0.3 s + 4 px blur.

## 5. Control feedback

| Action | Visual | Audio | Haptic |
|---|---|---|---|
| Any tap | — | `click` | `light` |
| Stepper ± | LED updates, preview | `tick` | `light` |
| SPIN | depress (translateY), reels start | `startSpin` | `medium` |
| Band stop | settle | `reelStop` | `reelStop` |
| Win (tiered) | badge + glow | `win(tier)` | `win` / `jackpot` (mega/epic) |
| Scatter land | symbol pop | `scatterLand` | — |
| Bonus trigger | banner pop | `bonusTrigger` | `jackpot` |
| Diamond collect | meter fill | `diamondCollect` + `multiplierTick` | `light` |
| Bonus end | outro | `bonusOutro` | `jackpot` |
| RESUME pulse | `autospin-paused` cyan pulse ∞ | — | — |

Audio & haptics are pure enhancement — wrapped so a failure never breaks the
spin/bonus flow. All are mute/disable-respecting.

## 6. Auto-play timing & rules

- Scheduler is effect-driven (not recursive timeout). Next spin fires only
  when fully idle: not spinning, not presenting a win, not in bonus, no
  modal/banner/jackpot/retrigger, phase = base, credit ≥ bet.
- Inter-spin delay: **600 ms** (150 ms reduced-motion).
- **BIG+ pause:** on BIG/MEGA/EPIC the run pauses, AUTO → `RESUME (n)`
  (cyan pulse); player must tap to continue. (UX safety — keep it.)
- **Bonus continuity:** a bonus does NOT end the run; the count is held
  through intro→spins→outro and **resumes** afterward.
- Banner auto-proceed countdown: manual **120 s / 60 s** (intro/outro);
  during an auto-run **15 s / 30 s** (player is away). Tap/Enter/Space
  proceeds immediately and cancels the countdown.

## 7. Easing vocabulary

- Overshoot (celebratory enter): `cubic-bezier(0.34,1.56,0.64,1)`.
- Standard in/out: `ease-out` (enters), `ease-in-out` (loops).
- Linear: continuous spin shimmer/blur only.

Keep durations within ±10% if reskinning; the reel stagger (260 ms) and
the BIG+ pause are tuned for perceived fairness — do not shorten silently.
