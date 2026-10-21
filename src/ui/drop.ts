// Hero Drop: a short (4-8 beat) in-battle rhythm sequence. Full-screen, mobile-first overlay: tap ANYWHERE
// (or Space / Enter / arrows) as each shrinking ring closes on the pad. Reuses the finale judging windows
// and the audio-clock beat scheduler; returns accuracy 0..1 which scales the hero's Drop effect.
import { clockSource, scheduleTrack, sfx } from './audio';
import { SP, BPM, WIN_PERFECT, WIN_GOOD } from './finale';
import { tone } from './pix';

export const DROP_PATTERN: Record<string, number[]> = {
  bass: [0, 1, 2, 2.5, 3],                 // 4 beats, heavy with a syncopated double
  flow: [0, 1, 2, 3, 4, 5],                // 6 beats, smooth even flow
  tempo: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], // 4 beats of 8ths
  wall: [0, 2, 4, 5],                      // 6 beats, big slow slams
};
const COL: Record<string, string> = { bass: '#ff3ec8', flow: '#3ae8ff', tempo: '#b8ff3a', wall: '#ffcf3a' };
const COUNT_IN = 2, LEAD = 1.5 * SP, W = 160, H = 160;
export interface DropResult { acc: number; perfect: number; good: number; miss: number; total: number }
export const isTouch = () => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

export function runDrop(hero: string, title: string, sub: string, onShout: () => void, done: (r: DropResult) => void) {
  const col = COL[hero] ?? '#ff3ec8'; const pat = DROP_PATTERN[hero] ?? DROP_PATTERN.bass;
  const ov = document.createElement('div'); ov.className = 'dropov';
  ov.innerHTML = `<div class="dhead"><b style="color:${col}">${title}</b><span class="tiny">${sub}</span></div><canvas class="px dcv"></canvas>
    <div class="dj"></div><div class="dhint tiny">${isTouch() ? 'TAP ANYWHERE as the ring hits the pad' : 'SPACE / ENTER / TAP as the ring hits the pad'}</div>`;
  document.body.appendChild(ov); document.body.classList.add('playing');
  const cv = ov.querySelector<HTMLCanvasElement>('.dcv')!; cv.width = W; cv.height = H; const g = cv.getContext('2d')!;
  const clock = clockSource(); const t0 = clock() + COUNT_IN * SP + 0.2; const beats = Math.ceil(pat[pat.length - 1]) + 1;
  scheduleTrack(clock, t0, BPM, beats, COUNT_IN);
  const notes = pat.map(b => ({ t: b * SP, j: '' as '' | 'perfect' | 'good' | 'miss', at: 0 }));
  const st = { perfect: 0, good: 0, miss: 0, done: false, flash: -9 };
  const now = () => clock() - t0; const jEl = ov.querySelector<HTMLElement>('.dj')!;
  const show = (s: string, c: string) => { jEl.innerHTML = `<span style="color:${c}">${s}</span>`; jEl.classList.remove('fpop'); void jEl.offsetWidth; jEl.classList.add('fpop'); };
  const press = () => {
    const t = now(); st.flash = t;
    const n = notes.filter(n => !n.j && Math.abs(n.t - t) <= WIN_GOOD).sort((a, b) => Math.abs(a.t - t) - Math.abs(b.t - t))[0];
    if (!n) return; n.at = t;
    if (Math.abs(n.t - t) <= WIN_PERFECT) { n.j = 'perfect'; st.perfect++; sfx.perfect(); show('PERFECT', '#b8ff3a'); } else { n.j = 'good'; st.good++; sfx.good(); show('GOOD', '#3ae8ff'); }
    onShout();
  };
  const pd = (e: PointerEvent) => { e.preventDefault(); press(); };
  const kd = (e: KeyboardEvent) => { if ([' ', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'q', 'Q'].includes(e.key)) { e.preventDefault(); e.stopImmediatePropagation(); press(); } };
  ov.addEventListener('pointerdown', pd); window.addEventListener('keydown', kd, true);
  const api = { notes, now, press, st }; (window as any).__dropSeq = api;
  const frame = () => {
    if (st.done) return; const t = now();
    for (const n of notes) if (!n.j && t - n.t > WIN_GOOD) { n.j = 'miss'; n.at = t; st.miss++; sfx.miss(); show('MISS', '#ff4a6a'); }
    // chunky pad: dark rim, 3-tone body, beat pulse
    g.clearRect(0, 0, W, H); const cx = W / 2, cy = H / 2; const fl = t - st.flash < 0.1;
    const disc = (r: number, c: string, ox = 0, oy = 0) => { g.fillStyle = c; for (let dy = -r; dy <= r; dy++) { const hw = Math.round(Math.sqrt(r * r - dy * dy)); g.fillRect(cx + ox - hw, cy + oy + dy, hw * 2 + 1, 1); } };
    const ring = (r: number, c: string, th: number) => { g.fillStyle = c; const k = Math.max(24, Math.round(r * 7)); for (let i = 0; i < k; i++) { const a = i / k * Math.PI * 2; g.fillRect(Math.round(cx + Math.cos(a) * r - th / 2), Math.round(cy + Math.sin(a) * r - th / 2), th, th); } };
    disc(30, '#05030c', 2, 3); disc(30, '#0a0612'); disc(28, tone(col, -0.45)); disc(25, fl ? '#ffffff' : col, -1, -1); disc(14, tone(col, 0.35), -6, -6); disc(5, '#ffffff', -10, -10);
    for (const n of notes) {
      if (n.j) { if (t - n.at < 0.2) ring(30 + (t - n.at) * 120, n.j === 'miss' ? '#ff4a6a' : '#ffffff', 2); continue; }
      const a = (n.t - t) / LEAD; if (a > 1 || a < -0.3) continue; ring(30 + Math.max(0, a) * 46, '#ffffff', 3);
    }
    // beat dots: one per note, lit when judged
    notes.forEach((n, i) => { const x = Math.round(cx - (notes.length - 1) * 6 + i * 12); g.fillStyle = '#0a0612'; g.fillRect(x - 3, H - 12, 7, 7); g.fillStyle = n.j === 'perfect' ? '#b8ff3a' : n.j === 'good' ? '#3ae8ff' : n.j === 'miss' ? '#ff4a6a' : '#3a2a5a'; g.fillRect(x - 2, H - 11, 5, 5); });
    if (t < 0) { const c = Math.ceil(-t / SP); g.font = '16px "Press Start 2P"'; g.textAlign = 'center'; g.fillStyle = '#0a0612'; g.fillText(c > COUNT_IN ? '' : String(c), cx + 2, 30); g.fillStyle = '#fff'; g.fillText(c > COUNT_IN ? '' : String(c), cx, 28); }
    if (t > notes[notes.length - 1].t + WIN_GOOD + 0.35) return finish();
    requestAnimationFrame(frame);
  };
  const finish = () => {
    st.done = true; ov.removeEventListener('pointerdown', pd); window.removeEventListener('keydown', kd, true);
    const total = notes.length; const acc = (st.perfect + st.good * 0.6) / total; const res = { acc, perfect: st.perfect, good: st.good, miss: st.miss, total };
    (window as any).__dropResult = res;
    setTimeout(() => { ov.remove(); document.body.classList.remove('playing'); done(res); }, 250);
  };
  requestAnimationFrame(frame);
}
