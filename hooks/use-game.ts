import { playHouseMove, resolveGame } from '@/app/actions/house';
import { Move } from '@/lib/crypto';
import { useGameUIStore } from '@/stores/game-ui-store';
import { GamePhase, GameResult } from '@/types/game';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { formatEther } from 'viem';
import { useAccount } from 'wagmi';
import {
  DEFAULT_BET_AMOUNT,
  DEFAULT_BET_AMOUNT_WEI,
  useGameContract,
} from './use-game-contract';
import { useLeaderboard } from './use-leaderboard';
import { useMatches } from './use-matches';

export function useGame() {
  const {
    createGame: contractCreateGame,
    joinGame: contractJoinGame,
    submitMoves,
    computeDifference,
    finalizeGame,
    gameInfo,
  } = useGameContract();

  const { address } = useAccount();
  const { updateLeaderboard, updateLocalLeaderboard } = useLeaderboard();
  const { addMatch, addLocalMatch } = useMatches();

  const gameUIState = useGameUIStore();
  const {
    setPlayerMove,
    setHouseMove,
    setPhase,
    setResult,
    setError,
    setGameId,
    setTransactionHash,
    resetGameState,
  } = useGameUIStore();

  const updateStats = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        updateLeaderboard(),
        addMatch(),
      ]);

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Error in update operation ${index}:`, result.reason);
        }
      });

      if (results.every((result) => result.status === 'fulfilled')) {
        console.log('Game stats updated successfully');
      } else {
        console.warn('Some game stats updates failed');
      }
    } catch (error) {
      console.error('Error updating game stats:', error);
    }
  }, [updateLeaderboard, addMatch]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function determineGamePhase(gameInfo: any) {
    if (!gameInfo) return GamePhase.CHOOSING;

    const [playerB, finished, bothCommitted] = gameInfo;

    if (finished) {
      return GamePhase.FINISHED;
    }

    if (bothCommitted) {
      return GamePhase.REVEALING;
    }

    if (playerB !== '0x0000000000000000000000000000000000000000') {
      return GamePhase.WAITING;
    }

    return GamePhase.SELECTED;
  }

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

    return userMove;
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
          throw new Error(houseResult.error || 'Failed to play house move');
        }

        setPhase(GamePhase.REVEALING);
        const resolveResult = await resolveGame(gameId);
        if (!resolveResult.success) {
          throw new Error(resolveResult.error || 'Failed to resolve game');
        }

        const gameResult =
          resolveResult.result === 0
            ? GameResult.DRAW
            : resolveResult.result === 1
            ? GameResult.WIN
            : GameResult.LOSE;

        setHouseMove(inferHouseMove(gameResult, move));
        setResult(gameResult);
        setPhase(GamePhase.FINISHED);

        const txHash = resolveResult.hash || '';
        if (txHash) {
          setTransactionHash(txHash);
        }

        // Update local leaderboard
        if (address) {
          updateLocalLeaderboard(
            address,
            gameResult as unknown as 'WIN' | 'LOSE' | 'DRAW',
            Number(formatEther(betAmount)),
          );

          addLocalMatch({
            gameId,
            playerMove: move,
            result: gameResult,
            transactionHash: txHash,
            houseMove: inferHouseMove(gameResult, move),
            betAmount,
          });
        }

        return {
          gameId,
          playerMove: move,
          phase: GamePhase.FINISHED,
          result: gameResult,
          transactionHash: txHash,
          houseMove: inferHouseMove(gameResult, move),
          betAmount,
        };
      } catch (error) {
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError('Failed to create game');
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

        const resolveResult = await resolveGame(gameId);
        if (!resolveResult.success) {
          throw new Error(resolveResult.error || 'Failed to resolve game');
        }

        const gameResult =
          resolveResult.result === 0
            ? GameResult.DRAW
            : resolveResult.result === 1
            ? GameResult.WIN
            : GameResult.LOSE;

        setHouseMove(inferHouseMove(gameResult, move));
        setResult(gameResult);
        setPhase(GamePhase.FINISHED);

        const txHash = resolveResult.hash || '';
        if (txHash) {
          setTransactionHash(txHash);
        }

        return {
          gameId,
          playerMove: move,
          phase: GamePhase.FINISHED,
          result: gameResult,
          transactionHash: txHash,
          houseMove: inferHouseMove(gameResult, move),
          betAmount,
        };
      } catch (error) {
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError('Failed to join game');
        }
        setPhase(GamePhase.ERROR);
        throw error;
      }
    },
  });

  const revealGameMutation = useMutation({
    mutationFn: async (gameId: number) => {
      setPhase(GamePhase.REVEALING);
      await submitMoves(gameId);
      return { gameId };
    },
  });

  const computeDifferenceMutation = useMutation({
    mutationFn: async (gameId: number) => {
      await computeDifference(gameId);
      return { gameId };
    },
  });

  const finalizeGameMutation = useMutation({
    mutationFn: async ({
      gameId,
      diffMod3,
    }: {
      gameId: number;
      diffMod3: number;
    }) => {
      await finalizeGame(gameId, diffMod3);
      await updateStats();
      return { gameId, diffMod3 };
    },
  });

  const resetGame = useCallback(() => {
    resetGameState();
  }, [resetGameState]);

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
      if (document.visibilityState === 'visible' && gameUIState.gameId) {
        if (
          gameUIState.phase === GamePhase.REVEALING ||
          gameUIState.phase === GamePhase.WAITING
        ) {
          if (gameUIState.result) {
            setPhase(GamePhase.FINISHED);
            updateStats();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    gameUIState.gameId,
    gameUIState.phase,
    gameUIState.result,
    setPhase,
    updateStats,
  ]);

  return {
    gameState: gameUIState,
    phase: gameUIState.phase,
    createGame: (move: Move, betAmount = DEFAULT_BET_AMOUNT_WEI) =>
      createGameMutation.mutate({ move, betAmount }),
    joinGame: (
      gameId: number,
      move: Move,
      betAmount = DEFAULT_BET_AMOUNT_WEI,
    ) => joinGameMutation.mutate({ gameId, move, betAmount }),
    submitMoves: (gameId: number) => revealGameMutation.mutate(gameId),
    computeDifference: (gameId: number) =>
      computeDifferenceMutation.mutate(gameId),
    finalizeGame: (gameId: number, diffMod3: number) =>
      finalizeGameMutation.mutate({ gameId, diffMod3 }),
    resetGame,
    defaultBetAmount: DEFAULT_BET_AMOUNT,
    defaultBetAmountWei: DEFAULT_BET_AMOUNT_WEI,
    isCreatingGame: createGameMutation.isPending,
    isJoiningGame: joinGameMutation.isPending,
    isRevealingGame: revealGameMutation.isPending,
    isComputingDifference: computeDifferenceMutation.isPending,
    isFinalizingGame: finalizeGameMutation.isPending,
    updateStats,
  };
}
