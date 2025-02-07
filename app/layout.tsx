import type { Metadata } from "next";
import "./globals.css";
import dynamic from "next/dynamic";

const ClientLayout = dynamic(() => import("./client-layout"), {
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
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
