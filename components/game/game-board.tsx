"use client";

import ErrorDialog from "@/components/game/error-dialog";
import GameButton from "@/components/game/game-button";
import GameResultView from "@/components/game/game-result";
import TransactionModal from "@/components/game/transaction-modal";
import { ToastContainer } from "@/components/ui/toast";
import { useGame } from "@/hooks/use-game";
import { Move } from "@/lib/crypto";
import { soundEffects } from "@/lib/sounds/sound-effects";
import { GameToast, useGameUIStore } from "@/stores/game-ui-store";
import { GamePhase } from "@/types/game";
import { formatEther } from "ethers";
import { useEffect, useState } from "react";
import { useAccount, useBalance } from "wagmi";
import GameBet from "./game-bet";

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
  const { createGame, joinGame, resetGame, isCreatingGame, isJoiningGame } =
    useGame();
  const { address, isConnected } = useAccount();
  const { data: userBalance } = useBalance({
    address,
  });
  const [balance, setBalance] = useState<bigint | undefined>(BigInt(0));
  const [betValue, setBetValue] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const limit = 1;

  useEffect(() => {
    if (!isConnected) {
      return;
    }
    setBalance(userBalance?.value);
  }, [isConnected, userBalance]);

  // Get UI state from Zustand
  const {
    playerMove,
    houseMove,
    phase,
    result,
    error,
    gameId,
    toasts,
    isTransactionModalOpen,
    transactionType,
    addToast,
    dismissToast,
    setTransactionModal,
  } = useGameUIStore();

  useEffect(() => {
    if (phase === GamePhase.FINISHED && result) {
      if (result === "WIN") soundEffects.win();
      else if (result === "LOSE") soundEffects.lose();
      else soundEffects.draw();
    }
  }, [phase, result]);

  useEffect(() => {
    setErrorMessage(null);
  }, [betValue]);

  useEffect(() => {
    // Show transaction modal based on phase
    if (phase === GamePhase.SELECTED) {
      setTransactionModal(true, "approve");
    } else if (phase === GamePhase.WAITING || phase === GamePhase.REVEALING) {
      setTransactionModal(true, "validate");
    } else {
      setTransactionModal(false);
    }
  }, [phase, setTransactionModal]);

  const validateBetValue = (): boolean => {
    if (betValue === 0) {
      setErrorMessage(`Please enter a bet amount`);
      return false;
    } else if (betValue > limit) {
      setErrorMessage(`Max limit is ${limit} MON`);
      return false;
    } else if ((Number(parseFloat(formatEther(balance!))) || 0) < betValue) {
      setErrorMessage(`Insufficient balance`);
      return false;
    } else {
      setErrorMessage(null);
      return true;
    }
  };

  const handleMove = async (move: Move) => {
    if (phase !== GamePhase.CHOOSING || !address) return;

    if (!validateBetValue()) {
      return;
    }

    try {
      soundEffects.select();

      if (!gameId) {
        addToast("Creating new game...", "info");
        await createGame(move, BigInt(betValue * 10 ** 18));
        addToast("Game created! Waiting for opponent...", "success");
      } else {
        addToast("Joining game...", "info");
        await joinGame(gameId, move, BigInt(betValue * 10 ** 18));
        addToast("Joined game!", "success");
      }
    } catch (error) {
      addToast("Error processing move", "info");
      console.error("Error making move:", error);
    }
  };

  const handlePlayAgain = () => {
    soundEffects.click();
    resetGame();
    addToast("Starting new game!", "info");
  };

  if (
    phase === GamePhase.FINISHED &&
    playerMove &&
    houseMove &&
    result &&
    gameId !== null &&
    gameId !== undefined
  ) {
    return (
      <GameResultView
        playerMove={playerMove}
        houseMove={houseMove}
        result={result}
        gameId={String(gameId)}
        onPlayAgain={handlePlayAgain}
        value={betValue}
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
              : phase === GamePhase.CHOOSING
              ? gameId
                ? "Join the game..."
                : "Make your move to start the match"
              : "Processing your move..."}
          </div>
          <div className="text-white text-5xl font-bold leading-none tracking-[-1.2px] mt-3 max-md:max-w-full max-md:text-[40px]">
            Let&apos;s rock on-chain
          </div>
        </div>
        <div className="text-white mt-8 text-2xl font-bold leading-none tracking-[-0.6px] max-md:max-w-full">
          Add your bet
        </div>
        <GameBet
          value={betValue}
          onBet={(value) => setBetValue(value)}
          errorMessage={errorMessage}
        />
        <div className="text-white text-2xl mt-8 font-bold leading-none tracking-[-0.6px] max-md:max-w-full">
          Make your move
        </div>
        <div className="flex w-full items-center gap-4 flex-wrap mt-4 max-md:max-w-full group max-md:flex-col">
          {GAME_BUTTONS.map((button) => (
            <GameButton
              key={button.label}
              label={button.label}
              imageSrc={button.imageSrc}
              onClick={() => handleMove(button.label as Move)}
              disabled={
                !address ||
                isCreatingGame ||
                isJoiningGame ||
                phase !== GamePhase.CHOOSING
              }
              aria-selected={
                typeof playerMove === "string" && playerMove === button.label
              }
            />
          ))}
        </div>
      </div>

      <TransactionModal
        isOpen={isTransactionModalOpen}
        type={transactionType}
      />
      <ErrorDialog isOpen={!!error} onClose={resetGame} error={error || ""} />
      <ToastContainer
        toasts={toasts.filter((t: GameToast) => t.type !== "error")}
        onDismiss={dismissToast}
      />
    </>
  );
}
