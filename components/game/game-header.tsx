'use client';

import { formatEther } from 'ethers';
import { useEffect, useState } from 'react';
import { useBalance } from 'wagmi';
import WalletButton from './wallet-button';
import Modal from './modal';
import WithdrawModal from './withdraw-modal';
import { usePrivy } from '@privy-io/react-auth';
export default function Header() {
  const { user, authenticated } = usePrivy();
  const { data: userBalance, isLoading } = useBalance({
    address: user?.wallet?.address as `0x${string}`,
  });
  const [balance, setBalance] = useState<bigint | undefined>(BigInt(0));
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  useEffect(() => {
    if (!authenticated || isLoading) {
      return;
    }
    setBalance(userBalance?.value);
  }, [authenticated, userBalance, isLoading]);

  return (
    <>
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
            <div className="bg-zinc-800 border-zinc-800 border self-stretch flex min-w-16 items-center overflow-hidden justify-center my-auto pl-3 py-2 rounded-md border-solid transition-all duration-300">
              {balance ? parseFloat(formatEther(balance)).toFixed(4) : '0.0000'}{' '}
              MON
              <div className="ml-3">
                {balance && authenticated && (
                  <button
                    data-modal-target="crud-modal"
                    data-modal-toggle="crud-modal"
                    className="bg-zinc-600 border-zinc-700 border self-stretch flex items-center overflow-hidden justify-center my-auto opacity-80 mr-1.5 px-2 py-1 rounded-md border-solid transition-all duration-300 hover:border-[rgba(141,12,255,1)] group-hover:opacity-50 hover:!opacity-100"
                    type="button"
                    onClick={() => setIsWithdrawModalOpen(true)}
                  >
                    Withdraw
                  </button>
                )}
              </div>
              {isWithdrawModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 linear hover:!opacity-100">
                  <div
                    className="fixed inset-0 bg-black opacity-50"
                    onClick={() => setIsWithdrawModalOpen(false)}
                  ></div>
                  <div className="z-10 animate-fadeIn">
                    <Modal
                      onClose={() => setIsWithdrawModalOpen(false)}
                      title="Withdraw your earnings"
                      smallTitle="withdraw"
                    >
                      <WithdrawModal
                        onClose={() => setIsWithdrawModalOpen(false)}
                      />
                    </Modal>
                  </div>
                </div>
              )}
            </div>
            <WalletButton />
          </div>
        </div>
      </div>
    </>
  );
}
