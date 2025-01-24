import React from "react";

export const Footer: React.FC = () => {
  return (
    <footer className="flex w-full items-center justify-between text-[11px] text-white font-normal text-center max-md:max-w-full pt-12 relative">
      <img
        loading="lazy"
        src="https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/549d6563a1bf03663851d402c1ad97b12df26832bd10fb11484d35d28b4ac94c?placeholderIfAbsent=true"
        className="aspect-[4.85] object-contain self-stretch my-auto"
        alt="Left Logo"
      />
      <p>Built on the first L1 to unify public and private state</p>
      <img
        loading="lazy"
        src="https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/e25a0c1a61fae7596153e72a3964356925d8e947f89324ff24d55bcb45524b9e?placeholderIfAbsent=true"
        className="aspect-[11.11] object-contain self-stretch my-auto"
        alt="Right Logo"
      />
    </footer>
  );
};
