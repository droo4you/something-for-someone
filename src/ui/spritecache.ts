import { Pix, withAura } from './pix';
import { HERO_SPRITES, ENEMY_SPRITES, type SpriteDef, type Pose } from './characters';
export interface Frames { idle: HTMLCanvasElement[]; walk: HTMLCanvasElement[]; flash: HTMLCanvasElement; w: number; h: number; res: number; shout?: HTMLCanvasElement; hurt?: HTMLCanvasElement }
const cache = new Map<string, Frames>();
function raw(d: SpriteDef, pose: Pose, flash: boolean): HTMLCanvasElement { if (d.render) return d.render(pose, flash); const p = new Pix(d.w, d.h); d.draw(p, pose); return p.render({ flash }); }
function build(d: SpriteDef, o: Omit<Pose, 'f'>, walk: boolean): Frames {
  const res = d.res ?? 1; const aura = d.aura?.({ f: 0, ...o }) ?? null; const pad = aura ? 6 * res : 0;
  const mk = (pose: Pose, flash = false) => { const c = raw(d, pose, flash); return aura && !flash ? withAura(c, aura, pad) : pad ? withAura(c, 'rgba(0,0,0,0)', pad) : c; };
  const idle = [0, 1, 2, 3].map(f => mk({ f, ...o }));
  const walkF = walk ? [0, 1, 2, 3].map(w => mk({ f: w % 2 ? 2 : 0, walk: w, ...o })) : idle;
  const fl = mk({ f: 0, ...o }, true);
  const ex = d.render ? { shout: mk({ f: 0, ...o, expr: 'shout' }), hurt: mk({ f: 2, ...o, expr: 'hurt' }) } : {};
  return { idle, walk: walkF, flash: fl, w: d.w + pad * 2, h: d.h + pad * 2, res, ...ex };
}
export function heroFrames(id: string, evo = 0): Frames { const k = `h|${id}|${evo}`; let f = cache.get(k); if (!f) { f = build(HERO_SPRITES[id], { evo }, true); cache.set(k, f); } return f; }
/** Half-resolution copy of the hero art for tiny spots (map marker, scene walker, turn bar). Majority-vote 2x2 downsample, darkest wins ties so outlines survive. */
function half(src: HTMLCanvasElement): HTMLCanvasElement {
  const w = src.width >> 1, h = src.height >> 1; const sd = src.getContext('2d')!.getImageData(0, 0, src.width, src.height).data;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d')!; const img = g.createImageData(w, h); const d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const px: number[][] = []; for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const i = ((y * 2 + dy) * src.width + x * 2 + dx) * 4; if (sd[i + 3] > 200) px.push([sd[i], sd[i + 1], sd[i + 2]]); }
    const lum = (q: number[]) => q[0] * 0.3 + q[1] * 0.59 + q[2] * 0.11;
    let pick: number[] | null = null;
    if (px.length >= 2) { let best = -1; for (const q of px) { const n = px.filter(r => r[0] === q[0] && r[1] === q[1] && r[2] === q[2]).length; if (n > best || (n === best && pick && lum(q) < lum(pick))) { best = n; pick = q; } } }
    else if (px.length === 1 && lum(px[0]) < 60) pick = px[0];
    const o = (y * w + x) * 4; if (pick) { d[o] = pick[0]; d[o + 1] = pick[1]; d[o + 2] = pick[2]; d[o + 3] = 255; }
  }
  g.putImageData(img, 0, 0); return c;
}
export function heroFramesLo(id: string, evo = 0): Frames {
  const k = `hl|${id}|${evo}`; let f = cache.get(k); if (f) return f; const hi = heroFrames(id, evo);
  if (hi.res === 1) return hi;
  // aura is re-applied at low res so its dither stays crisp
  const d = HERO_SPRITES[id]; const aura = d.aura?.({ f: 0, evo }) ?? null; const pad = aura ? 6 : 0;
  const mk = (pose: Pose, flash = false) => { const c = half(raw(d, pose, flash)); return aura && !flash ? withAura(c, aura, pad) : pad ? withAura(c, 'rgba(0,0,0,0)', pad) : c; };
  const idle = [0, 1, 2, 3].map(fr => mk({ f: fr, evo })); const walk = [0, 1, 2, 3].map(w => mk({ f: w % 2 ? 2 : 0, walk: w, evo }));
  f = { idle, walk, flash: mk({ f: 0, evo }, true), w: d.w / 2 + pad * 2, h: d.h / 2 + pad * 2, res: 1 }; cache.set(k, f); return f;
}
/** CSS pixels per art pixel. Callers ask in 'enemy-res' scale units; hi-res (res 2) art is shown at half that,
 *  as long as that lands on whole device pixels, otherwise the nearest whole CSS scale (never below 1). */
export function cssScale(fr: Frames, scale: number): number {
  if (fr.res === 1) return scale;
  const ideal = scale / fr.res; const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  if (Math.abs(ideal * dpr - Math.round(ideal * dpr)) < 1e-6) return ideal;
  return Math.max(1, Math.floor(ideal));
}
export function enemyFrames(id: string, phase = 1): Frames { const k = `e|${id}|${phase}`; let f = cache.get(k); if (!f) { f = build(ENEMY_SPRITES[id] ?? ENEMY_SPRITES.glitter_gloop, { phase }, false); cache.set(k, f); } return f; }
/** Static canvas (first idle frame), CSS-scaled by an integer factor. */
export function staticSprite(fr: Frames, scale: number): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = fr.w; c.height = fr.h; c.getContext('2d')!.drawImage(fr.idle[0], 0, 0);
  const k = cssScale(fr, scale); c.style.width = fr.w * k + 'px'; c.style.height = fr.h * k + 'px'; c.className = 'px'; return c;
}
export function thumbURL(fr: Frames) { return fr.idle[0].toDataURL(); }
