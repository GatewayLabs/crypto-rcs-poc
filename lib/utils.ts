import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateCommitHash(move: string, nonce: string): string {
  // For now, we'll use a simple concatenation. In production, use proper keccak256
  return `${move}-${nonce}`;
}

export function validateReveal(
  move: string,
  nonce: string,
  commitHash: string
): boolean {
  return generateCommitHash(move, nonce) === commitHash;
}

/**
 * Generic retry function for retrying async operations with exponential backoff
 * @param fn Function to retry
 * @param options Retry options
 * @returns Promise with the result of the function
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    retries: number;
    backoffMs: number;
    shouldRetry: (error: any) => boolean;
    onRetry?: (error: any, attempt: number) => void;
  }
): Promise<T> {
  const { retries, backoffMs, shouldRetry, onRetry } = options;
  let attempt = 0;

  while (attempt < retries) {
    try {
      return await fn();
    } catch (error) {
      // If we shouldn't retry this error, rethrow it
      if (!shouldRetry(error)) throw error;

      attempt++;

      // If we've reached max retries, throw the error
      if (attempt >= retries) throw error;

      // Log retry attempt if callback provided
      if (onRetry) {
        onRetry(error, attempt);
      }

      // Exponential backoff - wait longer for each retry
      const delay = backoffMs * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw new Error("Max retries reached");
}
