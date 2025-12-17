// src/lib/wagmi.ts
import { http, createConfig } from "wagmi";
import { base } from "wagmi/chains";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";

export const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  connectors: [
    // This uses the Farcaster in-app wallet provider
    farcasterMiniApp(),
  ],
  ssr: true,
});