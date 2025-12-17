"use client";

import { MiniAppProvider } from "@neynar/react";

export default function NeynarProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MiniAppProvider>{children}</MiniAppProvider>;
}
