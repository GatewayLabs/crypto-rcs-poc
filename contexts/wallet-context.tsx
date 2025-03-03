'use client';

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useSetActiveWallet } from '@privy-io/wagmi';
import { monad } from '@/config/chains';

interface EmbeddedWallet {
  address: string;
  walletClientType: string;
  chainId?: string | number;
}

interface WalletContextType {
  isAuthenticated: boolean;
  isWalletReady: boolean;
  walletAddress: string | undefined;
  walletError: string | null;
  embeddedWallet: EmbeddedWallet | undefined;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { ready, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { setActiveWallet } = useSetActiveWallet();

  const [isWalletReady, setIsWalletReady] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  const embeddedWallet = wallets.find(
    (wallet) => wallet.walletClientType === 'privy',
  );
  const walletAddress = embeddedWallet?.address;
  const isAuthenticated = ready && authenticated && !!walletAddress;

  useEffect(() => {
    const activateWallet = async () => {
      try {
        if (!isAuthenticated || !embeddedWallet) {
          setIsWalletReady(false);
          return;
        }

        await setActiveWallet(embeddedWallet);
        await embeddedWallet.switchChain(monad.id);

        setIsWalletReady(true);
        setWalletError(null);
      } catch (error) {
        console.error('Error activating wallet:', error);
        setWalletError(
          error instanceof Error ? error.message : 'Unknown wallet error',
        );
        setIsWalletReady(false);
      }
    };

    activateWallet();
  }, [isAuthenticated, embeddedWallet, setActiveWallet]);

  const value = {
    isAuthenticated,
    isWalletReady,
    walletAddress,
    walletError,
    embeddedWallet,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
