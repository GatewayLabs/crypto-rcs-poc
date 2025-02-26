import { Dispatch, SetStateAction } from "react";

interface GameBetProps {
  onBet: Dispatch<SetStateAction<number>>;
  value: number;
  maxValue: number;
}

export default function GameBet({ onBet, value, maxValue }: GameBetProps) {
  return (
    <div className="border flex flex-col sm:flex-row px-4 py-4 mt-4 rounded-lg border-zinc-700 justify-between items-center gap-4">
      <div className="flex flex-grow-1">
        <input
          className="bg-transparent border-transparent text-[rgb(255,255,255)] text-md font-normal leading-none text-center uppercase flex-grow-0 w-32"
          type="number"
          placeholder="0"
          value={value}
          onChange={(e) => {
            if (Number(e.target.value) > maxValue) {
              onBet(maxValue);
              return;
            }
            onBet(Number(e.target.value) || 0);
          }}
        />
        <div className="bg-zinc-950 overflow-hidden opacity-50 flex-grow-1">
          MON
        </div>
      </div>
      <div className="flex gap-4">
        <button
          onClick={() => onBet(0.1)}
          className="bg-zinc-950 border-zinc-700 border self-stretch flex min-w-16 items-center overflow-hidden justify-center my-auto opacity-80 px-4 py-1.5 rounded-md border-solid transition-all duration-300 hover:border-[rgba(141,12,255,1)] group-hover:opacity-50 hover:!opacity-100"
        >
          0.1 MON
        </button>
        <button
          onClick={() => onBet(1)}
          className="bg-zinc-950 border-zinc-700 border self-stretch flex min-w-16 items-center overflow-hidden justify-center my-auto opacity-80 px-4 py-1.5 rounded-md border-solid transition-all duration-300 hover:border-[rgba(141,12,255,1)] group-hover:opacity-50 hover:!opacity-100"
        >
          1 MON
        </button>
        <button
          onClick={() => onBet(maxValue)}
          className="bg-zinc-700 border-zinc-700 border self-stretch flex min-w-16 items-center overflow-hidden justify-center my-auto opacity-80 px-4 py-1.5 rounded-md border-solid transition-all duration-300 group-hover:opacity-50 hover:!opacity-100"
        >
          Max
        </button>
      </div>
    </div>
  );
}
