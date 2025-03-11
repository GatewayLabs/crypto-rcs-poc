"use server";

import { gameContractConfig } from "@/config/contracts";
import { executeContractFunction } from "@/lib/wallet-utils";
import {
  getGameProcessingStatus,
  markGameAsCompleted,
  updateGameProcessingStep,
  mapStepToStatus,
  GameStep,
} from "./cache";
import { getGameState, waitForTransaction } from "./utils";
import { decryptDifference } from "./crypto";
import { isHex } from "viem";

// Result types
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

export type ResolveGameStatus =
  | "submitting_moves"
  | "computing_difference"
  | "finalizing"
  | "completed";

export async function resolveGameAsync(gameId: number): Promise<{
  success: boolean;
  txHash?: string;
  pendingResult?: number;
  error?: string;
  status?: ResolveGameStatus;
  info?: string;
}> {
  try {
    if (gameId === undefined || gameId === null || isNaN(gameId)) {
      throw new Error("Invalid game ID");
    }

    console.log(`Starting to resolve game ${gameId}`);

    // Check for cached results first (fastest path)
    const cachedStatus = await getGameProcessingStatus(gameId);

    // If we already completed this game, return the cached result immediately
    if (
      cachedStatus.isProcessed &&
      cachedStatus.state?.status === "completed" &&
      cachedStatus.state?.result !== undefined
    ) {
      console.log(
        `Using cached result for game ${gameId}: ${cachedStatus.state.result}`
      );
      return {
        success: true,
        pendingResult: cachedStatus.state.result,
        status: "completed",
        txHash:
          cachedStatus.state.txHash && isHex(cachedStatus.state.txHash)
            ? cachedStatus.state.txHash
            : undefined,
      };
    }

    // Check if we're already in the process of resolving this game
    if (cachedStatus.isProcessed && cachedStatus.state) {
      // If we already have a pending result, use that
      if (cachedStatus.state.result !== undefined) {
        console.log(
          `Using pending result for game ${gameId}: ${cachedStatus.state.result}`
        );

        // Return the pending result
        return {
          success: true,
          pendingResult: cachedStatus.state.result,
          status: mapStepToStatus(cachedStatus.state.step),
          txHash:
            cachedStatus.state.txHash && isHex(cachedStatus.state.txHash)
              ? cachedStatus.state.txHash
              : undefined,
        };
      }
    }

    // Get the game state
    let gameState = await getGameState(gameId);

    // If game is already finished on chain, use that result
    if (gameState.finished && gameState.revealedDiff !== undefined) {
      const result = Number(gameState.revealedDiff);
      console.log(
        `Game ${gameId} is already finalized on chain with result: ${result}`
      );
      await markGameAsCompleted(gameId, result);
      return {
        success: true,
        pendingResult: result,
        status: "completed",
      };
    }

    // Calculate the result optimistically if we have both encrypted moves
    let precomputedDiffMod3: number | undefined;

    if (
      gameState.encChoiceA &&
      gameState.encChoiceA !== "0x" &&
      gameState.encChoiceB &&
      gameState.encChoiceB !== "0x"
    ) {
      try {
        console.log(`Computing difference locally for game ${gameId}`);

        // Use any existing difference cipher first if available
        if (gameState.differenceCipher && gameState.differenceCipher !== "0x") {
          precomputedDiffMod3 = decryptDifference(gameState.differenceCipher);
          console.log(
            `Using existing difference cipher: ${precomputedDiffMod3}`
          );
        } else {
          // Calculate locally
          const optimisticResult = await computeOptimisticResult(
            gameId,
            gameState.encChoiceA,
            gameState.encChoiceB
          );

          if (
            optimisticResult.success &&
            optimisticResult.calculatedDiff !== undefined
          ) {
            precomputedDiffMod3 = optimisticResult.calculatedDiff;
            console.log(
              `Calculated difference locally: ${precomputedDiffMod3}`
            );
          }
        }
      } catch (error) {
        console.warn(`Error precomputing result: ${error}`);
        // continue with normal flow even if precomputation fails
      }
    }

    // Determine the next required step in the resolution process
    let currentStep: GameStep = "joining";
    if (gameState.differenceCipher && gameState.differenceCipher !== "0x") {
      currentStep = "finalizing";
    } else if (gameState.bothCommitted) {
      currentStep = "computing_difference";
    } else if (
      gameState.playerB !== "0x0000000000000000000000000000000000000000"
    ) {
      currentStep = "submitting_moves";
    }

    // Get any existing transaction hash from cache
    const existingTxHash =
      cachedStatus.isProcessed &&
      cachedStatus.state?.txHash &&
      isHex(cachedStatus.state.txHash)
        ? cachedStatus.state.txHash
        : undefined;

    // Update processing status with the current step
    await updateGameProcessingStep(gameId, currentStep, existingTxHash);

    // Process based on the current step
    if (currentStep === "submitting_moves") {
      try {
        console.log(`Submitting moves for game ${gameId}`);
        const submitMovesHash = await executeContractFunction(
          gameContractConfig,
          "submitMoves",
          [BigInt(gameId)],
          { retries: 1, logPrefix: `SubmitMoves:${gameId}` }
        );

        // Update processing status
        await updateGameProcessingStep(
          gameId,
          "computing_difference",
          submitMovesHash
        );

        return {
          success: true,
          txHash: submitMovesHash,
          status: "submitting_moves",
          info: "Moves submitted, continue polling",
          // Include precomputed result if available
          pendingResult: precomputedDiffMod3,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        if (errorMessage.includes("Moves already submitted")) {
          // Moves already submitted, advance to next step
          currentStep = "computing_difference";
        } else {
          throw error;
        }
      }
    }

    if (currentStep === "computing_difference") {
      try {
        console.log(`Computing difference for game ${gameId}`);
        const computeDiffHash = await executeContractFunction(
          gameContractConfig,
          "computeDifference",
          [BigInt(gameId)],
          { retries: 1, logPrefix: `ComputeDiff:${gameId}` }
        );

        // Update processing status
        await updateGameProcessingStep(gameId, "finalizing", computeDiffHash);

        return {
          success: true,
          txHash: computeDiffHash,
          status: "computing_difference",
          info: "Computing difference, continue polling",
          // Include precomputed result if available
          pendingResult: precomputedDiffMod3,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        if (errorMessage.includes("Difference already computed")) {
          // Difference already computed, advance to next step
          currentStep = "finalizing";
        } else {
          throw error;
        }
      }
    }

    if (currentStep === "finalizing") {
      // At this point, the difference should be computed on-chain
      // Either use our precomputed result or calculate it from the difference cipher
      let diffMod3: number;

      if (precomputedDiffMod3 !== undefined) {
        // Use our precomputed result
        diffMod3 = precomputedDiffMod3;
      } else if (
        gameState.differenceCipher &&
        gameState.differenceCipher !== "0x"
      ) {
        // Calculate from the difference cipher
        console.log(`Decrypting difference for game ${gameId}`);
        diffMod3 = decryptDifference(gameState.differenceCipher);
      } else {
        throw new Error(`No difference cipher available for game ${gameId}`);
      }

      try {
        console.log(`Finalizing game ${gameId} with diffMod3=${diffMod3}`);
        const finalizeHash = await executeContractFunction(
          gameContractConfig,
          "finalizeGame",
          [BigInt(gameId), BigInt(diffMod3)],
          { retries: 1, logPrefix: `FinalizeGame:${gameId}` }
        );

        // Mark as completed with transaction hash
        await markGameAsCompleted(gameId, diffMod3, finalizeHash);

        return {
          success: true,
          txHash: finalizeHash,
          pendingResult: diffMod3,
          status: "completed",
          info: "Game finalized",
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        if (
          errorMessage.includes("Game already finalized") ||
          errorMessage.includes("Game is already finished")
        ) {
          console.log(`Game ${gameId} was already finalized`);

          // Check if we can get the result from the chain
          if (gameState.revealedDiff !== undefined) {
            const result = Number(gameState.revealedDiff);
            await markGameAsCompleted(gameId, result);
            return {
              success: true,
              pendingResult: result,
              status: "completed",
            };
          } else {
            // Use our calculated result
            await markGameAsCompleted(gameId, diffMod3);
            return {
              success: true,
              pendingResult: diffMod3,
              status: "completed",
            };
          }
        } else {
          throw error;
        }
      }
    }

    // If we reach here, return the current status for polling
    return {
      success: true,
      status: mapStepToStatus(currentStep),
      info: `Game is being processed at step: ${currentStep}`,
      // Include precomputed result if available
      pendingResult: precomputedDiffMod3,
      txHash: existingTxHash,
    };
  } catch (error) {
    console.error(`Error in resolveGameAsync: ${error}`);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to resolve game: ${errorMessage}`,
    };
  }
}

export async function checkTransactionStatus(txHash: string): Promise<{
  confirmed: boolean;
  error?: string;
}> {
  // Validate txHash format
  if (!txHash || !isHex(txHash)) {
    return {
      confirmed: false,
      error: `Invalid transaction hash: ${txHash}`,
    };
  }

  try {
    return waitForTransaction(txHash)
      .then((confirmed) => ({ confirmed }))
      .catch((error) => ({
        confirmed: false,
        error: error instanceof Error ? error.message : String(error),
      }));
  } catch (error) {
    return {
      confirmed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function getGameResult(gameId: number): Promise<{
  success: boolean;
  result?: number;
  finished?: boolean;
  error?: string;
}> {
  try {
    // Check cache first
    const cachedStatus = await getGameProcessingStatus(gameId);
    if (
      cachedStatus.isProcessed &&
      cachedStatus.state?.status === "completed" &&
      cachedStatus.state?.result !== undefined
    ) {
      return {
        success: true,
        result: cachedStatus.state.result,
        finished: true,
      };
    }

    // Fallback to contract check
    const gameState = await getGameState(gameId);

    // If game is finished, cache the result
    if (
      gameState.finished &&
      gameState.revealedDiff !== undefined &&
      gameState.revealedDiff !== null
    ) {
      const validTxHash =
        cachedStatus.isProcessed &&
        cachedStatus.state?.txHash &&
        isHex(cachedStatus.state.txHash)
          ? cachedStatus.state.txHash
          : undefined;
      await markGameAsCompleted(
        gameId,
        Number(gameState.revealedDiff),
        validTxHash
      );
    }

    return {
      success: true,
      result: Number(gameState.revealedDiff),
      finished: gameState.finished,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Optimistically computes the game result using encrypted move values
 * This runs in parallel with blockchain transactions to speed up the UI experience
 */
export async function computeOptimisticResult(
  gameId: number,
  encryptedPlayerMove: string,
  encryptedHouseMove: string
): Promise<{
  success: boolean;
  calculatedDiff?: number;
  error?: string;
}> {
  try {
    if (!encryptedPlayerMove || !encryptedHouseMove) {
      return {
        success: false,
        error: "Missing encrypted moves for optimistic calculation",
      };
    }

    // Load the game state to confirm we have the correct values
    const gameState = await getGameState(gameId);

    // Verify the encrypted moves match what's on-chain
    if (
      gameState.encChoiceA !== encryptedPlayerMove ||
      gameState.encChoiceB !== encryptedHouseMove
    ) {
      return {
        success: false,
        error: "Encrypted moves don't match on-chain values",
      };
    }

    // Use the crypto utilities to compute difference locally
    // This could be faster than waiting for the blockchain
    const calculatedDiff = decryptDifference(
      await computeHomomorphicDifference(
        encryptedPlayerMove,
        encryptedHouseMove
      )
    );

    // Cache the computed result for later verification
    await updateGameProcessingStep(gameId, "finalizing");

    return {
      success: true,
      calculatedDiff,
    };
  } catch (error) {
    console.error(`Error in optimistic result calculation: ${error}`);
    return {
      success: false,
      error: `Failed to calculate optimistic result: ${error}`,
    };
  }
}

/**
 * Computes the homomorphic difference between two encrypted values
 * Similar to what the smart contract does, but performed locally
 */
async function computeHomomorphicDifference(
  encryptedA: string,
  encryptedB: string
): Promise<string> {
  // This would use your Paillier library to compute Enc(A-B)
  // The implementation depends on your specific crypto library

  // For demonstration, assuming your crypto.ts has this functionality
  // You would replace this with your actual homomorphic computation
  try {
    // Import the right homomorphic operation from your crypto library
    const { computeDifferenceLocally } = await import("./crypto");
    return computeDifferenceLocally(encryptedA, encryptedB);
  } catch (error) {
    // If the function doesn't exist yet, this is a placeholder
    console.warn("Local homomorphic difference computation not implemented");
    // Return a placeholder that will force using the blockchain result
    return "0x";
  }
}
