/* eslint-disable @typescript-eslint/no-unused-vars */
'use server';

import {
  gameContractConfig,
  houseBatcherContractConfig,
} from '@/config/contracts';
import {
  houseAccount,
  publicClient,
  walletClient,
  walletClient2,
} from '@/config/server';
import { ElGamalCiphertext, encryptMove } from '@/lib/crypto';
import { retry } from '@/lib/utils';
import { executeContractFunction } from '@/lib/wallet-utils';
import { computeDifferenceLocally, decryptDifference } from './crypto';
import { generateHouseMove } from './utils';
import { rateLimit } from '@/lib/rate-limiter';

// Result types
export type PlayHouseMoveResult = {
  success: boolean;
  hash?: `0x${string}`;
  result?: number;
  error?: string;
};

/**
 * Play house move using the HouseFlowBatcher contract
 * This is a simplified flow that handles the entire game lifecycle in a single transaction
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
      gameData = await retry(
        () =>
          publicClient.readContract({
            ...gameContractConfig,
            functionName: 'getGameInfo',
            args: [BigInt(gameId)],
          }),
        {
          retries: 3,
          backoffMs: 1000,
          shouldRetry: (error) => {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            return (
              errorMessage.includes('network') ||
              errorMessage.includes('timeout') ||
              errorMessage.includes('connection')
            );
          },
          onRetry: (error, attempt) => {
            console.log(
              `Retry attempt ${attempt} for reading game data: ${error}`,
            );
          },
        },
      );
    } catch (error) {
      console.error('Error fetching game data:', error);
      throw new Error(
        `Failed to fetch game data: Game ID ${gameId} may not exist`,
      );
    }

    const [
      playerA,
      playerB,
      ,
      encMoveA,
      encMoveB,
      bothCommitted,
      finished,
      winner,
    ] = gameData;

    await rateLimit(playerA, 10, 30000);

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

    // 2. Generate and encrypt house move
    const houseMove = generateHouseMove(gameId, playerA, playerB);
    console.log(`Generated house move for game ${gameId}: ${houseMove}`);

    // 3. Encrypt move
    let encryptedMove;
    try {
      encryptedMove = (await encryptMove(
        houseMove,
        'elgamal',
      )) as ElGamalCiphertext;
    } catch (error) {
      console.error('Error encrypting move:', error);
      throw new Error('Failed to encrypt house move');
    }

    // 4. Calculate the result off-chain for finalizing
    const encryptedPlayerMove = encMoveA;

    // Pre-compute the difference for finalization
    let diffMod3: number;
    try {
      // First compute the homomorphic difference
      const differenceCipher = computeDifferenceLocally(
        {
          c1: BigInt(encryptedPlayerMove.c1),
          c2: BigInt(encryptedPlayerMove.c2),
        },
        {
          c1: BigInt(encryptedMove.c1),
          c2: BigInt(encryptedMove.c2),
        },
      );

      // Then decrypt it to get the mod 3 value
      diffMod3 = decryptDifference(differenceCipher);
      console.log(`Computed difference for game ${gameId}: ${diffMod3}`);
    } catch (error) {
      console.error('Error computing game result:', error);
      throw new Error('Failed to compute game result');
    }

    // 5. Execute the batcher contract transaction
    // Note: Now we use the batcher's balance instead of sending ETH with the transaction
    const hash = await executeContractFunction(
      houseBatcherContractConfig,
      'batchHouseFlow',
      [
        BigInt(gameId),
        ('0x' +
          encryptedMove.c1.toString(16).padStart(64, '0')) as `0x${string}`,
        ('0x' +
          encryptedMove.c2.toString(16).padStart(64, '0')) as `0x${string}`,
        BigInt(diffMod3),
        betAmount,
      ],
      {
        retries: 5,
      },
    );

    console.log(
      `House move for game ${gameId} executed in single transaction: ${hash}`,
    );

    return {
      success: true,
      hash,
      result: diffMod3,
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
 * Get the result of a game that's already been processed
 */
export async function getGameResult(gameId: number): Promise<{
  success: boolean;
  result?: number;
  finished?: boolean;
  error?: string;
}> {
  try {
    const gameData = await retry(
      () =>
        publicClient.readContract({
          ...gameContractConfig,
          functionName: 'getGameInfo',
          args: [BigInt(gameId)],
        }),
      {
        retries: 3,
        backoffMs: 1000,
        shouldRetry: (error) => {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          return (
            errorMessage.includes('network') ||
            errorMessage.includes('timeout') ||
            errorMessage.includes('connection')
          );
        },
      },
    );

    const [, , , , , , finished, , , revealedDiff] = gameData;

    return {
      success: true,
      result: revealedDiff !== undefined ? Number(revealedDiff) : undefined,
      finished,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Ensure the batcher contract has enough funds
 */
export async function checkBatcherBalance(): Promise<{
  success: boolean;
  balance?: bigint;
  error?: string;
}> {
  try {
    const balance = await publicClient.getBalance({
      address: houseBatcherContractConfig.address,
    });

    return {
      success: true,
      balance,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Deposit funds to the batcher contract
 */
export async function depositToBatcher(amount: bigint): Promise<{
  success: boolean;
  hash?: `0x${string}`;
  error?: string;
}> {
  try {
    const hash = await walletClient.writeContract({
      ...houseBatcherContractConfig,
      functionName: 'deposit',
      value: amount,
      account: houseAccount,
    });

    return {
      success: true,
      hash,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
