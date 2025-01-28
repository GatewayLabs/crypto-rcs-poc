"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TransactionModalProps {
  isOpen: boolean;
  type: "approve" | "validate";
}

export default function TransactionModal({
  isOpen,
  type,
}: TransactionModalProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent>
        <DialogHeader className="flex flex-col items-center text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent border-white mb-4" />
          <DialogTitle className="text-xl font-medium">
            {type === "approve"
              ? "Approve the transaction"
              : "Validating moves..."}
          </DialogTitle>
          <DialogDescription className="text-zinc-400 mt-2">
            {type === "approve"
              ? "Waiting for transaction approval to continue. Don't see your wallet? Check your other browser windows."
              : "Please wait while we validate the moves on-chain"}
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
