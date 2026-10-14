// Drives idle/walk frame animation for every on-screen sprite with a single timer.
import { cssScale, type Frames } from './spritecache';
interface Entry { cv: HTMLCanvasElement; fr: Frames; walk: boolean; phase: number; flashUntil: number; last: number }
const live: Entry[] = []; let timer = 0;
export function animSprite(fr: Frames, scale: number, opts: { walk?: boolean; phase?: number } = {}): { el: HTMLCanvasElement; flash: () => void; set: (f: Frames) => void } {
  const cv = document.createElement('canvas'); cv.width = fr.w; cv.height = fr.h; cv.className = 'px spr-cv';
  const k = cssScale(fr, scale); cv.style.width = fr.w * k + 'px'; cv.style.height = fr.h * k + 'px';
  const e: Entry = { cv, fr, walk: !!opts.walk, phase: opts.phase ?? Math.floor(Math.random() * 4), flashUntil: 0, last: -1 };
  live.push(e); draw(e, 0); ensure();
  return { el: cv, flash: () => { e.flashUntil = performance.now() + 110; e.last = -1; draw(e, tick); }, set: f => { e.fr = f; e.last = -1; draw(e, tick); } };
}
let tick = 0;
function draw(e: Entry, t: number) {
  const g = e.cv.getContext('2d')!; const flash = performance.now() < e.flashUntil;
  const arr = e.walk ? e.fr.walk : e.fr.idle; const idx = flash ? -2 : (t + e.phase) % arr.length;
  if (idx === e.last) return; e.last = idx;
  g.clearRect(0, 0, e.cv.width, e.cv.height); g.drawImage(flash ? e.fr.flash : arr[idx], 0, 0);
}
function ensure() {
  if (timer) return;
  timer = window.setInterval(() => {
    tick++;
    for (let i = live.length - 1; i >= 0; i--) { if (!live[i].cv.isConnected) { live.splice(i, 1); continue; } draw(live[i], tick); }
    if (!live.length) { clearInterval(timer); timer = 0; }
  }, 170);
}
