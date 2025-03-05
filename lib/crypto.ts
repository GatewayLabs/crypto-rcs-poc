import { PAILLIER_PUBLIC_KEY } from '@/config/contracts';
import * as paillier from 'paillier-bigint';

export type Move = 'ROCK' | 'PAPER' | 'SCISSORS';

export async function encryptMove(move: Move): Promise<string> {
  const moveValue = move === 'ROCK' ? 0 : move === 'PAPER' ? 1 : 2;

  try {
    const n = BigInt('0x' + PAILLIER_PUBLIC_KEY.n);
    const g = BigInt('0x' + PAILLIER_PUBLIC_KEY.g);

    const publicKey = new paillier.PublicKey(n, g);
    const encryptedValue = publicKey.encrypt(BigInt(moveValue));

    return '0x' + encryptedValue.toString(16).padStart(64, '0');
  } catch (error) {
    console.error('Error encrypting move:', error);
    throw new Error('Failed to encrypt move');
  }
}

export function getGameResult(diff: number): 'WIN' | 'LOSE' | 'DRAW' {
  const normalizedDiff = ((diff % 3) + 3) % 3;

  if (normalizedDiff === 0) return 'DRAW';
  if (normalizedDiff === 1) return 'WIN';
  return 'LOSE';
}
