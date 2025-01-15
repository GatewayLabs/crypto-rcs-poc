import { useEffect } from "react";
import { useAccount } from "wagmi";
import { SerializedGameState, isValidGameState } from "@/types/game";
import { GameAction } from "@/types/game";

const STORAGE_KEY = "crypto-rps-game-state";

export function usePersistentGame(
  dispatch: React.Dispatch<GameAction>,
  currentState: SerializedGameState
) {
  const { address } = useAccount();

  useEffect(() => {
    if (!address) return;

    try {
      const savedState = localStorage.getItem(`${STORAGE_KEY}-${address}`);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        if (isValidGameState(parsedState)) {
          dispatch({ type: "RESTORE_STATE", state: parsedState });
        } else {
          localStorage.removeItem(`${STORAGE_KEY}-${address}`);
        }
      }
    } catch (error) {
      console.error("Failed to restore game state:", error);
      localStorage.removeItem(`${STORAGE_KEY}-${address}`);
    }
  }, [address, dispatch]);

  useEffect(() => {
    if (!address) return;

    if (currentState.phase === "ERROR") return;

    const stateToSave: SerializedGameState = {
      ...currentState,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(
        `${STORAGE_KEY}-${address}`,
        JSON.stringify(stateToSave)
      );
    } catch (error) {
      console.error("Failed to save game state:", error);
    }
  }, [currentState, address]);

  useEffect(() => {
    if (!address) {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(STORAGE_KEY)) {
          localStorage.removeItem(key);
        }
      });
    }
  }, [address]);
}
