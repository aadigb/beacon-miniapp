// src/app/providers.tsx
"use client";

import type { ReactNode } from "react";
import { NeynarProvider } from "@neynar/react";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

const queryClient = new QueryClient();

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <NeynarProvider
      config={{
        apiKey: process.env.NEXT_PUBLIC_NEYNAR_API_KEY as string,
      }}
    >
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </NeynarProvider>
  );
}
