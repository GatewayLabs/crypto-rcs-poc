import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const Providers = dynamic(() => import("./providers"), {
  ssr: false,
});

export const metadata: Metadata = {
  title: "ERPS - Wager your $MON on Encrypted RPS",
  description:
    "A provably fair version of Rock-Paper-Scissors built with Gateway's GVM architecture on Monad. Wager your $MON and climb the leaderboard!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
