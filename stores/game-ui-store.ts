import { Move } from "@/lib/crypto";
import { GamePhase, GameResult, LeaderboardEntry } from "@/types/game";
import { create } from "zustand";

export interface GameToast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface GameUIState {
  // UI State
  playerMove: Move | null;
  houseMove: Move | null;
  phase: GamePhase;
  result: GameResult | null;
  error: string | null;
  gameId: number | null;
  transactionHash: string | null;
  playerRank: number | null;
  playerSummary: LeaderboardEntry | null;
  betValue: bigint | null;
  isCreatingGame: boolean;
  isJoiningGame: boolean;
  isResolutionPending: boolean;
  pendingResult: number | null;

  // Transaction modal state
  isTransactionModalOpen: boolean;
  transactionType: "approve" | "validate";

  // Toast notifications
  toasts: GameToast[];

  // Actions
  setPlayerMove: (move: Move | null) => void;
  setHouseMove: (move: Move | null) => void;
  setPhase: (phase: GamePhase) => void;
  setResult: (result: GameResult | null) => void;
  setError: (error: string | null) => void;
  setGameId: (id: number | null) => void;
  setPlayerRank: (rank: number | null) => void;
  setPlayerSummary: (summary: LeaderboardEntry | null) => void;
  setTransactionHash: (hash: string | null) => void;

  // Actions for new states
  setBetValue: (value: bigint | null) => void;
  setIsCreatingGame: (isCreating: boolean) => void;
  setIsJoiningGame: (isJoining: boolean) => void;
  setIsResolutionPending: (isPending: boolean) => void;
  setPendingResult: (result: number | null) => void;

  // Transaction modal actions
  setTransactionModal: (isOpen: boolean, type?: "approve" | "validate") => void;

  // Toast actions
  addToast: (message: string, type: "success" | "error" | "info") => void;
  dismissToast: (id: string) => void;

  // Game state management
  resetGameState: () => void;
  updateGameState: (updates: Partial<GameUIState>) => void;
}

export const useGameUIStore = create<GameUIState>((set) => ({
  // Initial UI State
  playerMove: null,
  houseMove: null,
  phase: GamePhase.CHOOSING,
  result: null,
  error: null,
  gameId: null,
  transactionHash: null,
  playerRank: null,
  playerSummary: null,

  // Initial states moved from useGame
  betValue: null,
  isCreatingGame: false,
  isJoiningGame: false,
  isResolutionPending: false,
  pendingResult: null,

  // Transaction modal initial state
  isTransactionModalOpen: false,
  transactionType: "approve" as const,

  // Toast notifications
  toasts: [],

  // Actions
  setPlayerMove: (move: Move | null) => set({ playerMove: move }),
  setHouseMove: (move: Move | null) => set({ houseMove: move }),
  setPhase: (phase: GamePhase) => set({ phase }),
  setResult: (result: GameResult | null) => set({ result }),
  setError: (error: string | null) => set({ error }),
  setGameId: (id: number | null) => set({ gameId: id }),
  setTransactionHash: (hash: string | null) => set({ transactionHash: hash }),
  setPlayerRank: (rank: number | null) => set({ playerRank: rank }),
  setPlayerSummary: (summary: LeaderboardEntry | null) =>
    set({ playerSummary: summary }),

  // Actions for the new states
  setBetValue: (value: bigint | null) => set({ betValue: value }),
  setIsCreatingGame: (isCreating: boolean) =>
    set({ isCreatingGame: isCreating }),
  setIsJoiningGame: (isJoining: boolean) => set({ isJoiningGame: isJoining }),
  setIsResolutionPending: (isPending: boolean) =>
    set({ isResolutionPending: isPending }),
  setPendingResult: (result: number | null) => set({ pendingResult: result }),

  // Transaction modal actions
  setTransactionModal: (
    isOpen: boolean,
    type: "approve" | "validate" = "approve"
  ) => set({ isTransactionModalOpen: isOpen, transactionType: type }),

  // Toast actions
  addToast: (message: string, type: "success" | "error" | "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((toast) => toast.id !== id),
      }));
    }, 5000);
  },

  dismissToast: (id: string) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),

  // Game state management
  resetGameState: () =>
    set({
      playerMove: null,
      houseMove: null,
      phase: GamePhase.CHOOSING,
      result: null,
      error: null,
      gameId: null,
      transactionHash: null,
      isTransactionModalOpen: false,
      isCreatingGame: false,
      isJoiningGame: false,
      isResolutionPending: false,
      pendingResult: null,
    }),

  updateGameState: (updates: Partial<GameUIState>) =>
    set((state) => ({
      ...state,
      ...updates,
    })),
}));
