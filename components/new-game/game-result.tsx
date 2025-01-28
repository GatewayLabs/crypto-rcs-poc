import { Move } from "@/lib/crypto";

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
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex flex-col items-center gap-6">
        {/* Game ID and Result */}
        <div className="w-full flex justify-between items-center text-zinc-400">
          <span>Game #{gameId}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onPlayAgain}
              className="flex items-center gap-2 text-sm bg-[rgba(20,9,31,1)] px-4 py-2 rounded-lg border border-[rgba(141,12,255,1)] hover:shadow-[0_0_30px_rgba(141,12,255,0.5)] transition-all duration-300"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 4V2M12 4C7.58172 4 4 7.58172 4 12M12 4C16.4183 4 20 7.58172 20 12M12 20V22M12 20C7.58172 20 4 16.4183 4 12M12 20C16.4183 20 20 16.4183 20 12M2 12H4M20 12H22"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Play again
            </button>
          </div>
        </div>

        {/* Result Text */}
        <h1 className="text-[#BFFF00] text-6xl font-bold">
          {result === "WIN" && "You win!"}
          {result === "LOSE" && "You lose!"}
          {result === "DRAW" && "It's a draw!"}
        </h1>

        {/* Game Cards */}
        <div className="flex items-center gap-16">
          {/* Player Move */}
          <div className="relative">
            <div className="w-[240px] h-[320px] bg-[#0F1F00] rounded-lg border border-[#BFFF00] p-6 flex flex-col items-center justify-between">
              <div className="text-[#BFFF00] text-sm uppercase tracking-wider">
                YOUR MOVE
              </div>
              <div className="text-[#BFFF00] text-6xl">
                {playerMove === "ROCK" && "🪨"}
                {playerMove === "PAPER" && "📜"}
                {playerMove === "SCISSORS" && "✂️"}
              </div>
              <div className="text-[#BFFF00] text-lg uppercase">
                {playerMove}
              </div>
            </div>
          </div>

          {/* VS Symbol */}
          <div className="text-2xl text-zinc-600">✕</div>

          {/* House Move */}
          <div className="relative">
            <div className="w-[240px] h-[320px] bg-[#1F0000] rounded-lg border border-[#FF0000] p-6 flex flex-col items-center justify-between">
              <div className="text-[#FF0000] text-sm uppercase tracking-wider">
                HOUSE MOVE
              </div>
              <div className="text-[#FF0000] text-6xl">
                {houseMove === "ROCK" && "🪨"}
                {houseMove === "PAPER" && "📜"}
                {houseMove === "SCISSORS" && "✂️"}
              </div>
              <div className="text-[#FF0000] text-lg uppercase">
                {houseMove}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
