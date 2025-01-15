export type { PaillierPublicKey, PaillierPrivateKey } from './paillier';
export { PaillierCrypto } from './paillier';
export { 
  modPow,
  modInverse,
  crt,
  numberToFixedString,
  aesEncrypt,
  aesDecrypt,
  bytesToHex,
  hexToBytes
} from './utils';
export { 
  verifyMoveRange,
  verifyMoveProof,
  verifyDifference,
  generateMoveRangeProof,
  verifyRangeProof
} from './verification';

export type Move = 'ROCK' | 'PAPER' | 'SCISSORS';

export const moveToNumber = {
  'ROCK': 0,
  'PAPER': 1,
  'SCISSORS': 2
} as const;

export const numberToMove: Record<number, Move> = {
  0: 'ROCK',
  1: 'PAPER',
  2: 'SCISSORS'
} as const;

// Get winning move for a given move
export function getWinningMove(move: Move): Move {
  switch (move) {
    case 'ROCK': return 'PAPER';
    case 'PAPER': return 'SCISSORS';
    case 'SCISSORS': return 'ROCK';
  }
}

// Get losing move for a given move
export function getLosingMove(move: Move): Move {
  switch (move) {
    case 'ROCK': return 'SCISSORS';
    case 'PAPER': return 'ROCK';
    case 'SCISSORS': return 'PAPER';
  }
}

// Determine winner between two moves
export function getWinner(move1: Move, move2: Move): 'WIN' | 'LOSE' | 'DRAW' {
  if (move1 === move2) return 'DRAW';
  
  if (
    (move1 === 'ROCK' && move2 === 'SCISSORS') ||
    (move1 === 'PAPER' && move2 === 'ROCK') ||
    (move1 === 'SCISSORS' && move2 === 'PAPER')
  ) {
    return 'WIN';
  }
  
  return 'LOSE';
}

// Convert difference modulo 3 to game result
export function getGameResult(diff: number): 'WIN' | 'LOSE' | 'DRAW' {
  const normalizedDiff = ((diff % 3) + 3) % 3; // Ensure positive result
  
  if (normalizedDiff === 0) return 'DRAW';
  if (normalizedDiff === 1) return 'WIN';
  return 'LOSE';
}

// Calculate move difference for result verification
export function calculateMoveDifference(move1: Move, move2: Move): number {
  const num1 = moveToNumber[move1];
  const num2 = moveToNumber[move2];
  return ((num1 - num2) % 3 + 3) % 3;
}

// Encrypt a move with Paillier
export async function encryptMove(move: Move): Promise<string> {
  const { PaillierCrypto } = await import('./paillier');
  const { PAILLIER_PUBLIC_KEY } = await import('@/config/contracts');
  
  const crypto = new PaillierCrypto(PAILLIER_PUBLIC_KEY);
  return crypto.encrypt(moveToNumber[move]);
}