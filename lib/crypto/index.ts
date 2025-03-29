import { ELGAMAL_PUBLIC_KEY, PAILLIER_PUBLIC_KEY } from '@/config/contracts';
import * as paillier from 'paillier-bigint';
import { ElGamalCiphertext, encrypt as elgamalEncrypt } from './elgamal';
import { encrypt as paillierEncrypt } from './paillier';
import { keccak256 } from 'ethers';

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
      return elgamalEncrypt(BigInt(moveValue), ELGAMAL_PUBLIC_KEY);
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

export function generateEncryptedMoveHash(
  ciphertext: ElGamalCiphertext,
): string {
  const c1Hex =
    '0x' +
    ciphertext.C1.x.toString(16).padStart(64, '0') +
    ciphertext.C1.y.toString(16).padStart(64, '0');
  const c2Hex =
    '0x' +
    ciphertext.C2.x.toString(16).padStart(64, '0') +
    ciphertext.C2.y.toString(16).padStart(64, '0');

  // Concatenate the hex strings (removing the duplicate "0x")
  const concatenated = c1Hex + c2Hex.slice(2);
  // Compute the keccak256 hash
  const hash = keccak256(concatenated);
  return hash;
}

export {
  encrypt as elgamalEncrypt,
  decrypt as elgamalDecrypt,
  homomorphicAddition as elgamalHomomorphicAddition,
  scalarAddition as elgamalScalarAddition,
  scalarSubtraction as elgamalScalarSubtraction,
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
