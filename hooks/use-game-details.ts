import { useQuery } from '@tanstack/react-query';
import { formatEther } from 'viem';
import { GameState } from './use-player-games';

// Subgraph URL
const SUBGRAPH_URL =
  'https://subgraph.satsuma-prod.com/gateway-dao/odyssey-rps-graph/version/0.1.0/api';

// Game data structure
export interface GameDetails {
  id: string;
  gameId: string;
  playerA: string;
  playerB: string | null;
  betAmount: number;
  encryptedChoiceA: string | null;
  encryptedChoiceB: string | null;
  differenceCiphertext: string | null;
  revealedDifference: number | null;
  winner: string | null;
  state: GameState;
  isFinished: boolean;
  createdAt: Date;
  joinedAt: Date | null;
  resolvedAt: Date | null;
  cancelledAt: Date | null;
  transactionHash: string;
}

// GraphQL query for game details
const GAME_DETAILS_QUERY = `
  query GetGameDetails($gameId: ID!) {
    game(id: $gameId) {
      id
      gameId
      playerA {
        id
      }
      playerB {
        id
      }
      betAmount
      encryptedChoiceA
      encryptedChoiceB
      differenceCiphertext
      revealedDifference
      winner
      state
      isFinished
      createdAt
      joinedAt
      resolvedAt
      cancelledAt
      transactionHash
    }
  }
`;

interface SubgraphGameResponse {
  data: {
    game: {
      id: string;
      gameId: string;
      playerA: {
        id: string;
      };
      playerB: {
        id: string;
      } | null;
      betAmount: string;
      encryptedChoiceA: string | null;
      encryptedChoiceB: string | null;
      differenceCiphertext: string | null;
      revealedDifference: number | null;
      winner: string | null;
      state: string;
      isFinished: boolean;
      createdAt: string;
      joinedAt: string | null;
      resolvedAt: string | null;
      cancelledAt: string | null;
      transactionHash: string;
    } | null;
  };
  errors?: Array<{
    message: string;
    locations: Array<{ line: number; column: number }>;
    path: string[];
  }>;
}

/**
 * Hook to fetch details for a specific game from the subgraph
 * @param gameId Game ID to fetch (can be either the numeric ID or the full ID from the subgraph)
 */
export function useGameDetails(gameId: string | number | undefined) {
  const {
    data: gameDetails,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['gameDetails', gameId],
    queryFn: async (): Promise<GameDetails | null> => {
      if (!gameId) return null;

      try {
        // Handle different gameId formats
        // If it's a number, we need to convert it to a string ID format
        let queryId = typeof gameId === 'number' ? gameId.toString() : gameId;

        // If it doesn't already have the format of a subgraph ID (which typically starts with "0x"),
        // we assume it's just the numeric part and prefix it appropriately
        if (!queryId.startsWith('0x') && !isNaN(Number(queryId))) {
          console.log(`Converting numeric ID ${queryId} to subgraph ID format`);
          queryId = queryId; // In this case, the ID in the subgraph is just the number
          // Note: If the subgraph uses a different format, you may need to adjust this
        }

        console.log(`Fetching details for game ${queryId} from subgraph...`);

        // Fetch data from the subgraph
        const response = await fetch(SUBGRAPH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: GAME_DETAILS_QUERY,
            variables: {
              gameId: queryId,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = (await response.json()) as SubgraphGameResponse;
        console.log('Subgraph response:', data);

        if (data.errors) {
          console.error('GraphQL errors:', data.errors);
          throw new Error('GraphQL query failed');
        }

        // Check if game was found
        if (!data.data.game) {
          console.log(`Game with ID ${queryId} not found`);
          return null;
        }

        const game = data.data.game;

        // Process timestamps
        const createdAt = new Date(parseInt(game.createdAt) * 1000);
        const joinedAt = game.joinedAt
          ? new Date(parseInt(game.joinedAt) * 1000)
          : null;
        const resolvedAt = game.resolvedAt
          ? new Date(parseInt(game.resolvedAt) * 1000)
          : null;
        const cancelledAt = game.cancelledAt
          ? new Date(parseInt(game.cancelledAt) * 1000)
          : null;

        // Convert bet amount to ETH
        const betAmount = Number(formatEther(BigInt(game.betAmount)));

        return {
          id: game.id,
          gameId: game.gameId,
          playerA: game.playerA.id,
          playerB: game.playerB?.id || null,
          betAmount,
          encryptedChoiceA: game.encryptedChoiceA,
          encryptedChoiceB: game.encryptedChoiceB,
          differenceCiphertext: game.differenceCiphertext,
          revealedDifference: game.revealedDifference,
          winner: game.winner,
          state: game.state as GameState,
          isFinished: game.isFinished,
          createdAt,
          joinedAt,
          resolvedAt,
          cancelledAt,
          transactionHash: game.transactionHash,
        };
      } catch (error) {
        console.error(
          'Error fetching game details from subgraph:',
          error instanceof Error ? error.message : String(error),
        );
        return null;
      }
    },
    enabled: !!gameId,
    refetchInterval: 10000, // Refetch every 10 seconds (useful for active games)
    staleTime: 5000,
  });

  const refreshGameDetails = async () => {
    try {
      await refetch();
    } catch (error) {
      console.error(
        'Error refreshing game details:',
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  return {
    gameDetails,
    isLoading,
    refreshGameDetails,
  };
}
