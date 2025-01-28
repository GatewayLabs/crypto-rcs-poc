import { ButtonHTMLAttributes } from "react";

interface GameButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  imageSrc: string;
  label: string;
}

export default function GameButton({
  imageSrc,
  label,
  ...props
}: GameButtonProps) {
  return (
    <button
      className="bg-[rgba(20,9,31,1)] border self-stretch min-h-[356px] flex-1 shrink basis-[0%] my-auto px-8 py-10 rounded-lg border-[rgba(141,12,255,1)] border-solid max-md:px-5 flex flex-col justify-between items-center transition-all duration-300 hover:shadow-[0_0_30px_rgba(141,12,255,0.5)] hover:-translate-y-2 hover:border-[rgba(141,12,255,1)] group-hover:opacity-50 hover:!opacity-100 hover:scale-[1.02]"
      {...props}
    >
      <img
        loading="lazy"
        srcSet={imageSrc}
        className="aspect-[1.27] object-contain w-[162px] flex-grow transition-transform duration-300 group-hover:scale-95 hover:!scale-100"
        alt={label}
      />
      <div className="text-[rgba(141,12,255,1)] text-2xl font-normal leading-none text-center uppercase">
        {label}
      </div>
    </button>
  );
}
