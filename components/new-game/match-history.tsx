"use client";

export default function MatchHistory() {
  return (
    <div className="w-full px-6 py-8 max-md:max-w-full max-md:px-5 flex flex-col flex-grow">
      <div className="text-white text-2xl font-bold leading-none tracking-[-0.6px] max-md:max-w-full">
        Matches
      </div>
      <div className="w-full mt-8 max-md:max-w-full flex flex-col flex-grow">
        <div className="flex-grow">
          <div className="border-zinc-700 border w-full overflow-hidden rounded-lg border-solid max-md:max-w-full">
            <div className="border-zinc-700 flex w-full flex-wrap border-b max-md:max-w-full">
              <div className="relative flex items-start flex-1 shrink basis-[0%] px-4 py-3">
                <div className="text-zinc-400 text-sm font-normal leading-6 z-0 flex-1 shrink basis-[0%] my-auto">
                  Timestamp
                </div>
              </div>
              <div className="relative flex items-start flex-1 shrink basis-[0%] px-4 py-3">
                <div className="text-zinc-400 text-sm font-normal leading-6 z-0 flex-1 shrink basis-[0%] my-auto">
                  Player move
                </div>
              </div>
              <div className="relative flex items-start flex-1 shrink basis-[0%] px-4 py-3">
                <div className="text-zinc-400 text-sm font-normal leading-6 z-0 flex-1 shrink basis-[0%] my-auto">
                  House move
                </div>
              </div>
              <div className="relative flex items-start w-[108px] px-4 py-3">
                <div className="text-zinc-400 text-sm font-normal leading-6 z-0 flex-1 shrink basis-[0%] my-auto">
                  Result
                </div>
              </div>
              <div className="relative flex items-start flex-1 shrink basis-[0%] px-4 py-3">
                <div className="text-zinc-400 text-sm font-normal leading-6 z-0 flex-1 shrink basis-[0%] my-auto">
                  Tx
                </div>
              </div>
            </div>
            {/* Match history rows */}
            <div className="flex w-full flex-wrap max-md:max-w-full">
              <div className="relative flex min-h-14 items-start gap-2 overflow-hidden flex-1 shrink basis-[0%] px-4">
                <div className="text-neutral-50 text-sm font-normal leading-none z-0 flex-1 shrink basis-[0%] my-auto">
                  1s ago
                </div>
              </div>
              <div className="relative flex min-h-14 items-start gap-2 overflow-hidden flex-1 shrink basis-[0%] px-4">
                <img
                  loading="lazy"
                  src="https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/7f760ca5326064867e8c736b73e7871118b443937ffb5a62a0540931501e2320?placeholderIfAbsent=true"
                  className="aspect-[1] object-contain w-6 z-0 shrink-0 my-auto"
                  alt="Player Move"
                />
              </div>
              <div className="relative flex min-h-14 items-start gap-2 overflow-hidden flex-1 shrink basis-[0%] px-4">
                <img
                  loading="lazy"
                  src="https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/82ab092aca7744805f0d1711b8babf09210656a81e0325b50d8a61f44670c673?placeholderIfAbsent=true"
                  className="aspect-[1] object-contain w-6 z-0 shrink-0 my-auto"
                  alt="House Move"
                />
              </div>
              <div className="relative flex min-h-14 items-start gap-2 overflow-hidden w-[108px] px-4">
                <div className="text-[rgba(174,243,66,1)] text-sm font-normal leading-none z-0 flex-1 shrink basis-[0%] my-auto">
                  Win
                </div>
              </div>
              <div className="relative flex min-h-14 items-center gap-2 overflow-hidden flex-1 shrink basis-[0%] px-4">
                <div className="text-neutral-50 text-sm font-normal leading-none self-stretch z-0 flex-1 shrink basis-[0%] my-auto">
                  0x8e488d3c
                </div>
                <img
                  loading="lazy"
                  src="https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/135be3ad478bd77c05cb499df1f8b80078e07244c9179330ff5182fbaca975d2?placeholderIfAbsent=true"
                  className="aspect-[1] object-contain w-6 self-stretch z-0 shrink-0 my-auto"
                  alt="Transaction"
                />
              </div>
            </div>
            {/* More match history rows would follow... */}
          </div>
        </div>
        <div className="flex w-full items-center gap-[40px_100px] text-sm leading-6 justify-between flex-wrap pt-4 max-md:max-w-full">
          <div className="text-[color:var(--muted-foreground)] font-normal self-stretch my-auto">
            Showing 1-5 of 16 row(s)
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
