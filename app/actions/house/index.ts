'use server';

import {
  gameContractConfig,
  houseBatcherContractConfig,
} from '@/config/contracts';
import { houseAccount, publicClient, walletClient } from '@/config/server';
import { Move, encryptMove } from '@/lib/crypto';
import { generateHouseMove } from './utils';
import { computeDifferenceLocally, decryptDifference } from './crypto';
import { executeContractFunction } from '@/lib/wallet-utils';

// Game processing status types
export type GameProcessingStatus =
  | 'COMPLETED'
  | 'NEEDS_FINALIZATION'
  | 'FAILED';

// Result types
export type PlayHouseMoveResult = {
  success: boolean;
  batchHash?: `0x${string}`;
  finalizeHash?: `0x${string}`;
  move?: Move;
  diffMod3?: number;
  error?: string;
  status?: GameProcessingStatus;
};

/**
 * Optimized house action that performs local computation instead of waiting for chain confirmations
 */
export async function playHouseMove(
  gameId: number,
  betAmount: bigint,
): Promise<PlayHouseMoveResult> {
  console.log(
    `[playHouseMove] Starting house move for game ${gameId} with bet ${betAmount}`,
  );

  try {
    if (gameId === undefined || gameId === null || isNaN(gameId)) {
      console.error(`[playHouseMove] Invalid game ID: ${gameId}`);
      throw new Error('Invalid game ID');
    }

    // 1. Validate game state
    console.log(`[playHouseMove] Fetching game data for game ${gameId}`);
    let gameData;
    try {
      gameData = await publicClient.readContract({
        ...gameContractConfig,
        functionName: 'getGameInfo',
        args: [BigInt(gameId)],
      });
      console.log(
        `[playHouseMove] Successfully fetched game data for game ${gameId}`,
      );
    } catch (error) {
      console.error(
        `[playHouseMove] Error fetching game data for game ${gameId}:`,
        error,
      );
      throw new Error(
        `Failed to fetch game data: Game ID ${gameId} may not exist`,
      );
    }

    const [playerA, playerB, winner, finished, bothCommitted, encChoiceA] =
      gameData;

    console.log(`[playHouseMove] Game ${gameId} state:
      playerA: ${playerA}
      playerB: ${playerB}
      finished: ${finished}
      bothCommitted: ${bothCommitted}
      hasEncChoiceA: ${!!encChoiceA && encChoiceA !== '0x'}`);

    // Validation checks
    if (playerB !== '0x0000000000000000000000000000000000000000') {
      console.error(
        `[playHouseMove] Game ${gameId} already joined by ${playerB}`,
      );
      throw new Error(
        `Game ID ${gameId} has already been joined by another player (${playerB})`,
      );
    }

    if (playerA === '0x0000000000000000000000000000000000000000') {
      console.error(`[playHouseMove] Game ${gameId} not properly created`);
      throw new Error(`Game ID ${gameId} has not been properly created`);
    }

    if (finished) {
      console.error(`[playHouseMove] Game ${gameId} already finished`);
      throw new Error(`Game ID ${gameId} is already finished`);
    }

    if (bothCommitted) {
      console.error(
        `[playHouseMove] Game ${gameId} already has both moves committed`,
      );
      throw new Error(`Game ID ${gameId} has already submitted moves`);
    }

    // 2. Generate and encrypt house move
    console.log(`[playHouseMove] Generating house move for game ${gameId}`);
    const houseMove = generateHouseMove();
    console.log(
      `[playHouseMove] Generated house move for game ${gameId}: ${houseMove}`,
    );

    // 3. Encrypt move
    console.log(`[playHouseMove] Encrypting house move for game ${gameId}`);
    let encryptedMove, paddedEncryptedMove;
    try {
      encryptedMove = await encryptMove(houseMove);
      console.log(
        `[playHouseMove] Successfully encrypted house move for game ${gameId}`,
      );

      paddedEncryptedMove = encryptedMove;
      if (encryptedMove.length % 2 !== 0) {
        paddedEncryptedMove = encryptedMove.replace('0x', '0x0');
      }

      while (paddedEncryptedMove.length < 258) {
        paddedEncryptedMove = paddedEncryptedMove.replace('0x', '0x0');
      }

      console.log(
        `[playHouseMove] Padded encrypted move to length ${paddedEncryptedMove.length}`,
      );
    } catch (error) {
      console.error(
        `[playHouseMove] Error encrypting move for game ${gameId}:`,
        error,
      );
      throw new Error('Failed to encrypt house move');
    }

    // 4. Do the local computation of difference
    console.log(
      `[playHouseMove] Computing local difference for game ${gameId}`,
    );
    const differenceCipher = computeDifferenceLocally(
      encChoiceA,
      paddedEncryptedMove,
    );
    const diffMod3 = decryptDifference(differenceCipher);
    console.log(
      `[playHouseMove] Computed local difference for game ${gameId}: ${diffMod3}`,
    );

    // 5. Execute the batcher contract transaction
    console.log(
      `[playHouseMove] Executing batchHouseFlow transaction for game ${gameId}`,
    );
    const batchHash = await executeContractFunction(
      houseBatcherContractConfig,
      'batchHouseFlow',
      [BigInt(gameId), paddedEncryptedMove as `0x${string}`],
      {
        value: betAmount,
        retries: 3,
        logPrefix: `[playHouseMove] batchHouseFlow for game ${gameId}`,
      },
    );

    console.log(
      `[playHouseMove] House batch for game ${gameId} executed with hash: ${batchHash}`,
    );

    // 6. Return success result
    console.log(
      `[playHouseMove] Successfully completed house move for game ${gameId}`,
    );
    return {
      success: true,
      batchHash,
      move: houseMove,
      diffMod3,
      status: 'NEEDS_FINALIZATION',
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `[playHouseMove] Error in house move for game ${gameId}:`,
      errorMessage,
    );
    return {
      success: false,
      status: 'FAILED',
      error: errorMessage,
    };
  }
}

export async function finalizeGame(gameId: number): Promise<{
  success: boolean;
  status?: GameProcessingStatus;
  finalizeHash?: `0x${string}`;
  diffMod3?: number;
  error?: string;
}> {
  console.log(`[finalizeGame] Starting finalization for game ${gameId}`);

  try {
    // Get the current game state
    console.log(`[finalizeGame] Fetching current game state for ${gameId}`);
    const gameState = await publicClient.readContract({
      ...gameContractConfig,
      functionName: 'getGameInfo',
      args: [BigInt(gameId)],
    });

    // Destructure the result
    const [, , , finished, bothCommitted, , , differenceCipher, revealedDiff] =
      gameState;

    console.log(
      `[finalizeGame] Game ${gameId} state: finished=${finished}, bothCommitted=${bothCommitted}, hasDifferenceCipher=${
        !!differenceCipher && differenceCipher !== '0x'
      }`,
    );

    // Check if game already finished
    if (finished) {
      console.log(
        `[finalizeGame] Game ${gameId} is already finished with revealed difference: ${revealedDiff}`,
      );
      return {
        success: true,
        status: 'COMPLETED',
        diffMod3: revealedDiff !== undefined ? Number(revealedDiff) : undefined,
      };
    }

    // Check if difference is computed
    if (!differenceCipher || differenceCipher === '0x') {
      console.log(
        `[finalizeGame] Game ${gameId} difference cipher not yet available on chain`,
      );
      return {
        success: false,
        status: 'NEEDS_FINALIZATION',
        error:
          'Difference not computed yet. Try again later when batch transaction is confirmed.',
      };
    }

    // Compute local difference
    console.log(`[finalizeGame] Decrypting difference for game ${gameId}`);
    const diffMod3 = decryptDifference(differenceCipher);
    console.log(
      `[finalizeGame] Decrypted difference for game ${gameId}: ${diffMod3}`,
    );

    // Finalize the game with our computed/decrypted result
    console.log(
      `[finalizeGame] Sending finalizeGame transaction for game ${gameId} with diffMod3=${diffMod3}`,
    );
    const finalizeHash = await walletClient.writeContract({
      ...gameContractConfig,
      functionName: 'finalizeGame',
      args: [BigInt(gameId), BigInt(diffMod3)],
      account: houseAccount,
    });

    console.log(
      `[finalizeGame] Game ${gameId} finalized successfully with hash: ${finalizeHash}`,
    );

    return {
      success: true,
      status: 'COMPLETED',
      finalizeHash,
      diffMod3,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `[finalizeGame] Error finalizing game ${gameId}: ${errorMessage}`,
    );

    return {
      success: false,
      status: 'FAILED',
      error: errorMessage,
    };
  }
}

/**
 * Get the result of a game
 */
export async function getGameResult(gameId: number): Promise<{
  success: boolean;
  result?: number;
  finished?: boolean;
  error?: string;
}> {
  try {
    // Get game state directly from contract
    const gameState = await publicClient.readContract({
      ...gameContractConfig,
      functionName: 'getGameInfo',
      args: [BigInt(gameId)],
    });

    // Destructure the result
    const [
      ,
      ,
      ,
      finished,
      ,
      encChoiceA,
      encChoiceB,
      differenceCipher,
      revealedDiff,
    ] = gameState;

    // If game is not finished but we have both choices, we can compute locally
    if (
      !finished &&
      encChoiceA &&
      encChoiceB &&
      encChoiceA !== '0x' &&
      encChoiceB !== '0x'
    ) {
      try {
        // Try to compute locally if game not yet finished
        const localDifferenceCipher = computeDifferenceLocally(
          encChoiceA,
          encChoiceB,
        );
        const localDiffMod3 = decryptDifference(localDifferenceCipher);

        return {
          success: true,
          result: localDiffMod3,
          finished: false,
        };
      } catch (error) {
        console.log('Failed local computation, using chain data:', error);
      }
    }

    return {
      success: true,
      result: revealedDiff !== undefined ? Number(revealedDiff) : undefined,
      finished: finished,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
