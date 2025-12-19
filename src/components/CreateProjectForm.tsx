"use client";

import { useState } from "react";
import { mutate } from "swr";

export function CreateProjectForm() {
  // 1️⃣ Form state (THIS is your payload)
  const [payload, setPayload] = useState({
    tokenSymbol: "",
    tokenAddress: "",
    chain: "base-mainnet",
    adminWallet: "",
    adminFid: 0,
    adminUsername: "",
  });

  // 2️⃣ Event handler (GOES HERE)
  async function handleCreateToken() {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      alert("Failed to create token");
      return;
    }

    // 🔥 Refresh ProjectsPanel instantly
    mutate("/api/projects");
  }

  // 3️⃣ UI
  return (
    <div>
      <input
        placeholder="Token Symbol"
        value={payload.tokenSymbol}
        onChange={(e) =>
          setPayload({ ...payload, tokenSymbol: e.target.value })
        }
      />

      <input
        placeholder="Token Address"
        value={payload.tokenAddress}
        onChange={(e) =>
          setPayload({ ...payload, tokenAddress: e.target.value })
        }
      />

      <button onClick={handleCreateToken}>
        Add Token
      </button>
    </div>
  );
}
