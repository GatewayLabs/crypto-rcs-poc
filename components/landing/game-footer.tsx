import React from "react";

export const GameFooter: React.FC = () => {
  return (
    <footer className="relative flex w-full items-start text-[11px] text-white font-normal text-center leading-6 justify-between mt-9 max-md:max-w-full">
      <img
        loading="lazy"
        src="https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/cb29a7423095b099cf92a73984c264e50cb2ba10c93136df00ac0159fb954154?placeholderIfAbsent=true"
        className="aspect-[11.11] object-contain w-[355px] z-0 min-w-60 my-auto"
        alt="Footer logo"
      />
      <div className="absolute z-0 -translate-x-2/4 translate-y-[0%] w-[386px] h-6 left-2/4 bottom-1">
        Built on the first L1 to unify public and private state
      </div>
    </footer>
  );
};
