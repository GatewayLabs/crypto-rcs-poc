import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGameUIStore } from "@/stores/game-ui-store";
import { GamePhase } from "@/types/game";
import { ExternalLink, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

interface TransactionModalProps {
  isOpen: boolean;
  type: "approve" | "validate";
  txHash?: string | null;
  onRetry?: () => void;
}

export default function TransactionModal({
  isOpen,
  type,
  txHash,
  onRetry,
}: TransactionModalProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const { phase } = useGameUIStore();

  useEffect(() => {
    if (isOpen) {
      setElapsedTime(0);
    } else {
      setElapsedTime(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const getMessage = () => {
    if (type === "approve") {
      return "Waiting for transaction approval to continue. Don't see your wallet? Check your other browser windows.";
    }

    if (phase === GamePhase.WAITING) {
      if (elapsedTime < 20) {
        return "Please wait while we validate the moves on-chain";
      } else if (elapsedTime < 40) {
        return "This is taking longer than usual. Blockchain transactions can sometimes be delayed...";
      } else {
        return "Your transaction is being processed by the blockchain. This may take a few minutes...";
      }
    }

    if (phase === GamePhase.REVEALING) {
      if (elapsedTime < 20) {
        return "Computing game result on-chain...";
      } else if (elapsedTime < 40) {
        return "Finalizing your game. Almost there...";
      } else {
        return "Still working on your game. The blockchain can be slower during high traffic periods.";
      }
    }

    return "Processing your transaction...";
  };

  const showRetry = type === "validate" && elapsedTime > 30 && onRetry;
  const showExplorer = type === "validate" && txHash;

  return (
    <Dialog open={isOpen}>
      <DialogContent>
        <DialogHeader className="flex flex-col items-center text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent border-white mb-4" />
          <DialogTitle className="text-xl font-medium">
            {type === "approve"
              ? "Approve the transaction"
              : elapsedTime > 60
              ? "Transaction taking longer than expected"
              : "Validating moves..."}
          </DialogTitle>
          <DialogDescription className="text-zinc-400 mt-2">
            {getMessage()}
          </DialogDescription>

          {showExplorer && (
            <div className="mt-4 pt-4 border-t border-zinc-700 w-full">
              <div className="flex justify-center items-center text-sm text-zinc-500">
                <span>
                  TX: {txHash.substring(0, 8)}...
                  {txHash.substring(txHash.length - 6)}
                </span>
                <a
                  href={`https://testnet.monadexplorer.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-indigo-400 hover:text-indigo-300 flex items-center"
                >
                  View <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </div>

              <div className="mt-2 text-xs text-zinc-600">
                Elapsed time: {elapsedTime} seconds
              </div>
            </div>
          )}

          {showRetry && (
            <button
              onClick={onRetry}
              className="mt-4 flex items-center gap-2 bg-indigo-700 hover:bg-indigo-600 text-white px-4 py-2 rounded-md transition-colors text-sm"
            >
              <RefreshCw size={16} />
              Retry Transaction
            </button>
          )}
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
