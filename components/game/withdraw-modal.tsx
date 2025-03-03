"use client";

import { useState } from "react";

interface WithdrawModalProps {
  onWithdraw: (amount: number) => void;
}

export default function WithdrawModal({ onWithdraw }: WithdrawModalProps) {
  const [value, setValue] = useState(1);

  return (
    <>
      <div className="flex flex-col bg-zinc-800 border-zinc-600 border flex rounded-sm mb-6">
        <div className="flex flex-col sm:flex-row">
          <input
            id="withdraw-amount"
            type="number"
            placeholder="0.00"
            className="w-60 p-4 bg-zinc-800 border border-transparent rounded-lg text-7xl outline-none text-white focus:transparent focus:border-transparent transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
          />
          <div className="flex items-center pr-4 pointer-events-none">
            <span className="opacity-20 text-7xl">MON</span>
          </div>
        </div>
        <div className="flex gap-1 px-4 mb-6">
          <button
            onClick={() => setValue(0.1)}
            className="bg-zinc-800 border-zinc-600 border self-stretch flex min-w-16 items-center overflow-hidden justify-center my-auto opacity-80 px-2 py-1.5 rounded-sm border-solid transition-all duration-300 hover:border-[rgba(141,12,255,1)] group-hover:opacity-50 hover:!opacity-100"
          >
            0.1 MON
          </button>
          <button
            onClick={() => setValue(0.25)}
            className="bg-zinc-800 border-zinc-600 border self-stretch flex min-w-16 items-center overflow-hidden justify-center my-auto opacity-80 px-2 py-1.5 rounded-sm border-solid transition-all duration-300 hover:border-[rgba(141,12,255,1)] group-hover:opacity-50 hover:!opacity-100"
          >
            0.25 MON
          </button>
          <button
            onClick={() => setValue(0.5)}
            className="bg-zinc-800 border-zinc-600 border self-stretch flex min-w-16 items-center overflow-hidden justify-center my-auto opacity-80 px-2 py-1.5 rounded-sm border-solid transition-all duration-300 hover:border-[rgba(141,12,255,1)] group-hover:opacity-50 hover:!opacity-100"
          >
            0.5 MON
          </button>
          <button
            onClick={() => setValue(1)}
            className="bg-zinc-800 border-zinc-600 border self-stretch flex min-w-16 items-center overflow-hidden justify-center my-auto opacity-80 px-2 py-1.5 rounded-sm border-solid transition-all duration-300 hover:border-[rgba(141,12,255,1)] group-hover:opacity-50 hover:!opacity-100"
          >
            1 MON
          </button>
        </div>
      </div>

      <button
        onClick={() => onWithdraw(value)}
        disabled={!value}
        className="w-full py-4 px-6 bg-white text-black hover:bg-purple-600 hover:text-white disabled:bg-purple-900 disabled:text-purple-300 font-medium rounded-sm transition-colors flex items-center justify-center"
      >
        Withdraw now
      </button>
    </>
  );
}
