// Procedural pixel sprites: string templates + palette, drawn to tiny canvases and scaled with crisp pixels.
const T: Record<string, string[]> = {
  chibi: [
    '....oooooooo....',
    '...ohhhhhhhhho..',
    '..ohhhhhhhhhhho.',
    '..ohhhhhhhhhhho.',
    '..ohhsssssssho..',
    '..ohsssssssssho.',
    '..osseessseesso.',
    '..osseeesseeeso.',
    '..oSsssssssssSo.',
    '...osssmmsssoo..',
    '....oooooooo..w.',
    '...obbbbbbbbo.w.',
    '..obbaabbbbbbow.',
    '..obbbaabbbboow.',
    '..osobbbbbbosoo.',
    '...oobbbbbboo...',
    '....obbo.obbo...',
    '....oooo.oooo...',
  ],
  slime: [
    '................',
    '......oooo......',
    '....oobbbboo....',
    '...obbbbaabbo...',
    '..obbbbbbaabbo..',
    '..obbbbbbbbbbo..',
    '.obbeebbbbeebbo.',
    '.obbeebbbbeebbo.',
    '.obbbbbbbbbbbbo.',
    '.obbbbommobbbbo.',
    '.obbbbbbbbbbbbo.',
    '..oDDDDDDDDDDo..',
    '...oooooooooo...',
  ],
  beast: [
    '..oo........oo....',
    '.oaao......obbo...',
    '.obbbooooooobbbo..',
    'obeebbbbbbbbbbbbo.',
    'obeebbbbbbbbbbbbbo',
    'oaabbbbbbbbbbbbbbo',
    'ommobbbbbbbbbbbbbo',
    '.oooDbbbbbbbbbbbo.',
    '...obbbbbbbbbbbo..',
    '...oDDo.oDDo.oDDo.',
    '...obbo.obbo.obbo.',
    '...oooo.oooo.oooo.',
  ],
  wisp: [
    '.....oooo.....',
    '....oaaaao....',
    '...oabbbbao...',
    '..oabbbbbbao..',
    '.oabbbbbbbbao.',
    '.obbeebbeebbo.',
    '.obbeebbeebbo.',
    '.obbbbbbbbbbo.',
    '.obbbbmmbbbbo.',
    '..obbbbbbbbo..',
    '..obbb..bbbo..',
    '...obb..bbo...',
    '....ob..bo....',
    '.....o..o.....',
  ],
  golem: [
    '......oooooooo......',
    '.....obbbbbbbbo.....',
    '.....obeebbeebo.....',
    '.....obeebbeebo.....',
    '.....obbbmmbbbo.....',
    '...ooobbbbbbbbooo...',
    '..obbbbaaaaaabbbbo..',
    '.obbbbbbbbbbbbbbbbo.',
    'obbbobbbaabbbbobbbbo',
    'obbbobbbbbbbbbobbbbo',
    'obbbobbbbbbbbbobbbbo',
    'oDDoobbbbbbbbbooDDDo',
    '.oo.obbbbbbbbbbo.oo.',
    '....oDDDDooDDDDo....',
    '....obbbo..obbbo....',
    '....ooooo..ooooo....',
  ],
  bird: [
    '......oooo........',
    '.....obbbbo.......',
    '...aaobeebbo......',
    '....aobeebbo......',
    '.....obbbbbo......',
    '.ooooobbbbbbooooo.',
    'oaaabbbbbbbbbbaaao',
    '.oaabbbbbbbbbbaao.',
    '..ooobbbbbbbbooo..',
    '.....oDDDDDDo.....',
    '......oaooao......',
    '......oo..oo......',
  ],
};
function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1).padEnd(6, '0').slice(0, 6), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.min(255, Math.round(r * f))); g = Math.max(0, Math.min(255, Math.round(g * f))); b = Math.max(0, Math.min(255, Math.round(b * f)));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}
function mix(a: string, b: string, t: number) { const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); const c = [16, 8, 0].map(s => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t)); return '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''); }
function expandHex(h: string) { return h.length === 4 ? '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3] : h; }
export function spriteCanvas(shape: string, palIn: Record<string, string>, scale = 4, opts: { flip?: boolean; evo?: number } = {}): HTMLCanvasElement {
  const pal: Record<string, string> = {}; for (const k in palIn) pal[k] = expandHex(palIn[k]);
  let rows = (T[shape] ?? T.chibi).slice();
  if (opts.evo && opts.evo >= 1) rows[0] = rows[0].replace(/o(?=o)/g, 'a');
  if (opts.evo && opts.evo >= 2) { rows = ['...y.y..y.y.....', ...rows]; }
  const w = Math.max(...rows.map(r => r.length)), hgt = rows.length;
  const c = document.createElement('canvas'); c.width = w; c.height = hgt;
  const g = c.getContext('2d')!;
  const map: Record<string, string> = {
    o: pal.o ?? '#1a1420', h: pal.h ?? pal.b, s: pal.s ?? '#f0c8a0', e: pal.e ?? '#111', b: pal.b, a: pal.a ?? pal.b, w: pal.w ?? '#ccc',
    S: '#f29a9a', m: shade(pal.s ?? pal.b ?? '#888', 0.6), D: shade(pal.b ?? '#888', 0.7), y: '#f5c542',
  };
  if (opts.evo) map.b = mix(map.b, map.a, opts.evo >= 2 ? 0.55 : 0.35);
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    g.fillStyle = map[ch] ?? '#f0f';
    const px = opts.flip ? w - 1 - x : x; g.fillRect(px, y, 1, 1);
  }));
  // eye highlights
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'e' && row[x + 1] === 'e' && rows[y + 1]?.[x] === 'e') { g.fillStyle = '#fff'; g.fillRect(opts.flip ? w - 1 - x : x, y, 1, 1); } }));
  c.style.width = w * scale + 'px'; c.style.height = hgt * scale + 'px'; c.className = 'px';
  return c;
}
export function spriteURL(shape: string, pal: Record<string, string>, opts: { flip?: boolean; evo?: number } = {}) { return spriteCanvas(shape, pal, 1, opts).toDataURL(); }

// 8x8 icons for map nodes / UI
const ICONS: Record<string, [string[], Record<string, string>]> = {
  battle: [['......aa', '.....aa.', '....aa..', 'o..aa...', '.oaa....', '..oo....', '.o.oo...', 'o.....o.'], { a: '#dfe6ee', o: '#8a5a2b' }],
  elite: [['.oooooo.', 'oaaaaaao', 'aoaaaaoa', 'aooaaooa', 'aaaaaaaa', '.aaooaa.', '.aaaaaa.', '.a.a.a..'], { a: '#e8e0d0', o: '#2a1a1a' }],
  campfire: [['...a....', '..aya...', '..ayya..', '.ayyyya.', '.ayrrya.', '..arra..', 'oo.oo.oo', '.oo..oo.'], { a: '#e8692b', y: '#f5c542', r: '#fff1a8', o: '#6b4226' }],
  merchant: [['..oooo..', '.oyyyyo.', 'oyyooyyo', 'oyoyyyyo', 'oyyooyyo', 'oyyyyoyo', '.oyooyo.', '..oooo..'], { o: '#8a5a12', y: '#f5c542' }],
  event: [['..aaaa..', '.aa..aa.', '.....aa.', '....aa..', '...aa...', '...aa...', '........', '...aa...'], { a: '#9ad0ff' }],
  treasure: [['........', '.oooooo.', 'obbbbbbo', 'oyyooyyo', 'obbyybbo', 'obbbbbbo', 'oooooooo', '........'], { o: '#3a2410', b: '#8a5a2b', y: '#f5c542' }],
  shrine: [['...yy...', '...yy...', 'yyyyyyyy', '.yyyyyy.', '..yyyy..', '.yy..yy.', 'yy....yy', '........'], { y: '#c9a0ff' }],
  boss: [['y..y..y.', 'yy.yy.yy', 'yyyyyyyy', 'yrryyrry', 'yyyyyyyy', 'yyyyyyyy', '........', '........'], { y: '#f5c542', r: '#c0392b' }],
  heart: [['.rr.rr..', 'rrrrrrr.', 'rrrrrrr.', 'rrrrrrr.', '.rrrrr..', '..rrr...', '...r....', '........'], { r: '#e8423f' }],
  coin: [['..yyyy..', '.yyooyy.', 'yyoyyyyy', 'yyoyyyyy', 'yyoyyyyy', '.yyooyy.', '..yyyy..', '........'], { y: '#f5c542', o: '#b8860b' }],
  potion: [['...oo...', '...ww...', '..wwww..', '.wrrrrw.', '.wrrrrw.', '.wrrrrw.', '..wwww..', '........'], { o: '#8a5a2b', w: '#dfe6ee', r: '#e8423f' }],
  ember: [['...a....', '..aya...', '.ayyya..', '.ayrya..', '.ayyya..', '..aaa...', '........', '........'], { a: '#e8692b', y: '#f5c542', r: '#fff' }],
};
export function iconURL(name: string, tint?: string): string {
  const [rows, pal0] = ICONS[name] ?? ICONS.event; const pal = { ...pal0 }; if (tint) pal.r = tint;
  const c = document.createElement('canvas'); c.width = 8; c.height = 8; const g = c.getContext('2d')!;
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') { g.fillStyle = pal[ch] ?? '#fff'; g.fillRect(x, y, 1, 1); } }));
  return c.toDataURL();
}
export function icon(name: string, size = 16, tint?: string) { return `<img class="px icon" src="${iconURL(name, tint)}" width="${size}" height="${size}" alt="">`; }
