import { gameContractConfig } from '@/config/contracts';
import { publicClient } from '@/config/server';
import { Move } from '@/lib/crypto';
import { retry } from '@/lib/utils';
import crypto from 'crypto';
import { isHex } from 'viem';

// Generate an unpredictable house move
export function generateHouseMove(
  gameId: number,
  playerAddress: string,
  playerBAddress: string,
): Move {
  if (!gameId || !playerAddress) {
    throw new Error('Invalid game ID or player address');
  }

  const moves: Move[] = ['ROCK', 'PAPER', 'SCISSORS'];

  const currentTime = process.hrtime.bigint().toString();
  const entropy =
    currentTime +
    gameId.toString() +
    playerAddress +
    playerBAddress +
    Math.random().toString();

  const hashDigest = crypto.createHash('sha256').update(entropy).digest('hex');
  const hashInt = BigInt('0x' + hashDigest);

  const normalized = Number(hashInt % BigInt(2 ** 256 - 1)) / (2 ** 256 - 1);

  const randomIndex = Math.floor(normalized * moves.length);
  return moves[randomIndex];
}

// Get game state with retry logic
export async function getGameState(gameId: number) {
  // Rest of your existing code remains unchanged
  const data = await retry(
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
          `Retry attempt ${attempt} for getting game state: ${error}`,
        );
      },
    },
  );

  // Destructure for clarity
  const [
    playerA,
    playerB,
    winner,
    finished,
    bothCommitted,
    encChoiceA,
    encChoiceB,
    differenceCipher,
    revealedDiff,
  ] = data;

  return {
    playerA,
    playerB,
    winner,
    finished,
    bothCommitted,
    encChoiceA,
    encChoiceB,
    differenceCipher,
    revealedDiff,
    raw: data,
  };
}

// Quick check if game exists and is finished
export async function quickCheckGameFinished(gameId: number): Promise<{
  exists: boolean;
  finished: boolean;
  result?: number;
}> {
  try {
    const data = await retry(
      () =>
        publicClient.readContract({
          ...gameContractConfig,
          functionName: 'getGameInfo',
          args: [BigInt(gameId)],
        }),
      {
        retries: 2,
        backoffMs: 500,
        shouldRetry: (error) => {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          return (
            errorMessage.includes('network') || errorMessage.includes('timeout')
          );
        },
      },
    );

    const [, , , finished, , , , , revealedDiff] = data;

    return {
      exists: true,
      finished: finished,
      result:
        finished && revealedDiff !== undefined
          ? Number(revealedDiff)
          : undefined,
    };
  } catch (error) {
    console.error(
      `Error checking if game ${gameId} is finished:`,
      error instanceof Error ? error.message : String(error),
    );
    return { exists: false, finished: false };
  }
}

// Wait for transaction confirmation with timeout
export async function waitForTransaction(
  txHash: string,
  timeoutMs = 60000,
): Promise<boolean> {
  // Validate the txHash
  if (!txHash || !isHex(txHash)) {
    console.warn(`Invalid transaction hash provided: ${txHash}`);
    return false;
  }

  try {
    await publicClient.waitForTransactionReceipt({
      hash: txHash as `0x${string}`,
      timeout: timeoutMs,
    });
    return true;
  } catch (error) {
    console.log(
      `Transaction ${txHash} wait timed out after ${timeoutMs}ms: ${error}`,
    );
    return false;
  }
}
