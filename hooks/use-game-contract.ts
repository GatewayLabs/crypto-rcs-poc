'use client';

import { Move, encryptMove, ElGamalCiphertext } from '@/lib/crypto';
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
    async (move: Move, betAmount = DEFAULT_BET_AMOUNT_WEI) => {
      try {
        const encryptedMove = (await encryptMove(move)) as ElGamalCiphertext;

        // Estimate gas with retry
        const gas = await estimateGasWithRetry({
          ...gameContractConfig,
          functionName: 'createGame',
          args: [
            ('0x' +
              encryptedMove.c1.toString(16).padStart(64, '0')) as `0x${string}`,
            ('0x' +
              encryptedMove.c2.toString(16).padStart(64, '0')) as `0x${string}`,
          ],
          value: betAmount,
        });

        // Execute transaction with retry
        const hash = await retry(
          () =>
            writeContract({
              ...gameContractConfig,
              functionName: 'createGame',
              args: [
                ('0x' +
                  encryptedMove.c1
                    .toString(16)
                    .padStart(64, '0')) as `0x${string}`,
                ('0x' +
                  encryptedMove.c2
                    .toString(16)
                    .padStart(64, '0')) as `0x${string}`,
              ],
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
   * Join an existing game with retry logic
   */
  const joinGame = useCallback(
    async (gameId: number, move: Move, betAmount = DEFAULT_BET_AMOUNT_WEI) => {
      try {
        const encryptedMove = (await encryptMove(move)) as ElGamalCiphertext;

        // Estimate gas with retry
        const gas = await estimateGasWithRetry({
          ...gameContractConfig,
          functionName: 'joinGame',
          args: [
            BigInt(gameId),
            ('0x' +
              encryptedMove.c1.toString(16).padStart(64, '0')) as `0x${string}`,
            ('0x' +
              encryptedMove.c2.toString(16).padStart(64, '0')) as `0x${string}`,
          ],
          value: betAmount,
        });
        // Execute transaction with retry
        await retry(
          () =>
            writeContract({
              ...gameContractConfig,
              functionName: 'joinGame',
              args: [
                BigInt(gameId),
                ('0x' +
                  encryptedMove.c1
                    .toString(16)
                    .padStart(64, '0')) as `0x${string}`,
                ('0x' +
                  encryptedMove.c2
                    .toString(16)
                    .padStart(64, '0')) as `0x${string}`,
              ],
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
              console.log(`Joining game retry attempt ${attempt}: ${error}`);
            },
          },
        );
      } catch (error) {
        console.error('Error joining game:', error);
        throw error;
      }
    },
    [writeContract, publicClient],
  );

  /**
   * Compute difference for a game with retry logic
   */
  const computeDifference = useCallback(
    async (gameId: number) => {
      try {
        // Estimate gas with retry
        const gas = await estimateGasWithRetry({
          ...gameContractConfig,
          functionName: 'computeDifference',
          args: [BigInt(gameId)],
        });

        // Execute transaction with retry
        await retry(
          () =>
            writeContract({
              ...gameContractConfig,
              functionName: 'computeDifference',
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
                !errorMessage.includes('Difference already computed') &&
                (errorMessage.includes('network') ||
                  errorMessage.includes('timeout') ||
                  errorMessage.includes('gas') ||
                  errorMessage.includes('connection'))
              );
            },
            onRetry: (error, attempt) => {
              console.log(
                `Computing difference retry attempt ${attempt}: ${error}`,
              );
            },
          },
        );
      } catch (error) {
        console.error('Error computing difference:', error);
        throw error;
      }
    },
    [writeContract, publicClient],
  );

  /**
   * Finalize a game with retry logic
   */
  const finalizeGame = useCallback(
    async (gameId: number, diffMod3: number) => {
      try {
        // Estimate gas with retry
        const gas = await estimateGasWithRetry({
          ...gameContractConfig,
          functionName: 'finalizeGame',
          args: [BigInt(gameId), BigInt(diffMod3)],
        });

        // Execute transaction with retry
        await retry(
          () =>
            writeContract({
              ...gameContractConfig,
              functionName: 'finalizeGame',
              args: [BigInt(gameId), BigInt(diffMod3)],
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
    joinGame,
    computeDifference,
    finalizeGame,

    // States
    isLoading: isPending,
    isSuccess,

    // Transaction data
    txHash,
  };
}
