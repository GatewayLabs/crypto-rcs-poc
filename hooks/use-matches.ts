import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount, usePublicClient } from "wagmi";
import { GameHistory, GameResult } from "@/types/game";
import { Move } from "@/lib/crypto";
import { gameContractConfig } from "@/config/contracts";

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
        // Get all GameResolved events
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
          }
        > = {};

        for (const event of createdEvents) {
          if (event.args && event.args.gameId && event.args.playerA) {
            const gameId = event.args.gameId.toString();
            gameData[gameId] = {
              ...gameData[gameId],
              playerA: event.args.playerA.toLowerCase(),
              playerB: "",
              createdBlock: event.blockNumber,
            };
          }
        }

        for (const event of joinedEvents) {
          if (event.args && event.args.gameId && event.args.playerB) {
            const gameId = event.args.gameId.toString();
            if (gameData[gameId]) {
              gameData[gameId].playerB = event.args.playerB.toLowerCase();
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
          if (!game.resolvedBlock || !game.diffMod3) continue;

          let timestamp = Date.now();
          try {
            const block = await publicClient.getBlock({
              blockNumber: game.resolvedBlock,
            });
            timestamp = Number(block.timestamp) * 1000;
          } catch (error) {
            console.error("Error fetching block timestamp:", error);
          }

          // Determine the player's move and opponent's move
          // For Rock-Paper-Scissors with Paillier:
          // diffMod3 = 0 => tie
          // diffMod3 = 1 => player A wins
          // diffMod3 = 2 => player B wins
          let playerMove: Move;
          let houseMove: Move;
          let result: GameResult;

          // Infer moves from diffMod3
          // This is approximate since we can't know the exact moves without decryption
          // We're reconstructing probable moves based on the game rules
          const diffMod3Value = Number(game.diffMod3 % 3n);

          if (diffMod3Value === 0) {
            // It's a tie, so both players chose the same move
            playerMove = "ROCK";
            houseMove = "ROCK";
            result = "DRAW";
          } else if (diffMod3Value === 1) {
            // Player A wins
            if (isPlayerA) {
              // Current user is player A and won
              playerMove = "ROCK";
              houseMove = "SCISSORS";
              result = "WIN";
            } else {
              // Current user is player B and lost
              playerMove = "SCISSORS";
              houseMove = "ROCK";
              result = "LOSE";
            }
          } else {
            // diffMod3Value === 2
            // Player B wins
            if (isPlayerB) {
              // Current user is player B and won
              playerMove = "ROCK";
              houseMove = "SCISSORS";
              result = "WIN";
            } else {
              // Current user is player A and lost
              playerMove = "SCISSORS";
              houseMove = "ROCK";
              result = "LOSE";
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
