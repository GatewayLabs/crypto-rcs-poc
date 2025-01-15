export const GAME_CONTRACT_ADDRESS = '0x208DA3405b058A88a5979ED1Fc10F30167FECf17';

export const PAILLIER_PUBLIC_KEY = {
  n: "d41b0eecfd3859b51397d044bf203aecc85fcce132a623ca9906dc1e3052c2337dd9dbc515acf68bc9f110c5cfdc21b8d9bf894bd41895a3aaca7a7f87e5ee3ab97f73c84de21e8e4ceaa87b457163e102cd21b70565a681a3c300a36e1931f456a491a49b7033618d27d9d6d1c36818c71112142c110b5d2033d42067121d90123d0e3d02db8fe381e9df840b5aeacf3035433e90cd888b61b9d24dc9b3016f7f48d6b226867fd26a864a9dd3350629da6cfcdb617f8018605d15c708c8844269bf08d632893fbd96446eadee5edf725d7d7ed602a8860e72c6c6521ca2e45e0e4d0a8dc5ac2f10e20f70fd16dc3974b8b1be6700ea98b5a0ae9479e3a85db9",
  g: "97864174ea4954b819ea5052845547c1176bcb6eb5355f197ae95e91b0bcbe68a7180ed730d305fd89fbfa2b325ea664b78cc74aaa248998bac476b2a641b67859c156b8d511a96ad94959668be12237ace7edbbcd5c9d76578a7c9897379940b974d1b2f4dd4466a0f44c501186db9e382f6a45038fbefe3e26c91f45fc813a76245a81f5aa2647173d79d965dbe6f6983990c0d53c971b75c8dc96fae19a2185ba115208f6eb47b0152ff5010c727c72949b91c8878b9327045f57a17427533d97b01ff5cbb2bc2b085c427850731e9d9e9e0de5382e084a9930c5d5e2d324af3d8195d96bd360927a02172037b4c25dba82a55e3229f463b3e3728320083307c8f567df4ee45a72e1d27ee03d1c7ee3deb6536e8257021e01c85a818e863d18dac3631a71adc0f9786d59ad99a394be6a714f4e9bf6b6d49440cd6e61a3693eb5d876ce5942d3de6ed18754f0d393d168f52469cbc9a489af6082e6ee136405f5858cdd6ade873c407b96d4d6135b2d1c48372a84db80314519babb0898e15a2c3955607982df10aca31ad2ee78e7e054a2ee708cbaeb4d1d5acb374eb647db3b26a504e246ed8c2a75cb3bb21986f85ea96f3d2124e4b19491b28933e527a9b39dc253859ef1035c29587ce72a07dab431858da90b08178e13ca5b25fca7f049fd1233e58f23d12196be0267451fb8174b2b41c7e54234f20474a2a9cfff"
} as const;

export const gameContractConfig = {
  address: GAME_CONTRACT_ADDRESS,
  abi: [
    // Game creation and joining
    {
      name: "createGame",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [{ name: "encChoiceA", type: "bytes" }],
      outputs: [{ name: "", type: "uint256" }],
    },
    {
      name: "joinGame",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "gameId", type: "uint256" },
        { name: "encChoiceB", type: "bytes" }
      ],
      outputs: [],
    },
    // Move submission and verification
    {
      name: "submitMoves",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [{ name: "gameId", type: "uint256" }],
      outputs: [],
    },
    {
      name: "computeDifference",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [{ name: "gameId", type: "uint256" }],
      outputs: [],
    },
    {
      name: "verifyMoves",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "gameId", type: "uint256" },
        { name: "proof", type: "bytes" }
      ],
      outputs: [],
    },
    {
      name: "finalizeGame",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "gameId", type: "uint256" },
        { name: "diffMod3", type: "int256" }
      ],
      outputs: [],
    },
    // Game info and state
    {
      name: "getGameInfo",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "gameId", type: "uint256" }],
      outputs: [
        { name: "playerA", type: "address" },
        { name: "playerB", type: "address" },
        { name: "winner", type: "address" },
        { name: "finished", type: "bool" },
        { name: "bothCommitted", type: "bool" },
        { name: "encA", type: "bytes" },
        { name: "encB", type: "bytes" },
        { name: "differenceCipher", type: "bytes" },
        { name: "revealedDiff", type: "int256" }
      ],
    },
    {
      name: "getGameState",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "gameId", type: "uint256" }],
      outputs: [{ name: "", type: "uint8" }],
    },
    {
      name: "getPlayerStats",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "player", type: "address" }],
      outputs: [
        { name: "wins", type: "uint256" },
        { name: "losses", type: "uint256" },
        { name: "draws", type: "uint256" }
      ],
    },
    // Events
    {
      type: "event",
      name: "GameCreated",
      inputs: [
        { indexed: true, name: "gameId", type: "uint256" },
        { indexed: true, name: "playerA", type: "address" }
      ],
    },
    {
      type: "event",
      name: "GameJoined",
      inputs: [
        { indexed: true, name: "gameId", type: "uint256" },
        { indexed: true, name: "playerB", type: "address" }
      ],
    },
    {
      type: "event",
      name: "MovesSubmitted",
      inputs: [{ indexed: true, name: "gameId", type: "uint256" }],
    },
    {
      type: "event",
      name: "DifferenceComputed",
      inputs: [
        { indexed: true, name: "gameId", type: "uint256" },
        { indexed: false, name: "differenceCipher", type: "bytes" }
      ],
    },
    {
      type: "event",
      name: "MovesVerified",
      inputs: [{ indexed: true, name: "gameId", type: "uint256" }],
    },
    {
      type: "event",
      name: "GameResolved",
      inputs: [
        { indexed: true, name: "gameId", type: "uint256" },
        { indexed: false, name: "winner", type: "address" },
        { indexed: false, name: "diffMod3", type: "int256" }
      ],
    },
  ],
} as const;