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
          "https://api.farcaster.xyz/miniapps/hosted-manifest/019b2d32-2e72-c998-6439-6bfaba49ca37",
        permanent: false, // 307 redirect
      },
    ];
  },
};

export default nextConfig;
