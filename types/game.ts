import { Move } from "@/lib/crypto";
import { GameError } from "@/lib/errors";

export enum GamePhase {
  CHOOSING = "CHOOSING",
  SELECTED = "SELECTED",
  WAITING = "WAITING",
  REVEALING = "REVEALING",
  FINISHED = "FINISHED",
  ERROR = "ERROR",
}

export enum GameResult {
  WIN = "WIN",
  LOSE = "LOSE",
  DRAW = "DRAW",
}

export interface GameHistory {
  id: string;
  timestamp: number;
  playerMove: Move;
  houseMove: Move;
  result: GameResult;
  playerAddress: string;
  transactionHash?: string;
  gameId: number | null;
}

export interface LeaderboardEntry {
  address: string;
  score: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface GameStateData {
  playerMove: Move | null;
  houseMove: Move | null;
  phase: GamePhase;
  result: GameResult | null;
  score: number;
  error: string | null;
  history: GameHistory[];
  leaderboard: LeaderboardEntry[];
  gameId: number | null;
}

export type GameAction =
  | { type: "SELECT_MOVE"; move: Move }
  | { type: "SET_HOUSE_MOVE"; move: Move }
  | { type: "SET_RESULT"; result: GameResult; transactionHash?: string }
  | { type: "RESET_GAME" }
  | { type: "SET_ERROR"; error: string }
  | { type: "SET_PHASE"; phase: GamePhase }
  | { type: "SET_GAME_ID"; gameId: number }
  | { type: "RESTORE_STATE"; state: SerializedGameState }
  | { type: "HANDLE_ERROR"; error: GameError };

export interface SerializedGameState {
  playerMove: Move | null;
  houseMove: Move | null;
  phase: GamePhase;
  result: GameResult | null;
  score: number;
  gameId: number | null;
  timestamp: number;
  history: GameHistory[];
  leaderboard: LeaderboardEntry[];
}

export function isValidGamePhase(phase: any): phase is GamePhase {
  return Object.values(GamePhase).includes(phase as GamePhase);
}

export function isValidGameResult(result: any): result is GameResult {
  return (
    result === null || Object.values(GameResult).includes(result as GameResult)
  );
}

export function isValidMove(move: any): move is Move {
  return move === null || ["ROCK", "PAPER", "SCISSORS"].includes(move as Move);
}

export function isValidGameState(state: any): state is SerializedGameState {
  if (!state || typeof state !== "object") return false;

  if (
    !isValidMove(state.playerMove) ||
    !isValidMove(state.houseMove) ||
    !isValidGamePhase(state.phase) ||
    !isValidGameResult(state.result) ||
    typeof state.score !== "number" ||
    (state.gameId !== null && typeof state.gameId !== "number") ||
    typeof state.timestamp !== "number"
  ) {
    return false;
  }

  const ONE_DAY = 24 * 60 * 60 * 1000;
  if (Date.now() - state.timestamp > ONE_DAY) {
    return false;
  }

  return true;
}
