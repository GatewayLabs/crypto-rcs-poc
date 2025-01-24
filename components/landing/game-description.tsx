import React from "react";
import { PlayButton } from "./play-button";

export const GameDescription: React.FC = () => {
  return (
    <div className="bg-zinc-950 border self-stretch flex min-w-60 min-h-56 items-center gap-[34px] overflow-hidden text-sm font-normal leading-6 flex-wrap flex-1 shrink basis-12 my-auto p-6 rounded-3xl border-white border-solid max-md:max-w-full max-md:px-5">
      <img
        loading="lazy"
        src="https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/3ceac16c5b7208b3e28e9010e41f7e4463cc21d04b8dad842a69050081ed94a2?placeholderIfAbsent=true"
        className="aspect-[1.01] object-contain w-44 self-stretch shrink-0 my-auto"
        alt="Game illustration"
      />
      <p className="text-white self-stretch flex-1 shrink basis-6 my-auto max-md:max-w-full">
        Rock On-chain is a decentralized rock-paper-scissors game built on the
        Gateway Testnet, offering a secure, transparent, and tamper-proof gaming
        experience. Each match is registered and encrypted on-chain, ensuring
        fair play and a permanent record of your victories.
      </p>
      <PlayButton />
    </div>
  );
};
