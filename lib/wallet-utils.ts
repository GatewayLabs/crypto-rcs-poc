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

  let attempt = 0;
  let lastError: any;

  while (attempt < retries) {
    try {
      const nonce = await publicClient.getTransactionCount({
        address: walletClient.account.address,
        blockTag: "pending",
      });

      console.log(`${logPrefix}: Attempt ${attempt + 1} with nonce ${nonce}`);

      // Simulate the contract call
      const { request } = await publicClient.simulateContract({
        address: config.address,
        abi: config.abi,
        functionName,
        args,
        account: walletClient.account,
        nonce,
        value,
      });

      // Submit the transaction
      const txHash = await walletClient.writeContract({
        ...request,
        nonce,
        value,
      });

      console.log(`${logPrefix}: Transaction ${txHash} sent successfully`);
      return txHash;
    } catch (error: any) {
      lastError = error;
      const errorMessage = error.message || String(error);

      if (errorMessage.includes("nonce too low")) {
        console.warn(`${logPrefix}: Nonce too low detected, retrying...`);
        attempt++;
        await new Promise((resolve) =>
          setTimeout(resolve, backoffMs * (attempt + 1))
        ); // Exponential backoff
      } else {
        throw error; // Rethrow non-nonce errors
      }
    }
  }

  throw new Error(`Failed after ${retries} attempts: ${lastError.message}`);
}
