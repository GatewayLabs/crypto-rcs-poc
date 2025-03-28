import { modInverse } from '@/lib/crypto/arithmetic';
import {
  decrypt as elgamalDecrypt,
  ElGamalCiphertext,
} from '@/lib/crypto/elgamal';

/**
 * Retrieve the ElGamal keys.
 * The public key is read from NEXT_PUBLIC_ELGAMAL_* env variables,
 * and the private key is read from ELGAMAL_PRIVATE_KEY.
 */
export function getElGamalKeys() {
  const publicKey = {
    p: BigInt('0x' + process.env.NEXT_PUBLIC_ELGAMAL_P),
    g: BigInt('0x' + process.env.NEXT_PUBLIC_ELGAMAL_G),
    h: BigInt('0x' + process.env.NEXT_PUBLIC_ELGAMAL_H),
  };
  const privateKey = {
    x: BigInt('0x' + process.env.ELGAMAL_X),
  };
  return { publicKey, privateKey };
}

/**
 * Computes the homomorphic difference between two ElGamal-encrypted moves.
 *
 * Both moves should be provided as JSON strings representing objects of the form:
 * { c1: string, c2: string }.
 *
 * The difference is computed componentwise (via division modulo p) and returned
 * as a JSON string of an object with the new { c1, c2 }.
 */
export function computeDifferenceLocally(
  encryptedA: ElGamalCiphertext,
  encryptedB: ElGamalCiphertext,
): ElGamalCiphertext {
  try {
    // Parse the ciphertexts
    const encA = encryptedA;
    const encB = encryptedB;

    const { publicKey } = getElGamalKeys();
    const p = publicKey.p;

    // Compute difference: componentwise division
    const diffC1 = (BigInt(encA.c1) * modInverse(BigInt(encB.c1), p)) % p;
    const diffC2 = (BigInt(encA.c2) * modInverse(BigInt(encB.c2), p)) % p;

    const diff = { c1: diffC1, c2: diffC2 };

    return diff;
  } catch (error) {
    console.error(
      'Error computing homomorphic difference with ElGamal:',
      error,
    );
    throw new Error(
      `Failed to compute homomorphic difference using ElGamal: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * Decrypts an ElGamal-encrypted difference ciphertext and returns the normalized result modulo 3.
 *
 * The ciphertext is expected as a JSON string representing an object { c1, c2 }.
 */
export function decryptDifference(ciphertext: ElGamalCiphertext): number {
  try {
    const elgamalCipher: ElGamalCiphertext = {
      c1: BigInt(ciphertext.c1),
      c2: BigInt(ciphertext.c2),
    };

    const { publicKey, privateKey } = getElGamalKeys();
    const m = elgamalDecrypt(elgamalCipher, privateKey, publicKey);

    // Normalize the decrypted difference modulo 3.
    const mod = (n: number, m: number) => ((n % m) + m) % m;
    return mod(Number(m), 3);
  } catch (error) {
    console.error('Error decrypting difference with ElGamal:', error);
    throw new Error(
      `Failed to decrypt difference using ElGamal: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
