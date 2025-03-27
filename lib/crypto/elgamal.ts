import { modInverse, modPow, randomBigInt } from './arithmetic';

// ElGamal public key
export type ElGamalPublicKey = {
  p: bigint;
  g: bigint;
  h: bigint;
};

// ElGamal private key
export type ElGamalPrivateKey = {
  x: bigint;
};

// ElGamal ciphertext
export type ElGamalCiphertext = {
  c1: bigint;
  c2: bigint;
  r?: bigint;
};

// Encrypt a message m using public key (p, g, h)
export function encrypt(m: bigint, publicKey: ElGamalPublicKey) {
  // Generate randomness r ∈ [1, p−1]
  const r = (randomBigInt(32) % (publicKey.p - 1n)) + 1n;
  const c1 = modPow(publicKey.g, r, publicKey.p);
  const c2 =
    (modPow(publicKey.g, BigInt(m), publicKey.p) *
      modPow(publicKey.h, r, publicKey.p)) %
    publicKey.p;

  const ciphertext: ElGamalCiphertext = { c1, c2, r };

  return ciphertext;
}

// Decrypt a ciphertext (c1, c2) using private key x
export function decrypt(
  ciphertext: ElGamalCiphertext,
  privateKey: ElGamalPrivateKey,
  publicKey: ElGamalPublicKey,
) {
  // Compute s = c1^x mod p, then find its modular inverse
  const s = modPow(ciphertext.c1, privateKey.x, publicKey.p);
  const sInv = modInverse(s, publicKey.p);
  // Recover g^m = c2 * sInv mod p
  const gm = (ciphertext.c2 * sInv) % publicKey.p;

  // Since m is very small (in our RPS game m ∈ {-2,-1,0,1,2}),
  // explicitly test these possibilities.
  const possibleExponents = [-2n, -1n, 0n, 1n, 2n];

  for (const candidate of possibleExponents) {
    let candidatePower;
    if (candidate >= 0n) {
      candidatePower = modPow(publicKey.g, candidate, publicKey.p);
    } else {
      const gInv = modInverse(publicKey.g, publicKey.p);
      candidatePower = modPow(gInv, -candidate, publicKey.p);
    }
    if (candidatePower === gm) {
      return candidate;
    }
  }
  throw new Error('Discrete logarithm not found');
}
