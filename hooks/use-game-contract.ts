'use client';

import { Move, encryptMove } from '@/lib/crypto';
import { gameContractConfig } from '@/config/contracts';
import { usePublicClient, useReadContract, useWriteContract } from 'wagmi';
import { useCallback } from 'react';
import { EstimateContractGasParameters, parseEventLogs } from 'viem';
import { monad } from '@/config/chains';
import * as paillier from 'paillier-bigint';

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

  const estimateGasWithRetry = async (
    params: EstimateContractGasParameters,
  ) => {
    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        const estimate = await publicClient!.estimateContractGas(params);
        return (estimate * 120n) / 100n;
      } catch (error) {
        retries++;
        if (retries === maxRetries) throw error;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  };

  // Write hooks
  const {
    writeContractAsync: writeContract,
    isPending,
    isSuccess,
    data: txHash,
  } = useWriteContract();

  const createGame = useCallback(
    async (move: Move, betAmount = DEFAULT_BET_AMOUNT_WEI) => {
      try {
        const encryptedMove = await encryptMove(move);

        let paddedEncryptedMove = encryptedMove;
        if (encryptedMove.length % 2 !== 0) {
          paddedEncryptedMove = encryptedMove.replace('0x', '0x0');
        }

        while (paddedEncryptedMove.length < 258) {
          paddedEncryptedMove = paddedEncryptedMove.replace('0x', '0x0');
        }

        const gas = await estimateGasWithRetry({
          ...gameContractConfig,
          functionName: 'createGame',
          args: [paddedEncryptedMove as `0x${string}`],
          value: betAmount,
        });

        const hash = await writeContract({
          ...gameContractConfig,
          functionName: 'createGame',
          args: [paddedEncryptedMove as `0x${string}`],
          value: betAmount,
          gas,
        });

        const receipt = await publicClient!.waitForTransactionReceipt({ hash });
        const events = parseEventLogs({
          logs: receipt.logs,
          abi: gameContractConfig.abi,
        });

        const result = events[0]?.args?.gameId;

        return Number(result);
      } catch (error) {
        console.error('Error creating game:', error);
        throw error;
      }
    },
    [writeContract, publicClient],
  );

  const joinGame = useCallback(
    async (gameId: number, move: Move, betAmount = DEFAULT_BET_AMOUNT_WEI) => {
      try {
        const encryptedMove = await encryptMove(move);
        await writeContract({
          ...gameContractConfig,
          functionName: 'joinGame',
          args: [BigInt(gameId), encryptedMove as `0x${string}`],
          value: betAmount, // Add bet amount
        });
      } catch (error) {
        console.error('Error joining game:', error);
        throw error;
      }
    },
    [writeContract],
  );

  const submitMoves = useCallback(
    async (gameId: number) => {
      try {
        await writeContract({
          ...gameContractConfig,
          functionName: 'submitMoves',
          args: [BigInt(gameId)],
        });
      } catch (error) {
        console.error('Error submitting moves:', error);
        throw error;
      }
    },
    [writeContract],
  );

  const computeDifference = useCallback(
    async (gameId: number) => {
      try {
        await writeContract({
          ...gameContractConfig,
          functionName: 'computeDifference',
          args: [BigInt(gameId)],
        });
      } catch (error) {
        console.error('Error computing difference:', error);
        throw error;
      }
    },
    [writeContract],
  );

  const finalizeGame = useCallback(
    async (gameId: number, diffMod3: number) => {
      try {
        await writeContract({
          ...gameContractConfig,
          functionName: 'finalizeGame',
          args: [BigInt(gameId), BigInt(diffMod3)],
        });
      } catch (error) {
        console.error('Error finalizing game:', error);
        throw error;
      }
    },
    [writeContract],
  );

  return {
    // Read data
    gameInfo,
    refetchGameInfo,

    // Actions
    createGame,
    joinGame,
    submitMoves,
    computeDifference,
    finalizeGame,

    // States
    isLoading: isPending,
    isSuccess,

    // Transaction data
    txHash,
  };
}
