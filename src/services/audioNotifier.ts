export type AlertSoundType =
  | 'cyber-siren'
  | 'sonar-pulse'
  | 'critical-klaxon'
  | 'modern-marimba'
  | 'synth-beacon'
  | 'sub-bass-rumble';

export type ResolutionSoundType =
  | 'harmonic-chimes'
  | 'retro-level-up'
  | 'zen-bell';

export interface AudioSettings {
  enabled: boolean;
  volume: number; // 0.0 to 1.0
  alertSound: AlertSoundType;
  resolutionSound: ResolutionSoundType;
  severityThreshold: 'P1_ONLY' | 'P1_P2' | 'ALL';
  alertOnAnomalies: boolean;
  harmfulServerSirenEnabled: boolean;
  cooldownSeconds: number;
}

const DEFAULT_SETTINGS: AudioSettings = {
  enabled: true,
  volume: 0.75,
  alertSound: 'cyber-siren',
  resolutionSound: 'harmonic-chimes',
  severityThreshold: 'P1_P2',
  alertOnAnomalies: false,
  harmfulServerSirenEnabled: true,
  cooldownSeconds: 3,
};

const STORAGE_KEY = 'incidentpulse_audio_settings';

class AudioNotifier {
  private ctx: AudioContext | null = null;
  private settings: AudioSettings = { ...DEFAULT_SETTINGS };
  private lastAlertTime: number = 0;
  private lastAnomalyTime: number = 0;
  private lastSirenTime: number = 0;

  // Active Siren Nodes for instant silencing
  private activeSirenGain: GainNode | null = null;
  private activeSirenSources: { stop: () => void; disconnect: () => void }[] = [];
  private sirenTimeoutId: any = null;
  private isBlaring: boolean = false;

  constructor() {
    this.loadSettings();
  }

  private loadSettings(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  private saveSettings(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // storage unavailable
    }
  }

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<AudioSettings>): AudioSettings {
    this.settings = { ...this.settings, ...partial };
    this.saveSettings();
    return { ...this.settings };
  }

  public setEnabled(enabled: boolean): void {
    this.updateSettings({ enabled });
    if (!enabled) {
      this.stopSiren();
    }
  }

  public isEnabled(): boolean {
    return this.settings.enabled;
  }

  public setAlertSound(sound: AlertSoundType): void {
    this.updateSettings({ alertSound: sound });
  }

  public setVolume(volume: number): void {
    this.updateSettings({ volume: Math.max(0, Math.min(1, volume)) });
  }

  public isSirenActive(): boolean {
    return this.isBlaring;
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Stop/Silence any currently blaring siren immediately
   */
  public stopSiren(): void {
    try {
      if (this.sirenTimeoutId) {
        clearTimeout(this.sirenTimeoutId);
        this.sirenTimeoutId = null;
      }

      if (this.activeSirenGain && this.ctx) {
        const t = this.ctx.currentTime;
        this.activeSirenGain.gain.cancelScheduledValues(t);
        this.activeSirenGain.gain.setValueAtTime(this.activeSirenGain.gain.value, t);
        this.activeSirenGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      }

      setTimeout(() => {
        for (const src of this.activeSirenSources) {
          try {
            src.stop();
            src.disconnect();
          } catch {}
        }
        this.activeSirenSources = [];
        this.activeSirenGain = null;
        this.isBlaring = false;
      }, 60);
    } catch {
      this.isBlaring = false;
    }
  }

  /**
   * Play High-Urgency Harmful Server Emergency Siren
   * Synthesizes an authentic multi-cycle rising and falling wailing emergency siren.
   */
  public playHarmfulServerSiren(serverName?: string, force: boolean = false): void {
    if (!this.settings.enabled && !force) return;
    if (!this.settings.harmfulServerSirenEnabled && !force) return;

    // Minimum cooldown for siren to prevent chaotic overlap (unless forced preview)
    const now = Date.now();
    if (!force && now - this.lastSirenTime < 4500) {
      return;
    }
    this.lastSirenTime = now;

    try {
      const ctx = this.getContext();
      if (!ctx) return;

      // Silence any previous siren
      this.stopSiren();
      this.isBlaring = true;

      const t = ctx.currentTime;
      const masterGain = ctx.createGain();
      const targetVolume = Math.max(0.05, this.settings.volume * 0.45);
      masterGain.gain.setValueAtTime(0.001, t);
      masterGain.gain.linearRampToValueAtTime(targetVolume, t + 0.15);

      // Lowpass resonant filter simulating an industrial emergency siren horn
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, t);
      filter.Q.setValueAtTime(3.5, t);

      masterGain.connect(filter);
      filter.connect(ctx.destination);
      this.activeSirenGain = masterGain;

      // Voice 1: Sawtooth horn oscillator
      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';

      // Voice 2: Slightly detuned wave (+4Hz) for ominous acoustic beating chorus
      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';

      // Voice 3: Sub-harmonic body
      const oscSub = ctx.createOscillator();
      oscSub.type = 'sine';

      // LFO for emergency warble modulation
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(6.0, t); // 6 Hz flutter
      lfoGain.gain.setValueAtTime(18, t); // +/- 18 Hz pitch wobble

      lfo.connect(lfoGain);
      lfoGain.connect(osc1.frequency);
      lfoGain.connect(osc2.frequency);

      // 3 Multi-Cycle Rising & Falling Siren Sweeps (3.6 seconds total)
      // Cycle 1: 460Hz -> 880Hz -> 480Hz
      osc1.frequency.setValueAtTime(460, t);
      osc1.frequency.linearRampToValueAtTime(880, t + 0.6);
      osc1.frequency.linearRampToValueAtTime(480, t + 1.2);

      // Cycle 2: 480Hz -> 960Hz -> 500Hz
      osc1.frequency.linearRampToValueAtTime(960, t + 1.8);
      osc1.frequency.linearRampToValueAtTime(500, t + 2.4);

      // Cycle 3: 500Hz -> 1040Hz -> 440Hz
      osc1.frequency.linearRampToValueAtTime(1040, t + 3.0);
      osc1.frequency.linearRampToValueAtTime(440, t + 3.5);

      // Detuned Voice 2 tracks slightly higher
      osc2.frequency.setValueAtTime(464, t);
      osc2.frequency.linearRampToValueAtTime(884, t + 0.6);
      osc2.frequency.linearRampToValueAtTime(484, t + 1.2);
      osc2.frequency.linearRampToValueAtTime(964, t + 1.8);
      osc2.frequency.linearRampToValueAtTime(504, t + 2.4);
      osc2.frequency.linearRampToValueAtTime(1044, t + 3.0);
      osc2.frequency.linearRampToValueAtTime(444, t + 3.5);

      // Sub oscillator tracks lower register
      oscSub.frequency.setValueAtTime(230, t);
      oscSub.frequency.linearRampToValueAtTime(440, t + 0.6);
      oscSub.frequency.linearRampToValueAtTime(240, t + 1.2);
      oscSub.frequency.linearRampToValueAtTime(480, t + 1.8);
      oscSub.frequency.linearRampToValueAtTime(250, t + 2.4);
      oscSub.frequency.linearRampToValueAtTime(520, t + 3.0);
      oscSub.frequency.linearRampToValueAtTime(220, t + 3.5);

      // Connect oscillators to master gain
      osc1.connect(masterGain);
      osc2.connect(masterGain);
      oscSub.connect(masterGain);

      // Natural siren spin-down / fadeout
      masterGain.gain.setValueAtTime(targetVolume, t + 3.3);
      masterGain.gain.exponentialRampToValueAtTime(0.001, t + 3.65);

      // Start all sound generators
      osc1.start(t);
      osc2.start(t);
      oscSub.start(t);
      lfo.start(t);

      // Schedule automated cleanup
      osc1.stop(t + 3.7);
      osc2.stop(t + 3.7);
      oscSub.stop(t + 3.7);
      lfo.stop(t + 3.7);

      this.activeSirenSources = [
        { stop: () => osc1.stop(), disconnect: () => osc1.disconnect() },
        { stop: () => osc2.stop(), disconnect: () => osc2.disconnect() },
        { stop: () => oscSub.stop(), disconnect: () => oscSub.disconnect() },
        { stop: () => lfo.stop(), disconnect: () => lfo.disconnect() },
      ];

      this.sirenTimeoutId = setTimeout(() => {
        this.isBlaring = false;
        this.activeSirenGain = null;
        this.activeSirenSources = [];
      }, 3700);
    } catch {
      this.isBlaring = false;
    }
  }

  /**
   * Preview/Test the Harmful Server Siren
   */
  public testHarmfulServerSiren(): void {
    this.playHarmfulServerSiren('Test-Host', true);
  }

  /**
   * Play an alert tone based on active sound profile
   */
  public playIncidentAlert(severity: 'P1' | 'P2' | 'P3' | 'P4' = 'P1', force: boolean = false): void {
    if (!this.settings.enabled && !force) return;

    if (!force) {
      if (this.settings.severityThreshold === 'P1_ONLY' && severity !== 'P1') return;
      if (this.settings.severityThreshold === 'P1_P2' && severity !== 'P1' && severity !== 'P2') return;

      const now = Date.now();
      if (now - this.lastAlertTime < this.settings.cooldownSeconds * 1000) {
        return;
      }
      this.lastAlertTime = now;
    }

    this.synthesizeAlertSound(this.settings.alertSound, this.settings.volume);
  }

  /**
   * Test/Preview a specific alert sound without throttling
   */
  public testAlertSound(soundType: AlertSoundType = this.settings.alertSound, customVolume?: number): void {
    const vol = customVolume !== undefined ? customVolume : this.settings.volume;
    this.synthesizeAlertSound(soundType, vol);
  }

  /**
   * Test/Preview a specific resolution sound
   */
  public testResolutionSound(soundType: ResolutionSoundType = this.settings.resolutionSound, customVolume?: number): void {
    const vol = customVolume !== undefined ? customVolume : this.settings.volume;
    this.synthesizeResolutionSound(soundType, vol);
  }

  /**
   * Play positive resolution chime
   */
  public playResolvedChime(force: boolean = false): void {
    if (!this.settings.enabled && !force) return;
    this.stopSiren(); // Automatically silence any active siren on resolution!
    this.synthesizeResolutionSound(this.settings.resolutionSound, this.settings.volume);
  }

  /**
   * Play subtle tick/ping on statistical anomaly
   */
  public playAnomalyPing(): void {
    if (!this.settings.enabled || !this.settings.alertOnAnomalies) return;
    const now = Date.now();
    if (now - this.lastAnomalyTime < 1500) return;
    this.lastAnomalyTime = now;

    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, t);
      osc.frequency.exponentialRampToValueAtTime(800, t + 0.08);

      const vol = this.settings.volume * 0.15;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
    } catch {
      // Audio context policy
    }
  }

  /**
   * Core Audio Synthesis Engine for Alert Profiles
   */
  private synthesizeAlertSound(sound: AlertSoundType, volumeLevel: number): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(Math.max(0.01, volumeLevel * 0.3), now);
      masterGain.connect(ctx.destination);

      switch (sound) {
        case 'cyber-siren': {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.type = 'sawtooth';
          osc2.type = 'sine';

          osc1.frequency.setValueAtTime(880, now);
          osc1.frequency.exponentialRampToValueAtTime(587, now + 0.15);
          osc1.frequency.setValueAtTime(880, now + 0.18);
          osc1.frequency.exponentialRampToValueAtTime(587, now + 0.35);

          osc2.frequency.setValueAtTime(440, now);
          osc2.frequency.exponentialRampToValueAtTime(293, now + 0.35);

          gain.gain.setValueAtTime(0.35, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(masterGain);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 0.45);
          osc2.stop(now + 0.45);
          break;
        }

        case 'sonar-pulse': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(1174.66, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);

          gain.gain.setValueAtTime(0.45, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(now);
          osc.stop(now + 0.6);
          break;
        }

        case 'critical-klaxon': {
          [0, 0.22].forEach((offset) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(740, now + offset);
            osc.frequency.setValueAtTime(987, now + offset + 0.09);

            gain.gain.setValueAtTime(0.25, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.18);

            osc.connect(gain);
            gain.connect(masterGain);

            osc.start(now + offset);
            osc.stop(now + offset + 0.2);
          });
          break;
        }

        case 'modern-marimba': {
          const notes = [440, 554.37, 659.25];
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.07);

            gain.gain.setValueAtTime(0.35, now + idx * 0.07);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.32);

            osc.connect(gain);
            gain.connect(masterGain);

            osc.start(now + idx * 0.07);
            osc.stop(now + idx * 0.07 + 0.35);
          });
          break;
        }

        case 'synth-beacon': {
          const frequencies = [392, 587.33, 783.99, 1174.66];
          frequencies.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now + idx * 0.05);

            gain.gain.setValueAtTime(0.25, now + idx * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.25);

            osc.connect(gain);
            gain.connect(masterGain);

            osc.start(now + idx * 0.05);
            osc.stop(now + idx * 0.05 + 0.28);
          });
          break;
        }

        case 'sub-bass-rumble': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(160, now);
          osc.frequency.exponentialRampToValueAtTime(45, now + 0.38);

          gain.gain.setValueAtTime(0.6, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(now);
          osc.stop(now + 0.45);
          break;
        }
      }
    } catch {
      // Audio autoplay policy catch
    }
  }

  /**
   * Core Audio Synthesis Engine for Resolution Profiles
   */
  private synthesizeResolutionSound(sound: ResolutionSoundType, volumeLevel: number): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(Math.max(0.01, volumeLevel * 0.25), now);
      masterGain.connect(ctx.destination);

      switch (sound) {
        case 'harmonic-chimes': {
          const chords = [523.25, 659.25, 783.99, 987.77, 1046.5];
          chords.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.07);

            gain.gain.setValueAtTime(0.25, now + idx * 0.07);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.38);

            osc.connect(gain);
            gain.connect(masterGain);

            osc.start(now + idx * 0.07);
            osc.stop(now + idx * 0.07 + 0.42);
          });
          break;
        }

        case 'retro-level-up': {
          const freqs = [330, 392, 659.25, 523.25, 587.33, 783.99];
          freqs.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, now + idx * 0.06);

            gain.gain.setValueAtTime(0.18, now + idx * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.15);

            osc.connect(gain);
            gain.connect(masterGain);

            osc.start(now + idx * 0.06);
            osc.stop(now + idx * 0.06 + 0.18);
          });
          break;
        }

        case 'zen-bell': {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          osc1.type = 'sine';
          osc2.type = 'triangle';

          osc1.frequency.setValueAtTime(528, now);
          osc2.frequency.setValueAtTime(1056, now);

          gain.gain.setValueAtTime(0.4, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(masterGain);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 1.0);
          osc2.stop(now + 1.0);
          break;
        }
      }
    } catch {
      // Audio autoplay policy catch
    }
  }
}

export const audioNotifier = new AudioNotifier();
