"use server";

import { gameContractConfig } from "@/config/contracts";
import { executeContractFunction } from "@/lib/wallet-utils";
import {
  getGameProcessingStatus,
  markGameAsCompleted,
  updateGameProcessingStep,
  mapStepToStatus,
  removeGameFromCache,
} from "./cache";
import {
  getGameState,
  quickCheckGameFinished,
  waitForTransaction,
} from "./utils";
import { decryptDifference } from "./crypto";

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
          txHash: state.txHash,
        };
      } else if (state.status === "processing") {
        console.log(`Game ${gameId} is being processed at step: ${state.step}`);
        return {
          success: true,
          txHash: state.txHash,
          pendingResult: -1,
          status: mapStepToStatus(state.step),
        };
      }
    }

    // Quick first check to see if game is already finished
    const quickCheck = await quickCheckGameFinished(gameId);
    if (
      quickCheck.exists &&
      quickCheck.finished &&
      quickCheck.result !== undefined
    ) {
      const existingState = cachedStatus.isProcessed
        ? cachedStatus.state
        : undefined;
      markGameAsCompleted(gameId, quickCheck.result, existingState?.txHash);

      console.log(
        `Game ${gameId} is already finished with result: ${quickCheck.result}`
      );
      return {
        success: true,
        pendingResult: quickCheck.result,
        status: "completed",
        txHash: existingState?.txHash,
      };
    }

    // Get initial game state
    let gameState;
    try {
      gameState = await getGameState(gameId);
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

      const existingState = cachedStatus.isProcessed
        ? cachedStatus.state
        : undefined;
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
        gameState = await getGameState(gameId);
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
    let currentStep:
      | "joining"
      | "submitting_moves"
      | "computing_difference"
      | "finalizing" = "joining";

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

        // Update the step and store the transaction hash
        updateGameProcessingStep(
          gameId,
          "computing_difference",
          submitMovesHash
        );

        // Wait for transaction to be mined
        const confirmed = await waitForTransaction(submitMovesHash);

        if (!confirmed) {
          return {
            success: true,
            txHash: submitMovesHash,
            status: "submitting_moves",
          };
        }

        // Refresh game state
        gameState = await getGameState(gameId);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        if (errorMessage.includes("Moves already submitted")) {
          console.log(
            `Moves for game ${gameId} were already submitted, continuing to next step`
          );
          updateGameProcessingStep(gameId, "computing_difference");
          // Refresh game state
          gameState = await getGameState(gameId);
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

        // Update the step and store the transaction hash
        updateGameProcessingStep(gameId, "finalizing", computeDiffHash);

        // Wait for transaction to be mined
        const confirmed = await waitForTransaction(computeDiffHash);

        if (!confirmed) {
          return {
            success: true,
            txHash: computeDiffHash,
            status: "computing_difference",
          };
        }

        // Refresh game state
        gameState = await getGameState(gameId);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        if (errorMessage.includes("Difference already computed")) {
          console.log(
            `Difference for game ${gameId} was already computed, continuing to next step`
          );
          updateGameProcessingStep(gameId, "finalizing");
          // Refresh game state
          gameState = await getGameState(gameId);
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
    console.log(`Decrypting difference for game ${gameId}`);

    // Decrypt the difference using the Paillier crypto utilities
    const diffMod3 = decryptDifference(gameState.differenceCipher);

    console.log(
      `Decrypted difference for game ${gameId}, diffMod3: ${diffMod3}`
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

        // Refresh game state
        gameState = await getGameState(gameId);

        // If we got a revealed difference, use it
        if (
          gameState.revealedDiff !== undefined &&
          gameState.revealedDiff !== null
        ) {
          const result = Number(gameState.revealedDiff);

          const existingState = cachedStatus.isProcessed
            ? cachedStatus.state
            : undefined;
          markGameAsCompleted(gameId, result, existingState?.txHash);

          return {
            success: true,
            pendingResult: result,
            status: "completed",
            txHash: existingState?.txHash,
          };
        } else {
          // If no revealed difference, use our calculated diffMod3
          const existingState = cachedStatus.isProcessed
            ? cachedStatus.state
            : undefined;
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
    removeGameFromCache(gameId);

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
  return waitForTransaction(txHash)
    .then((confirmed) => ({ confirmed }))
    .catch((error) => ({
      confirmed: false,
      error: error instanceof Error ? error.message : String(error),
    }));
}

export async function getGameResult(gameId: number): Promise<{
  success: boolean;
  result?: number;
  finished?: boolean;
  error?: string;
}> {
  try {
    // Check cache first
    const cachedStatus = getGameProcessingStatus(gameId);
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
      markGameAsCompleted(
        gameId,
        Number(gameState.revealedDiff),
        cachedStatus.state?.txHash
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
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
