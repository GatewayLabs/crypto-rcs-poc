import {
  houseAccount,
  publicClient,
  walletClient,
  walletClient2,
} from '@/config/server';
import { retry } from '@/lib/utils';
import { WalletClient } from 'viem';

interface ExecuteTransactionOptions {
  retries?: number;
  backoffMs?: number;
  logPrefix?: string;
  value?: bigint;
}

// Local nonce tracker (initialize once)
let localNonce: { [key: string]: number | null } = {
  [walletClient.account.address]: null,
  [walletClient2.account.address]: null,
};
let nonceLastUpdated: { [key: string]: number } = {
  [walletClient.account.address]: 0,
  [walletClient2.account.address]: 0,
};

async function getAndIncrementNonce(
  houseAccountAddress: `0x${string}`,
): Promise<number> {
  const now = Date.now();

  // Refresh from chain if nonce is null or was last updated more than 10 seconds ago
  if (
    localNonce[houseAccountAddress] === null ||
    now - nonceLastUpdated[houseAccountAddress] > 10000
  ) {
    try {
      localNonce[houseAccountAddress] = Number(
        await publicClient.getTransactionCount({
          address: houseAccountAddress,
          blockTag: 'pending',
        }),
      );
      nonceLastUpdated[houseAccountAddress] = now;
      console.log(`Refreshed nonce from chain: ${localNonce}`);
    } catch (error) {
      // If we can't refresh, and have no nonce, throw
      if (localNonce[houseAccountAddress] === null) {
        throw new Error(`Failed to get initial nonce: ${error}`);
      }
      // Otherwise, continue with existing nonce
      console.warn(`Failed to refresh nonce, using existing: ${localNonce}`);
    }
  }

  const currentNonce = localNonce[houseAccountAddress];
  if (currentNonce === null) {
    throw new Error('Nonce is null');
  }
  localNonce[houseAccountAddress] = currentNonce + 1;

  return currentNonce;
}

export async function executeContractFunction(
  config: { address: `0x${string}`; abi: readonly any[] | any[] },
  functionName: string,
  args: any[],
  options: ExecuteTransactionOptions = {},
): Promise<`0x${string}`> {
  const {
    retries = 3,
    backoffMs = 1000,
    logPrefix = `Contract call: ${functionName}`,
    value,
  } = options;

  return retry(
    async () => {
      // Get the current nonce (locally tracked)
      const houseAccount = Math.random() > 0.5 ? walletClient2 : walletClient;
      console.log(
        `${logPrefix}: Using house account ${houseAccount.account.address}`,
      );

      const nonce = await getAndIncrementNonce(houseAccount.account?.address!);
      console.log(`${logPrefix}: Using nonce ${nonce}`);

      try {
        // Simulate the contract call to estimate gas and validate
        const { request } = await publicClient.simulateContract({
          address: config.address,
          abi: config.abi,
          functionName,
          args,
          account: houseAccount.account,
          nonce,
          value,
        });

        // Add buffer to gas limit (110%)
        if (request.gas) {
          request.gas = BigInt(Math.floor(Number(request.gas) * 1.1));
        }

        // Execute the transaction
        const txHash = await houseAccount.writeContract({
          ...request,
          nonce,
          value,
        });

        console.log(`${logPrefix}: Transaction ${txHash} sent successfully`);
        return txHash;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // Handle nonce errors
        if (
          errorMessage.includes('nonce too low') ||
          errorMessage.includes('nonce too high')
        ) {
          console.log(
            `${logPrefix}: Nonce error detected, resetting nonce state`,
          );
          // Reset the nonce tracking completely
          localNonce = {
            [walletClient.account.address]: null,
            [walletClient2.account.address]: null,
          };
          nonceLastUpdated = {
            [walletClient.account.address]: 0,
            [walletClient2.account.address]: 0,
          };
          throw new Error(`Nonce error: ${errorMessage}`);
        }

        // Business logic errors - don't retry these
        if (
          errorMessage.includes('Game already finalized') ||
          errorMessage.includes('Game is already finished') ||
          errorMessage.includes('Moves already submitted') ||
          errorMessage.includes('Difference already computed')
        ) {
          // These are expected errors in some cases, rethrow with clear message
          throw new Error(`Contract state error: ${errorMessage}`);
        }

        // Other errors: rethrow with prefix for better debugging
        throw new Error(`${functionName} error: ${errorMessage}`);
      }
    },
    {
      retries,
      backoffMs,
      shouldRetry: (error) => {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // Don't retry business logic errors
        if (
          errorMessage.includes('Game already finalized') ||
          errorMessage.includes('Game is already finished') ||
          errorMessage.includes('Moves already submitted') ||
          errorMessage.includes('Difference already computed')
        ) {
          return false;
        }

        // Retry network/nonce/timeout errors
        return (
          errorMessage.includes('network') ||
          errorMessage.includes('gas') ||
          errorMessage.includes('nonce') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('connection')
        );
      },
      onRetry: (error, attempt) => {
        console.log(
          `${logPrefix}: Retry attempt ${attempt} due to: ${error.message}`,
        );
      },
    },
  );
}
