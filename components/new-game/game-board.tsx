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
import ErrorDialog from "./error-dialog";

interface GameToast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

const GAME_BUTTONS = [
  {
    label: "ROCK",
    imageSrc: "/images/rock.png",
  },
  {
    label: "PAPER",
    imageSrc: "/images/paper.png",
  },
  {
    label: "SCISSORS",
    imageSrc: "/images/scissors.png",
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

  const addToast = (message: string, type: "success" | "info") => {
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
      dispatch({
        type: "SET_ERROR",
        error: error instanceof Error ? error.message : "Failed to make move",
      });
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
        gameId={gameId.toString()}
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
      <ErrorDialog
        isOpen={!!error}
        onClose={() => dispatch({ type: "RESET_GAME" })}
        error={error || ""}
      />
      <ToastContainer
        toasts={toasts.filter((t) => t.type !== "error")}
        onDismiss={dismissToast}
      />
    </>
  );
}
