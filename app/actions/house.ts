"use server";

import { Move, encryptMove } from "@/lib/crypto";
import { createWalletClient, http, createPublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { gameContractConfig } from "@/config/contracts";
import { mainnet } from "viem/chains";

// House wallet setup
const HOUSE_PRIVATE_KEY = process.env.HOUSE_PRIVATE_KEY!;
const account = privateKeyToAccount(HOUSE_PRIVATE_KEY as `0x${string}`);

// Viem clients
const walletClient = createWalletClient({
  account,
  chain: mainnet,
  transport: http(),
});

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

function generateHouseMove(): Move {
  // Generate random move with slight bias towards ROCK (40% ROCK, 30% PAPER, 30% SCISSORS)
  const moves: Move[] = ["ROCK", "PAPER", "SCISSORS"];
  const weights = [0.4, 0.3, 0.3];

  const random = Math.random();
  let sum = 0;

  for (let i = 0; i < weights.length; i++) {
    sum += weights[i];
    if (random <= sum) {
      return moves[i];
    }
  }

  return "ROCK";
}

export async function playHouseMove(gameId: number) {
  try {
    // First check if the game exists and needs a house move
    const gameData = await publicClient.readContract({
      ...gameContractConfig,
      functionName: "getGameInfo",
      args: [BigInt(gameId)],
    });

    // If game doesn't exist or already has a second player, return
    if (
      !gameData ||
      gameData.playerB !== "0x0000000000000000000000000000000000000000"
    ) {
      throw new Error("Game is not available for house move");
    }

    // Generate and encrypt house move
    const houseMove = generateHouseMove();
    const encryptedMove = await encryptMove(houseMove);

    // Join the game with the house move
    const { request } = await publicClient.simulateContract({
      ...gameContractConfig,
      functionName: "joinGame",
      args: [BigInt(gameId), encryptedMove],
      account: account.address,
    });

    const hash = await walletClient.writeContract(request);

    return {
      success: true,
      hash,
      move: houseMove,
    };
  } catch (error) {
    console.error("Error in house move:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function resolveGame(gameId: number) {
  try {
    // Check game status
    const gameData = await publicClient.readContract({
      ...gameContractConfig,
      functionName: "getGameInfo",
      args: [BigInt(gameId)],
    });

    if (!gameData.bothCommitted) {
      throw new Error("Both moves must be committed first");
    }

    // Submit moves
    const { request: submitRequest } = await publicClient.simulateContract({
      ...gameContractConfig,
      functionName: "submitMoves",
      args: [BigInt(gameId)],
      account: account.address,
    });

    await walletClient.writeContract(submitRequest);

    // Compute difference
    const { request: computeRequest } = await publicClient.simulateContract({
      ...gameContractConfig,
      functionName: "computeDifference",
      args: [BigInt(gameId)],
      account: account.address,
    });

    await walletClient.writeContract(computeRequest);

    // Finalize game (in real implementation, we would decrypt the difference here)
    // For now, using a random result
    const diffMod3 = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1

    const { request: finalizeRequest } = await publicClient.simulateContract({
      ...gameContractConfig,
      functionName: "finalizeGame",
      args: [BigInt(gameId), BigInt(diffMod3)],
      account: account.address,
    });

    const hash = await walletClient.writeContract(finalizeRequest);

    return {
      success: true,
      hash,
      result: diffMod3,
    };
  } catch (error) {
    console.error("Error resolving game:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
