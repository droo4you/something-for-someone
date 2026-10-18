// Verifies UI path: boss win -> beat finale (no input: grade D, base loot kept) -> reward -> evolution -> next region intro -> map.
import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 820 } }); const errors = [];
p.on('pageerror', e => errors.push(String(e)));
await p.goto(process.argv[2] ?? 'http://localhost:4173/');
await p.click('text=ENTER THE FESTIVAL'); await p.click("text=LET'S GO"); await p.click('text=KEEP DANCING');
await p.evaluate(() => { const s = window.__sfs; s.run.pos = { col: 9, row: 0 }; s.startBattle('boss'); });
await p.waitForTimeout(800);
await p.evaluate(() => { window.__sfs.battle.enemies[0].hp = 1; });
for (let k = 0; k < 10 && await p.$('#arena'); k++) { await p.click('#arena ~ * button.primary:not([disabled]), .actions button.primary:not([disabled])', { timeout: 1500 }).catch(() => {}); await p.waitForTimeout(800); }
const fin = !!(await p.waitForSelector('.fcv', { timeout: 8000 }).catch(() => null)); const finKind = await p.evaluate(() => window.__finale?.o.kind);
await p.waitForSelector('text=CLAIM LOOT', { timeout: 30000 }); const fres = await p.evaluate(() => window.__finaleResult); await p.click('text=CLAIM LOOT');
await p.waitForTimeout(900); const reward = await p.innerText('body'); await p.screenshot({ path: 'shots/13-boss-reward.png' });
await p.click('.card[data-a="o0"]'); await p.waitForTimeout(300);
for (let k = 0; k < 4 && await p.$('.card[data-a^="r"]'); k++) await p.click('.card[data-a="r0"]');
const evo = await p.innerText('body'); await p.screenshot({ path: 'shots/14-evolution.png' });
await p.click('text=CONTINUE'); await p.waitForTimeout(200); const intro = await p.innerText('body');
await p.click('text=KEEP DANCING'); await p.waitForTimeout(200); const map = await p.innerText('body');
console.log(JSON.stringify({ finale: fin, finKind, grade: fres?.grade, lastWords: reward.includes('Last words'), evolution: evo.includes('LEVELLED UP'), intro: intro.includes('Entry Gates'), map: map.includes('Entry Gates') && map.includes('DEPTH 10'), errors }));
await b.close();
