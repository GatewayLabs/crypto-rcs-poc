import { Move } from "@/lib/crypto";

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
  | { type: "SET_RESULT"; result: GameResult }
  | { type: "RESET_GAME" }
  | { type: "SET_ERROR"; error: string }
  | { type: "SET_PHASE"; phase: GamePhase }
  | { type: "SET_GAME_ID"; gameId: number };
