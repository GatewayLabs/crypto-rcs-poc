import { PAILLIER_PUBLIC_KEY } from '@/config/contracts';
import { ethers } from 'ethers';

export type Move = 'ROCK' | 'PAPER' | 'SCISSORS';

const moveToNumber = {
  'ROCK': 0,
  'PAPER': 1,
  'SCISSORS': 2
} as const;

// BigInteger utility functions
function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  if (modulus === 1n) return 0n;
  
  let result = 1n;
  base = base % modulus;
  
  while (exponent > 0n) {
    if (exponent % 2n === 1n) {
      result = (result * base) % modulus;
    }
    base = (base * base) % modulus;
    exponent = exponent >> 1n;
  }
  
  return result;
}

// Encrypt a move using Paillier cryptosystem
export async function encryptMove(move: Move): Promise<string> {
  const n = BigInt('0x' + PAILLIER_PUBLIC_KEY.n);
  const g = BigInt('0x' + PAILLIER_PUBLIC_KEY.g);
  const moveNum = BigInt(moveToNumber[move]);
  
  // Generate a random r < n
  const randomBytes = ethers.utils.randomBytes(32);
  const r = BigInt('0x' + Buffer.from(randomBytes).toString('hex')) % n;
  
  // Compute c = g^m * r^n mod n^2
  const nSquared = n * n;
  const gm = modPow(g, moveNum, nSquared);
  const rn = modPow(r, n, nSquared);
  const c = (gm * rn) % nSquared;
  
  // Convert to hex string with 0x prefix
  return '0x' + c.toString(16);
}

// Convert difference modulo 3 to game result
export function getGameResult(diff: number): 'WIN' | 'LOSE' | 'DRAW' {
  const normalizedDiff = ((diff % 3) + 3) % 3; // Ensure positive result
  
  if (normalizedDiff === 0) return 'DRAW';
  if (normalizedDiff === 1) return 'WIN';
  return 'LOSE';
}