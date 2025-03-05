'use server';

import { Move, encryptMove } from '@/lib/crypto';
import { gameContractConfig } from '@/config/contracts';
import { publicClient, walletClient } from '@/config/server';
import { parseEventLogs } from 'viem';
import * as paillier from 'paillier-bigint';
import { DEFAULT_BET_AMOUNT_WEI } from '@/hooks/use-game-contract';

function generateHouseMove(): Move {
  const moves: Move[] = ['ROCK', 'PAPER', 'SCISSORS'];
  const weights = [0.4, 0.3, 0.3];
  const random = Math.random();
  let sum = 0;
  for (let i = 0; i < weights.length; i++) {
    sum += weights[i];
    if (random <= sum) return moves[i];
  }
  return 'ROCK';
}

export async function playHouseMove(
  gameId: number,
  betAmount = DEFAULT_BET_AMOUNT_WEI,
) {
  try {
    if (gameId === undefined || gameId === null || isNaN(gameId)) {
      throw new Error('Invalid game ID');
    }

    const validBetAmount =
      betAmount && !isNaN(Number(betAmount))
        ? betAmount
        : DEFAULT_BET_AMOUNT_WEI;

    const gameData = await publicClient.readContract({
      ...gameContractConfig,
      functionName: 'getGameInfo',
      args: [BigInt(gameId)],
    });

    if (
      !gameData ||
      gameData[1] !== '0x0000000000000000000000000000000000000000'
    ) {
      throw new Error('Game is not available for house move');
    }

    const houseMove = generateHouseMove();
    const encryptedMove = (await encryptMove(houseMove)) as `0x${string}`;

    // Add retry logic for simulation
    let requestResult;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        requestResult = await publicClient.simulateContract({
          ...gameContractConfig,
          functionName: 'joinGame',
          args: [BigInt(gameId), encryptedMove],
          account: walletClient.account,
          value: validBetAmount,
        });
        break; // If successful, exit the loop
      } catch (simError) {
        retryCount++;
        console.warn(`Simulation attempt ${retryCount} failed:`, simError);
        if (retryCount >= maxRetries) throw simError;
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    if (!requestResult) {
      throw new Error('Failed to simulate transaction after multiple attempts');
    }

    // Add retry logic for transaction sending
    let hash;
    retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        hash = await walletClient.writeContract(requestResult.request);
        break; // If successful, exit the loop
      } catch (txError) {
        retryCount++;
        console.warn(`Transaction attempt ${retryCount} failed:`, txError);
        if (retryCount >= maxRetries) throw txError;
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    if (!hash) {
      throw new Error('Failed to send transaction after multiple attempts');
    }

    // Add retry logic for receipt waiting
    let receipt;
    retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        receipt = await publicClient.waitForTransactionReceipt({ hash });
        break; // If successful, exit the loop
      } catch (receiptError) {
        retryCount++;
        console.warn(
          `Receipt fetch attempt ${retryCount} failed:`,
          receiptError,
        );
        if (retryCount >= maxRetries) throw receiptError;
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    if (!receipt) {
      throw new Error(
        'Failed to get transaction receipt after multiple attempts',
      );
    }

    return {
      success: true,
      hash: receipt.transactionHash,
    };
  } catch (error) {
    console.error('Error in house move:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function resolveGame(gameId: number) {
  try {
    const gameData = await publicClient.readContract({
      ...gameContractConfig,
      functionName: 'getGameInfo',
      args: [BigInt(gameId)],
    });

    const [playerA, playerB] = gameData;
    if (
      playerA === '0x0000000000000000000000000000000000000000' ||
      playerB === '0x0000000000000000000000000000000000000000'
    ) {
      throw new Error('Both moves must be committed first');
    }

    // Helper function for retry logic
    const retryOperation = async <T>(
      operation: () => Promise<T>,
      name: string,
      maxRetries = 3,
      delay = 2000,
    ): Promise<T> => {
      let retryCount = 0;
      let result: T;

      while (retryCount < maxRetries) {
        try {
          result = await operation();
          return result; // Return the result on success
        } catch (error) {
          retryCount++;
          console.warn(`${name} attempt ${retryCount} failed:`, error);
          if (retryCount >= maxRetries) throw error;
          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      throw new Error(
        `Failed to complete ${name} after ${maxRetries} attempts`,
      );
    };

    // Submit moves with retry
    const submitRequest = await retryOperation(async () => {
      const { request } = await publicClient.simulateContract({
        ...gameContractConfig,
        functionName: 'submitMoves',
        args: [BigInt(gameId)],
        account: walletClient.account,
      });
      return request;
    }, 'submitMoves simulation');

    const submitHash = await retryOperation(
      async () => walletClient.writeContract(submitRequest),
      'submitMoves transaction',
    );

    await retryOperation(
      async () => publicClient.waitForTransactionReceipt({ hash: submitHash }),
      'submitMoves receipt',
    );

    // Compute difference with retry
    const computeRequest = await retryOperation(async () => {
      const { request } = await publicClient.simulateContract({
        ...gameContractConfig,
        functionName: 'computeDifference',
        args: [BigInt(gameId)],
        account: walletClient.account,
      });
      return request;
    }, 'computeDifference simulation');

    const computeHash = await retryOperation(
      async () => walletClient.writeContract(computeRequest),
      'computeDifference transaction',
    );

    const receipt = await retryOperation(
      async () => publicClient.waitForTransactionReceipt({ hash: computeHash }),
      'computeDifference receipt',
    );

    const events = parseEventLogs({
      logs: receipt.logs,
      abi: gameContractConfig.abi,
      eventName: 'DifferenceComputed',
    });

    // Get difference cipher
    const result = events[0]?.args?.differenceCipher;
    if (!result) {
      throw new Error(
        'Failed to extract difference cipher from transaction logs',
      );
    }

    // Finalize game
    const publicKeyN = BigInt('0x' + process.env.NEXT_PUBLIC_PAILLIER_N);
    const publicKeyG = BigInt('0x' + process.env.NEXT_PUBLIC_PAILLIER_G);

    const privateKeyLambda = BigInt('0x' + process.env.PAILLIER_LAMBDA);
    const privateKeyMu = BigInt('0x' + process.env.PAILLIER_MU);

    // Generate keys
    const publicKey = new paillier.PublicKey(publicKeyN, publicKeyG);
    const privateKey = new paillier.PrivateKey(
      privateKeyLambda,
      privateKeyMu,
      publicKey,
    );

    const decryptedDifference = privateKey.decrypt(BigInt(result));
    const diffMod3 = decryptedDifference % 3n;

    // Finalize game with retry
    const finalizeRequest = await retryOperation(async () => {
      const { request } = await publicClient.simulateContract({
        ...gameContractConfig,
        functionName: 'finalizeGame',
        args: [BigInt(gameId), diffMod3],
        account: walletClient.account,
      });
      return request;
    }, 'finalizeGame simulation');

    const finalizeHash = await retryOperation(
      async () => walletClient.writeContract(finalizeRequest),
      'finalizeGame transaction',
    );

    const finalizationReceipt = await retryOperation(
      async () =>
        publicClient.waitForTransactionReceipt({ hash: finalizeHash }),
      'finalizeGame receipt',
    );

    return {
      success: true,
      hash: finalizationReceipt.transactionHash,
      result: Number(diffMod3),
    };
  } catch (error) {
    console.error('Error resolving game:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
