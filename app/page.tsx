"use client";

import { GameBoard } from "@/components/game/game-board";
import { StatsPanel } from "@/components/game/stats-panel";
import { WalletConnect } from "@/components/wallet-connect";

export default function Home() {
  return (
    <main className="min-h-screen py-12 px-4">
      <WalletConnect />

      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-12 neon-text">
          Crypto Rock Paper Scissors
        </h1>

        <GameBoard />
        <StatsPanel />

        <footer className="mt-12 text-center text-sm text-gray-400">
          <p>
            Powered by Gateway Protocol - the first chain to enable shared
            private state
          </p>
        </footer>
      </div>
    </main>
  );
}
