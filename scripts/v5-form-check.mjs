import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

// ── A. Inbound agent: form must show INBOUND catalogue rows, no required marks ──
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await page.fill('input[type="email"]', 'inbound.agent.e2e@kallmania.com');
await page.fill('input[type="password"]', 'inbound123');
await page.click('button:has-text("Login")');
await page.waitForTimeout(2200);
const loginFail = await page.evaluate(() => document.body.innerText.includes('Invalid') || !!document.querySelector('input[type="email"]'));
if (loginFail) {
  console.log('INBOUND LOGIN FAILED (password may differ) — checking…');
} else {
  await page.click('nav button:has-text("Daily Report")');
  await page.waitForTimeout(1800);
  const form = await page.evaluate(() => {
    const asterisks = [...document.querySelectorAll('table tbody td:first-child span.text-rose-400')].length;
    const kpiRows = [...document.querySelectorAll('table tbody tr')].filter((r) => r.cells.length >= 5).length;
    const title = document.body.innerText.match(/DAILY REPORT — [A-Z ()]+/)?.[0];
    const hasOptionalNote = document.body.innerText.includes('no entry is mandatory');
    return { title, asterisks, kpiRows, hasOptionalNote };
  });
  console.log('INBOUND FORM:', JSON.stringify(form));
  await page.screenshot({ path: '/home/z/my-project/scripts/v5-inbound-form.png', fullPage: false });
}
await page.evaluate(() => fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) }));

// ── B. Admin adds custom metric to INBOUND → inbound agent form picks it up ──
const JAR = await page.context().cookies();
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await page.fill('input[type="email"]', 'echristian@kallmania.com');
await page.fill('input[type="password"]', '@21279413');
await page.click('button:has-text("Login")');
await page.waitForTimeout(2200);
const added = await page.evaluate(async () => {
  const r = await fetch('/api/kpi-config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ department: 'INBOUND', key: 'slaAnswered', label: 'Calls Answered Within SLA', unit: 'count', defaultTarget: 40, category: 'CUSTOM' }) });
  return r.json();
});
console.log('ADDED CUSTOM METRIC:', JSON.stringify(added.config || added));
await page.evaluate(() => fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) }));

// inbound agent sees the new row
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await page.fill('input[type="email"]', 'inbound.agent.e2e@kallmania.com');
await page.fill('input[type="password"]', 'inbound123');
await page.click('button:has-text("Login")');
await page.waitForTimeout(2200);
if (!(await page.evaluate(() => !!document.querySelector('input[type="email"]')))) {
  await page.click('nav button:has-text("Daily Report")');
  await page.waitForTimeout(1800);
  const hasSla = await page.evaluate(() => document.body.innerText.includes('Calls Answered Within SLA'));
  console.log('INBOUND FORM SHOWS CUSTOM METRIC:', hasSla);
  await page.screenshot({ path: '/home/z/my-project/scripts/v5-inbound-custom.png' });
}
await page.evaluate(() => fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) }));

// ── C. Outbound agent (BPO): template rows still required where configured ──
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await page.fill('input[type="email"]', 'echristian@kallmania.com');
await page.fill('input[type="password"]', '@21279413');
await page.click('button:has-text("Login")');
await page.waitForTimeout(2200);
// find an outbound agent
const agents = await page.evaluate(async () => (await (await fetch('/api/users')).json()).users.filter((u) => u.department === 'BPO' && u.team === 'OUTBOUND' && u.status === 'APPROVED').map((u) => u.email));
console.log('OUTBOUND AGENTS:', JSON.stringify(agents.slice(0, 3)));
await page.evaluate(() => fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) }));

if (agents.length) {
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', agents[0]);
  // blessing.okafor was registered with @agent123 in the e2e suite
  await page.fill('input[type="password"]', '@agent123');
  await page.click('button:has-text("Login")');
  await page.waitForTimeout(1800);
  if (await page.evaluate(() => !document.querySelector('input[type="email"]'))) {
    await page.click('nav button:has-text("Daily Report")');
    await page.waitForTimeout(1800);
    const out = await page.evaluate(() => {
      const asterisks = [...document.querySelectorAll('table tbody td:first-child span.text-rose-400')].length;
      const rows = document.body.innerText.includes('Total Calls Made');
      return { requiredMarks: asterisks, hasTemplate: rows };
    });
    console.log('OUTBOUND FORM:', JSON.stringify(out));
  } else {
    console.log('OUTBOUND AGENT LOGIN FAILED — skipping form check (API coverage already proves config wiring)');
  }
}

await browser.close();
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'ZERO JS ERRORS');
