"use server";

import { Move, encryptMove } from "@/lib/crypto";
import { gameContractConfig } from "@/config/contracts";
import { publicClient, walletClient } from "@/config/server";
import { parseEventLogs } from "viem";
import * as paillier from "paillier-bigint";
import { DEFAULT_BET_AMOUNT_WEI } from "@/hooks/use-game-contract";

function generateHouseMove(): Move {
  const moves: Move[] = ["ROCK", "PAPER", "SCISSORS"];
  const weights = [0.4, 0.3, 0.3];
  const random = Math.random();
  let sum = 0;
  for (let i = 0; i < weights.length; i++) {
    sum += weights[i];
    if (random <= sum) return moves[i];
  }
  return "ROCK";
}

export async function playHouseMove(
  gameId: number,
  betAmount = DEFAULT_BET_AMOUNT_WEI
) {
  try {
    if (gameId === undefined || gameId === null || isNaN(gameId)) {
      throw new Error("Invalid game ID");
    }

    const validBetAmount =
      betAmount && !isNaN(Number(betAmount))
        ? betAmount
        : DEFAULT_BET_AMOUNT_WEI;

    const gameData = await publicClient.readContract({
      ...gameContractConfig,
      functionName: "getGameInfo",
      args: [BigInt(gameId)],
    });

    if (
      !gameData ||
      gameData[1] !== "0x0000000000000000000000000000000000000000"
    ) {
      throw new Error("Game is not available for house move");
    }

    const houseMove = generateHouseMove();
    const encryptedMove = (await encryptMove(houseMove)) as `0x${string}`;

    const { request } = await publicClient.simulateContract({
      ...gameContractConfig,
      functionName: "joinGame",
      args: [BigInt(gameId), encryptedMove],
      account: walletClient.account,
      value: validBetAmount,
    });

    const hash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    return {
      success: true,
      hash: receipt.transactionHash,
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
    const gameData = await publicClient.readContract({
      ...gameContractConfig,
      functionName: "getGameInfo",
      args: [BigInt(gameId)],
    });

    const [playerA, playerB] = gameData;
    if (
      playerA === "0x0000000000000000000000000000000000000000" ||
      playerB === "0x0000000000000000000000000000000000000000"
    ) {
      throw new Error("Both moves must be committed first");
    }

    // Submit moves
    const { request: submitRequest } = await publicClient.simulateContract({
      ...gameContractConfig,
      functionName: "submitMoves",
      args: [BigInt(gameId)],
      account: walletClient.account,
    });

    const submitHash = await walletClient.writeContract(submitRequest);
    await publicClient.waitForTransactionReceipt({ hash: submitHash });

    // Compute difference
    const { request: computeRequest } = await publicClient.simulateContract({
      ...gameContractConfig,
      functionName: "computeDifference",
      args: [BigInt(gameId)],
      account: walletClient.account,
    });

    const computeHash = await walletClient.writeContract(computeRequest);
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: computeHash,
    });
    const events = parseEventLogs({
      logs: receipt.logs,
      abi: gameContractConfig.abi,
      eventName: "DifferenceComputed",
    });

    // Get difference cipher
    const result = events[0]?.args?.differenceCipher;

    // Finalize game
    const publicKeyN = BigInt("0x" + process.env.NEXT_PUBLIC_PAILLIER_N);
    const publicKeyG = BigInt("0x" + process.env.NEXT_PUBLIC_PAILLIER_G);

    const privateKeyLambda = BigInt("0x" + process.env.PAILLIER_LAMBDA);
    const privateKeyMu = BigInt("0x" + process.env.PAILLIER_MU);

    // Generate keys
    const publicKey = new paillier.PublicKey(publicKeyN, publicKeyG);
    const privateKey = new paillier.PrivateKey(
      privateKeyLambda,
      privateKeyMu,
      publicKey
    );

    const decryptedDifference = privateKey.decrypt(BigInt(result));
    const diffMod3 = decryptedDifference % 3n;

    const { request: finalizeRequest } = await publicClient.simulateContract({
      ...gameContractConfig,
      functionName: "finalizeGame",
      args: [BigInt(gameId), diffMod3],
      account: walletClient.account,
    });

    const finalizeHash = await walletClient.writeContract(finalizeRequest);
    const finalizationReceipt = await publicClient.waitForTransactionReceipt({
      hash: finalizeHash,
    });

    return {
      success: true,
      hash: finalizationReceipt.transactionHash,
      result: Number(diffMod3),
    };
  } catch (error) {
    console.error("Error resolving game:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
