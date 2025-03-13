export const GAME_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
export const HOUSE_BATCHER_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_HOUSE_BATCHER_ADDRESS!;

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
          name: 'initialOwner',
          type: 'address',
        },
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
          name: 'differenceCipher',
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
      stateMutability: 'payable',
      type: 'fallback',
    },
    {
      stateMutability: 'payable',
      type: 'receive',
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
          internalType: 'bool',
          name: 'fundsDistributed',
          type: 'bool',
        },
        {
          internalType: 'uint256',
          name: 'gameId',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'betAmount',
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
          internalType: 'address',
          name: 'winner',
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
          internalType: 'bytes',
          name: 'differenceCiphertext',
          type: 'bytes',
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
      name: 'nSquared',
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
          name: 'encChoiceB',
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
