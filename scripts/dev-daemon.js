// Daemonize the Next dev server: double-fork via detached spawn, stdio to dev.log
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// Self-healing: the platform workspace sync has repeatedly wiped .env (sole
// source of the Supabase DATABASE_URL) and/or exported a SQLite fallback URL
// into the environment. @next/env does NOT override existing process.env, so a
// broken exported DATABASE_URL would win over .env and crash Prisma at login
// ("the URL must start with the protocol postgresql://"). Force the .env value.
// Keep this fallback in sync with KALLMANIA_FALLBACK_DATABASE_URL in src/lib/db.ts.
const KALLMANIA_FALLBACK_DATABASE_URL =
  "postgresql://postgres.heybhtesxvhuktuhvfyd:w8jKp6PJ%25E6w_Wv@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require&sslaccept=accept_invalid_certs&connection_limit=5&pool_timeout=20";
const projectRoot = "/home/z/my-project";
for (const envFile of [".env.local", ".env"]) {
  const p = path.join(projectRoot, envFile);
  if (fs.existsSync(p)) {
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/);
      if (m) { process.env.DATABASE_URL = m[1].trim(); break; }
    }
    if (String(process.env.DATABASE_URL || "").startsWith("postgresql://")) break;
  }
}
if (!String(process.env.DATABASE_URL || "").startsWith("postgresql://")) {
  console.warn("dev-daemon: no valid DATABASE_URL in env files — using committed Supabase fallback (see src/lib/db.ts)");
  process.env.DATABASE_URL = KALLMANIA_FALLBACK_DATABASE_URL;
}

const out = fs.openSync("/home/z/my-project/dev.log", "a");
const child = spawn("/home/z/my-project/node_modules/.bin/next", ["dev", "-p", "3000"], {
  cwd: "/home/z/my-project",
  detached: true,
  stdio: ["ignore", out, out],
  env: { ...process.env, FORCE_COLOR: "0" },
});
child.unref();
console.log("spawned next dev pid:", child.pid, "| DATABASE_URL:", String(process.env.DATABASE_URL).replace(/:[^:@]+@/, ":****@"));
