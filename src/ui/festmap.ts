// Festival campgrounds run map: each region is an illustrated top-down festival zone (ground, perimeter
// fence, zone props) and run nodes are landmarks standing on it, linked by walkways. Pure presentation:
// node positions use the same xOf/yOf as before so gameplay/branching is unchanged.
import { Pix, tone, mix } from './pix';
import type { Theme } from './scene';
import { RNG } from '../engine/rng';

type St = 'avail' | 'done' | 'locked' | 'cur';
// zone ground look per theme id: base, grass/dirt variation, walkway fill, walkway edge
const ZONE: Record<string, { g: string; g2: string; path: string; edge: string; kind: 'asphalt' | 'grass' | 'dirt' | 'sand' }> = {
  lot:     { g: '#2e2c3e', g2: '#26243a', path: '#5a5468', edge: '#17141f', kind: 'asphalt' },
  gates:   { g: '#25392e', g2: '#1e3026', path: '#6e5a48', edge: '#1a1410', kind: 'grass' },
  forest:  { g: '#1c4028', g2: '#163420', path: '#7a5e3a', edge: '#1e140c', kind: 'grass' },
  silent:  { g: '#232a40', g2: '#1c2236', path: '#4a4466', edge: '#110e1c', kind: 'grass' },
  tent:    { g: '#3a2a2a', g2: '#302222', path: '#7a5a46', edge: '#1c120e', kind: 'dirt' },
  ferris:  { g: '#26382c', g2: '#1f2e24', path: '#80684a', edge: '#1e160e', kind: 'grass' },
  main:    { g: '#2a2a22', g2: '#22221c', path: '#6a5e4a', edge: '#16120c', kind: 'dirt' },
  sunrise: { g: '#5a4a5a', g2: '#4e3e50', path: '#a8806a', edge: '#2a1c22', kind: 'sand' },
};
const zoneOf = (th: Theme) => ZONE[th.id] ?? ZONE.lot;

// ------------------------------------------------------------------ landmark sprites (node buttons)
const cache = new Map<string, string>();
export function landmark(type: string, state: St): string {
  const key = type + state; const hit = cache.get(key); if (hit) return hit;
  const boss = type === 'boss'; const S = boss ? 32 : 24; const p = new Pix(S, S);
  const WH = p.flat('#ffffff'), K = p.flat('#140c1c'), SH = p.flat('#0a0812');
  const shadow = (x: number, w: number) => p.rect(x, S - 3, w, 2, SH);
  switch (type) {
    case 'battle': { // mosh pit: barricade ring with two Drained shambling inside
      shadow(3, 18); const BAR = p.mat('#9aa0b0'), PIT = p.mat('#5a2a3a'), Z = p.mat('#8ab07a'), ZS = p.mat('#4a3a6a');
      p.ell(12, 15, 10, 6, BAR); p.ell(12, 15, 8, 4, PIT);
      for (const x of [8, 15]) { p.rect(x, 9, 3, 5, ZS); p.rect(x, 6, 3, 3, Z); p.px(x - 1, 10, Z); p.px(x + 3, 9, Z); p.px(x + 1, 7, p.flat('#ff4a8a')); }
      for (const [x, y] of [[3, 15], [21, 15], [12, 20], [6, 11], [18, 11]]) p.rect(x - 1, y - 1, 2, 2, p.flat('#ff4a8a'));
      break; }
    case 'elite': { // VIP bouncer booth: purple tent, velvet rope, star flag
      shadow(2, 20); const T = p.mat('#9a4ae0'), T2 = p.mat('#c88aff'), POST = p.mat('#ffcf3a'), ROPE = p.flat('#c8143a');
      p.poly([[3, 19], [12, 6], [21, 19]], T); p.poly([[12, 6], [21, 19], [12, 19]], T2); p.rect(10, 13, 4, 6, K);
      p.rect(12, 1, 1, 6, K); p.rect(13, 1, 5, 3, p.flat('#ff3ec8')); p.px(15, 2, WH);
      p.rect(1, 16, 2, 5, POST); p.rect(21, 16, 2, 5, POST); p.line(2, 17, 9, 19, ROPE); p.line(15, 19, 22, 17, ROPE);
      break; }
    case 'campfire': { // water refill tent: blue canopy, tank with tap, droplet sign
      shadow(2, 20); const C = p.mat('#2a8ae0'), C2 = p.mat('#6ad0ff'), LEG = p.mat('#c8d0e0'), TANK = p.mat('#3ae8ff');
      p.poly([[2, 9], [12, 3], [22, 9]], C); for (let x = 3; x < 22; x += 4) p.rect(x, 9, 2, 2, C2);
      p.rect(3, 9, 1, 11, LEG); p.rect(20, 9, 1, 11, LEG); p.rect(8, 12, 8, 8, TANK); p.rect(9, 13, 2, 5, WH); p.rect(15, 16, 2, 1, K);
      p.ell(12, 6, 1.5, 1.5, WH); break; }
    case 'merchant': { // food truck: side view with serving hatch + striped awning
      shadow(1, 22); const B = p.mat('#ffcf3a'), AW = p.flat('#ff4a8a'), AW2 = p.flat('#ffffff'), GL = p.mat('#3a7ab0'), TY = p.mat('#2a2438');
      p.rect(2, 8, 16, 10, B); p.rect(17, 11, 5, 7, B); p.rect(18, 12, 3, 3, GL); p.rect(5, 11, 9, 4, K); p.rect(6, 12, 2, 2, p.flat('#ff9a2a'));
      for (let x = 4; x < 16; x++) p.px(x, 9, (x >> 1) % 2 ? AW : AW2); for (let x = 4; x < 16; x++) p.px(x, 10, (x >> 1) % 2 ? AW : AW2);
      p.ell(6, 18, 2, 2, TY); p.ell(17, 18, 2, 2, TY); p.rect(8, 5, 6, 3, p.mat('#ff3ec8')); p.px(10, 6, WH); break; }
    case 'event': { // crew camp: flag totem + picnic blanket + two ravers
      shadow(2, 20); const BL = p.flat('#6affd8'), BL2 = p.flat('#1a8a7a');
      p.rect(3, 15, 18, 5, BL); for (let x = 3; x < 21; x += 3) p.rect(x, 15, 1, 5, BL2);
      p.rect(19, 1, 1, 15, p.mat('#c8d0e0')); p.poly([[20, 1], [24, 3], [20, 6]], p.mat('#ff9ae8'));
      p.rect(5, 10, 3, 5, p.mat('#6affd8')); p.rect(5, 7, 3, 3, p.mat('#e8b080')); p.rect(11, 10, 3, 5, p.mat('#ff9ae8')); p.rect(11, 7, 3, 3, p.mat('#c88a5a'));
      p.px(4, 9, p.flat('#ffe03a')); p.px(15, 8, p.flat('#ffe03a')); break; }
    case 'treasure': { // lost & found booth: counter, '?' sign, stacked bins
      shadow(1, 22); const BO = p.mat('#ff9a2a'), BIN = p.mat('#4a4aff'), BIN2 = p.mat('#8a8aff');
      p.rect(3, 9, 14, 10, BO); p.rect(2, 7, 16, 3, p.mat('#ffcf6a')); p.rect(6, 11, 8, 4, K);
      p.rect(8, 1, 6, 6, p.mat('#ffffff')); p.rect(10, 2, 2, 1, K); p.px(12, 3, K); p.px(11, 4, K); p.px(11, 6, K);
      p.rect(17, 13, 6, 6, BIN); p.rect(18, 9, 5, 4, BIN2); p.px(19, 14, WH); break; }
    case 'shrine': { // totem pole: stacked faces, glowing orb on top
      shadow(5, 14); const W1 = p.mat('#a87a5a'), W2 = p.mat('#e0b8ff'), GLW = p.flat('#ff3ec8');
      p.rect(9, 7, 6, 14, W1); p.rect(7, 12, 10, 2, W2); p.rect(10, 9, 1, 1, K); p.rect(13, 9, 1, 1, K); p.rect(10, 16, 4, 1, K); p.px(10, 18, GLW); p.px(13, 18, GLW);
      p.ell(12, 4, 3, 3, p.mat('#d8d0f0')); p.px(11, 3, WH); for (const [x, y] of [[6, 4], [18, 4], [12, 0]]) p.px(x, y, GLW); break; }
    case 'boss': { // main stage: deck, truss arch, speaker stacks, DJ booth, lights
      p.rect(1, 28, 30, 2, SH); const DECK = p.mat('#4a4a6a'), TR = p.mat('#b0b8c8'), SP = p.mat('#2a2438'), BOOTH = p.mat('#ff3ec8'), SCR = p.flat('#3ae8ff');
      p.rect(2, 20, 28, 8, DECK); p.rect(3, 4, 2, 17, TR); p.rect(27, 4, 2, 17, TR); p.rect(3, 3, 26, 3, TR);
      p.rect(7, 7, 18, 9, SCR); for (let x = 8; x < 24; x += 3) p.px(x, 9 + (x % 4), WH);
      p.rect(0, 12, 4, 14, SP); p.rect(28, 12, 4, 14, SP); p.ell(2, 16, 1, 1, p.flat('#6a5a8a')); p.ell(29, 16, 1, 1, p.flat('#6a5a8a'));
      p.rect(11, 17, 10, 4, BOOTH); p.rect(15, 14, 2, 3, p.mat('#c86aff'));
      for (const [x, c] of [[6, '#ff3ec8'], [12, '#ffe03a'], [19, '#b8ff3a'], [25, '#3ae8ff']] as [number, string][]) p.rect(x, 2, 2, 2, p.flat(c));
      break; }
  }
  let c = p.render();
  if (state === 'done') { // cleared: dimmed + caution-tape X
    const g = c.getContext('2d')!; g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(20,14,30,.55)'; g.fillRect(0, 0, S, S); g.globalCompositeOperation = 'source-over';
    for (let i = 2; i < S - 2; i++) { for (const [x, y] of [[i, i], [S - 1 - i, i]]) { g.fillStyle = '#140c1c'; g.fillRect(x - 1, y, 3, 1); g.fillStyle = (i >> 1) % 2 ? '#ffe03a' : '#140c1c'; g.fillRect(x, y, 1, 1); } }
  }
  const u = c.toDataURL(); cache.set(key, u); return u;
}

// ------------------------------------------------------------------ ground props (decor, drawn into the map canvas)
const propCache = new Map<string, HTMLCanvasElement>();
function prop(kind: string, col: string): HTMLCanvasElement {
  const key = kind + col; const hit = propCache.get(key); if (hit) return hit;
  let p: Pix; const L = (w: number, h: number) => (p = new Pix(w, h));
  switch (kind) {
    case 'dome': { L(14, 10); const a = p!.mat(col), b = p!.mat(tone(col, 0.25)); p!.ell(7, 6, 6, 4, a); p!.ell(5, 5, 2, 2, b); p!.rect(6, 7, 3, 3, p!.flat('#140c1c')); break; }
    case 'aframe': { L(12, 10); const a = p!.mat(col); p!.poly([[1, 9], [6, 1], [11, 9]], a); p!.rect(5, 6, 2, 3, p!.flat('#140c1c')); break; }
    case 'car': { L(16, 9); const a = p!.mat(col), gl = p!.mat('#3a5a8a'); p!.rect(1, 2, 14, 6, a); p!.rect(4, 0, 7, 3, gl); p!.rect(1, 7, 3, 2, p!.flat('#140c1c')); p!.rect(12, 7, 3, 2, p!.flat('#140c1c')); break; }
    case 'canopy': { L(14, 10); const a = p!.mat(col); p!.rect(1, 1, 12, 5, a); p!.rect(1, 6, 1, 4, p!.mat('#c8d0e0')); p!.rect(12, 6, 1, 4, p!.mat('#c8d0e0')); for (let x = 2; x < 12; x += 3) p!.px(x, 6, p!.flat(tone(col, 0.4))); break; }
    case 'tree': { L(12, 14); const a = p!.mat(col); p!.ell(6, 5, 5, 5, a); p!.rect(5, 10, 2, 4, p!.mat('#5a3a2a')); p!.px(3, 4, p!.flat('#ffe03a')); p!.px(8, 7, p!.flat('#ff9ae8')); p!.px(6, 2, p!.flat('#b8ff6a')); break; }
    case 'tower': { L(7, 18); const t = p!.mat('#8a90a0'); p!.rect(3, 4, 1, 14, t); p!.line(1, 17, 3, 8, t); p!.line(5, 17, 3, 8, t); p!.rect(0, 0, 7, 4, p!.mat('#3a3a4a')); p!.rect(1, 1, 2, 2, p!.flat(col)); p!.rect(4, 1, 2, 2, p!.flat(col)); break; }
    case 'potty': { L(6, 11); const a = p!.mat(col); p!.rect(0, 1, 6, 10, a); p!.rect(0, 0, 6, 2, p!.mat(tone(col, 0.3))); p!.rect(2, 4, 2, 1, p!.flat('#140c1c')); break; }
    case 'speaker': { L(7, 10); const a = p!.mat('#2a2438'); p!.rect(0, 0, 7, 10, a); p!.ell(3, 3, 1.5, 1.5, p!.mat('#6a5a8a')); p!.ell(3, 7, 1.5, 1.5, p!.mat('#6a5a8a')); break; }
    case 'bigtent': { L(30, 20); const a = p!.mat(col), b = p!.mat('#e8e0f0'); p!.poly([[1, 18], [15, 2], [29, 18]], a); for (let x = 5; x < 26; x += 6) p!.poly([[x, 18], [15, 3], [x + 3, 18]], b); p!.rect(13, 12, 5, 6, p!.flat('#140c1c')); p!.rect(15, 0, 1, 3, p!.mat('#c8d0e0')); p!.px(16, 0, p!.flat(col)); break; }
    case 'wheel': { L(32, 34); const t = p!.mat('#b0b8c8'), c2 = p!.flat(col); for (let a = 0; a < 64; a++) { const an = a / 64 * Math.PI * 2; p!.px(16 + Math.cos(an) * 13, 14 + Math.sin(an) * 13, t); } for (let k = 0; k < 8; k++) { const an = k / 8 * Math.PI * 2; p!.line(16, 14, 16 + Math.cos(an) * 13, 14 + Math.sin(an) * 13, t); p!.rect(15 + Math.cos(an) * 13, 14 + Math.sin(an) * 13, 3, 3, c2); } p!.line(16, 14, 9, 33, t, 2); p!.line(16, 14, 23, 33, t, 2); break; }
    case 'headphones': { L(10, 8); const a = p!.mat(col); p!.curve(1, 6, 5, -2, 9, 6, a, 2); p!.rect(0, 4, 3, 4, a); p!.rect(7, 4, 3, 4, a); break; }
    case 'barrier': { L(14, 5); const a = p!.mat('#c8c0b0'); p!.rect(0, 1, 14, 3, a); for (let x = 1; x < 14; x += 4) p!.rect(x, 1, 2, 3, p!.flat('#ff9a2a')); break; }
    default: { L(4, 4); p!.rect(0, 0, 4, 4, p!.mat(col)); }
  }
  const c = p!.render(); propCache.set(key, c); return c;
}
const ZPROPS: Record<string, string[]> = {
  lot: ['car', 'car', 'car', 'canopy', 'canopy', 'tower', 'potty', 'speaker'],
  gates: ['barrier', 'barrier', 'canopy', 'tower', 'potty', 'dome', 'tree'],
  forest: ['tree', 'tree', 'tree', 'tree', 'dome', 'aframe', 'tower'],
  silent: ['headphones', 'headphones', 'dome', 'dome', 'aframe', 'tower', 'tree'],
  tent: ['bigtent', 'speaker', 'speaker', 'canopy', 'tower', 'potty', 'dome'],
  ferris: ['canopy', 'canopy', 'tree', 'tower', 'dome', 'potty', 'aframe'],
  main: ['speaker', 'speaker', 'tower', 'tower', 'barrier', 'canopy', 'potty'],
  sunrise: ['dome', 'dome', 'aframe', 'aframe', 'tree', 'canopy'],
};

// ------------------------------------------------------------------ the map
export interface NodeLite { col: number; row: number; y: number; next: number[] }
export function drawFestMap(cv: HTMLCanvasElement, map: NodeLite[][], pos: { col: number; row: number } | null, th: Theme, seed: number, cssW: number, cssH: number, MS: number, stops: number) {
  const w = cssW / MS, h = cssH / MS; cv.width = w; cv.height = h; cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px';
  const g = cv.getContext('2d')!; const rng = new RNG(seed); const Z = zoneOf(th); const L = th.lights;
  const xOf = (c: number) => 20 + (c * (w - 40)) / (stops - 1); const yOf = (y: number) => 14 + y * (h - 28);
  // --- ground: base + 2x1 tufts / gravel, a few large soft patches so it is not flat
  g.fillStyle = Z.g; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 14; i++) { g.fillStyle = Z.g2; const cx = rng.int(0, w), cy = rng.int(0, h), rx = rng.int(14, 40), ry = rng.int(8, 18); for (let y = -ry; y <= ry; y++) { const hw = Math.round(rx * Math.sqrt(1 - (y / ry) ** 2)); g.fillRect(cx - hw, cy + y, hw * 2, 1); } }
  for (let i = 0; i < (w * h) / 9; i++) {
    const x = rng.int(0, w), y = rng.int(0, h);
    if (Z.kind === 'grass') { g.fillStyle = rng.chance(0.5) ? tone(Z.g, 0.22) : tone(Z.g, -0.25); g.fillRect(x, y, 1, 2); }
    else { g.fillStyle = rng.chance(0.5) ? tone(Z.g, 0.14) : tone(Z.g, -0.18); g.fillRect(x, y, rng.chance(0.3) ? 2 : 1, 1); }
  }
  if (Z.kind === 'asphalt') { g.fillStyle = 'rgba(232,228,240,.35)'; for (let x = 8; x < w; x += 22) for (const y0 of [6, h - 22]) g.fillRect(x, y0, 1, 16); }
  // --- walkways: dark edge pass then fill pass, so junctions merge into one network
  const segs: [number, number, number, number, boolean][] = [];
  map.forEach((col, c) => col.forEach(n => n.next.forEach(j => { const m = map[c + 1][j]; segs.push([xOf(c), yOf(n.y), xOf(c + 1), yOf(m.y), !!pos && pos.col === c && pos.row === n.row]); })));
  const along = (s: typeof segs[0], f: (x: number, y: number, i: number) => void) => { const [x0, y0, x1, y1] = s; const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)); for (let i = 0; i <= n; i++) f(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), i); };
  const disc = (x: number, y: number, r: number, c: string) => { g.fillStyle = c; for (let dy = -r; dy <= r; dy++) { const hw = Math.round(Math.sqrt(r * r - dy * dy)); g.fillRect(x - hw, y + dy, hw * 2 + 1, 1); } };
  segs.forEach(s => along(s, (x, y) => disc(x, y + 1, 5, Z.edge)));
  map.flat().forEach(n => disc(Math.round(xOf(n.col)), Math.round(yOf(n.y)) + 2, 13, Z.edge));
  segs.forEach(s => along(s, (x, y) => disc(x, y, 4, Z.path)));
  map.flat().forEach(n => disc(Math.round(xOf(n.col)), Math.round(yOf(n.y)), 12, Z.path));
  // path texture: lit top lip, footprints / planks, darker centre wear
  const lip = tone(Z.path, 0.28), wear = tone(Z.path, -0.14);
  segs.forEach(s => along(s, (x, y, i) => { if (i % 5 === 0) { g.fillStyle = wear; g.fillRect(x - 1, y, 2, 1); } if (i % 2 === 0) { g.fillStyle = lip; g.fillRect(x, y - 4, 1, 1); } }));
  map.flat().forEach(n => { const cx = Math.round(xOf(n.col)), cy = Math.round(yOf(n.y)); g.fillStyle = lip; for (let a = 200; a < 340; a += 6) { const an = a * Math.PI / 180; g.fillRect(Math.round(cx + Math.cos(an) * 11), Math.round(cy + Math.sin(an) * 11), 1, 1); } });
  // string lights along walkways: the path out of the current stop is lit bright
  segs.forEach(s => along(s, (x, y, i) => { if (i % 6) return; const lit = s[4]; const c = lit ? th.accent : L[(i / 6) % L.length]; g.globalAlpha = lit ? 0.35 : 0.12; g.fillStyle = c; g.fillRect(x - 2, y - 8, 5, 3); g.globalAlpha = 1; g.fillStyle = '#140c1c'; g.fillRect(x, y - 6, 1, 1); g.fillStyle = lit ? '#ffffff' : c; g.fillRect(x, y - 7, 1, 1); }));
  // --- keep-out mask so props never cover walkways / landmarks
  const near = (x: number, y: number, r: number) => segs.some(([x0, y0, x1, y1]) => { const dx = x1 - x0, dy = y1 - y0; const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy))); return Math.hypot(x0 + dx * t - x, y0 + dy * t - y) < r; }) || map.flat().some(n => Math.hypot(xOf(n.col) - x, yOf(n.y) - y) < r + 10);
  // --- zone props, sorted by y so lower things overlap higher ones (top-down depth)
  const kinds = ZPROPS[th.id] ?? ZPROPS.lot; const placed: [number, number, HTMLCanvasElement][] = [];
  if (th.id === 'tent') placed.push([Math.round(w * 0.5), 20, prop('bigtent', L[1])]);
  if (th.id === 'ferris') placed.push([Math.round(w * 0.55), 34, prop('wheel', L[0])]);
  for (let tries = 0; tries < 900 && placed.length < Math.round(w / 9); tries++) {
    const k = kinds[rng.int(0, kinds.length - 1)]; const c = prop(k, k === 'car' || k === 'potty' ? rng.pick(['#3a6ab0', '#b03a5a', '#8a8a9a', '#3aa07a', '#c8a03a']) : k === 'tree' ? (th.id === 'forest' ? '#2a7a3a' : '#3a6a3a') : L[rng.int(0, L.length - 1)]);
    const x = rng.int(4, w - c.width - 4), y = rng.int(4, h - c.height - 4);
    if (near(x + c.width / 2, y + c.height - 2, Math.max(9, c.width / 2 + 5)) || near(x + c.width / 2, y + 2, c.width / 2 + 4)) continue;
    if (placed.some(([px, py, pc]) => x < px + pc.width + 2 && px < x + c.width + 2 && y < py + pc.height + 1 && py < y + c.height + 1)) continue;
    placed.push([x, y, c]);
  }
  placed.sort((a, b) => a[1] + a[2].height - (b[1] + b[2].height)).forEach(([x, y, c]) => { g.fillStyle = 'rgba(6,4,14,.45)'; g.fillRect(x + 1, y + c.height - 1, c.width, 2); g.drawImage(c, x, y); });
  // tiny crowd specks + dropped glowsticks for life
  for (let i = 0; i < w / 5; i++) { const x = rng.int(3, w - 3), y = rng.int(3, h - 3); if (near(x, y, 7)) continue; const c = L[rng.int(0, L.length - 1)]; if (rng.chance(0.6)) { g.fillStyle = '#140c1c'; g.fillRect(x, y, 2, 3); g.fillStyle = mix(c, '#e8b080', 0.6); g.fillRect(x, y - 1, 2, 1); } else { g.globalAlpha = 0.3; g.fillStyle = c; g.fillRect(x - 1, y - 1, 5, 3); g.globalAlpha = 1; g.fillRect(x, y, 3, 1); } }
  // --- perimeter: chain-link fence with posts top and bottom, entry arch at the left, glow at the stage end
  const post = '#8a90a0', mesh = 'rgba(176,184,200,.35)';
  for (const fy of [1, h - 4]) { g.fillStyle = mesh; for (let x = 0; x < w; x++) if ((x + fy) % 2 === 0) g.fillRect(x, fy, 1, 3); g.fillStyle = post; g.fillRect(0, fy, w, 1); for (let x = 2; x < w; x += 12) { g.fillStyle = '#140c1c'; g.fillRect(x + 1, fy, 1, 4); g.fillStyle = post; g.fillRect(x, fy - 1, 2, 5); } }
  const ay = Math.round(yOf(0.5)); g.fillStyle = '#140c1c'; g.fillRect(2, ay - 22, 3, 44); g.fillStyle = th.accent; g.fillRect(2, ay - 22, 2, 44); g.fillStyle = tone(th.accent, 0.5); for (let y = ay - 20; y < ay + 22; y += 4) g.fillRect(2, y, 1, 1);
  g.globalAlpha = 0.14; g.fillStyle = th.accent; g.fillRect(w - 50, 0, 50, h); g.globalAlpha = 1;
  g.fillStyle = 'rgba(6,4,14,.5)'; g.fillRect(0, 0, w, 1); g.fillRect(0, h - 1, w, 1);
  return { xOf: (c: number) => xOf(c) * MS, yOf: (y: number) => yOf(y) * MS };
}
