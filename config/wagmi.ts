import { createConfig } from '@privy-io/wagmi';
import { monad } from './chains';
import { http } from 'viem';

export const config = createConfig({
  chains: [monad],
  transports: {
    [monad.id]: http(),
  },
  ssr: true,
});
