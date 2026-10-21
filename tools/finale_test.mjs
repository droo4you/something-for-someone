// Headless phone-size test of the 4 boss beat finales: real input events at chart times, checks judgments.
// node tools/finale_test.mjs  -> ${OUT}/*.png + PASS/FAIL per game
const VH = +(process.env.VH ?? 844), OUT = process.env.OUT ?? 'shots/finale';
import { chromium } from 'playwright';
const b = await chromium.launch();
const kinds = ['lanes', 'circles', 'runner', 'arrows']; let ok = true;
for (const kind of kinds) {
  const pg = await b.newPage({ viewport: { width: 390, height: VH }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await pg.goto('file://' + process.cwd() + '/dist/index.html?finale=' + kind); await pg.waitForFunction(() => window.__finale);
  const expect = await pg.evaluate(kind => {
    const F = window.__finale; const cv = document.querySelector('.fcv'); const plan = F.notes.map((n, i) => ({ n, off: [0, 0, 0, 0.11, null][i % 5], sent: false }));
    const key = k => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
    const tap = (x, y) => { const r = cv.getBoundingClientRect(); cv.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + (x / 180) * r.width, clientY: r.top + (y / 300) * r.height, bubbles: true, cancelable: true, pointerType: 'touch' })); };
    const step = () => { const t = F.now; for (const p of plan) { if (p.sent || p.off === null || t < p.n.t + p.off - 0.004) continue; p.sent = true;
        if (kind === 'lanes') key('dfjk'[p.n.lane]); else if (kind === 'arrows') key(['ArrowLeft', 'ArrowDown', 'ArrowUp', 'ArrowRight'][p.n.lane]); else if (kind === 'circles') tap(p.n.x, p.n.y); else tap(90, 150); }
      if (!F.done) requestAnimationFrame(step); };
    requestAnimationFrame(step);
    // runner: notes share lane 0 so a GOOD-late press can't steal the next note; expected counts per plan
    return { perfect: plan.filter(p => p.off === 0).length, good: plan.filter(p => p.off === 0.11).length, miss: plan.filter(p => p.off === null).length };
  }, kind);
  await pg.waitForTimeout(1200); await pg.screenshot({ path: `${OUT}/${kind}-countdown.png` });
  await pg.waitForFunction(() => window.__finale.now > 5.2); await pg.screenshot({ path: `${OUT}/${kind}-midplay.png` });
  await pg.waitForFunction(() => window.__finaleResult, null, { timeout: 30000 });
  const res = await pg.evaluate(() => window.__finaleResult);
  await pg.screenshot({ path: `${OUT}/${kind}-results.png` });
  const pass = Math.abs(res.perfect - expect.perfect) <= 1 && Math.abs(res.good - expect.good) <= 1 && Math.abs(res.miss - expect.miss) <= 1;
  ok = ok && pass; console.log(kind, pass ? 'PASS' : 'FAIL', 'expected', JSON.stringify(expect), 'got', JSON.stringify(res));
  await pg.click('text=CLAIM LOOT'); await pg.waitForTimeout(300); await pg.screenshot({ path: `${OUT}/${kind}-rewards.png` });
  await pg.close();
}
// perfect run on the final DJ (arrows) via Playwright's own touchscreen taps, to see an S and the bonus card
{
  const pg = await b.newPage({ viewport: { width: 390, height: VH }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await pg.goto('file://' + process.cwd() + '/dist/index.html?finale=arrows'); await pg.waitForFunction(() => window.__finale);
  const notes = await pg.evaluate(() => window.__finale.notes.map(n => ({ t: n.t, lane: n.lane })));
  const box = await pg.locator('.fcv').boundingBox();
  for (const n of notes) {
    await pg.waitForFunction(t => window.__finale.now >= t - 0.012, n.t, { polling: 'raf' });
    await pg.touchscreen.tap(box.x + ((n.lane + 0.5) / 4) * box.width, box.y + box.height * 0.5);
  }
  await pg.waitForFunction(() => window.__finaleResult, null, { timeout: 30000 });
  const res = await pg.evaluate(() => window.__finaleResult); console.log('arrows touchscreen perfect run:', JSON.stringify(res));
  await pg.screenshot({ path: `${OUT}/arrows-S-results.png` }); await pg.click('text=CLAIM LOOT'); await pg.waitForTimeout(300); await pg.screenshot({ path: `${OUT}/arrows-S-rewards.png` });
  if (res.grade !== 'S' && res.grade !== 'A') ok = false;
}
await b.close(); console.log(ok ? 'ALL PASS' : 'SOME FAIL'); process.exit(ok ? 0 : 1);
