"use server";

import { Move, encryptMove } from "@/lib/crypto";
import { gameContractConfig } from "@/config/contracts";
import { DEFAULT_BET_AMOUNT_WEI } from "@/hooks/use-game-contract";
import { executeContractFunction } from "@/lib/wallet-utils";
import { generateHouseMove } from "./utils";
import { retry } from "@/lib/utils";
import { publicClient } from "@/config/server";
import { markGameAsWaitingForJoin } from "./cache";

// Result types
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

    await markGameAsWaitingForJoin(gameId, hash);
    console.log(
      `House move for game ${gameId} sent with tx ${hash}, updated game cache`
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
