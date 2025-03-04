import { GameResult } from '@/types/game';

interface GameBetResultProps {
  gameResult: GameResult;
  value: number;
}

export default function GameBetResult({
  gameResult,
  value,
}: GameBetResultProps) {
  const data = {
    WIN: {
      color: 'text-[#AEF342]',
      title: 'Great move!',
      message: 'You won som $MON!',
      icon: '/icons/win.svg',
      symbol: '+',
    },
    LOSE: {
      color: 'text-[#FF666B]',
      title: 'Bad move!',
      message: 'You lost your wager',
      icon: '/icons/lose.svg',
      symbol: '-',
    },
    DRAW: {
      color: 'text-[#FD9800]',
      title: 'Almost there!',
      message: 'Your wager has been refunded to your account balance',
      icon: '/icons/draw.svg',
      symbol: '',
    },
  };

  return (
    <div className="border flex flex-col sm:flex-row px-4 py-4 mb-8 rounded-lg border-zinc-700 justify-between items-center gap-4 w-full">
      <img
        src={data[gameResult].icon}
        alt={data[gameResult].title}
        className="w-6 h-6 grow-0"
      />
      <div className="flex-col flex-1">
        <div className="bg-zinc-950 overflow-hidden flex-grow-1 text-md">
          {data[gameResult].title}
        </div>
        <div className="text-zinc-400 text-sm">{data[gameResult].message}</div>
      </div>
      <div className="flex gap-4">
        <div className={`${data[gameResult].color} text-2xl`}>
          {data[gameResult].symbol}
          {value}
        </div>
        <div className={`${data[gameResult].color} text-2xl`}>MON</div>
      </div>
    </div>
  );
}
