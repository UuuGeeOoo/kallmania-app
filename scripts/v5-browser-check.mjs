import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

// Login as admin
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await page.fill('input[type="email"]', 'echristian@kallmania.com');
await page.fill('input[type="password"]', '@21279413');
await page.click('button:has-text("Login")');
await page.waitForTimeout(2500);

// ── 1. Expanded sidebar measurements ──
const expanded = await page.evaluate(() => {
  const btn = document.querySelector('nav button');
  const icon = btn.querySelector('span');
  const label = btn.querySelector('.k-rail-label');
  const b = btn.getBoundingClientRect(), i = icon.getBoundingClientRect(), l = label.getBoundingClientRect();
  return { btnX: b.x, iconX: i.x, labelX: l.x, labelW: l.width, gap: l.x - (i.x + i.width) };
});
console.log('EXPANDED first nav item:', JSON.stringify(expanded));
await page.screenshot({ path: '/home/z/my-project/scripts/v5-rail-expanded.png', clip: { x: 0, y: 0, width: 300, height: 620 } });

// ── 2. Collapse and measure ──
await page.click('button[title="Slide sidebar out"]');
await page.waitForTimeout(800);
const collapsed = await page.evaluate(() => {
  const rail = document.querySelector('aside');
  const rw = rail.getBoundingClientRect().width;
  return [...document.querySelectorAll('nav button')].slice(0, 12).map((b) => {
    const icon = b.querySelector('span');
    const r = b.getBoundingClientRect(), i = icon.getBoundingClientRect();
    const label = b.querySelector('.k-rail-label');
    return {
      railW: +rw.toFixed(1), btnCx: +((r.x + r.width / 2)).toFixed(1), iconCx: +((i.x + i.width / 2)).toFixed(1),
      offset: +(((r.x + r.width / 2) - (i.x + i.width / 2))).toFixed(1),
      labelW: label ? +label.getBoundingClientRect().width.toFixed(1) : null,
    };
  });
});
const railCenter = collapsed[0].railW / 2;
const worst = Math.max(...collapsed.map((c) => Math.abs(c.offset)));
console.log('COLLAPSED rail center:', railCenter, '| worst |icon offset|:', worst);
console.log('sample:', JSON.stringify(collapsed.slice(0, 4)));
await page.screenshot({ path: '/home/z/my-project/scripts/v5-rail-collapsed.png', clip: { x: 0, y: 0, width: 120, height: 620 } });

// Brand logo + avatar centering in collapsed mode
const chrome = await page.evaluate(() => {
  const logo = document.querySelector('aside .rounded-xl');
  const avatar = document.querySelector('aside .rounded-full');
  const rail = document.querySelector('aside').getBoundingClientRect();
  const c = (el) => { const r = el.getBoundingClientRect(); return +((r.x + r.width / 2) - (rail.x + rail.width / 2)).toFixed(1); };
  return { logoOffsetFromCenter: c(logo), avatarOffsetFromCenter: c(avatar) };
});
console.log('BRAND/AVATAR centering (0 = perfect):', JSON.stringify(chrome));

// Re-expand for navigation
await page.click('button[title="Slide sidebar in"]', { force: true });
await page.waitForTimeout(600);

// ── 3. KPI Configuration page: INBOUND ──
await page.click('nav button:has-text("KPI Configuration")');
await page.waitForTimeout(1500);
await page.screenshot({ path: '/home/z/my-project/scripts/v5-kpi-bpo.png' });

// open dropdown, pick Inbound
await page.click('button[role="combobox"]');
await page.waitForTimeout(400);
const options = await page.evaluate(() => [...document.querySelectorAll('[role="option"]')].map((o) => o.textContent.trim()));
console.log('DEPT OPTIONS:', JSON.stringify(options));
await page.click('[role="option"]:has-text("Inbound Call Centre")');
await page.waitForTimeout(1000);
await page.screenshot({ path: '/home/z/my-project/scripts/v5-kpi-inbound.png' });

const inboundTable = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('table tbody tr')];
  const mandatoryCells = rows.map((r) => r.cells[5]?.textContent.trim());
  const deleteBtns = rows.map((r) => !!r.cells[6]?.querySelector('button'));
  return { rows: rows.length, mandatory: [...new Set(mandatoryCells)], allDeletable: deleteBtns.every(Boolean) };
});
console.log('INBOUND TABLE:', JSON.stringify(inboundTable));

// mandatory select disabled for inbound?
const mandDisabled = await page.evaluate(() => {
  const triggers = [...document.querySelectorAll('button[role="combobox"]')];
  const mand = triggers.find((t) => t.textContent.includes('Optional') || t.textContent.includes('Required'));
  return mand ? mand.getAttribute('data-disabled') !== null || mand.hasAttribute('disabled') : 'not-found';
});
console.log('Add-metric Mandatory select disabled for INBOUND:', mandDisabled);

await browser.close();
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'ZERO JS ERRORS');
