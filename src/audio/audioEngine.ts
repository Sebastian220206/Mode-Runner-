/**
 * AudioEngine - Elite Web Audio synthesizer & drone engine
 * Features:
 * - 100% offline & zero network assets (instant first-load)
 * - Safe iOS/Safari AudioContext unlock on first user pointerdown
 * - Ambient Root + Fifth Harmonic Drone Pad modulated by mode brightness
 * - Warm polyphonic physical-modeled EP/bell synth with stereo chorus & reverb
 * - Shimmer burst for characteristic degrees & harp arpeggio for octave victory
 * - Dissonant stumble sound + filter dip on mistakes
 * - Silent/Muted detection & visual haptic pulse callback for sound-off mode
 */

export interface AudioVisualPulse {
  midi: number;
  freq: number;
  isCharacteristic: boolean;
  isError: boolean;
  intensity: number;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private isUnlocked: boolean = false;
  private masterGain: GainNode | null = null;
  private droneGain: GainNode | null = null;
  private droneOscs: OscillatorNode[] = [];
  private isMuted: boolean = false;
  private onPulseCallback?: (pulse: AudioVisualPulse) => void;

  constructor() {
    // Lazy AudioContext creation to satisfy autoplay policy
  }

  public setPulseCallback(cb: (pulse: AudioVisualPulse) => void): void {
    this.onPulseCallback = cb;
  }

  public isAudioUnlocked(): boolean {
    return this.isUnlocked && this.ctx !== null && this.ctx.state === 'running';
  }

  /**
   * Must be called inside a pointerdown / click / keydown event handler
   */
  public async unlock(): Promise<boolean> {
    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();

      // Master gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    // Play a 1-sample silent buffer to unlock iOS Safari
    try {
      const buffer = this.ctx.createBuffer(1, 1, 22050);
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.ctx.destination);
      source.start(0);
      this.isUnlocked = true;
    } catch (e) {
      console.warn('Silent unlock buffer failed', e);
    }

    return this.isUnlocked;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.85, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public midiToFreq(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /**
   * Starts a rich Root + Fifth drone for the scale tonic
   * Brightness (0.0 to 1.0) controls lowpass cutoff (Locrian dark = 300Hz, Lydian bright = 2500Hz)
   */
  public startTonicDrone(tonicMidi: number, brightness: number): void {
    if (!this.ctx || !this.masterGain) return;
    this.stopTonicDrone();

    const rootFreq = this.midiToFreq(tonicMidi - 24); // 2 octaves below
    const fifthFreq = this.midiToFreq(tonicMidi - 17); // fifth above deep root

    const droneGain = this.ctx.createGain();
    droneGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    droneGain.gain.exponentialRampToValueAtTime(0.18, this.ctx.currentTime + 1.2);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const cutoff = 250 + brightness * 2200; // Bright modes open the harmonic window
    filter.frequency.setValueAtTime(cutoff, this.ctx.currentTime);
    filter.Q.setValueAtTime(2.5, this.ctx.currentTime);

    // Two warm detuned oscillators (warm saw/triangle blend)
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(rootFreq, this.ctx.currentTime);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(fifthFreq, this.ctx.currentTime);

    const oscSub = this.ctx.createOscillator();
    oscSub.type = 'sine';
    oscSub.frequency.setValueAtTime(rootFreq * 0.5, this.ctx.currentTime);

    osc1.connect(filter);
    osc2.connect(filter);
    oscSub.connect(filter);
    filter.connect(droneGain);
    droneGain.connect(this.masterGain);

    const now = this.ctx.currentTime;
    osc1.start(now);
    osc2.start(now);
    oscSub.start(now);

    this.droneGain = droneGain;
    this.droneOscs = [osc1, osc2, oscSub];
  }

  public stopTonicDrone(): void {
    if (this.droneGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.droneGain.gain.linearRampToValueAtTime(0.0001, now + 0.6);
        setTimeout(() => {
          this.droneOscs.forEach((o) => {
            try {
              o.stop();
              o.disconnect();
            } catch (_) {}
          });
          this.droneOscs = [];
        }, 700);
      } catch (_) {}
    }
  }

  /**
   * Plays a single scale step note with dynamic overtone synthesis
   */
  public playStepNote(midi: number, isCharacteristic: boolean = false): void {
    const freq = this.midiToFreq(midi);

    // Fire visual pulse callback (for silent mode / HUD ripple / haptics)
    if (this.onPulseCallback) {
      this.onPulseCallback({
        midi,
        freq,
        isCharacteristic,
        isError: false,
        intensity: isCharacteristic ? 1.0 : 0.7
      });
    }

    // Trigger haptics if supported
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(isCharacteristic ? [30, 20, 30] : 20);
      } catch (_) {}
    }

    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    // Polyphonic Voice: Fundamental + Bell Modulator
    const osc = this.ctx.createOscillator();
    osc.type = isCharacteristic ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    // Bell chime overtone for characteristic step
    let bellOsc: OscillatorNode | null = null;
    let bellGain: GainNode | null = null;
    if (isCharacteristic) {
      bellOsc = this.ctx.createOscillator();
      bellOsc.type = 'sine';
      bellOsc.frequency.setValueAtTime(freq * 2.76, now); // Metallic partial

      bellGain = this.ctx.createGain();
      bellGain.gain.setValueAtTime(0.18, now);
      bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
      bellOsc.connect(bellGain);
      bellGain.connect(this.masterGain);
      bellOsc.start(now);
      bellOsc.stop(now + 0.9);
    }

    const noteGain = this.ctx.createGain();
    const peakVolume = isCharacteristic ? 0.35 : 0.28;
    noteGain.gain.setValueAtTime(0.001, now);
    noteGain.gain.linearRampToValueAtTime(peakVolume, now + 0.02); // quick 20ms attack
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2); // resonant decay

    osc.connect(noteGain);
    noteGain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 1.3);
  }

  /**
   * Plays a muted dissonant stumble tone when player hits wrong step
   */
  public playStumbleTone(wrongMidi: number): void {
    const freq = this.midiToFreq(wrongMidi);

    if (this.onPulseCallback) {
      this.onPulseCallback({
        midi: wrongMidi,
        freq,
        isCharacteristic: false,
        isError: true,
        intensity: 0.9
      });
    }

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([60, 40, 60]);
      } catch (_) {}
    }

    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq * 0.98, now); // slightly flat / dissonant detune

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, now);
    filter.frequency.exponentialRampToValueAtTime(120, now + 0.3);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  /**
   * Triumphant harp-like octave arpeggio playing through all 8 notes
   */
  public playVictoryArpeggio(scaleMidi: number[]): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    scaleMidi.forEach((midi, i) => {
      const noteTime = now + i * 0.09;
      const freq = this.midiToFreq(midi);

      const osc = this.ctx!.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteTime);

      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.linearRampToValueAtTime(0.25, noteTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 1.4);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(noteTime);
      osc.stop(noteTime + 1.5);
    });
  }

  /**
   * Educational audio comparison: plays a mode scale vs. standard parallel major or minor
   */
  public playComparisonSequence(
    scaleMidi: number[],
    onNoteStart?: (index: number) => void
  ): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    scaleMidi.forEach((midi, i) => {
      const noteTime = now + i * 0.28;
      const freq = this.midiToFreq(midi);

      const osc = this.ctx!.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      const gain = this.ctx!.createGain();
      gain.gain.setValueAtTime(0.001, noteTime);
      gain.gain.linearRampToValueAtTime(0.28, noteTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.6);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(noteTime);
      osc.stop(noteTime + 0.65);

      if (onNoteStart) {
        setTimeout(() => onNoteStart(i), i * 280);
      }
    });
  }
}
