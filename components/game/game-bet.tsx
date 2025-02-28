import { Dispatch, SetStateAction, useState } from "react";

interface GameBetProps {
  onBet: Dispatch<SetStateAction<number>>;
  value: number;
  balance: number;
}

export default function GameBet({ onBet, value, balance }: GameBetProps) {
  const [limitReached, setLimitReached] = useState(false);

  const betHandler = (value: number) => {
    if (balance < value) {
      setLimitReached(true);
    } else {
      setLimitReached(false);
    }
    onBet(value);
  };

  return (
    <>
      <div
        className={`border flex flex-col sm:flex-row px-4 py-4 mt-4 rounded-lg ${
          limitReached || value === 0 ? "border-red-500" : "border-zinc-700"
        } justify-between items-center gap-4`}
      >
        <div className="flex flex-grow-1">
          <input
            className="bg-transparent border-transparent text-[rgb(255,255,255)] text-md font-normal leading-none text-center uppercase flex-grow-0 w-32"
            type="number"
            placeholder="0"
            value={value}
            onChange={(e) => betHandler(Number(e.target.value) || 0)}
          />
          <div className="bg-zinc-950 overflow-hidden opacity-50 flex-grow-1">
            MON
          </div>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => betHandler(0.1)}
            className="bg-zinc-950 border-zinc-700 border self-stretch flex min-w-16 items-center overflow-hidden justify-center my-auto opacity-80 px-4 py-1.5 rounded-md border-solid transition-all duration-300 hover:border-[rgba(141,12,255,1)] group-hover:opacity-50 hover:!opacity-100"
          >
            0.1 MON
          </button>
          <button
            onClick={() => betHandler(0.25)}
            className="bg-zinc-950 border-zinc-700 border self-stretch flex min-w-16 items-center overflow-hidden justify-center my-auto opacity-80 px-4 py-1.5 rounded-md border-solid transition-all duration-300 hover:border-[rgba(141,12,255,1)] group-hover:opacity-50 hover:!opacity-100"
          >
            0.25 MON
          </button>
          <button
            onClick={() => betHandler(0.5)}
            className="bg-zinc-950 border-zinc-700 border self-stretch flex min-w-16 items-center overflow-hidden justify-center my-auto opacity-80 px-4 py-1.5 rounded-md border-solid transition-all duration-300 hover:border-[rgba(141,12,255,1)] group-hover:opacity-50 hover:!opacity-100"
          >
            0.5 MON
          </button>
          <button
            onClick={() => betHandler(1)}
            className="bg-zinc-950 border-zinc-700 border self-stretch flex min-w-16 items-center overflow-hidden justify-center my-auto opacity-80 px-4 py-1.5 rounded-md border-solid transition-all duration-300 hover:border-[rgba(141,12,255,1)] group-hover:opacity-50 hover:!opacity-100"
          >
            1 MON
          </button>
        </div>
      </div>
      {limitReached && (
        <div className="text-red-500 text-sm mt-2">
          Max limit is {balance.toFixed(4)} MON
        </div>
      )}
      {value === 0 && (
        <div className="text-red-500 text-sm mt-2">
          Please enter a bet amount
        </div>
      )}
    </>
  );
}
