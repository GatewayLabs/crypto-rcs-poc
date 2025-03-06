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
      setIsResolutionPending(true);

      try {
        const currentTxHash = gameUIState.transactionHash;
        if (currentTxHash) {
          const { confirmed } = await checkTransactionStatus(currentTxHash);

          if (!confirmed) {
            return {
              success: true,
              gameId,
              txHash: currentTxHash,
              isPending: true,
              pendingResult,
            };
          }

          const gameResult = await getGameResult(gameId);

          if (gameResult.success && gameResult.finished) {
            const resultValue = gameResult.result || 0;
            const gameOutcome = getResultFromDiff(resultValue);

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

            updateStats();

            return {
              success: true,
              gameId,
              isComplete: true,
              result: gameOutcome,
            };
          }
        }

        const resolution = await resolveGameAsync(gameId);

        if (!resolution.success) {
          throw new Error(resolution.error || "Failed to resolve game");
        }

        if (resolution.txHash) {
          setTransactionHash(resolution.txHash);
        }

        if (
          resolution.pendingResult !== undefined &&
          resolution.pendingResult >= 0
        ) {
          setPendingResult(resolution.pendingResult);

          const gameResult = await getGameResult(gameId);
          if (gameResult.success && gameResult.finished) {
            const resultValue = gameResult.result || 0;
            const gameOutcome = getResultFromDiff(resultValue);

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
          txHash: resolution.txHash,
          isPending: true,
          pendingResult: resolution.pendingResult,
        };
      } catch (error) {
        setIsResolutionPending(false);
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError("Failed to resolve game");
        }
        setPhase(GamePhase.ERROR);
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

        // Start async resolution
        setPhase(GamePhase.REVEALING);
        return resolveGameAsyncMutation.mutateAsync(gameId);
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

  useEffect(() => {
    if (!isResolutionPending || !gameUIState.gameId) {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        await resolveGameAsyncMutation.mutateAsync(
          gameUIState.gameId as number
        );
      } catch (error) {
        console.error("Error in polling resolution:", error);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [isResolutionPending, gameUIState.gameId]);

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
