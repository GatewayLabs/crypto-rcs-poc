"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useGame, Move } from "@/context/game-context";
import { motion, AnimatePresence } from "framer-motion";
import { Spinner } from "@/components/ui/spinner";
import { ToastContainer } from "@/components/ui/toast";
import { soundEffects } from "@/lib/sounds/sound-effects";

interface GameToast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export function GameBoard() {
  const { playerMove, houseMove, gameState, result, score, error, dispatch } =
    useGame();
  const [toasts, setToasts] = useState<GameToast[]>([]);

  const getMoveEmoji = (move: Move) => {
    switch (move) {
      case "ROCK":
        return "🪨";
      case "PAPER":
        return "📜";
      case "SCISSORS":
        return "✂️";
      default:
        return "❓";
    }
  };

  const getResultColor = () => {
    switch (result) {
      case "WIN":
        return "text-blue-400";
      case "LOSE":
        return "text-red-500";
      case "DRAW":
        return "text-yellow-500";
      default:
        return "";
    }
  };

  useEffect(() => {
    if (error) {
      addToast(error, "error");
      const timer = setTimeout(() => {
        dispatch({ type: "RESET_GAME" });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (gameState === "SELECTED") {
      const timer = setTimeout(() => {
        dispatch({ type: "HOUSE_PICK" });
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (gameState === "REVEALING") {
      const timer = setTimeout(() => {
        dispatch({ type: "REVEAL_RESULT" });
      }, 1500);
      return () => clearTimeout(timer);
    }

    // Play result sounds
    if (gameState === "FINISHED" && result) {
      if (result === "WIN") soundEffects.win();
      else if (result === "LOSE") soundEffects.lose();
      else soundEffects.draw();
    }
  }, [gameState, dispatch, result]);

  const addToast = (message: string, type: "success" | "error" | "info") => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      dismissToast(id);
    }, 5000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const handleMove = (move: Move) => {
    if (gameState !== "CHOOSING" || !move) return;
    try {
      soundEffects.select();
      dispatch({ type: "SELECT_MOVE", move });
      addToast("Move selected!", "success");
    } catch (e) {
      addToast("Failed to select move", "error");
    }
  };

  const handlePlayAgain = () => {
    soundEffects.click();
    dispatch({ type: "RESET_GAME" });
    addToast("Starting new game!", "info");
  };

  const handleHover = () => {
    soundEffects.hover();
  };

  return (
    <>
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="relative rounded-lg bg-black bg-opacity-70 p-8 border border-blue-500 overflow-hidden">
          <div className="absolute top-4 right-4">
            <div className="text-xl text-purple-400">Score: {score}</div>
          </div>

          <AnimatePresence mode="wait">
            {gameState === "CHOOSING" && (
              <motion.div
                key="choosing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-3 gap-6 mt-8"
              >
                {(["ROCK", "PAPER", "SCISSORS"] as const).map((move) => (
                  <motion.button
                    key={move}
                    onClick={() => handleMove(move)}
                    onMouseEnter={handleHover}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      "p-6 rounded-lg border-2 transition-all duration-300",
                      "hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500",
                      "bg-black bg-opacity-50",
                      playerMove === move
                        ? "border-blue-500"
                        : "border-gray-600"
                    )}
                  >
                    <div className="text-6xl mb-2 text-center">
                      {getMoveEmoji(move)}
                    </div>
                    <div
                      className={cn(
                        "text-center text-lg font-semibold",
                        playerMove === move ? "text-blue-400" : "text-gray-300"
                      )}
                    >
                      {move}
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            )}

            {(gameState === "SELECTED" ||
              gameState === "HOUSE_PICKING" ||
              gameState === "REVEALING" ||
              gameState === "FINISHED") && (
              <motion.div
                key="playing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-center items-center gap-16 mt-8"
              >
                <div className="text-center">
                  <div className="text-xl mb-4 text-blue-400">Your Move</div>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-8xl"
                  >
                    {getMoveEmoji(playerMove)}
                  </motion.div>
                </div>

                <div className="text-center">
                  <div className="text-xl mb-4 text-pink-400">
                    {gameState === "SELECTED" ? (
                      <span className="flex items-center justify-center gap-2">
                        House picking <Spinner size="sm" />
                      </span>
                    ) : gameState === "REVEALING" ? (
                      <span className="flex items-center justify-center gap-2">
                        Revealing <Spinner size="sm" />
                      </span>
                    ) : (
                      "House Move"
                    )}
                  </div>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-8xl"
                  >
                    {gameState === "FINISHED" ? (
                      getMoveEmoji(houseMove)
                    ) : (
                      <motion.div
                        animate={{ rotateY: 360 }}
                        transition={{
                          duration: 1.5,
                          ease: "easeInOut",
                          repeat: Infinity,
                          repeatType: "reverse",
                        }}
                      >
                        ❓
                      </motion.div>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            )}

            {gameState === "FINISHED" && (
              <motion.div
                key="finished"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 text-center"
              >
                <div
                  className={cn("text-3xl font-bold mb-4", getResultColor())}
                >
                  {result === "WIN" && "You Win! 🎉"}
                  {result === "LOSE" && "You Lose! 😢"}
                  {result === "DRAW" && "It's a Draw! 🤝"}
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handlePlayAgain}
                  onMouseEnter={handleHover}
                  className="px-6 py-3 rounded-lg bg-black bg-opacity-50 border-2 border-blue-500 text-lg font-semibold text-blue-400"
                >
                  Play Again
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
