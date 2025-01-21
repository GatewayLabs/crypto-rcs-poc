"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  LockKeyhole,
  Trophy,
  Dice1 as Dice,
} from "lucide-react";

export function Instructions() {
  const [isOpen, setIsOpen] = useState(false);

  const steps = [
    {
      icon: <LockKeyhole className="w-6 h-6 text-blue-400" />,
      title: "Secure Move Commitment",
      description:
        "Your move is encrypted using the Paillier cryptosystem before being sent to the blockchain, ensuring complete privacy.",
    },
    {
      icon: <Dice className="w-6 h-6 text-pink-400" />,
      title: "Fair House Play",
      description:
        "The house must commit to its move before seeing yours. Both moves are revealed simultaneously to ensure fairness.",
    },
    {
      icon: <Trophy className="w-6 h-6 text-yellow-400" />,
      title: "Verifiable Results",
      description:
        "Game results are computed and verified on-chain using zero-knowledge proofs, making it impossible to cheat.",
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto mb-8">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full px-6 py-4 rounded-lg",
          "bg-black bg-opacity-70 border border-blue-500",
          "flex items-center justify-between",
          "text-xl font-semibold text-blue-400",
          "transition-all duration-300",
          "hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-500"
        )}
      >
        <span>How to Play</span>
        {isOpen ? (
          <ChevronUp className="w-6 h-6" />
        ) : (
          <ChevronDown className="w-6 h-6" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-4 p-6 rounded-lg bg-black bg-opacity-70 border border-blue-500">
              <div className="grid gap-6 md:grid-cols-3">
                {steps.map((step, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg bg-gray-900 border border-gray-800"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      {step.icon}
                      <h3 className="text-lg font-semibold text-gray-200">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-lg bg-gray-900 border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">
                  Game Rules
                </h3>
                <ul className="text-gray-400 text-sm space-y-2">
                  <li>• Rock crushes Scissors</li>
                  <li>• Scissors cuts Paper</li>
                  <li>• Paper covers Rock</li>
                  <li>• Same moves result in a Draw</li>
                </ul>
              </div>

              <div className="mt-6 text-sm text-gray-500">
                <p>
                  All game logic is handled by a smart contract at{" "}
                  <code className="px-2 py-1 rounded bg-gray-900">
                    {process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS}
                  </code>
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
