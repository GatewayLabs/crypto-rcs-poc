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
  try {
    if (gameId === undefined || gameId === null || isNaN(gameId)) {
      throw new Error('Invalid game ID');
    }

    console.log(`Starting house move for game ${gameId} with bet ${betAmount}`);

    // 1. Validate game state
    let gameData;
    try {
      gameData = await publicClient.readContract({
        ...gameContractConfig,
        functionName: 'getGameInfo',
        args: [BigInt(gameId)],
      });
    } catch (error) {
      console.error('Error fetching game data:', error);
      throw new Error(
        `Failed to fetch game data: Game ID ${gameId} may not exist`,
      );
    }

    const [playerA, playerB, winner, finished, bothCommitted, encChoiceA] =
      gameData;

    // Validation checks
    if (playerB !== '0x0000000000000000000000000000000000000000') {
      throw new Error(
        `Game ID ${gameId} has already been joined by another player (${playerB})`,
      );
    }

    if (playerA === '0x0000000000000000000000000000000000000000') {
      throw new Error(`Game ID ${gameId} has not been properly created`);
    }

    if (finished) {
      throw new Error(`Game ID ${gameId} is already finished`);
    }

    if (bothCommitted) {
      throw new Error(`Game ID ${gameId} has already submitted moves`);
    }

    // 2. Generate and encrypt house move
    const houseMove = generateHouseMove();
    console.log(`Generated house move for game ${gameId}: ${houseMove}`);

    // 3. Encrypt move
    let encryptedMove, paddedEncryptedMove;
    try {
      encryptedMove = await encryptMove(houseMove);

      paddedEncryptedMove = encryptedMove;
      if (encryptedMove.length % 2 !== 0) {
        paddedEncryptedMove = encryptedMove.replace('0x', '0x0');
      }

      while (paddedEncryptedMove.length < 258) {
        paddedEncryptedMove = paddedEncryptedMove.replace('0x', '0x0');
      }
    } catch (error) {
      console.error('Error encrypting move:', error);
      throw new Error('Failed to encrypt house move');
    }

    // Do the local computation of difference
    const differenceCipher = computeDifferenceLocally(
      encChoiceA,
      paddedEncryptedMove,
    );
    const diffMod3 = decryptDifference(differenceCipher);
    console.log(`Computed local difference for game ${gameId}: ${diffMod3}`);

    // Execute the batcher contract transaction
    const batchHash = await executeContractFunction(
      houseBatcherContractConfig,
      'batchHouseFlow',
      [BigInt(gameId), paddedEncryptedMove as `0x${string}`],
      {
        value: betAmount,
        retries: 3,
      },
    );

    console.log(`House batch for game ${gameId} executed: ${batchHash}`);

    return {
      success: true,
      batchHash,
      diffMod3,
      status: 'NEEDS_FINALIZATION',
    };
  } catch (error) {
    console.error('Error in house move:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function finalizeGame(gameId: number): Promise<{
  success: boolean;
  finalizeHash?: `0x${string}`;
  diffMod3?: number;
  error?: string;
}> {
  try {
    // Get the current game state
    const gameState = await publicClient.readContract({
      ...gameContractConfig,
      functionName: 'getGameInfo',
      args: [BigInt(gameId)],
    });

    // Destructure the result
    const [, , , finished, , , , differenceCipher, revealedDiff] = gameState;

    // Check if game already finished
    if (finished) {
      return {
        success: true,
        diffMod3: revealedDiff !== undefined ? Number(revealedDiff) : undefined,
      };
    }

    // Check if difference is computed
    if (!differenceCipher || differenceCipher === '0x') {
      // Don't throw an error, just return with a specific status
      return {
        success: false,
        error:
          'Difference not computed yet. Try again later when batch transaction is confirmed.',
      };
    }

    // Compute local difference
    const diffMod3 = decryptDifference(differenceCipher);

    // Finalize the game with our computed/decrypted result
    const finalizeHash = await executeContractFunction(
      gameContractConfig,
      'finalizeGame',
      [BigInt(gameId), BigInt(diffMod3)],
      {
        retries: 3,
      },
    );

    return {
      success: true,
      finalizeHash,
      diffMod3,
    };
  } catch (error) {
    console.error('Error finalizing game:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
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
