"use client";

import React from "react";
import { usePosts } from "../app/providers";

export default function PostsList() {
  const { posts } = usePosts();
  if (!posts.length) return <div>No posts yet.</div>;
  return (
    <div>
      {posts.map((p) => (
        <div key={p.id} style={{ border: "1px solid #ddd", padding: 12, marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: "#666" }}>
            {new Date(p.createdAt).toLocaleString()} · {p.author} · token: {p.tokenAddress}
          </div>
          <div style={{ marginTop: 8 }}>{p.content}</div>
        </div>
      ))}
    </div>
  );
}