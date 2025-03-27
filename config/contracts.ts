export const GAME_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
export const HOUSE_BATCHER_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_HOUSE_BATCHER_ADDRESS!;

export const PAILLIER_PUBLIC_KEY = {
  n: process.env.NEXT_PUBLIC_PAILLIER_N!,
  g: process.env.NEXT_PUBLIC_PAILLIER_G!,
} as const;

export const ELGAMAL_PUBLIC_KEY = {
  p: process.env.NEXT_PUBLIC_ELGAMAL_P!,
  g: process.env.NEXT_PUBLIC_ELGAMAL_G!,
  h: process.env.NEXT_PUBLIC_ELGAMAL_H!,
} as const;

export const gameContractConfig = {
  address: GAME_CONTRACT_ADDRESS as `0x${string}`,
  abi: [
    {
      inputs: [
        {
          internalType: 'address',
          name: '_user',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: '_hours',
          type: 'uint256',
        },
      ],
      name: 'banUser',
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
      name: 'cancelGame',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'newHouse',
          type: 'address',
        },
      ],
      name: 'changeHouse',
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
          name: 'c1A',
          type: 'bytes',
        },
        {
          internalType: 'bytes',
          name: 'c2A',
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
      inputs: [
        {
          internalType: 'address',
          name: '_owner',
          type: 'address',
        },
        {
          internalType: 'contract ElGamalAdditive',
          name: '_elgamal',
          type: 'address',
        },
        {
          internalType: 'bytes',
          name: '_p',
          type: 'bytes',
        },
        {
          internalType: 'bytes',
          name: '_g',
          type: 'bytes',
        },
        {
          internalType: 'bytes',
          name: '_h',
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
      inputs: [
        {
          internalType: 'address',
          name: 'owner',
          type: 'address',
        },
      ],
      name: 'OwnableInvalidOwner',
      type: 'error',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'account',
          type: 'address',
        },
      ],
      name: 'OwnableUnauthorizedAccount',
      type: 'error',
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
          name: 'c1',
          type: 'bytes',
        },
        {
          indexed: false,
          internalType: 'bytes',
          name: 'c2',
          type: 'bytes',
        },
      ],
      name: 'DifferenceComputed',
      type: 'event',
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: 'uint256',
          name: 'oldFee',
          type: 'uint256',
        },
        {
          indexed: false,
          internalType: 'uint256',
          name: 'newFee',
          type: 'uint256',
        },
      ],
      name: 'FeePercentageChanged',
      type: 'event',
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: 'address',
          name: 'to',
          type: 'address',
        },
        {
          indexed: false,
          internalType: 'uint256',
          name: 'amount',
          type: 'uint256',
        },
      ],
      name: 'FeesWithdrawn',
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
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: 'address',
          name: 'oldHouse',
          type: 'address',
        },
        {
          indexed: false,
          internalType: 'address',
          name: 'newHouse',
          type: 'address',
        },
      ],
      name: 'HouseChanged',
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
          name: 'c1B',
          type: 'bytes',
        },
        {
          internalType: 'bytes',
          name: 'c2B',
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
          internalType: 'address',
          name: 'previousOwner',
          type: 'address',
        },
        {
          indexed: true,
          internalType: 'address',
          name: 'newOwner',
          type: 'address',
        },
      ],
      name: 'OwnershipTransferred',
      type: 'event',
    },
    {
      inputs: [],
      name: 'renounceOwnership',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'uint256',
          name: 'newFeePercent',
          type: 'uint256',
        },
      ],
      name: 'setFeePercentage',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'newOwner',
          type: 'address',
        },
      ],
      name: 'transferOwnership',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'user',
          type: 'address',
        },
      ],
      name: 'unbanUser',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: 'address',
          name: 'user',
          type: 'address',
        },
        {
          indexed: false,
          internalType: 'uint256',
          name: 'untilTimestamp',
          type: 'uint256',
        },
      ],
      name: 'UserBanned',
      type: 'event',
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: 'address',
          name: 'user',
          type: 'address',
        },
      ],
      name: 'UserUnbanned',
      type: 'event',
    },
    {
      stateMutability: 'payable',
      type: 'fallback',
    },
    {
      inputs: [],
      name: 'withdrawFees',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      stateMutability: 'payable',
      type: 'receive',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: '',
          type: 'address',
        },
      ],
      name: 'bannedUntil',
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
      inputs: [],
      name: 'elgamal',
      outputs: [
        {
          internalType: 'contract ElGamalAdditive',
          name: '',
          type: 'address',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [],
      name: 'feePercent',
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
      inputs: [],
      name: 'feesCollected',
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
          internalType: 'uint256',
          name: 'betAmount',
          type: 'uint256',
        },
        {
          components: [
            {
              internalType: 'bytes',
              name: 'c1',
              type: 'bytes',
            },
            {
              internalType: 'bytes',
              name: 'c2',
              type: 'bytes',
            },
          ],
          internalType: 'struct Ciphertext',
          name: 'encMoveA',
          type: 'tuple',
        },
        {
          components: [
            {
              internalType: 'bytes',
              name: 'c1',
              type: 'bytes',
            },
            {
              internalType: 'bytes',
              name: 'c2',
              type: 'bytes',
            },
          ],
          internalType: 'struct Ciphertext',
          name: 'encMoveB',
          type: 'tuple',
        },
        {
          internalType: 'bool',
          name: 'bothCommitted',
          type: 'bool',
        },
        {
          internalType: 'bool',
          name: 'finished',
          type: 'bool',
        },
        {
          internalType: 'address',
          name: 'winner',
          type: 'address',
        },
        {
          components: [
            {
              internalType: 'bytes',
              name: 'c1',
              type: 'bytes',
            },
            {
              internalType: 'bytes',
              name: 'c2',
              type: 'bytes',
            },
          ],
          internalType: 'struct Ciphertext',
          name: 'differenceCipher',
          type: 'tuple',
        },
        {
          internalType: 'int256',
          name: 'revealedDifference',
          type: 'int256',
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
          internalType: 'uint256',
          name: 'betAmount',
          type: 'uint256',
        },
        {
          components: [
            {
              internalType: 'bytes',
              name: 'c1',
              type: 'bytes',
            },
            {
              internalType: 'bytes',
              name: 'c2',
              type: 'bytes',
            },
          ],
          internalType: 'struct Ciphertext',
          name: 'encMoveA',
          type: 'tuple',
        },
        {
          components: [
            {
              internalType: 'bytes',
              name: 'c1',
              type: 'bytes',
            },
            {
              internalType: 'bytes',
              name: 'c2',
              type: 'bytes',
            },
          ],
          internalType: 'struct Ciphertext',
          name: 'encMoveB',
          type: 'tuple',
        },
        {
          internalType: 'bool',
          name: 'bothCommitted',
          type: 'bool',
        },
        {
          internalType: 'bool',
          name: 'finished',
          type: 'bool',
        },
        {
          internalType: 'address',
          name: 'winner',
          type: 'address',
        },
        {
          components: [
            {
              internalType: 'bytes',
              name: 'c1',
              type: 'bytes',
            },
            {
              internalType: 'bytes',
              name: 'c2',
              type: 'bytes',
            },
          ],
          internalType: 'struct Ciphertext',
          name: 'differenceCipher',
          type: 'tuple',
        },
        {
          internalType: 'int256',
          name: 'revealedDifference',
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
      name: 'owner',
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
      name: 'pk',
      outputs: [
        {
          internalType: 'bytes',
          name: 'p',
          type: 'bytes',
        },
        {
          internalType: 'bytes',
          name: 'g',
          type: 'bytes',
        },
        {
          internalType: 'bytes',
          name: 'h',
          type: 'bytes',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
  ],
} as const;

export const houseBatcherContractConfig = {
  address: HOUSE_BATCHER_CONTRACT_ADDRESS as `0x${string}`,
  abi: [
    {
      inputs: [
        {
          internalType: 'address',
          name: '_rpsAddress',
          type: 'address',
        },
      ],
      stateMutability: 'nonpayable',
      type: 'constructor',
    },
    {
      inputs: [],
      name: 'AccessControlBadConfirmation',
      type: 'error',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'account',
          type: 'address',
        },
        {
          internalType: 'bytes32',
          name: 'neededRole',
          type: 'bytes32',
        },
      ],
      name: 'AccessControlUnauthorizedAccount',
      type: 'error',
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
      name: 'BatchedGameFlowExecuted',
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
          name: 'c1B',
          type: 'bytes',
        },
        {
          internalType: 'bytes',
          name: 'c2B',
          type: 'bytes',
        },
        {
          internalType: 'int256',
          name: 'diffMod3',
          type: 'int256',
        },
        {
          internalType: 'uint256',
          name: 'betAmount',
          type: 'uint256',
        },
      ],
      name: 'batchHouseFlow',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [],
      name: 'deposit',
      outputs: [],
      stateMutability: 'payable',
      type: 'function',
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: 'address',
          name: 'sender',
          type: 'address',
        },
        {
          indexed: false,
          internalType: 'uint256',
          name: 'amount',
          type: 'uint256',
        },
      ],
      name: 'Deposit',
      type: 'event',
    },
    {
      inputs: [
        {
          internalType: 'bytes32',
          name: 'role',
          type: 'bytes32',
        },
        {
          internalType: 'address',
          name: 'account',
          type: 'address',
        },
      ],
      name: 'grantRole',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'bytes32',
          name: 'role',
          type: 'bytes32',
        },
        {
          internalType: 'address',
          name: 'callerConfirmation',
          type: 'address',
        },
      ],
      name: 'renounceRole',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'bytes32',
          name: 'role',
          type: 'bytes32',
        },
        {
          internalType: 'address',
          name: 'account',
          type: 'address',
        },
      ],
      name: 'revokeRole',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: 'bytes32',
          name: 'role',
          type: 'bytes32',
        },
        {
          indexed: true,
          internalType: 'bytes32',
          name: 'previousAdminRole',
          type: 'bytes32',
        },
        {
          indexed: true,
          internalType: 'bytes32',
          name: 'newAdminRole',
          type: 'bytes32',
        },
      ],
      name: 'RoleAdminChanged',
      type: 'event',
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: 'bytes32',
          name: 'role',
          type: 'bytes32',
        },
        {
          indexed: true,
          internalType: 'address',
          name: 'account',
          type: 'address',
        },
        {
          indexed: true,
          internalType: 'address',
          name: 'sender',
          type: 'address',
        },
      ],
      name: 'RoleGranted',
      type: 'event',
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: 'bytes32',
          name: 'role',
          type: 'bytes32',
        },
        {
          indexed: true,
          internalType: 'address',
          name: 'account',
          type: 'address',
        },
        {
          indexed: true,
          internalType: 'address',
          name: 'sender',
          type: 'address',
        },
      ],
      name: 'RoleRevoked',
      type: 'event',
    },
    {
      inputs: [
        {
          internalType: 'uint256',
          name: 'amount',
          type: 'uint256',
        },
      ],
      name: 'withdraw',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: 'address',
          name: 'receiver',
          type: 'address',
        },
        {
          indexed: false,
          internalType: 'uint256',
          name: 'amount',
          type: 'uint256',
        },
      ],
      name: 'Withdrawal',
      type: 'event',
    },
    {
      stateMutability: 'payable',
      type: 'fallback',
    },
    {
      stateMutability: 'payable',
      type: 'receive',
    },
    {
      inputs: [],
      name: 'CALLER_ROLE',
      outputs: [
        {
          internalType: 'bytes32',
          name: '',
          type: 'bytes32',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [],
      name: 'DEFAULT_ADMIN_ROLE',
      outputs: [
        {
          internalType: 'bytes32',
          name: '',
          type: 'bytes32',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'bytes32',
          name: 'role',
          type: 'bytes32',
        },
      ],
      name: 'getRoleAdmin',
      outputs: [
        {
          internalType: 'bytes32',
          name: '',
          type: 'bytes32',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'bytes32',
          name: 'role',
          type: 'bytes32',
        },
        {
          internalType: 'address',
          name: 'account',
          type: 'address',
        },
      ],
      name: 'hasRole',
      outputs: [
        {
          internalType: 'bool',
          name: '',
          type: 'bool',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [],
      name: 'rpsAddress',
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
      inputs: [
        {
          internalType: 'bytes4',
          name: 'interfaceId',
          type: 'bytes4',
        },
      ],
      name: 'supportsInterface',
      outputs: [
        {
          internalType: 'bool',
          name: '',
          type: 'bool',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
  ],
} as const;
