'use client';

import { useWallet } from '@/contexts/wallet-context';
import Image from 'next/image';
import BalanceButton from './balance-button';
import WalletButton from './wallet-button';

export default function Header() {
  const { walletAddress } = useWallet();

  return (
    <>
      <div className="bg-white flex w-full items-center justify-between flex-wrap rounded-3xl max-md:max-w-full">
        <div className="bg-zinc-950 self-stretch flex flex-col items-center justify-center w-[172px] px-6 py-2 rounded-3xl max-md:px-5 h-auto border-b border-white">
          <Image src="/logo.svg" alt="Game Logo" width={118} height={61} />
        </div>
        <div className="bg-zinc-950 border-b border-l self-stretch flex min-w-60 flex-col overflow-hidden justify-center flex-1 shrink basis-[0%] my-auto px-6 py-7 rounded-3xl border-white border-solid max-md:max-w-full max-md:px-5 items-end">
          <div className="flex items-center gap-2 text-neutral-50 font-normal">
            {walletAddress && <BalanceButton />}
            <WalletButton />
          </div>
        </div>
      </div>
    </>
  );
}
