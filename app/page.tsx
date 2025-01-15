"use client";

import { GameBoard } from "@/components/game/game-board";
import { HousePanel } from "@/components/game/house-panel";
import { StatsPanel } from "@/components/game/stats-panel";
import { WalletConnect } from "@/components/wallet-connect";
import { useAccount } from 'wagmi';

const HOUSE_ADDRESS = "0x..."; // Add the house wallet address

export default function Home() {
  const { address } = useAccount();
  const isHouse = address?.toLowerCase() === HOUSE_ADDRESS.toLowerCase();

  return (
    <main className="min-h-screen py-12 px-4">
      <WalletConnect />

      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-12 neon-text">
          Crypto Rock Paper Scissors
        </h1>

        {isHouse ? (
          <div className="mb-12">
            <HousePanel />
          </div>
        ) : (
          <GameBoard />
        )}

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