'use client';

import {
  finalizeGame,
  getGameResult,
  playHouseMove,
} from '@/app/actions/house';
import { useWallet } from '@/contexts/wallet-context';
import { Move } from '@/lib/crypto';
import { soundEffects } from '@/lib/sounds/sound-effects';
import { useGameUIStore } from '@/stores/game-ui-store';
import { GamePhase, GameResult } from '@/types/game';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { formatEther } from 'viem';
import {
  DEFAULT_BET_AMOUNT,
  DEFAULT_BET_AMOUNT_WEI,
  useGameContract,
} from './use-game-contract';
import { useLeaderboard } from './use-leaderboard';
import { useMatches } from './use-matches';

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

    // Game state
    betValue,
    isCreatingGame,
    isJoiningGame,
    isResolutionPending,

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
    setIsResolutionPending,
  } = useGameUIStore();

  // Simple fallback state for rare cases where we need finalization
  const [needsFinalization, setNeedsFinalization] = useState(false);

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

      if (results.every((result) => result.status === 'fulfilled')) {
        console.log('Game stats updated successfully');
      } else {
        console.warn('Some game stats updates failed');
      }
    } catch (error) {
      console.error('Error updating game stats:', error);
    }
  }, [updateLeaderboard, addMatch]);

  const revertToChoosing = useCallback(() => {
    setPhase(GamePhase.CHOOSING);
    setIsCreatingGame(false);
    setIsJoiningGame(false);
    setIsResolutionPending(false);
    setError(null);
    setNeedsFinalization(false);
  }, [
    setPhase,
    setIsCreatingGame,
    setIsJoiningGame,
    setIsResolutionPending,
    setError,
  ]);

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
      return userMove === 'ROCK'
        ? 'SCISSORS'
        : userMove === 'PAPER'
        ? 'ROCK'
        : 'PAPER';
    }

    if (gameResult === GameResult.LOSE) {
      return userMove === 'ROCK'
        ? 'PAPER'
        : userMove === 'PAPER'
        ? 'SCISSORS'
        : 'ROCK';
    }

    return userMove; // For DRAW
  }

  // Process game result and update UI/stats
  const processGameResult = useCallback(
    (
      gameId: number,
      diffMod3: number | undefined,
      playerMoveParam: Move | null | undefined, // Add explicit player move parameter
      txHash: string | undefined,
    ) => {
      if (diffMod3 === undefined) {
        return false;
      }

      // Use the provided playerMove parameter or fall back to state
      const currentPlayerMove = playerMoveParam || playerMove;

      if (!currentPlayerMove) {
        return false;
      }

      // Calculate game outcome
      const gameOutcome = getResultFromDiff(diffMod3);
      setResult(gameOutcome);

      // Infer house move from player move and result
      const inferredHouseMove = inferHouseMove(gameOutcome, currentPlayerMove);
      setHouseMove(inferredHouseMove);

      // Play appropriate sound effect
      if (gameOutcome === GameResult.WIN) soundEffects.win();
      else if (gameOutcome === GameResult.LOSE) soundEffects.lose();
      else soundEffects.draw();

      // Update UI state
      setTransactionModal(false);
      setPhase(GamePhase.FINISHED);
      setIsResolutionPending(false);
      setNeedsFinalization(false);

      // Update transaction hash if provided
      if (txHash) {
        setTransactionHash(txHash);
      }

      // Update stats if we have all required data
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
          gameId,
        );

        addLocalMatch({
          gameId: gameId,
          playerMove: currentPlayerMove,
          houseMove: inferredHouseMove,
          result: gameOutcome,
          transactionHash: txHash || transactionHash || '',
          betAmount: betValue,
        });
        return true;
      } else {
        return false;
      }
    },
    [
      playerMove,
      betValue,
      address,
      setResult,
      setHouseMove,
      setTransactionModal,
      setPhase,
      setIsResolutionPending,
      setTransactionHash,
      updateLocalLeaderboard,
      addLocalMatch,
      updateStats,
      transactionHash,
      inferHouseMove,
      getResultFromDiff,
    ],
  );

  //-----------------------------------------------------------------------
  // Finalization Mutation (Fallback)
  //-----------------------------------------------------------------------

  const finalizeGameMutation = useMutation({
    mutationFn: async (gameId: number) => {
      try {
        setIsResolutionPending(true);

        // Call the finalization action
        const result = await finalizeGame(gameId);

        if (!result.success) {
          throw new Error(result.error || 'Failed to finalize game');
        }

        // Process result and update UI
        processGameResult(
          gameId,
          result.diffMod3,
          undefined,
          result.finalizeHash,
        );

        return {
          success: true,
          gameId,
          result: result.diffMod3,
        };
      } catch (error) {
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError('Failed to finalize game');
        }

        setPhase(GamePhase.ERROR);
        throw error;
      } finally {
        setIsResolutionPending(false);
        setNeedsFinalization(false);
      }
    },
  });

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

        // Create game on-chain
        const gameId = await contractCreateGame(move, betAmount);
        setGameId(gameId);
        setPhase(GamePhase.WAITING);
        setTransactionModal(true, 'validate');

        // Let house make its move with the optimistic batched flow
        const houseResult = await playHouseMove(gameId, betAmount);

        if (!houseResult.success) {
          throw new Error(houseResult.error || 'Failed to play house move');
        }

        // Store transaction hashes
        const txHash = houseResult.finalizeHash || houseResult.batchHash;
        if (txHash) {
          setTransactionHash(txHash);
        }

        // Check if we have all we need to process the result
        if (houseResult.diffMod3 !== undefined && houseResult.finalizeHash) {
          // Process the result immediately if finalize was successful
          processGameResult(gameId, houseResult.diffMod3, move, txHash);
        } else if (houseResult.diffMod3 !== undefined) {
          // We have the diff but finalization failed, need to retry finalization
          setPhase(GamePhase.REVEALING);
          setIsResolutionPending(true);

          // Try finalization with a delay
          setTimeout(() => {
            finalizeGameMutation.mutate(gameId);
          }, 5000);
        } else {
          // Something went wrong, but we have the batch hash
          setPhase(GamePhase.REVEALING);
          setIsResolutionPending(true);

          // Try to check game status and recover
          setTimeout(async () => {
            try {
              const gameStatus = await getGameResult(gameId);
              if (gameStatus.success && gameStatus.result !== undefined) {
                processGameResult(gameId, gameStatus.result, move, txHash);
              } else {
                finalizeGameMutation.mutate(gameId);
              }
            } catch (error) {
              console.error('Error checking game status:', error);
              finalizeGameMutation.mutate(gameId);
            }
          }, 5000);
        }

        return {
          success: true,
          gameId,
          txHash,
        };
      } catch (error) {
        // Handle errors
        if (error instanceof Error) {
          if (!error.message.includes('rejected the request')) {
            setError(error.message);
          }
        } else {
          setError('Failed to create game');
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
        setTransactionModal(true, 'validate');

        // Join game on-chain
        await contractJoinGame(gameId, move, betAmount);

        // Check game result immediately (optimistically)
        const resultCheck = await getGameResult(gameId);

        if (resultCheck.success && resultCheck.result !== undefined) {
          // Process the result immediately, regardless of whether it's officially "finished"
          const processed = processGameResult(
            gameId,
            resultCheck.result,
            undefined,
            undefined,
          );

          if (processed) {
            return { success: true, gameId };
          }
        }

        // If we couldn't process immediately, try finalization
        setPhase(GamePhase.REVEALING);
        setIsResolutionPending(true);
        setNeedsFinalization(true);

        // Call finalization after a short delay
        setTimeout(() => {
          if (needsFinalization && gameId) {
            finalizeGameMutation.mutate(gameId);
          }
        }, 2000);

        return { success: true, gameId };
      } catch (error) {
        // Handle errors
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError('Failed to join game');
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

  // Simple polling for finalization (only as fallback)
  useEffect(() => {
    if (!needsFinalization || !gameId) {
      return;
    }

    // Set up a check that will run every 5 seconds if we still need finalization
    const pollingInterval = setInterval(async () => {
      try {
        if (!needsFinalization || !gameId) {
          clearInterval(pollingInterval);
          return;
        }

        // Check if the game is finalized
        const resultCheck = await getGameResult(gameId);

        if (resultCheck.success && resultCheck.result !== undefined) {
          // Try to process the result
          const processed = processGameResult(
            gameId,
            resultCheck.result,
            undefined,
            undefined,
          );

          if (processed) {
            // Clear polling if processed successfully
            setNeedsFinalization(false);
            clearInterval(pollingInterval);
          } else {
            // If not processed but we have a result, try finalization
            finalizeGameMutation.mutate(gameId);
          }
        }
      } catch (error) {
        console.error('Error in finalization polling:', error);
      }
    }, 5000);

    return () => clearInterval(pollingInterval);
  }, [needsFinalization, gameId, processGameResult, finalizeGameMutation]);

  // Handle visibility changes (tab switching)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (
        document.visibilityState === 'visible' &&
        gameId &&
        !result &&
        phase !== GamePhase.FINISHED
      ) {
        try {
          // Check current game status when tab becomes visible
          const resultCheck = await getGameResult(gameId);

          if (resultCheck.success && resultCheck.result !== undefined) {
            // Try to process the result
            processGameResult(gameId, resultCheck.result, undefined, undefined);
          } else if (needsFinalization) {
            // If we need finalization, try again
            finalizeGameMutation.mutate(gameId);
          }
        } catch (error) {
          console.error(
            'Error checking game status on visibility change:',
            error,
          );
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    gameId,
    phase,
    result,
    needsFinalization,
    processGameResult,
    finalizeGameMutation,
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
      betAmount = DEFAULT_BET_AMOUNT_WEI,
    ) => joinGameMutation.mutate({ gameId, move, betAmount }),
    resetGame: resetGameState,
    retryResolution: (gameId: number) => finalizeGameMutation.mutate(gameId),
    revertToChoosing,

    // Loading states from store
    isCreatingGame,
    isJoiningGame,
    isResolutionPending,

    // Computed states
    isRevealingGame: isResolutionPending || needsFinalization,
    isComputingDifference: false, // No longer needed
    isFinalizingGame: finalizeGameMutation.isPending,

    // Bet defaults
    defaultBetAmount: DEFAULT_BET_AMOUNT,
    defaultBetAmountWei: DEFAULT_BET_AMOUNT_WEI,

    // Game result info from store
    betValue,
  };
}
