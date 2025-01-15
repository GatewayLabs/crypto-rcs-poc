"use client";

import { useEffect } from "react";
import { usePublicClient, useWaitForTransaction } from "wagmi";
import { gameContractConfig } from "@/config/contracts";
import { playHouseMove, resolveGame } from "@/app/actions/house";

export function useHouseMoves(gameId: number | null, isActive: boolean) {
  const publicClient = usePublicClient();

  // Watch for game creation events
  useEffect(() => {
    if (!isActive || !gameId) return;

    const unwatch = publicClient.watchContractEvent({
      ...gameContractConfig,
      eventName: "GameCreated",
      onLogs: async (logs) => {
        // Check if this is our game
        const eventGameId = logs[0]?.args?.gameId;
        if (eventGameId && Number(eventGameId) === gameId) {
          // Automatically play house move
          const result = await playHouseMove(gameId);
          if (!result.success) {
            console.error("House move failed:", result.error);
          }
        }
      },
    });

    return () => {
      unwatch();
    };
  }, [gameId, isActive, publicClient]);

  // Watch for both moves being submitted
  useEffect(() => {
    if (!isActive || !gameId) return;

    const unwatch = publicClient.watchContractEvent({
      ...gameContractConfig,
      eventName: "MovesSubmitted",
      onLogs: async (logs) => {
        // Check if this is our game
        const eventGameId = logs[0]?.args?.gameId;
        if (eventGameId && Number(eventGameId) === gameId) {
          // Get game info to verify both moves are committed
          const gameInfo = await publicClient.readContract({
            ...gameContractConfig,
            functionName: "getGameInfo",
            args: [BigInt(gameId)],
          });

          if (gameInfo.bothCommitted) {
            // Resolve the game
            const result = await resolveGame(gameId);
            if (!result.success) {
              console.error("Game resolution failed:", result.error);
            }
          }
        }
      },
    });

    return () => {
      unwatch();
    };
  }, [gameId, isActive, publicClient]);
}
