// Crisp pixel icons: statuses, intents, map medallions, misc UI glyphs.
import { Pix } from './pix';
type Tpl = [string[], Record<string, string>];
const ST: Record<string, Tpl> = {
  burn: [['...r....', '..ry.r..', '.ryyr...', '.ryyyr.r', 'ryywyyr.', 'rywwwyr.', '.ryyyr..', '..rrr...'], { r: '#e8462a', y: '#ffb02a', w: '#fff2a0' }],
  soak: [['...b....', '...b....', '..bwb...', '..bwb...', '.bbwbb..', '.bbbbb..', '..bbb...', '........'], { b: '#3a8ae8', w: '#cfeaff' }],
  bleed: [['...r....', '..rr....', '..rwr...', '.rrwrr..', '.rrrrr..', '.rrrrr..', '..rrr...', '......r.'], { r: '#d0283a', w: '#ff9aa8' }],
  stun: [['.y...y..', 'yyy.yyy.', '.y...y..', '...y....', '..yyy...', '...y....', '.y......', 'yyy.....'], { y: '#ffe04a' }],
  shield: [['.bbbbbb.', 'bwwbbbbb', 'bwbbbbbb', 'bbbbbbbb', 'bbbbbbbd', '.bbbbbd.', '..bbdd..', '...dd...'], { b: '#7ab8f0', w: '#e8f6ff', d: '#3a6aa8' }],
  strength: [['...o....', '..ooo...', '.ooooo..', 'ooooooo.', '..ooo...', '..ooo...', '..ooo...', '..ooo...'], { o: '#ff9a3a' }],
  weak: [['..ppp...', '..ppp...', '..ppp...', '..ppp...', 'ppppppp.', '.ppppp..', '..ppp...', '...p....'], { p: '#a890d8' }],
  thorns: [['g..g..g.', 'gg.gg.gg', '.ggggggg', '..gwggg.', '.ggggggg', 'gg.gg.gg', 'g..g..g.', '........'], { g: '#5ac85a', w: '#c8ffb0' }],
};
const IN: Record<string, Tpl> = {
  atk: [['......ww', '.....www', '....www.', 'b..www..', '.bwww...', '..bb....', '.b.bb...', 'b....b..'], { w: '#e8eef4', b: '#b0702a' }],
  guard: ST.shield, buff: ST.strength, debuff: [['.pppppp.', 'pp.pp.pp', 'pp.pp.pp', 'pppppppp', '.pp..pp.', '.pppppp.', '.p.p.p..', '........'], { p: '#b08ae8' }],
  heal: [['..gg....', '..gg....', 'gggggg..', 'gggggg..', '..gg....', '..gg....', '........', '........'], { g: '#5ae05a' }],
};
const MISC: Record<string, Tpl> = {
  heart: [['.rr.rr..', 'rwrrrrr.', 'rrrrrrr.', 'rrrrrrr.', '.rrrrr..', '..rrr...', '...r....', '........'], { r: '#e8423f', w: '#ffb0a8' }],
  coin: [['..yyyy..', '.ywyyyy.', 'yyoyyoyy', 'yyoyyyyy', 'yyoyyyyy', 'yyyooyyy', '.yyyyyo.', '..oooo..'], { y: '#f5c542', o: '#b8860b', w: '#fff6c0' }],
  ember: [['...a....', '..aya...', '.ayyya..', '.aywya..', '.ayyya..', '..aaa...', '........', '........'], { a: '#e8692b', y: '#f5c542', w: '#fff' }],
  potion_red: [['...oo...', '...ww...', '..wwww..', '.wrrrrw.', '.wrwrrw.', '.wrrrrw.', '..wwww..', '........'], { o: '#8a5a2b', w: '#dfe6ee', r: '#e8423f' }],
  energy: [['....yy..', '...yy...', '..yy....', '.yyyyy..', '...yy...', '..yy....', '.yy.....', '........'], { y: '#ffe04a' }],
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
export function miscIcon(k: string, px = 16, color?: string) { const t = k === 'potion' ? tint(MISC.potion_red, color ? { r: color } : undefined) : MISC[k] ?? MISC.heart; return `<img class="px" src="${tplURL('m' + k + (color ?? ''), t, 2)}" width="${px}" height="${px}" alt="">`; }

// Map medallions (24x24) drawn with Pix
const medCache = new Map<string, string>();
export function medallion(type: string, state: 'avail' | 'done' | 'locked' | 'cur'): string {
  const key = type + state; const c0 = medCache.get(key); if (c0) return c0;
  const boss = type === 'boss'; const S = boss ? 32 : 24; const p = new Pix(S, S); const cx = S / 2 - 0.5;
  const rim = p.mat(boss ? '#d4af37' : state === 'cur' ? '#f2c14e' : '#9a7a5a'), face = p.mat(boss ? '#5a2a3a' : { battle: '#7a3a2a', elite: '#4a2a4a', campfire: '#6a4a2a', merchant: '#2a5a3a', event: '#2a4a6a', treasure: '#5a4a2a', shrine: '#3a3a6a' }[type] ?? '#444');
  p.ell(cx, cx, S / 2 - 1.5, S / 2 - 1.5, rim); p.ell(cx, cx, S / 2 - 3.5, S / 2 - 3.5, face);
  const o = boss ? 4 : 0; const W = p.mat('#e8eef4'), Y = p.mat('#f5c542'), R = p.mat('#e8502a'), B = p.mat('#8a5a2b'), WH = p.flat('#ffffff'), K = p.flat('#1a1010');
  switch (type) {
    case 'battle': p.line(7, 16, 16, 7, W, 2); p.line(8, 7, 17, 16, W, 2); p.rect(6, 15, 3, 3, B); p.rect(15, 15, 3, 3, B); break;
    case 'elite': p.ell(12, 11, 6, 6, W); p.rect(9, 15, 7, 3, W); p.rect(9, 10, 2, 3, K); p.rect(14, 10, 2, 3, K); p.px(12, 13, K); break;
    case 'campfire': p.poly([[8, 17], [12, 6], [16, 17]], R); p.poly([[10, 17], [12, 11], [14, 17]], Y); p.rect(7, 17, 10, 2, B); break;
    case 'merchant': p.ell(12, 14, 6, 5, Y); p.rect(10, 7, 5, 3, B); p.rect(11, 12, 2, 4, p.flat('#8a6a10')); break;
    case 'event': p.ell(12, 9, 4, 3, W); p.erase(10, 9, 3, 2); p.rect(12, 11, 2, 3, W); p.rect(12, 16, 2, 2, W); break;
    case 'treasure': p.rect(6, 10, 12, 8, B); p.rect(6, 9, 12, 3, p.mat('#a0703a')); p.rect(11, 12, 2, 3, Y); break;
    case 'shrine': p.poly([[12, 5], [14, 10], [19, 10], [15, 13], [17, 18], [12, 15], [7, 18], [9, 13], [5, 10], [10, 10]], p.mat('#c9a0ff')); break;
    case 'boss': p.poly([[8 + o / 2, 20], [8 + o / 2, 11], [12, 15], [16, 8], [20, 15], [24 - o / 2, 11], [24 - o / 2, 20]], Y); p.px(16, 14, p.flat('#e8423f')); p.rect(9, 20, 14, 2, Y); break;
  }
  if (state === 'cur') { p.px(cx - 4, 3, WH); }
  const c = p.render(); const u = c.toDataURL(); medCache.set(key, u); return u;
}
