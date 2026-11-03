// One-off: verify Gemini is configured and attempted by the intel commentary
// engine, and that the flagged fallback surfaces the engine note.
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL?.startsWith("postgres")) {
  const dbts = readFileSync(new URL("../src/lib/db.ts", import.meta.url), "utf8");
  const m = dbts.match(/KALLMANIA_FALLBACK_DATABASE_URL\s*=\s*'([^']+)'/);
  if (m) process.env.DATABASE_URL = m[1];
}
const db = new PrismaClient();
const BASE = "http://localhost:3000";

const admin = await db.user.findFirst({ where: { email: "verify-admin@kallmania.test" }, select: { id: true, email: true } });
if (!admin) throw new Error("verify-admin missing — run scripts/seed-verify-admin.ts");
const agent = await db.user.findFirst({
  where: { role: "AGENT_BPO", status: "APPROVED", country: "NG", state: "Enugu" },
  select: { id: true, fullName: true },
});
if (!agent) throw new Error("no Enugu agent with data");

const login = await fetch(`${BASE}/api/auth`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "login", email: admin.email, password: process.env.ADMIN_PWD ?? "verify-2026" }) });
const cookie = login.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
if (!cookie) throw new Error(`admin login failed: ${login.status}`);

const res = await fetch(`${BASE}/api/intel/report?type=agent&agentId=${agent.id}&period=custom&from=2026-11-02&to=2026-11-03`, { headers: { cookie } });
const body = await res.json() as { assessment?: { commentary?: { source: string; engineNote?: string; summary?: string } }; commentary?: { source: string; engineNote?: string; summary?: string }; error?: string };
const c = body.assessment?.commentary ?? body.commentary;
console.log("report status:", res.status, "agent:", agent.fullName);
console.log("commentary source:", c?.source);
console.log("engineNote:", c?.engineNote ?? "(none)");
console.log("summary:", (c?.summary ?? body.error ?? "").slice(0, 160));
await db.$disconnect();
