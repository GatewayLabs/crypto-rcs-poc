'use client';

import {
  Move,
  encryptMove,
  ElGamalCiphertext,
  generateEncryptedMoveHash,
} from '@/lib/crypto';
import { gameContractConfig } from '@/config/contracts';
import { usePublicClient, useReadContract, useWriteContract } from 'wagmi';
import { useCallback } from 'react';
import { EstimateContractGasParameters, parseEventLogs } from 'viem';
import { monad } from '@/config/chains';
import { retry } from '@/lib/utils';

export const DEFAULT_BET_AMOUNT = 0.01;
export const DEFAULT_BET_AMOUNT_WEI = BigInt(DEFAULT_BET_AMOUNT * 10 ** 18);

export function useGameContract(gameId?: number) {
  const publicClient = usePublicClient({
    chainId: monad.id,
  });

  // Read game info
  const { data: gameInfo, refetch: refetchGameInfo } = useReadContract({
    ...gameContractConfig,
    functionName: 'getGameInfo',
    args: gameId ? [BigInt(gameId)] : undefined,
    query: { enabled: Boolean(gameId) },
  });

  /**
   * Estimate gas with retry logic for transient failures
   */
  const estimateGasWithRetry = async (
    params: EstimateContractGasParameters,
  ) => {
    return retry(
      async () => {
        const estimate = await publicClient!.estimateContractGas(params);
        // Add 20% buffer to gas estimate
        return (estimate * 120n) / 100n;
      },
      {
        retries: 3,
        backoffMs: 1000,
        shouldRetry: (error) => {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          return (
            errorMessage.includes('network') ||
            errorMessage.includes('timeout') ||
            errorMessage.includes('gas') ||
            errorMessage.includes('rate limit')
          );
        },
        onRetry: (error, attempt) => {
          console.log(`Gas estimation retry attempt ${attempt}: ${error}`);
        },
      },
    );
  };

  // Write hooks
  const {
    writeContractAsync: writeContract,
    isPending,
    isSuccess,
    data: txHash,
  } = useWriteContract();

  /**
   * Create a new game with retry logic
   */
  const createGame = useCallback(
    async (
      encryptedMove: ElGamalCiphertext,
      betAmount = DEFAULT_BET_AMOUNT_WEI,
    ) => {
      try {
        // Convert the EC points to hex strings.
        const moveHash = generateEncryptedMoveHash(
          encryptedMove,
        ) as `0x${string}`;

        // Estimate gas with retry
        const gas = await estimateGasWithRetry({
          ...gameContractConfig,
          functionName: 'createGame',
          args: [moveHash],
          value: betAmount,
        });

        // Execute transaction with retry
        const hash = await retry(
          () =>
            writeContract({
              ...gameContractConfig,
              functionName: 'createGame',
              args: [moveHash],
              value: betAmount,
              gas,
            }),
          {
            retries: 3,
            backoffMs: 1000,
            shouldRetry: (error) => {
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              // Don't retry user rejections
              return (
                !errorMessage.includes('user rejected') &&
                (errorMessage.includes('network') ||
                  errorMessage.includes('timeout') ||
                  errorMessage.includes('gas') ||
                  errorMessage.includes('connection'))
              );
            },
            onRetry: (error, attempt) => {
              console.log(`Creating game retry attempt ${attempt}: ${error}`);
            },
          },
        );

        const receipt = await publicClient!.waitForTransactionReceipt({ hash });
        const events = parseEventLogs({
          logs: receipt.logs,
          abi: gameContractConfig.abi,
        });

        const event = events[0] as { args: { gameId: bigint } };
        const result = event?.args?.gameId;

        return Number(result);
      } catch (error) {
        console.error('Error creating game:', error);
        throw error;
      }
    },
    [writeContract, publicClient],
  );

  /**
   * Cancel a game with retry logic
   */
  const cancelGame = useCallback(
    async (gameId: number) => {
      try {
        // Estimate gas with retry
        const gas = await estimateGasWithRetry({
          ...gameContractConfig,
          functionName: 'cancelGame',
          args: [BigInt(gameId)],
        });

        // Execute transaction with retry
        await retry(
          () =>
            writeContract({
              ...gameContractConfig,
              functionName: 'cancelGame',
              args: [BigInt(gameId)],
              gas,
            }),
          {
            retries: 3,
            backoffMs: 1000,
            shouldRetry: (error) => {
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              // Don't retry user rejections or business logic failures
              return (
                !errorMessage.includes('user rejected') &&
                !errorMessage.includes('Game already finalized') &&
                !errorMessage.includes('Game is already finished') &&
                (errorMessage.includes('network') ||
                  errorMessage.includes('timeout') ||
                  errorMessage.includes('gas') ||
                  errorMessage.includes('connection'))
              );
            },
            onRetry: (error, attempt) => {
              console.log(`Cancelling game retry attempt ${attempt}: ${error}`);
            },
          },
        );
      } catch (error) {
        console.error('Error canceling game:', error);
        throw error;
      }
    },
    [writeContract, publicClient],
  );

  /**
   * Finalize a game with retry logic
   */
  const finalizeGame = useCallback(
    async (gameId: number, diffMod3: number, difference: ElGamalCiphertext) => {
      try {
        // Estimate gas with retry
        const gas = await estimateGasWithRetry({
          ...gameContractConfig,
          functionName: 'finalizeGame',
          args: [BigInt(gameId), BigInt(diffMod3), difference],
        });

        // Execute transaction with retry
        await retry(
          () =>
            writeContract({
              ...gameContractConfig,
              functionName: 'finalizeGame',
              args: [
                BigInt(gameId),
                BigInt(diffMod3),
                {
                  c1: difference.C1,
                  c2: difference.C2,
                },
              ],
              gas,
            }),
          {
            retries: 3,
            backoffMs: 1000,
            shouldRetry: (error) => {
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              // Don't retry user rejections or business logic failures
              return (
                !errorMessage.includes('user rejected') &&
                !errorMessage.includes('Game already finalized') &&
                !errorMessage.includes('Game is already finished') &&
                (errorMessage.includes('network') ||
                  errorMessage.includes('timeout') ||
                  errorMessage.includes('gas') ||
                  errorMessage.includes('connection'))
              );
            },
            onRetry: (error, attempt) => {
              console.log(`Finalizing game retry attempt ${attempt}: ${error}`);
            },
          },
        );
      } catch (error) {
        console.error('Error finalizing game:', error);
        throw error;
      }
    },
    [writeContract, publicClient],
  );

  return {
    // Read data
    gameInfo,
    refetchGameInfo,

    // Actions
    createGame,
    finalizeGame,
    cancelGame,

    // States
    isLoading: isPending,
    isSuccess,

    // Transaction data
    txHash,
  };
}
