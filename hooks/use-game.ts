import {
  checkTransactionStatus,
  getGameResult,
  playHouseMove,
  resolveGameAsync,
} from "@/app/actions/house";
import { Move } from "@/lib/crypto";
import { useGameUIStore } from "@/stores/game-ui-store";
import { GamePhase, GameResult } from "@/types/game";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_BET_AMOUNT,
  DEFAULT_BET_AMOUNT_WEI,
  useGameContract,
} from "./use-game-contract";
import { useLeaderboard } from "./use-leaderboard";
import { useMatches } from "./use-matches";

export function useGame() {
  const {
    createGame: contractCreateGame,
    joinGame: contractJoinGame,
    submitMoves,
    computeDifference,
    finalizeGame,
    gameInfo,
  } = useGameContract();

  const { updateLeaderboard } = useLeaderboard();
  const { addMatch } = useMatches();

  const gameUIState = useGameUIStore();
  const {
    setPlayerMove,
    setHouseMove,
    setPhase,
    setResult,
    setError,
    setGameId,
    setTransactionHash,
    setTransactionModal,
    resetGameState,
  } = useGameUIStore();

  const [isResolutionPending, setIsResolutionPending] = useState(false);
  const [pendingResult, setPendingResult] = useState<number | null>(null);

  const [pollingState, setPollingState] = useState<{
    isPolling: boolean;
    pollCount: number;
    lastTxHash: string | null;
    pollStartTime: number;
  }>({
    isPolling: false,
    pollCount: 0,
    lastTxHash: null,
    pollStartTime: 0,
  });

  const updateStats = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        updateLeaderboard(),
        addMatch(),
      ]);

      results.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(`Error in update operation ${index}:`, result.reason);
        }
      });

      if (results.every((result) => result.status === "fulfilled")) {
        console.log("Game stats updated successfully");
      } else {
        console.warn("Some game stats updates failed");
      }
    } catch (error) {
      console.error("Error updating game stats:", error);
    }
  }, [updateLeaderboard, addMatch]);

  function determineGamePhase(gameInfo: any) {
    if (!gameInfo) return GamePhase.CHOOSING;

    const [playerB, finished, bothCommitted] = gameInfo;

    if (finished) {
      return GamePhase.FINISHED;
    }

    if (bothCommitted) {
      return GamePhase.REVEALING;
    }

    if (playerB !== "0x0000000000000000000000000000000000000000") {
      return GamePhase.WAITING;
    }

    return GamePhase.SELECTED;
  }

  function inferHouseMove(gameResult: GameResult, userMove: Move) {
    if (gameResult === GameResult.WIN) {
      return userMove === "ROCK"
        ? "SCISSORS"
        : userMove === "PAPER"
        ? "ROCK"
        : "PAPER";
    }

    if (gameResult === GameResult.LOSE) {
      return userMove === "ROCK"
        ? "PAPER"
        : userMove === "PAPER"
        ? "SCISSORS"
        : "ROCK";
    }

    return userMove;
  }

  const resolveGameAsyncMutation = useMutation({
    mutationFn: async (gameId: number) => {
      try {
        // Call the server action
        const result = await resolveGameAsync(gameId);

        if (!result.success) {
          throw new Error(result.error || "Failed to resolve game");
        }

        // Store transaction hash for polling
        if (result.txHash) {
          setTransactionHash(result.txHash);
          // Update polling with new hash
          startOrUpdatePolling(result.txHash);
        }

        // If there's a pending result
        if (result.pendingResult !== undefined && result.pendingResult >= 0) {
          setPendingResult(result.pendingResult);

          // Check if we're done
          if (result.status === "completed") {
            const gameOutcome = getResultFromDiff(result.pendingResult);

            setPhase(GamePhase.FINISHED);
            setResult(gameOutcome);

            if (gameUIState.playerMove) {
              setHouseMove(
                inferHouseMove(gameOutcome, gameUIState.playerMove as Move)
              );
            }

            setIsResolutionPending(false);
            setTransactionHash(null);
            setTransactionModal(false);
            stopPolling();

            // Update stats
            updateStats();

            return {
              success: true,
              gameId,
              isComplete: true,
              result: gameOutcome,
            };
          }
        }

        return {
          success: true,
          gameId,
          txHash: result.txHash,
          isPending: true,
          pendingResult: result.pendingResult,
        };
      } catch (error) {
        // Handle specific error cases
        if (error instanceof Error) {
          // If game not joined yet, keep polling
          if (error.message.includes("Player B has not joined yet")) {
            console.log("Waiting for player to join...");
            return { success: true, gameId, waitingForJoin: true };
          }

          setError(error.message);
        } else {
          setError("Failed to resolve game");
        }

        setPhase(GamePhase.ERROR);
        stopPolling();
        throw error;
      }
    },
  });

  function getResultFromDiff(diff: number | undefined) {
    if (diff === undefined) return GameResult.DRAW;

    // Normalize the diff modulo 3
    const normalizedDiff = ((diff % 3) + 3) % 3;

    if (normalizedDiff === 0) return GameResult.DRAW;
    if (normalizedDiff === 1) return GameResult.WIN;
    return GameResult.LOSE;
  }

  const createGameMutation = useMutation({
    mutationFn: async (params: { move: Move; betAmount?: bigint }) => {
      const { move, betAmount = DEFAULT_BET_AMOUNT_WEI } = params;
      try {
        setPlayerMove(move);
        setPhase(GamePhase.SELECTED);

        const gameId = await contractCreateGame(move, betAmount);
        setGameId(gameId);

        const houseResult = await playHouseMove(gameId, betAmount);
        if (!houseResult.success) {
          throw new Error(houseResult.error || "Failed to play house move");
        }

        // Start polling with the transaction hash
        startOrUpdatePolling(houseResult.hash);

        // Set phase to revealing
        setPhase(GamePhase.REVEALING);

        // Start the async resolution but don't wait for it to complete
        resolveGameAsyncMutation.mutate(gameId);

        return {
          success: true,
          gameId,
          txHash: houseResult.hash,
          move: houseResult.move,
        };
      } catch (error) {
        // Error handling same as before
        if (error instanceof Error) {
          if (!error.message.includes("rejected the request")) {
            setError(error.message);
          }
        } else {
          setError("Failed to create game");
        }
        setPhase(GamePhase.ERROR);
        throw error;
      }
    },
  });

  const joinGameMutation = useMutation({
    mutationFn: async ({
      gameId,
      move,
      betAmount = DEFAULT_BET_AMOUNT_WEI,
    }: {
      gameId: number;
      move: Move;
      betAmount?: bigint;
    }) => {
      try {
        setPlayerMove(move);
        setPhase(GamePhase.WAITING);

        await contractJoinGame(gameId, move, betAmount);

        // Start async resolution
        setPhase(GamePhase.REVEALING);
        return resolveGameAsyncMutation.mutateAsync(gameId);
      } catch (error) {
        // Error handling
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError("Failed to join game");
        }
        setPhase(GamePhase.ERROR);
        throw error;
      }
    },
  });

  // Add this adaptive polling function
  const startOrUpdatePolling = useCallback((txHash: string | null = null) => {
    setPollingState((prev) => {
      const now = Date.now();
      const isNew = !prev.isPolling || txHash !== prev.lastTxHash;

      // Reset poll count if this is a new transaction or we weren't polling before
      const pollCount = isNew ? 0 : prev.pollCount + 1;

      return {
        isPolling: true,
        pollCount,
        lastTxHash: txHash || prev.lastTxHash,
        // Reset start time if this is a new transaction
        pollStartTime: isNew ? now : prev.pollStartTime,
      };
    });
  }, []);

  const stopPolling = useCallback(() => {
    setPollingState((prev) => ({
      ...prev,
      isPolling: false,
    }));
  }, []);

  useEffect(() => {
    if (!pollingState.isPolling || !gameUIState.gameId) {
      return;
    }

    // Calculate adaptive polling interval based on how long we've been polling
    // Start with fast polls, then gradually slow down
    const elapsedTimeMs = Date.now() - pollingState.pollStartTime;
    let pollIntervalMs: number;

    if (elapsedTimeMs < 5000) {
      // First 5 seconds: poll very quickly (every 1s)
      pollIntervalMs = 1000;
    } else if (elapsedTimeMs < 15000) {
      // 5-15 seconds: poll every 2s
      pollIntervalMs = 2000;
    } else if (elapsedTimeMs < 30000) {
      // 15-30 seconds: poll every 3s
      pollIntervalMs = 3000;
    } else {
      // After 30 seconds: slow down to every 5s
      pollIntervalMs = 5000;
    }

    // Add some jitter to prevent exact simultaneous calls
    const jitter = Math.random() * 300; // Up to 300ms of jitter
    const finalInterval = pollIntervalMs + jitter;

    console.log(
      `Polling for game ${gameUIState.gameId} (poll #${
        pollingState.pollCount
      }) in ${Math.round(finalInterval)}ms`
    );

    const timeoutId = setTimeout(async () => {
      try {
        if (!gameUIState.gameId) return;

        // Only poll if we're still in an unfinished state
        if (
          gameUIState.phase !== GamePhase.FINISHED &&
          gameUIState.phase !== GamePhase.ERROR
        ) {
          await resolveGameAsyncMutation.mutateAsync(gameUIState.gameId);
        } else {
          // Game is finished or errored, stop polling
          stopPolling();
        }
      } catch (error) {
        console.error("Error in polling resolution:", error);

        // If we've been polling for more than 60 seconds, give up
        if (Date.now() - pollingState.pollStartTime > 60000) {
          stopPolling();
          setError("Game resolution timed out. Please try again later.");
        }
      }
    }, finalInterval);

    return () => clearTimeout(timeoutId);
  }, [
    pollingState.isPolling,
    pollingState.pollCount,
    pollingState.pollStartTime,
    gameUIState.gameId,
    gameUIState.phase,
  ]);

  useEffect(() => {
    if (!gameInfo || !gameUIState.gameId) return;

    const currentPhase = determineGamePhase(gameInfo);

    if (currentPhase !== gameUIState.phase) {
      setPhase(currentPhase);

      if (
        currentPhase === GamePhase.FINISHED &&
        gameUIState.phase !== GamePhase.FINISHED
      ) {
        updateStats();
      }
    }
  }, [gameInfo, gameUIState.gameId, gameUIState.phase, setPhase, updateStats]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && gameUIState.gameId) {
        if (
          gameUIState.phase === GamePhase.REVEALING ||
          gameUIState.phase === GamePhase.WAITING
        ) {
          if (gameUIState.result) {
            setPhase(GamePhase.FINISHED);
            updateStats();
          } else if (isResolutionPending) {
            resolveGameAsyncMutation.mutate(gameUIState.gameId);
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    gameUIState.gameId,
    gameUIState.phase,
    gameUIState.result,
    isResolutionPending,
    setPhase,
    updateStats,
  ]);

  const resetGame = useCallback(() => {
    setIsResolutionPending(false);
    setPendingResult(null);
    resetGameState();
  }, [resetGameState]);

  return {
    gameState: gameUIState,
    phase: gameUIState.phase,
    createGame: (move: Move, betAmount = DEFAULT_BET_AMOUNT_WEI) =>
      createGameMutation.mutate({ move, betAmount }),
    joinGame: (
      gameId: number,
      move: Move,
      betAmount = DEFAULT_BET_AMOUNT_WEI
    ) => joinGameMutation.mutate({ gameId, move, betAmount }),
    submitMoves,
    computeDifference,
    finalizeGame,
    resetGame,
    defaultBetAmount: DEFAULT_BET_AMOUNT,
    defaultBetAmountWei: DEFAULT_BET_AMOUNT_WEI,
    isCreatingGame: createGameMutation.isPending,
    isJoiningGame: joinGameMutation.isPending,
    isRevealingGame: isResolutionPending,
    isComputingDifference: resolveGameAsyncMutation.isPending,
    isFinalizingGame: resolveGameAsyncMutation.isPending,
    isResolutionPending,
    pendingResult,
    retryResolution: (gameId: number) =>
      resolveGameAsyncMutation.mutate(gameId),
    updateStats,
  };
}
