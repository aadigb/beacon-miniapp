"use client";

import React from "react";

type NeynarAuthButtonProps = {
  className?: string;
};

/**
 * Minimal stub for NeynarAuthButton.
 *
 * Beacon already gets Farcaster context from `useMiniApp`
 * and wallet from wagmi, so we don't need the full auth
 * flow here. This avoids the `createContext` runtime error
 * during Next.js build on the /_not-found path.
 */
export function NeynarAuthButton(props: NeynarAuthButtonProps) {
  const { className } = props ?? {};

  // You can render a simple static label or nothing at all.
  // If you aren't using this component anywhere, it's fine
  // that it returns null.
  return (
    <button
      type="button"
      className={className}
      style={{
        borderRadius: 999,
        border: "1px solid rgba(129,140,248,0.7)",
        padding: "6px 12px",
        fontSize: 11,
        background: "rgba(15,23,42,0.96)",
        color: "#e5e7eb",
      }}
    >
      Connected via Farcaster
    </button>
  );
}

export default NeynarAuthButton;
