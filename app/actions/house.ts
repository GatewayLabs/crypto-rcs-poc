"use server";

import { Move, encryptMove } from "@/lib/crypto";
import { gameContractConfig } from "@/config/contracts";
import { publicClient, walletClient } from "@/config/server";
import { parseEventLogs } from "viem";
import * as paillier from "paillier-bigint";
import { DEFAULT_BET_AMOUNT_WEI } from "@/hooks/use-game-contract";

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

    let requestResult;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        console.log(`Simulation attempt ${retryCount + 1} for game ${gameId}`);
        requestResult = await publicClient.simulateContract({
          ...gameContractConfig,
          functionName: "joinGame",
          args: [BigInt(gameId), paddedEncryptedMove as `0x${string}`],
          account: walletClient.account,
          value: validBetAmount,
        });
        console.log("Simulation successful");
        break;
      } catch (simError) {
        retryCount++;
        console.warn(
          `Simulation attempt ${retryCount} failed for game ${gameId}:`,
          simError
        );

        if (retryCount < maxRetries) {
          console.log("Generating a different house move and re-encrypting...");
          const newHouseMove = generateHouseMove();
          encryptedMove = (await encryptMove(newHouseMove)) as `0x${string}`;

          paddedEncryptedMove = encryptedMove;
          if (encryptedMove.length % 2 !== 0) {
            paddedEncryptedMove = encryptedMove.replace("0x", "0x0");
          }

          while (paddedEncryptedMove.length < 258) {
            paddedEncryptedMove = paddedEncryptedMove.replace("0x", "0x0");
          }
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } else {
          const errorMessage =
            simError instanceof Error ? simError.message : String(simError);
          if (
            errorMessage.includes("Invalid params") ||
            errorMessage.includes("Invalid parameters")
          ) {
            throw new Error(
              `Contract rejected parameters for game ${gameId}. The game may be in an invalid state or already played.`
            );
          }
          throw simError;
        }
      }
    }

    if (!requestResult) {
      throw new Error("Failed to simulate transaction after multiple attempts");
    }

    let hash;
    retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        console.log(`Transaction attempt ${retryCount + 1} for game ${gameId}`);
        hash = await walletClient.writeContract(requestResult.request);
        console.log(`Transaction sent with hash: ${hash}`);
        break;
      } catch (txError) {
        retryCount++;
        console.warn(
          `Transaction attempt ${retryCount} failed for game ${gameId}:`,
          txError
        );
        if (retryCount >= maxRetries) throw txError;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    if (!hash) {
      throw new Error("Failed to send transaction after multiple attempts");
    }

    let receipt;
    retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        console.log(
          `Waiting for receipt, attempt ${retryCount + 1} for game ${gameId}`
        );
        receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log(`Receipt received for game ${gameId}`);
        break;
      } catch (receiptError) {
        retryCount++;
        console.warn(
          `Receipt fetch attempt ${retryCount} failed for game ${gameId}:`,
          receiptError
        );
        if (retryCount >= maxRetries) throw receiptError;
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    if (!receipt) {
      throw new Error(
        "Failed to get transaction receipt after multiple attempts"
      );
    }

    const successResponse = {
      success: true as const,
      hash: receipt.transactionHash,
      move: houseMove,
    };

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
        console.warn(`Game ${gameId} may not have been properly joined`);
      }
    } catch (error) {
      console.warn(`Could not verify final game state after joining:`, error);
    }

    return successResponse;
  } catch (error) {
    console.error("Error in house move:", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function resolveGame(gameId: number): Promise<ResolveGameResult> {
  try {
    if (gameId === undefined || gameId === null || isNaN(gameId)) {
      throw new Error("Invalid game ID");
    }

    console.log(`Starting to resolve game ${gameId}`);

    // Add more detailed game data validation
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

    if (!gameData || !Array.isArray(gameData)) {
      throw new Error(`Invalid game data returned for game ID ${gameId}`);
    }

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
    console.log(`- Existing winner: ${winner}, revealed diff: ${revealedDiff}`);

    // More detailed state validation
    if (
      playerA === "0x0000000000000000000000000000000000000000" ||
      playerB === "0x0000000000000000000000000000000000000000"
    ) {
      throw new Error(
        `Game ID ${gameId}: Both players must be committed first (A: ${playerA}, B: ${playerB})`
      );
    }

    // Check if game has encrypted choices
    if (!encChoiceA || !encChoiceB) {
      throw new Error(
        `Game ID ${gameId}: Missing encrypted choices. A: ${!!encChoiceA}, B: ${!!encChoiceB}`
      );
    }

    // Check game state - should be JOINED (both players present, not finished, not moves submitted yet)
    if (finished) {
      // If already finished, we can return early with the existing result
      if (revealedDiff !== null && revealedDiff !== undefined) {
        console.log(
          `Game ${gameId} is already finished with result: ${revealedDiff}`
        );
        return {
          success: true as const,
          info: "Game was already finalized",
          result: Number(revealedDiff),
          hash: "",
        };
      }
      throw new Error(`Game ${gameId} is already finished but has no result`);
    }

    if (bothCommitted) {
      // Check if we should skip to computeDifference instead
      console.log(
        `Game ${gameId} already has moves submitted, will proceed to computeDifference`
      );
    }

    if (differenceCipher && differenceCipher !== "0x") {
      // Check if we should skip to finalizeGame instead
      console.log(
        `Game ${gameId} already has difference computed, will proceed to finalizeGame`
      );
    }

    // Helper function for retry logic
    const retryOperation = async <T>(
      operation: () => Promise<T>,
      name: string,
      maxRetries = 3,
      delay = 2000
    ): Promise<T> => {
      let retryCount = 0;
      let result: T;

      while (retryCount < maxRetries) {
        try {
          console.log(`${name} attempt ${retryCount + 1} for game ${gameId}`);
          result = await operation();
          console.log(`${name} successful for game ${gameId}`);
          return result; // Return the result on success
        } catch (error) {
          retryCount++;
          console.warn(
            `${name} attempt ${retryCount} failed for game ${gameId}:`,
            error
          );

          // Check for invalid params error
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          if (
            (errorMessage.includes("Invalid params") ||
              errorMessage.includes("Invalid parameters")) &&
            retryCount >= maxRetries
          ) {
            throw new Error(
              `${name} failed: Contract rejected parameters for game ${gameId}. The game may be in an invalid state.`
            );
          }

          if (retryCount >= maxRetries) throw error;
          // Wait before retrying with increasing delay
          await new Promise((resolve) =>
            setTimeout(resolve, delay * retryCount)
          );
        }
      }

      throw new Error(
        `Failed to complete ${name} after ${maxRetries} attempts`
      );
    };

    // Default to -1 for initial result value
    let diffMod3 = -1n;
    let finalHash = "";

    // Submit moves only if not already submitted
    if (!bothCommitted) {
      console.log(`Submitting moves for game ${gameId}`);
      const submitRequest = await retryOperation(async () => {
        const { request } = await publicClient.simulateContract({
          ...gameContractConfig,
          functionName: "submitMoves",
          args: [BigInt(gameId)],
          account: walletClient.account,
        });
        return request;
      }, "submitMoves simulation");

      const submitHash = await retryOperation(
        async () => walletClient.writeContract(submitRequest),
        "submitMoves transaction"
      );

      await retryOperation(
        async () =>
          publicClient.waitForTransactionReceipt({ hash: submitHash }),
        "submitMoves receipt"
      );

      // Verify the game state after submitMoves
      try {
        const updatedGameData = await publicClient.readContract({
          ...gameContractConfig,
          functionName: "getGameInfo",
          args: [BigInt(gameId)],
        });
        const updatedBothCommitted = updatedGameData[4]; // bothCommitted is at index 4
        console.log(
          `Game ${gameId} bothCommitted after submitMoves: ${updatedBothCommitted}`
        );

        if (!updatedBothCommitted) {
          console.warn(`Game ${gameId} moves were not submitted successfully`);
        }
      } catch (error) {
        console.warn(`Could not verify game state after submitMoves:`, error);
      }
    }

    // Get the latest state before computing difference
    let latestDifferenceCipher;
    try {
      const latestData = await publicClient.readContract({
        ...gameContractConfig,
        functionName: "getGameInfo",
        args: [BigInt(gameId)],
      });
      latestDifferenceCipher = latestData[7]; // differenceCipher is at index 7
    } catch (error) {
      console.warn(
        `Could not check latest game state before computeDifference:`,
        error
      );
    }

    // Compute difference only if not already computed
    if (!latestDifferenceCipher || latestDifferenceCipher === "0x") {
      console.log(`Computing difference for game ${gameId}`);
      const computeRequest = await retryOperation(async () => {
        const { request } = await publicClient.simulateContract({
          ...gameContractConfig,
          functionName: "computeDifference",
          args: [BigInt(gameId)],
          account: walletClient.account,
        });
        return request;
      }, "computeDifference simulation");

      const computeHash = await retryOperation(
        async () => walletClient.writeContract(computeRequest),
        "computeDifference transaction"
      );

      const receipt = await retryOperation(
        async () =>
          publicClient.waitForTransactionReceipt({ hash: computeHash }),
        "computeDifference receipt"
      );

      // Verify the game state after computeDifference
      try {
        const updatedGameData = await publicClient.readContract({
          ...gameContractConfig,
          functionName: "getGameInfo",
          args: [BigInt(gameId)],
        });
        latestDifferenceCipher = updatedGameData[7]; // differenceCipher is at index 7
        console.log(
          `Game ${gameId} has difference computed: ${
            !!latestDifferenceCipher && latestDifferenceCipher !== "0x"
          }`
        );

        if (!latestDifferenceCipher || latestDifferenceCipher === "0x") {
          console.warn(
            `Game ${gameId} difference was not computed successfully`
          );
        }
      } catch (error) {
        console.warn(
          `Could not verify game state after computeDifference:`,
          error
        );
      }

      const events = parseEventLogs({
        logs: receipt.logs,
        abi: gameContractConfig.abi,
        eventName: "DifferenceComputed",
      });

      // Get difference cipher from events
      const eventResult = events[0]?.args?.differenceCipher;

      if (eventResult) {
        latestDifferenceCipher = eventResult;
        console.log(
          `Got difference cipher from event for game ${gameId}: ${
            typeof latestDifferenceCipher === "string"
              ? latestDifferenceCipher.substring(0, 20) + "..."
              : "N/A"
          }`
        );
      } else if (!latestDifferenceCipher || latestDifferenceCipher === "0x") {
        throw new Error(
          "Failed to extract difference cipher from transaction logs or contract state"
        );
      }
    } else {
      console.log(
        `Difference already computed for game ${gameId}, skipping computation`
      );
    }

    // Finalize game
    const publicKeyN = BigInt("0x" + process.env.NEXT_PUBLIC_PAILLIER_N);
    const publicKeyG = BigInt("0x" + process.env.NEXT_PUBLIC_PAILLIER_G);

    const privateKeyLambda = BigInt("0x" + process.env.PAILLIER_LAMBDA);
    const privateKeyMu = BigInt("0x" + process.env.PAILLIER_MU);

    // Generate keys
    let publicKey, privateKey, decryptedDifference;
    try {
      if (!latestDifferenceCipher || latestDifferenceCipher === "0x") {
        throw new Error("No difference cipher available for decryption");
      }

      publicKey = new paillier.PublicKey(publicKeyN, publicKeyG);
      privateKey = new paillier.PrivateKey(
        privateKeyLambda,
        privateKeyMu,
        publicKey
      );

      decryptedDifference = privateKey.decrypt(BigInt(latestDifferenceCipher));
      diffMod3 = decryptedDifference % 3n;
      console.log(
        `Decrypted difference for game ${gameId}: ${decryptedDifference}, mod 3: ${diffMod3}`
      );
    } catch (error) {
      console.error("Error during decryption:", error);
      throw new Error(
        `Failed to decrypt game result: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    // Prepare our success response with the result we've calculated
    const successResponse: ResolveGameSuccessResult = {
      success: true as const,
      result: Number(diffMod3),
      hash: finalHash, // Will be updated if we call finalizeGame
    };

    // Check if the game has already been finalized
    let isFinished = false;
    try {
      const currentGameData = await publicClient.readContract({
        ...gameContractConfig,
        functionName: "getGameInfo",
        args: [BigInt(gameId)],
      });
      isFinished = currentGameData[3]; // finished is at index 3

      if (isFinished) {
        console.log(
          `Game ${gameId} is already finalized, no need to call finalizeGame`
        );
        return {
          ...successResponse,
          info: "Game was already finalized",
        };
      }
    } catch (error) {
      console.warn(`Could not check if game is already finalized:`, error);
    }

    // Finalize game with retry
    console.log(`Finalizing game ${gameId} with result: ${diffMod3}`);
    const finalizeRequest = await retryOperation(async () => {
      const { request } = await publicClient.simulateContract({
        ...gameContractConfig,
        functionName: "finalizeGame",
        args: [BigInt(gameId), diffMod3],
        account: walletClient.account,
      });
      return request;
    }, "finalizeGame simulation");

    const finalizeHash = await retryOperation(
      async () => walletClient.writeContract(finalizeRequest),
      "finalizeGame transaction"
    );

    const finalizationReceipt = await retryOperation(
      async () =>
        publicClient.waitForTransactionReceipt({ hash: finalizeHash }),
      "finalizeGame receipt"
    );

    // Update our success response with the finalization hash
    finalHash = finalizationReceipt.transactionHash;
    successResponse.hash = finalHash;

    // Verify final game state
    try {
      const finalGameData = await publicClient.readContract({
        ...gameContractConfig,
        functionName: "getGameInfo",
        args: [BigInt(gameId)],
      });
      const finalFinished = finalGameData[3]; // finished is at index 3
      console.log(`Game ${gameId} final finished state: ${finalFinished}`);

      if (!finalFinished) {
        console.warn(`Game ${gameId} may not have been properly finalized`);
      }
    } catch (error) {
      console.warn(`Could not verify final game state:`, error);
    }

    return successResponse;
  } catch (error) {
    console.error("Error resolving game:", error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
