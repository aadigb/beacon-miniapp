// src/server/redis.ts
import { Redis } from "@upstash/redis";

const url = process.env.storage_KV_REST_API_URL;
const token = process.env.storage_KV_REST_API_TOKEN;

if (!url || !token) {
  throw new Error(
    "Missing Upstash env vars: storage_KV_REST_API_URL and/or storage_KV_REST_API_TOKEN"
  );
}

export const redis = new Redis({ url, token });
