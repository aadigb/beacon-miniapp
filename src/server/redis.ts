// src/server/redis.ts
import { Redis } from "@upstash/redis";

// Prefer the standard Vercel/Upstash names.
// (Fallback to storage_* if you still have those somewhere.)
const url =
  process.env.KV_REST_API_URL ?? process.env.storage_KV_REST_API_URL;

const token =
  process.env.KV_REST_API_TOKEN ?? process.env.storage_KV_REST_API_TOKEN;

// Do NOT throw at import-time (Next can import during build).
export const redis = (() => {
  if (!url || !token) {
    return {
      async get() {
        throw new Error(
          "Missing Upstash env vars: KV_REST_API_URL and/or KV_REST_API_TOKEN"
        );
      },
      async set() {
        throw new Error(
          "Missing Upstash env vars: KV_REST_API_URL and/or KV_REST_API_TOKEN"
        );
      },
      async del() {
        throw new Error(
          "Missing Upstash env vars: KV_REST_API_URL and/or KV_REST_API_TOKEN"
        );
      },
    } as unknown as Redis;
  }

  return new Redis({ url, token });
})();
