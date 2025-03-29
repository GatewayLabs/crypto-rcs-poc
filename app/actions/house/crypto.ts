import {
  decrypt as elgamalDecrypt,
  ElGamalCiphertext,
  ecAdd,
  ecNeg,
} from '@/lib/crypto/elgamal';
import { ELGAMAL_PUBLIC_KEY } from '@/config/contracts';

/**
 * Retrieve the ElGamal keys.
 * The public key is read from NEXT_PUBLIC_ELGAMAL_* env variables,
 * and the private key is read from ELGAMAL_PRIVATE_KEY.
 */
export function getElGamalKeys() {
  const privateKey = {
    x: BigInt(process.env.ELGAMAL_X!),
  };
  return {
    publicKey: ELGAMAL_PUBLIC_KEY,
    privateKey,
  };
}

/**
 * Computes the homomorphic difference between two EC ElGamal ciphertexts.
 *
 * Given:
 *    encA = { C1, C2 } (e.g. player's encrypted move)
 *    encB = { C1, C2 } (e.g. house's encrypted move)
 *
 * We define:
 *    diff.C1 = encA.C1 + (-encB.C1)
 *    diff.C2 = encA.C2 + (-encB.C2)
 */
export function computeDifferenceLocally(
  encryptedA: ElGamalCiphertext,
  encryptedB: ElGamalCiphertext,
): ElGamalCiphertext {
  const diffC1 = ecAdd(encryptedA.C1, ecNeg(encryptedB.C1));
  const diffC2 = ecAdd(encryptedA.C2, ecNeg(encryptedB.C2));
  return { C1: diffC1, C2: diffC2 };
}

/**
 * Decrypts an EC ElGamal-encrypted difference ciphertext and returns the normalized result modulo 3.
 *
 * It uses the EC decryption function (which recovers a point M = m*G)
 * and then tests candidate m values.
 */
export function decryptDifference(ciphertext: ElGamalCiphertext): number {
  try {
    const { publicKey, privateKey } = getElGamalKeys(); // Now these are EC keys.
    const m = elgamalDecrypt(ciphertext, privateKey, publicKey);
    // Normalize the decrypted difference modulo 3.
    const mod = (n: number, modulus: number) =>
      ((n % modulus) + modulus) % modulus;
    return mod(Number(m), 3);
  } catch (error) {
    console.error('Error decrypting difference with EC ElGamal:', error);
    throw new Error(
      `Failed to decrypt difference using EC ElGamal: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
