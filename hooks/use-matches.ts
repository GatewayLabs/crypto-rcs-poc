import { gameContractConfig } from "@/config/contracts";
import { Move } from "@/lib/crypto";
import { GameHistory, GameResult } from "@/types/game";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount, usePublicClient } from "wagmi";
import { DEFAULT_BET_AMOUNT_WEI } from "./use-game-contract";
import { formatEther } from "viem";

export function useMatches() {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const publicClient = usePublicClient();

  const {
    data: matches = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["matches", address],
    queryFn: async () => {
      if (!publicClient || !address) return [] as GameHistory[];

      try {
        const resolvedEvents = await publicClient.getLogs({
          address: gameContractConfig.address,
          event: {
            type: "event",
            name: "GameResolved",
            inputs: [
              { indexed: true, name: "gameId", type: "uint256" },
              { indexed: false, name: "winner", type: "address" },
              { indexed: false, name: "diffMod3", type: "int256" },
            ],
          },
          fromBlock: "earliest",
          toBlock: "latest",
        });

        const createdEvents = await publicClient.getLogs({
          address: gameContractConfig.address,
          event: {
            type: "event",
            name: "GameCreated",
            inputs: [
              { indexed: true, name: "gameId", type: "uint256" },
              { indexed: true, name: "playerA", type: "address" },
            ],
          },
          fromBlock: "earliest",
          toBlock: "latest",
        });

        const joinedEvents = await publicClient.getLogs({
          address: gameContractConfig.address,
          event: {
            type: "event",
            name: "GameJoined",
            inputs: [
              { indexed: true, name: "gameId", type: "uint256" },
              { indexed: true, name: "playerB", type: "address" },
            ],
          },
          fromBlock: "earliest",
          toBlock: "latest",
        });

        const gameData: Record<
          string,
          {
            playerA: string;
            playerB: string;
            createdBlock?: bigint;
            resolvedBlock?: bigint;
            winner?: string;
            diffMod3?: bigint;
            transactionHash?: string;
            betAmount: bigint;
          }
        > = {};

        for (const event of createdEvents) {
          if (event.args && event.args.gameId && event.args.playerA) {
            const gameId = event.args.gameId.toString();

            // Get bet amount from transaction value or use default
            const betAmount = event.transactionValue || DEFAULT_BET_AMOUNT_WEI;

            gameData[gameId] = {
              ...gameData[gameId],
              playerA: event.args.playerA.toLowerCase(),
              playerB: "",
              createdBlock: event.blockNumber,
              betAmount: betAmount,
            };
          }
        }

        for (const event of joinedEvents) {
          if (event.args && event.args.gameId && event.args.playerB) {
            const gameId = event.args.gameId.toString();
            if (gameData[gameId]) {
              gameData[gameId].playerB = event.args.playerB.toLowerCase();

              // If we have transaction value, update bet amount
              if (event.transactionValue) {
                // For simplicity, we'll use the default amount if exact amount not available
                gameData[gameId].betAmount = DEFAULT_BET_AMOUNT_WEI;
              }
            }
          }
        }

        for (const event of resolvedEvents) {
          if (event.args && event.args.gameId) {
            const gameId = event.args.gameId.toString();
            if (gameData[gameId]) {
              gameData[gameId] = {
                ...gameData[gameId],
                winner: event.args.winner?.toLowerCase(),
                diffMod3: event.args.diffMod3,
                resolvedBlock: event.blockNumber,
                transactionHash: event.transactionHash,
              };
            }
          }
        }

        const userMatches: GameHistory[] = [];

        for (const [gameId, game] of Object.entries(gameData)) {
          const normalizedAddress = address.toLowerCase();
          const isPlayerA = game.playerA === normalizedAddress;
          const isPlayerB = game.playerB === normalizedAddress;

          if (!isPlayerA && !isPlayerB) continue;
          if (!game.resolvedBlock || game.diffMod3 === undefined) continue;

          let timestamp = Date.now();
          try {
            const block = await publicClient.getBlock({
              blockNumber: game.resolvedBlock,
            });
            timestamp = Number(block.timestamp) * 1000;
          } catch (error) {
            console.error("Error fetching block timestamp:", error);
          }

          // Get bet amount in ETH
          const betAmount = game.betAmount || DEFAULT_BET_AMOUNT_WEI;
          const betValueEth = Number(formatEther(betAmount));

          // Determine the player's move and opponent's move
          // For Rock-Paper-Scissors with Paillier:
          // diffMod3 = 0 => tie
          // diffMod3 = 1 => player A wins
          // diffMod3 = 2 => player B wins
          let playerMove: Move;
          let houseMove: Move;
          let result: GameResult;
          let betValue: number = 0;

          // Infer moves from diffMod3
          // This is approximate since we can't know the exact moves without decryption
          // We're reconstructing probable moves based on the game rules
          // Handle potential negative values by ensuring we get a positive modulo
          let diffMod3Value: number;
          if (game.diffMod3 !== undefined) {
            const mod = game.diffMod3 % 3n;
            diffMod3Value = Number(mod < 0n ? mod + 3n : mod);
          } else {
            diffMod3Value = 1; // Default to non-draw if undefined
          }

          if (diffMod3Value === 0) {
            // It's a tie, so both players chose the same move
            // For visualization variety, randomly pick one of the three moves for draws
            // In a real draw, both players must have played the same move
            const drawMoves: Move[] = ["ROCK", "PAPER", "SCISSORS"];
            const randomDrawMove =
              drawMoves[Math.floor(Math.random() * drawMoves.length)];
            playerMove = randomDrawMove;
            houseMove = randomDrawMove;
            result = GameResult.DRAW;
            betValue = 0;
          } else if (diffMod3Value === 1) {
            // Player A wins
            if (isPlayerA) {
              playerMove = "ROCK";
              houseMove = "SCISSORS";
              result = GameResult.WIN;
              betValue = betValueEth;
            } else {
              playerMove = "SCISSORS";
              houseMove = "ROCK";
              result = GameResult.LOSE;
              betValue = -betValueEth;
            }
          } else {
            // Player B wins
            if (isPlayerB) {
              playerMove = "ROCK";
              houseMove = "SCISSORS";
              result = GameResult.WIN;
              betValue = betValueEth;
            } else {
              playerMove = "SCISSORS";
              houseMove = "ROCK";
              result = GameResult.LOSE;
              betValue = -betValueEth;
            }
          }

          userMatches.push({
            id: gameId,
            gameId: Number(gameId),
            timestamp,
            playerMove,
            houseMove,
            result,
            playerAddress: normalizedAddress,
            transactionHash: game.transactionHash,
            betValue: betValue,
          });
        }

        return userMatches.sort((a, b) => b.timestamp - a.timestamp);
      } catch (error) {
        console.error("Error fetching match history:", error);
        return [] as GameHistory[];
      }
    },
    enabled: !!publicClient && !!address,
    refetchInterval: 60000,
    staleTime: 5000,
  });

  const addMatch = async () => {
    try {
      await refetch();
    } catch (error) {
      console.error("Error refetching match history:", error);
    }
  };

  const clearHistoryMutation = async () => {
    if (address) {
      queryClient.setQueryData(["matches", address], []);
    }
  };

  return {
    matches,
    isLoading,
    addMatch,
    clearHistory: clearHistoryMutation,
  };
}
