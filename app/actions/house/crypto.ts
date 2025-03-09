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
