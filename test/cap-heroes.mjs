import { chromium } from 'playwright';
const [,, url, out] = process.argv;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
const errs=[]; p.on('pageerror', e => errs.push(String(e)));
await p.goto(url); await p.waitForTimeout(1200);
const data = await p.evaluate(() => [...document.querySelectorAll('#g > div')].slice(0, 12).map(d => { const c = d.querySelector('canvas'); return { label: d.textContent, url: c.toDataURL(), w: c.width, h: c.height }; }));
const fs = await import('fs'); fs.writeFileSync(out, JSON.stringify(data)); console.log(data.map(d => d.label + ' ' + d.w + 'x' + d.h).join(', '), errs);
await b.close();
