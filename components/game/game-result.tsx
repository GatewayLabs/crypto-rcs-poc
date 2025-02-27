import { Move } from "@/lib/crypto";
import { GameResult } from "@/types/game";
import GameBetResult from "./game-bet-result";

const MOVE_IMAGES = {
  ROCK: {
    WIN: "/images/rock-win.png",
    LOSE: "/images/rock-loss.png",
    DRAW: "/images/rock-draw.png",
  },
  PAPER: {
    WIN: "/images/paper-win.png",
    LOSE: "/images/paper-loss.png",
    DRAW: "/images/paper-draw.png",
  },
  SCISSORS: {
    WIN: "/images/scissors-win.png",
    LOSE: "/images/scissors-loss.png",
    DRAW: "/images/scissors-draw.png",
  },
};

// Custom keyframes for animations
const customStyles = `
  @keyframes slideInFromLeft {
    0% {
      transform: translateX(-100%);
      opacity: 0;
    }
    100% {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideInFromRight {
    0% {
      transform: translateX(100%);
      opacity: 0;
    }
    100% {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes growIn {
    0% {
      transform: scale(0);
      opacity: 0;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }
`;

interface GameResultViewProps {
  playerMove: Move;
  houseMove: Move;
  result: GameResult;
  gameId: string;
  onPlayAgain: () => void;
  value: number;
}

export default function GameResultView({
  playerMove,
  houseMove,
  result,
  gameId,
  onPlayAgain,
  value,
}: GameResultViewProps) {
  // Color schemes based on result
  const colorSchemes = {
    DRAW: {
      bg: "bg-[#FD9800]",
      border: "border-[#FD9800]",
      text: "text-[#FD9800]",
      hover:
        "transition-all duration-300 hover:shadow-[0_0_30px_rgba(253,152,0,0.5)] hover:-translate-y-2 group-hover:opacity-50 hover:!opacity-100 hover:scale-[1.02]",
    },
    LOSE: {
      bg: "bg-[#FF666B]",
      border: "border-[#FF666B]",
      text: "text-[#FF666B]",
      hover:
        "transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,102,107,0.5)] hover:-translate-y-2 group-hover:opacity-50 hover:!opacity-100 hover:scale-[1.02]",
    },
    WIN: {
      bg: "bg-[#AEF342]",
      border: "border-[#AEF342]",
      text: "text-[#AEF342]",
      hover:
        "transition-all duration-300 hover:shadow-[0_0_30px_rgba(174,243,66,0.5)] hover:-translate-y-2 group-hover:opacity-50 hover:!opacity-100 hover:scale-[1.02]",
    },
  };

  const playerResult = result;
  const houseResult =
    result === GameResult.DRAW
      ? "DRAW"
      : result === GameResult.WIN
      ? "LOSE"
      : "WIN";

  return (
    <div className="max-md:max-w-full">
      <style>{customStyles}</style>
      <div className="flex flex-col items-center px-6 py-8 font-mono">
        {/* Game ID and Result */}
        <div className="w-full flex justify-between items-center text-zinc-400 mb-2">
          <span>Game #{gameId}</span>
        </div>

        {/* Result Text */}
        <h1
          className={`text-6xl max-md:text-4xl font-bold self-start mb-6 ${
            result === "DRAW"
              ? "text-[#FD9800]"
              : result === "WIN"
              ? "text-[#AEF342]"
              : "text-[#FF666B]"
          }`}
        >
          {result === GameResult.WIN && "You win!"}
          {result === GameResult.LOSE && "You lose!"}
          {result === GameResult.DRAW && "It's a draw!"}
        </h1>

        <GameBetResult gameResult={result!} value={value} />

        {/* Game Cards */}
        <div className="flex items-center gap-16 font-mono group max-md:gap-6 max-md:flex-col max-md:w-full">
          {/* Player Move */}
          <div
            className="relative flex-1 max-md:w-full"
            style={{ animation: "slideInFromLeft 0.6s ease-out forwards" }}
          >
            <div
              className={`min-h-[356px] max-md:min-h-[80px] w-full ${colorSchemes[playerResult].bg} bg-opacity-10 rounded-lg border ${colorSchemes[playerResult].border} p-6 max-md:p-6 flex flex-col max-md:flex-row items-center justify-between ${colorSchemes[playerResult].hover}`}
            >
              <img
                loading="lazy"
                srcSet={MOVE_IMAGES[playerMove][result]}
                className="aspect-[1.27] object-contain w-[162px] max-md:w-[80px] flex-grow max-md:flex-grow-0 transition-transform duration-300 group-hover:scale-95 hover:!scale-100"
                alt={playerMove}
              />
              <div className="flex flex-col items-center max-md:items-end gap-1 mt-4 max-md:mt-0 max-md:ml-4">
                <div
                  className={`text-xl uppercase tracking-wider opacity-60 ${colorSchemes[playerResult].text}`}
                >
                  YOUR MOVE
                </div>
                <div
                  className={`text-2xl font-normal leading-none text-center uppercase ${colorSchemes[playerResult].text}`}
                >
                  {playerMove}
                </div>
              </div>
            </div>
          </div>

          {/* VS Symbol */}
          <img
            src="/icons/close.svg"
            alt="Close"
            className="w-10 h-10 max-md:w-6 max-md:h-6"
            style={{ animation: "growIn 0.4s ease-out 0.3s both" }}
          />

          {/* House Move */}
          <div
            className="relative flex-1 max-md:w-full"
            style={{ animation: "slideInFromRight 0.6s ease-out forwards" }}
          >
            <div
              className={`min-h-[356px] max-md:min-h-[80px] w-full ${colorSchemes[houseResult].bg} bg-opacity-10 rounded-lg border ${colorSchemes[houseResult].border} p-6 max-md:p-6 flex flex-col max-md:flex-row items-center justify-between ${colorSchemes[houseResult].hover}`}
            >
              <img
                loading="lazy"
                srcSet={MOVE_IMAGES[houseMove][houseResult]}
                className="aspect-[1.27] object-contain w-[162px] max-md:w-[80px] flex-grow max-md:flex-grow-0 transition-transform duration-300 group-hover:scale-95 hover:!scale-100"
                alt={houseMove}
              />
              <div className="flex flex-col items-center max-md:items-end gap-1 mt-4 max-md:mt-0 max-md:ml-4">
                <div
                  className={`text-xl uppercase tracking-wider opacity-60 ${colorSchemes[houseResult].text}`}
                >
                  HOUSE MOVE
                </div>
                <div
                  className={`text-2xl font-normal leading-none text-center uppercase ${colorSchemes[houseResult].text}`}
                >
                  {houseMove}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-8 w-full max-md:w-full">
          <button
            onClick={onPlayAgain}
            className="flex items-center gap-2 text-md bg-white text-black px-4 py-4 rounded-sm w-full justify-center"
          >
            <img src="/icons/reload.svg" alt="Reload" className="w-6 h-6" />
            Play again
          </button>
        </div>
      </div>
    </div>
  );
}
