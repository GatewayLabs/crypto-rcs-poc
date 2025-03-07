"use client";

import Link from "next/link";
import React from "react";

export default function PlayButton() {
  return (
    <Link href="/play" className="max-lg:w-full">
      <button
        className="bg-[#8D0CFF] w-full lg:w-[171px] lg:h-[174px] flex items-center justify-center gap-2 p-4 lg:py-0 lg:flex-col rounded-md hover:opacity-90 transition-opacity text-white"
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
}
