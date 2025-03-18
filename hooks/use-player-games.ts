import { useQuery } from "@tanstack/react-query";
import { formatEther } from "viem";

// Subgraph URL
const SUBGRAPH_URL =
  "https://subgraph.satsuma-prod.com/bd8dae892d7c/gateway-dao/odyssey-rps-graph/version/0.1.0/api";

// Game state enum to match the subgraph
export enum GameState {
  CREATED = "CREATED",
  JOINED = "JOINED",
  MOVES_SUBMITTED = "MOVES_SUBMITTED",
  DIFFERENCE_COMPUTED = "DIFFERENCE_COMPUTED",
  RESOLVED = "RESOLVED",
  CANCELLED = "CANCELLED",
}

// Game data structure
export interface SubgraphGame {
  id: string;
  gameId: string;
  playerA: {
    id: string;
  };
  playerB: {
    id: string;
  } | null;
  betAmount: string;
  winner: string | null;
  state: GameState;
  isFinished: boolean;
  createdAt: string;
  joinedAt: string | null;
  resolvedAt: string | null;
  cancelledAt: string | null;
  transactionHash: string;
}

export interface PlayerGame {
  id: string;
  gameId: string;
  opponent: string | null;
  betAmount: number;
  winner: string | null;
  state: GameState;
  isFinished: boolean;
  createdAt: Date;
  joinedAt: Date | null;
  resolvedAt: Date | null;
  cancelledAt: Date | null;
  transactionHash: string;
  isPlayerA: boolean;
  result: "win" | "loss" | "draw" | "pending";
}

// GraphQL query for player's games
const PLAYER_GAMES_QUERY = `
  query GetPlayerGames($playerId: String!) {
    playerA: games(where: { playerA: $playerId }, orderBy: createdAt, orderDirection: desc) {
      id
      gameId
      playerA {
        id
      }
      playerB {
        id
      }
      betAmount
      winner
      state
      isFinished
      createdAt
      joinedAt
      resolvedAt
      cancelledAt
      transactionHash
    }
    playerB: games(where: { playerB: $playerId }, orderBy: createdAt, orderDirection: desc) {
      id
      gameId
      playerA {
        id
      }
      playerB {
        id
      }
      betAmount
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

interface SubgraphGamesResponse {
  data: {
    playerA: SubgraphGame[];
    playerB: SubgraphGame[];
  };
  errors?: Array<{
    message: string;
    locations: Array<{ line: number; column: number }>;
    path: string[];
  }>;
}

/**
 * Hook to fetch a player's games from the subgraph
 * @param address Player's Ethereum address
 */
export function usePlayerGames(address: string | undefined) {
  const {
    data: games = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["playerGames", address],
    queryFn: async (): Promise<PlayerGame[]> => {
      if (!address) return [];

      try {
        console.log(`Fetching games for player ${address} from subgraph...`);

        // Normalize the address to lowercase
        const normalizedAddress = address.toLowerCase();

        // Fetch data from the subgraph
        const response = await fetch(SUBGRAPH_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: PLAYER_GAMES_QUERY,
            variables: {
              playerId: normalizedAddress,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = (await response.json()) as SubgraphGamesResponse;
        console.log("Subgraph response:", data);

        if (data.errors) {
          console.error("GraphQL errors:", data.errors);
          throw new Error("GraphQL query failed");
        }

        // Process games where player is playerA
        const gamesAsPlayerA = data.data.playerA.map((game) =>
          processGame(game, true, normalizedAddress)
        );

        // Process games where player is playerB
        const gamesAsPlayerB = data.data.playerB.map((game) =>
          processGame(game, false, normalizedAddress)
        );

        // Combine and sort by createdAt (newest first)
        const allGames = [...gamesAsPlayerA, ...gamesAsPlayerB].sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        );

        console.log(`Fetched ${allGames.length} games for player ${address}`);
        return allGames;
      } catch (error) {
        console.error(
          "Error fetching player games from subgraph:",
          error instanceof Error ? error.message : String(error)
        );
        return [];
      }
    },
    enabled: !!address,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 2000,
  });

  // Helper function to process game data and determine the result
  function processGame(
    game: SubgraphGame,
    isPlayerA: boolean,
    playerAddress: string
  ): PlayerGame {
    // Convert timestamps to Date objects
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

    // Determine opponent
    const opponent = isPlayerA
      ? game.playerB
        ? game.playerB.id
        : null
      : game.playerA.id;

    // Determine game result for this player
    let result: "win" | "loss" | "draw" | "pending" = "pending";

    if (game.state === GameState.RESOLVED) {
      if (game.winner === null) {
        result = "draw";
      } else if (game.winner.toLowerCase() === playerAddress) {
        result = "win";
      } else {
        result = "loss";
      }
    } else if (game.state === GameState.CANCELLED) {
      result = "pending"; // Consider cancelled games as pending for UI purposes
    }

    return {
      id: game.id,
      gameId: game.gameId,
      opponent,
      betAmount,
      winner: game.winner,
      state: game.state,
      isFinished: game.isFinished,
      createdAt,
      joinedAt,
      resolvedAt,
      cancelledAt,
      transactionHash: game.transactionHash,
      isPlayerA,
      result,
    };
  }

  const refreshGames = async () => {
    try {
      await refetch();
    } catch (error) {
      console.error(
        "Error refreshing player games:",
        error instanceof Error ? error.message : String(error)
      );
    }
  };

  return {
    games,
    isLoading,
    refreshGames,
  };
}
