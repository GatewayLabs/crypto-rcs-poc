import { randomBigInt, modInverse } from './arithmetic';

/**
 * BN256 (alt_bn128) field modulus.
 */
export const FIELD_MODULUS =
  21888242871839275222246405745257275088696311157297823662689037894645226208583n;
export const BN256_ORDER =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

/**
 * Elliptic curve point type.
 */
export type ECPoint = {
  x: bigint;
  y: bigint;
};

/**
 * The special "point at infinity" is represented as (0,0)
 */
export const INFINITY: ECPoint = { x: 0n, y: 0n };

export function isInfinity(P: ECPoint): boolean {
  return P.x === 0n && P.y === 0n;
}

/**
 * Helper: modular reduction.
 */
function mod(a: bigint, p: bigint): bigint {
  const result = a % p;
  return result >= 0n ? result : result + p;
}

/**
 * Elliptic curve point addition on BN256.
 * Uses the formulas:
 * - If P = INFINITY, return Q; if Q = INFINITY, return P.
 * - If P.x === Q.x but P.y !== Q.y, then P + Q = INFINITY.
 * - Otherwise, for P ≠ Q, compute slope = (Q.y − P.y)/(Q.x − P.x) mod p,
 *   and then R = (lambda^2 − P.x − Q.x, lambda*(P.x − R.x) − P.y).
 */
export function ecAdd(
  P: ECPoint,
  Q: ECPoint,
  p: bigint = FIELD_MODULUS,
): ECPoint {
  if (isInfinity(P)) return Q;
  if (isInfinity(Q)) return P;
  if (P.x === Q.x) {
    if (P.y !== Q.y) return INFINITY;
    else return ecDouble(P, p);
  }
  const diff = mod(Q.x - P.x, p);
  if (diff === 0n) {
    console.error('Zero denominator in ecAdd:', { P, Q });
  }
  const lambda = mod((Q.y - P.y) * modInverse(diff, p), p);
  const xr = mod(lambda * lambda - P.x - Q.x, p);
  const yr = mod(lambda * (P.x - xr) - P.y, p);
  return { x: xr, y: yr };
}

/**
 * Elliptic curve point doubling.
 * For P = (x,y) with y ≠ 0, use:
 *   lambda = (3*x^2)/(2*y) mod p,
 *   R = (lambda^2 − 2*x, lambda*(x − R.x) − y).
 */
export function ecDouble(P: ECPoint, p: bigint = FIELD_MODULUS): ECPoint {
  if (isInfinity(P)) return P;
  if (P.y === 0n) return INFINITY;
  const denom = mod(2n * P.y, p);
  if (denom === 0n) {
    console.error('Zero denominator in ecDouble:', { P });
  }
  const lambda = mod(3n * P.x * P.x * modInverse(denom, p), p);
  const xr = mod(lambda * lambda - 2n * P.x, p);
  const yr = mod(lambda * (P.x - xr) - P.y, p);
  return { x: xr, y: yr };
}

/**
 * Elliptic curve scalar multiplication via double-and-add.
 */
export function ecMul(
  P: ECPoint,
  scalar: bigint,
  p: bigint = FIELD_MODULUS,
): ECPoint {
  let result = INFINITY;
  let addend = P;
  while (scalar > 0n) {
    if (scalar & 1n) {
      result = ecAdd(result, addend, p);
    }
    addend = ecDouble(addend, p);
    scalar = scalar >> 1n;
  }
  return result;
}

/**
 * Elliptic curve point negation.
 * For P = (x,y), -P = (x, -y mod p).
 */
export function ecNeg(P: ECPoint, p: bigint = FIELD_MODULUS): ECPoint {
  if (isInfinity(P)) return P;
  return { x: P.x, y: mod(-P.y, p) };
}

/**
 * ElGamal Public/Private Key and Ciphertext types for EC ElGamal.
 */
export type ElGamalPublicKey = {
  p: bigint; // field modulus (for BN256, FIELD_MODULUS)
  G: ECPoint; // generator (typically (1,2))
  Q: ECPoint; // public key point: Q = x * G
};

export type ElGamalPrivateKey = {
  x: bigint;
};

export type ElGamalCiphertext = {
  C1: ECPoint;
  C2: ECPoint;
  r?: bigint;
};

/**
 * Encrypt a message m (assumed to be small) using EC ElGamal.
 * Here the plaintext is encoded as M = m * G.
 *
 * Encryption:
 *   Choose random r,
 *   C1 = r * G,
 *   C2 = M + r * Q.
 */
export function encrypt(
  m: bigint,
  publicKey: {
    p: bigint;
    G: ECPoint;
    Q: ECPoint;
  },
): { C1: ECPoint; C2: ECPoint; r: bigint } {
  // Encode message: M = m * G.
  const M = ecMul(publicKey.G, m, publicKey.p);

  // Generate randomness r in [1, BN256_ORDER - 1]
  const r = (randomBigInt(32) % (BN256_ORDER - 1n)) + 1n;
  const C1 = ecMul(publicKey.G, r, publicKey.p);
  const rQ = ecMul(publicKey.Q, r, publicKey.p);
  const C2 = ecAdd(M, rQ, publicKey.p);
  return { C1, C2, r };
}

/**
 * Decrypt a ciphertext using the private key.
 *
 * Decryption:
 *   M = C2 - x * C1.
 *
 * Since m is assumed to be small (e.g. in {-2, -1, 0, 1, 2}), we recover m by
 * checking for which candidate m we have m * G == M.
 */
export function decrypt(
  ciphertext: ElGamalCiphertext,
  privateKey: ElGamalPrivateKey,
  publicKey: ElGamalPublicKey,
): bigint {
  const xC1 = ecMul(ciphertext.C1, privateKey.x, publicKey.p);
  const neg_xC1 = ecNeg(xC1, publicKey.p);
  const M = ecAdd(ciphertext.C2, neg_xC1, publicKey.p);
  // Try possible m values (for your RPS game, for example m ∈ {-2, -1, 0, 1, 2})
  const possibleExponents = [-2n, -1n, 0n, 1n, 2n];
  for (const candidate of possibleExponents) {
    const candidateM = ecMul(publicKey.G, candidate, publicKey.p);
    if (candidateM.x === M.x && candidateM.y === M.y) {
      return candidate;
    }
  }
  throw new Error('Discrete logarithm not found');
}

/**
 * Homomorphic addition on ciphertexts.
 * Given two ciphertexts (C1, C2) and (C1', C2'), their sum is defined as:
 *   (C1 + C1', C2 + C2').
 */
export function homomorphicAddition(
  ct1: ElGamalCiphertext,
  ct2: ElGamalCiphertext,
  publicKey: ElGamalPublicKey,
): ElGamalCiphertext {
  const C1 = ecAdd(ct1.C1, ct2.C1, publicKey.p);
  const C2 = ecAdd(ct1.C2, ct2.C2, publicKey.p);
  return { C1, C2 };
}

/**
 * Scalar addition on a ciphertext.
 * To add a scalar k (i.e. to change the plaintext from m to m + k), add k * G to C2.
 */
export function scalarAddition(
  ct: ElGamalCiphertext,
  k: bigint,
  publicKey: ElGamalPublicKey,
): ElGamalCiphertext {
  const kG = ecMul(publicKey.G, k, publicKey.p);
  const newC2 = ecAdd(ct.C2, kG, publicKey.p);
  return { C1: ct.C1, C2: newC2 };
}

/**
 * Scalar subtraction on a ciphertext.
 * To subtract a scalar k (i.e. to change the plaintext from m to m - k), subtract k * G from C2.
 */
export function scalarSubtraction(
  ct: ElGamalCiphertext,
  k: bigint,
  publicKey: ElGamalPublicKey,
): ElGamalCiphertext {
  const kG = ecMul(publicKey.G, k, publicKey.p);
  const neg_kG = ecNeg(kG, publicKey.p);
  const newC2 = ecAdd(ct.C2, neg_kG, publicKey.p);
  return { C1: ct.C1, C2: newC2 };
}
