import { Chain } from "wagmi/chains";

export const shield = {
  id: 678746,
  rpcUrls: {
    default: { http: ["https://gateway-shield-testnet.rpc.caldera.xyz/http"] },
  },
  name: "Gateway Shield Testnet",
  nativeCurrency: {
    name: "Gateway",
    symbol: "OWN",
    decimals: 18,
  },
  blockExplorers: {
    default: {
      name: "Gateway Shield Explorer",
      url: "https://gateway-shield-testnet.explorer.caldera.xyz/",
    },
  },
} as const satisfies Chain;
