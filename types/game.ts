import { Move } from '@/lib/crypto';
import { GameError } from '@/lib/errors';

export enum GamePhase {
  CHOOSING = 'CHOOSING',
  SELECTED = 'SELECTED',
  WAITING = 'WAITING',
  REVEALING = 'REVEALING',
  FINISHED = 'FINISHED',
  ERROR = 'ERROR',
}

export enum GameResult {
  WIN = 'WIN',
  LOSE = 'LOSE',
  DRAW = 'DRAW',
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
  betValue: number;
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

export interface SubgraphGame {
  id: string;
  gameId: string;
  playerA: {
    id: string;
  };
  playerB: {
    id: string;
  } | null;
  betAmount: string;
  winner: string | null;
  state: string;
  isFinished: boolean;
  createdAt: string;
  resolvedAt: string | null;
  transactionHash: string;
  revealedDifference: number | null;
}

export interface SubgraphPlayerStats {
  totalGamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  netProfitLoss: string;
  totalReturned: string;
}

export interface SubgraphGamesResponse {
  data: {
    playerA: SubgraphGame[];
    playerB: SubgraphGame[];
    playerStats: SubgraphPlayerStats | null;
  };
  errors?: Array<{
    message: string;
    locations: Array<{ line: number; column: number }>;
    path: string[];
  }>;
}
