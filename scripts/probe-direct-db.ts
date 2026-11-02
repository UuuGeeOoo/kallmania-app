/** Connectivity probe for the user-supplied DIRECT Supabase URL (db host, port 5432). */
import { PrismaClient } from "@prisma/client";

const base = "postgresql://postgres:w8jKp6PJ%25E6w_Wv@db.heybhtesxvhuktuhvfyd.supabase.co:5432/postgres";
const variants = [
  { name: "direct+sslmode=require", url: `${base}?sslmode=require&connect_timeout=8` },
  { name: "direct+sslaccept=accept_invalid_certs", url: `${base}?sslmode=require&sslaccept=accept_invalid_certs&connect_timeout=8` },
];

for (const v of variants) {
  const db = new PrismaClient({ datasources: { db: { url: v.url } } });
  try {
    const t0 = Date.now();
    const r = await db.$queryRaw`select count(*)::int as users from "User"`;
    console.log(`OK  ${v.name} — round-trip ${Date.now() - t0}ms, users=${r[0].users}`);
  } catch (e) {
    console.log(`ERR ${v.name} — ${(e.message || String(e)).split("\n")[0].slice(0, 140)}`);
  } finally {
    await db.$disconnect().catch(() => {});
  }
}
