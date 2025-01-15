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

  // Debugging Effect for restoring state
  useEffect(() => {
    if (!address) {
      console.log("No address available for restoration");
      return;
    }

    try {
      const storageKey = `${STORAGE_KEY}-${address}`;
      console.log("Attempting to restore state for key:", storageKey);
      const savedState = localStorage.getItem(storageKey);
      console.log("Found saved state:", savedState);

      if (savedState) {
        const parsedState = JSON.parse(savedState);
        console.log("Parsed state:", parsedState);
        if (isValidGameState(parsedState)) {
          console.log("State is valid, dispatching RESTORE_STATE");
          dispatch({ type: "RESTORE_STATE", state: parsedState });
        } else {
          console.log("Invalid state found, removing from storage");
          localStorage.removeItem(storageKey);
        }
      }
    } catch (error) {
      console.error("Failed to restore game state:", error);
      localStorage.removeItem(`${STORAGE_KEY}-${address}`);
    }
  }, [address, dispatch]);

  // Debugging Effect for saving state
  useEffect(() => {
    if (!address) return;
    if (currentState.phase === "ERROR") return;

    const storageKey = `${STORAGE_KEY}-${address}`;
    const stateToSave: SerializedGameState = {
      ...currentState,
      timestamp: Date.now(),
    };

    try {
      console.log("Saving state for key:", storageKey);
      console.log("State being saved:", stateToSave);
      localStorage.setItem(storageKey, JSON.stringify(stateToSave));
    } catch (error) {
      console.error("Failed to save game state:", error);
    }
  }, [currentState, address]);
}
