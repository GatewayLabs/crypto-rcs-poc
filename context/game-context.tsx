"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useEffect,
} from "react";
import { useGameContract } from "@/hooks/use-game-contract";
import { Move } from "@/lib/crypto";
import { useAccount } from "wagmi";
import {
  GamePhase,
  GameResult,
  GameHistory,
  LeaderboardEntry,
  GameAction,
  GameStateData,
} from "@/types/game";
import { getErrorMessage } from "@/lib/errors";
import { usePersistentGame } from "@/hooks/use-persistent-game";
import { playHouseMove, resolveGame } from "@/app/actions/house";

function inferHouseMove(playerMove: Move, result: GameResult): Move {
  if (result === "DRAW") {
    return playerMove;
  }

  const moveRelations = {
    ROCK: { wins: "SCISSORS", loses: "PAPER" },
    PAPER: { wins: "ROCK", loses: "SCISSORS" },
    SCISSORS: { wins: "PAPER", loses: "ROCK" },
  };

  return result === "WIN"
    ? (moveRelations[playerMove].wins as Move)
    : (moveRelations[playerMove].loses as Move);
}

interface GameContextValue extends GameStateData {
  isLoading: boolean;
  dispatch: React.Dispatch<GameAction>;
  createGame: (move: Move) => Promise<void>;
  joinGame: (gameId: number, move: Move) => Promise<void>;
}

const initialState: GameStateData = {
  playerMove: null,
  houseMove: null,
  phase: GamePhase.CHOOSING,
  result: null,
  score: 0,
  error: null,
  history: [],
  leaderboard: [],
  gameId: null,
};

function updateLeaderboard(
  leaderboard: LeaderboardEntry[],
  result: GameResult,
  address: string
): LeaderboardEntry[] {
  const existingEntry = leaderboard.find((entry) => entry.address === address);

  if (existingEntry) {
    return leaderboard.map((entry) => {
      if (entry.address === address) {
        return {
          ...entry,
          gamesPlayed: entry.gamesPlayed + 1,
          wins: entry.wins + (result === "WIN" ? 1 : 0),
          losses: entry.losses + (result === "LOSE" ? 1 : 0),
          draws: entry.draws + (result === "DRAW" ? 1 : 0),
          score:
            entry.score + (result === "WIN" ? 1 : result === "LOSE" ? -1 : 0),
        };
      }
      return entry;
    });
  }

  return [
    ...leaderboard,
    {
      address,
      gamesPlayed: 1,
      wins: result === "WIN" ? 1 : 0,
      losses: result === "LOSE" ? 1 : 0,
      draws: result === "DRAW" ? 1 : 0,
      score: result === "WIN" ? 1 : result === "LOSE" ? -1 : 0,
    },
  ];
}

function gameReducer(state: GameStateData, action: GameAction): GameStateData {
  switch (action.type) {
    case "SELECT_MOVE":
      return {
        ...state,
        playerMove: action.move,
        phase: GamePhase.SELECTED,
        error: null,
      };

    case "SET_HOUSE_MOVE":
      return {
        ...state,
        houseMove: action.move,
      };

    case "SET_RESULT": {
      const inferredHouseMove = inferHouseMove(
        state.playerMove!,
        action.result
      );

      const newState = {
        ...state,
        result: action.result,
        phase: GamePhase.FINISHED,
        houseMove: inferredHouseMove,
        error: null,
        score:
          state.score +
          (action.result === "WIN" ? 1 : action.result === "LOSE" ? -1 : 0),
      };

      const address = localStorage.getItem("playerAddress");
      if (address && state.playerMove) {
        const gameHistory: GameHistory = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: Date.now(),
          playerMove: state.playerMove,
          houseMove: inferredHouseMove,
          result: action.result,
          playerAddress: address,
        };

        newState.history = [gameHistory, ...state.history].slice(0, 10);
        newState.leaderboard = updateLeaderboard(
          state.leaderboard,
          action.result,
          address
        );
      }

      return newState;
    }

    case "SET_PHASE":
      return {
        ...state,
        phase: action.phase,
      };

    case "SET_GAME_ID":
      return {
        ...state,
        gameId: action.gameId,
      };

    case "RESET_GAME":
      return {
        ...state,
        playerMove: null,
        houseMove: null,
        phase: GamePhase.CHOOSING,
        result: null,
        error: null,
        gameId: null,
      };

    case "SET_ERROR":
      return {
        ...state,
        phase: GamePhase.ERROR,
        error: action.error,
      };

    case "RESTORE_STATE":
      if (state.phase !== GamePhase.CHOOSING || state.playerMove !== null) {
        return state;
      }
      return {
        ...state,
        ...action.state,
        history: state.history,
        leaderboard: state.leaderboard,
      };

    case "HANDLE_ERROR":
      return {
        ...state,
        phase: GamePhase.ERROR,
        error: getErrorMessage(action.error),
        ...(action.error.recoverable
          ? {}
          : {
              playerMove: null,
              houseMove: null,
              gameId: null,
            }),
      };

    default:
      return state;
  }
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { address } = useAccount();
  const { gameInfo, isLoading, createGame, joinGame, finalizeGame } =
    useGameContract(state.gameId!);

  useEffect(() => {
    localStorage.setItem("playerAddress", address as string);

    if (gameInfo) {
      const [
        playerA,
        playerB,
        winner,
        finished,
        bothCommitted,
        encA,
        encB,
        differenceCipher,
        revealedDiff,
      ] = gameInfo;

      // Update phase when player B joins
      if (playerB !== "0x0000000000000000000000000000000000000000") {
        dispatch({ type: "SET_PHASE", phase: GamePhase.WAITING });
      }

      // Update phase when both moves are committed
      if (bothCommitted) {
        dispatch({ type: "SET_PHASE", phase: GamePhase.REVEALING });
      }

      // Handle game completion
      if (finished && winner) {
        // Determine result based on winner
        const result =
          winner === address
            ? GameResult.WIN
            : winner === playerB
            ? GameResult.LOSE
            : GameResult.DRAW;
        dispatch({ type: "SET_RESULT", result });
      }
    }
  }, [gameInfo, address]);

  const contextValue: GameContextValue = {
    ...state,
    isLoading,
    dispatch,
    createGame: async (move: Move) => {
      try {
        // Create game and wait for gameId from event
        const gameId = await createGame(move);
        dispatch({ type: "SET_GAME_ID", gameId });
        dispatch({ type: "SET_PHASE", phase: GamePhase.SELECTED });

        // After game is created, trigger house move
        const houseResult = await playHouseMove(gameId);
        if (!houseResult.success) {
          throw new Error(houseResult.error);
        }

        // After house moves, trigger game resolution
        const resolveResult = await resolveGame(gameId);
        if (!resolveResult.success) {
          throw new Error(resolveResult.error);
        }
      } catch (error) {
        dispatch({
          type: "SET_ERROR",
          error:
            error instanceof Error ? error.message : "Failed to create game",
        });
      }
    },
    joinGame: async (gameId: number, move: Move) => {
      try {
        await joinGame(gameId, move);
        dispatch({ type: "SET_PHASE", phase: GamePhase.WAITING });

        // After joining, trigger game resolution
        const resolveResult = await resolveGame(gameId);
        if (!resolveResult.success) {
          throw new Error(resolveResult.error);
        }
      } catch (error) {
        dispatch({
          type: "SET_ERROR",
          error: error instanceof Error ? error.message : "Failed to join game",
        });
      }
    },
  };

  return (
    <GameContext.Provider value={contextValue}>{children}</GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}
