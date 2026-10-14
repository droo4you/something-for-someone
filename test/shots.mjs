// Visual check + UI click-through smoke test. Usage: node test/shots.mjs [url]
import { chromium } from 'playwright';
const url = process.argv[2] ?? 'http://localhost:4173/';
const out = new URL('../shots/', import.meta.url).pathname;
const browser = await chromium.launch();
const errors = [];
async function page(w, h) { const p = await browser.newPage({ viewport: { width: w, height: h } }); p.on('pageerror', e => errors.push(String(e))); p.on('console', m => m.type() === 'error' && errors.push(m.text())); await p.goto(url); await p.waitForTimeout(600); return p; }
const p = await page(1100, 820);
await p.screenshot({ path: out + '01-title.png' });
await p.click('text=BEGIN JOURNEY'); await p.waitForTimeout(200);
await p.screenshot({ path: out + '02-hero-select.png', fullPage: true });
await p.click('text=SET OUT'); await p.waitForTimeout(200);
await p.screenshot({ path: out + '03-region-intro.png' });
await p.click('text=WALK ON'); await p.waitForTimeout(200);
await p.screenshot({ path: out + '04-map.png', fullPage: true });
await p.click('.node.avail'); await p.waitForTimeout(1500);
await p.screenshot({ path: out + '05-combat.png' });
await p.evaluate(() => { const b = window.__sfs.battle; b.enemies.forEach(e => { e.hp = e.maxHp = 200; }); });
await p.click('.skill:not([disabled])'); await p.waitForTimeout(330);
await p.screenshot({ path: out + '06-combat-vfx.png' });
await p.waitForTimeout(2500);
// Boss fight preview via debug hook
await p.evaluate(() => { const s = window.__sfs; s.run.pos = { col: 9, row: 0 }; s.startBattle('boss'); });
await p.waitForTimeout(1500);
await p.screenshot({ path: out + '07-boss.png' });
await p.evaluate(() => { const e = window.__sfs.battle.enemies[0]; e.hp = Math.ceil(e.maxHp * 0.52); e.st = {}; });
await p.click('button.primary:not([disabled])'); await p.waitForTimeout(2600);
await p.screenshot({ path: out + '07b-boss-phase2.png' });
// Mobile combat
const m = await page(390, 844);
await m.click('text=BEGIN JOURNEY'); await m.click('text=SET OUT'); await m.click('text=WALK ON'); await m.click('.node.avail'); await m.waitForTimeout(1500);
await m.screenshot({ path: out + '08-mobile-combat.png', fullPage: true });
await m.evaluate(() => { localStorage.clear(); });
// Click-through smoke: play the UI with a dumb policy for many steps.
const s = await page(1100, 820);
await s.evaluate(() => { const m = JSON.parse(localStorage.getItem('sfs_meta_v1') || '{}'); m.fast = true; localStorage.setItem('sfs_meta_v1', JSON.stringify(m)); });
await s.reload(); await s.waitForTimeout(300);
let shotsTaken = new Set(); let journeys = 0;
for (let i = 0; i < 1500 && journeys < 3; i++) {
  const sel = await s.evaluate(() => {
    const vis = q => [...document.querySelectorAll(q)].filter(e => !e.disabled && e.offsetParent !== null);
    const txt = document.body.innerText;
    const pick = (q, f) => { const e = vis(q).find(f ?? (() => true)); if (e) { e.click(); return true; } return false; };
    if (txt.includes('THE JOURNEY PAUSES')) return 'summary';
    if (pick('button', b => b.textContent.trim() === 'BEGIN JOURNEY')) return 'begin';
    if (pick('button', b => b.textContent.trim() === 'SET OUT')) return 'setout';
    if (document.querySelector('#arena')) { if (pick('.skill')) return 'skill'; if (pick('button', b => b.textContent.startsWith('ATTACK'))) return 'atk'; return 'wait'; }
    if (pick('.node.avail')) return 'node';
    if (pick('.card[data-a^="o"], .card[data-a^="r"]')) return 'card';
    if (pick('button', b => /^(CONTINUE|WALK ON|REST|LEAVE|1\.|Bow)/.test(b.textContent.trim()))) return 'cont';
    if (pick('button.primary')) return 'primary';
    if (pick('button')) return 'any';
    return 'none';
  });
  if (sel === 'summary') {
    if (!shotsTaken.has('sum')) { await s.screenshot({ path: out + '09-summary.png', fullPage: true }); shotsTaken.add('sum'); }
    journeys++; await s.click('text=NEW JOURNEY');
  }
  if (sel === 'card' && !shotsTaken.has('rw')) { /* reward already clicked */ }
  await s.waitForTimeout(sel === 'skill' || sel === 'atk' || sel === 'wait' ? 120 : 40);
}
const txt = await s.evaluate(() => document.body.innerText.slice(0, 200));
// Reward + meta + journal screens
await s.goto(url); await s.waitForTimeout(300);
await s.click('text=EMBERS OF HOPE'); await s.waitForTimeout(150); await s.screenshot({ path: out + '10-meta.png', fullPage: true });
await s.click('button:has-text("BACK")'); await s.click('button:has-text("JOURNAL")'); await s.waitForTimeout(150); await s.screenshot({ path: out + '11-journal.png' });
// Reward screen: win a fight instantly via debug
await s.click('button:has-text("BACK")'); await s.click('text=BEGIN JOURNEY'); await s.click('text=SET OUT'); await s.click('text=WALK ON'); await s.click('.node.avail'); await s.waitForTimeout(600);
await s.evaluate(() => { const b = window.__sfs.battle; b.enemies.forEach(e => { e.hp = 1; }); });
for (let k = 0; k < 10 && await s.$('#arena'); k++) { await s.click('button.primary:not([disabled])').catch(() => {}); await s.waitForTimeout(700); }
await s.waitForTimeout(900); await s.screenshot({ path: out + '12-reward.png', fullPage: true });
console.log(JSON.stringify({ journeysCompletedViaUI: journeys, errors, lastScreen: txt.replace(/\s+/g, ' ').slice(0, 80) }, null, 1));
await browser.close();
