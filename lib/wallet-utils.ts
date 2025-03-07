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

  const txFunction = async () => {
    const nonce = await publicClient.getTransactionCount({
      address: walletClient.account.address,
    });

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

    const txHash = await walletClient.writeContract({
      ...request,
      nonce,
      value,
    } as WriteContractParameters);

    console.log(`${logPrefix}: Transaction ${txHash} sent successfully`);
    return txHash;
  };

  return retry(txFunction, {
    retries,
    backoffMs,
    shouldRetry: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

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
  });
}
