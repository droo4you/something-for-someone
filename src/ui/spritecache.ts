import { Pix, withAura } from './pix';
import { HERO_SPRITES, ENEMY_SPRITES, type SpriteDef, type Pose } from './characters';
export interface Frames { idle: HTMLCanvasElement[]; walk: HTMLCanvasElement[]; flash: HTMLCanvasElement; w: number; h: number }
const cache = new Map<string, Frames>();
function build(d: SpriteDef, o: Omit<Pose, 'f'>, walk: boolean): Frames {
  const aura = d.aura?.({ f: 0, ...o }) ?? null; const pad = aura ? 6 : 0;
  const mk = (pose: Pose, flash = false) => { const p = new Pix(d.w, d.h); d.draw(p, pose); const c = p.render({ flash }); return aura && !flash ? withAura(c, aura, pad) : pad ? withAura(c, 'rgba(0,0,0,0)', pad) : c; };
  const idle = [0, 1, 2, 3].map(f => mk({ f, ...o }));
  const walkF = walk ? [0, 1, 2, 3].map(w => mk({ f: w % 2 ? 2 : 0, walk: w, ...o })) : idle;
  const fl = mk({ f: 0, ...o }, true);
  return { idle, walk: walkF, flash: fl, w: d.w + pad * 2, h: d.h + pad * 2 };
}
export function heroFrames(id: string, evo = 0): Frames { const k = `h|${id}|${evo}`; let f = cache.get(k); if (!f) { f = build(HERO_SPRITES[id], { evo }, true); cache.set(k, f); } return f; }
export function enemyFrames(id: string, phase = 1): Frames { const k = `e|${id}|${phase}`; let f = cache.get(k); if (!f) { f = build(ENEMY_SPRITES[id] ?? ENEMY_SPRITES.puddle_slime, { phase }, false); cache.set(k, f); } return f; }
/** Static canvas (first idle frame), CSS-scaled by an integer factor. */
export function staticSprite(fr: Frames, scale: number): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = fr.w; c.height = fr.h; c.getContext('2d')!.drawImage(fr.idle[0], 0, 0);
  c.style.width = fr.w * scale + 'px'; c.style.height = fr.h * scale + 'px'; c.className = 'px'; return c;
}
export function thumbURL(fr: Frames) { return fr.idle[0].toDataURL(); }
