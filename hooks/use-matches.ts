import { Move } from '@/lib/crypto';
import { GameHistory, GameResult } from '@/types/game';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { GameState } from './use-player-games';

// Subgraph URL
const SUBGRAPH_URL =
  'https://api.studio.thegraph.com/query/105896/odyssey-rps/version/latest';

// GraphQL query for player's games (both created and joined)
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
      resolvedAt
      transactionHash
      revealedDifference
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
      resolvedAt
      transactionHash
      revealedDifference
    }
  }
`;

interface SubgraphGame {
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
  state: string;
  isFinished: boolean;
  createdAt: string;
  resolvedAt: string | null;
  transactionHash: string;
  revealedDifference: number | null;
}

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

export function useMatches() {
  const { address } = useAccount();
  const queryClient = useQueryClient();

  const {
    data: matches = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['matches', address],
    queryFn: async () => {
      if (!address) return [] as GameHistory[];

      try {
        // Normalize the address to lowercase
        const normalizedAddress = address.toLowerCase();

        // Fetch data from the subgraph
        const response = await fetch(SUBGRAPH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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

        if (data.errors) {
          console.error('GraphQL errors:', data.errors);
          throw new Error('GraphQL query failed');
        }

        const userMatches: GameHistory[] = [];

        // Process games where player is playerA
        for (const game of data.data.playerA) {
          if (
            game.state !== GameState.RESOLVED ||
            !game.resolvedAt ||
            game.revealedDifference === null
          ) {
            continue;
          }

          const betAmount = Number(formatEther(BigInt(game.betAmount)));
          const timestamp = Number(game.resolvedAt) * 1000;

          // Convert revealedDifference to diffMod3 (ensure positive value 0-2)
          const diffMod3Value = ((game.revealedDifference % 3) + 3) % 3;

          // Infer moves and results from diffMod3
          const { playerMove, houseMove, result, betValue } = inferGameResult(
            diffMod3Value,
            true, // isPlayerA
            game.winner?.toLowerCase() === normalizedAddress,
            betAmount,
          );

          userMatches.push({
            id: game.id,
            gameId: Number(game.gameId),
            timestamp,
            playerMove,
            houseMove,
            result,
            playerAddress: normalizedAddress,
            transactionHash: game.transactionHash,
            betValue: betValue,
          });
        }

        // Process games where player is playerB
        for (const game of data.data.playerB) {
          if (
            game.state !== GameState.RESOLVED ||
            !game.resolvedAt ||
            game.revealedDifference === null
          ) {
            continue; // Skip games that aren't resolved yet
          }

          const betAmount = Number(formatEther(BigInt(game.betAmount)));
          const timestamp = Number(game.resolvedAt) * 1000;

          // Convert revealedDifference to diffMod3 (ensure positive value 0-2)
          const diffMod3Value = ((game.revealedDifference % 3) + 3) % 3;

          // Infer moves and results from diffMod3
          const { playerMove, houseMove, result, betValue } = inferGameResult(
            diffMod3Value,
            false, // isPlayerA
            game.winner?.toLowerCase() === normalizedAddress,
            betAmount,
          );

          userMatches.push({
            id: game.id,
            gameId: Number(game.gameId),
            timestamp,
            playerMove,
            houseMove,
            result,
            playerAddress: normalizedAddress,
            transactionHash: game.transactionHash,
            betValue: betValue,
          });
        }

        return userMatches.sort((a, b) => b.timestamp - a.timestamp);
      } catch (error) {
        console.error(
          'Error fetching match history from subgraph:',
          error instanceof Error ? error.message : String(error),
        );
        return [] as GameHistory[];
      }
    },
    enabled: !!address,
    refetchInterval: 60000,
    staleTime: 5000,
  });

  // Helper function to infer game results from diffMod3
  function inferGameResult(
    diffMod3Value: number,
    isPlayerA: boolean,
    isWinner: boolean,
    betAmount: number,
  ): {
    playerMove: Move;
    houseMove: Move;
    result: GameResult;
    betValue: number;
  } {
    let playerMove: Move;
    let houseMove: Move;
    let result: GameResult;
    let betValue: number = 0;

    if (diffMod3Value === 0) {
      const drawMoves: Move[] = ['ROCK', 'PAPER', 'SCISSORS'];
      const randomDrawMove =
        drawMoves[Math.floor(Math.random() * drawMoves.length)];
      playerMove = randomDrawMove;
      houseMove = randomDrawMove;
      result = GameResult.DRAW;
      betValue = 0;
    } else if (diffMod3Value === 1) {
      // Player A wins
      if (isPlayerA) {
        playerMove = 'ROCK';
        houseMove = 'SCISSORS';
        result = GameResult.WIN;
        betValue = betAmount;
      } else {
        playerMove = 'SCISSORS';
        houseMove = 'ROCK';
        result = GameResult.LOSE;
        betValue = -betAmount;
      }
    } else {
      // Player B wins
      if (!isPlayerA) {
        playerMove = 'ROCK';
        houseMove = 'SCISSORS';
        result = GameResult.WIN;
        betValue = betAmount;
      } else {
        playerMove = 'SCISSORS';
        houseMove = 'ROCK';
        result = GameResult.LOSE;
        betValue = -betAmount;
      }
    }

    // Double-check with the actual winner (in case logic doesn't match)
    if (
      (result === GameResult.WIN && !isWinner) ||
      (result === GameResult.LOSE && isWinner)
    ) {
      console.warn(
        'Game result logic mismatch with winner field, using winner field',
      );
      if (isWinner) {
        result = GameResult.WIN;
        betValue = betAmount;
      } else {
        result = GameResult.LOSE;
        betValue = -betAmount;
      }
    }

    return { playerMove, houseMove, result, betValue };
  }

  // Calculate total earnings from all matches
  const totalEarnings = matches.reduce((total, match) => {
    return total + (match.betValue || 0);
  }, 0);

  const addMatch = async () => {
    try {
      await refetch();
    } catch (error) {
      console.error('Error refetching match history:', error);
    }
  };

  const clearHistoryMutation = async () => {
    if (address) {
      queryClient.setQueryData(['matches', address], []);
    }
  };

  return {
    matches,
    isLoading,
    addMatch,
    clearHistory: clearHistoryMutation,
    totalEarnings,
  };
}
