import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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
