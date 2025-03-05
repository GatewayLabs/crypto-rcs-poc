"use client";

import { useWallet } from "@/contexts/wallet-context";
import { Copy } from "lucide-react";

interface DepositModalProps {
  onClose: () => void;
}

export default function DepositModal({ onClose }: DepositModalProps) {
  const { walletAddress } = useWallet();

  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      onClose();
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row bg-zinc-800 border rounded-sm border-zinc-600 mb-8 px-4 py-4 justify-between items-center align-middle">
        <span className="text-md text-white flex items-center pt-1">
          {walletAddress}
        </span>
        <button
          onClick={() => copyAddress()}
          className="py-2 px-3 text-sm bg-zinc-700 rounded-sm text-white hover:bg-zinc-600 transition-all flex items-center justify-center gap-2"
        >
          Copy
          <Copy size={14} />
        </button>
      </div>

      <div className="flex items-center pr-4 pointer-events-none mb-2">
        <span className="text-sm text-white text-zinc-500">
          Only send $MON, copy wallet address and send from another wallet.
        </span>
      </div>
    </>
  );
}
