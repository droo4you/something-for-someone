// Verifies UI path: boss win -> reward -> evolution -> next region intro -> map.
import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 820 } }); const errors = [];
p.on('pageerror', e => errors.push(String(e)));
await p.goto(process.argv[2] ?? 'http://localhost:4173/');
await p.click('text=BEGIN JOURNEY'); await p.click('text=SET OUT'); await p.click('text=WALK ON');
await p.evaluate(() => { const s = window.__sfs; s.run.pos = { col: 9, row: 0 }; s.startBattle('boss'); });
await p.waitForTimeout(800);
await p.evaluate(() => { window.__sfs.battle.enemies[0].hp = 1; });
for (let k = 0; k < 10 && await p.$('#arena'); k++) { await p.click('button.primary:not([disabled])').catch(() => {}); await p.waitForTimeout(800); }
await p.waitForTimeout(900); const reward = await p.innerText('body'); await p.screenshot({ path: 'shots/13-boss-reward.png' });
await p.click('.card[data-a="o0"]'); await p.waitForTimeout(300);
for (let k = 0; k < 4 && await p.$('.card[data-a^="r"]'); k++) await p.click('.card[data-a="r0"]');
const evo = await p.innerText('body'); await p.screenshot({ path: 'shots/14-evolution.png' });
await p.click('text=CONTINUE'); await p.waitForTimeout(200); const intro = await p.innerText('body');
await p.click('text=WALK ON'); await p.waitForTimeout(200); const map = await p.innerText('body');
console.log(JSON.stringify({ lastWords: reward.includes('Last words'), evolution: evo.includes('EVOLUTION'), intro: intro.includes('Whispering Woods'), map: map.includes('Whispering Woods') && map.includes('DISTANCE 10'), errors }));
await b.close();
