import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { GameHistory, GameResult } from "@/types/game";
import { Move } from "@/lib/crypto";

export function useMatches() {
  const { address } = useAccount();
  const queryClient = useQueryClient();

  // Fetch user's match history
  const { data: matches = [], isLoading } = useQuery({
    queryKey: ["matches", address],
    queryFn: async () => {
      return [] as GameHistory[];
    },
    enabled: !!address,
  });

  // Add a new match to history
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
        id: Math.random().toString(36).substr(2, 9), // Generate a random ID
        timestamp: Date.now(),
        playerMove,
        houseMove,
        result,
        playerAddress: address,
        gameId,
        transactionHash,
      };

      const currentMatches = [
        ...(queryClient.getQueryData<GameHistory[]>(["matches", address]) ||
          []),
      ];

      // Add new match to the beginning of the array
      return [newMatch, ...currentMatches].slice(0, 10); // Keep only 10 most recent
    },
    onSuccess: (updatedMatches) => {
      if (address) {
        queryClient.setQueryData(["matches", address], updatedMatches);
      }
    },
  });

  // Clear match history
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
