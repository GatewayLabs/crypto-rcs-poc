import { publicClient, walletClient } from "@/config/server";
import { retry } from "@/lib/utils";
import { SimulateContractParameters, WriteContractParameters } from "viem";

interface ExecuteTransactionOptions {
  retries?: number;
  backoffMs?: number;
  logPrefix?: string;
  value?: bigint;
}

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

  // Track the last error and nonce as numbers
  let lastError: any = null;
  let lastNonce: number | null = null;

  return retry(
    async () => {
      // Fetch a fresh nonce, which is a number
      let nonce = await publicClient.getTransactionCount({
        address: walletClient.account.address,
      });

      // Handle nonce increment if previous attempt failed due to "nonce too low"
      if (
        lastError &&
        typeof lastError === "object" &&
        "message" in lastError &&
        lastError.message.includes("nonce too low")
      ) {
        if (lastNonce !== null) {
          nonce = Math.max(nonce, lastNonce + 1); // Both are numbers
        }
      }

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
        nonce, // Expects number
        value,
      } as SimulateContractParameters);

      try {
        const txHash = await walletClient.writeContract({
          ...request,
          nonce, // Expects number
          value,
        } as WriteContractParameters);

        console.log(`${logPrefix}: Transaction ${txHash} sent successfully`);
        lastNonce = nonce; // Store as number
        return txHash;
      } catch (error) {
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
