import { Chain } from "wagmi/chains";

export const monad = {
  id: 678746,
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz/"] },
  },
  name: "Monad Testnet",
  nativeCurrency: {
    name: "Monad",
    symbol: "MON",
    decimals: 18,
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://testnet.monadexplorer.com/",
    },
  },
} as const satisfies Chain;
