"use client";

import { useWatchContractEvent } from "wagmi";
import { gameContractConfig } from "@/config/contracts";
import { playHouseMove, resolveGame } from "@/app/actions/house";
import { GamePhase } from "@/types/game";

export function useHouseMoves(gameId: number | null, phase: GamePhase) {
  useWatchContractEvent({
    ...gameContractConfig,
    eventName: "GameCreated",
    onLogs: async (logs) => {
      alert("Game created");

      for (const log of logs) {
        const eventGameId = Number(log.args.gameId);
        if (eventGameId === gameId && phase === GamePhase.SELECTED) {
          try {
            const result = await playHouseMove(gameId);
            if (!result.success) {
              console.error("House move failed:", result.error);
            }
          } catch (error) {
            console.error("Error playing house move:", error);
          }
        }
      }
    },
  });

  useWatchContractEvent({
    ...gameContractConfig,
    eventName: "GameJoined",
    onLogs: async (logs) => {
      for (const log of logs) {
        const eventGameId = Number(log.args.gameId);
        if (eventGameId === gameId && phase === GamePhase.WAITING) {
          try {
            const result = await resolveGame(gameId);
            if (!result.success) {
              console.error("Game resolution failed:", result.error);
            }
          } catch (error) {
            console.error("Error resolving game:", error);
          }
        }
      }
    },
  });

  useWatchContractEvent({
    ...gameContractConfig,
    eventName: "GameResolved",
    onLogs: (logs) => {
      for (const log of logs) {
        const eventGameId = Number(log.args.gameId);
        if (eventGameId === gameId) {
          console.log("Game resolved:", {
            winner: log.args.winner,
            diffMod3: Number(log.args.diffMod3),
          });
        }
      }
    },
  });
}
