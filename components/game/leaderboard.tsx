"use client";

import { useGame } from '@/context/game-context';
import { motion } from 'framer-motion';
import { Medal } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Leaderboard() {
  const { leaderboard } = useGame();

  const sortedLeaderboard = [...leaderboard].sort((a, b) => b.score - a.score);

  if (leaderboard.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400">
        No players yet
      </div>
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto">
      <table className="w-full">
        <thead className="sticky top-0 bg-black bg-opacity-90">
          <tr className="text-left">
            <th className="p-2 text-blue-400">Rank</th>
            <th className="p-2 text-blue-400">Player</th>
            <th className="p-2 text-blue-400">Score</th>
            <th className="p-2 text-blue-400">W/L/D</th>
          </tr>
        </thead>
        <tbody>
          {sortedLeaderboard.map((entry, index) => (
            <motion.tr
              key={entry.address}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="border-b border-gray-800"
            >
              <td className="p-2">
                {index < 3 ? (
                  <Medal className={cn(
                    "w-6 h-6",
                    index === 0 && "text-yellow-500",
                    index === 1 && "text-gray-400",
                    index === 2 && "text-amber-600"
                  )} />
                ) : (
                  <span className="text-gray-500">{index + 1}</span>
                )}
              </td>
              <td className="p-2 font-mono text-gray-300">
                {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
              </td>
              <td className={cn(
                "p-2 font-bold",
                entry.score > 0 && "text-green-500",
                entry.score < 0 && "text-red-500",
                entry.score === 0 && "text-gray-500"
              )}>
                {entry.score > 0 && '+'}
                {entry.score}
              </td>
              <td className="p-2 text-gray-400">
                <span className="text-green-500">{entry.wins}</span>
                {" / "}
                <span className="text-red-500">{entry.losses}</span>
                {" / "}
                <span className="text-yellow-500">{entry.draws}</span>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}