import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useGameContract } from "./use-game-contract";
import { Move } from "@/lib/crypto";
import { GamePhase } from "@/types/game";

export function useGame() {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const {
    createGame: contractCreateGame,
    joinGame: contractJoinGame,
    submitMoves,
    computeDifference,
    finalizeGame,
  } = useGameContract();

  // Helper to determine game phase based on contract data
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

  // Fetch current game state
  const { data: gameState, isLoading } = useQuery({
    queryKey: ["gameState", address],
    queryFn: async () => {
      // Default state
      const defaultState = {
        playerMove: null,
        houseMove: null,
        phase: GamePhase.CHOOSING,
        result: null,
        error: null,
        gameId: null,
      };

      return defaultState;
    },
    enabled: !!address,
  });

  // Create game mutation
  const createGameMutation = useMutation({
    mutationFn: async (move: Move) => {
      try {
        const gameId = await contractCreateGame(move);

        return {
          gameId,
          playerMove: move,
          phase: GamePhase.SELECTED,
        };
      } catch (error) {
        throw error;
      }
    },
    onSuccess: (data) => {
      // Update game state on success
      const newState = {
        ...gameState,
        gameId: data.gameId,
        playerMove: data.playerMove,
        phase: data.phase,
      };

      queryClient.setQueryData(["gameState", address], newState);
    },
    onError: (error) => {
      const newState = {
        ...gameState,
        phase: GamePhase.ERROR,
        error: error instanceof Error ? error.message : "Failed to create game",
      };

      queryClient.setQueryData(["gameState", address], newState);
    },
  });

  // Join game mutation
  const joinGameMutation = useMutation({
    mutationFn: async ({ gameId, move }: { gameId: number; move: Move }) => {
      try {
        await contractJoinGame(gameId, move);
        return {
          gameId,
          playerMove: move,
          phase: GamePhase.WAITING,
        };
      } catch (error) {
        throw error;
      }
    },
    onSuccess: (data) => {
      const newState = {
        ...gameState,
        gameId: data.gameId,
        playerMove: data.playerMove,
        phase: data.phase,
      };

      queryClient.setQueryData(["gameState", address], newState);
    },
    onError: (error) => {
      const newState = {
        ...gameState,
        phase: GamePhase.ERROR,
        error: error instanceof Error ? error.message : "Failed to join game",
      };

      queryClient.setQueryData(["gameState", address], newState);
    },
  });

  // Reveal game (submit moves) mutation
  const revealGameMutation = useMutation({
    mutationFn: async (gameId: number) => {
      await submitMoves(gameId);
      return { gameId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gameState", address] });
    },
  });

  // Compute difference mutation
  const computeDifferenceMutation = useMutation({
    mutationFn: async (gameId: number) => {
      await computeDifference(gameId);
      return { gameId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gameState", address] });
    },
  });

  // Finalize game mutation
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gameState", address] });
    },
  });

  // Reset the game state
  const resetGame = () => {
    const newState = {
      ...gameState,
      playerMove: null,
      houseMove: null,
      phase: GamePhase.CHOOSING,
      result: null,
      error: null,
      gameId: null,
    };

    queryClient.setQueryData(["gameState", address], newState);
  };

  return {
    gameState,
    isLoading,
    phase: determineGamePhase(gameState),
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
