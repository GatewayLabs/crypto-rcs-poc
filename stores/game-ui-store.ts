import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Move } from "@/lib/crypto";
import { GamePhase, GameResult } from "@/types/game";

// Interface for toast notifications
export interface GameToast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

// Main UI state interface with store actions
interface GameUIState {
  // UI State
  playerMove: Move | null;
  houseMove: Move | null;
  phase: GamePhase;
  result: GameResult | null;
  error: string | null;
  gameId: number | null;
  transactionHash: string | null;

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
  setTransactionHash: (hash: string | null) => void;

  // Transaction modal actions
  setTransactionModal: (isOpen: boolean, type?: "approve" | "validate") => void;

  // Toast actions
  addToast: (message: string, type: "success" | "error" | "info") => void;
  dismissToast: (id: string) => void;

  // Game state management
  resetGameState: () => void;
  updateGameState: (updates: Partial<GameUIState>) => void;
}

// Define which parts of the state should be persisted
type PersistentState = Pick<
  GameUIState,
  "playerMove" | "houseMove" | "phase" | "result" | "gameId" | "transactionHash"
>;

// Create the store with persist middleware
export const useGameUIStore = create<GameUIState>()(
  persist(
    (set) => ({
      // Initial UI State
      playerMove: null,
      houseMove: null,
      phase: GamePhase.CHOOSING,
      result: null,
      error: null,
      gameId: null,
      transactionHash: null,

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
      setTransactionHash: (hash: string | null) =>
        set({ transactionHash: hash }),

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
        }),

      updateGameState: (updates: Partial<GameUIState>) =>
        set((state) => ({
          ...state,
          ...updates,
        })),
    }),
    {
      name: "crypto-rps-game-state",
      storage: createJSONStorage(() => localStorage),
      // Only persist specific fields
      partialize: (state) => ({
        playerMove: state.playerMove,
        houseMove: state.houseMove,
        phase: state.phase,
        result: state.result,
        gameId: state.gameId,
        transactionHash: state.transactionHash,
      }),
    }
  )
);
