"use client";

import React, { createContext, useContext, useReducer, ReactNode } from "react";

export type Move = "ROCK" | "PAPER" | "SCISSORS" | null;
export type GameState =
  | "CHOOSING"
  | "SELECTED"
  | "HOUSE_PICKING"
  | "REVEALING"
  | "FINISHED"
  | "ERROR";
export type GameResult = "WIN" | "LOSE" | "DRAW" | null;

interface GameHistory {
  id: string;
  timestamp: number;
  playerMove: Move;
  houseMove: Move;
  result: GameResult;
  playerAddress: string;
}

interface LeaderboardEntry {
  address: string;
  score: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
}

interface GameContextType {
  playerMove: Move;
  houseMove: Move;
  gameState: GameState;
  result: GameResult;
  score: number;
  error: string | null;
  history: GameHistory[];
  leaderboard: LeaderboardEntry[];
  playerAddress: string | null;
  dispatch: React.Dispatch<GameAction>;
}

type GameAction =
  | { type: "SELECT_MOVE"; move: Move }
  | { type: "HOUSE_PICK" }
  | { type: "REVEAL_RESULT" }
  | { type: "RESET_GAME" }
  | { type: "SET_ERROR"; error: string }
  | { type: "SET_PLAYER_ADDRESS"; address: string };

interface GameContextState {
  playerMove: Move;
  houseMove: Move;
  gameState: GameState;
  result: GameResult;
  score: number;
  error: string | null;
  history: GameHistory[];
  leaderboard: LeaderboardEntry[];
  playerAddress: string | null;
}

const initialState: GameContextState = {
  playerMove: null,
  houseMove: null,
  gameState: "CHOOSING",
  result: null,
  score: 0,
  error: null,
  history: [],
  leaderboard: [],
  playerAddress: null,
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

function gameReducer(
  state: GameContextState,
  action: GameAction
): GameContextState {
  switch (action.type) {
    case "SELECT_MOVE":
      return {
        ...state,
        playerMove: action.move,
        gameState: "SELECTED",
        error: null,
      };

    case "HOUSE_PICK": {
      try {
        const moves: Move[] = ["ROCK", "PAPER", "SCISSORS"];
        const randomMove = moves[
          Math.floor(Math.random() * moves.length)
        ] as Move;
        return {
          ...state,
          houseMove: randomMove,
          gameState: "REVEALING",
          error: null,
        };
      } catch (error) {
        return {
          ...state,
          gameState: "ERROR",
          error: "Failed to generate house move",
        };
      }
    }

    case "REVEAL_RESULT": {
      try {
        const result = calculateResult(state.playerMove, state.houseMove);
        const scoreChange = result === "WIN" ? 1 : result === "LOSE" ? -1 : 0;

        const newState = {
          ...state,
          result,
          score: state.score + scoreChange,
          gameState: "FINISHED",
          error: null,
        };

        // Only update history and leaderboard if we have a player address
        if (state.playerAddress && state.playerMove && state.houseMove) {
          const gameHistory: GameHistory = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
            playerMove: state.playerMove,
            houseMove: state.houseMove,
            result,
            playerAddress: state.playerAddress,
          };

          newState.history = [gameHistory, ...state.history].slice(0, 10);
          newState.leaderboard = updateLeaderboard(
            state.leaderboard,
            result,
            state.playerAddress
          );
        }

        return newState;
      } catch (error) {
        return {
          ...state,
          gameState: "ERROR",
          error: "Failed to calculate result",
        };
      }
    }

    case "SET_PLAYER_ADDRESS":
      return {
        ...state,
        playerAddress: action.address,
      };

    case "RESET_GAME":
      return {
        ...state,
        playerMove: null,
        houseMove: null,
        gameState: "CHOOSING",
        result: null,
        error: null,
      };

    case "SET_ERROR":
      return {
        ...state,
        gameState: "ERROR",
        error: action.error,
      };

    default:
      return state;
  }
}

function calculateResult(playerMove: Move, houseMove: Move): GameResult {
  if (!playerMove || !houseMove) {
    throw new Error("Missing moves");
  }

  if (playerMove === houseMove) return "DRAW";

  const winningMoves = {
    ROCK: "SCISSORS",
    PAPER: "ROCK",
    SCISSORS: "PAPER",
  };

  return winningMoves[playerMove as keyof typeof winningMoves] === houseMove
    ? "WIN"
    : "LOSE";
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  return (
    <GameContext.Provider value={{ ...state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
}
