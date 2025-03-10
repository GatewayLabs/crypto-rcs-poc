import { Redis } from "@upstash/redis";
import { isHex } from "viem";

const redis = Redis.fromEnv();

const REDIS_KEY_PREFIX = "erps:game:";
const getRedisKey = (gameId: number) => `${REDIS_KEY_PREFIX}${gameId}`;

// Game processing state types and cache
export interface GameProcessingState {
  status: "processing" | "completed";
  step:
    | "joining"
    | "submitting_moves"
    | "computing_difference"
    | "finalizing"
    | "done";
  result?: number;
  timestamp: number;
  txHash?: string;
  waitingForConfirmation?: boolean;
  retryCount?: number;
}

export type GameStep = GameProcessingState["step"];

// Check if game is being processed
export async function getGameProcessingStatus(gameId: number): Promise<{
  isProcessed: boolean;
  state?: GameProcessingState;
}> {
  const entry = (await redis.get(getRedisKey(gameId))) as GameProcessingState;
  if (!entry) {
    return { isProcessed: false };
  }

  // Check for stale processing - if it's been more than 1 minute since the last update
  const isStale =
    entry.status === "processing" && Date.now() - entry.timestamp > 60000;

  if (isStale) {
    console.log(
      `Game ${gameId} processing state is stale (over 60s), allowing retry`
    );
    return { isProcessed: false };
  }

  return {
    isProcessed: true,
    state: entry,
  };
}

// Update game processing step
export async function updateGameProcessingStep(
  gameId: number,
  step: GameStep,
  txHash?: string
) {
  const existing = (await redis.get(
    getRedisKey(gameId)
  )) as GameProcessingState;

  // Only use txHash if it's a valid hash
  const newTxHash =
    txHash && txHash.startsWith("0x") ? txHash : existing?.txHash;

  await redis.set(
    getRedisKey(gameId),
    {
      status: "processing",
      step,
      timestamp: Date.now(),
      result: existing?.result,
      txHash: newTxHash,
      waitingForConfirmation: existing?.waitingForConfirmation,
      retryCount: existing?.retryCount || 0,
    },
    {
      ex: 60,
    }
  );

  console.log(
    `Updated game ${gameId} processing step to: ${step}${
      newTxHash ? ` with txHash: ${newTxHash}` : ""
    }`
  );
}

// Mark game as waiting for join
export async function markGameAsWaitingForJoin(
  gameId: number,
  txHash?: string
) {
  const existing = (await redis.get(
    getRedisKey(gameId)
  )) as GameProcessingState;

  const validTxHash = txHash && isHex(txHash) ? txHash : existing?.txHash;

  // Increment retry count if it exists, otherwise start at 1
  const retryCount =
    existing?.retryCount !== undefined ? existing.retryCount + 1 : 1;

  await redis.set(
    getRedisKey(gameId),
    {
      status: "processing",
      step: "joining",
      timestamp: Date.now(),
      result: existing?.result,
      txHash: validTxHash,
      waitingForConfirmation: true,
      retryCount,
    },
    {
      ex: 60,
    }
  );

  if (validTxHash) {
    console.log(
      `Marked game ${gameId} as waiting for join with txHash: ${validTxHash} (retry: ${retryCount})`
    );
  } else {
    console.log(
      `Marked game ${gameId} as waiting for join without valid txHash (retry: ${retryCount})`
    );
  }
}

// Mark game as completed
export async function markGameAsCompleted(
  gameId: number,
  result: number,
  txHash?: string
) {
  const existing = (await redis.get(
    getRedisKey(gameId)
  )) as GameProcessingState;

  // Only use txHash if it's a valid hash
  const finalTxHash =
    txHash && txHash.startsWith("0x") ? txHash : existing?.txHash;

  await redis.set(
    getRedisKey(gameId),
    {
      status: "completed",
      step: "done",
      result,
      timestamp: Date.now(),
      txHash: finalTxHash,
    },
    {
      ex: 60,
    }
  );

  console.log(
    `Marked game ${gameId} as completed with result: ${result}${
      finalTxHash ? ` and txHash: ${finalTxHash}` : ""
    }`
  );
}

// Remove game from cache
export async function removeGameFromCache(gameId: number) {
  await redis.del(getRedisKey(gameId));
  console.log(`Removed game ${gameId} from processing cache`);
}

// Map internal step to client-facing status
export function mapStepToStatus(
  step: GameStep
): "submitting_moves" | "computing_difference" | "finalizing" | "completed" {
  switch (step) {
    case "joining":
      return "submitting_moves";
    case "submitting_moves":
      return "submitting_moves";
    case "computing_difference":
      return "computing_difference";
    case "finalizing":
      return "finalizing";
    case "done":
      return "completed";
    default:
      return "computing_difference";
  }
}
