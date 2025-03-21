/* eslint-disable @typescript-eslint/no-explicit-any */
import { useWallet } from "@/contexts/wallet-context";
import { Move } from "@/lib/crypto";
import { catchUsingCache, logDebug, tryUseCache } from "@/lib/utils";
import {
  GameHistory,
  GameResult,
  SubgraphGame,
  SubgraphGamesResponse,
  SubgraphPlayerStats,
} from "@/types/game";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { formatEther } from "viem";

const SUBGRAPH_URL = process.env.NEXT_PUBLIC_SUBGRAPH_URL as string;
const LOCAL_MATCHES_KEY = "local-matches";
const MAX_PENDING_TIME = 10 * 60 * 1000;

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

const CHECK_GAMES_BY_ID_QUERY = `
  query CheckGamesByIds($gameIds: [BigInt!]!, $playerA: ID!, $playerB: ID!) {
    gamesA: games(
      where: { gameId_in: $gameIds, playerA: $playerA, state: "RESOLVED" }
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
    gamesB: games(
      where: { gameId_in: $gameIds, playerB: $playerB, state: "RESOLVED" }
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
  }
`;

interface MatchesData {
  matches: GameHistory[];
  totalEarnings: number;
  playerStats: SubgraphPlayerStats | null;
  lastSyncTime: number;
}

const emptyMatchData = {
  matches: [],
  totalEarnings: 0,
  playerStats: null,
  lastSyncTime: 0,
};

export function useMatches() {
  const { walletAddress: address } = useWallet();
  const queryClient = useQueryClient();
  const PAGE_SIZE = 500;
  const [isSyncing, setIsSyncing] = useState(false);

  // Helper functions for localStorage
  const saveLocalMatches = (address: string, matches: GameHistory[]) => {
    try {
      localStorage.setItem(
        `${LOCAL_MATCHES_KEY}-${address}`,
        JSON.stringify(matches)
      );
      logDebug(
        "matches",
        `Saved ${matches.length} local matches to localStorage`
      );
    } catch (error) {
      console.error("Error saving matches to localStorage:", error);
    }
  };

  const getLocalMatches = (address: string): GameHistory[] => {
    try {
      const data = localStorage.getItem(`${LOCAL_MATCHES_KEY}-${address}`);
      const matches = data ? JSON.parse(data) : [];
      logDebug(
        "matches",
        `Retrieved ${matches.length} local matches from localStorage`
      );
      return matches;
    } catch (error) {
      console.error("Error loading matches from localStorage:", error);
      return [];
    }
  };

  async function checkConfirmedGamesById(
    address: string,
    gameIds: number[]
  ): Promise<number[]> {
    if (!address || gameIds.length === 0) return [];

    try {
      const normalizedAddress = address.toLowerCase();
      logDebug(
        "matches",
        `Checking specific games by ID: ${gameIds.join(", ")}`
      );

      const response = await fetch(SUBGRAPH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: CHECK_GAMES_BY_ID_QUERY,
          variables: {
            gameIds: gameIds,
            playerA: normalizedAddress,
            playerB: normalizedAddress,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      if (data.errors) {
        console.error("GraphQL errors:", data.errors);
        throw new Error("GraphQL query failed");
      }

      const confirmedGameIds = [
        ...data.data.gamesA.map((game: any) => Number(game.gameId)),
        ...data.data.gamesB.map((game: any) => Number(game.gameId)),
      ];

      logDebug(
        "matches",
        `Found ${confirmedGameIds.length} confirmed games on server`
      );
      return confirmedGameIds;
    } catch (error) {
      console.error("Error checking games by ID:", error);
      return [];
    }
  }

  function processPlayerGame(
    player: SubgraphGame[],
    normalizedAddress: string,
    serverMatches: GameHistory[],
    totalEarnings: number,
    isWinner: boolean
  ): {
    totalEarnings: number;
    serverMatches: GameHistory[];
  } {
    for (const game of player) {
      if (!game.resolvedAt || game.revealedDifference === null) {
        continue;
      }

      const betAmount = Number(formatEther(BigInt(game.betAmount)));
      const timestamp = Number(game.resolvedAt) * 1000;

      const diffMod3Value = ((game.revealedDifference % 3) + 3) % 3;

      const { playerMove, houseMove, result, betValue } = inferGameResult(
        diffMod3Value,
        isWinner,
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

    return {
      totalEarnings,
      serverMatches,
    };
  }

  function handleServerMatches(
    playerA: SubgraphGame[],
    playerB: SubgraphGame[],
    normalizedAddress: string
  ): {
    confirmedMatches: GameHistory[];
    totalEarnings: number;
  } {
    let serverMatches: GameHistory[] = [];

    logDebug("matches", `Processing ${playerA.length} playerA games`);
    const processedPlayerA = processPlayerGame(
      playerA,
      normalizedAddress,
      serverMatches,
      0,
      true
    );

    let totalEarnings = processedPlayerA.totalEarnings;
    serverMatches = processedPlayerA.serverMatches;

    logDebug("matches", `Processing ${playerB.length} playerB games`);
    const processedPlayerB = processPlayerGame(
      playerB,
      normalizedAddress,
      serverMatches,
      totalEarnings,
      false
    );

    totalEarnings = processedPlayerB.totalEarnings;
    serverMatches = processedPlayerB.serverMatches;

    serverMatches.sort((a, b) => b.timestamp - a.timestamp);

    const confirmedMatches = serverMatches.map((match) => ({
      ...match,
      syncStatus: "synced" as const,
    }));

    return { confirmedMatches, totalEarnings };
  }

  async function handlePendingMatches(
    localStoredMatches: GameHistory[],
    confirmedMatches: GameHistory[],
    address: string
  ): Promise<GameHistory[]> {
    const pendingGamesIds = localStoredMatches
      .filter(
        (localMatch) =>
          !confirmedMatches.some(
            (serverMatch) => serverMatch.gameId === localMatch.gameId
          ) && localMatch.gameId !== null
      )
      .map((match) => match.gameId as number);

    let confirmedGames: number[];

    if (pendingGamesIds.length > 0) {
      logDebug(
        "matches",
        `Checking status of ${pendingGamesIds.length} pending games`
      );
      confirmedGames = await checkConfirmedGamesById(address, pendingGamesIds);
    }

    const nowTime = Date.now();

    return localStoredMatches
      .filter((localMatch) => {
        const isFutureTimestamp = localMatch.timestamp > Date.now();
        if (isFutureTimestamp) {
          logDebug(
            "matches",
            `Match ${localMatch.gameId} has a future timestamp, correcting it`
          );
          localMatch.timestamp = Date.now();
        }
        if (
          confirmedMatches.some(
            (serverMatch) =>
              Number(serverMatch.gameId) === Number(localMatch.gameId)
          )
        ) {
          return false;
        }

        if (
          localMatch.gameId !== null &&
          confirmedGames.includes(localMatch.gameId)
        ) {
          return false;
        }

        const isPendingTooLong =
          nowTime - localMatch.timestamp > MAX_PENDING_TIME;

        if (isPendingTooLong) {
          logDebug(
            "matches",
            `Match ${localMatch.gameId} has been pending too long (${Math.floor(
              (nowTime - localMatch.timestamp) / 3600000
            )} minutes), removing`
          );
          return false;
        }

        return true;
      })
      .map((match) => ({
        ...match,
        syncStatus: "pending" as const,
      }));
  }

  const {
    data: matchesData = emptyMatchData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["matches", address],
    queryFn: async () => {
      if (!address) return emptyMatchData;

      const now = Date.now();
      const cachedData = queryClient.getQueryData(["matches", address]) as
        | MatchesData
        | undefined;

      if (tryUseCache(cachedData, now, address, "cache matches")) {
        return cachedData;
      }

      setIsSyncing(true);
      logDebug("matches", "Starting sync with server");

      try {
        const localStoredMatches = getLocalMatches(address);
        const normalizedAddress = address.toLowerCase();

        logDebug(
          "matches",
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

        const { confirmedMatches, totalEarnings } = handleServerMatches(
          data.data.playerA,
          data.data.playerB,
          normalizedAddress
        );

        logDebug(
          "matches",
          `Total server matches found: ${confirmedMatches.length}`
        );

        const pendingLocalMatches = await handlePendingMatches(
          localStoredMatches,
          confirmedMatches,
          address
        );

        logDebug(
          "matches",
          `Remaining pending matches: ${pendingLocalMatches.length}`
        );

        const allMatches = [...confirmedMatches, ...pendingLocalMatches];
        allMatches.sort((a, b) => b.timestamp - a.timestamp);

        // Only save pending matches to localStorage
        saveLocalMatches(
          address,
          allMatches.filter((match) => match.syncStatus === "pending")
        );

        logDebug(
          "matches",
          `Sync completed at ${new Date(now).toLocaleTimeString()}`
        );

        const earnings = data.data.playerStats?.netProfitLoss
          ? Number(formatEther(BigInt(data.data.playerStats.netProfitLoss)))
          : pendingLocalMatches.reduce(
              (sum, match) => sum + match.betValue,
              0
            ) + totalEarnings;

        return {
          matches: allMatches,
          totalEarnings: earnings,
          playerStats: data.data.playerStats,
          lastSyncTime: now,
        };
      } catch (error) {
        console.error("Error fetching matches:", error);
        if (catchUsingCache(address, cachedData, now, "cache matches")) {
          return cachedData;
        }

        logDebug(
          "matches",
          "Recovering with local matches due to server error"
        );
        const localMatches = getLocalMatches(address).map((match) => ({
          ...match,
          syncStatus: "pending" as const,
        }));

        logDebug(
          "matches",
          `Found ${localMatches.length} local matches to recover with`
        );

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
    retry: (failureCount, error: any) => {
      if (error?.message?.includes("too many requests")) {
        logDebug("matches", "Rate limit detected, stopping retry");
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchInterval: 120000,
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
      logDebug("matches", "Manually refreshing match history");
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
      console.error("Cannot add local match: wallet address not available");
      return;
    }

    logDebug("matches", "Adding local match:", gameData);

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
      timestamp: Math.min(Date.now(), Date.now() + 5000),
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
      (oldData: MatchesData | undefined) => {
        if (!oldData) {
          saveLocalMatches(address, [newMatch]);
          logDebug("matches", "No existing matches data, creating new");
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
          logDebug("matches", "Adding new match to existing data");
          updatedMatches = [newMatch, ...oldData.matches];
        } else {
          logDebug("matches", "Updating existing match");
          updatedMatches = [...oldData.matches];
          updatedMatches[existingMatchIndex] = newMatch;
        }

        const pendingMatches = updatedMatches.filter(
          (match: GameHistory) => match.syncStatus === "pending"
        );
        saveLocalMatches(address, pendingMatches);

        return {
          matches: updatedMatches,
          totalEarnings: oldData.totalEarnings,
          playerStats: oldData.playerStats,
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

  const syncMatches = async () => {
    if (isSyncing) return;
    logDebug("matches", "Manual sync triggered");
    await refetch();
  };

  const clearHistoryMutation = async () => {
    if (address) {
      try {
        logDebug("matches", "Clearing local matches history");
        localStorage.removeItem(`${LOCAL_MATCHES_KEY}-${address}`);
      } catch (error) {
        console.error("Error clearing localStorage:", error);
      }

      queryClient.setQueryData(["matches", address], emptyMatchData);
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
