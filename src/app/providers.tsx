"use client";

import type { ReactNode } from "react";
import { MiniAppProvider } from "@neynar/react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "../lib/wagmi";
import React, { createContext, useContext, useEffect, useState } from "react";

export type Token = {
  address: string;
  symbol?: string;
  name?: string;
  addedAt: number;
};

type TokensContextType = {
  tokens: Token[];
  addToken: (token: Omit<Token, "addedAt">) => void;
  removeToken: (address: string) => void;
  clearTokens: () => void;
};

const TokensContext = createContext<TokensContextType | undefined>(undefined);

// Posts
export type Post = {
  id: string;
  author: string;
  tokenAddress: string;
  content: string;
  createdAt: number;
};

type PostsContextType = {
  posts: Post[];
  addPost: (p: Omit<Post, "id" | "createdAt">) => void;
  clearPosts: () => void;
};

const PostsContext = createContext<PostsContextType | undefined>(undefined);

// Simple dev list (replace with env/config as needed)
export const DEV_ADDRESSES = [
  "0x0000000000000000000000000000000000000000".toLowerCase(), // replace
];

export function isDevAddress(addr?: string) {
  if (!addr) return false;
  return DEV_ADDRESSES.includes(addr.toLowerCase());
}

export function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session?: unknown;
}) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("beacon:tokens");
      if (raw) setTokens(JSON.parse(raw));
    } catch {}
    try {
      const raw = localStorage.getItem("beacon:posts");
      if (raw) setPosts(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("beacon:tokens", JSON.stringify(tokens));
    } catch {}
  }, [tokens]);

  useEffect(() => {
    try {
      localStorage.setItem("beacon:posts", JSON.stringify(posts));
    } catch {}
  }, [posts]);

  const addToken = (t: Omit<Token, "addedAt">) => {
    setTokens((prev) => {
      const exists = prev.some((p) => p.address.toLowerCase() === t.address.toLowerCase());
      if (exists) return prev;
      return [...prev, { ...t, addedAt: Date.now() }];
    });
  };

  const removeToken = (address: string) =>
    setTokens((prev) => prev.filter((p) => p.address.toLowerCase() !== address.toLowerCase()));

  const clearTokens = () => setTokens([]);

  const addPost = (p: Omit<Post, "id" | "createdAt">) => {
    setPosts((prev) => [
      { ...p, id: crypto.randomUUID(), createdAt: Date.now() },
      ...prev,
    ]);
  };

  const clearPosts = () => setPosts([]);

  return (
    <TokensContext.Provider value={{ tokens, addToken, removeToken, clearTokens }}>
      <PostsContext.Provider value={{ posts, addPost, clearPosts }}>
        <MiniAppProvider analyticsEnabled>
          <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
              {children}
            </QueryClientProvider>
          </WagmiProvider>
        </MiniAppProvider>
      </PostsContext.Provider>
    </TokensContext.Provider>
  );
}

export function useTokens() {
  const ctx = useContext(TokensContext);
  if (!ctx) throw new Error("useTokens must be used inside Providers");
  return ctx;
}

export function usePosts() {
  const ctx = useContext(PostsContext);
  if (!ctx) throw new Error("usePosts must be used inside Providers");
  return ctx;
}
