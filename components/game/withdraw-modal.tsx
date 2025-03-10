'use client';

import { useCallback, useState } from 'react';
import { isAddress } from 'viem';
import { useSendTransaction } from 'wagmi';

interface WithdrawModalProps {
  onClose: () => void;
}

export default function WithdrawModal({ onClose }: WithdrawModalProps) {
  const { sendTransaction } = useSendTransaction({
    mutation: {
      onSuccess: () => {
        onClose();
      },
      onError: (error) => {
        console.error('Error withdrawing', error);
        setErrorMessage('Error withdrawing');
        setTextButton('Withdraw now');
        setIsLoading(false);
      },
    },
  });

  const [value, setValue] = useState(1);
  const [address, setAddress] = useState<string>('');
  const [textButton, setTextButton] = useState('Withdraw now');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAddressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const address = e.target.value;
      setAddress(address);

      if (!isAddress(address.toLowerCase())) {
        setErrorMessage('Invalid address');
      } else {
        setErrorMessage(null);
      }
    },
    [address],
  );
  const handleWithdraw = async () => {
    setIsLoading(true);
    setTextButton('Confirm in wallet');

    await sendTransaction({
      to: address.toLowerCase() as `0x${string}`,
      value: BigInt(value * 10 ** 18),
    });
  };

  return (
    <>
      <div
        className={`flex-col bg-zinc-800 border flex rounded-sm ${
          errorMessage ? 'border-red-500' : 'border-zinc-600 mb-6'
        }`}
      >
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
          {[0.1, 0.25, 0.5, 1].map((amount) => (
            <button
              key={amount}
              onClick={() => setValue(amount)}
              className={`bg-zinc-800 self-stretch flex min-w-16 items-center overflow-hidden justify-center my-auto opacity-80 px-3 py-1.5 border rounded-md border-solid transition-all duration-300  ${
                value === amount
                  ? 'border-[rgba(141,12,255,1)] group-hover:opacity-50 hover:!opacity-100'
                  : 'border-zinc-600 hover:border-[rgba(141,12,255,1)] group-hover:opacity-50 hover:!opacity-100'
              }`}
            >
              {amount} MON
            </button>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div className="text-red-500 text-sm mt-4 mb-4">{errorMessage}</div>
      )}

      <div className="flex items-center pr-4 pointer-events-none mb-4">
        <span className="text-md text-white">Address</span>
      </div>

      <div
        className={`flex flex-col bg-zinc-800 border rounded-sm mb-6 border-zinc-600`}
      >
        <div className="flex flex-col sm:flex-row">
          <input
            id="withdraw-address"
            type="text"
            placeholder="0x00e0f...f2a3"
            className="w-full p-4 bg-zinc-800 border border-transparent rounded-lg text-md outline-none text-white focus:transparent focus:border-transparent transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            value={address}
            onChange={handleAddressChange}
          />
        </div>
      </div>

      <button
        onClick={() => handleWithdraw()}
        disabled={!value || !address || isLoading || !!errorMessage}
        className="w-full py-4 px-6 bg-white text-black hover:bg-zinc-100 disabled:bg-zinc-400 disabled:text-zinc-700 font-medium rounded-sm transition-colors flex items-center justify-center gap-2"
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {textButton}
      </button>
    </>
  );
}
