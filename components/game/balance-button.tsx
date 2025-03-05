"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWallet } from "@/contexts/wallet-context";
import { usePrivy } from "@privy-io/react-auth";
import { formatEther } from "ethers";
import { ChevronDown, ChevronUp, Download, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { useBalance } from "wagmi";
import { Button } from "../ui/button";
import DepositModal from "./deposit-modal";
import Modal from "./modal";
import WithdrawModal from "./withdraw-modal";

export default function BalanceButton() {
  const { authenticated } = usePrivy();
  const { walletAddress } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const { data: balanceData, isLoading: isLoadingBalance } = useBalance({
    address: walletAddress as `0x${string}`,
    query: {
      refetchInterval: 10000,
      enabled: !!walletAddress,
    },
  });
  const [balance, setBalance] = useState<bigint | undefined>(BigInt(0));

  useEffect(() => {
    if (!authenticated || isLoadingBalance) {
      return;
    }
    setBalance(balanceData?.value);
  }, [authenticated, balanceData, isLoadingBalance]);

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button className="bg-zinc-800 border-zinc-800 border self-stretch flex min-w-16 items-center overflow-hidden justify-center my-auto opacity-80 px-4 py-1.5 rounded-md border-solid transition-all duration-300 group-hover:opacity-50 hover:!opacity-100 text-white text-sm font-medium hover:bg-zinc-700">
            <div className="flex items-center gap-2">
              <span>
                {balance
                  ? parseFloat(formatEther(balance)).toFixed(4)
                  : "0.0000"}{" "}
                $MON
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
          <DropdownMenuItem
            onClick={() => setIsDepositModalOpen(true)}
            className="cursor-pointer"
          >
            <Download className="mr-2 h-4 w-4" />
            <span>Deposit</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setIsWithdrawModalOpen(true)}
            className="cursor-pointer"
          >
            <Upload className="mr-2 h-4 w-4" />
            <span>Withdraw</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {isWithdrawModalOpen && (
        <Modal
          onClose={() => setIsWithdrawModalOpen(false)}
          title="Withdraw your earnings"
          smallTitle="Withdraw"
        >
          <WithdrawModal onClose={() => setIsWithdrawModalOpen(false)} />
        </Modal>
      )}
      {isDepositModalOpen && (
        <Modal
          onClose={() => setIsDepositModalOpen(false)}
          title="Add funds to play"
          smallTitle="Deposit"
        >
          <DepositModal onClose={() => setIsDepositModalOpen(false)} />
        </Modal>
      )}
    </>
  );
}
