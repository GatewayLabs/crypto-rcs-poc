import {
  gameContractConfig,
  houseBatcherContractConfig,
} from '@/config/contracts';
import { houseAccount, houseAccount2, publicClient } from '@/config/server';
import { ethers } from 'ethers';

const query = `
  query {
    globalStat(id: "global") {
      totalPlayers
      totalGamesCreated
      totalBetAmount
      totalFeesCollected
      totalGasFeesCollected
    }
  }
`;

const discordMessage = (data: any) => {
  return {
    content: null,
    embeds: [
      {
        title: 'ERPS - Lifetime Statistics',
        color: 5814783,
        fields: [
          {
            name: 'Total Players',
            value: data.globalStat.totalPlayers.toLocaleString(),
          },
          {
            name: 'Total Games Created',
            value: data.globalStat.totalGamesCreated.toLocaleString(),
          },
          {
            name: 'Total Bet Amount',
            value: data.globalStat.totalBetAmount + ' MON',
          },
          {
            name: 'Total Fees Collected',
            value: data.globalStat.totalFeesCollected + ' MON',
          },
          {
            name: 'Total Gas Fees Collected',
            value: data.globalStat.totalGasFeesCollected + ' MON',
          },
        ],
      },
      {
        title: 'ERPS - EOA & Smart Contract Balances',
        description: `**Note:** This gets triggered every hour to keep the team updated on the current balances and how much money we have on the EOAs/smart contracts.\n**Current State:** ${
          data.state === 'critical'
            ? 'Critical - no money on wallets'
            : 'OK - money on wallets'
        }`,
        color: data.state === 'critical' ? 13369344 : 3263488,
        fields: [
          {
            name: `House (${houseBatcherContractConfig.address})`,
            value: data.balances.houseBatcher + ' MON',
          },
          {
            name: `EOA no. 1 (${houseAccount.address})`,
            value: data.balances.houseAccount + ' MON',
          },
          {
            name: `EOA no. 2 (${houseAccount2.address})`,
            value: data.balances.houseAccount2 + ' MON',
          },
          {
            name: `RPS Contract (${gameContractConfig.address})`,
            value: `${data.balances.gameContract} MON\n*This includes money in escrow and uncollected fees*`,
          },
        ],
      },
    ],
    type: 1,
    username: 'ERPS Patrol 🚨',
    attachments: [],
  };
};

export async function GET() {
  const response = await fetch(process.env.NEXT_PUBLIC_SUBGRAPH_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  const { data } = await response.json();

  // Get balances
  const balances = await Promise.all([
    publicClient.getBalance({
      address: houseBatcherContractConfig.address,
    }),
    publicClient.getBalance({
      address: houseAccount.address,
    }),
    publicClient.getBalance({
      address: houseAccount2.address,
    }),
    publicClient.getBalance({
      address: gameContractConfig.address,
    }),
  ]);

  const state =
    balances[0] <= 1.5 || balances[1] <= 1.5 || balances[2] <= 1.5
      ? 'critical'
      : 'ok';

  const body = discordMessage({
    balances: {
      houseBatcher: ethers.formatEther(balances[0]),
      houseAccount: ethers.formatEther(balances[1]),
      houseAccount2: ethers.formatEther(balances[2]),
      gameContract: ethers.formatEther(balances[3]),
    },
    globalStat: {
      totalPlayers: data.globalStat.totalPlayers.toLocaleString(),
      totalGamesCreated: data.globalStat.totalGamesCreated.toLocaleString(),
      totalBetAmount: ethers.formatEther(data.globalStat.totalBetAmount),
      totalFeesCollected: ethers.formatEther(
        data.globalStat.totalFeesCollected ?? 0,
      ),
      totalGasFeesCollected: ethers.formatEther(
        data.globalStat.totalGasFeesCollected ?? 0,
      ),
    },
    state,
  });

  const discordResponse = await fetch(process.env.DISCORD_WEBHOOK_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!discordResponse.ok) {
    const errorText = await discordResponse.text();
    console.error('Discord webhook error:', discordResponse.status, errorText);
    return Response.json(
      {
        error: 'Discord webhook failed',
        status: discordResponse.status,
        details: errorText,
      },
      { status: 500 },
    );
  }

  let discordResponseData;
  try {
    const responseText = await discordResponse.text();
    if (responseText) {
      try {
        discordResponseData = JSON.parse(responseText);
        console.log('Discord webhook response:', discordResponseData);
      } catch (parseError) {
        console.log('Discord webhook response (non-JSON):', responseText);
      }
    } else {
      console.log('Discord webhook response: Empty response');
    }
  } catch (error) {
    console.error('Error processing Discord webhook response:', error);
  }

  return Response.json({
    ...data,
    balances: {
      houseBatcher: ethers.formatEther(balances[0]),
      houseAccount: ethers.formatEther(balances[1]),
      houseAccount2: ethers.formatEther(balances[2]),
      gameContract: ethers.formatEther(balances[3]),
    },
    discordWebhookStatus: discordResponse.ok ? 'success' : 'failed',
  });
}
