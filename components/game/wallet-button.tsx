'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button';
import Avatar from 'boring-avatars';
import { useWallet } from '@/contexts/wallet-context';
import {
  Copy,
  ExternalLink,
  LogOut,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useBalance } from 'wagmi';

export default function WalletButton() {
  const { authenticated, login, logout } = usePrivy();
  const { walletAddress } = useWallet();
  const [isOpen, setIsOpen] = useState(false);

  const { data: balanceData, isLoading: isLoadingBalance } = useBalance({
    address: walletAddress as `0x${string}`,
    query: {
      enabled: !!walletAddress,
    },
  });

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
    }
  };

  const openOnExplorer = () => {
    if (walletAddress) {
      window.open(
        `https://testnet.monadexplorer.com/address/${walletAddress}`,
        '_blank',
      );
    }
  };

  if (!authenticated) {
    return (
      <Button
        onClick={login}
        className="bg-zinc-800 border-zinc-800 border self-stretch flex min-w-16 items-center overflow-hidden justify-center my-auto opacity-80 px-4 py-1.5 rounded-md border-solid transition-all duration-300 group-hover:opacity-50 hover:!opacity-100 text-white text-sm font-medium hover:bg-zinc-700"
      >
        Login
      </Button>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button className="bg-zinc-800 border-zinc-800 border self-stretch flex min-w-16 items-center overflow-hidden justify-center my-auto opacity-80 px-4 py-1.5 rounded-md border-solid transition-all duration-300 group-hover:opacity-50 hover:!opacity-100 text-white text-sm font-medium hover:bg-zinc-700">
          <div className="flex items-center gap-2">
            <Avatar variant="pixel" size={24} name={walletAddress} />
            <span>
              {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
            </span>
            {isOpen ? (
              <ChevronUp className="h-4 w-4 opacity-70" />
            ) : (
              <ChevronDown className="h-4 w-4 opacity-70" />
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>My Wallet</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-2 py-2 flex flex-col">
          <span className="text-xs text-zinc-400">Balance</span>
          <span className="font-medium">
            {isLoadingBalance
              ? 'Loading...'
              : `${balanceData?.formatted?.slice(0, 8) || '0'} ${
                  balanceData?.symbol || 'ETH'
                }`}
          </span>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={copyAddress} className="cursor-pointer">
          <Copy className="mr-2 h-4 w-4" />
          <span>Copy Address</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={openOnExplorer} className="cursor-pointer">
          <ExternalLink className="mr-2 h-4 w-4" />
          <span>View on Explorer</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={logout}
          className="text-red-500 focus:text-red-500 cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
