// Procedural Web Audio API synthesizer for SKY LIFE
// Zero external asset dependencies, copyright-clean, warm & atmospheric

class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private bgmInterval: number | null = null;
  private currentTheme: 'title' | 'flight' | 'challenge' | 'ending' | 'none' = 'none';
  private stepIndex = 0;

  constructor() {
    // Saved sound preference
    try {
      const saved = localStorage.getItem('skylife_sound_enabled');
      if (saved !== null) {
        this.enabled = JSON.parse(saved);
      }
    } catch {
      this.enabled = true;
    }
  }

  private ensureContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    try {
      localStorage.setItem('skylife_sound_enabled', JSON.stringify(val));
    } catch {
      // ignore
    }
    if (!val) {
      this.stopBGM();
    } else if (this.currentTheme !== 'none') {
      const theme = this.currentTheme;
      this.currentTheme = 'none';
      this.startBGM(theme);
    }
  }

  public playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.12,
    slideToFreq?: number
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideToFreq) {
        osc.frequency.exponentialRampToValueAtTime(slideToFreq, ctx.currentTime + duration);
      }

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration + 0.02);
    } catch {
      // ignore audio context restrictions
    }
  }

  public playChoiceSuccess() {
    this.playTone(523.25, 0.16, 'triangle', 0.15); // C5
    setTimeout(() => this.playTone(659.25, 0.18, 'triangle', 0.15), 70); // E5
    setTimeout(() => this.playTone(783.99, 0.28, 'sine', 0.18), 140); // G5
  }

  public playBoost() {
    this.playTone(220, 0.35, 'sine', 0.12, 660);
  }

  public playObstacleHit() {
    this.playTone(150, 0.3, 'sawtooth', 0.16, 65);
    setTimeout(() => this.playTone(110, 0.35, 'triangle', 0.15, 55), 60);
  }

  public playPortalEnter() {
    const notes = [392.0, 493.88, 587.33, 783.99, 987.77];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, 0.3, 'sine', 0.14), idx * 65);
    });
  }

  public playGrowthFanfare() {
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, 0.28, 'triangle', 0.14), idx * 80);
    });
  }

  public playChallengeSuccess() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, 0.35, 'triangle', 0.18), idx * 95);
    });
  }

  public startBGM(theme: 'title' | 'flight' | 'challenge' | 'ending') {
    if (this.currentTheme === theme && this.bgmInterval !== null) return;
    this.stopBGM();
    this.currentTheme = theme;
    if (!this.enabled) return;

    this.stepIndex = 0;

    const scales: Record<string, number[]> = {
      title: [261.63, 329.63, 392.0, 493.88, 523.25, 392.0, 329.63, 293.66],
      flight: [293.66, 369.99, 440.0, 554.37, 587.33, 659.25, 554.37, 440.0],
      challenge: [329.63, 392.0, 493.88, 587.33, 659.25, 783.99, 659.25, 493.88],
      ending: [261.63, 329.63, 392.0, 523.25, 659.25, 523.25, 392.0, 329.63],
    };

    const intervalMs = theme === 'challenge' ? 320 : theme === 'flight' ? 520 : 680;
    const notes = scales[theme] || scales.flight;

    this.bgmInterval = window.setInterval(() => {
      if (!this.enabled) return;
      const note = notes[this.stepIndex % notes.length];
      this.stepIndex++;
      this.playTone(note, intervalMs / 1000 + 0.15, 'sine', theme === 'challenge' ? 0.06 : 0.045);
    }, intervalMs);
  }

  public stopBGM() {
    if (this.bgmInterval !== null) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }
}

export const soundEngine = new SoundEngine();
