import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LeaderboardEntry, GameResult } from "@/types/game";
import { useEffect } from "react";
import { useGameUIStore } from "@/stores/game-ui-store";
import { useAccount } from "wagmi";

export function useLeaderboard() {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const gameUIState = useGameUIStore();

  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      return [] as LeaderboardEntry[];
    },
  });

  const updateLeaderboardMutation = useMutation({
    mutationFn: async ({
      address,
      result,
    }: {
      address: string;
      result: GameResult;
    }) => {
      const currentLeaderboard = [
        ...(queryClient.getQueryData<LeaderboardEntry[]>(["leaderboard"]) ||
          []),
      ];

      return updateLeaderboard(currentLeaderboard, result, address);
    },
    onSuccess: (updatedLeaderboard) => {
      queryClient.setQueryData(["leaderboard"], updatedLeaderboard);
    },
  });

  useEffect(() => {
    if (
      gameUIState.phase === "FINISHED" &&
      gameUIState.result &&
      gameUIState.playerMove
    ) {
      if (address) {
        updateLeaderboardMutation.mutate({
          address: address,
          result: gameUIState.result,
        });
      }
    }
  }, [
    gameUIState.phase,
    gameUIState.result,
    gameUIState.playerMove,
    updateLeaderboardMutation,
    address,
  ]);

  function updateLeaderboard(
    leaderboard: LeaderboardEntry[],
    result: GameResult,
    address: string
  ): LeaderboardEntry[] {
    const existingEntry = leaderboard.find(
      (entry) => entry.address === address
    );

    if (existingEntry) {
      return leaderboard.map((entry) => {
        if (entry.address === address) {
          return {
            ...entry,
            gamesPlayed: entry.gamesPlayed + 1,
            wins: entry.wins + (result === "WIN" ? 1 : 0),
            losses: entry.losses + (result === "LOSE" ? 1 : 0),
            draws: entry.draws + (result === "DRAW" ? 1 : 0),
            score:
              entry.score + (result === "WIN" ? 1 : result === "LOSE" ? -1 : 0),
          };
        }
        return entry;
      });
    }

    return [
      ...leaderboard,
      {
        address,
        gamesPlayed: 1,
        wins: result === "WIN" ? 1 : 0,
        losses: result === "LOSE" ? 1 : 0,
        draws: result === "DRAW" ? 1 : 0,
        score: result === "WIN" ? 1 : result === "LOSE" ? -1 : 0,
      },
    ];
  }

  return {
    leaderboard,
    isLoading,
    updateLeaderboard: (address: string, result: GameResult) =>
      updateLeaderboardMutation.mutate({ address, result }),
  };
}
