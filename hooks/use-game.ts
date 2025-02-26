import { useMutation } from "@tanstack/react-query";
import { useGameContract } from "./use-game-contract";
import { Move } from "@/lib/crypto";
import { GamePhase, GameResult } from "@/types/game";
import { useEffect, useCallback } from "react";
import { playHouseMove, resolveGame } from "@/app/actions/house";
import { useGameUIStore } from "@/stores/game-ui-store";

export function useGame() {
  const {
    createGame: contractCreateGame,
    joinGame: contractJoinGame,
    submitMoves,
    computeDifference,
    finalizeGame,
    gameInfo,
  } = useGameContract();

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

  function determineGamePhase(gameInfo: any) {
    if (!gameInfo) return GamePhase.CHOOSING;

    const [playerA, playerB, winner, finished, bothCommitted] = gameInfo;

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

  const createGameMutation = useMutation({
    mutationFn: async (move: Move) => {
      try {
        setPlayerMove(move);
        setPhase(GamePhase.SELECTED);

        const gameId = await contractCreateGame(move);
        setGameId(gameId);

        const houseResult = await playHouseMove(gameId);
        if (!houseResult.success) {
          throw new Error(houseResult.error);
        }

        if (houseResult.move) {
          setHouseMove(houseResult.move);
        }

        setPhase(GamePhase.REVEALING);
        const resolveResult = await resolveGame(gameId);
        if (!resolveResult.success) {
          throw new Error(resolveResult.error);
        }

        const gameResult =
          resolveResult.result === 0
            ? GameResult.DRAW
            : resolveResult.result === 1
            ? GameResult.WIN
            : GameResult.LOSE;

        setResult(gameResult);
        setPhase(GamePhase.FINISHED);

        if (resolveResult.hash) {
          setTransactionHash(resolveResult.hash);
        }

        return {
          gameId,
          playerMove: move,
          phase: GamePhase.FINISHED,
          result: gameResult,
          transactionHash: resolveResult.hash,
          houseMove: houseResult.move,
        };
      } catch (error) {
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError("Failed to create game");
        }
        setPhase(GamePhase.ERROR);
        throw error;
      }
    },
  });

  const joinGameMutation = useMutation({
    mutationFn: async ({ gameId, move }: { gameId: number; move: Move }) => {
      try {
        setPlayerMove(move);
        setPhase(GamePhase.WAITING);

        await contractJoinGame(gameId, move);

        const resolveResult = await resolveGame(gameId);
        if (!resolveResult.success) {
          throw new Error(resolveResult.error);
        }

        const gameResult =
          resolveResult.result === 0
            ? GameResult.DRAW
            : resolveResult.result === 1
            ? GameResult.WIN
            : GameResult.LOSE;

        setResult(gameResult);
        setPhase(GamePhase.FINISHED);

        if (resolveResult.hash) {
          setTransactionHash(resolveResult.hash);
        }

        return {
          gameId,
          playerMove: move,
          phase: GamePhase.FINISHED,
          result: gameResult,
          transactionHash: resolveResult.hash,
        };
      } catch (error) {
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
    }
  }, [gameInfo, gameUIState.gameId, gameUIState.phase, setPhase]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && gameUIState.gameId) {
        if (
          gameUIState.phase === GamePhase.REVEALING ||
          gameUIState.phase === GamePhase.WAITING
        ) {
          if (gameUIState.result) {
            setPhase(GamePhase.FINISHED);
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [gameUIState.gameId, gameUIState.phase, gameUIState.result, setPhase]);

  return {
    gameState: gameUIState,
    phase: gameUIState.phase,
    createGame: (move: Move) => createGameMutation.mutate(move),
    joinGame: (gameId: number, move: Move) =>
      joinGameMutation.mutate({ gameId, move }),
    submitMoves: (gameId: number) => revealGameMutation.mutate(gameId),
    computeDifference: (gameId: number) =>
      computeDifferenceMutation.mutate(gameId),
    finalizeGame: (gameId: number, diffMod3: number) =>
      finalizeGameMutation.mutate({ gameId, diffMod3 }),
    resetGame,
    isCreatingGame: createGameMutation.isPending,
    isJoiningGame: joinGameMutation.isPending,
    isRevealingGame: revealGameMutation.isPending,
    isComputingDifference: computeDifferenceMutation.isPending,
    isFinalizingGame: finalizeGameMutation.isPending,
  };
}
