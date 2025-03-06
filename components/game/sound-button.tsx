import { soundEffects } from "@/lib/sounds/sound-effects";
import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";

export default function SoundButton() {
  const [isMuted, setIsMuted] = useState(false);

  // Initialize the mute state and ensure AudioContext is ready
  useEffect(() => {
    // Force initialization of the audio context
    soundEffects.toggleMute(); // This ensures audio context is initialized
    soundEffects.toggleMute(); // This puts it back to original state

    try {
      const savedMuteState = localStorage.getItem("soundMuted");
      if (savedMuteState !== null) {
        const shouldBeMuted = savedMuteState === "true";

        if (shouldBeMuted) {
          soundEffects.mute();
        } else {
          soundEffects.unmute();
        }

        setIsMuted(shouldBeMuted);
      } else {
        setIsMuted(soundEffects.isSoundMuted());
      }
    } catch (e) {
      console.error("Failed to load sound mute state from local storage", e);
      setIsMuted(soundEffects.isSoundMuted());
    }
  }, []);

  useEffect(() => {
    if (isMuted) {
      soundEffects.mute();
    } else {
      soundEffects.unmute();
    }
  }, [isMuted]);

  const toggleSound = () => {
    const wasMuted = isMuted;
    const newMutedState = soundEffects.toggleMute();
    setIsMuted(newMutedState);

    try {
      localStorage.setItem("soundMuted", newMutedState.toString());
    } catch (e) {
      console.error("Failed to save sound mute state to local storage", e);
    }

    if (wasMuted && !newMutedState) {
      setTimeout(() => {
        soundEffects.select();
      }, 50);
    }
  };

  return (
    <button
      type="button"
      className="bg-zinc-800 border-zinc-800 border self-stretch flex items-center overflow-hidden justify-center my-auto opacity-80 px-3 py-1.5 rounded-md border-solid transition-all duration-300 group-hover:opacity-50 hover:!opacity-100 text-white text-sm font-medium hover:bg-zinc-700"
      aria-label={isMuted ? "Unmute sound" : "Mute sound"}
      onClick={toggleSound}
    >
      {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
    </button>
  );
}
