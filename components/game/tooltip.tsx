"use client";

interface TooltipProps {
  text: string;
}

export default function Tooltip({ text }: TooltipProps) {
  return (
    <div className="group relative">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4 text-zinc-400 cursor-help"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-zinc-800 text-white text-xs p-2 rounded w-48 z-10">
        {text}
      </div>
    </div>
  );
}
