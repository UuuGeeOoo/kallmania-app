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
  //
  // Second wave (the 59MB→64MB payload growth that pushed the FC deploy over
  // its package limit / cold-start budget and made deploys fail outright):
  // output tracing also dragged in RUNTIME-IRRELEVANT binaries — the musl
  // libvips copy of sharp (debian/glibc deployments always load the linux-x64
  // glibc variant), the full TypeScript compiler (nothing requires it at
  // runtime), and Prisma's wasm engines for database providers the app does
  // not use (no @prisma/adapter-* driver adapters anywhere; the node runtime
  // loads libquery_engine-debian-openssl-3.0.x.so.node from .prisma/client).
  // Every exclude below is validated by the payload smoke test before deploy.
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
      // sharp ships one prebuilt binary set per platform; glibc debian only
      // ever loads the linux-x64 set
      "node_modules/@img/sharp-libvips-linuxmusl-x64/**",
      "node_modules/@img/sharp-libvips-linuxmusl-arm64/**",
      "node_modules/@img/sharp-libvips-linux-arm64/**",
      "node_modules/@img/sharp-libvips-linuxmusl-ia32/**",
      "node_modules/@img/sharp-linuxmusl-x64/**",
      "node_modules/@img/sharp-linuxmusl-arm64/**",
      "node_modules/@img/sharp-linux-arm64/**",
      // TypeScript never runs in the standalone server
      "node_modules/typescript/**",
      // Prisma wasm engines for providers the app does not use (driver
      // adapters are not installed; the library engine .so.node is kept)
      "node_modules/@prisma/client/runtime/query_engine_bg.cockroachdb.*",
      "node_modules/@prisma/client/runtime/query_engine_bg.mysql.*",
      "node_modules/@prisma/client/runtime/query_engine_bg.sqlserver.*",
      "node_modules/@prisma/client/runtime/query_engine_bg.sqlite.*",
      "node_modules/@prisma/client/runtime/query_compiler_bg.cockroachdb.*",
      "node_modules/@prisma/client/runtime/query_compiler_bg.mysql.*",
      "node_modules/@prisma/client/runtime/query_compiler_bg.sqlserver.*",
      "node_modules/@prisma/client/runtime/query_compiler_bg.sqlite.*",
    ],
  },
};

export default nextConfig;
