import { useEffect } from "react";
import { useAccount } from "wagmi";
import { SerializedGameState, isValidGameState } from "@/types/game";
import { GameAction } from "@/types/game";

export const STORAGE_KEY = "crypto-rps-game-state";

export function usePersistentGame(
  dispatch: React.Dispatch<GameAction>,
  currentState: SerializedGameState
) {
  const { address } = useAccount();

  useEffect(() => {
    if (!address) {
      return;
    }

    try {
      const storageKey = `${STORAGE_KEY}-${address}`;
      const savedState = localStorage.getItem(storageKey);

      if (savedState) {
        const parsedState = JSON.parse(savedState);
        if (isValidGameState(parsedState)) {
          dispatch({ type: "RESTORE_STATE", state: parsedState });
        } else {
          localStorage.removeItem(storageKey);
        }
      }
    } catch (error) {
      localStorage.removeItem(`${STORAGE_KEY}-${address}`);
    }
  }, [address, dispatch]);

  useEffect(() => {
    if (!address) return;

    const storageKey = `${STORAGE_KEY}-${address}`;
    const stateToSave: SerializedGameState = {
      ...currentState,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(stateToSave));
    } catch (error) {
      console.error("Failed to save game state:", error);
    }
  }, [currentState, address]);
}
