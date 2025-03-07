import { playHouseMove, resolveGameAsync } from "@/app/actions/house";
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
import { formatEther } from "viem";
import { useWallet } from "@/contexts/wallet-context";

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

  // Game resolution state
  const [isResolutionPending, setIsResolutionPending] = useState(false);
  const [pendingResult, setPendingResult] = useState<number | null>(null);
  const [betValue, setBetValue] = useState<bigint>(DEFAULT_BET_AMOUNT_WEI);

  // Polling state
  const [pollingState, setPollingState] = useState({
    isPolling: false,
    pollCount: 0,
    lastTxHash: null as string | null,
    pollStartTime: 0,
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

  const startOrUpdatePolling = useCallback((txHash: string | null = null) => {
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
      };
    });
  }, []);

  const stopPolling = useCallback(() => {
    setIsResolutionPending(false);
    setPollingState((prev) => ({
      ...prev,
      isPolling: false,
    }));
  }, []);

  //-----------------------------------------------------------------------
  // Game Resolution Mutation
  //-----------------------------------------------------------------------

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

            const houseMove = gameUIState.playerMove
              ? inferHouseMove(gameOutcome, gameUIState.playerMove as Move)
              : ("ROCK" as Move);

            setHouseMove(houseMove);

            if (address && gameUIState.playerMove) {
              let betValueChange = 0n;

              if (gameOutcome === GameResult.WIN) {
                betValueChange = BigInt(betValue);
              } else if (gameOutcome === GameResult.LOSE) {
                betValueChange = BigInt(-betValue);
              }

              updateLocalLeaderboard(
                address,
                gameOutcome,
                Number(formatEther(betValueChange))
              );

              addLocalMatch({
                gameId: gameId,
                playerMove: gameUIState.playerMove as Move,
                houseMove: houseMove,
                result: gameOutcome,
                transactionHash: gameUIState.transactionHash || "",
                betAmount: betValueChange,
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

      try {
        // Set initial state
        setPlayerMove(move);
        setPhase(GamePhase.SELECTED);

        // Create game on-chain
        const gameId = await contractCreateGame(move, betAmount);
        setGameId(gameId);

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
      }
    },
  });

  //-----------------------------------------------------------------------
  // Side Effects
  //-----------------------------------------------------------------------

  // Adaptive polling based on elapsed time
  useEffect(() => {
    if (!pollingState.isPolling || !gameUIState.gameId) {
      return;
    }

    // Calculate adaptive polling interval
    const elapsedTimeMs = Date.now() - pollingState.pollStartTime;
    let pollIntervalMs: number;

    if (elapsedTimeMs < 5000) {
      pollIntervalMs = 1000; // 0-5 seconds: poll every 1s
    } else if (elapsedTimeMs < 15000) {
      pollIntervalMs = 2000; // 5-15 seconds: poll every 2s
    } else if (elapsedTimeMs < 30000) {
      pollIntervalMs = 3000; // 15-30 seconds: poll every 3s
    } else {
      pollIntervalMs = 5000; // After 30 seconds: poll every 5s
    }

    // Add jitter to prevent synchronization
    const jitter = Math.random() * 300;
    const finalInterval = pollIntervalMs + jitter;

    const timeoutId = setTimeout(async () => {
      try {
        if (!gameUIState.gameId) return;

        // Only poll if game is still active
        if (
          gameUIState.phase !== GamePhase.FINISHED &&
          gameUIState.phase !== GamePhase.ERROR
        ) {
          await resolveGameAsyncMutation.mutateAsync(gameUIState.gameId);
        } else {
          stopPolling();
        }
      } catch (error) {
        console.error("Error in polling resolution:", error);

        // Time out after 60 seconds of polling
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

  // Monitor contract game state changes
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

  // Handle visibility changes (tab switching)
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

  // Reset game state
  const resetGame = useCallback(() => {
    setIsResolutionPending(false);
    setPendingResult(null);
    resetGameState();
  }, [resetGameState]);

  //-----------------------------------------------------------------------
  // Return hook API
  //-----------------------------------------------------------------------

  return {
    // Game state
    gameState: gameUIState,
    phase: gameUIState.phase,

    // Game actions
    createGame: (move: Move, betAmount = DEFAULT_BET_AMOUNT_WEI) =>
      createGameMutation.mutate({ move, betAmount }),
    joinGame: (
      gameId: number,
      move: Move,
      betAmount = DEFAULT_BET_AMOUNT_WEI
    ) => joinGameMutation.mutate({ gameId, move, betAmount }),
    resetGame,
    retryResolution: (gameId: number) =>
      resolveGameAsyncMutation.mutate(gameId),

    // Loading states
    isCreatingGame: createGameMutation.isPending,
    isJoiningGame: joinGameMutation.isPending,
    isResolutionPending,
    isRevealingGame: isResolutionPending,
    isComputingDifference: resolveGameAsyncMutation.isPending,
    isFinalizingGame: resolveGameAsyncMutation.isPending,

    // Bet defaults
    defaultBetAmount: DEFAULT_BET_AMOUNT,
    defaultBetAmountWei: DEFAULT_BET_AMOUNT_WEI,

    // Game result info
    pendingResult,
  };
}
