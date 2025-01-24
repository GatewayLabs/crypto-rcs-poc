import { PAILLIER_PUBLIC_KEY } from "@/config/contracts";
import * as paillier from "paillier-bigint";

export type Move = "ROCK" | "PAPER" | "SCISSORS";

const moveToNumber = {
  ROCK: 0,
  PAPER: 1,
  SCISSORS: 2,
} as const;

// Encrypt a move using Paillier cryptosystem
export async function encryptMove(move: Move): Promise<string> {
  const n = BigInt("0x" + PAILLIER_PUBLIC_KEY.n);
  const g = BigInt("0x" + PAILLIER_PUBLIC_KEY.g);
  const publicKey = new paillier.PublicKey(n, g);

  const moveNum = BigInt(moveToNumber[move] + 10);

  const c = publicKey.encrypt(moveNum);

  return "0x" + c.toString(16);
}

// Convert difference modulo 3 to game result
export function getGameResult(diff: number): "WIN" | "LOSE" | "DRAW" {
  const normalizedDiff = ((diff % 3) + 3) % 3; // Ensure positive result

  if (normalizedDiff === 0) return "DRAW";
  if (normalizedDiff === 1) return "WIN";
  return "LOSE";
}
