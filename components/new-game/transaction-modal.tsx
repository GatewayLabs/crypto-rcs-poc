interface TransactionModalProps {
  isOpen: boolean;
  type: "approve" | "validate";
}

export default function TransactionModal({
  isOpen,
  type,
}: TransactionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[rgba(20,9,31,1)] border border-[rgba(141,12,255,1)] rounded-lg p-8 max-w-md w-full mx-4 shadow-lg">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgba(141,12,255,1)]" />
          <h3 className="text-xl font-semibold text-white">
            {type === "approve"
              ? "Approve the transaction"
              : "Validating moves..."}
          </h3>
          <p className="text-zinc-400 text-center">
            {type === "approve"
              ? "Please approve the transaction in your wallet"
              : "Please wait while we validate the moves on-chain"}
          </p>
        </div>
      </div>
    </div>
  );
}
