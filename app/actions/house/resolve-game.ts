"use server";

import { gameContractConfig } from "@/config/contracts";
import { executeContractFunction } from "@/lib/wallet-utils";
import {
  getGameProcessingStatus,
  markGameAsCompleted,
  updateGameProcessingStep,
  mapStepToStatus,
  removeGameFromCache,
  markGameAsWaitingForJoin,
} from "./cache";
import {
  getGameState,
  quickCheckGameFinished,
  waitForTransaction,
} from "./utils";
import { decryptDifference } from "./crypto";
import { publicClient } from "@/config/server";
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

    // Check if this game is already being processed or completed
    const cachedStatus = await getGameProcessingStatus(gameId);

    if (cachedStatus.isProcessed) {
      const state = cachedStatus.state!;

      // If game is in "waiting for join" state
      if (
        state.status === "processing" &&
        state.step === "joining" &&
        state.waitingForConfirmation
      ) {
        // Check if we have a valid txHash to check
        if (state.txHash && isHex(state.txHash)) {
          try {
            const receipt = await publicClient.getTransactionReceipt({
              hash: state.txHash as `0x${string}`,
            });

            if (receipt) {
              console.log(
                `Join transaction for game ${gameId} has been confirmed, proceeding with resolution`
              );
              // Transaction confirmed, update step and continue
              await await updateGameProcessingStep(
                gameId,
                "submitting_moves",
                state.txHash
              );
            } else {
              // Transaction still pending, return waiting status to client
              console.log(
                `Join transaction for game ${gameId} still pending, waiting for confirmation`
              );
              return {
                success: true,
                txHash: state.txHash,
                status: "submitting_moves",
                pendingResult: -1,
                info: "Waiting for join transaction confirmation",
              };
            }
          } catch (error) {
            console.log(
              `Error checking join tx status for game ${gameId}: ${error}`
            );

            // If too many retries, reset the game state
            if (state.retryCount && state.retryCount > 5) {
              console.log(
                `Too many retries (${state.retryCount}) for game ${gameId}, removing from cache`
              );
              await removeGameFromCache(gameId);
              return {
                success: false,
                error:
                  "Transaction confirmation timed out after multiple retries",
              };
            }

            // If we can't check tx status, just tell client to keep waiting
            return {
              success: true,
              txHash: state.txHash,
              status: "submitting_moves",
              pendingResult: -1,
              info: "Waiting for transaction confirmation",
            };
          }
        } else {
          // No valid transaction hash, but marked as waiting - check game state directly
          console.log(
            `Game ${gameId} marked as waiting for join, but no valid txHash. Checking game state directly.`
          );

          // If too many retries, reset game state
          if (state.retryCount && state.retryCount > 5) {
            console.log(
              `Too many retries (${state.retryCount}) for game ${gameId}, removing from cache`
            );
            await removeGameFromCache(gameId);
            return {
              success: false,
              error:
                "Transaction status checking failed after multiple retries",
            };
          }
        }
      } else if (state.status === "completed" && state.result !== undefined) {
        console.log(`Using cached result for game ${gameId}: ${state.result}`);
        return {
          success: true,
          pendingResult: state.result,
          status: "completed",
          txHash:
            state.txHash && isHex(state.txHash) ? state.txHash : undefined,
        };
      } else if (state.status === "processing") {
        console.log(`Game ${gameId} is being processed at step: ${state.step}`);
        return {
          success: true,
          txHash:
            state.txHash && isHex(state.txHash) ? state.txHash : undefined,
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
      const validTxHash =
        existingState?.txHash && isHex(existingState.txHash)
          ? existingState.txHash
          : undefined;
      await markGameAsCompleted(gameId, quickCheck.result, validTxHash);

      console.log(
        `Game ${gameId} is already finished with result: ${quickCheck.result}`
      );
      return {
        success: true,
        pendingResult: quickCheck.result,
        status: "completed",
        txHash: validTxHash,
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
      const validTxHash =
        existingState?.txHash && isHex(existingState.txHash)
          ? existingState.txHash
          : undefined;
      await markGameAsCompleted(gameId, result, validTxHash);

      return {
        success: true,
        pendingResult: result,
        status: "completed",
        txHash: validTxHash,
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
          // IMPORTANT FIX: Instead of just throwing error, handle this as a transient state
          // Find the join transaction hash from the cache
          let joinTxHash = undefined;
          if (
            cachedStatus.isProcessed &&
            cachedStatus.state?.txHash &&
            isHex(cachedStatus.state.txHash)
          ) {
            joinTxHash = cachedStatus.state.txHash;
          }

          // Mark the game as waiting for join confirmation
          await markGameAsWaitingForJoin(gameId, joinTxHash);

          // Return a more helpful response to the client
          return {
            success: true, // Note: we're returning success:true because this is expected
            error: `Game ${gameId}: Waiting for Player B join transaction to be confirmed`,
            status: "submitting_moves",
            txHash: joinTxHash,
            info: "Waiting for player B to join",
          };
        } else {
          // This is a real error - PlayerA missing
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

    // Mark the initial step with any valid transaction hash from cache
    const existingTxHash =
      cachedStatus.isProcessed &&
      cachedStatus.state?.txHash &&
      isHex(cachedStatus.state.txHash)
        ? cachedStatus.state.txHash
        : undefined;
    await updateGameProcessingStep(gameId, currentStep, existingTxHash);

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
        await updateGameProcessingStep(
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
          await updateGameProcessingStep(gameId, "computing_difference");
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
        await updateGameProcessingStep(gameId, "finalizing", computeDiffHash);

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
          await updateGameProcessingStep(gameId, "finalizing");
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
      await markGameAsCompleted(gameId, diffMod3, finalizeHash);

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

          const validTxHash =
            cachedStatus.isProcessed &&
            cachedStatus.state?.txHash &&
            isHex(cachedStatus.state.txHash)
              ? cachedStatus.state.txHash
              : undefined;
          await markGameAsCompleted(gameId, result, validTxHash);

          return {
            success: true,
            pendingResult: result,
            status: "completed",
            txHash: validTxHash,
          };
        } else {
          // If no revealed difference, use our calculated diffMod3
          const validTxHash =
            cachedStatus.isProcessed &&
            cachedStatus.state?.txHash &&
            isHex(cachedStatus.state.txHash)
              ? cachedStatus.state.txHash
              : undefined;
          await markGameAsCompleted(gameId, diffMod3, validTxHash);

          return {
            success: true,
            pendingResult: diffMod3,
            status: "completed",
            txHash: validTxHash,
          };
        }
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error("Error in resolveGameAsync:", error);

    // IMPORTANT FIX: Only remove from cache for fatal errors, not transient ones
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Define which errors are transient vs. fatal
    const isTransientError =
      errorMessage.includes("Player B has not joined yet") ||
      errorMessage.includes("waiting for confirmation") ||
      errorMessage.includes("network error") ||
      errorMessage.includes("timeout");

    if (!isTransientError) {
      // Only remove from cache for fatal errors
      await removeGameFromCache(gameId);
    }

    return {
      success: false,
      error: errorMessage,
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
