import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { monad } from './chains';

// House wallet setup
const HOUSE_PRIVATE_KEY = process.env.HOUSE_PRIVATE_KEY!;
const HOUSE_PRIVATE_KEY_2 = process.env.HOUSE_PRIVATE_KEY_2!;
const account = privateKeyToAccount(HOUSE_PRIVATE_KEY as `0x${string}`);
const account2 = privateKeyToAccount(HOUSE_PRIVATE_KEY_2 as `0x${string}`);

// Viem clients for server actions
export const walletClient = createWalletClient({
  account,
  chain: monad,
  transport: http(process.env.HOUSE_MONAD_RPC_URL!),
  key: HOUSE_PRIVATE_KEY,
});

export const walletClient2 = createWalletClient({
  account: account2,
  chain: monad,
  transport: http(process.env.HOUSE_MONAD_RPC_URL!),
  key: HOUSE_PRIVATE_KEY_2,
});

export const publicClient = createPublicClient({
  chain: monad,
  transport: http(process.env.HOUSE_MONAD_RPC_URL!),
  batch: {
    multicall: true,
  },
});

// Export the account for use in server actions
export const houseAccount = account;
export const houseAccount2 = account2;
