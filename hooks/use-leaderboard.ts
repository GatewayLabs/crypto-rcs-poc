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

/**
 * Fetches data from the subgraph with pagination support
 */
const fetchGraphQL = async <T>(query: string, skip = 0): Promise<T> => {
  const response = await fetch(SUBGRAPH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      variables: { skip },
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const result = await response.json();

  if (result.errors) {
    console.error("GraphQL errors:", result.errors);
    throw new Error("GraphQL query failed");
  }

  return result.data as T;
};

/**
 * Fetches all players by paginating through the subgraph data
 */
async function getAllPlayers(): Promise<{
  totalCount: number;
  players: SubgraphPlayer[];
}> {
  const PAGE_SIZE = 1000;
  const PLAYERS_PAGINATED_QUERY = `
    query GetPlayers($skip: Int!) {
      players(
        orderBy: netProfitLoss, 
        orderDirection: desc, 
        first: ${PAGE_SIZE}, 
        skip: $skip,
        where: {id_not: "0xcef4f72bb733654f0ef86a1612c82210891b0559"}
      ) {
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

  let allPlayers: SubgraphPlayer[] = [];
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const response = await fetchGraphQL<{ players: SubgraphPlayer[] }>(
      PLAYERS_PAGINATED_QUERY,
      skip
    );

    const players = response.players;

    allPlayers = [...allPlayers, ...players];
    hasMore = players.length === PAGE_SIZE;
    skip += PAGE_SIZE;
  }

  return {
    totalCount: allPlayers.length,
    players: allPlayers,
  };
}

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
        const response = await getAllPlayers();

        // Transform the data to match our LeaderboardEntry structure
        const players: LeaderboardEntry[] = response.players.map((player) => {
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
    staleTime: 2000,
    refetchInterval: 60000,
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
      (oldData: LeaderboardEntry[] | undefined) => {
        if (!oldData) {
          const newEntry = {
            address,
            gamesPlayed: 1,
            wins: result === "WIN" ? 1 : 0,
            losses: result === "LOSE" ? 1 : 0,
            draws: result === "DRAW" ? 1 : 0,
            score: result === "WIN" ? 1 : result === "LOSE" ? -1 : 0,
            earnings:
              result === "WIN" ? betAmount : result === "LOSE" ? -betAmount : 0,
            lastGameId: gameId,
          };
          return [newEntry];
        }

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
        }

        if (playerEntry.lastGameId === gameId) {
          return newData;
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

        newData.sort((a, b) => (b.earnings ?? 0) - (a.earnings ?? 0));

        return newData;
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
