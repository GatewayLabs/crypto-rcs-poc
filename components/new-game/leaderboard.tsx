"use client";

export default function Leaderboard() {
  return (
    <div className="bg-zinc-950 border-l px-6 py-8 rounded-3xl border-white border-solid max-md:max-w-full max-md:px-5 flex flex-col">
      <div className="text-white text-2xl font-bold leading-none max-md:max-w-full">
        Leaderboard
      </div>
      <div className="w-full mt-8 max-md:max-w-full max-md:mt-10 flex flex-col flex-grow">
        <div className="flex-grow">
          <div className="border-zinc-700 border w-full overflow-hidden rounded-lg border-solid max-md:max-w-full">
            <div className="border-zinc-700 flex w-full flex-wrap border-b max-md:max-w-full">
              <div className="self-stretch flex-1 shrink text-sm text-zinc-400 font-normal whitespace-nowrap leading-6 w-20 px-4 py-3">
                Rank
              </div>
              <div className="relative flex items-start flex-1 shrink basis-[0%] px-4 py-3">
                <div className="text-zinc-400 text-sm font-normal leading-6 z-0 flex-1 shrink basis-[0%] my-auto">
                  Player
                </div>
              </div>
              <div className="relative flex items-start w-[90px] px-4 py-3">
                <div className="text-zinc-400 text-sm font-normal leading-6 z-0 flex-1 shrink basis-[0%] my-auto">
                  Score
                </div>
              </div>
              <div className="relative flex items-center gap-2 w-[169px] px-4 py-3">
                <div className="text-zinc-400 text-sm font-normal leading-6 self-stretch z-0 my-auto">
                  W/L/D
                </div>
                <img
                  loading="lazy"
                  src="https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/ec91eb3a85b7df1473a6bcef7fec44754c41379594879f16c2297377b3599fad?placeholderIfAbsent=true"
                  className="aspect-[1] object-contain w-4 self-stretch z-0 shrink-0 my-auto"
                  alt="Sort"
                />
              </div>
            </div>
            {/* Leaderboard rows */}
            <div className="bg-[rgba(39,39,42,0.4)] flex w-full flex-wrap max-md:max-w-full">
              <div className="relative flex min-h-14 items-start gap-1 overflow-hidden w-20 px-4">
                <div className="self-stretch bg-yellow-400 overflow-hidden text-xs text-zinc-900 font-normal whitespace-nowrap leading-none my-auto px-2.5 py-0.5 rounded-full">
                  1
                </div>
              </div>
              <div className="relative flex min-h-14 items-start gap-2 overflow-hidden flex-1 shrink basis-[0%] px-4">
                <div className="text-neutral-50 text-sm font-normal leading-none z-0 flex-1 shrink basis-[0%] my-auto">
                  0xAD79...ED48
                </div>
              </div>
              <div className="relative flex min-h-14 items-start gap-2 overflow-hidden w-[90px] px-4">
                <div className="text-neutral-50 text-sm font-normal leading-none z-0 flex-1 shrink basis-[0%] my-auto">
                  10xp
                </div>
              </div>
              <div className="relative flex min-h-14 items-start gap-2 overflow-hidden w-[169px] px-4">
                <div className="text-neutral-50 text-sm font-normal leading-none z-0 flex-1 shrink basis-[0%] my-auto">
                  10 / 1 / 5
                </div>
              </div>
            </div>
            {/* More leaderboard rows would follow... */}
          </div>
        </div>
        <div className="flex w-full items-center gap-[40px_100px] text-sm leading-6 justify-between flex-wrap pt-4 max-md:max-w-full">
          <div className="text-[color:var(--muted-foreground)] font-normal self-stretch my-auto">
            Showing 1-14 of 100 row(s)
          </div>
          <div className="self-stretch flex items-center gap-2 text-[color:var(--primary)] font-medium whitespace-nowrap my-auto pl-2">
            <button className="bg-zinc-950 border-zinc-700 border self-stretch flex min-w-16 items-center overflow-hidden justify-center my-auto px-2 py-1.5 rounded-md border-solid">
              <div className="self-stretch my-auto px-1">Previous</div>
            </button>
            <button className="bg-zinc-950 border-zinc-700 border self-stretch flex min-w-16 items-center overflow-hidden justify-center my-auto px-2 py-1.5 rounded-md border-solid">
              <div className="self-stretch my-auto px-1">Next</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
