"use server";

import { Move, encryptMove } from "@/lib/crypto";
import { gameContractConfig } from "@/config/contracts";
import { publicClient } from "@/config/server";
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

    // Quick first check to see if game is already finished
    try {
      const quickCheckData = await publicClient.readContract({
        ...gameContractConfig,
        functionName: "getGameInfo",
        args: [BigInt(gameId)],
      });

      // If game is already finished, return immediately
      if (quickCheckData[3] && quickCheckData[8] !== undefined) {
        // finished && revealedDiff
        console.log(
          `Game ${gameId} is already finished with result: ${quickCheckData[8]}`
        );
        return {
          success: true,
          pendingResult: Number(quickCheckData[8]),
          status: "completed",
        };
      }
    } catch (error) {
      // Just log and continue with normal flow
      console.log(`Quick check for finished game failed: ${error}`);
    }

    // Function to execute a transaction and handle specific errors
    const executeTransaction = async (
      functionName: string,
      args: any[],
      options: {
        waitForConfirmation?: boolean;
        maxWaitTimeMs?: number;
        expectedErrors?: { [key: string]: string }; // Map error messages to statuses
      } = {}
    ): Promise<{ txHash: string; confirmed: boolean; status?: string }> => {
      const {
        waitForConfirmation = false,
        maxWaitTimeMs = 30000, // 30 seconds max wait
        expectedErrors = {},
      } = options;

      try {
        // Execute the transaction
        const txHash = await executeContractFunction(
          gameContractConfig,
          functionName,
          args,
          {
            retries: 2,
            logPrefix: `${functionName} (async) for game ${gameId}`,
          }
        );

        // Return early if we don't need to wait for confirmation
        if (!waitForConfirmation) {
          return { txHash, confirmed: false };
        }

        // Wait for transaction confirmation with timeout
        console.log(
          `Waiting for ${functionName} transaction ${txHash} to be confirmed...`
        );
        try {
          const startTime = Date.now();
          await publicClient.waitForTransactionReceipt({
            hash: txHash,
            timeout: maxWaitTimeMs,
            confirmations: 1,
          });

          const timeElapsed = Date.now() - startTime;
          console.log(
            `${functionName} transaction confirmed in ${timeElapsed}ms`
          );
          return { txHash, confirmed: true };
        } catch (error) {
          console.warn(
            `Warning: Couldn't confirm ${functionName} transaction within ${maxWaitTimeMs}ms: ${error}`
          );
          return { txHash, confirmed: false };
        }
      } catch (error) {
        // Check if this is an expected error
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // Check all the expected error messages
        for (const [errorPattern, status] of Object.entries(expectedErrors)) {
          if (errorMessage.includes(errorPattern)) {
            console.log(
              `${functionName} encountered expected error: ${errorPattern}`
            );
            return {
              txHash: "0x", // Dummy hash
              confirmed: true, // Treat as confirmed
              status, // Return the mapped status
            };
          }
        }

        // If not an expected error, rethrow
        throw error;
      }
    };

    // Helper function to get game state
    const getGameState = async () => {
      const data = await publicClient.readContract({
        ...gameContractConfig,
        functionName: "getGameInfo",
        args: [BigInt(gameId)],
      });

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
      return {
        success: true,
        pendingResult: Number(gameState.revealedDiff),
        txHash: "",
        status: "completed",
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

    // Submit moves if not already submitted
    // Handle "Moves already submitted" error
    if (!gameState.bothCommitted) {
      const { txHash, status } = await executeTransaction(
        "submitMoves",
        [BigInt(gameId)],
        {
          expectedErrors: {
            "Moves already submitted": "moves_already_submitted",
          },
        }
      );

      if (status === "moves_already_submitted") {
        console.log(
          `Moves for game ${gameId} were already submitted, continuing to next step`
        );
        // Update our local game state
        gameState.bothCommitted = true;
      } else if (status === "game_already_finalized") {
        console.log(
          `Game ${gameId} was already finalized, retrieving final result`
        );

        try {
          const finalGameState = await getGameState();
          return {
            success: true,
            pendingResult: Number(finalGameState.revealedDiff),
            txHash,
            status: "completed",
          };
        } catch (error) {
          console.warn(
            `Could not get final game state after finding it was already finalized: ${error}`
          );
        }
      } else {
        // Normal case - return early with hash for client polling
        return {
          success: true,
          txHash,
          pendingResult: -1,
          status: "submitting_moves",
        };
      }
    }

    // Check if we need to compute difference
    // Handle "Difference already computed" error
    if (!gameState.differenceCipher || gameState.differenceCipher === "0x") {
      const { txHash, status } = await executeTransaction(
        "computeDifference",
        [BigInt(gameId)],
        {
          expectedErrors: {
            "Difference already computed": "difference_already_computed",
          },
        }
      );

      if (status === "difference_already_computed") {
        console.log(
          `Difference for game ${gameId} was already computed, continuing to next step`
        );
        // Refresh game state to get the difference cipher
        try {
          gameState = await getGameState();
        } catch (error) {
          console.error("Error fetching updated game state:", error);
        }
      } else {
        // Normal case - return early with hash for client polling
        return {
          success: true,
          txHash,
          pendingResult: -1,
          status: "computing_difference",
        };
      }
    }

    // If we still don't have the difference cipher, return with error
    if (!gameState.differenceCipher || gameState.differenceCipher === "0x") {
      console.error(
        `No difference cipher available for game ${gameId} after compute step`
      );
      return {
        success: false,
        error: "Failed to compute difference cipher",
      };
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
      BigInt(gameState.differenceCipher)
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

    // Check if the game is already finalized before sending another transaction
    try {
      gameState = await getGameState();

      if (gameState.finished) {
        console.log(`Game ${gameId} is already finalized.`);
        return {
          success: true,
          pendingResult: Number(gameState.revealedDiff),
          status: "completed",
        };
      }
    } catch (error) {
      console.warn(`Could not check if game is already finalized:`, error);
    }

    // Finalize the game - handle "Game already finalized" error
    const { txHash } = await executeTransaction(
      "finalizeGame",
      [BigInt(gameId), diffMod3],
      {
        expectedErrors: {
          "Game already finalized": "game_already_finalized",
          "Game is already finished": "game_already_finalized",
        },
      }
    );

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
