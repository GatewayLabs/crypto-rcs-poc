import { createConfig } from "@privy-io/wagmi";
import { baseSepolia } from "viem/chains";
import { monad } from "./chains";
import { http } from "viem";

export const config = createConfig({
  chains: [baseSepolia, monad],
  transports: {
    [baseSepolia.id]: http(),
    [monad.id]: http(),
  },
  ssr: true,
});
