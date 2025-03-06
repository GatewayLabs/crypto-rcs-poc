"use client";

class SoundEffects {
  private audioContext: AudioContext | null = null;
  private gain: GainNode | null = null;
  private isMuted: boolean = false;
  private previousVolume: number = 0.2;
  private backgroundMusic: HTMLAudioElement | null = null;
  private backgroundMusicGain: GainNode | null = null;

  constructor() {
    // Initialize on first user interaction
    if (typeof window !== "undefined") {
      window.addEventListener(
        "click",
        () => {
          if (!this.audioContext) {
            this.initAudio();
            this.playBackgroundMusic();
          }
        },
        { once: true }
      );
    }
  }

  private initAudio() {
    this.audioContext = new AudioContext();
    this.gain = this.audioContext.createGain();
    this.gain.connect(this.audioContext.destination);
    this.gain.gain.value = this.isMuted ? 0 : this.previousVolume; // Set default volume or 0 if muted

    // Initialize background music gain node
    if (this.audioContext) {
      this.backgroundMusicGain = this.audioContext.createGain();
      this.backgroundMusicGain.connect(this.audioContext.destination);
      this.backgroundMusicGain.gain.value = this.isMuted ? 0 : 0.2;
    }
  }

  private ensureContext() {
    if (!this.audioContext || this.audioContext.state === "suspended") {
      this.initAudio();
    }
  }

  // Start all audio features including background music
  startAudio() {
    try {
      this.ensureContext();

      // Play a silent sound to unlock audio on iOS
      this.playTone(0, 0.1, "sine", 0, 0);

      // Start background music
      if (this.audioContext) {
        this.playBackgroundMusic();
        return true; // Successfully initialized
      }

      return false; // Failed to initialize audio context
    } catch (error) {
      console.error("Error starting audio:", error);
      return false; // Error during initialization
    }
  }

  // Generic synth beep with configurable parameters
  private async playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = "sine",
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
    oscillator.frequency.setValueAtTime(
      frequency,
      this.audioContext.currentTime
    );

    // Attack
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(
      1,
      this.audioContext.currentTime + attack
    );

    // Release
    gainNode.gain.linearRampToValueAtTime(
      0,
      this.audioContext.currentTime + duration + release
    );

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration + release);
  }

  // Hover effect
  async hover() {
    await this.playTone(2000, 0.05, "sine", 0.01, 0.05);
  }

  // Click effect
  async click() {
    await this.playTone(1200, 0.1, "square", 0.01, 0.1);
  }

  // Selection effect
  async select() {
    // const now = this.audioContext?.currentTime || 0;
    await this.playTone(880, 0.1, "triangle", 0.01, 0.1);
    setTimeout(() => this.playTone(1320, 0.1, "triangle", 0.01, 0.1), 100);
  }

  // Win effect
  async win() {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((note, i) => {
      setTimeout(() => {
        this.playTone(note, 0.2, "triangle", 0.05, 0.1);
      }, i * 100);
    });
  }

  // Lose effect
  async lose() {
    const notes = [392.0, 349.23, 329.63, 293.66]; // G4, F4, E4, D4
    notes.forEach((note, i) => {
      setTimeout(() => {
        this.playTone(note, 0.2, "sawtooth", 0.05, 0.1);
      }, i * 100);
    });
  }

  // Draw effect
  async draw() {
    const notes = [523.25, 493.88, 523.25]; // C5, B4, C5
    notes.forEach((note, i) => {
      setTimeout(() => {
        this.playTone(note, 0.15, "triangle", 0.05, 0.1);
      }, i * 150);
    });
  }

  // Mute all sound effects
  mute() {
    this.ensureContext();

    if (this.gain && !this.isMuted) {
      this.previousVolume = this.gain.gain.value;
      this.gain.gain.value = 0;

      // Also mute background music
      if (this.backgroundMusicGain) {
        this.backgroundMusicGain.gain.value = 0;
      }

      this.isMuted = true;
    }
    return this.isMuted;
  }

  // Unmute sound effects and restore previous volume
  unmute() {
    this.ensureContext();

    if (this.gain && this.isMuted) {
      this.gain.gain.value = this.previousVolume;

      if (this.backgroundMusicGain) {
        this.backgroundMusicGain.gain.value = 0.2;
      }

      this.isMuted = false;
    }
    return this.isMuted;
  }

  // Toggle mute state
  toggleMute() {
    this.ensureContext();

    let result;
    if (this.isMuted) {
      result = this.unmute();
    } else {
      result = this.mute();
    }
    return result;
  }

  // Check if sound is currently muted
  isSoundMuted() {
    return this.isMuted;
  }

  // Set volume (0.0 to 1.0)
  setVolume(volume: number) {
    if (this.gain) {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      this.previousVolume = clampedVolume;

      if (!this.isMuted) {
        this.gain.gain.value = clampedVolume;
      }
    }
  }

  playBackgroundMusic(path: string = "/sounds/sound1.mp3") {
    this.ensureContext();
    this.stopBackgroundMusic();

    try {
      this.backgroundMusic = new Audio(path);
      this.backgroundMusic.loop = true;

      if (this.audioContext && this.backgroundMusicGain) {
        const source = this.audioContext.createMediaElementSource(
          this.backgroundMusic
        );
        source.connect(this.backgroundMusicGain);
        this.backgroundMusicGain.gain.value = this.isMuted ? 0 : 0.2;
        this.backgroundMusic.addEventListener("play", () => {
          console.log("Background music started playing");
        });
        this.backgroundMusic.addEventListener("error", (e) => {
          console.error("Background music error:", e);
        });
      }

      const playPromise = this.backgroundMusic.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("Background music playback started successfully");
          })
          .catch((err) => {
            console.error("Error playing background music:", err);
          });
      }
    } catch (error) {
      console.error("Error setting up background music:", error);
    }
  }

  // Stop background music
  stopBackgroundMusic() {
    if (this.backgroundMusic) {
      try {
        this.backgroundMusic.pause();
        this.backgroundMusic.currentTime = 0;
        this.backgroundMusic = null;
      } catch (error) {
        console.error("Error stopping background music:", error);
      }
    }
  }
}

// Export a singleton instance
export const soundEffects = new SoundEffects();
