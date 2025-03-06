import { useWallet } from "@/contexts/wallet-context";
import { Move } from "@/lib/crypto";
import {
  GameHistory,
  GameResult,
  SubgraphGamesResponse,
  SubgraphPlayerStats,
} from "@/types/game";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatEther } from "viem";

const SUBGRAPH_URL = process.env.NEXT_PUBLIC_SUBGRAPH_URL as string;

const PLAYER_GAMES_QUERY = `
  query GetPlayerGames($playerId: ID!, $first: Int, $skip: Int) {
    playerA: games(
      where: { playerA: $playerId, state: "RESOLVED" }
      orderBy: resolvedAt
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
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
      isFinished
      resolvedAt
      transactionHash
      revealedDifference
    }
    playerB: games(
      where: { playerB: $playerId, state: "RESOLVED" }
      orderBy: resolvedAt
      orderDirection: desc
      first: $first
      skip: $skip
    ) {
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
      isFinished
      resolvedAt
      transactionHash
      revealedDifference
    }
    # Get aggregated stats for summary component
    playerStats: player(id: $playerId) {
      totalGamesPlayed
      wins
      losses
      draws
      netProfitLoss
      totalReturned
    }
  }
`;

export function useMatches() {
  const { walletAddress: address } = useWallet();
  const queryClient = useQueryClient();
  const PAGE_SIZE = 50;

  const {
    data: matchesData = { matches: [], totalEarnings: 0, playerStats: null },
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["matches", address],
    queryFn: async () => {
      if (!address) return { matches: [], totalEarnings: 0, playerStats: null };

      try {
        const normalizedAddress = address.toLowerCase();

        const response = await fetch(SUBGRAPH_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: PLAYER_GAMES_QUERY,
            variables: {
              playerId: normalizedAddress,
              first: PAGE_SIZE,
              skip: 0,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = (await response.json()) as SubgraphGamesResponse;

        if (data.errors) {
          console.error("GraphQL errors:", data.errors);
          throw new Error("GraphQL query failed");
        }

        const userMatches: GameHistory[] = [];
        let totalEarnings = 0;

        for (const game of data.data.playerA) {
          if (!game.resolvedAt || game.revealedDifference === null) {
            continue;
          }

          const betAmount = Number(formatEther(BigInt(game.betAmount)));
          const timestamp = Number(game.resolvedAt) * 1000;

          const diffMod3Value = ((game.revealedDifference % 3) + 3) % 3;

          // TODO: This is a temporary function to infer game results from diffMod3
          // We should find a way to use the actual moves from the game instead
          const { playerMove, houseMove, result, betValue } = inferGameResult(
            diffMod3Value,
            true,
            game.winner?.toLowerCase() === normalizedAddress,
            betAmount
          );

          totalEarnings += betValue;

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

        for (const game of data.data.playerB) {
          if (!game.resolvedAt || game.revealedDifference === null) {
            continue;
          }

          const betAmount = Number(formatEther(BigInt(game.betAmount)));
          const timestamp = Number(game.resolvedAt) * 1000;

          const diffMod3Value = ((game.revealedDifference % 3) + 3) % 3;

          const { playerMove, houseMove, result, betValue } = inferGameResult(
            diffMod3Value,
            false,
            game.winner?.toLowerCase() === normalizedAddress,
            betAmount
          );

          totalEarnings += betValue;

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

        userMatches.sort((a, b) => b.timestamp - a.timestamp);

        if (data.data.playerStats?.netProfitLoss) {
          totalEarnings = Number(
            formatEther(BigInt(data.data.playerStats.netProfitLoss))
          );
        }

        return {
          matches: userMatches,
          totalEarnings,
          playerStats: data.data.playerStats,
        };
      } catch (error) {
        console.error("Error fetching matches:", error);
        return { matches: [], totalEarnings: 0, playerStats: null };
      }
    },
    enabled: !!address,
    staleTime: 5000,
  });

  // Helper function to infer game results from diffMod3
  // TODO: This is a temporary function to infer game results from diffMod3
  // We should find a way to use the actual moves from the game instead
  function inferGameResult(
    diffMod3Value: number,
    isPlayerA: boolean,
    isWinner: boolean,
    betAmount: number
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
      const drawMoves: Move[] = ["ROCK", "PAPER", "SCISSORS"];
      const randomDrawMove =
        drawMoves[Math.floor(Math.random() * drawMoves.length)];
      playerMove = randomDrawMove;
      houseMove = randomDrawMove;
      result = GameResult.DRAW;
      betValue = 0;
    } else if (diffMod3Value === 1) {
      // Player A wins
      if (isPlayerA) {
        playerMove = "ROCK";
        houseMove = "SCISSORS";
        result = GameResult.WIN;
        betValue = betAmount;
      } else {
        playerMove = "SCISSORS";
        houseMove = "ROCK";
        result = GameResult.LOSE;
        betValue = -betAmount;
      }
    } else {
      // Player B wins
      if (!isPlayerA) {
        playerMove = "ROCK";
        houseMove = "SCISSORS";
        result = GameResult.WIN;
        betValue = betAmount;
      } else {
        playerMove = "SCISSORS";
        houseMove = "ROCK";
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
        "Game result logic mismatch with winner field, using winner field"
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

  const addMatch = async () => {
    try {
      await refetch();
    } catch (error) {
      console.error("Error refetching match history:", error);
    }
  };

  const addLocalMatch = (gameData: {
    gameId: number;
    playerMove: Move;
    result: GameResult;
    transactionHash: string;
    houseMove: Move;
    betAmount: bigint;
  }) => {
    if (!address) return;

    const betValue =
      gameData.result === GameResult.WIN
        ? Number(formatEther(gameData.betAmount))
        : gameData.result === GameResult.LOSE
        ? -Number(formatEther(gameData.betAmount))
        : 0;

    const newMatch: GameHistory = {
      id: `local-${gameData.gameId}-${Date.now()}`,
      gameId: gameData.gameId,
      timestamp: Date.now(),
      playerMove: gameData.playerMove,
      houseMove: gameData.houseMove,
      result: gameData.result,
      playerAddress: address,
      transactionHash: gameData.transactionHash,
      betValue: betValue,
    };

    queryClient.setQueryData(
      ["matches", address],
      (
        oldData:
          | {
              matches: GameHistory[];
              totalEarnings: number;
              playerStats: SubgraphPlayerStats | null;
            }
          | undefined
      ) => {
        if (!oldData)
          return {
            matches: [newMatch],
            totalEarnings: betValue,
            playerStats: null,
          };

        const existingMatch = oldData.matches.find(
          (match) => match.gameId === gameData.gameId
        );
        if (existingMatch) return oldData;

        // Update total earnings
        const newTotalEarnings = oldData.totalEarnings + betValue;

        return {
          matches: [newMatch, ...oldData.matches],
          totalEarnings: newTotalEarnings,
          playerStats: oldData.playerStats,
        };
      }
    );
  };

  const clearHistoryMutation = async () => {
    if (address) {
      queryClient.setQueryData(["matches", address], {
        matches: [],
        totalEarnings: 0,
        playerStats: null,
      });
    }
  };

  return {
    matches: matchesData.matches,
    isLoading,
    addMatch,
    addLocalMatch,
    clearHistory: clearHistoryMutation,
    totalEarnings: matchesData.totalEarnings,
    playerStats: matchesData.playerStats,
  };
}
