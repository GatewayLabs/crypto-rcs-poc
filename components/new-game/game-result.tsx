import { Move } from "@/lib/crypto";

const MOVE_IMAGES = {
  ROCK: "/icons/rock-result.png",
  PAPER: "/icons/paper-result.png",
  SCISSORS: "/icons/scissors-result.png",
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

interface GameResultProps {
  playerMove: Move;
  houseMove: Move;
  result: "WIN" | "LOSE" | "DRAW";
  gameId: string;
  onPlayAgain: () => void;
}

export default function GameResult({
  playerMove,
  houseMove,
  result,
  gameId,
  onPlayAgain,
}: GameResultProps) {
  // Color schemes based on result
  const colorSchemes = {
    player:
      result === "DRAW"
        ? {
            bg: "bg-[#FD9800]",
            border: "border-[#FD9800]",
            text: "text-[#FD9800]",
            hover:
              "transition-all duration-300 hover:shadow-[0_0_30px_rgba(253,152,0,0.5)] hover:-translate-y-2 group-hover:opacity-50 hover:!opacity-100 hover:scale-[1.02]",
          }
        : {
            bg: "bg-[#AEF342]",
            border: "border-[#AEF342]",
            text: "text-[#AEF342]",
            hover:
              "transition-all duration-300 hover:shadow-[0_0_30px_rgba(174,243,66,0.5)] hover:-translate-y-2 group-hover:opacity-50 hover:!opacity-100 hover:scale-[1.02]",
          },
    house:
      result === "DRAW"
        ? {
            bg: "bg-[#FD9800]",
            border: "border-[#FD9800]",
            text: "text-[#FD9800]",
            hover:
              "transition-all duration-300 hover:shadow-[0_0_30px_rgba(253,152,0,0.5)] hover:-translate-y-2 group-hover:opacity-50 hover:!opacity-100 hover:scale-[1.02]",
          }
        : {
            bg: "bg-[#FF666B]",
            border: "border-[#FF666B]",
            text: "text-[#FF666B]",
            hover:
              "transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,102,107,0.5)] hover:-translate-y-2 group-hover:opacity-50 hover:!opacity-100 hover:scale-[1.02]",
          },
  };

  return (
    <div className="max-md:max-w-full">
      <style>{customStyles}</style>
      <div className="flex flex-col items-center px-6 py-8 font-mono">
        {/* Game ID and Result */}
        <div className="w-full flex justify-between items-center text-zinc-400 mb-2">
          <span>Game #{gameId}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onPlayAgain}
              className="flex items-center gap-2 text-sm bg-white text-black px-4 py-2 rounded-sm"
            >
              <img src="/icons/reload.svg" alt="Reload" className="w-4 h-4" />
              Play again
            </button>
          </div>
        </div>

        {/* Result Text */}
        <h1
          className={`text-6xl font-bold self-start mb-6 ${
            result === "DRAW"
              ? "text-[#FD9800]"
              : result === "WIN"
              ? "text-[#AEF342]"
              : "text-[#FF666B]"
          }`}
        >
          {result === "WIN" && "You win!"}
          {result === "LOSE" && "You lose!"}
          {result === "DRAW" && "It's a draw!"}
        </h1>

        {/* Game Cards */}
        <div className="flex items-center gap-16 font-mono group">
          {/* Player Move */}
          <div
            className="relative flex-1"
            style={{ animation: "slideInFromLeft 0.6s ease-out forwards" }}
          >
            <div
              className={`min-h-[356px] w-full ${colorSchemes.player.bg} bg-opacity-10 rounded-lg border ${colorSchemes.player.border} p-6 flex flex-col items-center ${colorSchemes.player.hover}`}
            >
              <img
                loading="lazy"
                srcSet={MOVE_IMAGES[playerMove]}
                className="aspect-[1.27] object-contain w-[162px] flex-grow transition-transform duration-300 group-hover:scale-95 hover:!scale-100"
                alt={playerMove}
              />
              <div className="flex flex-col items-center gap-1 mt-4">
                <div
                  className={`text-xl uppercase tracking-wider opacity-60 ${colorSchemes.player.text}`}
                >
                  YOUR MOVE
                </div>
                <div
                  className={`text-2xl font-normal leading-none text-center uppercase ${colorSchemes.player.text}`}
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
            className="w-10 h-10"
            style={{ animation: "growIn 0.4s ease-out 0.3s both" }}
          />

          {/* House Move */}
          <div
            className="relative flex-1"
            style={{ animation: "slideInFromRight 0.6s ease-out forwards" }}
          >
            <div
              className={`min-h-[356px] w-full ${colorSchemes.house.bg} bg-opacity-10 rounded-lg border ${colorSchemes.house.border} p-6 flex flex-col items-center ${colorSchemes.house.hover}`}
            >
              <img
                loading="lazy"
                srcSet={MOVE_IMAGES[houseMove]}
                className="aspect-[1.27] object-contain w-[162px] flex-grow transition-transform duration-300 group-hover:scale-95 hover:!scale-100"
                alt={houseMove}
              />
              <div className="flex flex-col items-center gap-1 mt-4">
                <div
                  className={`text-xl uppercase tracking-wider opacity-60 ${colorSchemes.house.text}`}
                >
                  HOUSE MOVE
                </div>
                <div
                  className={`text-2xl font-normal leading-none text-center uppercase ${colorSchemes.house.text}`}
                >
                  {houseMove}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
