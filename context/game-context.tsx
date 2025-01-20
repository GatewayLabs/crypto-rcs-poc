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
  SerializedGameState,
  isValidGameState,
} from "@/types/game";
import { getErrorMessage } from "@/lib/errors";
import { STORAGE_KEY, usePersistentGame } from "@/hooks/use-persistent-game";
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
          gameId: state.gameId,
          transactionHash: action.transactionHash,
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

    case "RESTORE_STATE": {
      // Don't restore if we're in the middle of a game
      if (
        state.phase !== GamePhase.CHOOSING &&
        state.phase !== GamePhase.FINISHED
      ) {
        console.log("Not restoring - game in progress");
        return state;
      }

      // Don't restore if the saved state is clean/empty
      if (!action.state.playerMove && !action.state.result) {
        return {
          ...state,
          history: action.state.history || state.history,
          score: action.state.score || state.score,
        };
      }

      const restoredState = {
        ...state,
        playerMove: action.state.playerMove,
        houseMove: action.state.houseMove,
        result: action.state.result,
        score: action.state.score,
        gameId: action.state.gameId,
        history: action.state.history || state.history,
        leaderboard: state.leaderboard,
        error: null,
      };

      return restoredState;
    }

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
  const getInitialState = () => {
    try {
      const address = localStorage.getItem("playerAddress");
      if (address) {
        const saved = localStorage.getItem(`${STORAGE_KEY}-${address}`);
        if (saved) {
          const parsedState = JSON.parse(saved);
          if (isValidGameState(parsedState)) {
            return {
              ...initialState,
              history: parsedState.history || [],
              score: parsedState.score || 0,
            };
          }
        }
      }
    } catch (error) {
      console.error("Error loading initial state:", error);
    }
    return initialState;
  };

  const [state, dispatch] = useReducer(gameReducer, getInitialState());
  const { address } = useAccount();
  const { gameInfo, isLoading, createGame, joinGame } = useGameContract(
    state.gameId!
  );

  useEffect(() => {
    if (address) {
      localStorage.setItem("playerAddress", address);
    } else {
      localStorage.removeItem("playerAddress");
    }
  }, [address]);

  const serializedState: SerializedGameState = {
    playerMove: state.playerMove,
    houseMove: state.houseMove,
    result: state.result,
    gameId: state.gameId,
    score: state.score,
    history: state.history,
    leaderboard: state.leaderboard,
    timestamp: Date.now(),
  };

  usePersistentGame(dispatch, serializedState);

  useEffect(() => {
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
    }
  }, [gameInfo, address]);

  const contextValue: GameContextValue = {
    ...state,
    isLoading,
    dispatch,
    createGame: async (move: Move) => {
      try {
        const gameId = await createGame(move);
        dispatch({ type: "SET_GAME_ID", gameId });
        dispatch({ type: "SET_PHASE", phase: GamePhase.SELECTED });

        const houseResult = await playHouseMove(gameId);
        if (!houseResult.success) {
          throw new Error(houseResult.error);
        }

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

        dispatch({
          type: "SET_RESULT",
          result: gameResult,
          transactionHash: resolveResult.hash,
        });
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
