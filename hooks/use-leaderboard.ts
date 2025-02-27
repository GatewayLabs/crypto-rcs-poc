import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LeaderboardEntry } from "@/types/game";
import { useAccount, usePublicClient } from "wagmi";
import { gameContractConfig } from "@/config/contracts";
import { DEFAULT_BET_AMOUNT_WEI } from "./use-game-contract";
import { formatEther } from "viem";

export function useLeaderboard() {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const publicClient = usePublicClient();

  const {
    data: leaderboard = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      if (!publicClient) return [] as LeaderboardEntry[];

      try {
        const events = await publicClient.getLogs({
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
            betAmount: bigint;
            transactionHash?: string;
          }
        > = {};

        for (const event of createdEvents) {
          if (event.args && event.args.gameId && event.args.playerA) {
            const gameId = event.args.gameId.toString();
            let betAmount = DEFAULT_BET_AMOUNT_WEI;

            // Try to get transaction value
            if (event.transactionHash) {
              try {
                const tx = await publicClient.getTransaction({
                  hash: event.transactionHash,
                });
                if (tx && tx.value > 0n) {
                  betAmount = tx.value;
                }
              } catch (error) {
                console.error("Error fetching transaction:", error);
              }
            }

            gameData[gameId] = {
              playerA: event.args.playerA.toLowerCase(),
              playerB: "",
              betAmount: betAmount,
              transactionHash: event.transactionHash,
            };
          }
        }

        for (const event of joinedEvents) {
          if (event.args && event.args.gameId && event.args.playerB) {
            const gameId = event.args.gameId.toString();
            if (gameData[gameId]) {
              gameData[gameId].playerB = event.args.playerB.toLowerCase();

              if (event.transactionHash) {
                try {
                  const tx = await publicClient.getTransaction({
                    hash: event.transactionHash,
                  });
                  if (tx && tx.value > 0n) {
                    gameData[gameId].betAmount = tx.value;
                  }
                } catch (error) {
                  console.error("Error fetching transaction:", error);
                }
              }
            }
          }
        }

        const playerStats: Record<string, LeaderboardEntry> = {};

        events.forEach((event) => {
          if (!event.args) return;

          const { gameId, winner, diffMod3 } = event.args;
          if (!gameId) return;

          const game = gameData[gameId.toString()];
          if (!game) return;

          const betAmount = game.betAmount;
          const etherAmount = Number(formatEther(betAmount));

          const processPlayerResult = (
            playerAddr: string,
            wonGame: boolean,
            drewGame: boolean
          ) => {
            const normalizedAddr = playerAddr.toLowerCase();

            if (!playerStats[normalizedAddr]) {
              playerStats[normalizedAddr] = {
                address: normalizedAddr,
                gamesPlayed: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                score: 0,
                earnings: 0,
              };
            }

            playerStats[normalizedAddr].gamesPlayed += 1;

            if (drewGame) {
              playerStats[normalizedAddr].draws += 1;
            } else if (wonGame) {
              playerStats[normalizedAddr].wins += 1;
              playerStats[normalizedAddr].score += 1;
              playerStats[normalizedAddr].earnings! += etherAmount;
            } else {
              playerStats[normalizedAddr].losses += 1;
              playerStats[normalizedAddr].score -= 1;
              playerStats[normalizedAddr].earnings! -= etherAmount;
            }
          };

          const isDraw = diffMod3 === BigInt(0);
          const playerAWon = winner?.toLowerCase() === game.playerA;
          const playerBWon = winner?.toLowerCase() === game.playerB;

          processPlayerResult(game.playerA, playerAWon, isDraw);
          if (game.playerB) {
            processPlayerResult(game.playerB, playerBWon, isDraw);
          }
        });

        return Object.values(playerStats).sort(
          (a, b) => (b.earnings ?? 0) - (a.earnings ?? 0)
        );
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
        return [] as LeaderboardEntry[];
      }
    },
    enabled: !!publicClient,
    refetchInterval: 60000,
    staleTime: 5000,
  });

  const updateLeaderboard = async () => {
    try {
      await refetch();
    } catch (error) {
      console.error("Error refetching leaderboard:", error);
    }
  };

  return {
    leaderboard,
    isLoading,
    updateLeaderboard,
  };
}
