// Pick the right connection-string encoding for Prisma (.env DATABASE_URL)
const { Client } = require("pg");
const forms = {
  A_rawE6: "postgresql://postgres.heybhtesxvhuktuhvfyd:***@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require",
  B_double: "postgresql://postgres.heybhtesxvhuktuhvfyd:***@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require",
};
(async () => {
  for (const [name, url] of Object.entries(forms)) {
    try {
      const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
      await c.connect();
      const r = await c.query("SELECT 1 AS ok");
      console.log(`${name}: OK (${r.rows[0].ok})`);
      await c.end();
    } catch (e) {
      console.log(`${name}: FAIL — ${e.message}`);
    }
  }
})();
