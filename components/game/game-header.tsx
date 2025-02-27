"use client";

import { formatEther } from "ethers";
import { useEffect, useState } from "react";
import { useAccount, useBalance } from "wagmi";
import WalletButton from "./wallet-button";

export default function Header() {
  const { address, isConnected } = useAccount();
  const { data: userBalance, isLoading } = useBalance({
    address,
  });
  const [balance, setBalance] = useState<bigint | undefined>(BigInt(0));

  useEffect(() => {
    if (!isConnected || isLoading) {
      return;
    }
    setBalance(userBalance?.value);
  }, [isConnected, userBalance, isLoading]);

  return (
    <div className="bg-white flex w-full items-center justify-between flex-wrap rounded-3xl max-md:max-w-full">
      <div className="bg-zinc-950 self-stretch flex min-h-[95px] flex-col items-center justify-center w-[172px] my-auto px-6 py-[25px] rounded-3xl max-md:px-5">
        <img
          loading="lazy"
          src="https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/7ec9e6afe81cf386d3364648280c26d0bfbd20262ad6e13d492cf2af9705fcdc?placeholderIfAbsent=true"
          className="aspect-[2.75] object-contain w-[124px] max-w-full"
          alt="Game Logo"
        />
      </div>
      <div className="bg-zinc-950 border-b border-l self-stretch flex min-w-60 min-h-[95px] flex-col overflow-hidden justify-center flex-1 shrink basis-[0%] my-auto px-6 py-7 rounded-3xl border-white border-solid max-md:max-w-full max-md:px-5 items-end">
        <div className="flex items-center gap-2 text-neutral-50 font-normal">
          <div className="bg-zinc-800 border-zinc-800 border self-stretch flex min-w-16 items-center overflow-hidden justify-center my-auto opacity-80 px-4 py-1.5 rounded-md border-solid transition-all duration-300 group-hover:opacity-50 hover:!opacity-100">
            {balance ? parseFloat(formatEther(balance)).toFixed(4) : "0.0000"}{" "}
            MON
          </div>
          <WalletButton />
        </div>
      </div>
    </div>
  );
}
