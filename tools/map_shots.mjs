// Phone-size screenshots of the festival map for several zones: node tools/map_shots.mjs
import { chromium } from 'playwright';
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await pg.goto('file://' + process.cwd() + '/dist/index.html'); await pg.waitForTimeout(500);
const zones = [[0, null, 'lot'], [1, [2, 0], 'gates'], [2, [4, 0], 'forest'], [6, [8, 0], 'main']];
for (const [depth, pos, name] of zones) {
  await pg.evaluate(([d, p]) => { const S = window.__sfs; S.startRun('tempo', 'W797ON'); const r = S.run; r.depth = d; r.map = S.R.genMap(r);
    if (p) { const row = r.map[p[0]][0].row; r.pos = { col: p[0], row }; r.stop = p[0] + 1; } S.mapScreen(); }, [depth, pos]);
  await pg.waitForTimeout(400);
  await pg.screenshot({ path: `shots/map/map-${depth}-${name}.png` });
  if (name === 'main') { await pg.evaluate(() => document.querySelector('.mapwrap').scrollLeft = 9999); await pg.waitForTimeout(200); await pg.screenshot({ path: `shots/map/map-${depth}-${name}-stage.png` }); }
}
await b.close(); console.log('ok');
