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

interface GameContextValue extends GameStateData {
  isLoading: boolean;
  dispatch: React.Dispatch<GameAction>;
  createGame: (move: Move) => Promise<void>;
  joinGame: (gameId: number, move: Move) => Promise<void>;
  finalizeGame: (gameId: number, diffMod3: number) => Promise<void>;
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
      const newState = {
        ...state,
        result: action.result,
        phase: "FINISHED",
        error: null,
        score:
          state.score +
          (action.result === "WIN" ? 1 : action.result === "LOSE" ? -1 : 0),
      };

      const address = localStorage.getItem("playerAddress");
      if (address && state.playerMove && state.houseMove) {
        const gameHistory: GameHistory = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: Date.now(),
          playerMove: state.playerMove,
          houseMove: state.houseMove,
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

  // Handle contract game state changes
  useEffect(() => {
    if (gameInfo) {
      if (gameInfo.finished && gameInfo.winner) {
        // Determine result based on winner
        const result =
          gameInfo.winner === address
            ? GameResult.WIN
            : gameInfo.winner === gameInfo.playerB
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
    createGame,
    joinGame,
    finalizeGame,
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
