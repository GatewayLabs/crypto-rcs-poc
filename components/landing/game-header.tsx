"use client";

import React from "react";

export default function GameHeader() {
  return (
    <div
      className="bg-zinc-950 border self-stretch relative flex min-w-60 min-h-56 flex-col justify-center w-[461px] my-auto px-12 py-[47px] rounded-3xl border-white border-solid max-md:max-w-full max-md:px-5"
      role="banner"
    >
      <img
        loading="lazy"
        src="https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/979acf298c5e69a83991487ab2578eadcba2d2bee0ed8aacda3bdf6aef4f2176?placeholderIfAbsent=true"
        className="aspect-[2.81] object-contain w-[365px] self-center z-0 max-w-full"
        alt="Game logo"
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
