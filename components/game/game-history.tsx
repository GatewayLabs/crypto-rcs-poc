"use client";

import { useGame } from "@/context/game-context";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

export function GameHistory() {
  const { history } = useGame();

  if (history.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400">No games played yet</div>
    );
  }

  const getExplorerUrl = (txHash: string) => {
    return `https://gateway-shield-testnet.explorer.caldera.xyz/tx/${txHash}`;
  };

  return (
    <div className="max-h-96 overflow-y-auto">
      <table className="w-full">
        <thead className="sticky top-0 bg-black bg-opacity-90">
          <tr className="text-left">
            <th className="p-2 text-blue-400">Time</th>
            <th className="p-2 text-blue-400">Player Move</th>
            <th className="p-2 text-blue-400">House Move</th>
            <th className="p-2 text-blue-400">Result</th>
            <th className="p-2 text-blue-400">TX</th>
          </tr>
        </thead>
        <tbody>
          {history.map((game) => (
            <motion.tr
              key={game.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-b border-gray-800"
            >
              <td className="p-2 text-gray-300">
                {new Date(game.timestamp).toLocaleTimeString()}
              </td>
              <td className="p-2 text-2xl">
                {game.playerMove === "ROCK" && "🪨"}
                {game.playerMove === "PAPER" && "📜"}
                {game.playerMove === "SCISSORS" && "✂️"}
              </td>
              <td className="p-2 text-2xl">
                {game.houseMove === "ROCK" && "🪨"}
                {game.houseMove === "PAPER" && "📜"}
                {game.houseMove === "SCISSORS" && "✂️"}
              </td>
              <td
                className={cn(
                  "p-2 font-semibold",
                  game.result === "WIN" && "text-green-500",
                  game.result === "LOSE" && "text-red-500",
                  game.result === "DRAW" && "text-yellow-500"
                )}
              >
                {game.result}
              </td>
              <td className="p-2">
                {game.transactionHash && (
                  <a
                    href={getExplorerUrl(game.transactionHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <ExternalLink size={16} />
                  </a>
                )}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
