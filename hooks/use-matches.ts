/* eslint-disable @typescript-eslint/no-explicit-any */
import { useWallet } from "@/contexts/wallet-context";
import { Move } from "@/lib/crypto";
import {
  GameHistory,
  GameResult,
  SubgraphGamesResponse,
  SubgraphPlayerStats,
} from "@/types/game";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { formatEther } from "viem";

const SUBGRAPH_URL = process.env.NEXT_PUBLIC_SUBGRAPH_URL as string;
const LOCAL_MATCHES_KEY = "local-matches";

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
  const [isSyncing, setIsSyncing] = useState(false);
  // const [initialLocalDataLoaded, setInitialLocalDataLoaded] = useState(false);

  // Helper functions for localStorage
  const saveLocalMatches = (address: string, matches: GameHistory[]) => {
    try {
      localStorage.setItem(
        `${LOCAL_MATCHES_KEY}-${address}`,
        JSON.stringify(matches)
      );
      logDebug(`Saved ${matches.length} local matches to localStorage`);
    } catch (error) {
      console.error("Error saving matches to localStorage:", error);
    }
  };

  const getLocalMatches = (address: string): GameHistory[] => {
    try {
      const data = localStorage.getItem(`${LOCAL_MATCHES_KEY}-${address}`);
      const matches = data ? JSON.parse(data) : [];
      logDebug(`Retrieved ${matches.length} local matches from localStorage`);
      return matches;
    } catch (error) {
      console.error("Error loading matches from localStorage:", error);
      return [];
    }
  };

  // Logging utility
  function logDebug(message: string, data?: any) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[Matches] ${message}`, data ? data : "");
    }
  }

  const {
    data: matchesData = {
      matches: [],
      totalEarnings: 0,
      playerStats: null,
      lastSyncTime: 0,
    },
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["matches", address],
    queryFn: async () => {
      if (!address)
        return {
          matches: [],
          totalEarnings: 0,
          playerStats: null,
          lastSyncTime: 0,
        };

      setIsSyncing(true);
      logDebug("Starting sync with server");

      try {
        const localStoredMatches = getLocalMatches(address);
        const normalizedAddress = address.toLowerCase();

        logDebug(
          `Fetching data from subgraph for address ${normalizedAddress}`
        );
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

        const serverMatches: GameHistory[] = [];
        let totalEarnings = 0;

        logDebug(`Processing ${data.data.playerA.length} playerA games`);
        for (const game of data.data.playerA) {
          if (!game.resolvedAt || game.revealedDifference === null) {
            continue;
          }

          const betAmount = Number(formatEther(BigInt(game.betAmount)));
          const timestamp = Number(game.resolvedAt) * 1000;

          const diffMod3Value = ((game.revealedDifference % 3) + 3) % 3;

          const { playerMove, houseMove, result, betValue } = inferGameResult(
            diffMod3Value,
            true,
            game.winner?.toLowerCase() === normalizedAddress,
            betAmount
          );

          totalEarnings += betValue;

          serverMatches.push({
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

        logDebug(`Processing ${data.data.playerB.length} playerB games`);
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

          serverMatches.push({
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

        serverMatches.sort((a, b) => b.timestamp - a.timestamp);

        const markedServerMatches = serverMatches.map((match) => ({
          ...match,
          syncStatus: "synced" as const,
        }));

        logDebug(`Total server matches found: ${markedServerMatches.length}`);

        // Filter out local matches that already exist on server
        const pendingLocalMatches = localStoredMatches
          .filter(
            (localMatch) =>
              !markedServerMatches.some(
                (serverMatch) => serverMatch.gameId === localMatch.gameId
              )
          )
          .map((match) => ({
            ...match,
            syncStatus: "pending" as const,
          }));

        logDebug(`Pending local matches: ${pendingLocalMatches.length}`);

        const allMatches = [...markedServerMatches, ...pendingLocalMatches];
        allMatches.sort((a, b) => b.timestamp - a.timestamp);

        // Only save pending matches to localStorage
        saveLocalMatches(
          address,
          allMatches.filter((match) => match.syncStatus === "pending")
        );

        const syncTime = Date.now();
        logDebug(
          `Sync completed at ${new Date(syncTime).toLocaleTimeString()}`
        );

        return {
          matches: allMatches,
          totalEarnings: data.data.playerStats?.netProfitLoss
            ? Number(formatEther(BigInt(data.data.playerStats.netProfitLoss)))
            : pendingLocalMatches.reduce(
                (sum, match) => sum + match.betValue,
                0
              ) + totalEarnings,
          playerStats: data.data.playerStats,
          lastSyncTime: syncTime,
        };
      } catch (error) {
        console.error("Error fetching matches:", error);
        logDebug("Recovering with local matches due to server error");

        const localMatches = getLocalMatches(address).map((match) => ({
          ...match,
          syncStatus: "pending" as const,
        }));

        logDebug(`Found ${localMatches.length} local matches to recover with`);

        return {
          matches: localMatches,
          totalEarnings: localMatches.reduce(
            (sum, match) => sum + match.betValue,
            0
          ),
          playerStats: null,
          lastSyncTime: 0,
        };
      } finally {
        setIsSyncing(false);
      }
    },
    enabled: !!address,
    staleTime: 5000,
    refetchInterval: 60000,
  });

  // Helper function to infer game results from diffMod3
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
      logDebug("Manually refreshing match history");
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

    logDebug("Adding local match:", gameData);

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
      syncStatus: "pending",
    };

    queryClient.setQueryData(
      ["matches", address],
      (
        oldData:
          | {
              matches: GameHistory[];
              totalEarnings: number;
              playerStats: SubgraphPlayerStats | null;
              lastSyncTime: number;
            }
          | undefined
      ) => {
        if (!oldData) {
          saveLocalMatches(address, [newMatch]);
          logDebug("No existing matches data, creating new");
          return {
            matches: [newMatch],
            totalEarnings: betValue,
            playerStats: null,
            lastSyncTime: 0,
          };
        }

        const existingMatchIndex = oldData.matches.findIndex(
          (match) => match.gameId === gameData.gameId
        );

        let updatedMatches;
        if (existingMatchIndex === -1) {
          logDebug("Adding new match to existing data");
          updatedMatches = [newMatch, ...oldData.matches];
        } else {
          logDebug("Updating existing match");
          updatedMatches = [...oldData.matches];
          updatedMatches[existingMatchIndex] = newMatch;
        }

        const pendingMatches = updatedMatches.filter(
          (match: GameHistory) => match.syncStatus === "pending"
        );
        saveLocalMatches(address, pendingMatches);

        return {
          matches: updatedMatches,
          totalEarnings:
            existingMatchIndex === -1
              ? calculateTotalEarnings(updatedMatches, oldData.playerStats)
              : oldData.totalEarnings,
          playerStats:
            existingMatchIndex === -1
              ? updatePlayerStats(
                  oldData.playerStats,
                  gameData.result,
                  betValue
                )
              : oldData.playerStats,
          lastSyncTime: oldData.lastSyncTime,
        };
      }
    );

    queryClient.invalidateQueries({
      queryKey: ["matches", address],
      exact: true,
      refetchType: "none",
    });
  };

  function calculateTotalEarnings(
    matches: GameHistory[],
    playerStats: SubgraphPlayerStats | null
  ) {
    if (!playerStats || !playerStats.netProfitLoss) {
      return matches.reduce((sum, match) => sum + match.betValue, 0);
    }

    const pendingMatches = matches.filter(
      (match) => match.syncStatus === "pending"
    );
    const pendingEarnings = pendingMatches.reduce(
      (sum, match) => sum + match.betValue,
      0
    );

    return (
      Number(formatEther(BigInt(playerStats.netProfitLoss))) + pendingEarnings
    );
  }

  const syncMatches = async () => {
    if (isSyncing) return;
    logDebug("Manual sync triggered");
    await refetch();
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
          ? BigInt(betValue * 10 ** 18)
          : -BigInt(Math.abs(betValue) * 10 ** 18))
      }`,
    };
  }

  const clearHistoryMutation = async () => {
    if (address) {
      try {
        logDebug("Clearing local matches history");
        localStorage.removeItem(`${LOCAL_MATCHES_KEY}-${address}`);
      } catch (error) {
        console.error("Error clearing localStorage:", error);
      }

      queryClient.setQueryData(["matches", address], {
        matches: [],
        totalEarnings: 0,
        playerStats: null,
        lastSyncTime: 0,
      });
    }
  };

  return {
    matches: matchesData.matches,
    isLoading,
    isSyncing: isFetching,
    addMatch,
    addLocalMatch,
    syncMatches,
    clearHistory: clearHistoryMutation,
    totalEarnings: matchesData.totalEarnings,
    playerStats: matchesData.playerStats,
    lastSyncTime: matchesData.lastSyncTime,
  };
}
