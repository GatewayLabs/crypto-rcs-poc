"use client";

import { useMatches } from "@/hooks/use-matches";
import { useGameUIStore } from "@/stores/game-ui-store";
import { SubgraphPlayerStats } from "@/types/game";
import { useEffect, useRef, useState } from "react";
import Tooltip from "../ui/tooltip";

export default function MatchesSummary({
  playerStats,
}: {
  playerStats: SubgraphPlayerStats;
}) {
  const { playerRank } = useGameUIStore();
  const { totalEarnings, isSyncing, matches } = useMatches();
  const [glowEffect, setGlowEffect] = useState<string>("");
  const [glowTimeout, setGlowTimeout] = useState<NodeJS.Timeout | null>(null);
  const previousPendingCountRef = useRef<number>(0);
  const previousTotalEarningsRef = useRef<number>(totalEarnings || 0);

  useEffect(() => {
    const pendingMatches = matches.filter(
      (match) => match.syncStatus === "pending"
    );
    const pendingCount = pendingMatches.length;
    const hasSyncCompleted = !isSyncing && previousPendingCountRef.current > 0;

    if (
      (previousPendingCountRef.current > pendingCount || hasSyncCompleted) &&
      totalEarnings !== undefined
    ) {
      const earningsDifference =
        totalEarnings - previousTotalEarningsRef.current;

      if (Math.abs(earningsDifference) > 0.001) {
        if (earningsDifference > 0) {
          setGlowEffect("earnings-glow-positive");
        } else if (earningsDifference < 0) {
          setGlowEffect("earnings-glow-negative");
        }

        if (glowTimeout) {
          clearTimeout(glowTimeout);
        }

        const timeout = setTimeout(() => {
          setGlowEffect("");
        }, 2000);

        setGlowTimeout(timeout);
      }
    }

    previousPendingCountRef.current = pendingCount;
    if (totalEarnings !== undefined) {
      previousTotalEarningsRef.current = totalEarnings;
    }

    return () => {
      if (glowTimeout) {
        clearTimeout(glowTimeout);
      }
    };
  }, [matches, totalEarnings, isSyncing]);

  const formattedEarnings =
    totalEarnings !== undefined ? (
      `${totalEarnings.toFixed(2)} MON`
    ) : (
      <div className="h-8 w-8 bg-zinc-700 rounded animate-pulse"></div>
    );

  const wins = playerStats?.wins ?? 0;
  const draws = playerStats?.draws ?? 0;
  const losses = playerStats?.losses ?? 0;

  return (
    <div className="mt-6 w-full">
      <div className="flex rounded-lg border border-solid border-zinc-700 ">
        <div className="flex flex-col items-center justify-center p-4 flex-1">
          <span className="text-zinc-400 text-sm font-normal mb-2">Rank</span>
          <span className="text-neutral-50 text-2xl font-medium">
            {playerStats ? (
              `#${playerRank ? playerRank : "1000+"}`
            ) : (
              <div className="h-8 w-8 bg-zinc-700 rounded animate-pulse"></div>
            )}
          </span>
        </div>

        <div className="w-px bg-zinc-700 h-auto"></div>

        <div className="flex flex-col items-center justify-center p-4 flex-1">
          <span className="text-zinc-400 text-sm font-normal mb-2">Wins</span>
          <span className="text-[#AEF342] text-2xl font-medium">
            {playerStats ? (
              wins
            ) : (
              <div className="h-8 w-8 bg-zinc-700 rounded animate-pulse"></div>
            )}
          </span>
        </div>

        <div className="w-px bg-zinc-700 h-auto"></div>

        <div className="flex flex-col items-center justify-center p-4 flex-1">
          <span className="text-zinc-400 text-sm font-normal mb-2">Draws</span>
          <span className="text-[#FD9800] text-2xl font-medium">
            {playerStats ? (
              draws
            ) : (
              <div className="h-8 w-8 bg-zinc-700 rounded animate-pulse"></div>
            )}
          </span>
        </div>

        <div className="w-px bg-zinc-700 h-auto"></div>

        <div className="flex flex-col items-center justify-center p-4 flex-1">
          <span className="text-zinc-400 text-sm font-normal mb-2">Losses</span>
          <span className="text-[#FF666B] text-2xl font-medium">
            {playerStats ? (
              losses
            ) : (
              <div className="h-8 w-8 bg-zinc-700 rounded animate-pulse"></div>
            )}
          </span>
        </div>

        <div className="w-px bg-zinc-700 h-auto"></div>

        <div className="flex flex-col items-center justify-center p-4 flex-1">
          <div className="flex items-center mb-2">
            <span className="text-zinc-400 text-sm font-normal mr-1">PnL</span>
            <Tooltip
              text="Your PnL balance may become out of date due to the
                blockchain's response time. Check the status indicator for matches waiting for blockchain confirmation."
            />
          </div>
          <span
            className={`text-2xl font-medium ${
              isSyncing && !glowEffect ? "opacity-70" : ""
            } ${glowEffect}`}
          >
            {isSyncing ? (
              <div className="flex items-center">
                {formattedEarnings}
                <span className="ml-2 inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              </div>
            ) : (
              formattedEarnings
            )}
          </span>
        </div>
      </div>

      {/* CSS for glow effects */}
      <style jsx>{`
        .earnings-glow-positive {
          animation: glowGreen 2s ease-in-out;
          text-shadow: 0 0 10px rgba(174, 243, 66, 0.7),
            0 0 20px rgba(174, 243, 66, 0.5);
          color: #aef342;
          transition: text-shadow 0.3s ease, color 0.3s ease;
        }

        .earnings-glow-negative {
          animation: glowRed 2s ease-in-out;
          text-shadow: 0 0 10px rgba(255, 102, 107, 0.7),
            0 0 20px rgba(255, 102, 107, 0.5);
          color: #ff666b;
          transition: text-shadow 0.3s ease, color 0.3s ease;
        }

        @keyframes glowGreen {
          0% {
            text-shadow: 0 0 0px rgba(174, 243, 66, 0);
            color: inherit;
          }
          10% {
            text-shadow: 0 0 15px rgba(174, 243, 66, 0.9),
              0 0 25px rgba(174, 243, 66, 0.7);
            color: #aef342;
          }
          80% {
            text-shadow: 0 0 10px rgba(174, 243, 66, 0.7),
              0 0 20px rgba(174, 243, 66, 0.5);
            color: #aef342;
          }
          100% {
            text-shadow: 0 0 0px rgba(174, 243, 66, 0);
            color: inherit;
          }
        }

        @keyframes glowRed {
          0% {
            text-shadow: 0 0 0px rgba(255, 102, 107, 0);
            color: inherit;
          }
          10% {
            text-shadow: 0 0 15px rgba(255, 102, 107, 0.9),
              0 0 25px rgba(255, 102, 107, 0.7);
            color: #ff666b;
          }
          80% {
            text-shadow: 0 0 10px rgba(255, 102, 107, 0.7),
              0 0 20px rgba(255, 102, 107, 0.5);
            color: #ff666b;
          }
          100% {
            text-shadow: 0 0 0px rgba(255, 102, 107, 0);
            color: inherit;
          }
        }
      `}</style>
    </div>
  );
}
