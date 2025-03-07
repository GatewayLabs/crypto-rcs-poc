import { publicClient, walletClient } from "@/config/server";
import { retry } from "@/lib/utils";
import { SimulateContractParameters, WriteContractParameters } from "viem";

interface ExecuteTransactionOptions {
  retries?: number;
  backoffMs?: number;
  logPrefix?: string;
  value?: bigint;
}

/**
 * Execute a contract function with proper nonce management and retry logic
 *
 * @param config Contract config
 * @param functionName Function to call
 * @param args Arguments to pass
 * @param options Retry options
 * @returns Transaction hash
 */
export async function executeContractFunction(
  config: any,
  functionName: string,
  args: any[],
  options: ExecuteTransactionOptions = {}
): Promise<`0x${string}`> {
  const {
    retries = 3,
    backoffMs = 1000,
    logPrefix = `Contract call: ${functionName}`,
    value,
  } = options;

  // Track the last error for nonce management
  let lastError: any = null;
  let lastNonce: bigint | null = null;

  return retry(
    async () => {
      // Get a fresh nonce each time, but increment it if we had a nonce error
      let nonce;

      // If last error was a nonce error, get a fresh nonce
      if (
        lastError &&
        typeof lastError === "object" &&
        "message" in lastError &&
        typeof lastError.message === "string" &&
        lastError.message.includes("nonce too low")
      ) {
        // Force refresh nonce with a small delay to allow blockchain to sync
        await new Promise((resolve) => setTimeout(resolve, 500));
        nonce = await publicClient.getTransactionCount({
          address: walletClient.account.address,
        });
        // Increment nonce manually if needed
        if (lastNonce !== null && nonce <= lastNonce) {
          nonce = lastNonce + 1n;
        }
      } else {
        // Normal case - just get the current nonce
        nonce = await publicClient.getTransactionCount({
          address: walletClient.account.address,
        });
      }

      // Save the nonce for potential next retry
      lastNonce = BigInt(nonce);

      console.log(
        `${logPrefix}: Preparing with nonce ${nonce}${
          value ? `, value ${value}` : ""
        }`
      );

      const { request } = await publicClient.simulateContract({
        ...config,
        functionName,
        args,
        account: walletClient.account,
        nonce,
        value,
      } as SimulateContractParameters);

      try {
        const txHash = await walletClient.writeContract({
          ...request,
          nonce,
          value,
        } as WriteContractParameters);

        console.log(`${logPrefix}: Transaction ${txHash} sent successfully`);
        return txHash;
      } catch (error) {
        // Save the error for the next retry attempt
        lastError = error;
        throw error;
      }
    },
    {
      retries,
      backoffMs,
      shouldRetry: (error) => {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        lastError = error;

        // Retry on nonce issues, replacement transaction underpriced, or network errors
        return (
          errorMessage.includes("nonce too low") ||
          errorMessage.includes("replacement transaction underpriced") ||
          errorMessage.includes("already known") ||
          errorMessage.includes("network") ||
          errorMessage.includes("timeout") ||
          errorMessage.includes("connection")
        );
      },
      onRetry: (error, attempt) => {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.log(
          `${logPrefix}: Retry attempt ${attempt} after error: ${errorMessage}`
        );
      },
    }
  );
}
