import { useQuery } from '@tanstack/react-query';
import { LeaderboardEntry } from '@/types/game';
import { formatEther } from 'viem';

// Subgraph URL
const SUBGRAPH_URL =
  'https://api.studio.thegraph.com/query/105896/odyssey-rps/version/latest';

// Define types for the subgraph response
interface SubgraphPlayer {
  id: string;
  address: string;
  totalGamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  totalBetAmount: string;
  totalWonAmount: string;
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
    players(orderBy: totalWonAmount, orderDirection: desc, first: 100) {
      id
      address
      totalGamesPlayed
      wins
      losses
      draws
      totalBetAmount
      totalWonAmount
    }
  }
`;

/**
 * Fetch leaderboard data from the subgraph
 */
export function useLeaderboard() {
  const {
    data: leaderboard = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      try {
        // Fetch data from the subgraph
        const response = await fetch(SUBGRAPH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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
          console.error('GraphQL errors:', data.errors);
          throw new Error('GraphQL query failed');
        }

        // Transform the data to match our LeaderboardEntry structure
        const players: LeaderboardEntry[] = data.data.players.map((player) => {
          // Calculate earnings (totalWonAmount - totalBetAmount)
          const totalBetAmountEth = Number(
            formatEther(BigInt(player.totalBetAmount)),
          );
          const totalWonAmountEth = Number(
            formatEther(BigInt(player.totalWonAmount)),
          );
          const earnings = totalWonAmountEth - totalBetAmountEth;

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
          'Error fetching leaderboard from subgraph:',
          error instanceof Error ? error.message : String(error),
        );
        return [];
      }
    },
    refetchInterval: 60000,
    staleTime: 5000,
  });

  const updateLeaderboard = async () => {
    try {
      await refetch();
    } catch (error) {
      console.error(
        'Error refetching leaderboard:',
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  return {
    leaderboard,
    isLoading,
    updateLeaderboard,
  };
}
