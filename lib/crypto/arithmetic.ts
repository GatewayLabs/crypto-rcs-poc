import crypto from 'crypto';

// Generate a random BigInt of nBytes
export function randomBigInt(nBytes: number) {
  return BigInt('0x' + crypto.randomBytes(nBytes).toString('hex'));
}

// Modular exponentiation: computes (base^exponent) % modulus
export function modPow(base: bigint, exponent: bigint, modulus: bigint) {
  if (modulus === 1n) return 0n;
  let result = 1n;
  base = base % modulus;
  while (exponent > 0n) {
    if (exponent % 2n === 1n) {
      result = (result * base) % modulus;
    }
    exponent = exponent / 2n;
    base = (base * base) % modulus;
  }
  return result;
}

// Extended Euclidean Algorithm to compute GCD and the coefficients
export function extendedGCD(a: bigint, b: bigint): [bigint, bigint, bigint] {
  if (b === 0n) return [a, 1n, 0n];
  const [gcd, x1, y1] = extendedGCD(b, a % b);
  const x = y1;
  const y = x1 - (a / b) * y1;
  return [gcd, x, y];
}

// Modular inverse: finds x such that (a * x) % m === 1
export function modInverse(a: bigint, m: bigint): bigint {
  const [gcd, x] = extendedGCD(a, m);
  if (gcd !== 1n) {
    throw new Error('Modular inverse does not exist');
  }
  return ((x % m) + m) % m;
}
