import { modPow, modInverse } from "./utils";
import { ethers } from "ethers";

export interface PaillierPublicKey {
  n: string; // Hex string
  g: string; // Hex string
}

export interface PaillierPrivateKey {
  lambda: string; // Hex string
  mu: string; // Hex string
  p: string; // Hex string
  q: string; // Hex string
}

export class PaillierCrypto {
  private readonly n: bigint;
  private readonly g: bigint;
  private readonly nSquared: bigint;

  constructor(publicKey: PaillierPublicKey) {
    this.n = BigInt("0x" + publicKey.n);
    this.g = BigInt("0x" + publicKey.g);
    this.nSquared = this.n * this.n;
  }

  // Encrypt a number using public key
  encrypt(m: number): string {
    const mBig = BigInt(m);

    // Ensure message is within range
    if (mBig < 0n || mBig >= this.n) {
      throw new Error("Message is outside valid range");
    }

    // Generate random r coprime to n
    const r = this.generateRandomCoprime();

    // Compute cipher text: c = g^m * r^n mod n^2
    const gm = modPow(this.g, mBig, this.nSquared);
    const rn = modPow(r, this.n, this.nSquared);
    const c = (gm * rn) % this.nSquared;

    // Return hex string with 0x prefix
    return "0x" + c.toString(16);
  }

  // Encrypt with a specific random value (for testing/verification)
  encryptWithR(m: number, r: bigint): string {
    const mBig = BigInt(m);

    if (mBig < 0n || mBig >= this.n) {
      throw new Error("Message is outside valid range");
    }

    const gm = modPow(this.g, mBig, this.nSquared);
    const rn = modPow(r, this.n, this.nSquared);
    const c = (gm * rn) % this.nSquared;

    return "0x" + c.toString(16);
  }

  // Add two encrypted values homomorphically
  addEncrypted(c1: string, c2: string): string {
    const c1Big = BigInt(c1);
    const c2Big = BigInt(c2);

    // Multiply ciphertexts to add plaintexts: E(m1 + m2) = E(m1) * E(m2) mod n^2
    const result = (c1Big * c2Big) % this.nSquared;

    return "0x" + result.toString(16);
  }

  // Multiply encrypted value by constant k
  multiplyByConstant(c: string, k: number): string {
    const cBig = BigInt(c);
    const kBig = BigInt(k);

    // Raise ciphertext to power k: E(k*m) = E(m)^k mod n^2
    const result = modPow(cBig, kBig, this.nSquared);

    return "0x" + result.toString(16);
  }

  // Generate proof of valid encryption
  generateProof(
    m: number,
    r: bigint
  ): {
    commitment: string;
    challenge: string;
    response: string;
  } {
    // This is a simplified Schnorr-like proof
    // In production, use a proper zero-knowledge proof system

    // Generate random value for commitment
    const v = this.generateRandomCoprime();

    // Create commitment
    const commitment = modPow(v, this.n, this.nSquared);

    // Generate challenge (in real system, this would involve Fiat-Shamir)
    const challengeInput = ethers.solidityPacked(
      ["uint256", "uint256"],
      [commitment, BigInt(m)]
    );
    const challengeHash = ethers.keccak256(challengeInput);
    const challenge = BigInt(challengeHash) % this.n;

    // Generate response
    const response = (v * modPow(r, challenge, this.nSquared)) % this.nSquared;

    return {
      commitment: "0x" + commitment.toString(16),
      challenge: "0x" + challenge.toString(16),
      response: "0x" + response.toString(16),
    };
  }

  // Verify proof of valid encryption
  verifyProof(
    ciphertext: string,
    proof: {
      commitment: string;
      challenge: string;
      response: string;
    }
  ): boolean {
    const c = BigInt(ciphertext);
    const commitment = BigInt(proof.commitment);
    const challenge = BigInt(proof.challenge);
    const response = BigInt(proof.response);

    // Verify: response^n = commitment * c^challenge mod n^2
    const left = modPow(response, this.n, this.nSquared);
    const right =
      (commitment * modPow(c, challenge, this.nSquared)) % this.nSquared;

    return left === right;
  }

  // Generate random number coprime to n
  private generateRandomCoprime(): bigint {
    while (true) {
      // Generate random bytes
      const bytes = ethers.randomBytes(32);
      const num = BigInt("0x" + Buffer.from(bytes).toString("hex"));

      // Ensure number is in range [1, n-1]
      const r = (num % (this.n - 1n)) + 1n;

      // Check if coprime using GCD
      if (this.gcd(r, this.n) === 1n) {
        return r;
      }
    }
  }

  // Calculate GCD using Euclidean algorithm
  private gcd(a: bigint, b: bigint): bigint {
    while (b !== 0n) {
      const t = b;
      b = a % b;
      a = t;
    }
    return a;
  }
}

// Function to generate Paillier key pair (for testing)
export function generateKeyPair(bits: number = 2048): {
  publicKey: PaillierPublicKey;
  privateKey: PaillierPrivateKey;
} {
  // Note: This is for testing only
  // In production, use a secure key generation process
  throw new Error("Key generation not implemented for production");
}
