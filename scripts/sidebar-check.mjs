import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// Login
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await page.fill('input[type="email"]', 'echristian@kallmania.com');
await page.fill('input[type="password"]', '@21279413');
await page.click('button:has-text("Login")');
await page.waitForTimeout(2500);

// Expanded sidebar
await page.screenshot({ path: '/home/z/my-project/scripts/sb-expanded.png', clip: { x: 0, y: 0, width: 300, height: 900 } });

// Measure nav item geometry — icon box vs label
const metrics = await page.evaluate(() => {
  const items = [...document.querySelectorAll('nav button')];
  return items.slice(0, 12).map(b => {
    const iconSpan = b.querySelector('span');
    const label = b.querySelector('span.k-fade-collapse, span.flex-1');
    const r = b.getBoundingClientRect();
    const ir = iconSpan ? iconSpan.getBoundingClientRect() : null;
    const lr = label ? label.getBoundingClientRect() : null;
    return {
      label: (label?.textContent || b.textContent || '').trim().slice(0, 22),
      btn: { x: +r.x.toFixed(1), w: +r.width.toFixed(1) },
      icon: ir ? { x: +ir.x.toFixed(1), cx: +(ir.x + ir.width / 2).toFixed(1) } : null,
      labelX: lr ? +lr.x.toFixed(1) : null,
    };
  });
});
console.log(JSON.stringify(metrics, null, 1));

// Collapse sidebar
const collapseBtn = await page.$('button[title="Slide sidebar out"]');
if (collapseBtn) await collapseBtn.click();
await page.waitForTimeout(700);
await page.screenshot({ path: '/home/z/my-project/scripts/sb-collapsed.png', clip: { x: 0, y: 0, width: 140, height: 900 } });

const collapsed = await page.evaluate(() => {
  const items = [...document.querySelectorAll('nav button')];
  return items.slice(0, 12).map(b => {
    const iconSpan = b.querySelector('span');
    const r = b.getBoundingClientRect();
    const ir = iconSpan ? iconSpan.getBoundingClientRect() : null;
    return {
      btnCx: +(r.x + r.width / 2).toFixed(1),
      iconCx: ir ? +(ir.x + ir.width / 2).toFixed(1) : null,
    };
  });
});
console.log('COLLAPSED:', JSON.stringify(collapsed));

await browser.close();
