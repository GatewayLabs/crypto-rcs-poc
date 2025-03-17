"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";
import { useDelegatedActions, usePrivy, useWallets } from "@privy-io/react-auth";
import { useSetActiveWallet } from "@privy-io/wagmi";
import { monad } from "@/config/chains";

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
  login: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();
  const { setActiveWallet } = useSetActiveWallet();
  const { delegateWallet } = useDelegatedActions();

  const [isWalletReady, setIsWalletReady] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  const embeddedWallet = wallets.find(
    (wallet) => wallet.walletClientType === "privy"
  );
  const walletAddress = embeddedWallet?.address;
  const isAuthenticated = ready && authenticated && !!walletAddress;

  
  const isDelegated =
    !!embeddedWallet &&
    !!user?.linkedAccounts.some(
      (account) =>
        account.type === "wallet" &&
        account.chainType === "ethereum" &&
        account.connectorType === "embedded" &&
        account.delegated
    );

  useEffect(() => {
    const activateWallet = async () => {
      try {
        if (!isAuthenticated || !embeddedWallet) {
          setIsWalletReady(false);
          return;
        }

        await setActiveWallet(embeddedWallet);
        await embeddedWallet.switchChain(monad.id);
        
        if(!isDelegated) {
          await delegateWallet({
            address: embeddedWallet.address,
            chainType: "ethereum",
          })
        }

        setIsWalletReady(true);
        setWalletError(null);
      } catch (error) {
        console.error("Error activating wallet:", error);
        let message = error instanceof Error ? error.message : "Unknown error";
        if(message.includes("User declined")) {
          message = "To access dApp you should delegate offline access to your embedded wallet";
        }

        setWalletError(
          message
        );
        setIsWalletReady(false);
        await logout();
      }
    };

    activateWallet();
  }, [isAuthenticated, embeddedWallet, isDelegated, setActiveWallet]);

  const value = {
    isAuthenticated,
    isWalletReady,
    walletAddress,
    walletError,
    embeddedWallet,
    login,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
