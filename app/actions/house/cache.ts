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
}

export type GameStep = GameProcessingState["step"];
const processedGamesCache = new Map<number, GameProcessingState>();

export function cleanupCache() {
  const now = Date.now();
  const expiryTime = 5 * 60 * 1000;

  for (const [gameId, data] of processedGamesCache.entries()) {
    if (now - data.timestamp > expiryTime) {
      processedGamesCache.delete(gameId);
    }
  }
}

export function getGameProcessingStatus(gameId: number): {
  isProcessed: boolean;
  state?: GameProcessingState;
} {
  cleanupCache();

  const entry = processedGamesCache.get(gameId);
  if (!entry) {
    return { isProcessed: false };
  }

  const isStale =
    entry.status === "processing" && Date.now() - entry.timestamp > 30000;

  if (isStale) {
    console.log(`Game ${gameId} processing state is stale, allowing retry`);
    return { isProcessed: false };
  }

  return {
    isProcessed: true,
    state: entry,
  };
}

export function updateGameProcessingStep(
  gameId: number,
  step: GameStep,
  txHash?: string
) {
  const existing = processedGamesCache.get(gameId);

  const newTxHash = txHash || existing?.txHash;

  processedGamesCache.set(gameId, {
    status: "processing",
    step,
    timestamp: Date.now(),
    result: existing?.result,
    txHash: newTxHash,
  });

  console.log(
    `Updated game ${gameId} processing step to: ${step}${
      newTxHash ? ` with txHash: ${newTxHash}` : ""
    }`
  );
}

export function markGameAsCompleted(
  gameId: number,
  result: number,
  txHash?: string
) {
  const existing = processedGamesCache.get(gameId);
  const finalTxHash = txHash || existing?.txHash;

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

export function removeGameFromCache(gameId: number) {
  processedGamesCache.delete(gameId);
  console.log(`Removed game ${gameId} from processing cache`);
}

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
