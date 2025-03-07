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

        const previousData = queryClient.getQueryData(["matches", address]) as
          | {
              matches: GameHistory[];
              totalEarnings: number;
              playerStats: SubgraphPlayerStats | null;
            }
          | undefined;

        if (previousData?.matches) {
          const localMatches = previousData.matches.filter((match) =>
            match.id.startsWith("local-")
          );

          for (const localMatch of localMatches) {
            const matchExistsInServer = userMatches.some(
              (serverMatch) => serverMatch.gameId === localMatch.gameId
            );

            if (!matchExistsInServer) {
              console.log(
                `Preserving local match for gameId ${localMatch.gameId} that doesn't exist on server yet`
              );
              userMatches.push(localMatch);
            }
          }

          userMatches.sort((a, b) => b.timestamp - a.timestamp);
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
    refetchInterval: 60000,
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
    if (!address) {
      console.log("Cannot add local match: wallet address not available");
      return;
    }

    console.log("Adding local match:", gameData);

    const betValue =
      gameData.result === GameResult.WIN
        ? Number(formatEther(gameData.betAmount))
        : gameData.result === GameResult.LOSE
        ? Number(formatEther(gameData.betAmount)) * -1
        : 0;

    const localMatchId = `local-${gameData.gameId}`;

    const newMatch: GameHistory = {
      id: localMatchId,
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
        if (!oldData) {
          console.log("No existing matches data, creating new");
          return {
            matches: [newMatch],
            totalEarnings: betValue,
            playerStats: null,
          };
        }

        const existingMatchIndex = oldData.matches.findIndex(
          (match) => match.gameId === gameData.gameId
        );

        if (existingMatchIndex === -1) {
          console.log("No existing match found, adding new one");
          return {
            matches: [newMatch, ...oldData.matches],
            totalEarnings: oldData.totalEarnings + betValue,
            playerStats: updatePlayerStats(
              oldData.playerStats,
              gameData.result,
              betValue
            ),
          };
        }

        const isLocalOrIncomplete =
          oldData.matches[existingMatchIndex].id.startsWith("local-") ||
          !oldData.matches[existingMatchIndex].transactionHash;

        if (isLocalOrIncomplete) {
          console.log(
            "Replacing existing local/incomplete match with updated data"
          );
          const updatedMatches = [...oldData.matches];
          updatedMatches[existingMatchIndex] = newMatch;

          return {
            matches: updatedMatches,
            totalEarnings: oldData.totalEarnings,
            playerStats: oldData.playerStats,
          };
        }

        console.log("Match from server already exists, not replacing");
        return oldData;
      }
    );

    queryClient.invalidateQueries({
      queryKey: ["matches", address],
      exact: true,
      refetchType: "none",
    });
  };

  function updatePlayerStats(
    currentStats: SubgraphPlayerStats | null,
    result: GameResult,
    betValue: number
  ) {
    if (!currentStats) return null;

    return {
      ...currentStats,
      totalGamesPlayed: (currentStats.totalGamesPlayed || 0) + 1,
      wins:
        result === GameResult.WIN
          ? (currentStats.wins || 0) + 1
          : currentStats.wins || 0,
      losses:
        result === GameResult.LOSE
          ? (currentStats.losses || 0) + 1
          : currentStats.losses || 0,
      draws:
        result === GameResult.DRAW
          ? (currentStats.draws || 0) + 1
          : currentStats.draws || 0,
      netProfitLoss: `${
        BigInt(currentStats.netProfitLoss || "0") +
        (betValue >= 0
          ? BigInt(Math.floor(betValue * 10 ** 18))
          : -BigInt(Math.floor(Math.abs(betValue) * 10 ** 18)))
      }`,
    };
  }

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
