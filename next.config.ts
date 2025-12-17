import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
  async redirects() {
    return [
      {
        source: "/.well-known/farcaster.json",
        destination:
          "https://api.farcaster.xyz/miniapps/hosted-manifest/019b2b12-2f09-ad20-f0f4-c5fef5bc00df",
        permanent: false, // 307 redirect
      },
    ];
  },
};

export default nextConfig;
