/**
 * Audio system for Triple Sevens.
 *
 * Uses the Web Audio API to synthesize the full casino-slot audio kit on the
 * fly — no asset downloads needed. The system intentionally degrades silently
 * on devices that don't support AudioContext (older Android browsers, etc.).
 *
 * Public surface:
 *   audio.unlock()         — call inside the first user gesture (required by iOS Safari)
 *   audio.click()          — UI button tap
 *   audio.tick()           — bet adjustment
 *   audio.startSpin()      — begin reel-spin whirr loop
 *   audio.stopSpin()       — stop reel-spin whirr loop
 *   audio.reelStop()       — single reel landing
 *   audio.anticipation()   — pre-third-reel build (when 1&2 match)
 *   audio.win(tier)        — tiered win stinger ('small'|'win'|'big'|'mega'|'jackpot')
 *   audio.coinChime(n)     — used by the count-up animation
 *   audio.setMuted(bool)
 *   audio.isMuted()
 */

type WinTier = 'small' | 'win' | 'big' | 'mega' | 'jackpot';

class AudioSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted = false;
  private spinLoopNodes: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
  private unlocked = false;

  /** Call inside a user gesture to satisfy iOS autoplay policy. */
  unlock(): void {
    if (this.unlocked) return;
    try {
      // @ts-expect-error - webkit prefix for older Safari
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.6;
      this.masterGain.connect(this.ctx.destination);

      // iOS: resume context inside the gesture
      if (this.ctx.state === 'suspended') this.ctx.resume();

      // Tiny silent buffer plays to fully unlock
      const buf = this.ctx.createBuffer(1, 1, 22050);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.ctx.destination);
      src.start(0);

      this.unlocked = true;
    } catch {
      // silent fail — audio is enhancement, not blocker
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.6, this.ctx.currentTime, 0.02);
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  // ---------- primitive builders ----------

  /** Build a simple AD-S-R envelope on a gain node, with all time intervals
      clamped so they never produce negative absolute times — required by
      Web Audio API spec for setValueAtTime. */
  private tone(
    freq: number,
    type: OscillatorType,
    duration: number,
    volume = 0.3,
    glideTo?: number
  ): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (glideTo !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, glideTo), t + duration);
      }
      osc.connect(gain).connect(this.masterGain);

      // Clamp attack and release so attack + release <= duration with at
      // least a tiny sustain hold in the middle.
      const attack = Math.min(0.008, duration * 0.25);
      const release = Math.min(0.04, duration * 0.4);
      const holdEnd = Math.max(t + attack + 0.001, t + duration - release);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume, t + attack);
      gain.gain.setValueAtTime(volume, holdEnd);
      gain.gain.linearRampToValueAtTime(0, t + duration);

      osc.start(t);
      osc.stop(t + duration + 0.02);
    } catch {
      // Audio glitch never blocks gameplay.
    }
  }

  private noiseBuffer(duration: number): AudioBuffer | null {
    if (!this.ctx) return null;
    const length = Math.floor(this.ctx.sampleRate * duration);
    const buf = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  // ---------- public sounds ----------
  // Every public method is wrapped in try/catch so that any audio failure
  // (older browsers, suspended context, unsupported features, etc.) can NEVER
  // break gameplay logic. Audio is enhancement; the game must always run.

  click(): void {
    if (!this.ctx || this.muted) return;
    try { this.tone(620, 'square', 0.05, 0.12); } catch {}
  }

  tick(): void {
    if (!this.ctx || this.muted) return;
    try { this.tone(880, 'triangle', 0.06, 0.14); } catch {}
  }

  startSpin(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    if (this.spinLoopNodes) return; // already running
    try {
      // White-noise based "whirr" with a band-pass filter modulating slowly
      const buf = this.noiseBuffer(1.0);
      if (!buf) return;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 850;
      filter.Q.value = 4;

      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.08);

      src.connect(filter).connect(gain).connect(this.masterGain);
      src.start();

      filter.frequency.setValueAtTime(700, t);
      filter.frequency.exponentialRampToValueAtTime(1400, t + 0.5);

      this.spinLoopNodes = { source: src, gain };
    } catch {}
  }

  stopSpin(): void {
    if (!this.ctx || !this.spinLoopNodes) return;
    try {
      const { source, gain } = this.spinLoopNodes;
      const t = this.ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.08);
      source.stop(t + 0.1);
    } catch {}
    this.spinLoopNodes = null;
  }

  /** Percussive thud — a low sine drop + filtered noise transient */
  reelStop(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    try {
      this.tone(180, 'sine', 0.12, 0.32, 60);
      const buf = this.noiseBuffer(0.06);
      if (!buf) return;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 2200;
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      src.connect(filter).connect(gain).connect(this.masterGain);
      src.start();
      src.stop(t + 0.07);
    } catch {}
  }

  /** Pre-third-reel anticipation — rising sweep that holds */
  anticipation(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.55);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.1);
      gain.gain.setValueAtTime(0.18, t + 0.5);
      gain.gain.linearRampToValueAtTime(0, t + 0.6);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1800;
      osc.connect(filter).connect(gain).connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.65);
    } catch {}
  }

  /** Coin chime used during count-up. Pitch rises slightly with index. */
  coinChime(index: number): void {
    if (!this.ctx || this.muted) return;
    try {
      const base = 880;
      const freq = base + (index % 6) * 60;
      this.tone(freq, 'triangle', 0.09, 0.18);
      this.tone(freq * 1.5, 'sine', 0.09, 0.10);
    } catch {}
  }

  /** Tiered win stinger. */
  win(tier: WinTier): void {
    if (!this.ctx || !this.masterGain || this.muted) return;

    const playNote = (freq: number, when: number, dur: number, vol = 0.22) => {
      if (!this.ctx || !this.masterGain) return;
      try {
        const t0 = this.ctx.currentTime + when;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t0);
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
        gain.gain.linearRampToValueAtTime(0, t0 + Math.max(0.02, dur));
        osc.connect(gain).connect(this.masterGain);
        osc.start(t0);
        osc.stop(t0 + dur + 0.05);
      } catch {}
    };

    try { switch (tier) {
      case 'small': {
        // Two-note ding
        playNote(880, 0, 0.12);
        playNote(1175, 0.1, 0.18);
        break;
      }
      case 'win': {
        // Triad arpeggio
        playNote(659, 0, 0.12);
        playNote(784, 0.08, 0.12);
        playNote(988, 0.16, 0.2);
        break;
      }
      case 'big': {
        // Five-note rising flourish + sparkle
        const notes = [523, 659, 784, 988, 1175];
        notes.forEach((f, i) => playNote(f, i * 0.08, 0.18, 0.24));
        playNote(1568, 0.5, 0.3, 0.18);
        break;
      }
      case 'mega': {
        // Octave fanfare + sustained chord
        const notes = [392, 523, 659, 784, 988, 1175, 1568];
        notes.forEach((f, i) => playNote(f, i * 0.06, 0.22, 0.26));
        playNote(1976, 0.5, 0.45, 0.22);
        playNote(2349, 0.55, 0.45, 0.18);
        break;
      }
      case 'jackpot': {
        // Big rising scale + sustained chord stack
        const scale = [262, 330, 392, 523, 659, 784, 988, 1175, 1568];
        scale.forEach((f, i) => playNote(f, i * 0.05, 0.18, 0.28));
        // Held chord
        playNote(523, 0.5, 1.2, 0.22);
        playNote(659, 0.5, 1.2, 0.22);
        playNote(784, 0.5, 1.2, 0.22);
        playNote(1568, 0.6, 1.1, 0.18);
        // Sparkles
        for (let i = 0; i < 8; i++) {
          playNote(1568 + Math.random() * 800, 0.6 + i * 0.08, 0.1, 0.12);
        }
        break;
      }
    } } catch {}
  }

  // ---------- Diamond Riches additions ----------
  // Same synthesized-on-the-fly approach; each is try/catch-wrapped so an
  // audio fault can never block the bonus flow.

  /** Schedule a single enveloped note at currentTime + `when`. */
  private blip(
    freq: number,
    when: number,
    dur: number,
    vol = 0.2,
    type: OscillatorType = 'triangle',
    glideTo?: number
  ): void {
    if (!this.ctx || !this.masterGain) return;
    try {
      const t0 = this.ctx.currentTime + when;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (glideTo !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, glideTo), t0 + dur);
      }
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
      gain.gain.linearRampToValueAtTime(0, t0 + Math.max(0.02, dur));
      osc.connect(gain).connect(this.masterGain);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch {}
  }

  /** Bright sparkle when a scatter lands. */
  scatterLand(): void {
    if (!this.ctx || this.muted) return;
    try {
      this.tone(1318, 'triangle', 0.1, 0.18);
      this.blip(1976, 0.06, 0.14, 0.14, 'sine');
      this.blip(2637, 0.12, 0.16, 0.1, 'sine');
    } catch {}
  }

  /** ~1.8s brassy stinger + sparkle burst for the free-spins trigger. */
  bonusTrigger(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    try {
      const rise = [330, 392, 494, 587, 698, 880];
      rise.forEach((f, i) => this.blip(f, i * 0.1, 0.22, 0.26, 'sawtooth'));
      [523, 659, 784, 1047].forEach((f) => this.blip(f, 0.62, 1.1, 0.2, 'triangle'));
      for (let i = 0; i < 10; i++) {
        this.blip(1568 + Math.random() * 900, 0.7 + i * 0.07, 0.12, 0.1, 'sine');
      }
    } catch {}
  }

  /** ~0.5s bright glissando as a collected diamond flies to the meter. */
  diamondCollect(): void {
    if (!this.ctx || this.muted) return;
    try {
      this.blip(740, 0, 0.42, 0.18, 'triangle', 1900);
      this.blip(1480, 0.05, 0.3, 0.1, 'sine', 2600);
    } catch {}
  }

  /** Short click + chime when the multiplier ticks up by one. */
  multiplierTick(): void {
    if (!this.ctx || this.muted) return;
    try {
      this.tone(540, 'square', 0.04, 0.12);
      this.blip(1320, 0.03, 0.14, 0.16, 'triangle');
    } catch {}
  }

  /** Closing orchestral hit at the end of the bonus. */
  bonusOutro(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    try {
      [880, 698, 587].forEach((f, i) => this.blip(f, i * 0.12, 0.2, 0.24, 'sawtooth'));
      [392, 523, 659, 784].forEach((f) => this.blip(f, 0.4, 1.0, 0.22, 'triangle'));
      this.blip(1568, 0.45, 0.8, 0.14, 'sine');
    } catch {}
  }
}

export const audio = new AudioSystem();
export type { WinTier };
