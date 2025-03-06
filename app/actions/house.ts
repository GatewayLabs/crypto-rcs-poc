"use server";

import { Move, encryptMove } from "@/lib/crypto";
import { gameContractConfig } from "@/config/contracts";
import { publicClient, walletClient } from "@/config/server";
import * as paillier from "paillier-bigint";
import { DEFAULT_BET_AMOUNT_WEI } from "@/hooks/use-game-contract";
import { executeContractFunction } from "@/lib/wallet-utils";

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

    let gameData;
    try {
      gameData = await publicClient.readContract({
        ...gameContractConfig,
        functionName: "getGameInfo",
        args: [BigInt(gameId)],
      });
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
        value: validBetAmount, // Pass the bet amount as value
      }
    );

    // IMPORTANT: Wait for transaction to be confirmed before continuing
    console.log(`Waiting for transaction ${hash} to be confirmed...`);
    try {
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        timeout: 60_000, // 60 second timeout
        confirmations: 1, // Just need 1 confirmation
      });

      console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    } catch (error) {
      console.warn(
        `Warning: Couldn't confirm transaction, but continuing: ${error}`
      );
      // We'll continue anyway, but flag that we couldn't confirm
    }

    // Wait a moment to give the blockchain state time to update
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verify the game state after joining
    try {
      const finalGameData = await publicClient.readContract({
        ...gameContractConfig,
        functionName: "getGameInfo",
        args: [BigInt(gameId)],
      });

      const updatedPlayerB = finalGameData[1];

      console.log(
        `Game ${gameId} joined status: house address matches playerB = ${
          updatedPlayerB.toLowerCase() ===
          walletClient.account.address.toLowerCase()
        }`
      );

      if (updatedPlayerB === "0x0000000000000000000000000000000000000000") {
        console.warn(
          `Game ${gameId} may not have been properly joined. Waiting longer...`
        );

        // Wait longer and check again
        await new Promise((resolve) => setTimeout(resolve, 5000));

        const retryGameData = await publicClient.readContract({
          ...gameContractConfig,
          functionName: "getGameInfo",
          args: [BigInt(gameId)],
        });

        const retryPlayerB = retryGameData[1];

        if (retryPlayerB === "0x0000000000000000000000000000000000000000") {
          throw new Error(
            `Failed to join game ${gameId} - transaction may not have been properly processed`
          );
        } else {
          console.log(`Game ${gameId} joined successfully after waiting`);
        }
      }
    } catch (error) {
      console.warn(`Could not verify final game state after joining:`, error);
      throw new Error(
        `Failed to verify game state after joining: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

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

    // Helper function to wait and retry reading game data with backoff
    const getGameDataWithRetry = async (
      retries = 3,
      initialDelay = 1000
    ): Promise<any> => {
      let attempt = 0;
      let lastError;

      while (attempt < retries) {
        try {
          const data = await publicClient.readContract({
            ...gameContractConfig,
            functionName: "getGameInfo",
            args: [BigInt(gameId)],
          });

          // Check if playerB is set, which indicates successful joining
          if (data[1] !== "0x0000000000000000000000000000000000000000") {
            return data;
          }

          // If playerB is not set yet, this is a specific condition we should retry
          console.log(
            `Game ${gameId} not yet joined (attempt ${attempt + 1}), waiting...`
          );
        } catch (error) {
          lastError = error;
          console.warn(
            `Error fetching game data (attempt ${attempt + 1}):`,
            error
          );
        }

        // Exponential backoff
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`Waiting ${delay}ms before retrying...`);
        await new Promise((r) => setTimeout(r, delay));

        attempt++;
      }

      // If we got here, all retries failed
      throw (
        lastError ||
        new Error(`Failed to fetch valid game data after ${retries} attempts`)
      );
    };

    // Fetch game data with retry
    let gameData;
    try {
      gameData = await getGameDataWithRetry();
    } catch (error) {
      throw new Error(
        `Failed to fetch game data: Game ID ${gameId} may not exist or transaction not confirmed`
      );
    }

    // Extract game info
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
    ] = gameData;

    console.log(`Resolving game ${gameId}:`);
    console.log(`- Players: A=${playerA}, B=${playerB}`);
    console.log(
      `- State: finished=${finished}, bothCommitted=${bothCommitted}`
    );

    // If game is already finished, return the result
    if (finished && revealedDiff !== null && revealedDiff !== undefined) {
      return {
        success: true,
        pendingResult: Number(revealedDiff),
        txHash: "",
        status: "completed",
      };
    }

    // Validate game state with improved error message
    if (
      playerA === "0x0000000000000000000000000000000000000000" ||
      playerB === "0x0000000000000000000000000000000000000000"
    ) {
      if (playerB === "0x0000000000000000000000000000000000000000") {
        throw new Error(
          `Game ${gameId}: Player B has not joined yet. The join transaction may still be processing.`
        );
      } else {
        throw new Error(
          `Game ${gameId}: Invalid game state - playerA is empty`
        );
      }
    }

    // Function to execute a transaction and wait for confirmation
    const executeAndWaitForConfirmation = async (
      functionName: string,
      args: any[],
      waitTimeMs = 5000 // Default wait time after confirmation
    ): Promise<string> => {
      // Execute the transaction
      const txHash = await executeContractFunction(
        gameContractConfig,
        functionName,
        args,
        {
          retries: 3,
          logPrefix: `${functionName} (async) for game ${gameId}`,
        }
      );

      // Wait for transaction confirmation
      console.log(
        `Waiting for ${functionName} transaction ${txHash} to be confirmed...`
      );
      try {
        await publicClient.waitForTransactionReceipt({
          hash: txHash,
          timeout: 60_000, // 60 second timeout
          confirmations: 1,
        });

        console.log(
          `${functionName} transaction confirmed, waiting ${waitTimeMs}ms for state to update...`
        );

        // Wait a bit more to ensure the blockchain state is updated
        await new Promise((r) => setTimeout(r, waitTimeMs));
      } catch (error) {
        console.warn(
          `Warning: Couldn't confirm ${functionName} transaction: ${error}`
        );
        // Continue anyway, but with a longer wait
        await new Promise((r) => setTimeout(r, waitTimeMs * 2));
      }

      return txHash;
    };

    // Submit moves if not already submitted
    if (!bothCommitted) {
      const txHash = await executeAndWaitForConfirmation("submitMoves", [
        BigInt(gameId),
      ]);

      // After waiting for confirmation, check if moves were actually submitted
      try {
        const updatedData = await publicClient.readContract({
          ...gameContractConfig,
          functionName: "getGameInfo",
          args: [BigInt(gameId)],
        });

        const nowBothCommitted = updatedData[4];
        if (!nowBothCommitted) {
          console.warn(
            `Warning: Moves don't appear to be submitted yet despite confirmed transaction`
          );
        }
      } catch (error) {
        console.warn(`Could not verify if moves were submitted:`, error);
      }

      // Return early with the transaction hash
      return {
        success: true,
        txHash,
        pendingResult: -1, // Indicates transaction is in progress
        status: "submitting_moves",
      };
    }

    // Check if we need to compute difference
    let latestDifferenceCipher;
    try {
      const latestData = await publicClient.readContract({
        ...gameContractConfig,
        functionName: "getGameInfo",
        args: [BigInt(gameId)],
      });
      latestDifferenceCipher = latestData[7]; // differenceCipher is at index 7
    } catch (error) {
      console.warn(`Could not check latest game state:`, error);
    }

    // Compute difference if not already computed
    if (!latestDifferenceCipher || latestDifferenceCipher === "0x") {
      const txHash = await executeAndWaitForConfirmation("computeDifference", [
        BigInt(gameId),
      ]);

      // Check if difference was computed
      try {
        const updatedData = await publicClient.readContract({
          ...gameContractConfig,
          functionName: "getGameInfo",
          args: [BigInt(gameId)],
        });

        latestDifferenceCipher = updatedData[7];
        if (!latestDifferenceCipher || latestDifferenceCipher === "0x") {
          console.warn(
            `Warning: Difference cipher not computed yet despite confirmed transaction`
          );

          // Wait longer and check again
          await new Promise((r) => setTimeout(r, 5000));
          const retryData = await publicClient.readContract({
            ...gameContractConfig,
            functionName: "getGameInfo",
            args: [BigInt(gameId)],
          });

          latestDifferenceCipher = retryData[7];
          if (!latestDifferenceCipher || latestDifferenceCipher === "0x") {
            throw new Error(
              "Failed to compute difference after multiple attempts"
            );
          }
        }
      } catch (error) {
        console.warn(`Could not verify if difference was computed:`, error);
        // Return early without the difference cipher - we'll need to retry later
        return {
          success: true,
          txHash,
          pendingResult: -1,
          status: "computing_difference",
        };
      }

      // If we still don't have the difference cipher, return early
      if (!latestDifferenceCipher || latestDifferenceCipher === "0x") {
        return {
          success: true,
          txHash,
          pendingResult: -1,
          status: "computing_difference",
        };
      }
    }

    // Now we should have the difference cipher, so decrypt it
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
    let decryptedDifference = privateKey.decrypt(
      BigInt(latestDifferenceCipher)
    );

    // Handle negative numbers properly
    const halfN = publicKey.n / 2n;
    if (decryptedDifference > halfN) {
      decryptedDifference = decryptedDifference - publicKey.n;
    }

    // Use a proper modulo function for negative numbers
    const mod = (n: bigint, m: bigint) => ((n % m) + m) % m;
    const diffMod3 = BigInt(mod(decryptedDifference, 3n));

    console.log(
      `Decrypted difference for game ${gameId}: ${decryptedDifference}, properly adjusted mod 3: ${diffMod3}`
    );

    // Check if the game is already finalized first
    let isFinished = false;
    try {
      const currentGameData = await publicClient.readContract({
        ...gameContractConfig,
        functionName: "getGameInfo",
        args: [BigInt(gameId)],
      });
      isFinished = currentGameData[3]; // finished is at index 3

      if (isFinished) {
        console.log(`Game ${gameId} is already finalized.`);
        const finalResult = Number(currentGameData[8]); // revealedDiff is at index 8
        return {
          success: true,
          pendingResult: finalResult,
          status: "completed",
        };
      }
    } catch (error) {
      console.warn(`Could not check if game is already finalized:`, error);
    }

    // Finalize the game and wait for confirmation
    const txHash = await executeAndWaitForConfirmation(
      "finalizeGame",
      [BigInt(gameId), diffMod3],
      5000 // Wait a bit longer after finalization
    );

    // Return with transaction hash and the pending result
    return {
      success: true,
      txHash,
      pendingResult: Number(diffMod3),
      status: "finalizing",
    };
  } catch (error) {
    console.error("Error in resolveGameAsync:", error);
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
    await publicClient.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    });

    return { confirmed: true };
  } catch (error) {
    console.error(`Error checking transaction status: ${error}`);
    return { confirmed: false };
  }
}

export async function getGameResult(gameId: number): Promise<{
  success: boolean;
  result?: number;
  finished?: boolean;
  error?: string;
}> {
  try {
    const gameData = await publicClient.readContract({
      ...gameContractConfig,
      functionName: "getGameInfo",
      args: [BigInt(gameId)],
    });

    const [, , winner, finished, , , , , revealedDiff] = gameData;

    return {
      success: true,
      result: Number(revealedDiff),
      finished: finished,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
