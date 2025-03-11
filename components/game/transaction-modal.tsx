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
  onRetry?: () => void;
  onCancel?: () => void;
}

export default function TransactionModal({
  onRetry,
  onCancel,
}: TransactionModalProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  // Get state from the store
  const {
    phase,
    isTransactionModalOpen,
    transactionType,
    transactionHash,
    setTransactionModal,
  } = useGameUIStore();

  // Reset timer when modal opens/closes
  useEffect(() => {
    if (isTransactionModalOpen) {
      setElapsedTime(0);
    } else {
      setElapsedTime(0);
    }
  }, [isTransactionModalOpen]);

  // Start timer when modal is open
  useEffect(() => {
    if (!isTransactionModalOpen) return;

    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isTransactionModalOpen]);

  const getMessage = () => {
    if (transactionType === "approve") {
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

  const showExplorer = transactionType === "validate" && transactionHash;

  const handleOpenChange = (open: boolean) => {
    // If modal is being closed and we're in SELECTED or WAITING phase
    if (
      !open &&
      (phase === GamePhase.SELECTED || phase === GamePhase.WAITING)
    ) {
      // Call onCancel to reset the game state
      if (onCancel) {
        onCancel();
      }
    }

    // Update modal state in the store
    setTransactionModal(open, transactionType);
  };

  return (
    <Dialog open={isTransactionModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader className="flex flex-col items-center text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent border-white mb-4" />
          <DialogTitle className="text-xl font-medium">
            {transactionType === "approve"
              ? "Approve the transaction"
              : elapsedTime > 60
              ? "Transaction taking longer than expected"
              : "Validating moves..."}
          </DialogTitle>
          <DialogDescription className="text-zinc-400 mt-2">
            {getMessage()}
          </DialogDescription>

          {showExplorer && transactionHash && (
            <div className="mt-4 pt-4 border-t border-zinc-700 w-full">
              <div className="flex justify-center items-center text-sm text-zinc-500">
                <span>
                  TX: {transactionHash.substring(0, 8)}...
                  {transactionHash.substring(transactionHash.length - 6)}
                </span>
                <a
                  href={`https://testnet.monadexplorer.com/tx/${transactionHash}`}
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
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
