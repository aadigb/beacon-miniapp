// src/providers.tsx
"use client";

import type { ReactNode } from "react";
import { NeynarProvider } from "@neynar/react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "./lib/wagmi"; // this is whatever wagmi config file your template created

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <NeynarProvider
      config={{
        // this should match what you had before in your template
        apiKey: process.env.NEXT_PUBLIC_NEYNAR_API_KEY as string,
        // you can add other Neynar config here if you had it
      }}
    >
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    </NeynarProvider>
  );
}
