// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { MiniAppProvider } from "@neynar/react";
import { WagmiConfig } from "wagmi";
import { wagmiConfig } from "../lib/wagmi";

export const metadata: Metadata = {
  title: "Beacon",
  description: "Token Q&A for Farcaster devs and holders",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <MiniAppProvider analyticsEnabled>
          <WagmiConfig config={wagmiConfig}>{children}</WagmiConfig>
        </MiniAppProvider>
      </body>
    </html>
  );
}
