import type { PrivyClientConfig } from '@privy-io/react-auth';
import { monad } from './chains';

export const privyConfig: PrivyClientConfig = {
  embeddedWallets: {
    createOnLogin: 'all-users',
  },
  loginMethods: ['wallet', 'email', 'sms'],
  appearance: {
    showWalletLoginFirst: true,
    theme: 'dark',
  },
  supportedChains: [monad],
};
