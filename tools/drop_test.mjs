// Headless phone test of hero Drops: full meter via ?drop=<hero>, real touchscreen taps at note times.
// Each hero: a perfect run and a sloppy run (every other note skipped) -> effect must scale with accuracy.
import { chromium } from 'playwright';
const b = await chromium.launch(); let ok = true;
for (const hero of ['bass', 'flow', 'tempo', 'wall']) for (const [mode, vh] of [['perfect', 664], ['sloppy', 844]]) {
  const pg = await b.newPage({ viewport: { width: 390, height: vh }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto('file://' + process.cwd() + '/dist/index.html?drop=' + hero); await pg.waitForSelector('.drop-btn.ready');
  await pg.waitForTimeout(600); if (mode === 'perfect') { await pg.locator('.drop-btn').scrollIntoViewIfNeeded(); await pg.screenshot({ path: `shots/drop/${hero}-ready-${vh}.png` }); }
  const before = await pg.evaluate(() => { const B = window.__battle; return { hp: B.hero.hp, sh: B.hero.st.shield ?? 0, def: B.hero.def, ehp: B.enemies.reduce((s, e) => s + e.hp, 0), ev: B.events.length, burn: B.hero.st.burn ?? 0 }; });
  await pg.locator('.drop-btn').tap(); await pg.waitForFunction(() => window.__dropSeq);
  const notes = await pg.evaluate(() => window.__dropSeq.notes.map(n => n.t));
  for (let i = 0; i < notes.length; i++) {
    if (mode === 'sloppy' && i % 2) continue;
    await pg.waitForFunction(t => window.__dropSeq.now() >= t - 0.01, notes[i] - 0.035, { polling: 'raf' });
    await pg.touchscreen.tap(195, vh * 0.75);
    if (i === 1) await pg.screenshot({ path: `shots/drop/${hero}-seq-${mode}-${vh}.png` });
  }
  await pg.waitForFunction(() => window.__dropResult); const res = await pg.evaluate(() => window.__dropResult);
  await pg.waitForTimeout(1500);
  const d = await pg.evaluate(() => ({ ...window.__battle.lastDrop, used: window.__battle.dropUsed }));
  await pg.screenshot({ path: `shots/drop/${hero}-after-${mode}-${vh}.png` });
  const pass = d.used && Math.abs(d.acc - res.acc) < 1e-9 && !errs.length;
  ok = ok && pass;
  console.log(hero, mode, pass ? 'PASS' : 'FAIL', `acc ${Math.round(res.acc * 100)}% (P${res.perfect} G${res.good} M${res.miss})`, '|', d.line, '|', JSON.stringify(d.before), '->', JSON.stringify(d.after), errs.join(';'));
  await pg.close();
}
await b.close(); console.log(ok ? 'ALL PASS' : 'SOME FAIL'); process.exit(ok ? 0 : 1);
