export const GAME_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;

export const PAILLIER_PUBLIC_KEY = {
  n: process.env.NEXT_PUBLIC_PAILLIER_N!,
  g: process.env.NEXT_PUBLIC_PAILLIER_G!,
} as const;

export const gameContractConfig = {
  address: GAME_CONTRACT_ADDRESS as `0x${string}`,
  abi: [
    {
      inputs: [
        {
          internalType: 'uint256',
          name: 'gameId',
          type: 'uint256',
        },
      ],
      name: 'cancelGame',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'uint256',
          name: 'gameId',
          type: 'uint256',
        },
      ],
      name: 'computeDifference',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'bytes',
          name: 'encChoiceA',
          type: 'bytes',
        },
      ],
      name: 'createGame',
      outputs: [
        {
          internalType: 'uint256',
          name: '',
          type: 'uint256',
        },
      ],
      stateMutability: 'payable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'paillierAddress',
          type: 'address',
        },
        {
          internalType: 'bytes',
          name: '_n',
          type: 'bytes',
        },
        {
          internalType: 'bytes',
          name: '_g',
          type: 'bytes',
        },
        {
          internalType: 'address',
          name: '_house',
          type: 'address',
        },
      ],
      stateMutability: 'nonpayable',
      type: 'constructor',
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: 'uint256',
          name: 'gameId',
          type: 'uint256',
        },
        {
          indexed: false,
          internalType: 'bytes',
          name: 'differenceCipher',
          type: 'bytes',
        },
      ],
      name: 'DifferenceComputed',
      type: 'event',
    },
    {
      inputs: [
        {
          internalType: 'uint256',
          name: 'gameId',
          type: 'uint256',
        },
        {
          internalType: 'int256',
          name: 'diffMod3',
          type: 'int256',
        },
      ],
      name: 'finalizeGame',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: 'uint256',
          name: 'gameId',
          type: 'uint256',
        },
      ],
      name: 'GameCancelled',
      type: 'event',
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: 'uint256',
          name: 'gameId',
          type: 'uint256',
        },
        {
          indexed: true,
          internalType: 'address',
          name: 'playerA',
          type: 'address',
        },
      ],
      name: 'GameCreated',
      type: 'event',
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: 'uint256',
          name: 'gameId',
          type: 'uint256',
        },
        {
          indexed: true,
          internalType: 'address',
          name: 'playerB',
          type: 'address',
        },
      ],
      name: 'GameJoined',
      type: 'event',
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: 'uint256',
          name: 'gameId',
          type: 'uint256',
        },
        {
          indexed: false,
          internalType: 'address',
          name: 'winner',
          type: 'address',
        },
        {
          indexed: false,
          internalType: 'int256',
          name: 'diffMod3',
          type: 'int256',
        },
      ],
      name: 'GameResolved',
      type: 'event',
    },
    {
      inputs: [
        {
          internalType: 'uint256',
          name: 'gameId',
          type: 'uint256',
        },
        {
          internalType: 'bytes',
          name: 'encChoiceB',
          type: 'bytes',
        },
      ],
      name: 'joinGame',
      outputs: [],
      stateMutability: 'payable',
      type: 'function',
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: 'uint256',
          name: 'gameId',
          type: 'uint256',
        },
      ],
      name: 'MovesSubmitted',
      type: 'event',
    },
    {
      inputs: [
        {
          internalType: 'uint256',
          name: 'gameId',
          type: 'uint256',
        },
      ],
      name: 'submitMoves',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [],
      name: 'g',
      outputs: [
        {
          internalType: 'bytes',
          name: '',
          type: 'bytes',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [],
      name: 'gameNonce',
      outputs: [
        {
          internalType: 'uint256',
          name: '',
          type: 'uint256',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'uint256',
          name: '',
          type: 'uint256',
        },
      ],
      name: 'games',
      outputs: [
        {
          internalType: 'uint256',
          name: 'gameId',
          type: 'uint256',
        },
        {
          internalType: 'address',
          name: 'playerA',
          type: 'address',
        },
        {
          internalType: 'address',
          name: 'playerB',
          type: 'address',
        },
        {
          internalType: 'bytes',
          name: 'encryptedChoiceA',
          type: 'bytes',
        },
        {
          internalType: 'bytes',
          name: 'encryptedChoiceB',
          type: 'bytes',
        },
        {
          internalType: 'bool',
          name: 'bothCommitted',
          type: 'bool',
        },
        {
          internalType: 'bytes',
          name: 'differenceCiphertext',
          type: 'bytes',
        },
        {
          internalType: 'int256',
          name: 'revealedDifference',
          type: 'int256',
        },
        {
          internalType: 'address',
          name: 'winner',
          type: 'address',
        },
        {
          internalType: 'bool',
          name: 'finished',
          type: 'bool',
        },
        {
          internalType: 'uint256',
          name: 'betAmount',
          type: 'uint256',
        },
        {
          internalType: 'bool',
          name: 'fundsDistributed',
          type: 'bool',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [],
      name: 'getContractBalance',
      outputs: [
        {
          internalType: 'uint256',
          name: '',
          type: 'uint256',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'uint256',
          name: 'gameId',
          type: 'uint256',
        },
      ],
      name: 'getGameInfo',
      outputs: [
        {
          internalType: 'address',
          name: 'playerA',
          type: 'address',
        },
        {
          internalType: 'address',
          name: 'playerB',
          type: 'address',
        },
        {
          internalType: 'address',
          name: 'winner',
          type: 'address',
        },
        {
          internalType: 'bool',
          name: 'finished',
          type: 'bool',
        },
        {
          internalType: 'bool',
          name: 'bothCommitted',
          type: 'bool',
        },
        {
          internalType: 'bytes',
          name: 'encA',
          type: 'bytes',
        },
        {
          internalType: 'bytes',
          name: 'encB',
          type: 'bytes',
        },
        {
          internalType: 'bytes',
          name: 'differenceCipher',
          type: 'bytes',
        },
        {
          internalType: 'int256',
          name: 'revealedDiff',
          type: 'int256',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [],
      name: 'house',
      outputs: [
        {
          internalType: 'address',
          name: '',
          type: 'address',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [],
      name: 'n',
      outputs: [
        {
          internalType: 'bytes',
          name: '',
          type: 'bytes',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [],
      name: 'paillier',
      outputs: [
        {
          internalType: 'contract Paillier',
          name: '',
          type: 'address',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
  ],
} as const;
