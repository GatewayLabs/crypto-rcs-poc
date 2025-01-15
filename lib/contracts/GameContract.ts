import { ethers } from "ethers";
import { GAME_CONTRACT_ADDRESS } from "@/config/contracts";

export const GameABI = [
  // Game creation and joining
  "function createGame(bytes encChoiceA) returns (uint256)",
  "function joinGame(uint256 gameId, bytes encChoiceB)",
  
  // Move submission and verification
  "function submitMoves(uint256 gameId)",
  "function computeDifference(uint256 gameId)",
  "function verifyMoves(uint256 gameId, bytes proof)",
  "function finalizeGame(uint256 gameId, int256 diffMod3)",
  
  // Game info and state
  "function getGameInfo(uint256 gameId) view returns (address playerA, address playerB, address winner, bool finished, bool bothCommitted, bytes encA, bytes encB, bytes differenceCipher, int256 revealedDiff)",
  "function getGameState(uint256 gameId) view returns (uint8)", // 0: Created, 1: Joined, 2: MovesSubmitted, 3: DifferenceComputed, 4: Finished
  "function getPlayerStats(address player) view returns (uint256 wins, uint256 losses, uint256 draws)",
  
  // Events
  "event GameCreated(uint256 indexed gameId, address indexed playerA)",
  "event GameJoined(uint256 indexed gameId, address indexed playerB)",
  "event MovesSubmitted(uint256 indexed gameId)",
  "event DifferenceComputed(uint256 indexed gameId, bytes differenceCipher)",
  "event MovesVerified(uint256 indexed gameId)",
  "event GameResolved(uint256 indexed gameId, address winner, int256 diffMod3)",
] as const;

export class GameContract {
  private contract: ethers.Contract;
  private signer: ethers.providers.JsonRpcSigner;
  private eventListeners: Map<string, Function[]>;

  constructor(provider: ethers.providers.Web3Provider) {
    this.signer = provider.getSigner();
    this.contract = new ethers.Contract(
      GAME_CONTRACT_ADDRESS,
      GameABI,
      this.signer
    );
    this.eventListeners = new Map();
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Setup default event handling
    this.contract.on("GameCreated", (gameId, playerA) => {
      this.notifyListeners("GameCreated", { gameId, playerA });
    });

    this.contract.on("GameJoined", (gameId, playerB) => {
      this.notifyListeners("GameJoined", { gameId, playerB });
    });

    this.contract.on("MovesSubmitted", (gameId) => {
      this.notifyListeners("MovesSubmitted", { gameId });
    });

    this.contract.on("DifferenceComputed", (gameId, differenceCipher) => {
      this.notifyListeners("DifferenceComputed", { gameId, differenceCipher });
    });

    this.contract.on("MovesVerified", (gameId) => {
      this.notifyListeners("MovesVerified", { gameId });
    });

    this.contract.on("GameResolved", (gameId, winner, diffMod3) => {
      this.notifyListeners("GameResolved", { gameId, winner, diffMod3 });
    });
  }

  private notifyListeners(event: string, data: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => listener(data));
    }
  }

  // Add event listener
  addEventListener(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(callback);
    this.eventListeners.set(event, listeners);
  }

  // Remove event listener
  removeEventListener(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
        this.eventListeners.set(event, listeners);
      }
    }
  }

  // Game Creation
  async createGame(encryptedChoice: string): Promise<number> {
    try {
      const tx = await this.contract.createGame(encryptedChoice);
      const receipt = await tx.wait();
      const event = receipt.events?.find((e: any) => e.event === "GameCreated");
      return event?.args?.gameId.toNumber() || 0;
    } catch (error) {
      console.error("Error creating game:", error);
      throw error;
    }
  }

  // Game Joining
  async joinGame(gameId: number, encryptedChoice: string): Promise<void> {
    try {
      const tx = await this.contract.joinGame(gameId, encryptedChoice);
      await tx.wait();
    } catch (error) {
      console.error("Error joining game:", error);
      throw error;
    }
  }

  // Move Submission
  async submitMoves(gameId: number): Promise<void> {
    try {
      const tx = await this.contract.submitMoves(gameId);
      await tx.wait();
    } catch (error) {
      console.error("Error submitting moves:", error);
      throw error;
    }
  }

  // Compute Difference
  async computeDifference(gameId: number): Promise<void> {
    try {
      const tx = await this.contract.computeDifference(gameId);
      await tx.wait();
    } catch (error) {
      console.error("Error computing difference:", error);
      throw error;
    }
  }

  // Verify Moves
  async verifyMoves(gameId: number, proof: string): Promise<void> {
    try {
      const tx = await this.contract.verifyMoves(gameId, proof);
      await tx.wait();
    } catch (error) {
      console.error("Error verifying moves:", error);
      throw error;
    }
  }

  // Finalize Game
  async finalizeGame(gameId: number, diffMod3: number): Promise<void> {
    try {
      const tx = await this.contract.finalizeGame(gameId, diffMod3);
      await tx.wait();
    } catch (error) {
      console.error("Error finalizing game:", error);
      throw error;
    }
  }

  // Get Game Info
  async getGameInfo(gameId: number) {
    try {
      const info = await this.contract.getGameInfo(gameId);
      return {
        playerA: info.playerA,
        playerB: info.playerB,
        winner: info.winner,
        finished: info.finished,
        bothCommitted: info.bothCommitted,
        encryptedChoiceA: info.encA,
        encryptedChoiceB: info.encB,
        differenceCipher: info.differenceCipher,
        revealedDiff: info.revealedDiff.toNumber(),
      };
    } catch (error) {
      console.error("Error getting game info:", error);
      throw error;
    }
  }

  // Get Game State
  async getGameState(gameId: number): Promise<number> {
    try {
      const state = await this.contract.getGameState(gameId);
      return state.toNumber();
    } catch (error) {
      console.error("Error getting game state:", error);
      throw error;
    }
  }

  // Get Player Stats
  async getPlayerStats(address: string) {
    try {
      const stats = await this.contract.getPlayerStats(address);
      return {
        wins: stats.wins.toNumber(),
        losses: stats.losses.toNumber(),
        draws: stats.draws.toNumber(),
      };
    } catch (error) {
      console.error("Error getting player stats:", error);
      throw error;
    }
  }

  // Listen to events
  listenToGameCreated(callback: (gameId: number, playerA: string) => void) {
    this.addEventListener("GameCreated", ({ gameId, playerA }) => {
      callback(gameId.toNumber(), playerA);
    });
  }

  listenToGameJoined(callback: (gameId: number, playerB: string) => void) {
    this.addEventListener("GameJoined", ({ gameId, playerB }) => {
      callback(gameId.toNumber(), playerB);
    });
  }

  listenToMovesSubmitted(callback: (gameId: number) => void) {
    this.addEventListener("MovesSubmitted", ({ gameId }) => {
      callback(gameId.toNumber());
    });
  }

  listenToDifferenceComputed(callback: (gameId: number, differenceCipher: string) => void) {
    this.addEventListener("DifferenceComputed", ({ gameId, differenceCipher }) => {
      callback(gameId.toNumber(), differenceCipher);
    });
  }

  listenToMovesVerified(callback: (gameId: number) => void) {
    this.addEventListener("MovesVerified", ({ gameId }) => {
      callback(gameId.toNumber());
    });
  }

  listenToGameResolved(callback: (gameId: number, winner: string, diffMod3: number) => void) {
    this.addEventListener("GameResolved", ({ gameId, winner, diffMod3 }) => {
      callback(gameId.toNumber(), winner, diffMod3.toNumber());
    });
  }
}