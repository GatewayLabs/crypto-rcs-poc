import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { shield } from "./chains";

// Only used for client-side configuration
export const config = getDefaultConfig({
  appName: "Crypto Rock Paper Scissors",
  projectId: "YOUR_PROJECT_ID",
  chains: [shield],
  ssr: true,
});
