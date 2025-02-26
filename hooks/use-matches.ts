import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { GameHistory, GameResult } from "@/types/game";
import { Move } from "@/lib/crypto";
import { useEffect } from "react";
import { useGameUIStore } from "@/stores/game-ui-store";

export function useMatches() {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const gameUIState = useGameUIStore();

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ["matches", address],
    queryFn: async () => {
      return [] as GameHistory[];
    },
    enabled: !!address,
  });

  const addMatchMutation = useMutation({
    mutationFn: async ({
      playerMove,
      houseMove,
      result,
      gameId,
      transactionHash,
    }: {
      playerMove: Move;
      houseMove: Move;
      result: GameResult;
      gameId: number | null;
      transactionHash?: string;
    }) => {
      if (!address) throw new Error("User address is required");

      const newMatch: GameHistory = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        playerMove,
        houseMove,
        result,
        playerAddress: address,
        gameId,
        transactionHash,
      };

      return [newMatch, ...matches];
    },
    onSuccess: (updatedMatches) => {
      if (address) {
        queryClient.setQueryData(["matches", address], updatedMatches);
      }
    },
  });

  useEffect(() => {
    if (
      gameUIState.phase === "FINISHED" &&
      gameUIState.result &&
      gameUIState.playerMove &&
      gameUIState.houseMove &&
      address
    ) {
      const existingMatch = matches.find(
        (match) => match.gameId === gameUIState.gameId
      );

      if (!existingMatch) {
        addMatchMutation.mutate({
          playerMove: gameUIState.playerMove,
          houseMove: gameUIState.houseMove,
          result: gameUIState.result,
          gameId: gameUIState.gameId,
          transactionHash: gameUIState.transactionHash || undefined,
        });
      }
    }
  }, [
    gameUIState.phase,
    gameUIState.result,
    gameUIState.playerMove,
    gameUIState.houseMove,
    gameUIState.gameId,
    gameUIState.transactionHash,
    matches,
    addMatchMutation,
    address,
  ]);

  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      return [] as GameHistory[];
    },
    onSuccess: () => {
      if (address) {
        queryClient.setQueryData(["matches", address], []);
      }
    },
  });

  return {
    matches,
    isLoading,
    addMatch: (data: {
      playerMove: Move;
      houseMove: Move;
      result: GameResult;
      gameId: number | null;
      transactionHash?: string;
    }) => addMatchMutation.mutate(data),
    clearHistory: () => clearHistoryMutation.mutate(),
  };
}
