import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateCommitHash(move: string, nonce: string): string {
  // For now, we'll use a simple concatenation. In production, use proper keccak256
  return `${move}-${nonce}`;
}

export function validateReveal(move: string, nonce: string, commitHash: string): boolean {
  return generateCommitHash(move, nonce) === commitHash;
}
