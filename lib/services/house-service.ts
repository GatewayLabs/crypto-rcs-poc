import { GameContract } from '@/lib/contracts/GameContract';
import { encryptMove, Move } from '@/lib/crypto';
import { ethers } from 'ethers';

export class HouseService {
  private contract: GameContract;
  private gameQueue: Map<number, {
    playerMove: string;
    houseMove: string;
    status: 'pending' | 'processing' | 'finalizing';
    timestamp: number;
  }>;

  constructor(provider: ethers.BrowserProvider) {
    this.contract = new GameContract(provider);
    this.gameQueue = new Map();
    this.initializeEventListeners();
  }

  private initializeEventListeners() {
    // Listen for new games
    this.contract.listenToGameCreated(async (gameId, playerA) => {
      try {
        // Generate and encrypt house move
        const houseMove = this.generateHouseMove();
        const encryptedHouseMove = await encryptMove(houseMove);
        
        // Join the game
        await this.contract.joinGame(gameId, encryptedHouseMove);
        
        // Store game state
        this.gameQueue.set(gameId, {
          playerMove: '',
          houseMove: encryptedHouseMove,
          status: 'pending',
          timestamp: Date.now()
        });
        
        // Start processing after a short delay
        setTimeout(() => this.processGame(gameId), 2000);
      } catch (error) {
        console.error(`Error handling game ${gameId}:`, error);
      }
    });

    // Clean up old games periodically
    setInterval(() => this.cleanupOldGames(), 3600000); // Every hour
  }

  private generateHouseMove(): Move {
    // Generate random move with slight bias towards ROCK
    const moves: Move[] = ['ROCK', 'PAPER', 'SCISSORS'];
    const weights = [0.4, 0.3, 0.3]; // 40% ROCK, 30% PAPER, 30% SCISSORS
    
    const random = Math.random();
    let sum = 0;
    
    for (let i = 0; i < weights.length; i++) {
      sum += weights[i];
      if (random <= sum) {
        return moves[i];
      }
    }
    
    return 'ROCK'; // Fallback
  }

  private async processGame(gameId: number) {
    const game = this.gameQueue.get(gameId);
    if (!game || game.status !== 'pending') return;

    try {
      // Update status
      game.status = 'processing';
      this.gameQueue.set(gameId, game);

      // Submit moves
      await this.contract.submitMoves(gameId);
      
      // Wait for a bit before computing difference
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Compute difference
      await this.contract.computeDifference(gameId);
      
      // Wait for a bit before finalizing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get game info and finalize
      const info = await this.contract.getGameInfo(gameId);
      if (info.differenceCipher) {
        // TODO: Decrypt difference using Paillier private key
        // For now, we'll use a random result
        const diffMod3 = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
        
        // Finalize game
        await this.contract.finalizeGame(gameId, diffMod3);
        
        // Update status
        game.status = 'finalizing';
        this.gameQueue.set(gameId, game);
      }
    } catch (error) {
      console.error(`Error processing game ${gameId}:`, error);
      
      // Reset status to retry
      game.status = 'pending';
      this.gameQueue.set(gameId, game);
      
      // Retry after delay
      setTimeout(() => this.processGame(gameId), 5000);
    }
  }

  private cleanupOldGames() {
    const now = Date.now();
    for (const [gameId, game] of this.gameQueue.entries()) {
      // Remove games older than 1 hour
      if (now - game.timestamp > 3600000) {
        this.gameQueue.delete(gameId);
      }
    }
  }

  // Expose method to check house state
  async getHouseState() {
    return {
      activeGames: this.gameQueue.size,
      pendingGames: Array.from(this.gameQueue.values()).filter(g => g.status === 'pending').length,
      processingGames: Array.from(this.gameQueue.values()).filter(g => g.status === 'processing').length,
      finalizingGames: Array.from(this.gameQueue.values()).filter(g => g.status === 'finalizing').length
    };
  }
}
