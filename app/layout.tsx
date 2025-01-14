import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { GameProvider } from "@/context/game-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Crypto Rock Paper Scissors",
  description: "A decentralized Rock Paper Scissors game with cryptographic commitments",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900 to-violet-900">
          <GameProvider>
            {children}
          </GameProvider>
        </div>
      </body>
    </html>
  );
}
