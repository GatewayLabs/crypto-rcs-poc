"use client";

import { useLeaderboard } from "@/hooks/use-leaderboard";

export default function Leaderboard() {
  const { leaderboard } = useLeaderboard();

  const sortedLeaderboard = [...leaderboard].sort((a, b) => b.score - a.score);

  return (
    <div className="bg-zinc-950 border-l px-6 py-8 rounded-3xl border-white border-solid max-md:max-w-full max-md:px-5 flex flex-col">
      <div className="text-white text-2xl font-bold leading-none max-md:max-w-full">
        Leaderboard
      </div>
      <div className="w-full mt-8 max-md:max-w-full max-md:mt-10 flex flex-col flex-grow">
        <div className="flex-grow">
          <div className="border-zinc-700 border w-full overflow-hidden rounded-lg border-solid max-md:max-w-full">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-zinc-700 border-b">
                  <th className="text-zinc-400 text-sm font-normal leading-6 text-left px-4 py-3 w-20">
                    Rank
                  </th>
                  <th className="text-zinc-400 text-sm font-normal leading-6 text-left px-4 py-3">
                    Player
                  </th>
                  <th className="text-zinc-400 text-sm font-normal leading-6 text-left px-4 py-3 w-[90px]">
                    Score
                  </th>
                  <th className="text-zinc-400 text-sm font-normal leading-6 text-left px-4 py-3 w-[169px]">
                    <div className="flex items-center gap-2">
                      <span>W/L/D</span>
                      <img
                        loading="lazy"
                        src="https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/ec91eb3a85b7df1473a6bcef7fec44754c41379594879f16c2297377b3599fad?placeholderIfAbsent=true"
                        className="aspect-[1] object-contain w-4"
                        alt="Sort"
                      />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedLeaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-4 text-zinc-400">
                      No players yet
                    </td>
                  </tr>
                ) : (
                  sortedLeaderboard.map((player, index) => (
                    <tr
                      key={player.address}
                      className="bg-[rgba(39,39,42,0.4)]"
                    >
                      <td className="px-4 min-h-14">
                        <div className="flex items-center h-14">
                          <div
                            className={`text-xs font-normal whitespace-nowrap leading-none px-2.5 py-0.5 rounded-full ${
                              index === 0
                                ? "bg-yellow-400 text-zinc-900"
                                : index === 1
                                ? "bg-gray-400 text-zinc-900"
                                : index === 2
                                ? "bg-amber-600 text-zinc-900"
                                : "bg-zinc-700 text-zinc-300"
                            }`}
                          >
                            {index + 1}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 min-h-14">
                        <div className="flex items-center h-14">
                          <div className="text-neutral-50 text-sm font-normal leading-none">
                            {player.address.slice(0, 6)}...
                            {player.address.slice(-4)}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 min-h-14 w-[90px]">
                        <div className="flex items-center h-14">
                          <div
                            className={`text-sm font-normal leading-none ${
                              player.score > 0
                                ? "text-[rgba(174,243,66,1)]"
                                : player.score < 0
                                ? "text-red-500"
                                : "text-neutral-50"
                            }`}
                          >
                            {player.score > 0 ? "+" : ""}
                            {player.score}xp
                          </div>
                        </div>
                      </td>
                      <td className="px-4 min-h-14 w-[169px]">
                        <div className="flex items-center h-14">
                          <div className="text-neutral-50 text-sm font-normal leading-none">
                            <span className="text-[rgba(174,243,66,1)]">
                              {player.wins}
                            </span>
                            {" / "}
                            <span className="text-red-500">
                              {player.losses}
                            </span>
                            {" / "}
                            <span className="text-yellow-500">
                              {player.draws}
                            </span>
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
        <div className="flex w-full items-center gap-[40px_100px] text-sm leading-6 justify-between flex-wrap pt-4 max-md:max-w-full">
          <div className="text-[color:var(--muted-foreground)] font-normal self-stretch my-auto">
            Showing {sortedLeaderboard.length} of {sortedLeaderboard.length}{" "}
            row(s)
          </div>
          <div className="self-stretch flex items-center gap-2 text-[color:var(--primary)] font-medium whitespace-nowrap my-auto pl-2">
            <button
              disabled
              className="bg-zinc-950 border-zinc-700 border self-stretch flex min-w-16 items-center overflow-hidden justify-center my-auto px-2 py-1.5 rounded-md border-solid opacity-50"
            >
              <div className="self-stretch my-auto px-1">Previous</div>
            </button>
            <button
              disabled
              className="bg-zinc-950 border-zinc-700 border self-stretch flex min-w-16 items-center overflow-hidden justify-center my-auto px-2 py-1.5 rounded-md border-solid opacity-50"
            >
              <div className="self-stretch my-auto px-1">Next</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
