import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { monad } from './chains';

// House wallet setup
const HOUSE_PRIVATE_KEY = process.env.HOUSE_PRIVATE_KEY!;
const account = privateKeyToAccount(HOUSE_PRIVATE_KEY as `0x${string}`);

// Viem clients for server actions
export const walletClient = createWalletClient({
  account,
  chain: monad,
  transport: http(monad.rpcUrls.default.http[0]),
  key: HOUSE_PRIVATE_KEY,
});

export const publicClient = createPublicClient({
  chain: monad,
  transport: http(monad.rpcUrls.default.http[0]),
});

// Export the account for use in server actions
export const houseAccount = account;
