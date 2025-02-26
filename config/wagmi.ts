import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { baseSepolia } from "viem/chains";
import { monad } from "./chains";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

export const config = getDefaultConfig({
  appName: "Crypto Rock Paper Scissors",
  projectId,
  chains: [baseSepolia, monad],
  ssr: true,
});
