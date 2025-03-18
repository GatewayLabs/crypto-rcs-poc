"use client";

import { privyConfig } from "@/config/privy";
import { config } from "@/config/wagmi";
import OdysseyContextProvider from "@/contexts/odyssey-context";
import { WalletProvider } from "@/contexts/wallet-context";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={privyConfig}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={config}>
          <WalletProvider>
            <OdysseyContextProvider>{children}</OdysseyContextProvider>
          </WalletProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
