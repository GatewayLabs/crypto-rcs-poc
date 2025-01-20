"use client";

import { Move, encryptMove } from "@/lib/crypto";
import { gameContractConfig } from "@/config/contracts";
import {
  usePublicClient,
  useReadContract,
  useWatchContractEvent,
  useWriteContract,
} from "wagmi";
import { useCallback } from "react";
import { parseEventLogs } from "viem";

export function useGameContract(gameId?: number) {
  const publicClient = usePublicClient();

  // Read game info
  const { data: gameInfo, refetch: refetchGameInfo } = useReadContract({
    ...gameContractConfig,
    functionName: "getGameInfo",
    args: gameId ? [BigInt(gameId)] : undefined,
    query: { enabled: Boolean(gameId) },
  });

  // Write hooks
  const {
    writeContractAsync: writeContract,
    isPending,
    isSuccess,
    data: txHash,
  } = useWriteContract();

  const createGame = useCallback(
    async (move: Move) => {
      try {
        const encryptedMove = await encryptMove(move);

        // Get transaction hash
        const hash = await writeContract({
          ...gameContractConfig,
          functionName: "createGame",
          args: [encryptedMove as `0x${string}`],
        });

        // Wait for transaction receipt
        const receipt = await publicClient!.waitForTransactionReceipt({ hash });
        const events = parseEventLogs({
          logs: receipt.logs,
          abi: gameContractConfig.abi,
        });

        // Get game ID
        const result = events[0]?.args?.gameId;

        return Number(result);
      } catch (error) {
        console.error("Error creating game:", error);
        throw error;
      }
    },
    [writeContract, publicClient]
  );

  const joinGame = useCallback(
    async (gameId: number, move: Move) => {
      try {
        const encryptedMove = await encryptMove(move);
        await writeContract({
          ...gameContractConfig,
          functionName: "joinGame",
          args: [BigInt(gameId), encryptedMove as `0x${string}`],
        });
      } catch (error) {
        console.error("Error joining game:", error);
        throw error;
      }
    },
    [writeContract]
  );

  const submitMoves = useCallback(
    async (gameId: number) => {
      try {
        await writeContract({
          ...gameContractConfig,
          functionName: "submitMoves",
          args: [BigInt(gameId)],
        });
      } catch (error) {
        console.error("Error submitting moves:", error);
        throw error;
      }
    },
    [writeContract]
  );

  const computeDifference = useCallback(
    async (gameId: number) => {
      try {
        await writeContract({
          ...gameContractConfig,
          functionName: "computeDifference",
          args: [BigInt(gameId)],
        });
      } catch (error) {
        console.error("Error computing difference:", error);
        throw error;
      }
    },
    [writeContract]
  );

  const finalizeGame = useCallback(
    async (gameId: number, diffMod3: number) => {
      try {
        await writeContract({
          ...gameContractConfig,
          functionName: "finalizeGame",
          args: [BigInt(gameId), BigInt(diffMod3)],
        });
      } catch (error) {
        console.error("Error finalizing game:", error);
        throw error;
      }
    },
    [writeContract]
  );

  // Event listeners
  useWatchContractEvent({
    ...gameContractConfig,
    eventName: "GameCreated",
    onLogs(logs) {
      console.log("Game created:", logs);
      refetchGameInfo();
    },
  });

  useWatchContractEvent({
    ...gameContractConfig,
    eventName: "GameJoined",
    onLogs(logs) {
      console.log("Game joined:", logs);
      refetchGameInfo();
    },
  });

  useWatchContractEvent({
    ...gameContractConfig,
    eventName: "GameResolved",
    onLogs(logs) {
      console.log("Game resolved:", logs);
      refetchGameInfo();
    },
  });

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
