import { useGameUIStore } from '@/stores/game-ui-store';
import { Dispatch, SetStateAction, useEffect } from 'react';

interface GameBetProps {
  onBet: Dispatch<SetStateAction<number>>;
  value: number;
  errorMessage: string | null;
}

export default function GameBet({ onBet, value, errorMessage }: GameBetProps) {
  const { setBetValue } = useGameUIStore();

  useEffect(() => {
    if (value > 0) {
      setBetValue(BigInt(value * 10 ** 18));
    } else {
      setBetValue(null);
    }
  }, [value, setBetValue]);

  return (
    <>
      <div
        className={`border flex flex-col sm:flex-row px-4 py-4 mt-4 rounded-lg ${
          errorMessage ? 'border-red-500' : 'border-zinc-700'
        } justify-between items-start md:items-center gap-4`}
      >
        <div className="flex md:flex-grow-1">
          <input
            className="bg-transparent border-transparent  outline-none text-white focus:transparent focus:border-transparent text-md font-normal leading-none text-center uppercase flex-grow-0 w-32 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            type="number"
            placeholder="0"
            value={value}
            onChange={(e) => onBet(Number(e.target.value) || 0)}
          />
          <div className="bg-zinc-950 overflow-hidden opacity-50 flex-grow-1">
            MON
          </div>
        </div>
        <div className="flex gap-4 max-sm:w-full">
          {[0.1, 0.5, 1, 5].map((amount) => (
            <button
              key={amount}
              onClick={() => onBet(amount)}
              className={`bg-zinc-950 self-stretch flex items-center overflow-hidden justify-center w-full opacity-80 px-4 py-1.5 border rounded-md border-solid transition-all duration-300  ${
                value === amount
                  ? 'border-[rgba(141,12,255,1)] group-hover:opacity-50 hover:!opacity-100'
                  : 'border-zinc-700 hover:border-[rgba(141,12,255,1)] group-hover:opacity-50 hover:!opacity-100'
              }`}
            >
              {amount} <span className="hidden sm:block"> MON</span>
            </button>
          ))}
        </div>
      </div>
      {errorMessage && (
        <div className="text-red-500 text-sm mt-2">{errorMessage}</div>
      )}
    </>
  );
}
