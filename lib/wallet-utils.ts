import { publicClient, walletClient } from "@/config/server";
import { SimulateContractParameters, WriteContractParameters } from "viem";

interface ExecuteTransactionOptions {
  retries?: number;
  backoffMs?: number;
  logPrefix?: string;
  value?: bigint;
}

/**
 * Execute a contract function with proper nonce management
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

  let attempt = 0;

  while (attempt < retries) {
    try {
      const nonce = await publicClient.getTransactionCount({
        address: walletClient.account.address,
      });

      console.log(
        `${logPrefix}: Preparing with nonce ${nonce}, attempt ${attempt + 1} ${
          value ? `with value ${value}` : ""
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
    } catch (error) {
      attempt++;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (
        errorMessage.includes("nonce too low") ||
        errorMessage.includes("replacement transaction underpriced") ||
        errorMessage.includes("already known")
      ) {
        console.log(
          `${logPrefix}: Nonce error detected, retrying with fresh nonce (attempt ${attempt})`
        );
        await new Promise((r) => setTimeout(r, backoffMs * attempt));
        continue;
      }

      if (attempt < retries) {
        console.log(
          `${logPrefix}: Error, retrying (attempt ${attempt}): ${errorMessage}`
        );
        await new Promise((r) => setTimeout(r, backoffMs * attempt));
        continue;
      }

      console.error(
        `${logPrefix}: Failed after ${retries} attempts: ${errorMessage}`
      );
      throw error;
    }
  }

  throw new Error(`${logPrefix}: Failed after ${retries} attempts`);
}
