import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the connector’s Node-only SDK external; its optional x402 peers are not used.
  serverExternalPackages: ["@coinbase/cdp-sdk"],
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
