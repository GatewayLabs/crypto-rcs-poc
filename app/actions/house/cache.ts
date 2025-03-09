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

// Local cache (will reset on serverless function cold starts)
const processedGamesCache = new Map<number, GameProcessingState>();

// Clean up stale cache entries
export function cleanupCache() {
  const now = Date.now();
  const expiryTime = 5 * 60 * 1000; // 5 minutes

  for (const [gameId, data] of processedGamesCache.entries()) {
    if (now - data.timestamp > expiryTime) {
      console.log(`Cleaning up stale cache entry for game ${gameId}`);
      processedGamesCache.delete(gameId);
    }
  }
}

// Check if game is being processed
export function getGameProcessingStatus(gameId: number): {
  isProcessed: boolean;
  state?: GameProcessingState;
} {
  // Clean up old entries first
  cleanupCache();

  const entry = processedGamesCache.get(gameId);
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
export function updateGameProcessingStep(
  gameId: number,
  step: GameStep,
  txHash?: string
) {
  const existing = processedGamesCache.get(gameId);

  // Only use txHash if it's a valid hash
  const newTxHash =
    txHash && txHash.startsWith("0x") ? txHash : existing?.txHash;

  processedGamesCache.set(gameId, {
    status: "processing",
    step,
    timestamp: Date.now(),
    result: existing?.result,
    txHash: newTxHash,
    waitingForConfirmation: existing?.waitingForConfirmation,
    retryCount: existing?.retryCount || 0,
  });

  console.log(
    `Updated game ${gameId} processing step to: ${step}${
      newTxHash ? ` with txHash: ${newTxHash}` : ""
    }`
  );
}

// Mark game as waiting for join
export function markGameAsWaitingForJoin(gameId: number, txHash?: string) {
  const existing = processedGamesCache.get(gameId);

  // Only use txHash if it's a valid hash
  const validTxHash =
    txHash && txHash.startsWith("0x") ? txHash : existing?.txHash;

  const retryCount = (existing?.retryCount || 0) + 1;

  processedGamesCache.set(gameId, {
    status: "processing",
    step: "joining",
    timestamp: Date.now(),
    result: existing?.result,
    txHash: validTxHash,
    waitingForConfirmation: true,
    retryCount,
  });

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
export function markGameAsCompleted(
  gameId: number,
  result: number,
  txHash?: string
) {
  const existing = processedGamesCache.get(gameId);

  // Only use txHash if it's a valid hash
  const finalTxHash =
    txHash && txHash.startsWith("0x") ? txHash : existing?.txHash;

  processedGamesCache.set(gameId, {
    status: "completed",
    step: "done",
    result,
    timestamp: Date.now(),
    txHash: finalTxHash,
  });

  console.log(
    `Marked game ${gameId} as completed with result: ${result}${
      finalTxHash ? ` and txHash: ${finalTxHash}` : ""
    }`
  );
}

// Remove game from cache
export function removeGameFromCache(gameId: number) {
  processedGamesCache.delete(gameId);
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
