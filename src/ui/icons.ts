// Crisp pixel icons: statuses, intents, map medallions, misc UI glyphs.
import { Pix } from './pix';
type Tpl = [string[], Record<string, string>];
const ST: Record<string, Tpl> = {
  burn: [['.m....m.', 'm.m..m.m', '.m.mm.m.', '..mwwm..', '..mwwm..', '.m.mm.m.', 'm.m..m.m', '.m....m.'], { m: '#ff3ec8', w: '#ffd0f4' }],
  soak: [['..bbbb..', '.b....b.', 'b..ww..b', 'b.w..w.b', 'bb....bb', 'bbb..bbb', 'bbb..bbb', '........'], { b: '#3ae8ff', w: '#cfeaff' }],
  bleed: [['...r....', '..rr....', '..rwr...', '.rrwrr..', '.rrrrr..', '.rrrrr..', '..rrr...', '......r.'], { r: '#b8ff3a', w: '#f0ffc8' }],
  stun: [['y..y..y.', '.y.y.y..', '..www...', 'yywwwyy.', '..www...', '.y.y.y..', 'y..y..y.', '........'], { y: '#ffe04a', w: '#ffffff' }],
  shield: [['.bbbbbb.', 'bwwbbbbb', 'bwbbbbbb', 'bbbbbbbb', 'bbbbbbbd', '.bbbbbd.', '..bbdd..', '...dd...'], { b: '#ffcf3a', w: '#fff6c8', d: '#c8801a' }],
  strength: [['...o....', '..ooo...', '.ooooo..', 'ooooooo.', '..ooo...', '..ooo...', '..ooo...', '..ooo...'], { o: '#ff6ad8' }],
  weak: [['..ppp...', '..ppp...', '..ppp...', '..ppp...', 'ppppppp.', '.ppppp..', '..ppp...', '...p....'], { p: '#a890d8' }],
  thorns: [['g..g..g.', 'gg.gg.gg', '.ggggggg', '..gwggg.', '.ggggggg', 'gg.gg.gg', 'g..g..g.', '........'], { g: '#5ac85a', w: '#c8ffb0' }],
};
const IN: Record<string, Tpl> = {
  atk: [['......ww', '.....www', '....www.', 'b..www..', '.bwww...', '..bb....', '.b.bb...', 'b....b..'], { w: '#e8eef4', b: '#b0702a' }],
  guard: ST.shield, buff: ST.strength, debuff: [['.pppppp.', 'pp.pp.pp', 'pp.pp.pp', 'pppppppp', '.pp..pp.', '.pppppp.', '.p.p.p..', '........'], { p: '#b08ae8' }],
  heal: [['..gg....', '..gg....', 'gggggg..', 'gggggg..', '..gg....', '..gg....', '........', '........'], { g: '#5ae05a' }],
};
const MISC: Record<string, Tpl> = {
  heart: [['..bbbb..', '.bwwwwb.', '.bggggb.', '.bggggb.', '.bggggb.', '.bggggb.', '.bbbbbb.', '...bb...'], { b: '#8a8ab8', w: '#ffffff', g: '#b8ff3a' }],
  coin: [['......ww', '.....gg.', '....gg..', '...gg...', '..gg....', '.gg.....', 'gg......', '........'], { g: '#b8ff3a', w: '#ffffff' }],
  ember: [['...a....', '..aya...', '.ayyya..', 'ayywyya.', '.ayyya..', '..aya...', '...a....', '........'], { a: '#ff3ec8', y: '#ffb8f0', w: '#fff' }],
  glow: [['......gw', '.....gg.', '....gg..', '...gg...', '..gg....', '.gg.....', 'gg......', '........'], { g: '#b8ff3a', w: '#ffffff' }],
  food: [['........', '..oooo..', '.oyyyyo.', 'oyrygyyo', 'oyyyyyyo', 'oooooooo', '.bbbbbb.', '........'], { o: '#d8902a', y: '#ffe08a', r: '#ff4a3a', g: '#6ad84a', b: '#a8602a' }],
  potion_red: [['...oo...', '..wwww..', '..wrrw..', '..wrrw..', '..wrwr..', '..wrrw..', '..wwww..', '........'], { o: '#3a3aff', w: '#dfeaff', r: '#3ae8ff' }],
  energy: [['....yy..', '...yy...', '..yy....', '.yyyyy..', '...yy...', '..yy....', '.yy.....', '........'], { y: '#ff3ec8' }],
};
const tint = (t: Tpl, pal?: Record<string, string>): Tpl => [t[0], { ...t[1], ...(pal ?? {}) }];
const urlCache = new Map<string, string>();
function tplURL(key: string, t: Tpl, scale: number) {
  const k = key + scale; const c0 = urlCache.get(k); if (c0) return c0;
  const [rows, pal] = t; const c = document.createElement('canvas'); c.width = 8 * scale; c.height = 8 * scale; const g = c.getContext('2d')!;
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.') { g.fillStyle = pal[ch] ?? '#fff'; g.fillRect(x * scale, y * scale, scale, scale); } }));
  const u = c.toDataURL(); urlCache.set(k, u); return u;
}
export const statusIcon = (k: string, px = 16) => `<img class="px" src="${tplURL('s' + k, ST[k] ?? ST.stun, 2)}" width="${px}" height="${px}" alt="">`;
export const intentIcon = (k: string, px = 16) => `<img class="px" src="${tplURL('i' + k, IN[k] ?? IN.atk, 2)}" width="${px}" height="${px}" alt="">`;
export function miscIcon(k: string, px = 16, color?: string) { if (k === 'food') return `<img class="px" src="${tplURL('mfood', MISC.food, 2)}" width="${px}" height="${px}" alt="">`; const t = k === 'potion' ? tint(MISC.potion_red, color ? { r: color } : undefined) : MISC[k] ?? MISC.heart; return `<img class="px" src="${tplURL('m' + k + (color ?? ''), t, 2)}" width="${px}" height="${px}" alt="">`; }

// Map medallions (24x24) drawn with Pix
const medCache = new Map<string, string>();
export function medallion(type: string, state: 'avail' | 'done' | 'locked' | 'cur'): string {
  const key = type + state; const c0 = medCache.get(key); if (c0) return c0;
  const boss = type === 'boss'; const S = boss ? 32 : 24; const p = new Pix(S, S); const cx = S / 2 - 0.5;
  const rim = p.mat(boss ? '#ff3ec8' : state === 'cur' ? '#b8ff3a' : { battle: '#ff4a8a', elite: '#c86aff', campfire: '#3ae8ff', merchant: '#ffcf3a', event: '#6affd8', treasure: '#ff9a2a', shrine: '#e0b8ff' }[type] ?? '#888'), face = p.mat(boss ? '#2a0a3a' : '#141030');
  p.ell(cx, cx, S / 2 - 1.5, S / 2 - 1.5, rim); p.ell(cx, cx, S / 2 - 3.5, S / 2 - 3.5, face);
  const o = boss ? 4 : 0; const W = p.mat('#e8eef4'), Y = p.mat('#f5c542'), R = p.mat('#ff3ec8'), B = p.mat('#6a5a8a'), WH = p.flat('#ffffff'), K = p.flat('#1a1010');
  switch (type) {
    case 'battle': p.line(7, 16, 16, 7, W, 2); p.line(8, 7, 17, 16, W, 2); p.px(16, 7, p.flat('#ff4a8a')); p.px(8, 7, p.flat('#3ae8ff')); break; // crossed glowsticks
    case 'elite': p.ell(12, 11, 6, 6, p.mat('#a8a0c8')); p.rect(9, 15, 7, 3, p.mat('#a8a0c8')); p.rect(9, 10, 2, 3, K); p.rect(14, 10, 2, 3, K); p.px(10, 11, p.flat('#c8ff6a')); p.px(15, 11, p.flat('#c8ff6a')); break; // Drained skull
    case 'campfire': p.rect(9, 8, 6, 11, p.mat('#3ae8ff')); p.rect(10, 6, 4, 2, p.mat('#e8f0ff')); p.rect(10, 11, 1, 6, WH); p.rect(9, 13, 6, 2, p.mat('#1a6aa8')); break; // water bottle
    case 'merchant': p.rect(5, 10, 14, 7, p.mat('#ffcf3a')); p.rect(7, 8, 10, 3, p.mat('#ff4a8a')); p.rect(7, 11, 4, 3, p.flat('#141030')); p.ell(8, 18, 2, 2, K); p.ell(16, 18, 2, 2, K); break; // food truck
    case 'event': p.ell(9, 9, 2.5, 2.5, W); p.ell(15, 9, 2.5, 2.5, W); p.rect(7, 12, 5, 6, p.mat('#6affd8')); p.rect(13, 12, 5, 6, p.mat('#ff9ae8')); break; // crew
    case 'treasure': p.rect(6, 9, 12, 9, p.mat('#3a3aff')); p.rect(6, 8, 12, 2, p.mat('#8a8aff')); p.rect(9, 12, 6, 2, WH); break; // lost & found bin
    case 'shrine': p.rect(11, 9, 2, 10, B); p.ell(12, 7, 4, 4, p.mat('#d8d0f0')); p.px(11, 6, WH); p.rect(8, 11, 8, 2, p.mat('#ff3ec8')); break; // totem
    case 'boss': p.rect(6, 14, 20, 6, p.mat('#3a3a5a')); p.ell(11, 14, 4, 2, W); p.ell(21, 14, 4, 2, W); p.curve(9, 12, 16, 3, 23, 12, R, 2); p.ell(8 + o / 4, 12, 2, 3, R); p.ell(24 - o / 4, 12, 2, 3, R); p.px(16, 17, p.flat('#ff3ec8')); break; // DJ headphones + decks
  }
  if (state === 'cur') { p.px(cx - 4, 3, WH); }
  const c = p.render(); const u = c.toDataURL(); medCache.set(key, u); return u;
}
