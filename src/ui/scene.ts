// Layered parallax pixel backdrops + ambient and VFX particles, rendered to a low-res canvas
// that is CSS-scaled by an integer factor.
import { RNG } from '../engine/rng';
import { mix, tone } from './pix';

export interface Theme { id: string; sky: [string, string, string]; far: string; mid: string; ground: string; ground2: string; accent: string; ambient: 'leaves' | 'fireflies' | 'ash' | 'snow' | 'motes' | 'stars' | 'petals'; deco: 'hills' | 'pines' | 'ruins' | 'volcano' | 'peaks' | 'marsh' | 'citadel' | 'title'; sun?: string }
export const THEMES: Record<string, Theme> = {
  meadow: { id: 'meadow', sky: ['#6ab8f0', '#a8dcff', '#fff0c8'], far: '#8ac8a0', mid: '#5aa85a', ground: '#6bbf59', ground2: '#4f9a42', accent: '#f6e27a', ambient: 'petals', deco: 'hills', sun: '#fff6c0' },
  woods: { id: 'woods', sky: ['#3a6a5a', '#6a9a7a', '#b8d8a0'], far: '#3a6a4a', mid: '#24482e', ground: '#3a7a3a', ground2: '#2a5a2a', accent: '#c8f08a', ambient: 'fireflies', deco: 'pines' },
  roads: { id: 'roads', sky: ['#e89a6a', '#f0c890', '#fff0c8'], far: '#c89a7a', mid: '#8a6a5a', ground: '#b89a6a', ground2: '#9a7a4a', accent: '#d4af37', ambient: 'leaves', deco: 'ruins', sun: '#fff0a0' },
  ashen: { id: 'ashen', sky: ['#3a2026', '#7a3a32', '#d8704a'], far: '#5a3030', mid: '#3a2424', ground: '#4a3838', ground2: '#3a2a2a', accent: '#ff7a2b', ambient: 'ash', deco: 'volcano' },
  frost: { id: 'frost', sky: ['#7aa8d8', '#b8d8f0', '#f0f8ff'], far: '#c8dcf0', mid: '#8aaed0', ground: '#e8f2f8', ground2: '#c8dcec', accent: '#7ab8e8', ambient: 'snow', deco: 'peaks', sun: '#ffffff' },
  marsh: { id: 'marsh', sky: ['#4a5a5a', '#7a8a7a', '#b8c0a0'], far: '#5a6a5a', mid: '#3a4a3a', ground: '#4a5a32', ground2: '#3a4a2a', accent: '#a8c858', ambient: 'fireflies', deco: 'marsh' },
  citadel: { id: 'citadel', sky: ['#1a1a34', '#3a2a5a', '#7a4a8a'], far: '#3a3058', mid: '#26203a', ground: '#3a3448', ground2: '#2a2638', accent: '#9a5af5', ambient: 'motes', deco: 'citadel', sun: '#e8d8ff' },
  title: { id: 'title', sky: ['#1e1838', '#6a3a6a', '#f0986a'], far: '#5a3a6a', mid: '#3a2a4a', ground: '#3a2a2a', ground2: '#2a1e1e', accent: '#f2c14e', ambient: 'fireflies', deco: 'title', sun: '#ffe8a8' },
};
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
interface P { x: number; y: number; vx: number; vy: number; life: number; max: number; c: string; s: number; g: number; kind?: 'slash' | 'ring' | 'plus'; len?: number; amb?: boolean; ph?: number }

function off(w: number, h: number) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')!] as const; }

export class Scene {
  g: CanvasRenderingContext2D; w = 0; h = 0; scale = 2; t = 0; raf = 0; parts: P[] = []; layers: { c: HTMLCanvasElement; speed: number; y: number }[] = []; sky?: HTMLCanvasElement; rng = new RNG(5); last = 0;
  flash = 0; walker?: { frames: HTMLCanvasElement[]; x: number; y: number };
  scroll = 1;
  constructor(public cv: HTMLCanvasElement, public th: Theme, public groundFrac = 0.3, public walkGround = false, public minH = 150) { this.g = cv.getContext('2d')!; this.resize(); }
  resize() {
    const r = this.cv.parentElement!.getBoundingClientRect();
    this.scale = Math.max(1, Math.min(4, Math.floor(Math.min(r.width / 300, r.height / this.minH))));
    this.w = Math.ceil(r.width / this.scale); this.h = Math.ceil(r.height / this.scale);
    this.cv.width = this.w; this.cv.height = this.h; this.cv.style.width = this.w * this.scale + 'px'; this.cv.style.height = this.h * this.scale + 'px';
    this.g.imageSmoothingEnabled = false; this.build();
  }
  get groundY() { return Math.round(this.h * (1 - this.groundFrac)); }
  build() {
    const { w, h, th } = this; const gy = this.groundY; const rng = new RNG(th.id);
    // sky: 3-stop ordered-dither gradient
    const [sk, sg] = off(w, h); const img = sg.createImageData(w, h);
    const cols = th.sky.map(c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]);
    const bands = 7;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = Math.min(0.999, y / gy) * (bands - 1); const thr = BAYER[y % 4][x % 4] / 16; const band = Math.min(bands - 1, Math.floor(v) + (v % 1 > thr ? 1 : 0));
      const tt = band / (bands - 1); const a = tt < 0.5 ? cols[0] : cols[1], b = tt < 0.5 ? cols[1] : cols[2]; const k = tt < 0.5 ? tt * 2 : (tt - 0.5) * 2;
      const i = (y * w + x) * 4; img.data[i] = a[0] + (b[0] - a[0]) * k; img.data[i + 1] = a[1] + (b[1] - a[1]) * k; img.data[i + 2] = a[2] + (b[2] - a[2]) * k; img.data[i + 3] = 255;
    }
    sg.putImageData(img, 0, 0);
    if (th.sun) { sg.fillStyle = th.sun; const sx = Math.round(w * 0.72), sy = Math.round(gy * 0.35), r = Math.max(8, Math.round(h * 0.09)); for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const d = Math.hypot(x, y) / r; if (d <= 1) sg.fillRect(sx + x, sy + y, 1, 1); else if (d < 1.4 && (x + y) % 2 === 0) { sg.globalAlpha = 0.35; sg.fillRect(sx + x, sy + y, 1, 1); sg.globalAlpha = 1; } } }
    if (th.deco === 'citadel' || th.deco === 'title') { for (let i = 0; i < 50; i++) { sg.fillStyle = i % 5 ? '#fff6e0' : '#ffe0a0'; sg.fillRect(rng.int(0, w), rng.int(0, Math.round(gy * 0.6)), 1, 1); } }
    this.sky = sk;
    this.layers = [];
    const LW = w * 2;
    // far layer: mountains / hills
    {
      const [c, g] = off(LW, h); g.fillStyle = th.far; const peaks = th.deco === 'peaks' || th.deco === 'volcano' || th.deco === 'title';
      const base = gy - Math.round(h * 0.18); let y = base;
      for (let x = 0; x < LW; x++) {
        const f = x / LW * Math.PI * 2;
        y = base - Math.round((peaks ? Math.abs(Math.sin(f * 3)) * h * 0.22 + Math.abs(Math.sin(f * 7 + 1)) * h * 0.06 : Math.sin(f * 2) * h * 0.05 + Math.sin(f * 5) * h * 0.03 + h * 0.04));
        g.fillRect(x, y, 1, h - y);
        if (peaks && th.deco !== 'volcano') { g.fillStyle = mix(th.far, '#ffffff', 0.55); const snowLine = base - h * 0.16; if (y < snowLine) g.fillRect(x, y, 1, Math.max(1, Math.round((snowLine - y) * 0.6))); g.fillStyle = th.far; }
      }
      if (th.deco === 'volcano') { const vx = Math.round(LW * 0.3); g.fillStyle = tone(th.far, -0.2); g.beginPath(); g.moveTo(vx - 60, gy); g.lineTo(vx - 10, base - h * 0.3); g.lineTo(vx + 10, base - h * 0.3); g.lineTo(vx + 60, gy); g.fill(); g.fillStyle = th.accent; g.fillRect(vx - 8, Math.round(base - h * 0.3), 16, 2); g.fillRect(vx - 2, Math.round(base - h * 0.3), 2, Math.round(h * 0.15)); }
      // haze line
      g.fillStyle = mix(th.far, th.sky[2], 0.5); for (let x = 0; x < LW; x += 2) g.fillRect(x, gy - 2, 1, 1);
      this.layers.push({ c, speed: 0.6, y: 0 });
    }
    // mid layer: theme decorations
    {
      const [c, g] = off(LW, h); const m = th.mid; g.fillStyle = m;
      const hillBase = gy - Math.round(h * 0.06);
      for (let x = 0; x < LW; x++) { const yy = hillBase - Math.round(Math.sin(x / LW * Math.PI * 6) * 3 + Math.sin(x / LW * Math.PI * 14) * 2); g.fillRect(x, yy, 1, h - yy); }
      const dark = tone(m, -0.25), lite = tone(m, 0.25);
      const tree = (x: number, s: number, pine: boolean) => {
        if (pine) { for (let i = 0; i < s; i++) { const ww = Math.round((i / s) * s * 0.45) + 1; g.fillStyle = i % 4 === 0 ? dark : m; g.fillRect(x - ww, hillBase - s - 4 + i, ww * 2, 1); g.fillStyle = lite; g.fillRect(x - ww, hillBase - s - 4 + i, 1, 1); } g.fillStyle = dark; g.fillRect(x - 1, hillBase - 4, 2, 4); }
        else { g.fillStyle = dark; g.fillRect(x - 1, hillBase - s * 0.6, 2, s * 0.6); for (let yy = -s; yy <= 0; yy++) for (let xx = -s * 0.6; xx <= s * 0.6; xx++) { const d = Math.hypot(xx / (s * 0.6), (yy + s / 2) / (s / 2)); if (d <= 1) { g.fillStyle = d > 0.75 && yy > -s / 2 ? dark : d < 0.5 && yy < -s * 0.6 ? lite : m; g.fillRect(x + xx, hillBase - s * 0.5 + yy, 1, 1); } } }
      };
      const n = Math.round(LW / 26);
      for (let i = 0; i < n; i++) {
        const x = Math.round((i + rng.next() * 0.8) * (LW / n)); const s = rng.int(10, 20);
        switch (th.deco) {
          case 'hills': if (rng.chance(0.5)) tree(x, s, false); else { g.fillStyle = dark; for (let k = 0; k < 10; k++) g.fillRect(x + k * 2, hillBase - 4, 1, 4); g.fillRect(x, hillBase - 3, 20, 1); } break;
          case 'pines': case 'title': tree(x, s + 8, true); if (th.deco === 'title' && i % 7 === 3) { g.fillStyle = dark; g.fillRect(x - 12, hillBase - 36, 6, 36); g.fillRect(x - 14, hillBase - 40, 10, 4); g.fillRect(x + 6, hillBase - 28, 5, 28); g.fillRect(x - 6, hillBase - 22, 12, 22); g.fillStyle = '#ffe08a'; g.fillRect(x - 10, hillBase - 30, 2, 2); g.fillRect(x + 7, hillBase - 22, 2, 2); } break;
          case 'ruins': g.fillStyle = dark; if (i % 3 === 0) { g.fillRect(x, hillBase - 24, 6, 24); g.fillRect(x - 1, hillBase - 26, 8, 2); g.fillRect(x + 12, hillBase - 14, 6, 14); } else tree(x, s, false); break;
          case 'volcano': g.fillStyle = dark; g.fillRect(x, hillBase - s, 2, s); g.fillRect(x - 3, hillBase - s + 3, 3, 1); g.fillRect(x + 2, hillBase - s + 6, 3, 1); break;
          case 'peaks': tree(x, s + 6, true); g.fillStyle = '#ffffff'; g.fillRect(x - 2, hillBase - s - 8, 4, 1); break;
          case 'marsh': g.fillStyle = dark; g.fillRect(x, hillBase - s, 2, s); g.fillRect(x - 4, hillBase - s + 2, 4, 1); g.fillRect(x + 2, hillBase - s + 5, 5, 1); g.fillRect(x - 6, hillBase - s + 1, 1, 3); break;
          case 'citadel': g.fillStyle = dark; if (i % 2 === 0) { const tw = rng.int(8, 14), thh = rng.int(24, 44); g.fillRect(x, hillBase - thh, tw, thh); for (let k = 0; k < tw; k += 3) g.fillRect(x + k, hillBase - thh - 2, 2, 2); g.fillStyle = th.accent; g.fillRect(x + tw / 2 - 1, hillBase - thh + 6, 2, 3); } break;
        }
      }
      if (th.deco === 'marsh') { g.fillStyle = mix(th.sky[2], '#ffffff', 0.3); g.globalAlpha = 0.25; g.fillRect(0, hillBase - 6, LW, 6); g.globalAlpha = 1; }
      this.layers.push({ c, speed: 1.4, y: 0 });
    }
    // ground: tiles
    {
      const [c, g] = off(LW, h); const G = th.ground, G2 = th.ground2; const w2 = w; { const w = LW; void w2;
      g.fillStyle = G; g.fillRect(0, gy, w, h - gy);
      g.fillStyle = tone(G, 0.25); g.fillRect(0, gy, w, 1); g.fillStyle = tone(G, -0.3); g.fillRect(0, gy + 1, w, 1);
      for (let y = gy + 2; y < h; y += 8) for (let x = ((y / 8) % 2) * 8; x < w; x += 16) { g.fillStyle = G2; g.fillRect(x, y + 2, 8, 1); g.fillRect(x + 2, y + 5, 3, 1); }
      for (let i = 0; i < w / 5; i++) { const x = rng.int(0, w), y = rng.int(gy + 3, h - 2); g.fillStyle = rng.chance(0.5) ? tone(G, 0.3) : tone(G, -0.3); g.fillRect(x, y, 1, 1); if (rng.chance(0.3)) g.fillRect(x + 1, y - 1, 1, 1); }
      if (th.deco === 'hills' || th.deco === 'title') for (let i = 0; i < w / 14; i++) { const x = rng.int(0, w), y = rng.int(gy + 4, h - 3); g.fillStyle = ['#ffffff', '#ffe04a', '#ff8ac8'][i % 3]; g.fillRect(x, y, 1, 1); g.fillStyle = tone(G, -0.2); g.fillRect(x, y + 1, 1, 1); }
      if (th.deco === 'ruins' || th.deco === 'citadel') { g.fillStyle = tone(G, 0.15); for (let x = 0; x < w; x += 12) g.fillRect(x, gy + Math.round((h - gy) * 0.45), 10, 4); g.fillStyle = tone(G, -0.25); for (let x = 0; x < w; x += 12) g.fillRect(x, gy + Math.round((h - gy) * 0.45) + 4, 10, 1); }
      // grass tufts along horizon
      g.fillStyle = tone(G, 0.15); for (let x = 0; x < w; x += rng.int(3, 7)) { g.fillRect(x, gy - 1, 1, 1); if (rng.chance(0.4)) g.fillRect(x + 1, gy - 2, 1, 2); }
      this.layers.push({ c, speed: this.walkGround ? 6 : 0, y: 0 });
    } }
  }
  ambientSpawn() {
    const { w, th } = this; const amb = th.ambient; const gy = this.groundY;
    const max = Math.round(w / 9);
    if (this.parts.filter(p => p.amb).length >= max) return;
    const r = this.rng;
    if (amb === 'snow') this.parts.push({ x: r.int(0, w), y: -2, vx: -0.15, vy: 0.25 + r.next() * 0.25, life: 0, max: 600, c: '#ffffff', s: r.chance(0.3) ? 2 : 1, g: 0, amb: true, ph: r.next() * 6 });
    else if (amb === 'ash') { const ember = r.chance(0.35); this.parts.push({ x: r.int(0, w), y: ember ? gy + r.int(0, 10) : -2, vx: 0.1 + r.next() * 0.2, vy: ember ? -0.25 - r.next() * 0.2 : 0.2, life: 0, max: 400, c: ember ? (r.chance(0.5) ? '#ffb02a' : '#ff6a2a') : '#8a7a7a', s: 1, g: 0, amb: true, ph: r.next() * 6 }); }
    else if (amb === 'leaves' || amb === 'petals') this.parts.push({ x: w + 2, y: r.int(0, gy), vx: -0.3 - r.next() * 0.3, vy: 0.12, life: 0, max: 900, c: amb === 'petals' ? (r.chance(0.5) ? '#ffc8e0' : '#ffffff') : (r.chance(0.5) ? '#e8902a' : '#c8582a'), s: 2, g: 0, amb: true, ph: r.next() * 6 });
    else if (amb === 'fireflies' || amb === 'motes') this.parts.push({ x: r.int(0, w), y: r.int(Math.round(gy * 0.4), gy + 10), vx: 0, vy: 0, life: 0, max: 300 + r.int(0, 200), c: amb === 'motes' ? '#c8a0ff' : '#e8ff8a', s: 1, g: 0, amb: true, ph: r.next() * 6 });
  }
  /** VFX bursts at low-res coords */
  burst(kind: string, x: number, y: number, n = 14) {
    const r = this.rng; const P = (o: Partial<P>) => this.parts.push({ x, y, vx: 0, vy: 0, life: 0, max: 30, c: '#fff', s: 1, g: 0, ...o });
    switch (kind) {
      case 'fire': for (let i = 0; i < n; i++) P({ x: x + r.int(-8, 8), y: y + r.int(-8, 8), vx: (r.next() - 0.5) * 0.8, vy: -0.4 - r.next() * 1.0, max: 26 + r.int(0, 14), c: ['#fff2a0', '#ffb02a', '#ff6a2a', '#d8302a'][r.int(0, 3)], s: r.chance(0.4) ? 2 : 1, g: -0.01 }); break;
      case 'water': for (let i = 0; i < n; i++) { const a = r.next() * Math.PI - Math.PI; const sp = 0.6 + r.next() * 1.4; P({ vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.5, max: 30, c: ['#ffffff', '#9ad8ff', '#3a8ae8'][r.int(0, 2)], s: r.chance(0.5) ? 2 : 1, g: 0.08 }); } break;
      case 'wind': for (let i = 0; i < 4; i++) P({ x: x - 12 + i * 3, y: y - 12 + i * 6, vx: 1.6, vy: 0.6, max: 12, c: i % 2 ? '#ffffff' : '#9ef07a', kind: 'slash', len: 10 + i * 2 }); for (let i = 0; i < 8; i++) P({ vx: (r.next() - 0.3) * 2, vy: (r.next() - 0.5) * 1.5, max: 18, c: '#c8ffb0', g: 0 }); break;
      case 'earth': for (let i = 0; i < n; i++) P({ vx: (r.next() - 0.5) * 2.4, vy: -1 - r.next() * 1.6, max: 36, c: ['#8a6a3a', '#c9a24a', '#5a4020', '#a08a6a'][r.int(0, 3)], s: r.chance(0.5) ? 3 : 2, g: 0.12 }); break;
      case 'hit': for (let i = 0; i < 8; i++) { const a = r.next() * Math.PI * 2; P({ vx: Math.cos(a) * 1.4, vy: Math.sin(a) * 1.4, max: 12, c: i % 2 ? '#ffffff' : '#ffe8a0' }); } break;
      case 'heal': for (let i = 0; i < n; i++) P({ x: x + r.int(-10, 10), y: y + r.int(-4, 12), vy: -0.5 - r.next() * 0.5, max: 34, c: r.chance(0.5) ? '#8aff8a' : '#e0ffd0', kind: 'plus' }); break;
      case 'shield': P({ max: 18, c: '#a8d8ff', kind: 'ring', len: 4 }); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; P({ x: x + Math.cos(a) * 14, y: y + Math.sin(a) * 16, vy: -0.2, max: 22, c: '#e8f6ff' }); } break;
      case 'cast': for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; P({ x: x + Math.cos(a) * 18, y: y + Math.sin(a) * 18, vx: -Math.cos(a) * 0.9, vy: -Math.sin(a) * 0.9, max: 20, c: this.castColor }); } P({ max: 16, c: this.castColor, kind: 'ring', len: 2 }); break;
      case 'death': for (let i = 0; i < 28; i++) P({ x: x + r.int(-14, 14), y: y + r.int(-18, 14), vx: (r.next() - 0.5) * 0.6, vy: -0.2 - r.next() * 0.6, max: 40 + r.int(0, 20), c: ['#ffffff', '#d8d0e8', '#8a8098'][r.int(0, 2)], s: r.chance(0.3) ? 2 : 1 }); break;
      case 'status': for (let i = 0; i < 8; i++) P({ x: x + r.int(-8, 8), y: y + r.int(-6, 6), vy: -0.4 - r.next() * 0.4, max: 22, c: this.castColor }); break;
    }
  }
  castColor = '#ffffff';
  start() {
    const step = (ts: number) => {
      this.raf = requestAnimationFrame(step);
      if (ts - this.last < 32) return; // ~30fps is plenty for pixel art, saves battery
      this.last = ts; this.t++; this.draw();
    };
    this.raf = requestAnimationFrame(step);
  }
  stop() { cancelAnimationFrame(this.raf); }
  draw() {
    const { g, w, h } = this; g.drawImage(this.sky!, 0, 0);
    for (const L of this.layers) { if (!L.speed) { g.drawImage(L.c, 0, 0); continue; } const ox = Math.floor((this.t * L.speed * 0.1 * this.scroll) % L.c.width); g.drawImage(L.c, -ox, L.y); g.drawImage(L.c, L.c.width - ox, L.y); }
    if (this.walker) { const fr = this.walker.frames[Math.floor(this.t / 5) % this.walker.frames.length]; g.drawImage(fr, Math.round(this.walker.x), Math.round(this.walker.y - fr.height)); }
    if (this.t % 3 === 0) this.ambientSpawn();
    const next: P[] = [];
    for (const p of this.parts) {
      p.life++; if (p.life > p.max) continue;
      if (p.amb) { p.ph = (p.ph ?? 0) + 0.05; p.x += p.vx + (this.th.ambient === 'fireflies' || this.th.ambient === 'motes' ? Math.cos(p.ph) * 0.2 : Math.sin(p.ph) * 0.15); p.y += p.vy + (this.th.ambient === 'fireflies' || this.th.ambient === 'motes' ? Math.sin(p.ph * 0.7) * 0.15 : 0); if (p.x < -4 || p.x > w + 4 || p.y > h + 2 || p.y < -6) continue; }
      else { p.vy += p.g; p.x += p.vx; p.y += p.vy; }
      const fade = 1 - p.life / p.max; g.fillStyle = p.c;
      if (p.amb && (this.th.ambient === 'fireflies' || this.th.ambient === 'motes')) { if (Math.sin(p.ph! * 2) < -0.3) { next.push(p); continue; } g.globalAlpha = 0.25; g.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 3, 3); g.globalAlpha = 1; }
      if (p.kind === 'slash') { const L = Math.round(p.len! * fade); for (let i = 0; i < L; i++) g.fillRect(Math.round(p.x + i), Math.round(p.y + i * 0.5), 1, i > L / 3 && i < (2 * L) / 3 ? 2 : 1); }
      else if (p.kind === 'ring') { const r = p.len! + p.life * 1.4; g.globalAlpha = fade; for (let a = 0; a < 40; a++) { const an = (a / 40) * Math.PI * 2; g.fillRect(Math.round(p.x + Math.cos(an) * r), Math.round(p.y + Math.sin(an) * r * 1.1), 1, 1); } g.globalAlpha = 1; }
      else if (p.kind === 'plus') { const x = Math.round(p.x), y = Math.round(p.y); g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); }
      else { if (!p.amb && fade < 0.3 && (p.life % 2)) { next.push(p); continue; } g.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s); }
      next.push(p);
    }
    this.parts = next.length > 400 ? next.slice(-400) : next;
    if (this.flash > 0) { g.globalAlpha = this.flash / 6; g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.globalAlpha = 1; this.flash--; }
  }
}
