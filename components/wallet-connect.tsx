"use client";

import { cn } from '@/lib/utils';
import { useCallback, useState } from 'react';
import { useGame } from '@/context/game-context';

export function WalletConnect() {
  const [isConnecting, setIsConnecting] = useState(false);
  const { playerAddress, dispatch } = useGame();

  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask to play!');
      return;
    }

    setIsConnecting(true);

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts[0]) {
        dispatch({ type: 'SET_PLAYER_ADDRESS', address: accounts[0] });
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  }, [dispatch]);

  return (
    <div className="fixed top-4 right-4">
      <button
        onClick={connectWallet}
        disabled={isConnecting || !!playerAddress}
        className={cn(
          "px-4 py-2 rounded-lg transition-colors duration-300",
          "border border-blue-500",
          playerAddress ? "bg-green-900" : "bg-black bg-opacity-50",
          "hover:bg-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-500",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        <span className={cn(
          "text-sm font-semibold",
          playerAddress ? "text-blue-400" : "text-gray-300"
        )}>
          {isConnecting ? 'Connecting...' :
           playerAddress ? `Connected: ${playerAddress.slice(0, 6)}...${playerAddress.slice(-4)}` :
           'Connect Wallet'}
        </span>
      </button>
    </div>
  );
}