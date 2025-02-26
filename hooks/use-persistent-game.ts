import { useEffect } from "react";
import { useAccount } from "wagmi";
import { SerializedGameState, isValidGameState, GamePhase } from "@/types/game";
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

    const hasRestoredKey = `${STORAGE_KEY}-restored-${address}`;
    const hasRestored = sessionStorage.getItem(hasRestoredKey);

    if (hasRestored === "true") {
      return;
    }

    try {
      const storageKey = `${STORAGE_KEY}-${address}`;
      const savedState = localStorage.getItem(storageKey);

      if (savedState) {
        const parsedState = JSON.parse(savedState);
        if (isValidGameState(parsedState)) {
          const stateToRestore = {
            ...parsedState,
            phase: GamePhase.FINISHED,
          };

          dispatch({ type: "RESTORE_STATE", state: stateToRestore });
          sessionStorage.setItem(hasRestoredKey, "true");
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

    if (
      !currentState.playerMove &&
      !currentState.result &&
      currentState.history.length === 0
    ) {
      return;
    }

    const storageKey = `${STORAGE_KEY}-${address}`;
    const stateToSave: SerializedGameState = {
      ...currentState,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(stateToSave));

      if (currentState.playerMove || currentState.result) {
        const hasRestoredKey = `${STORAGE_KEY}-restored-${address}`;
        sessionStorage.setItem(hasRestoredKey, "true");
      }
    } catch (error) {
      console.error("Failed to save game state:", error);
    }
  }, [currentState, address]);
}
