"use server";

import { Move, encryptMove } from "@/lib/crypto";
import { gameContractConfig } from "@/config/contracts";
import { publicClient } from "@/config/server";
import * as paillier from "paillier-bigint";
import { DEFAULT_BET_AMOUNT_WEI } from "@/hooks/use-game-contract";
import { executeContractFunction } from "@/lib/wallet-utils";
import { retry } from "@/lib/utils";

interface GameProcessingState {
  status: "processing" | "completed";
  step:
    | "joining"
    | "submitting_moves"
    | "computing_difference"
    | "finalizing"
    | "done";
  result?: number;
  timestamp: number;
  txHash?: string;
}

// Updated cache
const processedGamesCache = new Map<number, GameProcessingState>();

// Clear old cache entries periodically
function cleanupCache() {
  const now = Date.now();
  const expiryTime = 5 * 60 * 1000; // 5 minutes

  for (const [gameId, data] of processedGamesCache.entries()) {
    if (now - data.timestamp > expiryTime) {
      processedGamesCache.delete(gameId);
    }
  }
}

// Types (keeping existing types)
export type PlayHouseMoveSuccessResult = {
  success: true;
  hash: `0x${string}`;
  move: Move;
};

export type PlayHouseMoveErrorResult = {
  success: false;
  error: string;
};

export type PlayHouseMoveResult =
  | PlayHouseMoveSuccessResult
  | PlayHouseMoveErrorResult;

export type ResolveGameSuccessResult = {
  success: true;
  result: number;
  hash: string;
  info?: string;
};

export type ResolveGameErrorResult = {
  success: false;
  error: string;
};

export type ResolveGameResult =
  | ResolveGameSuccessResult
  | ResolveGameErrorResult;

function generateHouseMove(): Move {
  const moves: Move[] = ["ROCK", "PAPER", "SCISSORS"];
  const randomIndex = Math.floor(Math.random() * moves.length);
  return moves[randomIndex];
}

function getGameProcessingStatus(gameId: number): {
  isProcessed: boolean;
  state?: GameProcessingState;
} {
  // Clean up old entries first
  cleanupCache();

  const entry = processedGamesCache.get(gameId);
  if (!entry) {
    return { isProcessed: false };
  }

  // Check for stale processing - if it's been more than 30 seconds since the last update
  const isStale =
    entry.status === "processing" && Date.now() - entry.timestamp > 30000;

  if (isStale) {
    console.log(`Game ${gameId} processing state is stale, allowing retry`);
    return { isProcessed: false };
  }

  return {
    isProcessed: true,
    state: entry,
  };
}

function updateGameProcessingStep(
  gameId: number,
  step: GameProcessingState["step"],
  txHash?: string
) {
  const existing = processedGamesCache.get(gameId);

  // Only update txHash if a new one is provided
  const newTxHash = txHash || existing?.txHash;

  processedGamesCache.set(gameId, {
    status: "processing",
    step,
    timestamp: Date.now(),
    result: existing?.result,
    txHash: newTxHash,
  });

  console.log(
    `Updated game ${gameId} processing step to: ${step}${
      newTxHash ? ` with txHash: ${newTxHash}` : ""
    }`
  );
}

function markGameAsCompleted(gameId: number, result: number, txHash?: string) {
  const existing = processedGamesCache.get(gameId);

  // Keep the existing txHash if a new one is not provided
  const finalTxHash = txHash || existing?.txHash;

  processedGamesCache.set(gameId, {
    status: "completed",
    step: "done",
    result,
    timestamp: Date.now(),
    txHash: finalTxHash,
  });

  console.log(
    `Marked game ${gameId} as completed with result: ${result}${
      finalTxHash ? ` and txHash: ${finalTxHash}` : ""
    }`
  );
}

export async function playHouseMove(
  gameId: number,
  betAmount = DEFAULT_BET_AMOUNT_WEI
): Promise<PlayHouseMoveResult> {
  try {
    if (gameId === undefined || gameId === null || isNaN(gameId)) {
      throw new Error("Invalid game ID");
    }

    console.log(`Starting house move for game ${gameId} with bet ${betAmount}`);

    const validBetAmount =
      betAmount && !isNaN(Number(betAmount))
        ? betAmount
        : DEFAULT_BET_AMOUNT_WEI;

    // Using retry for reading contract
    let gameData;
    try {
      gameData = await retry(
        () =>
          publicClient.readContract({
            ...gameContractConfig,
            functionName: "getGameInfo",
            args: [BigInt(gameId)],
          }),
        {
          retries: 3,
          backoffMs: 1000,
          shouldRetry: (error) => {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            return (
              errorMessage.includes("network") ||
              errorMessage.includes("timeout") ||
              errorMessage.includes("connection")
            );
          },
          onRetry: (error, attempt) => {
            console.log(
              `Retry attempt ${attempt} for reading game data: ${error}`
            );
          },
        }
      );
    } catch (error) {
      console.error("Error fetching game data:", error);
      throw new Error(
        `Failed to fetch game data: Game ID ${gameId} may not exist`
      );
    }

    if (!gameData) {
      throw new Error(`Game ID ${gameId} does not exist`);
    }

    const [playerA, playerB, winner, finished, bothCommitted, encChoiceA] =
      gameData;

    console.log(`Joining game ${gameId}:`);
    console.log(`- Players: A=${playerA}, B=${playerB}`);
    console.log(
      `- State: finished=${finished}, bothCommitted=${bothCommitted}`
    );

    if (playerB !== "0x0000000000000000000000000000000000000000") {
      throw new Error(
        `Game ID ${gameId} has already been joined by another player (${playerB})`
      );
    }

    if (playerA === "0x0000000000000000000000000000000000000000") {
      throw new Error(`Game ID ${gameId} has not been properly created`);
    }

    if (finished) {
      throw new Error(`Game ID ${gameId} is already finished`);
    }

    if (bothCommitted) {
      throw new Error(`Game ID ${gameId} has already submitted moves`);
    }

    const houseMove = generateHouseMove();
    console.log(`Generated house move for game ${gameId}: ${houseMove}`);

    let encryptedMove, paddedEncryptedMove;

    try {
      encryptedMove = await encryptMove(houseMove);

      paddedEncryptedMove = encryptedMove;
      if (encryptedMove.length % 2 !== 0) {
        paddedEncryptedMove = encryptedMove.replace("0x", "0x0");
      }

      while (paddedEncryptedMove.length < 258) {
        paddedEncryptedMove = paddedEncryptedMove.replace("0x", "0x0");
      }
    } catch (error) {
      console.error("Error encrypting move:", error);
      throw new Error("Failed to encrypt house move");
    }

    // Use the executeContractFunction utility with proper value parameter
    const hash = await executeContractFunction(
      gameContractConfig,
      "joinGame",
      [BigInt(gameId), paddedEncryptedMove as `0x${string}`],
      {
        retries: 3,
        logPrefix: `JoinGame for game ${gameId}`,
        value: validBetAmount,
      }
    );

    const successResponse = {
      success: true as const,
      hash,
      move: houseMove,
    };

    return successResponse;
  } catch (error) {
    console.error("Error in house move:", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function resolveGameAsync(gameId: number): Promise<{
  success: boolean;
  txHash?: string;
  pendingResult?: number;
  error?: string;
  status?:
    | "submitting_moves"
    | "computing_difference"
    | "finalizing"
    | "completed";
}> {
  try {
    if (gameId === undefined || gameId === null || isNaN(gameId)) {
      throw new Error("Invalid game ID");
    }

    console.log(`Starting to resolve game ${gameId}`);

    // Check if this game is already being processed or completed
    const cachedStatus = getGameProcessingStatus(gameId);

    if (cachedStatus.isProcessed) {
      const state = cachedStatus.state!;

      if (state.status === "completed" && state.result !== undefined) {
        console.log(`Using cached result for game ${gameId}: ${state.result}`);
        return {
          success: true,
          pendingResult: state.result,
          status: "completed",
          txHash: state.txHash, // Always include the transaction hash
        };
      } else if (state.status === "processing") {
        // Return information about which step is being processed
        console.log(`Game ${gameId} is being processed at step: ${state.step}`);
        return {
          success: true,
          txHash: state.txHash, // Return the latest transaction hash
          pendingResult: -1,
          status: mapStepToStatus(state.step),
        };
      }
    }

    // Quick first check to see if game is already finished
    try {
      const quickCheckData = await retry(
        () =>
          publicClient.readContract({
            ...gameContractConfig,
            functionName: "getGameInfo",
            args: [BigInt(gameId)],
          }),
        {
          retries: 2,
          backoffMs: 500,
          shouldRetry: (error) => {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            return (
              errorMessage.includes("network") ||
              errorMessage.includes("timeout")
            );
          },
        }
      );

      // If game is already finished, return immediately
      if (quickCheckData[3] && quickCheckData[8] !== undefined) {
        const result = Number(quickCheckData[8]);
        const existingState = processedGamesCache.get(gameId);
        markGameAsCompleted(gameId, result, existingState?.txHash);

        return {
          success: true,
          pendingResult: result,
          status: "completed",
          txHash: existingState?.txHash,
        };
      }
    } catch (error) {
      console.log(`Quick check for finished game failed: ${error}`);
    }

    // Helper function to get game state
    const getGameState = async () => {
      const data = await retry(
        () =>
          publicClient.readContract({
            ...gameContractConfig,
            functionName: "getGameInfo",
            args: [BigInt(gameId)],
          }),
        {
          retries: 3,
          backoffMs: 1000,
          shouldRetry: (error) => {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            return (
              errorMessage.includes("network") ||
              errorMessage.includes("timeout") ||
              errorMessage.includes("connection")
            );
          },
          onRetry: (error, attempt) => {
            console.log(
              `Retry attempt ${attempt} for getting game state: ${error}`
            );
          },
        }
      );

      // Destructure for clarity
      const [
        playerA,
        playerB,
        winner,
        finished,
        bothCommitted,
        encChoiceA,
        encChoiceB,
        differenceCipher,
        revealedDiff,
      ] = data;

      return {
        playerA,
        playerB,
        winner,
        finished,
        bothCommitted,
        encChoiceA,
        encChoiceB,
        differenceCipher,
        revealedDiff,
        raw: data,
      };
    };

    // Get initial game state
    let gameState;
    try {
      gameState = await getGameState();
    } catch (error) {
      throw new Error(
        `Failed to fetch game data: Game ID ${gameId} may not exist`
      );
    }

    console.log(`Resolving game ${gameId}:`);
    console.log(`- Players: A=${gameState.playerA}, B=${gameState.playerB}`);
    console.log(
      `- State: finished=${gameState.finished}, bothCommitted=${gameState.bothCommitted}`
    );

    // If game is already finished, return the result
    if (
      gameState.finished &&
      gameState.revealedDiff !== null &&
      gameState.revealedDiff !== undefined
    ) {
      const result = Number(gameState.revealedDiff);

      // Keep existing transaction hash
      const existingState = processedGamesCache.get(gameId);
      markGameAsCompleted(gameId, result, existingState?.txHash);

      return {
        success: true,
        pendingResult: result,
        status: "completed",
        txHash: existingState?.txHash,
      };
    }

    // For checking if players have joined, we make one retry after a short delay
    if (
      gameState.playerA === "0x0000000000000000000000000000000000000000" ||
      gameState.playerB === "0x0000000000000000000000000000000000000000"
    ) {
      // Wait a short time and check again
      console.log(
        `Game ${gameId}: One or both players not joined yet, waiting briefly...`
      );
      await new Promise((r) => setTimeout(r, 1000));

      try {
        gameState = await getGameState();
      } catch (error) {
        console.error("Error re-checking game state:", error);
      }

      // Now check again
      if (
        gameState.playerA === "0x0000000000000000000000000000000000000000" ||
        gameState.playerB === "0x0000000000000000000000000000000000000000"
      ) {
        if (
          gameState.playerB === "0x0000000000000000000000000000000000000000"
        ) {
          throw new Error(
            `Game ${gameId}: Player B has not joined yet. The join transaction may still be processing.`
          );
        } else {
          throw new Error(
            `Game ${gameId}: Invalid game state - playerA is empty`
          );
        }
      }
    }

    // Determine where to start the resolution process based on game state
    let currentStep: GameProcessingState["step"] = "joining";

    if (gameState.bothCommitted) {
      currentStep = "computing_difference";
    } else if (
      gameState.playerB !== "0x0000000000000000000000000000000000000000"
    ) {
      currentStep = "submitting_moves";
    }

    // Mark the initial step
    updateGameProcessingStep(gameId, currentStep);

    // Step 1: Submit moves if not already done
    if (!gameState.bothCommitted) {
      try {
        console.log(`Submitting moves for game ${gameId}`);
        const submitMovesHash = await executeContractFunction(
          gameContractConfig,
          "submitMoves",
          [BigInt(gameId)],
          { retries: 3, logPrefix: `SubmitMoves:${gameId}` }
        );

        // Update the step with the new transaction hash
        updateGameProcessingStep(
          gameId,
          "computing_difference",
          submitMovesHash
        );

        // Try waiting for transaction confirmation
        try {
          await publicClient.waitForTransactionReceipt({
            hash: submitMovesHash,
            timeout: 15000,
          });

          // Refresh game state and continue
          gameState = await getGameState();
        } catch (timeoutError) {
          // Return to client for polling, with the transaction hash
          return {
            success: true,
            txHash: submitMovesHash,
            status: "submitting_moves",
          };
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        if (errorMessage.includes("Moves already submitted")) {
          console.log(
            `Moves for game ${gameId} were already submitted, continuing to next step`
          );
          updateGameProcessingStep(gameId, "computing_difference");
          // Refresh game state
          gameState = await getGameState();
        } else {
          throw error;
        }
      }
    }

    // Step 2: Compute difference if not already done
    if (!gameState.differenceCipher || gameState.differenceCipher === "0x") {
      try {
        console.log(`Computing difference for game ${gameId}`);
        const computeDiffHash = await executeContractFunction(
          gameContractConfig,
          "computeDifference",
          [BigInt(gameId)],
          { retries: 3, logPrefix: `ComputeDiff:${gameId}` }
        );

        // Update processing step with new hash
        updateGameProcessingStep(gameId, "finalizing", computeDiffHash);

        // Wait for transaction confirmation
        try {
          await publicClient.waitForTransactionReceipt({
            hash: computeDiffHash,
            timeout: 15000,
          });

          // Refresh game state and continue
          gameState = await getGameState();
        } catch (timeoutError) {
          // Return for client polling with transaction hash
          return {
            success: true,
            txHash: computeDiffHash,
            status: "computing_difference",
          };
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        if (errorMessage.includes("Difference already computed")) {
          console.log(
            `Difference for game ${gameId} was already computed, continuing to next step`
          );
          updateGameProcessingStep(gameId, "finalizing");
          // Refresh game state
          gameState = await getGameState();
        } else {
          throw error;
        }
      }
    }

    // Make sure we have the difference cipher
    if (!gameState.differenceCipher || gameState.differenceCipher === "0x") {
      throw new Error(`Failed to compute difference cipher for game ${gameId}`);
    }

    // Step 3: Decrypt and finalize
    // (Paillier key setup and decryption logic - same as before)
    console.log(`Decrypting difference for game ${gameId}`);

    // Paillier Key Setup
    const publicKeyN = BigInt("0x" + process.env.NEXT_PUBLIC_PAILLIER_N);
    const publicKeyG = BigInt("0x" + process.env.NEXT_PUBLIC_PAILLIER_G);
    const privateKeyLambda = BigInt("0x" + process.env.PAILLIER_LAMBDA);
    const privateKeyMu = BigInt("0x" + process.env.PAILLIER_MU);

    const publicKey = new paillier.PublicKey(publicKeyN, publicKeyG);
    const privateKey = new paillier.PrivateKey(
      privateKeyLambda,
      privateKeyMu,
      publicKey
    );

    // Decrypt the difference
    let decryptedDifference;
    try {
      decryptedDifference = privateKey.decrypt(
        BigInt(gameState.differenceCipher)
      );
    } catch (error) {
      console.error(`Error decrypting difference: ${error}`);
      throw new Error(`Failed to decrypt difference for game ${gameId}`);
    }

    // Handle negative numbers properly
    const halfN = publicKey.n / 2n;
    if (decryptedDifference > halfN) {
      decryptedDifference = decryptedDifference - publicKey.n;
    }

    // Use a proper modulo function for negative numbers
    const mod = (n: bigint, m: bigint) => ((n % m) + m) % m;
    const diffMod3 = Number(mod(decryptedDifference, 3n));

    console.log(
      `Decrypted difference for game ${gameId}: ${decryptedDifference}, properly adjusted mod 3: ${diffMod3}`
    );

    // Step 4: Finalize the game
    try {
      console.log(`Finalizing game ${gameId} with diffMod3=${diffMod3}`);
      const finalizeHash = await executeContractFunction(
        gameContractConfig,
        "finalizeGame",
        [BigInt(gameId), BigInt(diffMod3)],
        { retries: 3, logPrefix: `FinalizeGame:${gameId}` }
      );

      // Mark game as completed with the finalize transaction hash
      markGameAsCompleted(gameId, diffMod3, finalizeHash);

      // Return the transaction hash to the client
      return {
        success: true,
        txHash: finalizeHash,
        pendingResult: diffMod3,
        status: "finalizing",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (
        errorMessage.includes("Game already finalized") ||
        errorMessage.includes("Game is already finished")
      ) {
        console.log(
          `Game ${gameId} was already finalized, getting final result`
        );

        const existingState = processedGamesCache.get(gameId);

        if (
          gameState.revealedDiff !== undefined &&
          gameState.revealedDiff !== null
        ) {
          const result = Number(gameState.revealedDiff);
          markGameAsCompleted(gameId, result, existingState?.txHash);

          return {
            success: true,
            pendingResult: result,
            status: "completed",
            txHash: existingState?.txHash,
          };
        } else {
          markGameAsCompleted(gameId, diffMod3, existingState?.txHash);

          return {
            success: true,
            pendingResult: diffMod3,
            status: "completed",
            txHash: existingState?.txHash,
          };
        }
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error("Error in resolveGameAsync:", error);

    // Remove from processing cache if there's an error
    processedGamesCache.delete(gameId);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function checkTransactionStatus(txHash: string): Promise<{
  confirmed: boolean;
  error?: string;
}> {
  try {
    if (!txHash || txHash === "") {
      return { confirmed: false, error: "Invalid transaction hash" };
    }

    console.log(`Checking transaction status for ${txHash}`);

    // Use retry for checking transaction status
    await retry(
      () =>
        publicClient.getTransactionReceipt({
          hash: txHash as `0x${string}`,
        }),
      {
        retries: 3,
        backoffMs: 1000,
        shouldRetry: (error) => {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          return (
            errorMessage.includes("network") ||
            errorMessage.includes("timeout") ||
            errorMessage.includes("not found") // Transaction might still be pending
          );
        },
        onRetry: (error, attempt) => {
          console.log(
            `Retry attempt ${attempt} for checking transaction status: ${error}`
          );
        },
      }
    );

    return { confirmed: true };
  } catch (error) {
    console.error(`Error checking transaction status: ${error}`);
    return { confirmed: false };
  }
}

// Helper function to map internal step to client-facing status
function mapStepToStatus(
  step: GameProcessingState["step"]
): "submitting_moves" | "computing_difference" | "finalizing" | "completed" {
  switch (step) {
    case "joining":
      return "submitting_moves";
    case "submitting_moves":
      return "submitting_moves";
    case "computing_difference":
      return "computing_difference";
    case "finalizing":
      return "finalizing";
    case "done":
      return "completed";
    default:
      return "computing_difference";
  }
}
