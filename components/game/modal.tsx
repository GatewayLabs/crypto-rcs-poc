"use client";
import { useEffect } from "react";

interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
  title: string;
  smallTitle?: string;
}

export default function Modal({
  onClose,
  children,
  title,
  smallTitle,
}: ModalProps) {
  useEffect(() => {
    document.body.classList.add("overflow-hidden");
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="relative w-full max-w-2xl p-6 mx-4 animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-hidden bg-zinc-900 rounded-xl border border-zinc-700/50 shadow-xl">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                {smallTitle && (
                  <span className="text-xs text-zinc-400 mb-2 block">
                    {smallTitle}
                  </span>
                )}
                <h3 className="text-xl font-bold text-white">{title}</h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-zinc-800 transition-colors"
                aria-label="Close"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
