// Boss Beat Finales: a ~15 s rhythm finisher after a DJ boss falls. Four skeletons share one engine
// (chart of timed notes, audio-clock timing, Perfect/Good/Miss windows, combo, countdown, results):
//   lanes   - Guitar Hero: gems fall down 4 lanes onto a hit line; tap the lane (D F J K / arrows)
//   circles - osu: tap circles pop up around the stage with shrinking approach rings (tap / Z X Space)
//   runner  - Geometry Dash: auto-runner, obstacles arrive on the beat; tap / Space to jump
//   arrows  - DDR: arrows scroll up to 4 receptors; tap the column or press arrow keys / WASD
// Rendering is a 180x300 logical canvas drawn with chunky shaded blocks, scaled with nearest-neighbour.
import { clockSource, scheduleTrack, sfx } from './audio';
import { tone } from './pix';
import { RNG } from '../engine/rng';
const touch = () => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

export type FinaleKind = 'lanes' | 'circles' | 'runner' | 'arrows';
export interface FinaleResult { kind: FinaleKind; perfect: number; good: number; miss: number; total: number; maxCombo: number; score: number; acc: number }
interface Note { t: number; lane: number; x: number; y: number; n: number; judged: '' | 'perfect' | 'good' | 'miss'; at: number }

export const BPM = 128, SP = 60 / BPM, BEATS = 28, COUNT_IN = 4;
export const WIN_PERFECT = 0.075, WIN_GOOD = 0.15;
const W = 180, H = 300;
const LANE_COL = ['#ff3ec8', '#3ae8ff', '#b8ff3a', '#ffcf3a'];
const LEAD: Record<FinaleKind, number> = { lanes: 1.7 * SP, circles: 2 * SP, runner: 2.4 * SP, arrows: 1.9 * SP };
export const TITLE: Record<FinaleKind, string> = { lanes: 'DROP THE GEMS', circles: 'HIT THE LIGHTS', runner: 'RUN THE BEAT', arrows: 'DANCE DANCE DROP' };
const HOWTO_TOUCH: Record<FinaleKind, string> = { lanes: 'Tap the lane as its gem hits the line', circles: 'Tap each circle as its ring closes', runner: 'Tap anywhere to jump on the beat', arrows: 'Tap the column as arrows reach the top' };
export const HOWTO: Record<FinaleKind, string> = {
  lanes: 'Tap a lane as its gem hits the line (keys D F J K)', circles: 'Tap each circle as its ring closes (or Z / X / Space)',
  runner: 'Tap to jump each obstacle on the beat (or Space)', arrows: 'Tap the arrow column as arrows reach the top (arrow keys / WASD)',
};

export function chart(kind: FinaleKind, seed: string): Note[] {
  const rng = new RNG(seed + kind); const out: Note[] = []; let last = -1, n = 0;
  const add = (b: number, lane = -1) => {
    if (lane < 0) { do lane = rng.int(0, 3); while (lane === last); } last = lane;
    out.push({ t: b * SP, lane, x: 26 + rng.int(0, W - 52), y: 46 + rng.int(0, H - 120), n: (n++ % 8) + 1, judged: '', at: 0 });
  };
  for (let b = 0; b < BEATS; b++) {
    const dense = b >= 8 && b < 24;
    if (kind === 'runner') { if (b < 8 ? b % 2 === 0 : b >= 24 ? b % 2 === 0 : true) add(b, 0); if (dense && b % 4 === 3) add(b + 0.5, 0); continue; }
    add(b);
    if (dense && b % 2 === 1) add(b + 0.5);
    if (kind === 'lanes' && b % 8 === 0 && b > 0) add(b, (last + 2) % 4); // chord on bar starts
  }
  if (kind === 'circles') { // keep successive circles apart so taps never overlap
    for (let i = 1; i < out.length; i++) for (let k = 0; k < 10 && Math.hypot(out[i].x - out[i - 1].x, out[i].y - out[i - 1].y) < 40; k++) { out[i].x = 26 + rng.int(0, W - 52); out[i].y = 46 + rng.int(0, H - 120); }
  }
  return out.sort((a, b) => a.t - b.t);
}

// ---------- pixel helpers
function gem(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) {
  x = Math.round(x); y = Math.round(y);
  g.fillStyle = '#0a0612'; g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle = tone(c, -0.42); g.fillRect(x, y, w, h);
  g.fillStyle = c; g.fillRect(x, y, w - 1, h - 1);
  g.fillStyle = tone(c, 0.35); g.fillRect(x, y, w - 1, 1); g.fillRect(x, y, 1, h - 1);
  g.fillStyle = '#ffffff'; g.fillRect(x + 1, y + 1, 2, 1);
}
function ring(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, c: string, th = 1) {
  g.fillStyle = c; const n = Math.max(16, Math.round(r * 7));
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; g.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), th, th); }
}
function disc(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, c: string) {
  g.fillStyle = c; for (let dy = -r; dy <= r; dy++) { const hw = Math.round(Math.sqrt(r * r - dy * dy)); g.fillRect(Math.round(cx - hw), Math.round(cy + dy), hw * 2 + 1, 1); }
}
const ARROW = [ // 9x9 arrow pointing left; rotated per lane (0 left, 1 down, 2 up, 3 right)
  '....#....', '...##....', '..###....', '.########', '#########', '.########', '..###....', '...##....', '....#....'];
function arrow(g: CanvasRenderingContext2D, x: number, y: number, lane: number, c: string, s = 2, hollow = false) {
  const at = (i: number, j: number) => { // sample the left-pointing template, rotated per lane (0 left, 1 down, 2 up, 3 right)
    if (i < 0 || j < 0 || i > 8 || j > 8) return false;
    const [u, v] = lane === 0 ? [i, j] : lane === 3 ? [8 - i, j] : lane === 2 ? [j, i] : [8 - j, i];
    return ARROW[v][u] === '#';
  };
  for (let j = 0; j < 9; j++) for (let i = 0; i < 9; i++) {
    if (!at(i, j)) continue;
    if (hollow && at(i + 1, j) && at(i - 1, j) && at(i, j + 1) && at(i, j - 1)) continue;
    g.fillStyle = hollow ? tone(c, -0.3) : (j < 3 ? tone(c, 0.3) : j > 6 ? tone(c, -0.35) : c);
    g.fillRect(Math.round(x + (i - 4.5) * s), Math.round(y + (j - 4.5) * s), s, s);
  }
}
function stageBg(g: CanvasRenderingContext2D, t: number, accent: string) {
  g.fillStyle = '#0c0820'; g.fillRect(0, 0, W, H);
  const beat = ((t / SP) % 1 + 1) % 1; const pulse = beat < 0.15 ? 1 : 0;
  for (let i = 0; i < 6; i++) { // sweeping lasers
    const a = Math.sin(t * 0.9 + i * 1.3) * 0.7; const ox = (i % 2 ? W : 0); g.fillStyle = i % 2 ? '#3ae8ff' : accent; g.globalAlpha = 0.09 + pulse * 0.06;
    for (let y = 0; y < H; y += 2) g.fillRect(Math.round(ox + (i % 2 ? -1 : 1) * y * (0.6 + a)), y, 2, 2);
  }
  g.globalAlpha = 1;
  g.fillStyle = '#05030c'; for (let x = 0; x < W; x += 6) { const hh = 6 + ((x * 37) % 9) + (pulse && x % 12 === 0 ? 2 : 0); g.fillRect(x, H - hh, 5, hh); } // crowd silhouettes
  if (pulse) { g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(0, 0, W, H); }
}

// ---------- engine
export interface FinaleOpts { kind: FinaleKind; seed: string; accent: string; bossName: string }
export class Finale {
  notes: Note[]; clock = clockSource(); t0 = 0; combo = 0; maxCombo = 0; score = 0; perfect = 0; good = 0; miss = 0;
  pops: { txt: string; c: string; x: number; y: number; at: number }[] = []; laneFlash = [0, 0, 0, 0]; jumpAt = -9; tripAt = -9; done = false; raf = 0; unfit = () => {};
  g: CanvasRenderingContext2D; onEnd: (r: FinaleResult) => void; hud: HTMLElement;
  constructor(public cv: HTMLCanvasElement, hud: HTMLElement, public o: FinaleOpts, onEnd: (r: FinaleResult) => void) {
    this.notes = chart(o.kind, o.seed); cv.width = W; cv.height = H; this.g = cv.getContext('2d')!; this.onEnd = onEnd; this.hud = hud;
    this.t0 = this.clock() + COUNT_IN * SP + 0.25; scheduleTrack(this.clock, this.t0, BPM, BEATS, COUNT_IN);
    const down = (e: PointerEvent) => { e.preventDefault(); const r = cv.getBoundingClientRect(); this.tap(((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H); };
    cv.addEventListener('pointerdown', down);
    // mobile: full visual-viewport layout with a slim header, no scroll / zoom / selection while playing
    document.body.classList.add('playing'); const root = cv.closest('.finale') as HTMLElement | null;
    const stop = (e: Event) => e.preventDefault(); root?.addEventListener('touchmove', stop, { passive: false }); root?.addEventListener('dblclick', stop); root?.addEventListener('gesturestart', stop as any);
    const fit = () => { const vv = window.visualViewport; const vw = vv?.width ?? innerWidth, vh = vv?.height ?? innerHeight;
      const head = root?.querySelector<HTMLElement>('.fhead')?.offsetHeight ?? 0; const cs = root ? getComputedStyle(root) : null;
      const pad = cs ? parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) : 0; const avH = vh - head - pad - 14;
      const w = Math.floor(Math.min(vw - 12, avH * (W / H), 480)); hud.style.width = w + 'px'; hud.style.height = Math.floor(w * (H / W)) + 'px'; };
    fit(); window.visualViewport?.addEventListener('resize', fit); window.addEventListener('resize', fit); this.unfit = () => { window.visualViewport?.removeEventListener('resize', fit); window.removeEventListener('resize', fit); document.body.classList.remove('playing'); };
    const loop = () => { if (this.done) return; this.frame(); this.raf = requestAnimationFrame(loop); }; loop();
  }
  get now() { return this.clock() - this.t0; }
  key(k: string): boolean {
    const kind = this.o.kind; const K = k.length === 1 ? k.toLowerCase() : k;
    if (kind === 'lanes') { const m: Record<string, number> = { d: 0, f: 1, j: 2, k: 3, ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3 }; if (K in m) { this.press(m[K]); return true; } }
    if (kind === 'arrows') { const m: Record<string, number> = { ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3, a: 0, s: 1, w: 2, d: 3 }; if (K in m) { this.press(m[K]); return true; } }
    if ((kind === 'circles' || kind === 'runner') && [' ', 'z', 'x', 'Enter', 'ArrowUp', 'w'].includes(K)) { this.press(-1); return true; }
    return false;
  }
  tap(x: number, y: number) {
    const kind = this.o.kind;
    if (kind === 'lanes' || kind === 'arrows') return this.press(Math.max(0, Math.min(3, Math.floor(x / (W / 4)))));
    if (kind === 'runner') return this.press(-1);
    // circles: the earliest live circle under the finger
    const t = this.now; const c = this.notes.find(n => !n.judged && Math.abs(n.t - t) <= WIN_GOOD + 0.05 && Math.hypot(n.x - x, n.y - y) <= 20);
    if (c) this.judge(c, t);
  }
  /** lane -1 = any lane (circles via keyboard, runner jump) */
  press(lane: number) {
    const t = this.now; if (lane >= 0) this.laneFlash[lane] = t;
    if (this.o.kind === 'runner' && t - this.jumpAt > 0.22) this.jumpAt = t;
    const cand = this.notes.filter(n => !n.judged && (lane < 0 || n.lane === lane) && Math.abs(n.t - t) <= WIN_GOOD);
    if (!cand.length) return; // stray taps never cost anything
    cand.sort((a, b) => Math.abs(a.t - t) - Math.abs(b.t - t)); this.judge(cand[0], t);
  }
  judge(n: Note, t: number) {
    const d = Math.abs(n.t - t); n.at = t;
    if (d <= WIN_PERFECT) { n.judged = 'perfect'; this.perfect++; this.combo++; this.score += 300 + this.combo * 5; sfx.perfect(); }
    else { n.judged = 'good'; this.good++; this.combo++; this.score += 100 + this.combo * 2; sfx.good(); }
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.pop(n.judged === 'perfect' ? 'PERFECT' : 'GOOD', n.judged === 'perfect' ? '#b8ff3a' : '#3ae8ff', n);
  }
  pop(txt: string, c: string, n: Note) {
    const p = this.pos(n, n.t); this.pops.push({ txt, c, x: p[0], y: p[1], at: this.now });
    this.hud.querySelector('.fj')!.innerHTML = `<span style="color:${c}">${txt}</span>`; (this.hud.querySelector('.fj') as HTMLElement).classList.remove('fpop'); void (this.hud.querySelector('.fj') as HTMLElement).offsetWidth; (this.hud.querySelector('.fj') as HTMLElement).classList.add('fpop');
  }
  pos(n: Note, t: number): [number, number] {
    const k = this.o.kind, dt = n.t - t, L = LEAD[k];
    if (k === 'lanes') return [(n.lane + 0.5) * (W / 4), HIT_Y - (dt / L) * (HIT_Y - 20)];
    if (k === 'arrows') return [(n.lane + 0.5) * (W / 4), REC_Y + (dt / L) * (H - REC_Y - 10)];
    if (k === 'runner') return [RUN_X + (dt / L) * (W - RUN_X + 10), GROUND - 1];
    return [n.x, n.y];
  }
  frame() {
    const t = this.now, g = this.g, k = this.o.kind;
    for (const n of this.notes) if (!n.judged && t - n.t > WIN_GOOD) { n.judged = 'miss'; n.at = t; this.miss++; this.combo = 0; if (k === 'runner') this.tripAt = t; sfx.miss(); this.pop('MISS', '#ff4a6a', n); }
    stageBg(g, t, this.o.accent);
    if (k === 'lanes') this.drawLanes(t); else if (k === 'arrows') this.drawArrows(t); else if (k === 'runner') this.drawRunner(t); else this.drawCircles(t);
    // judgment pops above notes
    g.font = '8px "Press Start 2P"'; g.textAlign = 'center';
    this.pops = this.pops.filter(p => t - p.at < 0.5);
    for (const p of this.pops) { const yy = Math.round(p.y - 8 - (t - p.at) * 20); g.fillStyle = '#0a0612'; g.fillText(p.txt, p.x + 1, yy + 1); g.fillStyle = p.c; g.fillText(p.txt, p.x, yy); }
    // progress bar
    const prog = Math.max(0, Math.min(1, t / (BEATS * SP))); g.fillStyle = '#0a0612'; g.fillRect(0, 0, W, 4); g.fillStyle = this.o.accent; g.fillRect(0, 0, Math.round(W * prog), 3);
    const cd = Math.ceil(-t / SP);
    this.hud.querySelector('.fs')!.textContent = String(this.score).padStart(6, '0');
    this.hud.querySelector('.fc')!.textContent = this.combo > 1 ? `${this.combo} COMBO` : '';
    this.hud.querySelector('.fcd')!.textContent = t < 0 ? (cd > 0 && cd <= COUNT_IN ? (cd === 1 ? 'GO!' : String(cd - 1)) : '') : '';
    if (t > BEATS * SP + 0.6 && !this.done) this.finish();
  }
  finish() {
    this.done = true; cancelAnimationFrame(this.raf); this.unfit();
    const total = this.notes.length; const acc = total ? (this.perfect + this.good * 0.6) / total : 0;
    this.onEnd({ kind: this.o.kind, perfect: this.perfect, good: this.good, miss: this.miss, total, maxCombo: this.maxCombo, score: this.score, acc });
  }
  // ---- per-skeleton drawing
  drawLanes(t: number) {
    const g = this.g, lw = W / 4;
    for (let l = 0; l < 4; l++) {
      g.fillStyle = l % 2 ? 'rgba(255,255,255,.035)' : 'rgba(255,255,255,.06)'; g.fillRect(l * lw, 0, lw, H);
      g.fillStyle = '#05030c'; g.fillRect(Math.round(l * lw), 0, 1, H);
      const fl = t - this.laneFlash[l] < 0.12; g.globalAlpha = fl ? 0.35 : 0.12; g.fillStyle = LANE_COL[l]; g.fillRect(l * lw + 2, HIT_Y - 60, lw - 4, 60); g.globalAlpha = 1;
      gem(g, l * lw + 6, HIT_Y - 4, lw - 12, 9, fl ? '#ffffff' : tone(LANE_COL[l], -0.25)); g.fillStyle = '#0a0612'; g.fillRect(l * lw + 10, HIT_Y - 1, lw - 20, 3);
      if (!touch()) { g.font = '8px "Press Start 2P"'; g.textAlign = 'center'; g.fillStyle = tone(LANE_COL[l], 0.2); g.fillText('DFJK'[l], (l + 0.5) * lw, HIT_Y + 22); }
    }
    for (const n of this.notes) {
      if (n.judged && n.judged !== 'miss') { if (t - n.at < 0.15) ring(g, (n.lane + 0.5) * lw, HIT_Y, 6 + (t - n.at) * 80, '#ffffff', 2); continue; }
      const [x, y] = this.pos(n, t); if (y < -10 || y > H) continue; if (n.judged === 'miss') g.globalAlpha = 0.35;
      gem(g, x - lw / 2 + 7, y - 4, lw - 14, 8, LANE_COL[n.lane]); g.globalAlpha = 1;
    }
  }
  drawArrows(t: number) {
    const g = this.g, lw = W / 4;
    for (let l = 0; l < 4; l++) { const fl = t - this.laneFlash[l] < 0.12; arrow(g, (l + 0.5) * lw, REC_Y, l, fl ? '#ffffff' : '#c8c0e8', 3, !fl); if (fl) { g.globalAlpha = 0.25; g.fillStyle = LANE_COL[l]; g.fillRect(l * lw + 4, REC_Y - 14, lw - 8, 28); g.globalAlpha = 1; } }
    for (const n of this.notes) {
      if (n.judged && n.judged !== 'miss') { if (t - n.at < 0.15) ring(g, (n.lane + 0.5) * lw, REC_Y, 8 + (t - n.at) * 90, LANE_COL[n.lane], 2); continue; }
      const [x, y] = this.pos(n, t); if (y > H + 10 || y < -10) continue; if (n.judged === 'miss') g.globalAlpha = 0.35;
      g.fillStyle = '#0a0612'; arrow(g, x + 1, y + 1, n.lane, '#0a0612', 3); arrow(g, x, y, n.lane, LANE_COL[n.lane], 3); g.globalAlpha = 1;
    }
    if (!touch()) { g.font = '7px "Press Start 2P"'; g.textAlign = 'center'; g.fillStyle = '#6a5a8a'; ['<', 'v', '^', '>'].forEach((s, l) => g.fillText(s, (l + 0.5) * lw, H - 6)); }
  }
  drawCircles(t: number) {
    const g = this.g; const L = LEAD.circles;
    const live = this.notes.filter(n => (!n.judged && n.t - t < L) || (n.judged && t - n.at < 0.2)).reverse();
    for (const n of live) {
      const c = LANE_COL[n.n % 4];
      if (n.judged) { const k = (t - n.at) / 0.2; g.globalAlpha = 1 - k; ring(g, n.x, n.y, 12 + k * 10, n.judged === 'miss' ? '#ff4a6a' : '#ffffff', 2); g.globalAlpha = 1; continue; }
      const a = Math.max(0, (n.t - t) / L); g.globalAlpha = Math.min(1, (1 - a) * 3);
      disc(g, n.x + 1, n.y + 2, 12, '#05030c'); disc(g, n.x, n.y, 12, '#0a0612'); disc(g, n.x, n.y, 11, tone(c, -0.4)); disc(g, n.x - 1, n.y - 1, 9, c); disc(g, n.x - 3, n.y - 3, 3, tone(c, 0.45));
      g.font = '8px "Press Start 2P"'; g.textAlign = 'center'; g.fillStyle = '#0a0612'; g.fillText(String(n.n), n.x + 1, n.y + 5); g.fillStyle = '#fff'; g.fillText(String(n.n), n.x, n.y + 4);
      ring(g, n.x, n.y, 12 + a * 26, '#ffffff', 2); g.globalAlpha = 1;
    }
  }
  drawRunner(t: number) {
    const g = this.g;
    // scrolling floor tiles + far speaker skyline
    const sc = (t * 60) % 16;
    g.fillStyle = '#1a1238'; for (let x = -16; x < W + 16; x += 22) { const xx = Math.round(x - ((t * 18) % 22)); g.fillRect(xx, GROUND - 60, 14, 60); g.fillStyle = '#2a1e50'; g.fillRect(xx + 3, GROUND - 52, 8, 8); g.fillRect(xx + 3, GROUND - 36, 8, 8); g.fillStyle = '#1a1238'; }
    g.fillStyle = '#2a1e50'; g.fillRect(0, GROUND, W, H - GROUND);
    for (let x = -16; x < W + 16; x += 16) { const xx = Math.round(x - sc); gem(g, xx, GROUND, 15, 6, '#4a3a8a'); }
    g.fillStyle = this.o.accent; g.fillRect(0, GROUND, W, 1);
    // obstacles: speaker spikes
    for (const n of this.notes) {
      const [x] = this.pos(n, t); if (x < -12 || x > W + 12) continue;
      const cleared = n.judged === 'perfect' || n.judged === 'good';
      g.globalAlpha = cleared ? 0.5 : 1;
      g.fillStyle = '#0a0612'; for (let r = 0; r < 12; r++) g.fillRect(Math.round(x - 6 + r / 2) - 1, GROUND - r - 1, 14 - r + 2, 1);
      for (let r = 0; r < 12; r++) { g.fillStyle = r < 4 ? tone('#ff3ec8', -0.4) : r > 9 ? tone('#ff3ec8', 0.4) : '#ff3ec8'; g.fillRect(Math.round(x - 6 + r / 2), GROUND - r - 1, 12 - r, 1); }
      g.globalAlpha = 1;
    }
    // runner: jump arc 0.5 beat up/down, trip wobble on misses
    const jt = (t - this.jumpAt) / (SP * 0.9); const jy = jt >= 0 && jt < 1 ? Math.sin(jt * Math.PI) * 26 : 0;
    const trip = t - this.tripAt < 0.25; const bx = RUN_X - 5, by = Math.round(GROUND - 16 - jy) + (trip ? 2 : 0);
    disc(g, RUN_X, GROUND + 2, Math.max(2, 6 - Math.round(jy / 6)), '#05030c');
    gem(g, bx, by, 10, 11, trip ? '#ff4a6a' : '#b8ff3a'); gem(g, bx + 2, by - 7, 7, 7, '#e8c890');
    g.fillStyle = '#0a0612'; g.fillRect(bx + 6, by - 5, 1, 2); g.fillStyle = '#ff3ec8'; g.fillRect(bx + 1, by - 8, 9, 2);
    const step = Math.floor(t * 8) % 2; if (!jy) { g.fillStyle = '#0a0612'; g.fillRect(bx + (step ? 1 : 6), by + 11, 3, 4); g.fillRect(bx + (step ? 6 : 1), by + 11, 3, 2); }
    g.fillStyle = '#3ae8ff'; g.fillRect(bx + 10, by + 2 - (jy ? 3 : 0), 1, 6); // glowstick
  }
}
const HIT_Y = 236, REC_Y = 34, GROUND = 220, RUN_X = 44;

export function finaleHtml(o: FinaleOpts) {
  return `<div class="finale"><div class="panel dark center fhead"><div class="tiny muted">BEAT FINALE &middot; ${o.bossName}</div><h2 class="victory" style="margin:4px 0">${TITLE[o.kind]}</h2><div class="tiny">${(touch() ? HOWTO_TOUCH : HOWTO)[o.kind]}</div></div>
    <div class="fstage"><canvas class="px fcv"></canvas><div class="fhud"><span class="fs">000000</span><span class="fc"></span></div><div class="fj"></div><div class="fcd"></div></div></div>`;
}
