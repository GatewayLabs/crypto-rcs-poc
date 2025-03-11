import * as paillier from "paillier-bigint";

let publicKey: paillier.PublicKey | null = null;
let privateKey: paillier.PrivateKey | null = null;

export function getPaillierKeys() {
  if (!publicKey || !privateKey) {
    const publicKeyN = BigInt("0x" + process.env.NEXT_PUBLIC_PAILLIER_N);
    const publicKeyG = BigInt("0x" + process.env.NEXT_PUBLIC_PAILLIER_G);
    const privateKeyLambda = BigInt("0x" + process.env.PAILLIER_LAMBDA);
    const privateKeyMu = BigInt("0x" + process.env.PAILLIER_MU);

    publicKey = new paillier.PublicKey(publicKeyN, publicKeyG);
    privateKey = new paillier.PrivateKey(
      privateKeyLambda,
      privateKeyMu,
      publicKey
    );
  }

  return { publicKey, privateKey };
}

export function decryptDifference(ciphertext: string): number {
  try {
    const { publicKey, privateKey } = getPaillierKeys();

    let decryptedDifference = privateKey.decrypt(BigInt(ciphertext));

    // Handle negative numbers properly
    const halfN = publicKey.n / 2n;
    if (decryptedDifference > halfN) {
      decryptedDifference = decryptedDifference - publicKey.n;
    }

    // Use a proper modulo function for negative numbers
    const mod = (n: bigint, m: bigint) => ((n % m) + m) % m;
    return Number(mod(decryptedDifference, 3n));
  } catch (error) {
    console.error("Error decrypting difference:", error);
    throw new Error(
      `Failed to decrypt difference: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Computes homomorphic difference between two encrypted values locally
 * This replicates what the smart contract does but runs on the server
 * @param encryptedA Encrypted player A move
 * @param encryptedB Encrypted player B move
 * @returns Encrypted difference that can be decrypted with the private key
 */
export function computeDifferenceLocally(
  encryptedA: string,
  encryptedB: string
): string {
  try {
    const { publicKey } = getPaillierKeys();

    // Ensure we're working with BigInt values
    const encA = BigInt(encryptedA);
    const encB = BigInt(encryptedB);

    // Compute Enc(A-B) = Enc(A) * Enc(-B) mod n^2
    // For Paillier, Enc(-B) = Enc(B)^-1 mod n^2
    const encBInverse = publicKey.multiply(encB, -1n);

    // Multiply to get the encrypted difference
    const encryptedDiff = publicKey.addition(encA, encBInverse);

    return encryptedDiff.toString();
  } catch (error) {
    console.error("Error computing homomorphic difference:", error);
    throw new Error(
      `Failed to compute homomorphic difference: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
