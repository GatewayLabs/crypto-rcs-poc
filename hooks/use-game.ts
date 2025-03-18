"use client";

import {
  checkBatcherBalance,
  depositToBatcher,
  getGameResult,
  playHouseMove,
} from "@/app/actions/house";
import { useWallet } from "@/contexts/wallet-context";
import { Move } from "@/lib/crypto";
import { soundEffects } from "@/lib/sounds/sound-effects";
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
  const { createGame: contractCreateGame, joinGame: contractJoinGame } =
    useGameContract();

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

    // Game state
    betValue,
    isCreatingGame,
    isJoiningGame,

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

    // Actions for states
    setBetValue,
    setIsCreatingGame,
    setIsJoiningGame,
  } = useGameUIStore();

  // Local state for batcher balance
  const [batcherBalance, setBatcherBalance] = useState<bigint | null>(null);

  //-----------------------------------------------------------------------
  // Utility Functions
  //-----------------------------------------------------------------------

  // Check batcher balance
  const checkBalance = useCallback(async () => {
    const result = await checkBatcherBalance();
    if (result.success && result.balance) {
      setBatcherBalance(result.balance);
      return result.balance;
    }
    return null;
  }, []);

  // Ensure batcher has enough funds
  const ensureBatcherFunds = useCallback(
    async (requiredAmount: bigint) => {
      // First check current balance
      const currentBalance = await checkBalance();
      if (!currentBalance) return false;

      // If enough funds, return success
      if (currentBalance >= requiredAmount) {
        return true;
      }

      // Otherwise, deposit more funds
      const shortfall = requiredAmount - currentBalance;
      // Add 10% buffer
      const depositAmount = (shortfall * 110n) / 100n;

      const depositResult = await depositToBatcher(depositAmount);
      if (!depositResult.success) {
        console.error("Failed to deposit to batcher:", depositResult.error);
        return false;
      }

      // Wait for deposit confirmation
      await new Promise((r) => setTimeout(r, 2000));

      // Check balance again
      await checkBalance();
      return true;
    },
    [checkBalance]
  );

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
    setError(null);
  }, [setPhase, setIsCreatingGame, setIsJoiningGame, setError]);

  // Convert game difference to result
  function getResultFromDiff(diff: number | undefined) {
    if (diff === undefined) return GameResult.DRAW;

    // Normalize the diff modulo 3
    const normalizedDiff = ((diff % 3) + 3) % 3;

    if (normalizedDiff === 0) return GameResult.DRAW;
    if (normalizedDiff === 1) return GameResult.WIN;
    return GameResult.LOSE;
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

  //-----------------------------------------------------------------------
  // Check batcher balance on mount
  //-----------------------------------------------------------------------
  useEffect(() => {
    checkBalance();
  }, [checkBalance]);

  //-----------------------------------------------------------------------
  // Game Creation Mutation
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

        // Ensure batcher has enough funds
        const hasFunds = await ensureBatcherFunds(betAmount);
        if (!hasFunds) {
          throw new Error(
            "House does not have enough funds. Please try again later."
          );
        }

        // Create game on-chain
        const gameId = await contractCreateGame(move, betAmount);
        setGameId(gameId);
        setPhase(GamePhase.WAITING);
        setTransactionModal(true, "validate");

        // Let house make its move with the batched flow
        const houseResult = await playHouseMove(gameId, betAmount);

        if (!houseResult.success) {
          throw new Error(houseResult.error || "Failed to play house move");
        }

        // Set transaction hash for history
        if (houseResult.hash) {
          setTransactionHash(houseResult.hash);
        }

        // Process the result immediately
        if (houseResult.result !== null || houseResult.result !== undefined) {
          const gameOutcome = getResultFromDiff(houseResult.result);

          setHouseMove(inferHouseMove(gameOutcome, move));

          setResult(gameOutcome);

          // Play sound effect based on outcome
          if (gameOutcome === GameResult.WIN) soundEffects.win();
          else if (gameOutcome === GameResult.LOSE) soundEffects.lose();
          else soundEffects.draw();

          // Update UI to finished state
          setTransactionModal(false);
          setPhase(GamePhase.FINISHED);

          // Update stats if we have all the data
          if (address && betValue !== null) {
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
              playerMove: move,
              houseMove: inferHouseMove(gameOutcome, move),
              result: gameOutcome,
              transactionHash: houseResult.hash || "",
              betAmount: betValue,
            });

            // Update global stats
            updateStats();
          }

          // Refresh batcher balance
          checkBalance();
        }

        return {
          success: true,
          gameId,
          txHash: houseResult.hash,
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
        setTransactionModal(true, "validate");

        // Join game on-chain
        await contractJoinGame(gameId, move, betAmount);

        // Check game result directly (no resolution flow needed)
        const resultCheck = await getGameResult(gameId);

        if (
          resultCheck.success &&
          resultCheck.finished &&
          resultCheck.result !== undefined
        ) {
          // Game is already finished - display result immediately
          const gameOutcome = getResultFromDiff(resultCheck.result);
          setResult(gameOutcome);

          // Infer the house move from the result
          if (move) {
            const inferredHouseMove = inferHouseMove(gameOutcome, move);
            setHouseMove(inferredHouseMove);
          }

          // Play sound effect based on outcome
          if (gameOutcome === GameResult.WIN) soundEffects.win();
          else if (gameOutcome === GameResult.LOSE) soundEffects.lose();
          else soundEffects.draw();

          // Update UI to finished state
          setTransactionModal(false);
          setPhase(GamePhase.FINISHED);

          // Update stats
          if (address && move && betValue !== null) {
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
              playerMove: move,
              houseMove: inferHouseMove(gameOutcome, move),
              result: gameOutcome,
              transactionHash: transactionHash || "",
              betAmount: betValue,
            });

            updateStats();
          }
        } else {
          // Game is still processing - this is unexpected since we should get results immediately
          // but we'll handle it gracefully by checking again after a delay
          setTimeout(async () => {
            const finalCheck = await getGameResult(gameId);
            if (
              finalCheck.success &&
              finalCheck.finished &&
              finalCheck.result !== undefined
            ) {
              const gameOutcome = getResultFromDiff(finalCheck.result);
              setResult(gameOutcome);

              if (move) {
                const inferredHouseMove = inferHouseMove(gameOutcome, move);
                setHouseMove(inferredHouseMove);
              }

              setTransactionModal(false);
              setPhase(GamePhase.FINISHED);

              // Update stats
              if (address && move && betValue !== null) {
                updateStats();
              }
            } else {
              // Something went wrong
              setError(
                "Game resolution failed. Please check game status later."
              );
              setPhase(GamePhase.ERROR);
            }
          }, 5000);
        }

        return { success: true, gameId };
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

  // Handle visibility changes (tab switching)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (
        document.visibilityState === "visible" &&
        gameId &&
        !result &&
        phase !== GamePhase.FINISHED
      ) {
        try {
          // Check if the game is already finished on visibility change
          const resultCheck = await getGameResult(gameId);

          if (
            resultCheck.success &&
            resultCheck.finished &&
            resultCheck.result !== undefined
          ) {
            const gameOutcome = getResultFromDiff(resultCheck.result);
            setResult(gameOutcome);

            if (playerMove) {
              const inferredHouseMove = inferHouseMove(
                gameOutcome,
                playerMove as Move
              );
              setHouseMove(inferredHouseMove);
            }

            setTransactionModal(false);
            setPhase(GamePhase.FINISHED);
            // updateStats();
          }
        } catch (error) {
          console.error(
            "Error checking game status on visibility change:",
            error
          );
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
    playerMove,
    setPhase,
    setResult,
    setHouseMove,
    setTransactionModal,
    updateStats,
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
    revertToChoosing,

    // Batcher balance
    batcherBalance,
    refreshBatcherBalance: checkBalance,

    // Loading states from store
    isCreatingGame,
    isJoiningGame,

    // Computed states - always false now because we don't need resolution flow
    isResolutionPending: false,
    isRevealingGame: false,
    isComputingDifference: false,
    isFinalizingGame: false,

    // Bet defaults
    defaultBetAmount: DEFAULT_BET_AMOUNT,
    defaultBetAmountWei: DEFAULT_BET_AMOUNT_WEI,

    // Game result info from store
    betValue,
  };
}
