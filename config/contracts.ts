import { ElGamalPublicKey, FIELD_MODULUS } from '@/lib/crypto/elgamal';

export const GAME_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
export const HOUSE_BATCHER_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_HOUSE_BATCHER_ADDRESS!;

export const PAILLIER_PUBLIC_KEY = {
  n: process.env.NEXT_PUBLIC_PAILLIER_N!,
  g: process.env.NEXT_PUBLIC_PAILLIER_G!,
} as const;

export const ELGAMAL_PUBLIC_KEY = {
  G: {
    x: BigInt(process.env.NEXT_PUBLIC_ELGAMAL_GEN_X!),
    y: BigInt(process.env.NEXT_PUBLIC_ELGAMAL_GEN_Y!),
  },
  Q: {
    x: BigInt(process.env.NEXT_PUBLIC_ELGAMAL_X!),
    y: BigInt(process.env.NEXT_PUBLIC_ELGAMAL_Y!),
  },
  p: FIELD_MODULUS,
} as ElGamalPublicKey;

export const gameContractConfig = {
  address: GAME_CONTRACT_ADDRESS as `0x${string}`,
  abi: [
    {
      inputs: [
        {
          internalType: 'address',
          name: '_owner',
          type: 'address',
        },
        {
          internalType: 'contract ECCElGamal',
          name: '_elgamal',
          type: 'address',
        },
        {
          components: [
            {
              components: [
                {
                  internalType: 'uint256',
                  name: 'x',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'y',
                  type: 'uint256',
                },
              ],
              internalType: 'struct ECPoint',
              name: 'Q',
              type: 'tuple',
            },
          ],
          internalType: 'struct PublicKey',
          name: '_pk',
          type: 'tuple',
        },
        {
          internalType: 'address',
          name: '_house',
          type: 'address',
        },
        {
          internalType: 'uint16',
          name: '_fee',
          type: 'uint16',
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
          internalType: 'uint256',
          name: 'diff_c1_x',
          type: 'uint256',
        },
        {
          indexed: false,
          internalType: 'uint256',
          name: 'diff_c1_y',
          type: 'uint256',
        },
        {
          indexed: false,
          internalType: 'uint256',
          name: 'diff_c2_x',
          type: 'uint256',
        },
        {
          indexed: false,
          internalType: 'uint256',
          name: 'diff_c2_y',
          type: 'uint256',
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
        {
          indexed: false,
          internalType: 'bytes32',
          name: 'hashMoveA',
          type: 'bytes32',
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
        {
          indexed: false,
          internalType: 'bytes32',
          name: 'hashMoveB',
          type: 'bytes32',
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
          internalType: 'uint256',
          name: 'encMoveA_c1_x',
          type: 'uint256',
        },
        {
          indexed: false,
          internalType: 'uint256',
          name: 'encMoveA_c1_y',
          type: 'uint256',
        },
        {
          indexed: false,
          internalType: 'uint256',
          name: 'encMoveA_c2_x',
          type: 'uint256',
        },
        {
          indexed: false,
          internalType: 'uint256',
          name: 'encMoveA_c2_y',
          type: 'uint256',
        },
        {
          indexed: false,
          internalType: 'uint256',
          name: 'encMoveB_c1_x',
          type: 'uint256',
        },
        {
          indexed: false,
          internalType: 'uint256',
          name: 'encMoveB_c1_y',
          type: 'uint256',
        },
        {
          indexed: false,
          internalType: 'uint256',
          name: 'encMoveB_c2_x',
          type: 'uint256',
        },
        {
          indexed: false,
          internalType: 'uint256',
          name: 'encMoveB_c2_y',
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
          internalType: 'bytes32',
          name: 'hashMoveA',
          type: 'bytes32',
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
      inputs: [],
      name: 'elgamal',
      outputs: [
        {
          internalType: 'contract ECCElGamal',
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
          internalType: 'uint16',
          name: '',
          type: 'uint16',
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
        {
          components: [
            {
              components: [
                {
                  internalType: 'uint256',
                  name: 'x',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'y',
                  type: 'uint256',
                },
              ],
              internalType: 'struct ECPoint',
              name: 'c1',
              type: 'tuple',
            },
            {
              components: [
                {
                  internalType: 'uint256',
                  name: 'x',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'y',
                  type: 'uint256',
                },
              ],
              internalType: 'struct ECPoint',
              name: 'c2',
              type: 'tuple',
            },
          ],
          internalType: 'struct Ciphertext',
          name: 'diffCipher',
          type: 'tuple',
        },
      ],
      name: 'finalizeGame',
      outputs: [],
      stateMutability: 'nonpayable',
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
          internalType: 'bytes32',
          name: 'hashMoveA',
          type: 'bytes32',
        },
        {
          internalType: 'bytes32',
          name: 'hashMoveB',
          type: 'bytes32',
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
          internalType: 'bytes32',
          name: 'hashDifference',
          type: 'bytes32',
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
          internalType: 'bytes32',
          name: 'hashMoveA',
          type: 'bytes32',
        },
        {
          internalType: 'bytes32',
          name: 'hashMoveB',
          type: 'bytes32',
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
          internalType: 'bytes32',
          name: 'hashDifference',
          type: 'bytes32',
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
      inputs: [
        {
          internalType: 'uint256',
          name: 'gameId',
          type: 'uint256',
        },
        {
          internalType: 'bytes32',
          name: 'hashMoveB',
          type: 'bytes32',
        },
        {
          components: [
            {
              components: [
                {
                  internalType: 'uint256',
                  name: 'x',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'y',
                  type: 'uint256',
                },
              ],
              internalType: 'struct ECPoint',
              name: 'c1',
              type: 'tuple',
            },
            {
              components: [
                {
                  internalType: 'uint256',
                  name: 'x',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'y',
                  type: 'uint256',
                },
              ],
              internalType: 'struct ECPoint',
              name: 'c2',
              type: 'tuple',
            },
          ],
          internalType: 'struct Ciphertext',
          name: 'encMoveA',
          type: 'tuple',
        },
        {
          components: [
            {
              components: [
                {
                  internalType: 'uint256',
                  name: 'x',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'y',
                  type: 'uint256',
                },
              ],
              internalType: 'struct ECPoint',
              name: 'c1',
              type: 'tuple',
            },
            {
              components: [
                {
                  internalType: 'uint256',
                  name: 'x',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'y',
                  type: 'uint256',
                },
              ],
              internalType: 'struct ECPoint',
              name: 'c2',
              type: 'tuple',
            },
          ],
          internalType: 'struct Ciphertext',
          name: 'encMoveB',
          type: 'tuple',
        },
      ],
      name: 'joinGame',
      outputs: [],
      stateMutability: 'payable',
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
          components: [
            {
              internalType: 'uint256',
              name: 'x',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'y',
              type: 'uint256',
            },
          ],
          internalType: 'struct ECPoint',
          name: 'Q',
          type: 'tuple',
        },
      ],
      stateMutability: 'view',
      type: 'function',
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
          internalType: 'uint16',
          name: 'newFeePercent',
          type: 'uint16',
        },
      ],
      name: 'setFeePercent',
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
          internalType: 'uint256',
          name: 'gameId',
          type: 'uint256',
        },
        {
          internalType: 'bytes32',
          name: 'hashMoveB',
          type: 'bytes32',
        },
        {
          components: [
            {
              components: [
                {
                  internalType: 'uint256',
                  name: 'x',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'y',
                  type: 'uint256',
                },
              ],
              internalType: 'struct ECPoint',
              name: 'c1',
              type: 'tuple',
            },
            {
              components: [
                {
                  internalType: 'uint256',
                  name: 'x',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'y',
                  type: 'uint256',
                },
              ],
              internalType: 'struct ECPoint',
              name: 'c2',
              type: 'tuple',
            },
          ],
          internalType: 'struct Ciphertext',
          name: 'encMoveA',
          type: 'tuple',
        },
        {
          components: [
            {
              components: [
                {
                  internalType: 'uint256',
                  name: 'x',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'y',
                  type: 'uint256',
                },
              ],
              internalType: 'struct ECPoint',
              name: 'c1',
              type: 'tuple',
            },
            {
              components: [
                {
                  internalType: 'uint256',
                  name: 'x',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'y',
                  type: 'uint256',
                },
              ],
              internalType: 'struct ECPoint',
              name: 'c2',
              type: 'tuple',
            },
          ],
          internalType: 'struct Ciphertext',
          name: 'encMoveB',
          type: 'tuple',
        },
        {
          internalType: 'int256',
          name: 'diffMod3',
          type: 'int256',
        },
        {
          components: [
            {
              components: [
                {
                  internalType: 'uint256',
                  name: 'x',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'y',
                  type: 'uint256',
                },
              ],
              internalType: 'struct ECPoint',
              name: 'c1',
              type: 'tuple',
            },
            {
              components: [
                {
                  internalType: 'uint256',
                  name: 'x',
                  type: 'uint256',
                },
                {
                  internalType: 'uint256',
                  name: 'y',
                  type: 'uint256',
                },
              ],
              internalType: 'struct ECPoint',
              name: 'c2',
              type: 'tuple',
            },
          ],
          internalType: 'struct Ciphertext',
          name: 'diffCipher',
          type: 'tuple',
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
      stateMutability: 'payable',
      type: 'receive',
    },
  ],
} as const;
