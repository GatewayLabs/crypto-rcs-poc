"use client";

import React from "react";
import Image from "next/image";

export default function GameHeader() {
  return (
    <div
      className="bg-zinc-950 border self-stretch relative flex min-w-60 flex-col justify-center w-full lg:w-[461px] px-6 py-8 md:px-12 md:py-[47px] rounded-3xl border-white border-solid"
      role="banner"
    >
      <Image
        src="/logo.svg"
        alt="Game logo"
        width={365}
        height={128}
        className="aspect-[2.81] object-contain w-full max-w-[365px] self-center z-0"
      />
      <img
        loading="lazy"
        src="https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/c3811dea9d34b5deddb650285f85bcc55196be8b78fe6d34d94c10deebad70ec?placeholderIfAbsent=true"
        className="aspect-[1] object-contain w-[74px] absolute z-0 left-[-17px] top-[-17px] h-[74px]"
        alt="Decorative element"
      />
    </div>
  );
}
