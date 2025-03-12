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

// Result types
export type PlayHouseMoveResult = {
  success: boolean;
  batchHash?: `0x${string}`;
  finalizeHash?: `0x${string}`;
  diffMod3?: number;
  error?: string;
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
    const batchHash = await walletClient.writeContract({
      ...houseBatcherContractConfig,
      functionName: 'batchHouseFlow',
      args: [BigInt(gameId), paddedEncryptedMove as `0x${string}`],
      value: betAmount,
      account: houseAccount,
    });

    console.log(`House batch for game ${gameId} executed: ${batchHash}`);

    // *** FIX: Wait for the batch transaction to be confirmed ***
    try {
      console.log(
        `Waiting for batch transaction ${batchHash} to be confirmed...`,
      );
      await publicClient.waitForTransactionReceipt({
        hash: batchHash,
        timeout: 30000, // 30 seconds timeout
      });
      console.log(`Batch transaction ${batchHash} confirmed`);
    } catch (waitError) {
      console.warn(`Timeout waiting for batch confirmation: ${waitError}`);
      // Continue anyway but log warning - we'll try optimistically
    }

    // *** FIX: Verify game state before finalizing ***
    try {
      const gameState = await publicClient.readContract({
        ...gameContractConfig,
        functionName: 'getGameInfo',
        args: [BigInt(gameId)],
      });

      const [, , , finished, bothCommitted, , , differenceCipherOnChain] =
        gameState;

      if (finished) {
        console.log(`Game ${gameId} is already finished, no need to finalize`);
        return {
          success: true,
          batchHash,
          diffMod3,
        };
      }

      if (
        !bothCommitted ||
        !differenceCipherOnChain ||
        differenceCipherOnChain === '0x'
      ) {
        console.log(
          `Game ${gameId} is not ready for finalization yet, returning with batch hash only`,
        );
        return {
          success: true,
          batchHash,
          diffMod3,
          finalizeHash: undefined,
        };
      }
    } catch (stateError) {
      console.warn(
        `Error checking game state before finalization: ${stateError}`,
      );
      // Continue optimistically, but the finalize call might fail
    }

    // Now try to finalize the game
    let finalizeHash;
    try {
      console.log(`Finalizing game ${gameId} with diffMod3=${diffMod3}`);
      finalizeHash = await walletClient.writeContract({
        ...gameContractConfig,
        functionName: 'finalizeGame',
        args: [BigInt(gameId), BigInt(diffMod3)],
        account: houseAccount,
      });

      console.log(`Game ${gameId} finalized with hash: ${finalizeHash}`);
    } catch (finalizeError) {
      console.error(`Error finalizing game: ${finalizeError}`);
      return {
        success: true,
        batchHash,
        diffMod3,
        finalizeHash: undefined,
        error: `Finalization will be retried later: ${finalizeError}`,
      };
    }

    return {
      success: true,
      batchHash,
      finalizeHash,
      diffMod3,
    };
  } catch (error) {
    console.error('Error in house move:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Finalize a game that might have failed finalization in the optimistic flow
 */
export async function finalizeGame(gameId: number): Promise<{
  success: boolean;
  finalizeHash?: `0x${string}`;
  diffMod3?: number;
  error?: string;
}> {
  try {
    // 1. Get the current game state
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
      bothCommitted,
      encChoiceA,
      encChoiceB,
      differenceCipher,
      revealedDiff,
    ] = gameState;

    // 2. Check if game already finished
    if (finished) {
      return {
        success: true,
        diffMod3: revealedDiff !== undefined ? Number(revealedDiff) : undefined,
      };
    }

    // 3. If we don't have the difference on chain yet but have both moves,
    // compute it locally
    let diffMod3: number;
    if (differenceCipher && differenceCipher !== '0x') {
      diffMod3 = decryptDifference(differenceCipher);
    } else if (
      encChoiceA &&
      encChoiceB &&
      encChoiceA !== '0x' &&
      encChoiceB !== '0x'
    ) {
      // Both moves are there, but difference not computed yet
      // We can compute it locally
      const localDifferenceCipher = computeDifferenceLocally(
        encChoiceA,
        encChoiceB,
      );
      diffMod3 = decryptDifference(localDifferenceCipher);
    } else {
      throw new Error(
        'Game not ready for finalization. Missing encrypted moves or difference.',
      );
    }

    // 4. Finalize the game with our computed/decrypted result
    const finalizeHash = await executeContractFunction(
      gameContractConfig,
      'finalizeGame',
      [BigInt(gameId), BigInt(diffMod3)],
      {
        logPrefix: `House finalize for game ${gameId}`,
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
      error: error instanceof Error ? error.message : 'Unknown error',
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
