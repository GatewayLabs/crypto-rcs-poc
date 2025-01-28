"use client";

import { useEffect, useState } from "react";
import { useGame } from "@/context/game-context";
import { useAccount } from "wagmi";
import { Move } from "@/lib/crypto";
import { soundEffects } from "@/lib/sounds/sound-effects";
import GameButton from "./game-button";
import GameResult from "./game-result";
import TransactionModal from "./transaction-modal";
import { Toast, ToastContainer } from "@/components/ui/toast";

interface GameToast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

const GAME_BUTTONS = [
  {
    label: "ROCK",
    imageSrc:
      "https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/fad23edd96718056c79683f402049d6279f95f63fd7c4f992f978247401b6d45?placeholderIfAbsent=true&width=100 100w, https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/fad23edd96718056c79683f402049d6279f95f63fd7c4f992f978247401b6d45?placeholderIfAbsent=true&width=200 200w",
  },
  {
    label: "PAPER",
    imageSrc:
      "https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/4c73db1f1936c8d9ae671765fb9d4e8e201ebc46b1dfece697f026223efd9482?placeholderIfAbsent=true&width=100 100w, https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/4c73db1f1936c8d9ae671765fb9d4e8e201ebc46b1dfece697f026223efd9482?placeholderIfAbsent=true&width=200 200w",
  },
  {
    label: "SCISSORS",
    imageSrc:
      "https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/39d857d212930e8856ed7b62c92bdac67a072193ddd31f5264d94ab8b91c573d?placeholderIfAbsent=true&width=100 100w, https://cdn.builder.io/api/v1/image/assets/7e9fda62d1fd4d2cb4b968860ae91a02/39d857d212930e8856ed7b62c92bdac67a072193ddd31f5264d94ab8b91c573d?placeholderIfAbsent=true&width=200 200w",
  },
];

export default function GameBoard() {
  const {
    playerMove,
    houseMove,
    phase,
    result,
    score,
    error,
    gameId,
    dispatch,
    createGame,
    joinGame,
    isLoading,
  } = useGame();

  const { address } = useAccount();
  const [toasts, setToasts] = useState<GameToast[]>([]);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionType, setTransactionType] = useState<
    "approve" | "validate"
  >("approve");

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
    if (phase === "FINISHED" && result) {
      if (result === "WIN") soundEffects.win();
      else if (result === "LOSE") soundEffects.lose();
      else soundEffects.draw();
    }
  }, [phase, result]);

  useEffect(() => {
    // Show transaction modal based on phase
    if (phase === "SELECTED") {
      setTransactionType("approve");
      setShowTransactionModal(true);
    } else if (phase === "WAITING" || phase === "REVEALING") {
      setTransactionType("validate");
      setShowTransactionModal(true);
    } else {
      setShowTransactionModal(false);
    }
  }, [phase]);

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

  const handleMove = async (move: Move) => {
    if (phase !== "CHOOSING" || !address || isLoading) return;

    try {
      soundEffects.select();
      dispatch({ type: "SELECT_MOVE", move });

      if (!gameId) {
        addToast("Creating new game...", "info");
        await createGame(move);
        addToast("Game created! Waiting for opponent...", "success");
      } else {
        addToast("Joining game...", "info");
        await joinGame(gameId, move);
        addToast("Joined game!", "success");
      }
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : "Failed to make move",
        "error"
      );
      dispatch({ type: "RESET_GAME" });
    }
  };

  const handlePlayAgain = () => {
    soundEffects.click();
    dispatch({ type: "RESET_GAME" });
    addToast("Starting new game!", "info");
  };

  if (phase === "FINISHED" && playerMove && houseMove && result && gameId) {
    return (
      <GameResult
        playerMove={playerMove}
        houseMove={houseMove}
        result={result}
        gameId={gameId}
        onPlayAgain={handlePlayAgain}
      />
    );
  }

  return (
    <>
      <div className="px-6 py-8 max-md:max-w-full font-normal">
        <div className="max-w-full">
          <div className="text-zinc-400 text-sm leading-none max-md:max-w-full">
            {!address
              ? "Connect your wallet to play"
              : phase === "CHOOSING"
              ? gameId
                ? "Join the game..."
                : "Make your move to start the match"
              : "Processing your move..."}
          </div>
          <div className="text-white text-5xl font-bold leading-none tracking-[-1.2px] mt-3 max-md:max-w-full max-md:text-[40px]">
            Let&apos;s rock on-chain
          </div>
          {score > 0 && (
            <div className="text-[rgba(141,12,255,1)] text-xl mt-2">
              Score: {score.toString()}
            </div>
          )}
        </div>
        <div className="flex w-full items-center gap-4 flex-wrap mt-8 max-md:max-w-full group">
          {GAME_BUTTONS.map((button) => (
            <GameButton
              key={button.label}
              label={button.label}
              imageSrc={button.imageSrc}
              onClick={() => handleMove(button.label as Move)}
              disabled={!address || isLoading || phase !== "CHOOSING"}
              aria-selected={playerMove === button.label}
            />
          ))}
        </div>
      </div>

      <TransactionModal isOpen={showTransactionModal} type={transactionType} />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
