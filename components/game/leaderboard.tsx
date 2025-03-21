"use client";

import { useLeaderboard } from "@/hooks/use-leaderboard";
import { useGameUIStore } from "@/stores/game-ui-store";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import Tooltip from "../ui/tooltip";

export default function Leaderboard() {
  const { address } = useAccount();
  const { leaderboard } = useLeaderboard(address as string);
  const { setPlayerRank, setPlayerSummary } = useGameUIStore();
  const [currentPage, setCurrentPage] = useState(1);
  const [playerIndex, setPlayerIndex] = useState(0);

  const rowsPerPage = 20;
  const sortedLeaderboard = leaderboard.players.sort((a, b) => {
    if ("earnings" in a && "earnings" in b) {
      return (b.earnings ?? 0) - (a.earnings ?? 0);
    }
    return b.score - a.score;
  });

  const totalPages = Math.ceil(sortedLeaderboard.length / rowsPerPage);

  // Get current page data
  const indexOfLastPlayer = currentPage * rowsPerPage;
  const indexOfFirstPlayer = indexOfLastPlayer - rowsPerPage;
  const currentPlayers = sortedLeaderboard.slice(
    indexOfFirstPlayer,
    indexOfLastPlayer
  );

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

  useEffect(() => {
    if (
      !Array.isArray(leaderboard.players) ||
      leaderboard.players.length === 0 ||
      !address
    ) {
      return;
    }

    const sorted = [...leaderboard.players].sort((a, b) => {
      // Use earnings if available, otherwise fall back to score
      if ("earnings" in a && "earnings" in b) {
        return (b.earnings ?? 0) - (a.earnings ?? 0);
      }
      return b.score - a.score;
    });

    const player = sorted.findIndex(
      (player) => player.address.toLowerCase() === address.toLowerCase()
    );

    setPlayerIndex(player);

    const playerSummary = playerIndex !== -1 ? sorted[playerIndex] : null;

    setPlayerRank(playerIndex !== -1 ? playerIndex + 1 : 0);
    setPlayerSummary(playerSummary);
  }, [address, leaderboard, setPlayerRank, setPlayerSummary, playerIndex]);

  return (
    <div className="bg-zinc-950 border-l px-6 py-8 rounded-3xl border-white border-solid max-md:max-w-full max-md:px-5 flex flex-col">
      <div className="text-white text-2xl font-bold leading-none max-md:max-w-full">
        Leaderboard
      </div>
      <div className="w-full mt-8 max-md:max-w-full max-md:mt-10 flex flex-col flex-grow">
        <div className="flex-grow">
          <div className="border-zinc-700 border w-full rounded-lg border-solid max-md:max-w-full">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-zinc-700 border-b">
                  <th className="text-zinc-400 text-sm font-normal leading-6 text-left px-4 py-3 w-20">
                    Rank
                  </th>
                  <th className="text-zinc-400 text-sm font-normal leading-6 text-left px-4 py-3">
                    Player
                  </th>
                  <th className="text-zinc-400 text-sm font-normal leading-6 text-left px-4 py-3 w-[150px] flex items-center">
                    <span className="mr-2">PnL ($MON)</span>
                    <Tooltip
                      text="Your PnL balance may become out of date due to the
                blockchain's response time. Check the status indicator for matches waiting for blockchain confirmation."
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedLeaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-4 text-zinc-400">
                      No players yet
                    </td>
                  </tr>
                ) : (
                  currentPlayers.map((player, index) => (
                    <tr
                      key={player.address}
                      className={`border-t border-zinc-700 border-solid ${
                        indexOfFirstPlayer + index >= 0 &&
                        indexOfFirstPlayer + index <= 2
                          ? "bg-[rgba(39,39,42,0.4)]"
                          : playerIndex === indexOfFirstPlayer + index
                          ? "bg-[rgba(255,255,255,0.16)]"
                          : ""
                      }`}
                    >
                      <td className="px-4 min-h-14">
                        <div className="flex items-center h-14">
                          <div
                            className={`text-xs font-normal whitespace-nowrap leading-none px-2.5 py-0.5 rounded-full ${
                              indexOfFirstPlayer + index === 0
                                ? "bg-yellow-400 text-zinc-900"
                                : indexOfFirstPlayer + index === 1
                                ? "bg-gray-400 text-zinc-900"
                                : indexOfFirstPlayer + index === 2
                                ? "bg-amber-600 text-zinc-900"
                                : indexOfFirstPlayer + index >= 3 &&
                                  indexOfFirstPlayer + index <= 9
                                ? "bg-purple-700 text-zinc-300"
                                : "bg-zinc-800 text-zinc-300"
                            }`}
                          >
                            #{indexOfFirstPlayer + index + 1}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 min-h-14">
                        <div className="flex items-center h-14">
                          <div className="text-neutral-50 text-sm font-normal leading-none">
                            {player.address.slice(0, 6)}...
                            {player.address.slice(-4)}
                            {playerIndex === indexOfFirstPlayer + index && (
                              <span className="text-xs font-normal leading-none px-2.5 py-0.5 rounded-full bg-white text-black ml-2">
                                You
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 min-h-14 w-[150px]">
                        <div className="flex items-center h-14">
                          <div className="text-sm font-normal leading-none">
                            {"earnings" in player
                              ? (player.earnings ?? 0).toFixed(2)
                              : (player.score > 0 ? "+" : "") +
                                player.score.toString()}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex w-full items-center gap-[40px_100px] text-sm leading-6 justify-between flex-wrap pt-4 max-md:max-w-full min-w-full">
          <div className="text-[color:var(--muted-foreground)] font-normal self-stretch my-auto">
            Showing{" "}
            {currentPlayers.length > 0
              ? `${indexOfFirstPlayer + 1}-${Math.min(
                  indexOfLastPlayer,
                  sortedLeaderboard.length
                )}`
              : "0"}{" "}
            of {sortedLeaderboard.length} row(s)
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
        {leaderboard.globalStats.totalPlayers > 0 && (
          <div className="flex w-full items-center text-sm leading-6 mt-4 flex-wrap pt-4 gap-6 border-t border-zinc-700 border-solid max-md:max-w-full">
            <div className="text-[color:var(--muted-foreground)] font-normal self-stretch my-auto">
              Players: {leaderboard.globalStats.totalPlayers}
            </div>
            <div className="text-[color:var(--muted-foreground)] font-normal self-stretch my-auto">
              Games: {leaderboard.globalStats.totalGamesCreated}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
