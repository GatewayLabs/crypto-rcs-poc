"use client";

import "@rainbow-me/rainbowkit/styles.css";
import Providers from "./providers";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Providers>{children}</Providers>;
}
