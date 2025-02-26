"use client";

import { useMatches } from "@/hooks/use-matches";
import { ExternalLink } from "lucide-react";
import MatchesSummary from "./matches-summary";
import { useState } from "react";

export default function MatchHistory() {
  const { matches } = useMatches();
  const [currentPage, setCurrentPage] = useState(1);

  // Pagination settings
  const rowsPerPage = 10;
  const totalPages = Math.ceil(matches.length / rowsPerPage);

  // Get current page matches
  const indexOfLastMatch = currentPage * rowsPerPage;
  const indexOfFirstMatch = indexOfLastMatch - rowsPerPage;
  const currentMatches = matches.slice(indexOfFirstMatch, indexOfLastMatch);

  // Change page handlers
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const getExplorerUrl = (txHash: string) => {
    return `https://sepolia.basescan.org/tx/${txHash}`;
  };

  const getMoveImage = (move: "ROCK" | "PAPER" | "SCISSORS") => {
    const images = {
      ROCK: "/icons/rock.svg",
      PAPER: "/icons/paper.svg",
      SCISSORS: "/icons/scissors.svg",
    };
    return images[move];
  };

  return (
    <div className="w-full px-6 py-8 max-md:max-w-full max-md:px-5 flex flex-col flex-grow">
      <div className="text-white text-2xl font-bold leading-none tracking-[-0.6px] max-md:max-w-full">
        Your matches
      </div>

      <MatchesSummary />

      <div className="w-full mt-4 max-md:max-w-full flex flex-col flex-grow">
        <div className="flex-grow">
          <div className="border-zinc-700 border w-full overflow-hidden rounded-lg border-solid max-md:max-w-full">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-zinc-700 border-b">
                  <th className="text-zinc-400 text-sm font-normal leading-6 text-left px-4 py-3">
                    Timestamp
                  </th>
                  <th className="text-zinc-400 text-sm font-normal leading-6 text-left px-4 py-3">
                    Player move
                  </th>
                  <th className="text-zinc-400 text-sm font-normal leading-6 text-left px-4 py-3">
                    House move
                  </th>
                  <th className="text-zinc-400 text-sm font-normal leading-6 text-left px-4 py-3 w-[108px]">
                    Result
                  </th>
                  <th className="text-zinc-400 text-sm font-normal leading-6 text-left px-4 py-3">
                    Tx
                  </th>
                </tr>
              </thead>
              <tbody>
                {matches.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-zinc-400">
                      No games played yet
                    </td>
                  </tr>
                ) : (
                  currentMatches.map((game) => (
                    <tr key={game.id}>
                      <td className="px-4 min-h-14">
                        <div className="text-neutral-50 text-sm font-normal leading-none my-auto py-4">
                          {new Date(game.timestamp).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-4 min-h-14">
                        <img
                          loading="lazy"
                          src={getMoveImage(game.playerMove)}
                          className="aspect-[1] object-contain w-6 my-auto"
                          alt={`Player Move - ${game.playerMove}`}
                        />
                      </td>
                      <td className="px-4 min-h-14">
                        <img
                          loading="lazy"
                          src={getMoveImage(game.houseMove)}
                          className="aspect-[1] object-contain w-6 my-auto"
                          alt={`House Move - ${game.houseMove}`}
                        />
                      </td>
                      <td className="px-4 min-h-14 w-[108px]">
                        <div
                          className={`text-sm font-normal leading-none my-auto ${
                            game.result === "WIN"
                              ? "text-[rgba(174,243,66,1)]"
                              : game.result === "LOSE"
                              ? "text-red-500"
                              : "text-yellow-500"
                          }`}
                        >
                          {game.result}
                        </div>
                      </td>
                      <td className="px-4 min-h-14">
                        <div className="flex items-center gap-2">
                          {game.transactionHash && (
                            <a
                              href={getExplorerUrl(game.transactionHash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-neutral-50 hover:text-blue-400 transition-colors flex items-center gap-2"
                            >
                              <span className="text-sm font-normal leading-none">
                                {game.transactionHash.slice(0, 8)}
                              </span>
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex w-full items-center gap-[40px_100px] text-sm leading-6 justify-between flex-wrap pt-4 max-md:max-w-full">
          <div className="text-[color:var(--muted-foreground)] font-normal self-stretch my-auto">
            Showing{" "}
            {currentMatches.length > 0
              ? `${indexOfFirstMatch + 1}-${Math.min(
                  indexOfLastMatch,
                  matches.length
                )}`
              : "0"}{" "}
            of {matches.length} row(s)
          </div>
          <div className="self-stretch flex items-center gap-2 text-[color:var(--primary)] font-medium whitespace-nowrap my-auto pl-2">
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className={`bg-zinc-950 border-zinc-700 border self-stretch flex min-w-16 items-center overflow-hidden justify-center my-auto px-2 py-1.5 rounded-md border-solid ${
                currentPage === 1 ? "opacity-50" : "hover:bg-zinc-900"
              }`}
            >
              <div className="self-stretch my-auto px-1">Previous</div>
            </button>
            <button
              onClick={goToNextPage}
              disabled={currentPage >= totalPages}
              className={`bg-zinc-950 border-zinc-700 border self-stretch flex min-w-16 items-center overflow-hidden justify-center my-auto px-2 py-1.5 rounded-md border-solid ${
                currentPage >= totalPages ? "opacity-50" : "hover:bg-zinc-900"
              }`}
            >
              <div className="self-stretch my-auto px-1">Next</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
