// Hi-res volumetric heroes (128x136 art px). Metal Slug-leaning chibi proportions: ~1/3 head, bent-knee
// stance, chunky gear. Built from lit shapes on the Vol renderer (see vol.ts), so every material gets
// a 10-tone ramp, specular per material kind, cloth folds, a coloured rim light and selective outlines.
import { Vol } from './vol';
import type { Pose, SpriteDef } from './characters';
export const HW = 128, HH = 136;
type P = [number, number];
interface Sk { b: number; hb: number; sway: number; head: P; neck: P; shB: P; shF: P; hipB: P; hipF: P; kneeB: P; kneeF: P; ankB: P; ankF: P; waist: number; chestY: number }
function skel(o: Pose): Sk {
  const f = o.f % 4; const b = [0, 1, 2, 1][f]; const hb = [0, 0, 1, 1][f]; const sway = [0, 1, 2, 1][f];
  const w = o.walk ?? -1; const st = w < 0 ? 0 : [0, 1, 0, -1][w];
  const kneeLift = (s: number) => (s > 0 ? -3 : 0);
  return {
    b, hb, sway,
    head: [64, 34 + b + hb], neck: [62, 52 + b], shB: [48, 58 + b], shF: [75, 58 + b], chestY: 66 + b, waist: 86 + b,
    hipB: [55, 89 + b], hipF: [69, 89 + b],
    kneeB: [51 - st * 6, 105 + Math.round(b / 2) + kneeLift(-st)], kneeF: [74 + st * 6, 104 + Math.round(b / 2) + kneeLift(st)],
    ankB: [48 - st * 9, 121 + (st < 0 ? -3 : 0)], ankF: [76 + st * 9, 121 + (st > 0 ? -3 : 0)],
  };
}
interface Face { iris: string; brow: 'fierce' | 'soft' | 'up' | 'stern'; mouth: 'grin' | 'smile' | 'open' | 'smirk'; hideEyes?: boolean; skin: string }
const INK = '#1a0e24';
function head(v: Vol, s: Sk, f: Face, blink: boolean) {
  const S = v.mat(f.skin, 'skin'); const [hx, hy] = s.head;
  v.part(() => {
    v.cap(s.neck[0], s.neck[1] - 6, s.neck[0], s.neck[1] + 2, 5, 6, S);
    v.ell(hx, hy, 20, 20, S, [-0.05, 0]);
    v.ell(hx + 5, hy + 9, 12, 8, S); // jaw / cheek pushed toward the viewer side
    v.ell(hx - 15, hy + 3, 4, 5, S, [-0.3, 0]); // ear
    v.ell(hx + 15, hy + 5, 2.5, 2.5, S, [0.4, 0]); // nose
  });
  v.dot(hx - 15, hy + 3, '#c47a6a'); v.dot(hx - 14, hy + 4, '#c47a6a');
  const ex = hx - 1, ey = hy - 2;
  if (!f.hideEyes) for (const [x, w] of [[ex, 7], [ex + 11, 5]] as [number, number][]) {
    if (blink) { v.drect(x - 1, ey + 4, w + 2, 1, INK); continue; }
    v.drect(x, ey + 1, w, 8, '#ffffff'); v.drect(x + (w > 4 ? 2 : 1), ey + 2, w > 4 ? 4 : 3, 6, f.iris); v.drect(x + (w > 4 ? 2 : 1), ey + 2, w > 4 ? 4 : 3, 2, mixDark(f.iris)); v.drect(x + (w > 4 ? 3 : 2), ey + 3, 2, 3, INK);
    v.dot(x + (w > 4 ? 2 : 1), ey + 3, '#ffffff'); v.dot(x + w - 1, ey + 6, '#e8f8ff');
    v.drect(x - 1, ey, w + 2, 1, INK); v.dot(x - 1, ey + 1, INK); v.dot(x + w, ey - 1, INK); v.drect(x, ey + 8, w, 1, mixDark(f.skin));
  }
  const B = INK; const by = ey - 3;
  if (f.brow === 'fierce') { v.dline(ex - 1, by - 1, ex + 6, by + 2, B); v.dline(ex - 1, by, ex + 5, by + 2, B); v.dline(ex + 9, by + 2, ex + 14, by, B); }
  else if (f.brow === 'soft') { v.dline(ex, by + 1, ex + 6, by, B); v.dline(ex + 10, by, ex + 14, by + 1, B); }
  else if (f.brow === 'up') { v.dline(ex, by, ex + 6, by - 2, B); v.dline(ex, by + 1, ex + 6, by - 1, B); v.dline(ex + 10, by - 2, ex + 14, by - 1, B); }
  else { v.dline(ex - 2, by, ex + 6, by + 2, B); v.dline(ex - 2, by + 1, ex + 6, by + 3, B); v.dline(ex + 9, by + 3, ex + 15, by, B); }
  const my = hy + 12, mx = hx + 6;
  const BL = '#f07a8a'; v.dot(ex - 2, hy + 8, BL); v.dot(ex, hy + 8, BL); v.dot(ex - 1, hy + 9, BL); v.dot(ex + 12, hy + 8, BL);
  if (f.mouth === 'grin') { v.drect(mx, my, 8, 3, '#5a1a2e'); v.drect(mx, my, 8, 1, '#ffffff'); v.dot(mx + 6, my + 1, '#ffffff'); v.drect(mx + 1, my + 2, 5, 1, '#d8506a'); v.dot(mx - 1, my - 1, INK); v.dot(mx + 8, my - 1, INK); }
  else if (f.mouth === 'smile') { v.dline(mx, my, mx + 2, my + 1, INK); v.dline(mx + 2, my + 1, mx + 6, my + 1, INK); v.dot(mx + 7, my, INK); }
  else if (f.mouth === 'open') { v.drect(mx + 1, my - 1, 6, 4, '#5a1a2e'); v.drect(mx + 1, my - 1, 6, 1, '#ffffff'); v.drect(mx + 2, my + 2, 4, 1, '#e0607a'); }
  else { v.dline(mx, my + 1, mx + 5, my + 1, INK); v.dot(mx + 6, my, INK); v.dot(mx + 7, my - 1, INK); }
}
function mixDark(h: string) { const n = parseInt(h.slice(1), 16); const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; const k = (x: number) => Math.round(x * 0.55).toString(16).padStart(2, '0'); return '#' + k(r) + k(g) + k(b); }
/** Leg: thigh + shin capsules, knee fold, then a shoe. */
function leg(v: Vol, hip: P, knee: P, ank: P, pants: number, shoe: (x: number, y: number) => void, r = 7) {
  v.part(() => { v.cap(hip[0], hip[1], knee[0], knee[1], r, r - 1, pants); v.cap(knee[0], knee[1], ank[0], ank[1] - 2, r - 1, r - 2, pants); });
  v.fold(knee[0] - 5, knee[1] - 2, knee[0], knee[1] + 2, knee[0] + 5, knee[1] - 1, 1, 0.8);
  v.fold(ank[0] - 4, ank[1] - 8, ank[0], ank[1] - 6, ank[0] + 4, ank[1] - 8, 1, 0.6);
  shoe(ank[0], ank[1]);
}
function sneaker(v: Vol, x: number, y: number, up: number, sole: number, accent?: string, high = false) {
  v.part(() => { v.poly([[x - 7, y - (high ? 8 : 4)], [x + 3, y - (high ? 8 : 4)], [x + 8, y - 1], [x + 14, y + 1], [x + 15, y + 6], [x - 8, y + 6]], up, 4); });
  v.poly([[x - 9, y + 5], [x + 16, y + 5], [x + 16, y + 9], [x - 9, y + 9]], sole, 2);
  if (accent) { v.dline(x - 4, y + 1, x + 6, y + 3, accent); v.dline(x - 4, y + 2, x + 5, y + 4, accent); }
  v.dot(x + 1, y - 2, '#ffffff'); v.dot(x + 3, y - 1, '#ffffff');
}
function arm(v: Vol, sh: P, el: P, hand: P, sleeve: number, skin: number, r = 6, glove?: number) {
  v.part(() => { v.cap(sh[0], sh[1], el[0], el[1], r, r - 1, sleeve); v.cap(el[0], el[1], hand[0], hand[1], r - 1, r - 2, sleeve); });
  v.fold(el[0] - 3, el[1] - 4, el[0], el[1], el[0] + 3, el[1] - 4, 1, 0.7);
  v.ell(hand[0], hand[1], 4.5, 4.5, glove ?? skin);
}

// ---------------------------------------------------------------- BASS BRAWLER
function bass(v: Vol, o: Pose) {
  const e = o.evo ?? 0; const s = skel(o); const blink = o.f % 4 === 3 && o.walk === undefined;
  const pink = '#ff3ec8', cyan = '#3ae8ff';
  const HOOD = v.mat(e >= 2 ? '#4a2470' : e >= 1 ? '#3e2a5e' : '#3a3450', 'cloth'), JOG = v.mat('#262234', 'cloth'), SK = v.mat('#f2c39a', 'skin');
  const SHOE = v.mat(e >= 1 ? pink : '#eceaf6', 'plastic'), SOLE = v.mat('#f4f0ff', 'rubber'), HAIR = v.mat(pink, 'hair');
  if (e >= 2) { // speaker backpack
    const BOX = v.mat('#2e2640', 'metal'), CONE = v.mat('#3a3050', 'plastic'), SUR = v.mat('#16121e', 'rubber'), CAP = v.mat('#c8c0e0', 'metal');
    v.poly([[18, 40 + s.b], [44, 38 + s.b], [46, 86 + s.b], [20, 88 + s.b]], BOX, 3);
    for (const cy of [52, 74]) { v.ell(32, cy + s.b, 10, 10, SUR); v.ell(32, cy + s.b, 8, 8, CONE, [0, 0], true); v.ell(32, cy + s.b, 3, 3, CAP); }
    const E = v.mat(pink, 'emit'); v.cap(20, 40 + s.b, 44, 38 + s.b, 1, 1, E);
  }
  if (e >= 1) { const CP = v.mat(e >= 2 ? '#6a1a8a' : '#4a2268', 'cloth'); const sw = s.sway; v.poly([[46, 56 + s.b], [70, 56 + s.b], [62 - sw, 112], [28 - sw * 2, 116], [34, 80]], CP, 5); v.fold(50, 64, 42, 90, 36 - sw, 112, 2); v.fold(60, 64, 56, 92, 52 - sw, 112, 2); }
  // back arm
  arm(v, s.shB, [40, 72 + s.b], [42, 84 + s.b], HOOD, SK, 7);
  const shoe = (x: number, y: number) => sneaker(v, x, y, SHOE, SOLE, e >= 1 ? '#ffffff' : pink, true);
  leg(v, s.hipB, s.kneeB, s.ankB, JOG, shoe, 8);
  leg(v, s.hipF, s.kneeF, s.ankF, JOG, shoe, 8);
  // torso: oversized hoodie
  v.part(() => {
    v.poly([[44, 54 + s.b], [80, 54 + s.b], [86, 92 + s.b], [40, 92 + s.b]], HOOD, 7);
    v.ell(62, 56 + s.b, 17, 6, HOOD, [0, -0.3]); // bunched hood
  });
  v.fold(48, 62 + s.b, 50, 76 + s.b, 46, 90 + s.b, 2); v.fold(76, 64 + s.b, 78, 78 + s.b, 82, 90 + s.b, 2); v.fold(56, 86 + s.b, 62, 88 + s.b, 70, 86 + s.b, 1, 0.6);
  const PK = v.mat(e >= 2 ? '#3e1c60' : '#2e2a42', 'cloth'); v.poly([[52, 76 + s.b], [76, 76 + s.b], [78, 88 + s.b], [50, 88 + s.b]], PK, 3);
  const BAND = v.mat('#2a2438', 'cloth'); v.poly([[40, 89 + s.b], [86, 89 + s.b], [86, 94 + s.b], [40, 94 + s.b]], BAND, 2);
  const DS = e >= 1 ? pink : '#e8e0ff'; v.dline(57, 60 + s.b, 56, 72 + s.b, DS); v.dline(66, 60 + s.b, 67, 71 + s.b, DS); v.drect(55, 72 + s.b, 2, 3, '#ffffff'); v.drect(66, 71 + s.b, 2, 3, '#ffffff');
  const WV = e >= 1 ? cyan : '#9a8ac0'; [1, 3, 5, 2, 4, 6, 3, 1, 2].forEach((hh, i) => v.drect(68 + i, 66 + s.b - hh / 2, 1, hh, WV));
  if (e >= 1) { const E = v.mat(pink, 'emit'); v.cap(44, 55 + s.b, 40, 91 + s.b, 0.6, 0.6, E); const G = v.mat('#ffcf3a', 'metal'); for (let i = 0; i <= 10; i++) v.ell(53 + i * 1.8, 58 + s.b + Math.sin((i / 10) * Math.PI) * 7, 1.2, 1.2, G); }
  head(v, s, { iris: e >= 2 ? '#ffe03a' : '#b048ff', brow: 'fierce', mouth: 'grin', skin: '#f2c39a', hideEyes: e >= 2 }, blink);
  const [hx, hy] = s.head;
  // shaved sides + mohawk
  const STB = v.mat('#4a3858', 'hair'); v.part(() => { v.ell(hx - 4, hy - 9, 15, 10, STB, [0, -0.4]); });
  v.part(() => {
    const spikes: P[] = [[-12, -24], [-5, -32], [3, -35], [10, -30], [16, -22]];
    v.ell(hx + 1, hy - 14, 9, 9, HAIR);
    for (const [dx, dy] of spikes) v.poly([[hx + dx - 5, hy - 12], [hx + dx + dy * -0.08, hy + dy - s.sway * 0.3], [hx + dx + 5, hy - 12]], HAIR, 3, [0.1, -0.1]);
  });
  for (const [dx, dy] of [[-5, -30], [3, -33], [10, -28]]) v.fold(hx + dx, hy + dy + 4, hx + dx + 1, hy + dy + 10, hx + dx, hy - 13, 1, 0.5);
  if (e >= 2) { const E = v.mat('#ffd0f4', 'emit'); for (const [dx, dy] of [[-12, -24], [-5, -32], [3, -35], [10, -30], [16, -22]]) v.ell(hx + dx + dy * -0.08, hy + dy + 2, 1.2, 1.5, E); }
  // headphones
  const BANDM = v.mat('#4a4060', 'plastic'), CUP = v.mat('#2a2438', 'plastic'), RING = v.mat(e >= 1 ? pink : cyan, 'emit'), PAD = v.mat('#3e3450', 'cloth');
  v.cap(hx - 16, hy - 4, hx - 6, hy - 19, 2.2, 2.2, BANDM); v.cap(hx + 8, hy - 19, hx + 16, hy - 8, 2, 2, BANDM);
  v.ell(hx - 16, hy + 2, 7, 9, CUP); v.ell(hx - 15, hy + 2, 7, 9, RING); v.ell(hx - 15, hy + 2, 5, 7, CUP); v.ell(hx - 16, hy + 1, 2.5, 3.5, PAD);
  if (e === 1) { const SG = v.mat('#1a1428', 'plastic'), LN = v.mat(cyan, 'emit'); v.poly([[hx - 4, hy - 13], [hx + 18, hy - 12], [hx + 17, hy - 7], [hx - 4, hy - 8]], SG, 2); v.cap(hx - 2, hy - 11, hx + 16, hy - 10, 0.6, 0.6, LN); }
  if (e >= 2) { const VZ = v.mat('#ffd23a', 'metal'); v.poly([[hx - 2, hy - 4], [hx + 20, hy - 3], [hx + 19, hy + 6], [hx - 2, hy + 6]], VZ, 3); v.drect(hx + 4, hy, 4, 2, pink); v.drect(hx + 13, hy, 3, 2, pink); }
  // front arm + subwoofer gauntlet held forward
  const fa = (o.walk ?? -1) >= 0 ? [0, 2, 0, -2][o.walk!] : 0;
  arm(v, s.shF, [84, 70 + s.b + fa], [92, 72 + s.b + fa], HOOD, SK, 7);
  const sz = e >= 1 ? 2 : 0; const gx = 86 - sz, gy = 58 + s.b + fa - sz, gw = 30 + sz * 2;
  const BOX = v.mat(e >= 2 ? '#4a2a6a' : '#3a3450', 'metal'), SUR = v.mat('#16121e', 'rubber'), CONE = v.mat('#2e2840', 'plastic'), DUST = v.mat('#b8b0d8', 'metal'), LED = v.mat(e >= 1 ? pink : '#b04aff', 'emit');
  v.poly([[gx, gy], [gx + gw, gy], [gx + gw, gy + gw], [gx, gy + gw]], BOX, 4, [0.15, 0]);
  const cx = gx + gw / 2, cy = gy + gw / 2;
  v.ell(cx, cy, 12 + sz / 2, 12 + sz / 2, LED); v.ell(cx, cy, 11 + sz / 2, 11 + sz / 2, SUR); v.ell(cx, cy, 8.5, 8.5, CONE, [0, 0], true); v.ell(cx, cy, 3.5, 3.5, DUST);
  for (const [bx, by] of [[gx + 3, gy + 3], [gx + gw - 4, gy + 3], [gx + 3, gy + gw - 4], [gx + gw - 4, gy + gw - 4]]) { v.dot(bx, by, '#e8e0ff'); v.dot(bx + 1, by + 1, '#3a3050'); }
  if (e >= 1 && o.f % 2) { const W = v.mat('#ff9ae8', 'emit'); v.cap(gx + gw + 4, gy + 4, gx + gw + 6, gy + gw - 4, 0.6, 0.6, W); v.cap(gx + gw + 8, gy + 1, gx + gw + 10, gy + gw - 1, 0.6, 0.6, W); }
}

// ---------------------------------------------------------------- FLOW HEALER
function flow(v: Vol, o: Pose) {
  const e = o.evo ?? 0; const s = skel(o); const blink = o.f % 4 === 3 && o.walk === undefined;
  const cy = '#3ae8ff', pk = '#ff6ad8', gold = '#ffd86a';
  const ROBE = v.mat(e >= 2 ? '#eef4ff' : e >= 1 ? '#2a62b8' : '#3a78d8', 'cloth'), TOP = v.mat(e >= 2 ? '#fff4d8' : '#eef2ff', 'cloth'), SK = v.mat('#f6cba6', 'skin');
  const HAIR = v.mat(cy, 'hair'), SKIRT = v.mat(e >= 2 ? '#fdfdff' : '#a8e4ff', 'cloth'), SKIRT2 = v.mat(e >= 2 ? '#c8ecff' : '#3ad0f0', 'cloth'), OBI = v.mat(e >= 2 ? gold : pk, 'cloth');
  const SHOE = v.mat('#eef2ff', 'plastic'), SOLE = v.mat(e >= 2 ? gold : cy, 'rubber');
  const [hx, hy] = s.head;
  if (e >= 2) { const HP = v.mat(gold, 'emit'); for (let i = 0; i < 90; i++) { const an = (i / 90) * Math.PI * 2; if (i % 9 < 6) v.ell(30 + Math.cos(an) * 13, 72 + s.b + Math.sin(an) * 30, 0.8, 0.8, HP); } }
  // long hair behind
  v.part(() => { v.ell(hx - 3, hy - 2, 20, 19, HAIR); v.poly([[hx - 21, hy], [hx + 2, hy + 4], [hx - 4, hy + 46], [hx - 14, hy + 54 + s.sway], [hx - 26, hy + 40]], HAIR, 6); });
  v.fold(hx - 18, hy + 6, hx - 20, hy + 26, hx - 18, hy + 48, 1); v.fold(hx - 10, hy + 6, hx - 12, hy + 28, hx - 10, hy + 48, 1);
  // flowing robe behind
  const len = e >= 1 ? 128 : 120; const sw = s.sway;
  v.poly([[44, 56 + s.b], [78, 56 + s.b], [80, len - 6], [52, len], [26 - sw, len - 4], [34, 84]], ROBE, 6);
  v.fold(46, 70, 38, 96, 32 - sw, len - 6, 2); v.fold(56, 74, 50, 100, 46 - sw, len - 4, 2);
  const HEM = e >= 2 ? gold : pk; for (let x = 28 - sw; x < 80; x += 3) v.dot(x, len - 5 + ((x >> 1) % 2), HEM);
  arm(v, s.shB, [38, 70 + s.b], [32, 80 + s.b - s.sway], ROBE, SK, 7); // back arm out gracefully
  v.poly([[30, 66 + s.b], [44, 64 + s.b], [42, 84 + s.b], [26, 86 + s.b - sw]], ROBE, 4); // wide sleeve drape
  const shoe = (x: number, y: number) => sneaker(v, x, y, SHOE, SOLE);
  leg(v, s.hipB, s.kneeB, s.ankB, v.mat('#f6cba6', 'skin'), shoe, 6);
  leg(v, s.hipF, s.kneeF, s.ankF, v.mat('#f6cba6', 'skin'), shoe, 6);
  v.part(() => { v.poly([[46, 54 + s.b], [78, 54 + s.b], [80, 84 + s.b], [44, 84 + s.b]], TOP, 6); });
  v.poly([[46, 54 + s.b], [56, 54 + s.b], [62, 82 + s.b], [44, 82 + s.b]], ROBE, 4); v.poly([[70, 54 + s.b], [78, 54 + s.b], [80, 82 + s.b], [66, 82 + s.b]], ROBE, 4);
  v.fold(50, 60 + s.b, 52, 70 + s.b, 48, 80 + s.b, 1); v.fold(74, 60 + s.b, 76, 70 + s.b, 78, 80 + s.b, 1);
  // layered skirt
  v.poly([[44, 84 + s.b], [80, 84 + s.b], [88, 104], [36, 104]], SKIRT, 5);
  v.poly([[42, 94], [82, 94], [92, 110], [32, 110]], SKIRT2, 5);
  for (const fx of [44, 54, 64, 74, 84]) v.fold(fx - 2 + (fx - 62) * 0.05, 96, fx - 2 + (fx - 62) * 0.12, 104, fx - 2 + (fx - 62) * 0.2, 109, 1, 0.8);
  const SE = e >= 2 ? gold : pk; for (let x = 33; x < 92; x += 4) v.dot(x, 109, SE);
  v.poly([[44, 80 + s.b], [80, 80 + s.b], [80, 88 + s.b], [44, 88 + s.b]], OBI, 3); v.ell(62, 84 + s.b, 5, 5, OBI); v.poly([[60, 86 + s.b], [64, 86 + s.b], [62, 98 + s.b], [56, 96 + s.b]], OBI, 2);
  head(v, s, { iris: '#18b0c8', brow: 'soft', mouth: 'smile', skin: '#f6cba6' }, blink);
  // fringe
  v.part(() => {
    v.poly([[hx - 20, hy - 2], [hx - 16, hy - 16], [hx - 4, hy - 22], [hx + 10, hy - 21], [hx + 19, hy - 12], [hx + 20, hy - 2], [hx + 14, hy - 10], [hx + 8, hy - 6], [hx + 2, hy - 12], [hx - 6, hy - 6], [hx - 12, hy - 4], [hx - 16, hy + 6]], HAIR, 5);
    v.cap(hx + 18, hy - 6, hx + 20, hy + 14, 3, 1.5, HAIR);
  });
  v.fold(hx - 8, hy - 20, hx - 4, hy - 12, hx - 6, hy - 6, 1, 0.6); v.fold(hx + 6, hy - 20, hx + 8, hy - 14, hx + 8, hy - 6, 1, 0.6);
  if (e === 0) { const CL = v.mat(pk, 'plastic'); v.ell(hx - 12, hy - 14, 3, 3, CL); }
  if (e >= 1) { const LF = v.mat('#3ac86a', 'cloth'); v.cap(hx - 20, hy - 10, hx - 4, hy - 22, 1.5, 1.5, LF); v.cap(hx - 4, hy - 22, hx + 18, hy - 14, 1.5, 1.5, LF);
    const cols = e >= 2 ? [gold, '#ffffff', '#ffb8e8'] : [pk, '#ffe03a', '#ffffff']; [[-19, -10], [-13, -17], [-6, -21], [1, -22], [8, -20], [14, -16]].forEach(([dx, dy], i) => { const F = v.mat(cols[i % 3], 'plastic'); v.ell(hx + dx, hy + dy, 3, 3, F); v.dot(hx + dx, hy + dy, '#ffe03a'); }); }
  if (e >= 2) { const HL = v.mat(gold, 'emit'); for (let i = 0; i < 40; i++) { const an = (i / 40) * Math.PI * 2; v.ell(hx + Math.cos(an) * 16, hy - 30 + Math.sin(an) * 3, 0.6, 0.6, HL); } }
  v.dot(hx + 12, hy + 6, '#ffffff'); v.dot(hx + 11, hy + 7, pk); v.dot(hx + 13, hy + 7, pk);
  // front arm raises the fan
  const fa = (o.walk ?? -1) >= 0 ? [0, 2, 0, -2][o.walk!] : 0;
  arm(v, s.shF, [84, 70 + s.b + fa], [96, 72 + s.b + fa], ROBE, SK, 7);
  v.poly([[78, 60 + s.b + fa], [90, 62 + s.b + fa], [96, 78 + s.b + fa], [80, 80 + s.b + fa]], ROBE, 4); v.fold(82, 64 + s.b, 86, 72 + s.b, 84, 78 + s.b, 1);
  const fx = 98, fy = 70 + s.b + fa, r = e >= 2 ? 28 : e >= 1 ? 25 : 22; const a0 = -Math.PI * 0.62, a1 = Math.PI * 0.05; const ribs = 10;
  const c1 = v.mat(e >= 2 ? '#ffffff' : pk, 'cloth'), c2 = v.mat(e >= 2 ? gold : cy, 'cloth');
  for (let i = 0; i < ribs; i++) { const t0 = a0 + ((a1 - a0) * i) / ribs, t1 = a0 + ((a1 - a0) * (i + 1)) / ribs; const tm = (t0 + t1) / 2;
    v.poly([[fx, fy], [fx + Math.cos(t0) * r, fy + Math.sin(t0) * r], [fx + Math.cos(tm) * (r + 1.5), fy + Math.sin(tm) * (r + 1.5)], [fx + Math.cos(t1) * r, fy + Math.sin(t1) * r]], i % 2 ? c1 : c2, 2, [Math.cos(tm) * (i % 2 ? 0.25 : -0.25), Math.sin(tm) * 0.2]); }
  for (let i = 0; i <= ribs; i++) { const t = a0 + ((a1 - a0) * i) / ribs; v.dline(fx, fy, fx + Math.cos(t) * r * 0.5, fy + Math.sin(t) * r * 0.5, '#6a3a2a'); }
  if (e >= 1) { const LED = o.f % 2 ? '#ffffff' : '#ffe03a'; for (let i = 0; i <= ribs; i++) { const t = a0 + ((a1 - a0) * i) / ribs; v.dot(fx + Math.cos(t) * (r - 2), fy + Math.sin(t) * (r - 2), LED); } }
  v.ell(fx, fy, 2.5, 2.5, v.mat(gold, 'metal')); v.ell(fx - 1, fy + 3, 4.5, 4.5, SK);
}

// ---------------------------------------------------------------- TEMPO DANCER
function tempo(v: Vol, o: Pose) {
  const e = o.evo ?? 0; const s = skel(o); const blink = o.f % 4 === 3 && o.walk === undefined;
  const lime = '#b8ff3a', mag = '#ff3ec8';
  const JK = v.mat(e >= 2 ? '#22224a' : '#2a2458', 'plastic'), STR = v.mat(lime, 'cloth'), PANT = v.mat('#2a2458', 'cloth'), SK = v.mat('#e8b48c', 'skin');
  const SHOE = v.mat('#f4f4ff', 'plastic'), SOLE = v.mat(lime, e >= 1 ? 'emit' : 'rubber'), HAIR = v.mat(lime, 'hair');
  const [hx, hy] = s.head; const sw = s.sway;
  const SC = v.mat(e >= 2 ? '#e8ff9a' : lime, 'cloth'); const len = e >= 1 ? 40 : 24;
  v.part(() => { v.cap(48, 56 + s.b, 40 - len * 0.4, 52 + sw * 2, 5, 4, SC); v.cap(40 - len * 0.4, 52 + sw * 2, 44 - len, 46 + sw * 3, 4, 2, SC); });
  v.fold(46, 56 + s.b, 40 - len * 0.3, 54 + sw * 2, 44 - len * 0.9, 47 + sw * 3, 1, 0.7);
  if (e >= 2) { const WG = v.mat('#3affd8', 'emit'), WG2 = v.mat('#c8fff4', 'emit'); v.poly([[40, 70 + s.b], [6, 40 + s.b + sw], [16, 66 + s.b], [4, 76 + s.b], [32, 84 + s.b]], WG, 2); v.cap(10, 46 + s.b + sw, 34, 72 + s.b, 0.6, 0.6, WG2); }
  // back arm raised with a glowstick (dynamic pose)
  arm(v, s.shB, [40, 66 + s.b], [34, 54 + s.b - sw], JK, SK, 6);
  const G2 = v.mat(mag, 'emit'); v.cap(34, 56 + s.b - sw, 26, 32 + s.b - sw * 2, 2, 2, G2); v.ell(34, 54 + s.b - sw, 4.5, 4.5, SK);
  const shoe = (x: number, y: number) => sneaker(v, x, y, SHOE, SOLE, '#7a7a98');
  leg(v, s.hipB, s.kneeB, s.ankB, PANT, shoe, 7);
  v.cap(s.hipB[0] - 6, s.hipB[1], s.kneeB[0] - 6, s.kneeB[1], 0.6, 0.6, STR);
  leg(v, s.hipF, s.kneeF, s.ankF, PANT, shoe, 7);
  v.cap(s.hipF[0] + 5, s.hipF[1] + 2, s.kneeF[0] + 5, s.kneeF[1], 0.6, 0.6, STR); v.cap(s.kneeF[0] + 4, s.kneeF[1], s.ankF[0] + 4, s.ankF[1] - 4, 0.6, 0.6, STR);
  v.part(() => { v.poly([[46, 54 + s.b], [78, 54 + s.b], [82, 90 + s.b], [42, 90 + s.b]], JK, 6); });
  v.fold(50, 62 + s.b, 52, 76 + s.b, 48, 88 + s.b, 1); v.fold(76, 62 + s.b, 76, 76 + s.b, 80, 88 + s.b, 1);
  v.poly([[46, 56 + s.b], [49, 56 + s.b], [46, 90 + s.b], [43, 90 + s.b]], STR, 1); v.poly([[76, 56 + s.b], [79, 56 + s.b], [82, 90 + s.b], [79, 90 + s.b]], STR, 1);
  const ZIP = v.mat('#c8c8e0', 'metal'); v.cap(62, 58 + s.b, 62, 88 + s.b, 0.8, 0.8, ZIP); v.ell(62, 64 + s.b, 1.5, 2, ZIP);
  v.poly([[50, 52 + s.b], [62, 56 + s.b], [56, 63 + s.b]], STR, 2); v.poly([[76, 52 + s.b], [63, 56 + s.b], [69, 63 + s.b]], STR, 2);
  const HM = v.mat('#3a3478', 'cloth'); v.poly([[42, 87 + s.b], [82, 87 + s.b], [82, 92 + s.b], [42, 92 + s.b]], HM, 2);
  v.drect(68, 68 + s.b, 5, 3, mag); v.dot(70, 69 + s.b, '#ffffff');
  head(v, s, { iris: '#58c41a', brow: 'up', mouth: 'open', skin: '#e8b48c', hideEyes: e >= 2 }, blink);
  v.part(() => { v.ell(hx - 13, hy - 20, 8, 8, HAIR); v.ell(hx + 9, hy - 23, 8, 8, HAIR); });
  v.fold(hx - 16, hy - 24, hx - 13, hy - 20, hx - 10, hy - 16, 1, 0.5); v.fold(hx + 6, hy - 27, hx + 9, hy - 23, hx + 12, hy - 19, 1, 0.5);
  v.part(() => { v.poly([[hx - 20, hy + 2], [hx - 18, hy - 14], [hx - 6, hy - 20], [hx + 10, hy - 19], [hx + 19, hy - 10], [hx + 20, hy], [hx + 13, hy - 7], [hx + 10, hy - 2], [hx + 5, hy - 9], [hx - 2, hy - 5], [hx - 7, hy - 11], [hx - 14, hy - 4], [hx - 17, hy + 8]], HAIR, 5); });
  v.fold(hx - 4, hy - 18, hx - 3, hy - 12, hx - 2, hy - 6, 1, 0.5); v.fold(hx + 8, hy - 18, hx + 9, hy - 12, hx + 10, hy - 3, 1, 0.5);
  const SB = v.mat(mag, 'cloth'); v.part(() => { v.cap(hx - 20, hy - 9, hx, hy - 17, 3, 3, SB); v.cap(hx, hy - 17, hx + 19, hy - 11, 3, 3, SB); }); v.drect(hx - 2, hy - 18, 4, 2, '#ffffff');
  if (e >= 2) { const VZ = v.mat(mag, 'plastic'); v.poly([[hx - 1, hy - 4], [hx + 20, hy - 3], [hx + 19, hy + 6], [hx - 1, hy + 6]], VZ, 3); }
  const fa = (o.walk ?? -1) >= 0 ? [0, 2, 0, -2][o.walk!] : 0;
  arm(v, s.shF, [84, 72 + s.b + fa], [92, 80 + s.b + fa], JK, SK, 6);
  v.cap(80, 64 + s.b, 88, 76 + s.b + fa, 0.6, 0.6, STR);
  const G1 = v.mat(lime, 'emit'); v.cap(92, 82 + s.b + fa, 108, 60 + s.b + fa - (o.f % 2), 2, 2, G1); v.ell(92, 80 + s.b + fa, 4.5, 4.5, SK);
  const WB = v.mat(mag, 'cloth'); v.cap(87, 76 + s.b + fa, 90, 78 + s.b + fa, 3, 3, WB);
  if (e >= 1) { v.dot(108, 58 + s.b + fa, '#ffffff'); v.dot(111, 55 + s.b + fa, '#e8ffb0'); v.dot(24, 29 + s.b, '#ffb8ec'); }
}

// ---------------------------------------------------------------- WALL OF SOUND
function wall(v: Vol, o: Pose) {
  const e = o.evo ?? 0; const s = skel(o); const blink = false;
  const orange = '#ff9a2a', gold = '#ffcf3a';
  const PJ = v.mat(e >= 2 ? '#4a2a6e' : '#2e2840', 'cloth'), PANT = v.mat('#4a4232', 'cloth'), SK = v.mat('#e4b78c', 'skin'), BOOT = v.mat('#2a2230', 'plastic'), SOLE = v.mat('#14101a', 'rubber'), HAIR = v.mat(orange, 'hair');
  const [hx, hy] = s.head;
  if (e >= 1) { const CP = v.mat(e >= 2 ? '#2e1a40' : '#5a3a20', 'cloth'); v.poly([[40, 58 + s.b], [80, 58 + s.b], [74 - s.sway, 124], [26 - s.sway * 2, 124], [32, 84]], CP, 5); v.fold(46, 66, 38, 96, 32 - s.sway, 120, 2); v.fold(58, 66, 54, 98, 50 - s.sway, 120, 2); }
  arm(v, s.shB, [40, 74 + s.b], [44, 86 + s.b], PJ, SK, 9, v.mat('#2a2230', 'cloth'));
  const boot = (x: number, y: number) => { v.part(() => { v.poly([[x - 8, y - 10], [x + 5, y - 10], [x + 8, y - 2], [x + 15, y], [x + 16, y + 6], [x - 9, y + 6]], BOOT, 4); }); v.poly([[x - 10, y + 5], [x + 17, y + 5], [x + 17, y + 10], [x - 10, y + 10]], SOLE, 2); for (let i = 0; i < 3; i++) { v.dot(x - 3 + i * 3, y - 6 + i, '#c8b890'); } };
  leg(v, s.hipB, s.kneeB, s.ankB, PANT, boot, 9);
  leg(v, s.hipF, s.kneeF, s.ankF, PANT, boot, 9);
  const PKT = v.mat('#5a5040', 'cloth'); v.poly([[s.kneeF[0] - 4, s.kneeF[1] - 4], [s.kneeF[0] + 6, s.kneeF[1] - 4], [s.kneeF[0] + 6, s.kneeF[1] + 4], [s.kneeF[0] - 4, s.kneeF[1] + 4]], PKT, 2);
  // puffer jacket: wide shoulders, stacked quilted bands
  v.part(() => {
    v.ell(46, 62 + s.b, 12, 10, PJ); v.ell(78, 62 + s.b, 12, 10, PJ);
    for (let i = 0; i < 4; i++) { const y = 62 + s.b + i * 8; v.cap(40 + i, y, 84 - i, y, 6, 6, PJ); }
  });
  const ZIP = v.mat(gold, 'metal'); v.cap(62, 56 + s.b, 62, 92 + s.b, 0.8, 0.8, ZIP);
  const FUR = v.mat(orange, 'cloth'); v.ell(62, 55 + s.b, 17, 5, FUR, [0, -0.3]);
  const CH = v.mat(gold, 'metal'); for (let i = 0; i <= 12; i++) v.ell(52 + i * 1.7, 58 + s.b + Math.sin((i / 12) * Math.PI) * 9, 1.4, 1.4, CH); v.ell(62, 70 + s.b, 4, 4, CH);
  if (e >= 1) { const SD = v.mat('#d8d8e8', 'metal'); for (const [x, y] of [[38, 60], [42, 55], [48, 54], [76, 54], [82, 55], [86, 60]]) v.ell(x, y + s.b, 1.8, 1.8, SD); }
  head(v, s, { iris: orange, brow: 'stern', mouth: 'smirk', skin: '#e4b78c', hideEyes: true }, blink);
  v.part(() => { v.poly([[hx - 20, hy - 2], [hx - 19, hy - 30], [hx + 18, hy - 32], [hx + 20, hy - 8], [hx + 12, hy - 14], [hx - 2, hy - 12], [hx - 14, hy - 10]], HAIR, 5, [0, -0.1]); });
  for (const dx of [-12, -4, 4, 12]) v.fold(hx + dx, hy - 29, hx + dx + 0.5, hy - 24, hx + dx, hy - 14, 1, 0.45);
  const SB = v.mat('#7a4a2a', 'hair'); v.poly([[hx - 19, hy - 4], [hx - 14, hy - 4], [hx - 13, hy + 8], [hx - 18, hy + 6]], SB, 2);
  const SG = v.mat('#16121e', 'plastic'); v.poly([[hx - 4, hy - 4], [hx + 21, hy - 5], [hx + 20, hy + 5], [hx + 12, hy + 6], [hx + 9, hy + 2], [hx + 6, hy + 6], [hx - 3, hy + 5]], SG, 3); v.cap(hx - 17, hy - 2, hx - 4, hy - 2, 1.2, 1.2, SG);
  const RF = e >= 2 ? '#ff3ec8' : orange; v.dline(hx, hy - 2, hx + 4, hy - 2, RF); v.dline(hx + 1, hy, hx + 2, hy, RF); v.dline(hx + 12, hy - 2, hx + 16, hy - 3, RF);
  if (e >= 2) { const CR = v.mat(gold, 'metal'); v.part(() => { v.poly([[hx - 16, hy - 30], [hx + 16, hy - 32], [hx + 16, hy - 27], [hx - 16, hy - 26]], CR, 2); for (const dx of [-12, 0, 12]) v.poly([[hx + dx - 4, hy - 28], [hx + dx, hy - 40], [hx + dx + 4, hy - 29]], CR, 2); }); v.ell(hx, hy - 31, 1.5, 1.5, v.mat('#ff3ec8', 'emit')); }
  const fa = (o.walk ?? -1) >= 0 ? [0, 2, 0, -2][o.walk!] : 0;
  arm(v, s.shF, [84, 72 + s.b + fa], [88, 80 + s.b + fa], PJ, SK, 9);
  // speaker shield
  const big = e >= 1 ? 3 : 0; const x = 80 - big, y = 46 + s.b + fa - big, w = 38 + big * 2, h = 62 + big * 2;
  const RM = v.mat(gold, 'metal'), CAB = v.mat('#2a2238', 'plastic'), SUR = v.mat('#18141e', 'rubber'), CONE = v.mat('#3a3050', 'plastic'), DUST = v.mat('#bcb4d4', 'metal'), LED = v.mat(e >= 2 ? '#ff3ec8' : orange, 'emit');
  v.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], RM, 3, [0.15, 0]);
  v.poly([[x + 4, y + 4], [x + w - 4, y + 4], [x + w - 4, y + h - 4], [x + 4, y + h - 4]], CAB, 3);
  for (let yy = y + 6; yy < y + h - 6; yy += 2) for (let xx = x + 6 + ((yy >> 1) % 2); xx < x + w - 6; xx += 2) v.dot(xx, yy, '#3e3454');
  const cx = x + w / 2;
  v.ell(cx, y + 20 + big / 2, 14 + big / 2, 14 + big / 2, SUR); v.ell(cx, y + 20 + big / 2, 10.5, 10.5, CONE, [0, 0], true); v.ell(cx, y + 20 + big / 2, 4, 4, DUST); v.ell(cx, y + 20 + big / 2, 1.5, 1.5, LED);
  v.ell(cx, y + h - 17, 10, 10, SUR); v.ell(cx, y + h - 17, 7, 7, CONE, [0, 0], true); v.ell(cx, y + h - 17, 2.5, 2.5, DUST);
  v.cap(x + 8, y + h - 6, x + w - 8, y + h - 6, 0.6, 0.6, LED);
  for (const [bx, by] of [[x + 2, y + 2], [x + w - 3, y + 2], [x + 2, y + h - 3], [x + w - 3, y + h - 3]]) v.dot(bx, by, '#fff4c0');
}

const RIM: Record<string, string[]> = { bass: ['#ff5ad0', '#ff3ec8', '#e070ff'], flow: ['#5aeaff', '#3ae8ff', '#c8f8ff'], tempo: ['#c8ff5a', '#b8ff3a', '#3affd8'], wall: ['#ffaa4a', '#ff9a2a', '#ff5ad0'] };
const AURAS: Record<string, string[]> = { bass: ['', '#ff3ec8', '#d070ff'], flow: ['', '#3ae8ff', '#b8f6ff'], tempo: ['', '#b8ff3a', '#e8ff9a'], wall: ['', '#ff9a2a', '#ffcf3a'] };
const FN: Record<string, (v: Vol, o: Pose) => void> = { bass, flow, tempo, wall };
const def = (id: string): SpriteDef => ({
  w: HW, h: HH, res: 2, draw: () => {}, aura: o => AURAS[id][o.evo ?? 0] || null,
  render: (o, flash) => { const v = new Vol(HW, HH); FN[id](v, o); return v.render({ rim: RIM[id][o.evo ?? 0], flash }); },
});
export const HERO_SPRITES: Record<string, SpriteDef> = { bass: def('bass'), flow: def('flow'), tempo: def('tempo'), wall: def('wall') };
