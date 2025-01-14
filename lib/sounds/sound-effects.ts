"use client";

class SoundEffects {
  private audioContext: AudioContext | null = null;
  private gain: GainNode | null = null;

  constructor() {
    // Initialize on first user interaction
    if (typeof window !== 'undefined') {
      window.addEventListener('click', () => {
        if (!this.audioContext) {
          this.initAudio();
        }
      }, { once: true });
    }
  }

  private initAudio() {
    this.audioContext = new AudioContext();
    this.gain = this.audioContext.createGain();
    this.gain.connect(this.audioContext.destination);
    this.gain.gain.value = 0.2; // Set default volume
  }

  private ensureContext() {
    if (!this.audioContext || this.audioContext.state === 'suspended') {
      this.initAudio();
    }
  }

  // Generic synth beep with configurable parameters
  private async playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    attack = 0.01,
    release = 0.1
  ) {
    this.ensureContext();
    if (!this.audioContext || !this.gain) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.gain);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    // Attack
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(1, this.audioContext.currentTime + attack);

    // Release
    gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration + release);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration + release);
  }

  // Hover effect
  async hover() {
    await this.playTone(2000, 0.05, 'sine', 0.01, 0.05);
  }

  // Click effect
  async click() {
    await this.playTone(1200, 0.1, 'square', 0.01, 0.1);
  }

  // Selection effect
  async select() {
    const now = this.audioContext?.currentTime || 0;
    await this.playTone(880, 0.1, 'triangle', 0.01, 0.1);
    setTimeout(() => this.playTone(1320, 0.1, 'triangle', 0.01, 0.1), 100);
  }

  // Win effect
  async win() {
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((note, i) => {
      setTimeout(() => {
        this.playTone(note, 0.2, 'triangle', 0.05, 0.1);
      }, i * 100);
    });
  }

  // Lose effect
  async lose() {
    const notes = [392.00, 349.23, 329.63, 293.66]; // G4, F4, E4, D4
    notes.forEach((note, i) => {
      setTimeout(() => {
        this.playTone(note, 0.2, 'sawtooth', 0.05, 0.1);
      }, i * 100);
    });
  }

  // Draw effect
  async draw() {
    const notes = [523.25, 493.88, 523.25]; // C5, B4, C5
    notes.forEach((note, i) => {
      setTimeout(() => {
        this.playTone(note, 0.15, 'triangle', 0.05, 0.1);
      }, i * 150);
    });
  }
}

// Export a singleton instance
export const soundEffects = new SoundEffects();