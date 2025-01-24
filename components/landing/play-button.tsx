import Link from "next/link";
import React from "react";

export const PlayButton = () => {
  return (
    <Link href="/play">
      <button
        className="bg-[rgba(141,12,255,1)] flex min-h-44 flex-col overflow-hidden items-center text-neutral-50 justify-center w-[171px] h-[174px] px-3 rounded-md hover:opacity-90 transition-opacity"
        aria-label="Play game"
      >
        <img
          loading="lazy"
          src="https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/3f8f30a968b1eededf394033db1ed75bac84312005ac3b8a4bb54fc3421f2a7f?placeholderIfAbsent=true"
          className="aspect-[1] object-contain w-10"
          alt="Play icon"
        />
        <div className="mt-1 px-1">Play now</div>
      </button>
    </Link>
  );
};
