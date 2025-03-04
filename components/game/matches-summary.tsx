'use client';

import { useGameUIStore } from '@/stores/game-ui-store';
import { useMatches } from '@/hooks/use-matches';

export default function MatchesSummary() {
  const { playerRank, playerSummary } = useGameUIStore();
  const { totalEarnings } = useMatches();

  const formattedEarnings =
    totalEarnings !== undefined ? (
      `${totalEarnings.toFixed(2)} MON`
    ) : (
      <div className="h-8 w-8 bg-zinc-700 rounded animate-pulse"></div>
    );

  return (
    <div className="mt-6 w-full">
      <div className="flex rounded-lg border border-solid border-zinc-700 overflow-hidden">
        <div className="flex flex-col items-center justify-center p-4 flex-1">
          <span className="text-zinc-400 text-sm font-normal mb-2">Rank</span>
          <span className="text-neutral-50 text-2xl font-medium">
            {playerRank ? (
              `#${playerRank}`
            ) : (
              <div className="h-8 w-8 bg-zinc-700 rounded animate-pulse"></div>
            )}
          </span>
        </div>

        <div className="w-px bg-zinc-700 h-auto"></div>

        <div className="flex flex-col items-center justify-center p-4 flex-1">
          <span className="text-zinc-400 text-sm font-normal mb-2">Wins</span>
          <span className="text-[#AEF342] text-2xl font-medium">
            {playerSummary?.wins != undefined ? (
              playerSummary?.wins
            ) : (
              <div className="h-8 w-8 bg-zinc-700 rounded animate-pulse"></div>
            )}
          </span>
        </div>

        <div className="w-px bg-zinc-700 h-auto"></div>

        <div className="flex flex-col items-center justify-center p-4 flex-1">
          <span className="text-zinc-400 text-sm font-normal mb-2">Draws</span>
          <span className="text-[#FD9800] text-2xl font-medium">
            {playerSummary?.draws != undefined ? (
              playerSummary?.draws
            ) : (
              <div className="h-8 w-8 bg-zinc-700 rounded animate-pulse"></div>
            )}
          </span>
        </div>

        <div className="w-px bg-zinc-700 h-auto"></div>

        <div className="flex flex-col items-center justify-center p-4 flex-1">
          <span className="text-zinc-400 text-sm font-normal mb-2">Losses</span>
          <span className="text-[#FF666B] text-2xl font-medium">
            {playerSummary?.losses != undefined ? (
              playerSummary?.losses
            ) : (
              <div className="h-8 w-8 bg-zinc-700 rounded animate-pulse"></div>
            )}
          </span>
        </div>

        <div className="w-px bg-zinc-700 h-auto"></div>

        <div className="flex flex-col items-center justify-center p-4 flex-1">
          <span className="text-zinc-400 text-sm font-normal mb-2">PnL</span>
          <span className="text-2xl font-medium">{formattedEarnings}</span>
        </div>
      </div>
    </div>
  );
}
