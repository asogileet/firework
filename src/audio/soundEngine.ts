/**
 * Web Audio Engine for Procedural Fireworks SFX, Procedural Celebration Soundtracks,
 * Realtime FFT Beat Detection, and Audio Stream Recording.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private weatherGain: GainNode | null = null;
  private weatherSource: AudioBufferSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStreamDest: MediaStreamAudioDestinationNode | null = null;

  // Music playback state
  private activeMusicSource: AudioBufferSourceNode | null = null;
  private proceduralIntervalId: number | null = null;
  private isMusicPlaying = false;
  private audioBuffer: AudioBuffer | null = null;
  private playbackStartTime = 0;
  private pauseOffset = 0;

  // Beat detection state
  private freqData: Uint8Array<ArrayBuffer> = new Uint8Array(new ArrayBuffer(64));
  private lastBeatTime = 0;
  private beatThreshold = 1.35;
  private energyHistory: number[] = [];
  private onBeatTrigger: ((intensity: number, band: 'bass' | 'mid' | 'high') => void) | null = null;

  private isMuted = false;

  public init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(0.9, this.ctx.currentTime);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(0.7, this.ctx.currentTime);

    this.weatherGain = this.ctx.createGain();
    this.weatherGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 128;
    this.analyser.smoothingTimeConstant = 0.8;
    this.freqData = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));

    this.mediaStreamDest = this.ctx.createMediaStreamDestination();

    // Wiring:
    // sfx -> sfxGain -> masterGain -> destination & mediaStreamDest
    // music -> musicGain -> analyser -> masterGain
    // weather -> weatherGain -> masterGain
    this.sfxGain.connect(this.masterGain);
    this.weatherGain.connect(this.masterGain);
    this.musicGain.connect(this.analyser);
    this.analyser.connect(this.masterGain);

    this.masterGain.connect(this.ctx.destination);
    this.masterGain.connect(this.mediaStreamDest);
  }

  public getAudioContext(): AudioContext | null {
    return this.ctx;
  }

  public getMediaStream(): MediaStream | null {
    if (!this.mediaStreamDest) return null;
    return this.mediaStreamDest.stream;
  }

  public setOnBeatTrigger(cb: ((intensity: number, band: 'bass' | 'mid' | 'high') => void) | null) {
    this.onBeatTrigger = cb;
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.8, this.ctx.currentTime);
    }
  }

  public isSoundMuted() {
    return this.isMuted;
  }

  // --- PROCEDURAL SFX ---

  /** Play rocket launch whistling whoosh */
  public playLaunch(pitch = 1.0) {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(750 * pitch, now + 0.8);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(1800, now + 0.8);
    filter.Q.setValueAtTime(3, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.9);
  }

  /** Play explosive burst boom / shockwave */
  public playExplosion(intensity = 1.0, isKamuro = false) {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();

    const now = this.ctx.currentTime;

    // Sub-bass thump
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(120, now);
    subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.45);

    subGain.gain.setValueAtTime(0.6 * intensity, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(now);
    subOsc.stop(now + 0.6);

    // Concussive noise blast
    const bufferSize = Math.floor(this.ctx.sampleRate * (isKamuro ? 1.8 : 0.8));
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(150, now + (isKamuro ? 1.5 : 0.7));

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5 * intensity, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + (isKamuro ? 1.7 : 0.75));

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    whiteNoise.start(now);
    whiteNoise.stop(now + (isKamuro ? 1.8 : 0.8));
  }

  /** Play crackling / sparkle pops */
  public playCrackle() {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.resume();

    const count = 5 + Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) {
      const delay = Math.random() * 0.6;
      const now = this.ctx.currentTime + delay;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200 + Math.random() * 1600, now);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.06);
    }
  }

  /** Dynamic procedural ambient weather audio (rain hiss & night breeze) */
  public setWeatherAmbience(weather: string) {
    if (!this.ctx || !this.weatherGain || this.isMuted) return;

    if (this.weatherSource) {
      try {
        this.weatherSource.stop();
        this.weatherSource.disconnect();
      } catch {
        // already stopped
      }
      this.weatherSource = null;
    }

    if (weather === 'clear') {
      this.weatherGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      return;
    }

    this.resume();
    const now = this.ctx.currentTime;
    const isRain = weather === 'drizzle';
    const volume = isRain ? 0.12 : 0.05;

    // Generate looping noise buffer for rain/breeze
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Pink noise filtering for gentle natural rain
      data[i] = (lastOut + 0.04 * white) / 1.04;
      lastOut = data[i];
    }

    this.weatherSource = this.ctx.createBufferSource();
    this.weatherSource.buffer = noiseBuffer;
    this.weatherSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = isRain ? 'bandpass' : 'lowpass';
    filter.frequency.setValueAtTime(isRain ? 1200 : 400, now);
    filter.Q.setValueAtTime(isRain ? 1.5 : 2.5, now);

    this.weatherSource.connect(filter);
    filter.connect(this.weatherGain);
    this.weatherGain.gain.setValueAtTime(volume, now);

    this.weatherSource.start(now);
  }

  // --- MUSIC TRACKS & PROCEDURAL GENERATOR ---

  /** Start procedural celebratory festival soundtrack with beat synchronization */
  public startProceduralCelebrationTrack(style: 'overture' | 'electronic' | 'festive' = 'festive') {
    this.stopMusic();
    if (!this.ctx || !this.musicGain) return;
    this.resume();

    this.isMusicPlaying = true;
    const bpm = style === 'electronic' ? 128 : style === 'overture' ? 108 : 120;
    const beatIntervalMs = (60 / bpm) * 1000;
    let step = 0;

    // Scale notes: Pentatonic / Celebration chords (C major / D minor / F / G)
    const notesFestive = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
    const bassNotes = [130.81, 146.83, 164.81, 196.0];

    this.proceduralIntervalId = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || !this.isMusicPlaying) return;
      const t = this.ctx.currentTime;

      // 1. Kick on quarter notes
      if (step % 2 === 0) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.frequency.setValueAtTime(140, t);
        kickOsc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
        kickGain.gain.setValueAtTime(0.4, t);
        kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        kickOsc.connect(kickGain);
        kickGain.connect(this.musicGain);
        kickOsc.start(t);
        kickOsc.stop(t + 0.22);
      }

      // 2. Chime / Arpeggio melody
      const noteIdx = (step * 3 + Math.floor(step / 8)) % notesFestive.length;
      const freq = notesFestive[noteIdx];
      const melodyOsc = this.ctx.createOscillator();
      const melodyGain = this.ctx.createGain();
      melodyOsc.type = style === 'electronic' ? 'sawtooth' : 'sine';
      melodyOsc.frequency.setValueAtTime(freq, t);

      melodyGain.gain.setValueAtTime(0.12, t);
      melodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      melodyOsc.connect(melodyGain);
      melodyGain.connect(this.musicGain);
      melodyOsc.start(t);
      melodyOsc.stop(t + 0.4);

      // 3. Bass drone on measure start
      if (step % 8 === 0) {
        const bassFreq = bassNotes[(step / 8) % bassNotes.length];
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(bassFreq, t);
        bassGain.gain.setValueAtTime(0.25, t);
        bassGain.gain.exponentialRampToValueAtTime(0.01, t + 1.2);
        bassOsc.connect(bassGain);
        bassGain.connect(this.musicGain);
        bassOsc.start(t);
        bassOsc.stop(t + 1.3);
      }

      step = (step + 1) % 64;
    }, beatIntervalMs / 2);
  }

  /** Load and play custom audio file from File or URL */
  public async loadCustomAudioFile(file: File): Promise<string> {
    this.init();
    if (!this.ctx) throw new Error('Audio Context unavailable');

    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.stopMusic();
    this.playAudioBuffer();
    return file.name;
  }

  public playAudioBuffer() {
    if (!this.ctx || !this.musicGain || !this.audioBuffer) return;
    this.resume();

    this.activeMusicSource = this.ctx.createBufferSource();
    this.activeMusicSource.buffer = this.audioBuffer;
    this.activeMusicSource.loop = true;
    this.activeMusicSource.connect(this.musicGain);

    this.playbackStartTime = this.ctx.currentTime - this.pauseOffset;
    this.activeMusicSource.start(0, this.pauseOffset % this.audioBuffer.duration);
    this.isMusicPlaying = true;
  }

  public stopMusic() {
    if (this.proceduralIntervalId) {
      clearInterval(this.proceduralIntervalId);
      this.proceduralIntervalId = null;
    }
    if (this.activeMusicSource) {
      try {
        this.activeMusicSource.stop();
        this.activeMusicSource.disconnect();
      } catch {
        // ignore already stopped
      }
      this.activeMusicSource = null;
    }
    this.isMusicPlaying = false;
    this.pauseOffset = 0;
  }

  public toggleMusic(style: 'overture' | 'electronic' | 'festive' = 'festive') {
    if (this.isMusicPlaying) {
      this.stopMusic();
    } else {
      if (this.audioBuffer) {
        this.playAudioBuffer();
      } else {
        this.startProceduralCelebrationTrack(style);
      }
    }
    return this.isMusicPlaying;
  }

  public isMusicActive() {
    return this.isMusicPlaying;
  }

  // --- REALTIME FFT & BEAT SYNC ---

  /** Called each animation frame: updates FFT data and checks for rhythm beat drops */
  public updateBeatDetection() {
    if (!this.analyser || !this.isMusicPlaying) return { bass: 0, mid: 0, treble: 0 };

    this.analyser.getByteFrequencyData(this.freqData);

    let bassSum = 0;
    let midSum = 0;
    let highSum = 0;

    const binCount = this.freqData.length;
    const bassEnd = Math.floor(binCount * 0.15);
    const midEnd = Math.floor(binCount * 0.55);

    for (let i = 0; i < binCount; i++) {
      const val = this.freqData[i];
      if (i < bassEnd) bassSum += val;
      else if (i < midEnd) midSum += val;
      else highSum += val;
    }

    const bass = bassSum / (bassEnd || 1);
    const mid = midSum / (midEnd - bassEnd || 1);
    const treble = highSum / (binCount - midEnd || 1);

    const instantEnergy = bass * 1.5 + mid * 0.8;
    this.energyHistory.push(instantEnergy);
    if (this.energyHistory.length > 40) {
      this.energyHistory.shift();
    }

    const avgEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
    const now = performance.now();

    // Trigger on strong beat drop with minimum cooldown
    if (now - this.lastBeatTime > 320 && instantEnergy > avgEnergy * this.beatThreshold && instantEnergy > 70) {
      this.lastBeatTime = now;
      if (this.onBeatTrigger) {
        const band = bass > 120 ? 'bass' : mid > 80 ? 'mid' : 'high';
        this.onBeatTrigger(instantEnergy / 255, band);
      }
    }

    return { bass, mid, treble };
  }
}

export const soundEngine = new SoundEngine();
