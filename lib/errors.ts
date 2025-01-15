export class GameError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly recoverable: boolean = true
  ) {
    super(message);
    this.name = "GameError";
  }
}

export class TransactionError extends GameError {
  constructor(message: string, public readonly txHash?: string) {
    super(message, "TRANSACTION_ERROR", true);
    this.name = "TransactionError";
  }
}

export class ContractError extends GameError {
  constructor(message: string) {
    super(message, "CONTRACT_ERROR", false);
    this.name = "ContractError";
  }
}

export class CryptoError extends GameError {
  constructor(message: string) {
    super(message, "CRYPTO_ERROR", false);
    this.name = "CryptoError";
  }
}

export function handleGameError(error: unknown): GameError {
  if (error instanceof GameError) {
    return error;
  }

  if (error instanceof Error) {
    if (error.message.includes("user rejected")) {
      return new GameError(
        "Transaction rejected by user",
        "USER_REJECTED",
        true
      );
    }
    if (error.message.includes("insufficient funds")) {
      return new GameError(
        "Insufficient funds for transaction",
        "INSUFFICIENT_FUNDS",
        true
      );
    }

    if (error.message.includes("network")) {
      return new GameError(
        "Network error. Please check your connection",
        "NETWORK_ERROR",
        true
      );
    }

    return new GameError(error.message, "UNKNOWN_ERROR", true);
  }

  return new GameError("An unknown error occurred", "UNKNOWN_ERROR", true);
}

export function getErrorMessage(error: GameError): string {
  switch (error.code) {
    case "USER_REJECTED":
      return "Transaction cancelled. Try again when ready.";
    case "INSUFFICIENT_FUNDS":
      return "Not enough funds to complete the transaction.";
    case "NETWORK_ERROR":
      return "Connection error. Check your internet and wallet connection.";
    case "CRYPTO_ERROR":
      return "Encryption error. Please try again.";
    case "CONTRACT_ERROR":
      return "Smart contract error. Please try again later.";
    default:
      return error.message;
  }
}
