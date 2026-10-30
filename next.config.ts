import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // The preview proxy loads the app from *.space-z.ai origins while the dev
  // server listens on localhost — without this allow-list Next warns on every
  // /_next/* asset request and FUTURE versions will block them outright
  // (which would present as "the app doesn't load at all").
  allowedDevOrigins: ["*.space-z.ai"],
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Keep the deploy payload slim: Next's output tracing was sweeping sandbox
  // tooling (skills/, download/, examples/, scripts/, logs, diagnostic dirs)
  // into .next/standalone — inflating the FC deploy package by ~65MB+.
  // Runtime needs: server code, traced node_modules, public assets, .env.
  outputFileTracingExcludes: {
    "*": [
      "skills/**",
      "download/**",
      "examples/**",
      "scripts/**",
      "tests/**",
      "generated/**",
      "tool-results/**",
      "upload/**",
      "uploads-storage/**",
      "db/**",
      "*.log",
      "worklog.md",
      "RECOVERY.md",
      "deploy-test/**",
      "payload-test/**",
    ],
  },
};

export default nextConfig;
