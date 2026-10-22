// Pick the right connection-string encoding/host for Supabase — via Prisma (what the app uses)
const forms = {
  A_direct_asSent: "postgresql://postgres:w8jKp6PJ%E6w_Wv@db.heybhtesxvhuktuhvfyd.supabase.co:5432/postgres",
  B_direct_double: "postgresql://postgres:w8jKp6PJ%25E6w_Wv@db.heybhtesxvhuktuhvfyd.supabase.co:5432/postgres",
  C_pooler_session: "postgresql://postgres.heybhtesxvhuktuhvfyd:w8jKp6PJ%25E6w_Wv@aws-0-eu-west-1.pooler.supabase.com:5432/postgres",
  D_pooler_tx: "postgresql://postgres.heybhtesxvhuktuhvfyd:w8jKp6PJ%25E6w_Wv@aws-0-eu-west-1.pooler.supabase.com:6543/postgres",
};

(async () => {
  for (const [name, url] of Object.entries(forms)) {
    const full = `${url}?sslmode=require&sslaccept=accept_invalid_certs&connection_limit=5&pool_timeout=20`;
    process.env.DATABASE_URL = full;
    // fresh module instance per form
    delete require.cache[require.resolve("@prisma/client")];
    const { PrismaClient } = require("@prisma/client");
    const p = new PrismaClient();
    try {
      const users = await p.$queryRaw`select count(*)::int as c from "User"`;
      const centres = await p.$queryRaw`select count(*)::int as c from "Centre"`;
      console.log(`${name}: OK — users=${users[0].c}, centres=${centres[0].c}`);
    } catch (e) {
      const detail = [e.message, e.code, e.meta && JSON.stringify(e.meta).slice(0, 200)].filter(Boolean).join(" | ");
      console.log(`${name}: FAIL — ${detail.slice(0, 240) || String(e).slice(0, 240)}`);
    } finally {
      await p.$disconnect().catch(() => {});
    }
  }
})();
