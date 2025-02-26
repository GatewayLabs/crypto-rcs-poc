import type { Metadata } from "next";
import dynamic from "next/dynamic";
import "./globals.css";

const Providers = dynamic(() => import("./providers"), {
  ssr: false,
});

export const metadata: Metadata = {
  title: "Crypto Rock Paper Scissors",
  description:
    "A decentralized Rock Paper Scissors game using Paillier encryption",
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
      </body>
    </html>
  );
}
