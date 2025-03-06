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

interface SubgraphResponse {
  data: {
    players: SubgraphPlayer[];
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
    players(orderBy: netProfitLoss, orderDirection: desc, first: 100) {
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

/**
 * Fetch leaderboard data from the subgraph
 */
export function useLeaderboard() {
  const queryClient = useQueryClient();
  const {
    data: leaderboard = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
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

        console.log(`Fetched ${players.length} players from subgraph`);
        return players;
      } catch (error) {
        console.error(
          "Error fetching leaderboard from subgraph:",
          error instanceof Error ? error.message : String(error)
        );
        return [];
      }
    },
    staleTime: 5000,
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
    betAmount: number
  ) => {
    queryClient.setQueryData(
      ["leaderboard"],
      (oldData: LeaderboardEntry[] | undefined) => {
        if (!oldData) return [];

        const newData = [...oldData];

        let playerEntry = newData.find(
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
          newData.push(playerEntry);
        } else if (playerEntry.earnings === undefined) {
          playerEntry.earnings = 0;
        }

        playerEntry.gamesPlayed += 1;
        playerEntry.earnings = playerEntry.earnings || 0;

        if (result === "WIN") {
          playerEntry.wins += 1;
          playerEntry.score += 1;
          playerEntry.earnings += betAmount;
        } else if (result === "LOSE") {
          playerEntry.losses += 1;
          playerEntry.score -= 1;
          playerEntry.earnings -= betAmount;
        } else if (result === "DRAW") {
          playerEntry.draws += 1;
        }

        newData.sort((a, b) => (b.earnings ?? 0) - (a.earnings ?? 0));

        return newData;
      }
    );
  };

  return {
    leaderboard,
    isLoading,
    updateLeaderboard,
    updateLocalLeaderboard,
  };
}
