"use client";

import Footer from "@/components/footer";
import GameBoard from "@/components/game/game-board";
import Header from "@/components/game/game-header";
import Leaderboard from "@/components/game/leaderboard";
import MatchHistory from "@/components/game/match-history";
import { soundEffects } from "@/lib/sounds/sound-effects";
import { useEffect, useState } from "react";

export default function Play() {
  // State to track if audio prompt should be shown
  const [showStartPrompt, setShowStartPrompt] = useState(false);

  // Initialize audio when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const isMuted = localStorage.getItem("soundMuted") === "true";

        if (!isMuted) {
          const success = soundEffects.startAudio();
          setShowStartPrompt(!success);
        }
      } catch (error) {
        console.error("Error starting audio:", error);
        setShowStartPrompt(true);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Function to handle start audio click
  const handleStartAudio = () => {
    try {
      soundEffects.startAudio();
      setShowStartPrompt(false);
    } catch (error) {
      console.error("Error starting audio on click:", error);
    }
  };

  return (
    <main className="bg-zinc-950 flex flex-col overflow-hidden max-md:px-5 min-h-screen w-full max-md:max-w-full px-14 py-12 font-mono">
      <section className="bg-white border self-center rounded-3xl border-white flex-grow flex flex-col w-full">
        <Header />
        <section className="bg-white flex w-full rounded-3xl align-top flex-grow max-lg:flex-col">
          <div className="bg-zinc-950 border self-stretch min-w-60 flex-grow rounded-3xl flex flex-col">
            <GameBoard />
            <MatchHistory />
          </div>
          <Leaderboard />
        </section>
      </section>
      {showStartPrompt && (
        <div
          onClick={handleStartAudio}
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 cursor-pointer"
        >
          <div className="bg-zinc-800 p-6 rounded-xl text-white text-center max-w-md">
            <h3 className="text-xl font-bold mb-4">Start Game Audio</h3>
            <p className="mb-4">
              Click anywhere to enable game sounds and music
            </p>
            <button className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-md">
              Start Audio
            </button>
          </div>
        </div>
      )}
      <Footer />
    </main>
  );
}
