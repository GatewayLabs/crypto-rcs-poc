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
  earnings?: number;
}
