// Daemonize the Next dev server: double-fork via detached spawn, stdio to dev.log
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// Self-healing: the platform workspace sync has repeatedly wiped .env (sole
// source of the Supabase DATABASE_URL) and/or exported a SQLite fallback URL
// into the environment. @next/env does NOT override existing process.env, so a
// broken exported DATABASE_URL would win over .env and crash Prisma at login
// ("the URL must start with the protocol postgresql://"). Force the .env value.
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
  console.error("dev-daemon: no postgresql:// DATABASE_URL found in .env — refusing to start (would crash Prisma)");
  process.exit(1);
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
