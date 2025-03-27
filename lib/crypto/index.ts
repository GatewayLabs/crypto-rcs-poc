import { ELGAMAL_PUBLIC_KEY, PAILLIER_PUBLIC_KEY } from '@/config/contracts';
import * as paillier from 'paillier-bigint';
import { ElGamalCiphertext, encrypt as elgamalEncrypt } from './elgamal';
import { encrypt as paillierEncrypt } from './paillier';

export type Move = 'ROCK' | 'PAPER' | 'SCISSORS';

export async function encryptMove(
  move: Move,
  algorithm: 'paillier' | 'elgamal' = 'elgamal',
): Promise<string | ElGamalCiphertext> {
  const moveValue = move === 'ROCK' ? 0 : move === 'PAPER' ? 1 : 2;

  try {
    if (algorithm === 'paillier') {
      const n = BigInt('0x' + PAILLIER_PUBLIC_KEY.n);
      const g = BigInt('0x' + PAILLIER_PUBLIC_KEY.g);

      const publicKey = new paillier.PublicKey(n, g);
      return paillierEncrypt(BigInt(moveValue), publicKey);
    } else if (algorithm === 'elgamal') {
      const publicKey = {
        p: BigInt('0x' + ELGAMAL_PUBLIC_KEY.p),
        g: BigInt('0x' + ELGAMAL_PUBLIC_KEY.g),
        h: BigInt('0x' + ELGAMAL_PUBLIC_KEY.h),
      };

      return elgamalEncrypt(BigInt(moveValue), publicKey);
    }

    throw new Error('Invalid algorithm');
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

export {
  encrypt as elgamalEncrypt,
  decrypt as elgamalDecrypt,
} from './elgamal';

export type {
  ElGamalCiphertext,
  ElGamalPublicKey,
  ElGamalPrivateKey,
} from './elgamal';

export {
  encrypt as paillierEncrypt,
  decrypt as paillierDecrypt,
} from './paillier';
