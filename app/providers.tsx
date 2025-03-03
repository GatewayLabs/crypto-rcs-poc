'use client';

import { config } from '@/config/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from '@privy-io/wagmi';
import { PrivyProvider } from '@privy-io/react-auth';
import { privyConfig } from '@/config/privy';
import { WalletProvider } from '@/contexts/wallet-context';

const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      clientId={process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID!}
      config={privyConfig}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={config}>
          <WalletProvider>{children}</WalletProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
