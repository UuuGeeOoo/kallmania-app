// Probe Supabase Supavisor session pooler across regions, trying password variants.
import pg from "pg";

const REF = "heybhtesxvhuktuhvfyd";
// Variant A: percent sign is literal (string as typed). Variant B: %E6 decodes to latin-1 byte 0xE6 ("æ").
const VARIANTS = [
  { label: "literal-%E6", pw: "w8jKp6PJ%E6w_Wv" },
  { label: "ae-char", pw: "w8jKp6PJ\u00E6w_Wv" },
];

const REGIONS = [
  "eu-west-2", "eu-west-1", "eu-central-1", "eu-west-3", "eu-north-1", "eu-central-2",
  "us-east-1", "us-east-2", "us-west-1", "us-west-2",
  "ap-south-1", "ap-south-2", "ap-southeast-1", "ap-southeast-2", "ap-southeast-3",
  "ap-northeast-1", "ap-northeast-2", "ap-northeast-3",
  "sa-east-1", "ca-central-1", "ca-east-1", "af-south-1", "ap-east-1",
  "me-central-1", "me-south-1", "il-central-1",
];

async function tryConn(region, port, pw) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  const client = new pg.Client({
    host, port,
    user: `postgres.${REF}`,
    password: pw,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 6000,
  });
  try {
    await client.connect();
    await client.query("select 1");
    await client.end();
    return true;
  } catch (err) {
    try { await client.end(); } catch {}
    lastErr = String(err.message || err).slice(0, 90);
    return false;
  }
}

let lastErr = "";
let found = null;
outer:
for (const region of REGIONS) {
  for (const v of VARIANTS) {
    const ok = await tryConn(region, 5432, v.pw);
    console.log(`${ok ? "✔" : "✘"} aws-0-${region} [${v.label}] ${ok ? "CONNECTED" : "→ " + lastErr}`);
    if (ok) { found = { region, variant: v }; break outer; }
  }
}

if (!found) { console.log("NO_MATCH"); process.exit(1); }

const { region, variant } = found;
// Encode for URI: percent-encode every non [A-Za-z0-9_-] byte of the UTF-8 form
const enc = (s) => Array.from(Buffer.from(s, "utf8"))
  .map((b) => (/[A-Za-z0-9_-]/.test(String.fromCharCode(b)) ? String.fromCharCode(b) : "%" + b.toString(16).toUpperCase().padStart(2, "0")))
  .join("");
const pwEnc = enc(variant.pw);
console.log(`FOUND_REGION=${region}`);
console.log(`FOUND_VARIANT=${variant.label}`);
console.log(`SESSION_URL=postgresql://postgres.${REF}:${pwEnc}@aws-0-${region}.pooler.supabase.com:5432/postgres`);
console.log(`TRANSACT_URL=postgresql://postgres.${REF}:${pwEnc}@aws-0-${region}.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`);
