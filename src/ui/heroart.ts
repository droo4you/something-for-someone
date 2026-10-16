// Hero art v4: pixel maps derived from refs/target-heroes.jpg by tools/hero_pixels.py (crop -> unfake grid
// recovery -> OKLab quantize -> hue-shifted ramps -> sel-out/orphan cleanup). Each evo is an indexed body
// map + optional add-on layer (cape, crown, second speaker...) on one shared 136x160 canvas with a common
// foot pivot, plus a palette LUT; shout/hurt are face-region patches of the indexed map.
// Code only does layering, palette lookup, bob/walk offsets and the flash.
import type { Pose, SpriteDef } from './characters';
import MAPS from './heromaps.json';
interface Patch { x: number; y: number; w: number; h: number; m: string }
interface Evo { pal: string[]; body: string; addon: string | null; expr: Record<'shout' | 'hurt', Patch> }
const D = MAPS as unknown as { w: number; h: number; gy: number; heroes: Record<string, Evo[]> };
export const HW = D.w, HH = D.h;
const HIP = D.gy - 46; // rows above this bob with the breath; legs stay planted

function unrle(s: string, n: number): Uint8Array {
  const b = atob(s), out = new Uint8Array(n); let o = 0;
  for (let i = 0; i < b.length; i += 2) { const c = b.charCodeAt(i), v = b.charCodeAt(i + 1); out.fill(v, o, o + c); o += c; }
  return out;
}
const dec = new Map<string, Uint8Array>();
const get = (s: string, n: number) => { let a = dec.get(s); if (!a) { a = unrle(s, n); dec.set(s, a); } return a; };
const rgb = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/** Palette swap = a different LUT over the same index map. */
export function heroLayers(id: string, evo: number) { return D.heroes[id][Math.min(2, evo)]; }

function render(id: string, o: Pose, flash: boolean): HTMLCanvasElement {
  const ev = heroLayers(id, o.evo ?? 0); const W = HW, H = HH, N = W * H;
  const body = get(ev.body, N).slice();
  const ex = o.expr && o.expr !== 'neutral' ? ev.expr[o.expr] : null;
  if (ex) { const m = get(ex.m, ex.w * ex.h); for (let y = 0; y < ex.h; y++) for (let x = 0; x < ex.w; x++) body[(ex.y + y) * W + ex.x + x] = m[y * ex.w + x]; }
  const add = ev.addon ? get(ev.addon, N) : null;
  const f = o.f % 4, walking = o.walk != null && o.walk >= 0;
  const bob = walking ? [0, 1, 0, 1][o.walk! % 4] : 0;          // whole-body step bob
  const breath = walking ? 0 : [0, 1, 1, 0][f];                  // upper body settles on the idle beat
  const sway = [0, 0, -1, 0][f];                                 // add-ons (capes) lag a pixel
  // limb motion: on the walk cycle each foot lifts 2px in turn and the torso rocks a pixel with the step;
  // on idle the head lags the breath by a frame so the neck/shoulders read as moving separately.
  const split = footSplit(ev, body), FOOT = D.gy - 20, HEAD = HIP - 44;
  const wf = walking ? o.walk! % 4 : 0;
  const liftL = walking ? [2, 0, 0, 0][wf] : 0, liftR = walking ? [0, 0, 2, 0][wf] : 0;
  const rock = walking ? [1, 0, -1, 0][wf] : 0;
  const headLag = walking ? 0 : [0, 0, 1, 1][f];
  const off = (x: number, y: number) => y >= FOOT ? -(x < split ? liftL : liftR) : (y < HEAD ? headLag : 0);
  const ox = (y: number) => (y < HIP ? rock : 0);
  const lut = ev.pal.map(rgb);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d')!;
  const img = g.createImageData(W, H); const d = img.data;
  const put = (x: number, y: number, v: number) => {
    if (!v || x < 0 || y < 0 || x >= W || y >= H) return; const k = (y * W + x) * 4; const p = lut[v - 1];
    if (flash) { d[k] = d[k + 1] = d[k + 2] = 255; } else { d[k] = p[0]; d[k + 1] = p[1]; d[k + 2] = p[2]; }
    d[k + 3] = 255;
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (add) { const a = add[y * W + x]; if (a) put(x + (y > HIP ? sway : 0) + ox(y), y + bob + (y < HIP ? breath : 0) + off(x, y), a); }
  }
  for (let y = 0; y < H; y++) {
    const dy = bob + (y < HIP ? breath : 0);
    for (let x = 0; x < W; x++) put(x + ox(y), y + dy + off(x, y), body[y * W + x]);
    if (breath && y === HIP - 1) for (let x = 0; x < W; x++) { const v = body[HIP * W + x]; if (v && !body[(HIP - 1) * W + x]) put(x + ox(HIP), HIP + bob, v); }
  }
  g.putImageData(img, 0, 0); return c;
}
/** Column between the two feet (fewest solid pixels near the floor), cached per evo map. */
const splits = new Map<string, number>();
function footSplit(ev: Evo, body: Uint8Array): number {
  let s = splits.get(ev.body); if (s != null) return s;
  let best = HW / 2, bc = 1e9;
  for (let x = 40; x < 96; x++) { let c = 0; for (let y = D.gy - 8; y <= D.gy; y++) if (body[y * HW + x]) c++; if (c < bc || (c === bc && Math.abs(x - 66) < Math.abs(best - 66))) { bc = c; best = x; } }
  splits.set(ev.body, best); return best;
}
const def = (id: string): SpriteDef => ({ w: HW, h: HH, res: 2, draw: () => {}, aura: o => AURAS[id][o.evo ?? 0] || null, render: (o, flash) => render(id, o, flash) });
const AURAS: Record<string, string[]> = { bass: ['', '#ff3ec8', '#d070ff'], flow: ['', '#3ae8ff', '#fff0b0'], tempo: ['', '#b8ff3a', '#6affd8'], wall: ['', '#ff9a2a', '#b070ff'] };
export const HERO_SPRITES: Record<string, SpriteDef> = { bass: def('bass'), flow: def('flow'), tempo: def('tempo'), wall: def('wall') };
