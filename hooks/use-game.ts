/* eslint-disable @typescript-eslint/no-explicit-any */
import { playHouseMove, resolveGameAsync } from "@/app/actions/house";
import { useWallet } from "@/contexts/wallet-context";
import { Move } from "@/lib/crypto";
import { useGameUIStore } from "@/stores/game-ui-store";
import { GamePhase, GameResult } from "@/types/game";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { formatEther } from "viem";
import {
  DEFAULT_BET_AMOUNT,
  DEFAULT_BET_AMOUNT_WEI,
  useGameContract,
} from "./use-game-contract";
import { useLeaderboard } from "./use-leaderboard";
import { useMatches } from "./use-matches";

export function useGame() {
  //-----------------------------------------------------------------------
  // Dependencies & State
  //-----------------------------------------------------------------------
  const {
    createGame: contractCreateGame,
    joinGame: contractJoinGame,
    gameInfo,
  } = useGameContract();

  const { updateLocalLeaderboard, updateLeaderboard } = useLeaderboard();
  const { addLocalMatch, addMatch } = useMatches();
  const { walletAddress: address } = useWallet();

  // Use the game UI store for state management
  const {
    playerMove,
    phase,
    result,
    gameId,
    transactionHash,

    // New states from the store
    betValue,
    isCreatingGame,
    isJoiningGame,
    isResolutionPending,
    pendingResult,

    // Actions
    setPlayerMove,
    setHouseMove,
    setPhase,
    setResult,
    setError,
    setGameId,
    setTransactionHash,
    setTransactionModal,
    resetGameState,

    // Actions for new states
    setBetValue,
    setIsCreatingGame,
    setIsJoiningGame,
    setIsResolutionPending,
    setPendingResult,
  } = useGameUIStore();

  // Polling state (internal to the hook)
  const [pollingState, setPollingState] = useState({
    isPolling: false,
    pollCount: 0,
    lastTxHash: null as string | null,
    pollStartTime: 0,
    errorCount: 0,
  });

  //-----------------------------------------------------------------------
  // Utility Functions
  //-----------------------------------------------------------------------

  // Update leaderboard and match history stats
  const updateStats = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        updateLeaderboard(),
        addMatch(),
      ]);

      if (results.every((result) => result.status === "fulfilled")) {
        console.log("Game stats updated successfully");
      } else {
        console.warn("Some game stats updates failed");
      }
    } catch (error) {
      console.error("Error updating game stats:", error);
    }
  }, [updateLeaderboard, addMatch]);

  const revertToChoosing = useCallback(() => {
    setPhase(GamePhase.CHOOSING);
    setIsCreatingGame(false);
    setIsJoiningGame(false);
    setIsResolutionPending(false);
    setError(null);
  }, [
    setPhase,
    setIsCreatingGame,
    setIsJoiningGame,
    setIsResolutionPending,
    setError,
  ]);

  // Determine game phase from contract data
  function determineGamePhase(gameInfo: any) {
    if (!gameInfo) return GamePhase.CHOOSING;

    const [playerB, finished, bothCommitted] = gameInfo;

    if (finished) return GamePhase.FINISHED;
    if (bothCommitted) return GamePhase.REVEALING;
    if (playerB !== "0x0000000000000000000000000000000000000000")
      return GamePhase.WAITING;

    return GamePhase.SELECTED;
  }

  // Infer house move based on player move and result
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

    return userMove; // For DRAW
  }

  // Convert game difference to result
  function getResultFromDiff(diff: number | undefined) {
    if (diff === undefined) return GameResult.DRAW;

    // Normalize the diff modulo 3
    const normalizedDiff = ((diff % 3) + 3) % 3;

    if (normalizedDiff === 0) return GameResult.DRAW;
    if (normalizedDiff === 1) return GameResult.WIN;
    return GameResult.LOSE;
  }

  //-----------------------------------------------------------------------
  // Polling Management
  //-----------------------------------------------------------------------

  const startOrUpdatePolling = useCallback(
    (txHash: string | null = null) => {
      setIsResolutionPending(true);
      setPollingState((prev) => {
        const now = Date.now();
        const isNew = !prev.isPolling || txHash !== prev.lastTxHash;
        const pollCount = isNew ? 0 : prev.pollCount + 1;

        return {
          isPolling: true,
          pollCount,
          lastTxHash: txHash || prev.lastTxHash,
          pollStartTime: isNew ? now : prev.pollStartTime,
          errorCount: 0,
        };
      });
    },
    [setIsResolutionPending]
  );

  const stopPolling = useCallback(() => {
    setIsResolutionPending(false);
    setPollingState((prev) => ({
      ...prev,
      isPolling: false,
    }));
  }, [setIsResolutionPending]);

  //-----------------------------------------------------------------------
  // Game Resolution Mutation
  //-----------------------------------------------------------------------

  const resolveGameAsyncMutation = useMutation({
    mutationFn: async (gameId: number) => {
      try {
        // Call the server action
        const result = await resolveGameAsync(gameId);

        if (phase === GamePhase.FINISHED && result) {
          console.log("Game already finished, skipping resolution");
          return {
            success: true,
            gameId,
            isComplete: true,
            result: result,
          };
        }

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

            const inferredHouseMove = playerMove
              ? inferHouseMove(gameOutcome, playerMove as Move)
              : ("ROCK" as Move);

            setHouseMove(inferredHouseMove);

            if (address && playerMove && betValue !== null) {
              let betValueChange = 0n;

              if (gameOutcome === GameResult.WIN) {
                betValueChange = betValue;
              } else if (gameOutcome === GameResult.LOSE) {
                betValueChange = -betValue;
              }

              updateLocalLeaderboard(
                address,
                gameOutcome,
                Number(formatEther(betValueChange)),
                gameId
              );

              addLocalMatch({
                gameId: gameId,
                playerMove: playerMove as Move,
                houseMove: inferredHouseMove,
                result: gameOutcome,
                transactionHash: transactionHash || "",
                betAmount: betValue,
              });
            }

            setIsResolutionPending(false);
            setTransactionHash(null);
            setTransactionModal(false);
            stopPolling();

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
        if (error instanceof Error) {
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

  //-----------------------------------------------------------------------
  // Create Game Mutation
  //-----------------------------------------------------------------------

  const createGameMutation = useMutation({
    mutationFn: async (params: { move: Move; betAmount?: bigint }) => {
      const { move, betAmount = DEFAULT_BET_AMOUNT_WEI } = params;
      setBetValue(betAmount);
      setIsCreatingGame(true);

      try {
        // Set initial state
        setPlayerMove(move);
        setPhase(GamePhase.SELECTED);

        // Create game on-chain
        const gameId = await contractCreateGame(move, betAmount);
        setGameId(gameId);
        setPhase(GamePhase.WAITING);

        // Let house make its move
        const houseResult = await playHouseMove(gameId, betAmount);
        if (!houseResult.success) {
          throw new Error(houseResult.error || "Failed to play house move");
        }

        // Start resolution process
        startOrUpdatePolling(houseResult.hash);
        setPhase(GamePhase.REVEALING);
        resolveGameAsyncMutation.mutate(gameId);

        return {
          success: true,
          gameId,
          txHash: houseResult.hash,
          move: houseResult.move,
        };
      } catch (error) {
        // Handle errors
        if (error instanceof Error) {
          if (!error.message.includes("rejected the request")) {
            setError(error.message);
          }
        } else {
          setError("Failed to create game");
        }
        setPhase(GamePhase.ERROR);
        throw error;
      } finally {
        setIsCreatingGame(false);
      }
    },
  });

  //-----------------------------------------------------------------------
  // Join Game Mutation
  //-----------------------------------------------------------------------

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
        setBetValue(betAmount);
        setIsJoiningGame(true);

        // Set initial state
        setPlayerMove(move);
        setPhase(GamePhase.WAITING);

        // Join game on-chain
        await contractJoinGame(gameId, move, betAmount);

        // Start resolution process
        setPhase(GamePhase.REVEALING);
        return resolveGameAsyncMutation.mutateAsync(gameId);
      } catch (error) {
        // Handle errors
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError("Failed to join game");
        }
        setPhase(GamePhase.ERROR);
        throw error;
      } finally {
        setIsJoiningGame(false);
      }
    },
  });

  //-----------------------------------------------------------------------
  // Side Effects
  //-----------------------------------------------------------------------

  // Adaptive polling based on elapsed time
  useEffect(() => {
    if (!pollingState.isPolling || !gameId || phase === GamePhase.FINISHED) {
      return;
    }

    // Exponential backoff with jitter
    const elapsedTimeMs = Date.now() - pollingState.pollStartTime;
    const baseInterval = Math.min(
      3000 * Math.pow(1.5, Math.floor(elapsedTimeMs / 10000)),
      15000
    );

    // Add jitter (±20%)
    const jitter = baseInterval * (0.8 + Math.random() * 0.4);

    // Circuit breaker - if too many consecutive errors, slow down even more
    const errorCount = pollingState.errorCount || 0;
    const circuitFactor = errorCount > 3 ? 2 : 1;

    const finalInterval = jitter * circuitFactor;

    const timeoutId = setTimeout(async () => {
      try {
        if (!gameId) return;

        if (phase !== GamePhase.ERROR) {
          await resolveGameAsyncMutation.mutateAsync(gameId);
          setPollingState((prev) => ({ ...prev, errorCount: 0 }));
        } else {
          stopPolling();
        }
      } catch (error) {
        console.error("Error in polling resolution:", error);

        setPollingState((prev) => ({
          ...prev,
          errorCount: (prev.errorCount || 0) + 1,
        }));

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
    pollingState.errorCount,
    gameId,
    phase,
    stopPolling,
    setError,
    resolveGameAsyncMutation,
  ]);

  // Monitor contract game state changes
  useEffect(() => {
    if (!gameInfo || !gameId) return;

    const currentPhase = determineGamePhase(gameInfo);

    if (currentPhase !== phase) {
      setPhase(currentPhase);

      if (currentPhase === GamePhase.FINISHED && phase !== GamePhase.FINISHED) {
        updateStats();
      }
    }
  }, [gameInfo, gameId, phase, setPhase, updateStats]);

  // Handle visibility changes (tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && gameId) {
        if (phase === GamePhase.REVEALING || phase === GamePhase.WAITING) {
          if (result) {
            setPhase(GamePhase.FINISHED);
            updateStats();
          } else if (isResolutionPending) {
            resolveGameAsyncMutation.mutate(gameId);
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    gameId,
    phase,
    result,
    isResolutionPending,
    setPhase,
    updateStats,
    resolveGameAsyncMutation,
  ]);

  //-----------------------------------------------------------------------
  // Return hook API
  //-----------------------------------------------------------------------

  return {
    // Game actions
    createGame: (move: Move, betAmount = DEFAULT_BET_AMOUNT_WEI) =>
      createGameMutation.mutate({ move, betAmount }),
    joinGame: (
      gameId: number,
      move: Move,
      betAmount = DEFAULT_BET_AMOUNT_WEI
    ) => joinGameMutation.mutate({ gameId, move, betAmount }),
    resetGame: resetGameState,
    retryResolution: (gameId: number) =>
      resolveGameAsyncMutation.mutate(gameId),
    revertToChoosing,

    // Loading states from store
    isCreatingGame,
    isJoiningGame,
    isResolutionPending,

    // Computed states
    isRevealingGame: isResolutionPending,
    isComputingDifference: resolveGameAsyncMutation.isPending,
    isFinalizingGame: resolveGameAsyncMutation.isPending,

    // Bet defaults
    defaultBetAmount: DEFAULT_BET_AMOUNT,
    defaultBetAmountWei: DEFAULT_BET_AMOUNT_WEI,

    // Game result info from store
    pendingResult,
    betValue,
  };
}
