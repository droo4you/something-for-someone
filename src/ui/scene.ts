// Neon night-festival backdrops: dithered sky, parallax skyline + stage rigs, a bobbing crowd,
// sweeping lasers on a 128 BPM beat, ambient light particles and VFX bursts. Rendered to a
// low-res canvas that is CSS-scaled by an integer factor. The deeper the night, the stranger it
// gets: disco-ball moon (warp 1), melting stages (warp 2), glitching scanlines (warp 3).
import { RNG } from '../engine/rng';
import { mix, tone } from './pix';

export type Deco = 'lot' | 'gates' | 'forest' | 'silent' | 'tent' | 'ferris' | 'main' | 'sunrise' | 'title';
export interface Theme { id: string; sky: [string, string, string]; far: string; mid: string; ground: string; ground2: string; accent: string; lights: string[]; ambient: 'confetti' | 'fireflies' | 'glitter' | 'bubbles' | 'sparks' | 'stars'; deco: Deco; lasers: number; warp?: number; sunrise?: boolean }
const L1 = ['#ff3ec8', '#3ae8ff', '#b8ff3a', '#c86aff'];
export const THEMES: Record<string, Theme> = {
  lot: { id: 'lot', sky: ['#0c0a24', '#2a1a4a', '#6a2a6a'], far: '#1a1438', mid: '#120e28', ground: '#24223a', ground2: '#1c1a30', accent: '#ff6ad8', lights: ['#ff6ad8', '#ffe03a', '#3ae8ff'], ambient: 'fireflies', deco: 'lot', lasers: 2 },
  gates: { id: 'gates', sky: ['#0a0c28', '#1a2050', '#3a3a7a'], far: '#161a40', mid: '#0e1028', ground: '#26263a', ground2: '#1e1e30', accent: '#6affd8', lights: ['#6affd8', '#ff3ec8', '#ffffff'], ambient: 'confetti', deco: 'gates', lasers: 3 },
  forest: { id: 'forest', sky: ['#06121e', '#0e2a3a', '#1a4a4a'], far: '#0c2228', mid: '#081a1a', ground: '#14302a', ground2: '#0e2620', accent: '#b8ff6a', lights: ['#b8ff6a', '#ff9ae8', '#ffe03a'], ambient: 'fireflies', deco: 'forest', lasers: 2 },
  silent: { id: 'silent', sky: ['#06041a', '#140a34', '#2a1050'], far: '#140c2e', mid: '#0c0620', ground: '#1a1432', ground2: '#140e28', accent: '#ff4a8a', lights: ['#ff4a8a', '#3ae8ff', '#b8ff3a'], ambient: 'stars', deco: 'silent', lasers: 0 },
  tent: { id: 'tent', sky: ['#10041c', '#2a0a3a', '#4a1050'], far: '#200a30', mid: '#160620', ground: '#261428', ground2: '#1e1020', accent: '#3ae8ff', lights: ['#3ae8ff', '#c86aff', '#ff3ec8'], ambient: 'sparks', deco: 'tent', lasers: 4 },
  ferris: { id: 'ferris', sky: ['#120828', '#341a5a', '#7a3a7a'], far: '#20123a', mid: '#160c2a', ground: '#262038', ground2: '#1e182e', accent: '#ffe03a', lights: ['#ffe03a', '#ff3ec8', '#3ae8ff', '#b8ff3a'], ambient: 'confetti', deco: 'ferris', lasers: 2 },
  main: { id: 'main', sky: ['#04020e', '#100a2a', '#2a0a4a'], far: '#0e0a24', mid: '#08061a', ground: '#16122a', ground2: '#100c22', accent: '#c86aff', lights: ['#c86aff', '#3ae8ff', '#ff3ec8', '#ffffff'], ambient: 'glitter', deco: 'main', lasers: 6 },
  sunrise: { id: 'sunrise', sky: ['#1a0e3a', '#7a3a7a', '#ff9a6a'], far: '#3a1e4a', mid: '#24123a', ground: '#2a2038', ground2: '#221a30', accent: '#ffcf6a', lights: ['#ffcf6a', '#ff9ae8'], ambient: 'bubbles', deco: 'sunrise', lasers: 0, sunrise: true },
  title: { id: 'title', sky: ['#06041a', '#2a0a4a', '#8a2a7a'], far: '#1a0c34', mid: '#0e0820', ground: '#1a1430', ground2: '#140e26', accent: '#ff3ec8', lights: L1, ambient: 'glitter', deco: 'title', lasers: 5, warp: 1 },
};
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
interface P { x: number; y: number; vx: number; vy: number; life: number; max: number; c: string; s: number; g: number; kind?: 'slash' | 'ring' | 'plus' | 'note'; len?: number; amb?: boolean; ph?: number }
function off(w: number, h: number) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')!] as const; }
export const BEAT_FRAMES = 14; // 128 BPM at 30 fps

export class Scene {
  g: CanvasRenderingContext2D; w = 0; h = 0; scale = 2; t = 0; raf = 0; parts: P[] = []; layers: { c: HTMLCanvasElement; speed: number; y: number; bob?: boolean }[] = []; sky?: HTMLCanvasElement; rng = new RNG(5); last = 0;
  flash = 0; walker?: { frames: HTMLCanvasElement[]; x: number; y: number };
  scroll = 1; rigs: { x: number; y: number }[] = []; moon = { x: 0, y: 0, r: 0 };
  constructor(public cv: HTMLCanvasElement, public th: Theme, public groundFrac = 0.3, public walkGround = false, public minH = 150) { this.g = cv.getContext('2d')!; this.resize(); }
  get warp() { return this.th.warp ?? 0; }
  resize() {
    const r = this.cv.parentElement!.getBoundingClientRect();
    this.scale = Math.max(1, Math.min(4, Math.floor(Math.min(r.width / 300, r.height / this.minH))));
    this.w = Math.ceil(r.width / this.scale); this.h = Math.ceil(r.height / this.scale);
    this.cv.width = this.w; this.cv.height = this.h; this.cv.style.width = this.w * this.scale + 'px'; this.cv.style.height = this.h * this.scale + 'px';
    this.g.imageSmoothingEnabled = false; this.build();
  }
  get groundY() { return Math.round(this.h * (1 - this.groundFrac)); }
  build() {
    const { w, h, th } = this; const gy = this.groundY; const rng = new RNG(th.id); const warp = this.warp;
    // ---- sky
    const [sk, sg] = off(w, h); const img = sg.createImageData(w, h);
    const cols = th.sky.map(c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]);
    const bands = 8;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = Math.min(0.999, y / gy) * (bands - 1); const thr = BAYER[y % 4][x % 4] / 16; const band = Math.min(bands - 1, Math.floor(v) + (v % 1 > thr ? 1 : 0));
      const tt = band / (bands - 1); const a = tt < 0.5 ? cols[0] : cols[1], b = tt < 0.5 ? cols[1] : cols[2]; const k = tt < 0.5 ? tt * 2 : (tt - 0.5) * 2;
      const i = (y * w + x) * 4; img.data[i] = a[0] + (b[0] - a[0]) * k; img.data[i + 1] = a[1] + (b[1] - a[1]) * k; img.data[i + 2] = a[2] + (b[2] - a[2]) * k; img.data[i + 3] = 255;
    }
    sg.putImageData(img, 0, 0);
    for (let i = 0; i < w * 0.5; i++) { sg.fillStyle = i % 6 ? '#e8e0ff' : th.lights[i % th.lights.length]; sg.globalAlpha = th.sunrise ? 0.35 : 0.8; sg.fillRect(rng.int(0, w), rng.int(0, Math.round(gy * 0.65)), 1, 1); } sg.globalAlpha = 1;
    const mr = Math.max(7, Math.round(h * 0.075)); this.moon = { x: Math.round(w * 0.78), y: Math.round(gy * 0.3), r: mr };
    if (th.sunrise) { // the sun never quite rises
      const sx = Math.round(w * 0.5), sy = gy - 2, r = Math.round(h * 0.16);
      for (let y = -r; y <= 0; y++) for (let x = -r * 1.6; x <= r * 1.6; x++) { const d = Math.hypot(x / 1.6, y) / r; if (d < 1) { sg.fillStyle = d < 0.55 ? '#fff0b0' : d < 0.8 ? '#ffcf6a' : '#ff9a6a'; if (d < 0.8 || (x + y) % 2 === 0) sg.fillRect(sx + x, sy + y, 1, 1); } }
    } else if (warp >= 1) this.discoMoon(sg, this.moon.x, this.moon.y, mr);
    else { const { x: mx, y: my } = this.moon; for (let y = -mr; y <= mr; y++) for (let x = -mr; x <= mr; x++) { const d = Math.hypot(x, y) / mr; if (d <= 1) { sg.fillStyle = Math.hypot(x - mr * 0.4, y + mr * 0.2) / mr < 0.75 ? '#e8e0ff' : '#fff8e0'; sg.fillRect(mx + x, my + y, 1, 1); } else if (d < 1.5 && (x + y) % 2 === 0) { sg.globalAlpha = 0.2; sg.fillStyle = '#e8e0ff'; sg.fillRect(mx + x, my + y, 1, 1); sg.globalAlpha = 1; } } }
    this.sky = sk;
    this.layers = []; this.rigs = [];
    const LW = w * 2;
    // ---- far: valley ridge + distant light towers
    {
      const [c, g] = off(LW, h); g.fillStyle = th.far; const base = gy - Math.round(h * 0.12);
      for (let x = 0; x < LW; x++) { const f = (x / LW) * Math.PI * 2; const y = base - Math.round(Math.abs(Math.sin(f * 3)) * h * 0.1 + Math.abs(Math.sin(f * 7 + 1)) * h * 0.04); g.fillRect(x, y, 1, h - y); }
      for (let x = 20; x < LW; x += rng.int(50, 90)) { const th2 = rng.int(18, 34); g.fillStyle = tone(th.far, -0.2); g.fillRect(x, base - th2, 2, th2 + 6); for (let y = base - th2; y < base; y += 4) g.fillRect(x - 1, y, 4, 1); g.fillStyle = th.lights[x % th.lights.length]; g.fillRect(x - 1, base - th2 - 2, 4, 2); }
      g.fillStyle = mix(th.far, th.sky[2], 0.5); for (let x = 0; x < LW; x += 2) g.fillRect(x, gy - 2, 1, 1);
      this.layers.push({ c, speed: 0.5, y: 0 });
    }
    // ---- mid: the region's set-piece
    {
      const [c, g] = off(LW, h); const m = th.mid; const hb = gy - Math.round(h * 0.03);
      const dark = tone(m, -0.3), lite = tone(m, 0.35);
      const lightStr = (x0: number, y0: number, x1: number, y1: number, sag: number) => { const n = Math.ceil(Math.abs(x1 - x0)); for (let i = 0; i <= n; i += 1) { const t = i / n; const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag; g.fillStyle = dark; g.fillRect(Math.round(x), Math.round(y), 1, 1); if (i % 4 === 0) { g.fillStyle = th.lights[(i / 4) % th.lights.length]; g.fillRect(Math.round(x), Math.round(y) + 1, 1, 1); } } };
      const truss = (x: number, top: number, wd: number) => { g.fillStyle = dark; g.fillRect(x, top, 2, hb - top); g.fillRect(x + wd - 2, top, 2, hb - top); g.fillRect(x, top, wd, 3); for (let y = top + 4; y < hb; y += 5) { g.fillRect(x + 1, y, 1, 1); g.fillRect(x + wd - 2, y + 2, 1, 1); } for (let i = 0; i < wd; i += 6) { g.fillStyle = th.lights[(i / 6) % th.lights.length]; g.fillRect(x + i + 2, top + 3, 2, 1); } this.rigs.push({ x: x + wd / 2, y: top + 3 }); };
      const screen = (x: number, y: number, ww: number, hh: number) => { g.fillStyle = '#05040c'; g.fillRect(x, y, ww, hh); for (let yy = 1; yy < hh - 1; yy += 2) for (let xx = 1; xx < ww - 1; xx += 2) { g.fillStyle = th.lights[((xx >> 2) + (yy >> 2)) % th.lights.length]; g.globalAlpha = 0.35 + ((xx * yy) % 5) * 0.08; g.fillRect(x + xx, y + yy, 1, 1); } g.globalAlpha = 1; };
      g.fillStyle = m; for (let x = 0; x < LW; x++) { const yy = hb - Math.round(Math.sin((x / LW) * Math.PI * 6) * 2); g.fillRect(x, yy, 1, h - yy); }
      const n = Math.max(3, Math.round(LW / 60));
      for (let i = 0; i < n; i++) {
        const x = Math.round((i + 0.15 + rng.next() * 0.5) * (LW / n));
        switch (th.deco) {
          case 'lot': { // cars, pop-up tents, string lights
            if (i % 2 === 0) { g.fillStyle = dark; g.fillRect(x, hb - 9, 26, 7); g.fillRect(x + 5, hb - 14, 15, 5); g.fillStyle = tone(m, 0.2); g.fillRect(x + 7, hb - 13, 5, 3); g.fillRect(x + 13, hb - 13, 5, 3); g.fillStyle = '#ffe03a'; g.fillRect(x, hb - 7, 2, 1); g.fillStyle = '#ff3a5a'; g.fillRect(x + 24, hb - 7, 2, 1); g.fillStyle = '#05040c'; g.fillRect(x + 4, hb - 3, 4, 3); g.fillRect(x + 18, hb - 3, 4, 3); }
            else { const c2 = th.lights[i % th.lights.length]; g.fillStyle = tone(c2, -0.45); g.beginPath(); g.moveTo(x, hb - 14); g.lineTo(x + 12, hb - 22); g.lineTo(x + 24, hb - 14); g.fill(); g.fillStyle = dark; g.fillRect(x + 1, hb - 14, 1, 14); g.fillRect(x + 22, hb - 14, 1, 14); lightStr(x + 2, hb - 14, x + 22, hb - 14, 2); }
            break; }
          case 'gates': { // chain-link fence + entry arches
            g.fillStyle = dark; for (let k = 0; k < LW / n; k += 3) { g.fillRect(x - 30 + k, hb - 12 + (k % 2), 1, 12); } g.fillRect(x - 30, hb - 12, LW / n, 1);
            if (i % 2 === 0) { g.fillRect(x, hb - 34, 3, 34); g.fillRect(x + 36, hb - 34, 3, 34); g.fillRect(x, hb - 36, 39, 7); g.fillStyle = th.accent; g.fillRect(x + 3, hb - 34, 33, 3); for (let k = 0; k < 6; k++) { g.fillStyle = th.lights[k % th.lights.length]; g.fillRect(x + 5 + k * 5, hb - 33, 2, 1); } g.fillStyle = '#3aff6a'; g.fillRect(x + 4, hb - 20, 2, 3); g.fillStyle = '#ff3a5a'; g.fillRect(x + 33, hb - 20, 2, 3); }
            break; }
          case 'forest': { // trees wrapped in fairy lights + lanterns
            const s = rng.int(18, 30); g.fillStyle = dark; g.fillRect(x - 1, hb - s * 0.5, 3, s * 0.5);
            for (let yy = -s; yy <= 0; yy++) for (let xx = -s * 0.55; xx <= s * 0.55; xx++) { const d = Math.hypot(xx / (s * 0.55), (yy + s / 2) / (s / 2)); if (d <= 1) { g.fillStyle = d > 0.8 ? dark : d < 0.45 && yy < -s * 0.6 ? lite : m; g.fillRect(x + xx, hb - s * 0.5 + yy, 1, 1); if ((xx * 7 + yy * 3) % 11 === 0 && d < 0.9) { g.fillStyle = th.lights[Math.abs(xx + yy) % th.lights.length]; g.fillRect(x + xx, hb - s * 0.5 + yy, 1, 1); } } }
            if (i % 3 === 1) { g.fillStyle = '#ffcf6a'; g.fillRect(x + s * 0.6, hb - s * 0.7, 3, 4); g.fillStyle = dark; g.fillRect(x + s * 0.6 + 1, hb - s * 0.7 - 3, 1, 3); }
            break; }
          case 'silent': { // headphone dome
            if (i % 2 === 0) { const r = rng.int(22, 30); for (let yy = -r; yy <= 0; yy++) for (let xx = -r; xx <= r; xx++) { if (Math.hypot(xx, yy) <= r) { const seg = Math.floor(((Math.atan2(yy, xx) + Math.PI) / Math.PI) * 6); g.fillStyle = Math.hypot(xx, yy) > r - 1.5 ? dark : (xx + yy) % 2 ? m : tone(th.lights[seg % 3], -0.55); g.fillRect(x + xx, hb + yy, 1, 1); } } g.fillStyle = '#05040c'; g.fillRect(x - 5, hb - 10, 10, 10); }
            else { g.fillStyle = dark; g.fillRect(x, hb - 26, 2, 26); g.fillStyle = th.lights[i % 3]; g.fillRect(x - 2, hb - 28, 6, 3); }
            break; }
          case 'tent': { // striped big top + speaker stacks
            if (i % 2 === 0) { const wd = 56, ht = 34; for (let yy = 0; yy < ht; yy++) { const half = Math.round((yy / ht) * wd * 0.5) + 2; for (let xx = -half; xx <= half; xx++) { g.fillStyle = Math.floor((xx + half) / 6) % 2 ? tone('#c8202a', -0.55) : tone('#e8e0f0', -0.6); g.fillRect(x + xx, hb - ht + yy, 1, 1); } } g.fillStyle = dark; g.fillRect(x - 1, hb - ht - 6, 2, 6); g.fillStyle = th.accent; g.fillRect(x - 3, hb - ht - 8, 5, 2); g.fillStyle = '#05040c'; g.fillRect(x - 6, hb - 14, 12, 14); this.rigs.push({ x, y: hb - ht }); }
            else { for (let k = 0; k < 3; k++) { g.fillStyle = dark; g.fillRect(x, hb - 10 - k * 10, 12, 10); g.fillStyle = tone(m, 0.25); g.fillRect(x + 3, hb - 8 - k * 10, 6, 6); g.fillStyle = dark; g.fillRect(x + 5, hb - 6 - k * 10, 2, 2); } }
            break; }
          case 'ferris': { // the wheel + carnival stalls
            if (i === 1) { const r = Math.round(h * 0.28), cx = x, cy = hb - r - 6; g.fillStyle = dark; g.beginPath(); for (let a = 0; a < 64; a++) { const an = (a / 64) * Math.PI * 2; g.fillRect(Math.round(cx + Math.cos(an) * r), Math.round(cy + Math.sin(an) * r), 2, 2); } for (let k = 0; k < 12; k++) { const an = (k / 12) * Math.PI * 2; for (let t = 0; t < r; t += 2) g.fillRect(Math.round(cx + Math.cos(an) * t), Math.round(cy + Math.sin(an) * t), 1, 1); g.fillStyle = th.lights[k % th.lights.length]; g.fillRect(Math.round(cx + Math.cos(an) * r) - 1, Math.round(cy + Math.sin(an) * r) + 2, 3, 3); g.fillStyle = dark; } for (let t = 0; t < r + 6; t++) { g.fillRect(cx - Math.round(t * 0.45), cy + t, 2, 1); g.fillRect(cx + Math.round(t * 0.45), cy + t, 2, 1); } this.rigs.push({ x: cx, y: cy }); }
            else { g.fillStyle = dark; g.fillRect(x, hb - 12, 18, 12); for (let k = 0; k < 18; k += 3) { g.fillStyle = k % 6 ? '#c8202a' : '#e8e0f0'; g.globalAlpha = 0.5; g.fillRect(x + k, hb - 15, 3, 3); } g.globalAlpha = 1; lightStr(x, hb - 15, x + 18, hb - 15, 1); }
            break; }
          case 'main': case 'title': { // the main stage rig
            if (i % 3 === 0) { const wd = 70, top = hb - Math.round(h * 0.42); truss(x, top, wd); screen(x + 8, top + 8, wd - 16, Math.round((hb - top) * 0.45)); g.fillStyle = dark; g.fillRect(x - 6, hb - 8, wd + 12, 8); for (const sx of [x - 12, x + wd + 2]) { for (let k = 0; k < 4; k++) { g.fillStyle = dark; g.fillRect(sx, hb - 8 - k * 8, 10, 8); g.fillStyle = tone(m, 0.25); g.fillRect(sx + 3, hb - 6 - k * 8, 4, 4); } } }
            else if (th.deco === 'title' && i % 3 === 1) { const r = Math.round(h * 0.2), cx = x, cy = hb - r - 4; g.fillStyle = dark; for (let a = 0; a < 48; a++) { const an = (a / 48) * Math.PI * 2; g.fillRect(Math.round(cx + Math.cos(an) * r), Math.round(cy + Math.sin(an) * r), 1, 1); } for (let k = 0; k < 10; k++) { const an = (k / 10) * Math.PI * 2; g.fillStyle = th.lights[k % 4]; g.fillRect(Math.round(cx + Math.cos(an) * r) - 1, Math.round(cy + Math.sin(an) * r), 2, 2); } g.fillStyle = dark; for (let t = 0; t < r + 4; t++) { g.fillRect(cx - Math.round(t * 0.4), cy + t, 1, 1); g.fillRect(cx + Math.round(t * 0.4), cy + t, 1, 1); } }
            break; }
          case 'sunrise': { // a small, empty stage at the edge of everything
            if (i === 1) { const wd = 60, top = hb - Math.round(h * 0.3); truss(x, top, wd); g.fillStyle = dark; g.fillRect(x - 4, hb - 6, wd + 8, 6); g.fillStyle = '#ffcf6a'; g.globalAlpha = 0.6; g.fillRect(x + 20, top + 6, 20, 4); g.globalAlpha = 1; g.fillStyle = dark; g.fillRect(x + 26, hb - 18, 8, 12); g.fillRect(x + 24, hb - 20, 12, 3); }
            break; }
        }
      }
      if (warp >= 2) { // melting stages: drips run off every silhouette edge
        const id = g.getImageData(0, 0, LW, h); const d = id.data;
        for (let k = 0; k < LW / 3; k++) { const x = rng.int(0, LW - 1); let y0 = -1; for (let y = 4; y < hb - 2; y++) { if (d[(y * LW + x) * 4 + 3] > 0) { y0 = y; break; } } if (y0 < 0) continue; const i0 = (y0 * LW + x) * 4; const col = `rgb(${d[i0]},${d[i0 + 1]},${d[i0 + 2]})`; const len = rng.int(2, warp >= 3 ? 12 : 7); g.fillStyle = col; g.fillRect(x, y0 - 1, 1, len); g.fillRect(x, y0 + len - 1, 2, 2); }
      }
      this.layers.push({ c, speed: 1.2, y: 0 });
    }
    // ---- crowd: silhouettes with raised arms and glowsticks, bobbing on the beat
    {
      const [c, g] = off(LW, h); const base = gy + 2; const col = tone(th.mid, -0.5); g.fillStyle = col;
      const density = th.deco === 'sunrise' ? 18 : th.deco === 'forest' ? 9 : 6;
      for (let x = 0; x < LW; x += rng.int(density - 2, density + 3)) {
        const hh = rng.int(7, 11); g.fillStyle = col; g.fillRect(x, base - hh, 4, hh); g.fillRect(x, base - hh - 3, 4, 3); g.fillRect(x + 1, base - hh - 4, 2, 1);
        if (rng.chance(0.35)) { const left = rng.chance(0.5); g.fillRect(left ? x - 1 : x + 4, base - hh - 6, 1, 5); if (rng.chance(0.6)) { g.fillStyle = th.lights[rng.int(0, th.lights.length - 1)]; g.fillRect(left ? x - 1 : x + 4, base - hh - 8, 1, 2); } }
        if (rng.chance(0.08) && th.deco !== 'sunrise') { g.fillStyle = col; g.fillRect(x + 2, base - hh - 16, 1, 12); g.fillStyle = th.lights[rng.int(0, th.lights.length - 1)]; g.fillRect(x, base - hh - 19, 5, 3); } // totem
      }
      this.layers.push({ c, speed: 1.6, y: 0, bob: true });
    }
    // ---- ground: dark festival floor with neon puddles, cups and glowsticks
    {
      const [c, g] = off(LW, h); const G = th.ground, G2 = th.ground2;
      g.fillStyle = G; g.fillRect(0, gy, LW, h - gy);
      g.fillStyle = tone(G, 0.3); g.fillRect(0, gy, LW, 1); g.fillStyle = tone(G, -0.4); g.fillRect(0, gy + 1, LW, 1);
      for (let y = gy + 2; y < h; y += 8) for (let x = ((y / 8) % 2) * 8; x < LW; x += 16) { g.fillStyle = G2; g.fillRect(x, y + 2, 8, 1); g.fillRect(x + 2, y + 5, 3, 1); }
      if (th.deco === 'forest') for (let i = 0; i < LW / 3; i++) { g.fillStyle = tone(G, rng.chance(0.5) ? 0.3 : -0.2); g.fillRect(rng.int(0, LW), rng.int(gy + 2, h), 1, 2); }
      for (let i = 0; i < LW / 18; i++) { const x = rng.int(0, LW), y = rng.int(gy + 4, h - 3); const lc = th.lights[i % th.lights.length]; if (i % 3 === 0) { g.fillStyle = lc; g.fillRect(x, y, 3, 1); g.globalAlpha = 0.25; g.fillRect(x - 1, y - 1, 5, 3); g.globalAlpha = 1; } else { g.fillStyle = mix(lc, G, 0.75); g.fillRect(x, y, rng.int(3, 7), 1); } }
      // neon reflection streaks under the lights
      g.globalAlpha = 0.18; for (let x = 0; x < LW; x += rng.int(10, 24)) { g.fillStyle = th.lights[x % th.lights.length]; g.fillRect(x, gy + 3, 1, Math.round((h - gy) * 0.5)); } g.globalAlpha = 1;
      this.layers.push({ c, speed: this.walkGround ? 6 : 0, y: 0 });
    }
  }
  discoMoon(g: CanvasRenderingContext2D, mx: number, my: number, r: number) {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d = Math.hypot(x, y) / r; if (d > 1) { if (d < 1.6 && (x + y) % 2 === 0) { g.globalAlpha = 0.18; g.fillStyle = '#c8b8ff'; g.fillRect(mx + x, my + y, 1, 1); g.globalAlpha = 1; } continue; }
      const tx = Math.floor((x + r) / 3), ty = Math.floor((y + r) / 3); const lit = (x * -0.6 + y * -0.8) / r;
      const base = (tx + ty) % 2 ? '#b8b0d8' : '#d8d0f0'; g.fillStyle = (x + r) % 3 === 0 || (y + r) % 3 === 0 ? '#6a6090' : lit > 0.45 ? '#ffffff' : lit < -0.4 ? tone(base, -0.35) : base; g.fillRect(mx + x, my + y, 1, 1);
    }
    g.fillStyle = '#6a6090'; g.fillRect(mx, my - r - 8, 1, 8);
  }
  ambientSpawn() {
    const { w, th } = this; const amb = th.ambient; const gy = this.groundY; const r = this.rng;
    if (this.parts.filter(p => p.amb).length >= Math.round(w / 8)) return;
    const lc = th.lights[r.int(0, th.lights.length - 1)];
    if (amb === 'confetti') this.parts.push({ x: r.int(0, w), y: -2, vx: (r.next() - 0.5) * 0.3, vy: 0.3 + r.next() * 0.3, life: 0, max: 500, c: lc, s: r.chance(0.3) ? 2 : 1, g: 0, amb: true, ph: r.next() * 6 });
    else if (amb === 'sparks') this.parts.push({ x: r.int(0, w), y: gy + r.int(0, 8), vx: (r.next() - 0.5) * 0.3, vy: -0.3 - r.next() * 0.4, life: 0, max: 220, c: lc, s: 1, g: 0, amb: true, ph: r.next() * 6 });
    else if (amb === 'bubbles') this.parts.push({ x: r.int(0, w), y: gy + r.int(0, 10), vx: 0, vy: -0.2 - r.next() * 0.2, life: 0, max: 600, c: r.chance(0.5) ? '#ffe8f8' : '#c8f0ff', s: 2, g: 0, amb: true, ph: r.next() * 6 });
    else this.parts.push({ x: r.int(0, w), y: r.int(Math.round(gy * (amb === 'stars' ? 0.05 : 0.35)), gy + 10), vx: 0, vy: 0, life: 0, max: 300 + r.int(0, 200), c: amb === 'stars' ? '#ffffff' : lc, s: 1, g: 0, amb: true, ph: r.next() * 6 });
  }
  /** VFX bursts at low-res coords. Element keys: fire=Bass, water=Flow, wind=Tempo, earth=Wall. */
  burst(kind: string, x: number, y: number, n = 14) {
    const r = this.rng; const P = (o: Partial<P>) => this.parts.push({ x, y, vx: 0, vy: 0, life: 0, max: 30, c: '#fff', s: 1, g: 0, ...o });
    switch (kind) {
      case 'fire': // Bass: magenta shockwave rings + heavy sparks
        P({ max: 14, c: '#ff3ec8', kind: 'ring', len: 3 }); P({ max: 18, c: '#c86aff', kind: 'ring', len: 1 });
        for (let i = 0; i < n; i++) { const a = r.next() * Math.PI * 2; const sp = 0.5 + r.next() * 1.4; P({ vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, max: 22 + r.int(0, 12), c: ['#ffffff', '#ff9ae8', '#ff3ec8', '#a04aff'][r.int(0, 3)], s: r.chance(0.4) ? 2 : 1, g: 0.03 }); } break;
      case 'water': // Flow: cyan droplets + ripple
        P({ max: 18, c: '#3ae8ff', kind: 'ring', len: 2 });
        for (let i = 0; i < n; i++) { const a = r.next() * Math.PI - Math.PI; const sp = 0.6 + r.next() * 1.4; P({ vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.5, max: 30, c: ['#ffffff', '#b8f6ff', '#3ae8ff'][r.int(0, 2)], s: r.chance(0.5) ? 2 : 1, g: 0.08 }); } break;
      case 'wind': // Tempo: lime streaks
        for (let i = 0; i < 5; i++) P({ x: x - 14 + i * 3, y: y - 12 + i * 5, vx: 1.8, vy: 0.5, max: 12, c: i % 2 ? '#ffffff' : '#b8ff3a', kind: 'slash', len: 10 + i * 2 });
        for (let i = 0; i < 8; i++) P({ vx: (r.next() - 0.3) * 2, vy: (r.next() - 0.5) * 1.5, max: 18, c: '#e8ff9a', g: 0 }); break;
      case 'earth': // Wall: amber blocks + kick ring
        P({ max: 16, c: '#ffcf3a', kind: 'ring', len: 4 });
        for (let i = 0; i < n; i++) P({ vx: (r.next() - 0.5) * 2.4, vy: -1 - r.next() * 1.6, max: 36, c: ['#ff9a2a', '#ffcf3a', '#ffffff', '#c86a1a'][r.int(0, 3)], s: r.chance(0.5) ? 3 : 2, g: 0.12 }); break;
      case 'hit': for (let i = 0; i < 8; i++) { const a = r.next() * Math.PI * 2; P({ vx: Math.cos(a) * 1.4, vy: Math.sin(a) * 1.4, max: 12, c: i % 2 ? '#ffffff' : '#ffe8ff' }); } break;
      case 'heal': for (let i = 0; i < n; i++) P({ x: x + r.int(-10, 10), y: y + r.int(-4, 12), vy: -0.5 - r.next() * 0.5, max: 34, c: r.chance(0.5) ? '#3ae8ff' : '#e0fff8', kind: r.chance(0.5) ? 'plus' : 'note' }); break;
      case 'shield': P({ max: 18, c: '#ffcf3a', kind: 'ring', len: 4 }); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; P({ x: x + Math.cos(a) * 14, y: y + Math.sin(a) * 16, vy: -0.2, max: 22, c: '#fff4c8' }); } break;
      case 'cast': for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; P({ x: x + Math.cos(a) * 18, y: y + Math.sin(a) * 18, vx: -Math.cos(a) * 0.9, vy: -Math.sin(a) * 0.9, max: 20, c: this.castColor }); } P({ max: 16, c: this.castColor, kind: 'ring', len: 2 }); for (let i = 0; i < 3; i++) P({ x: x + r.int(-10, 10), y: y - 6, vy: -0.6, vx: (r.next() - 0.5) * 0.4, max: 30, c: this.castColor, kind: 'note' }); break;
      case 'death': for (let i = 0; i < 28; i++) P({ x: x + r.int(-14, 14), y: y + r.int(-18, 14), vx: (r.next() - 0.5) * 0.6, vy: -0.2 - r.next() * 0.6, max: 40 + r.int(0, 20), c: ['#ffffff', '#c8f0ff', '#ff9ae8', '#b8ff3a'][r.int(0, 3)], s: r.chance(0.3) ? 2 : 1 }); break;
      case 'status': for (let i = 0; i < 8; i++) P({ x: x + r.int(-8, 8), y: y + r.int(-6, 6), vy: -0.4 - r.next() * 0.4, max: 22, c: this.castColor }); break;
    }
  }
  castColor = '#ffffff';
  start() {
    const step = (ts: number) => { this.raf = requestAnimationFrame(step); if (ts - this.last < 32) return; this.last = ts; this.t++; this.draw(); };
    this.raf = requestAnimationFrame(step);
  }
  stop() { cancelAnimationFrame(this.raf); }
  get beat() { return (this.t % BEAT_FRAMES) / BEAT_FRAMES; }
  draw() {
    const { g, w, h, th } = this; const gy = this.groundY; const onBeat = this.beat < 0.18;
    g.drawImage(this.sky!, 0, 0);
    if (this.warp >= 1 && !th.sunrise) { const { x, y, r } = this.moon; for (let i = 0; i < 3; i++) { const a = this.t * 0.05 + i * 2.1; const gx = Math.round(x + Math.cos(a) * r * 0.7), gyy = Math.round(y + Math.sin(a * 1.3) * r * 0.7); g.fillStyle = '#ffffff'; g.fillRect(gx, gyy, 1, 1); if ((this.t + i * 5) % 20 < 3) { g.fillRect(gx - 2, gyy, 5, 1); g.fillRect(gx, gyy - 2, 1, 5); } } }
    // lasers / spotlights from the rigs (behind crowd)
    if (th.lasers) {
      const srcs = this.rigs.length ? this.rigs : [{ x: w * 0.2, y: gy - 6 }, { x: w * 0.8, y: gy - 6 }, { x: w * 1.2, y: gy - 6 }, { x: w * 1.7, y: gy - 6 }];
      g.globalAlpha = onBeat ? 0.55 : 0.32;
      for (let i = 0; i < th.lasers; i++) {
        const s = srcs[i % srcs.length]; const sx = s.x - this.layerOffset(1.2, w * 2) ; const sx2 = ((sx % (w * 2)) + w * 2) % (w * 2); const px = sx2 > w + 20 ? sx2 - w * 2 : sx2;
        const ang = Math.PI * 0.5 + Math.sin(this.t * 0.04 + i * 1.7) * 1.1 - Math.PI; const len = h * 1.2; g.fillStyle = th.lights[i % th.lights.length];
        for (let k = 0; k < len; k += 1) { const x = Math.round(px + Math.cos(ang) * k), y = Math.round(s.y + Math.sin(ang) * k); if (y < 0 || x < -2 || x > w + 2) break; g.fillRect(x, y, 1, 1); }
      }
      g.globalAlpha = 1;
    }
    for (const L of this.layers) {
      const ox = L.speed ? this.layerOffset(L.speed, L.c.width) : 0; const yy = L.y + (L.bob && onBeat ? 1 : 0);
      if (!L.speed) { g.drawImage(L.c, 0, yy); continue; } g.drawImage(L.c, -ox, yy); g.drawImage(L.c, L.c.width - ox, yy);
    }
    // beat wash
    if (onBeat && th.lasers) { g.globalAlpha = 0.06; g.fillStyle = th.lights[Math.floor(this.t / BEAT_FRAMES) % th.lights.length]; g.fillRect(0, 0, w, gy); g.globalAlpha = 1; }
    if (this.walker) { const fr = this.walker.frames[Math.floor(this.t / 5) % this.walker.frames.length]; g.drawImage(fr, Math.round(this.walker.x), Math.round(this.walker.y - fr.height)); }
    if (this.t % 3 === 0) this.ambientSpawn();
    const next: P[] = []; const amb = th.ambient; const twinkly = amb === 'fireflies' || amb === 'stars' || amb === 'glitter';
    for (const p of this.parts) {
      p.life++; if (p.life > p.max) continue;
      if (p.amb) { p.ph = (p.ph ?? 0) + 0.05; p.x += p.vx + (twinkly ? Math.cos(p.ph) * 0.2 : Math.sin(p.ph) * 0.15); p.y += p.vy + (twinkly ? Math.sin(p.ph * 0.7) * 0.15 : 0); if (p.x < -4 || p.x > w + 4 || p.y > h + 2 || p.y < -6) continue; }
      else { p.vy += p.g; p.x += p.vx; p.y += p.vy; }
      const fade = 1 - p.life / p.max; g.fillStyle = p.c;
      if (p.amb && twinkly) { if (Math.sin(p.ph! * 2) < -0.3) { next.push(p); continue; } g.globalAlpha = 0.25; g.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 3, 3); g.globalAlpha = 1; }
      if (p.amb && amb === 'bubbles') { const x = Math.round(p.x), y = Math.round(p.y); g.globalAlpha = 0.6; g.fillRect(x - 1, y, 1, 2); g.fillRect(x + 2, y, 1, 2); g.fillRect(x, y - 1, 2, 1); g.fillRect(x, y + 2, 2, 1); g.globalAlpha = 1; next.push(p); continue; }
      if (p.kind === 'slash') { const L = Math.round(p.len! * fade); for (let i = 0; i < L; i++) g.fillRect(Math.round(p.x + i), Math.round(p.y + i * 0.5), 1, i > L / 3 && i < (2 * L) / 3 ? 2 : 1); }
      else if (p.kind === 'ring') { const r = p.len! + p.life * 1.4; g.globalAlpha = fade; for (let a = 0; a < 40; a++) { const an = (a / 40) * Math.PI * 2; g.fillRect(Math.round(p.x + Math.cos(an) * r), Math.round(p.y + Math.sin(an) * r * 1.1), 1, 1); } g.globalAlpha = 1; }
      else if (p.kind === 'plus') { const x = Math.round(p.x), y = Math.round(p.y); g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); }
      else if (p.kind === 'note') { const x = Math.round(p.x), y = Math.round(p.y); g.fillRect(x, y, 2, 2); g.fillRect(x + 1, y - 4, 1, 4); g.fillRect(x + 2, y - 4, 1, 1); }
      else { if (!p.amb && fade < 0.3 && (p.life % 2)) { next.push(p); continue; } g.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s); }
      next.push(p);
    }
    this.parts = next.length > 400 ? next.slice(-400) : next;
    // warp 3: the night glitches
    if (this.warp >= 3 && this.t % 47 < 3) { const y = (this.t * 37) % Math.max(1, h - 8); const hh = 2 + (this.t % 5); try { const strip = g.getImageData(0, y, w, hh); g.putImageData(strip, (this.t % 2 ? 3 : -3), y); } catch { /* ignore */ } g.globalAlpha = 0.25; g.fillStyle = this.t % 2 ? '#3affd8' : '#ff3ec8'; g.fillRect(0, y + hh, w, 1); g.globalAlpha = 1; }
    if (this.flash > 0) { g.globalAlpha = this.flash / 6; g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.globalAlpha = 1; this.flash--; }
  }
  layerOffset(speed: number, width: number) { return Math.floor((this.t * speed * 0.1 * this.scroll) % width); }
}
