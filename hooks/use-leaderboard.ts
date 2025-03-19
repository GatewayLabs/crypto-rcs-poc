/* eslint-disable @typescript-eslint/no-explicit-any */
import { catchUsingCache, logDebug, tryUseCache } from "@/lib/utils";
import { LeaderboardEntry } from "@/types/game";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatEther } from "viem";

// Subgraph URL
const SUBGRAPH_URL = process.env.NEXT_PUBLIC_SUBGRAPH_URL as string;

// Define types for the subgraph response
interface SubgraphPlayer {
  id: string;
  address: string;
  totalGamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  netProfitLoss: string;
  totalReturned: string;
  createdAt: string;
  updatedAt: string;
}

interface GlobalStats {
  totalPlayers: number;
  totalGamesV1: number;
  totalGamesV2: number;
  totalGamesCreated: number;
  totalGamesFinished: number;
}

interface Leaderboard {
  players: LeaderboardEntry[];
  globalStats: GlobalStats;
  lastSyncTime: number;
}

interface SubgraphResponse {
  data: {
    players: SubgraphPlayer[];
    globalStats: GlobalStats[];
  };
  errors?: Array<{
    message: string;
    locations: Array<{ line: number; column: number }>;
    path: string[];
  }>;
}

// GraphQL query for players data
const PLAYERS_QUERY = `
  query GetPlayers {
    globalStats {
      totalPlayers
      totalGamesV1
      totalGamesV2
      totalGamesCreated
      totalGamesFinished
    }
    players(orderBy: netProfitLoss, orderDirection: desc, first: 1000, where:{id_not_in: ["0xcef4f72bb733654f0ef86a1612c82210891b0559", "0x824e6216b9c7ada91f5621ac8d81c4cad99add73", "0x8970987295cf3f2be1ea71141ca3680df9d91a2a", "${process.env.NEXT_PUBLIC_HOUSE_BATCHER_ADDRESS}"]}) {
      id
      address
      totalGamesPlayed
      wins
      losses
      draws
      netProfitLoss
      totalReturned
      createdAt
      updatedAt
    }
  }
`;

const emptyGlobalStats = {
  totalPlayers: 0,
  totalGamesV1: 0,
  totalGamesV2: 0,
  totalGamesCreated: 0,
  totalGamesFinished: 0,
};

const emptyLeaderboard = {
  players: [],
  globalStats: emptyGlobalStats,
  lastSyncTime: 0,
};

/**
 * Fetch leaderboard data from the subgraph
 */
export function useLeaderboard(address: string) {
  const queryClient = useQueryClient();
  const {
    data: leaderboard = emptyLeaderboard,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async (): Promise<Leaderboard> => {
      const now = Date.now();
      const cachedData = queryClient.getQueryData([
        "leaderboard",
      ]) as Leaderboard;

      if (tryUseCache(cachedData, now, address, "cache leaderboard")) {
        return cachedData;
      }

      try {
        // Fetch data from the subgraph
        const response = await fetch(SUBGRAPH_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: PLAYERS_QUERY,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = (await response.json()) as SubgraphResponse;

        if (data.errors) {
          console.error("GraphQL errors:", data.errors);
          throw new Error("GraphQL query failed");
        }

        // Transform the data to match our LeaderboardEntry structure
        const players: LeaderboardEntry[] = data.data.players.map((player) => {
          // Calculate earnings from netProfitLoss
          const earnings = Number(formatEther(BigInt(player.netProfitLoss)));

          // Calculate score (wins - losses)
          const score = player.wins - player.losses;

          return {
            address: player.id,
            gamesPlayed: player.totalGamesPlayed,
            wins: player.wins,
            losses: player.losses,
            draws: player.draws,
            score: score,
            earnings: earnings,
          };
        });

        const globalStats = data.data.globalStats[0];

        return {
          players,
          globalStats: {
            totalPlayers: globalStats.totalPlayers,
            totalGamesV1: globalStats.totalGamesV1,
            totalGamesV2: globalStats.totalGamesV2,
            totalGamesCreated: globalStats.totalGamesCreated,
            totalGamesFinished: globalStats.totalGamesFinished,
          },
          lastSyncTime: now,
        };
      } catch (error) {
        console.error(
          "Error fetching leaderboard from subgraph:",
          error instanceof Error ? error.message : String(error)
        );
        if (catchUsingCache(address, cachedData, now, "cache leaderboard")) {
          return cachedData;
        }
        return emptyLeaderboard;
      }
    },
    enabled: !!address,
    staleTime: 5000,
    retry: (failureCount, error: any) => {
      if (error?.message?.includes("too many requests")) {
        logDebug("leaderboard", "Rate limit detected, stopping retry");
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchInterval: 120000,
  });

  const updateLeaderboard = async () => {
    try {
      await refetch();
    } catch (error) {
      console.error(
        "Error refetching leaderboard:",
        error instanceof Error ? error.message : String(error)
      );
    }
  };

  const updateLocalLeaderboard = (
    address: string,
    result: "WIN" | "LOSE" | "DRAW",
    betAmount: number,
    gameId: number
  ) => {
    queryClient.setQueryData(
      ["leaderboard"],
      (oldData: Leaderboard | undefined) => {
        if (!oldData) {
          const newEntry = {
            players: [
              {
                address,
                gamesPlayed: 1,
                wins: result === "WIN" ? 1 : 0,
                losses: result === "LOSE" ? 1 : 0,
                draws: result === "DRAW" ? 1 : 0,
                score: result === "WIN" ? 1 : result === "LOSE" ? -1 : 0,
                earnings:
                  result === "WIN"
                    ? betAmount
                    : result === "LOSE"
                    ? -betAmount
                    : 0,
                lastGameId: gameId,
              },
            ],
            globalStats: emptyGlobalStats,
            lastSyncTime: 0,
          };
          return newEntry;
        }

        const playersData = oldData.players.slice();

        let playerEntry = playersData.find(
          (entry) => entry.address.toLowerCase() === address.toLowerCase()
        );

        if (!playerEntry) {
          playerEntry = {
            address,
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            score: 0,
            earnings: 0,
          };
          playersData.push(playerEntry);
        }

        if (playerEntry.lastGameId === gameId) {
          return playersData;
        }

        if (playerEntry.earnings === undefined) {
          playerEntry.earnings = 0;
        }

        playerEntry.gamesPlayed += 1;
        playerEntry.lastGameId = gameId;

        if (result === "WIN") {
          playerEntry.wins += 1;
          playerEntry.score += 1;
          playerEntry.earnings += betAmount;
        } else if (result === "LOSE") {
          playerEntry.losses += 1;
          playerEntry.score -= 1;
          playerEntry.earnings += betAmount;
        } else if (result === "DRAW") {
          playerEntry.draws += 1;
        }

        playersData.sort((a, b) => (b.earnings ?? 0) - (a.earnings ?? 0));

        return {
          players: playersData,
          globalStats: oldData.globalStats,
        };
      }
    );

    queryClient.invalidateQueries({
      queryKey: ["leaderboard"],
      exact: true,
      refetchType: "none",
    });
  };

  return {
    leaderboard,
    isLoading,
    updateLeaderboard,
    updateLocalLeaderboard,
  };
}
