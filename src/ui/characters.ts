// Every character is drawn procedurally with the Pix rasterizer. One function per hero/enemy.
import { Pix } from './pix';
export interface Pose { f: number; walk?: number; evo?: number; phase?: number; expr?: 'neutral' | 'shout' | 'hurt' }
type Draw = (p: Pix, o: Pose) => void;
export interface SpriteDef { w: number; h: number; draw: Draw; aura?: (o: Pose) => string | null; res?: number; render?: (o: Pose, flash: boolean) => HTMLCanvasElement }

const BOB = [0, 0, 1, 1];
const SKIN = "#f6c9a0";
function eyes(p: Pix, x: number, y: number, gap: number, col = '#2a1b2e', h = 3, w = 2) {
  const E = p.flat(col), W = p.flat('#ffffff');
  for (const ex of [x, x + gap]) { p.rect(ex, y, w, h, E); p.px(ex, y, W); }
}
function blush(p: Pix, x: number, y: number, gap: number) { const B = p.flat('#f08a8a'); p.rect(x, y, 2, 1, B); p.rect(x + gap, y, 2, 1, B); }

const NEON = (p: Pix, c: string) => p.mat(c, { glow: true });
export { HERO_SPRITES } from './heroart';

// ---------------------------------------------------------------- ENEMIES (face left)
const E: Record<string, SpriteDef> = {};
const def = (id: string, w: number, h: number, draw: Draw, aura?: (o: Pose) => string | null) => { E[id] = { w, h, draw, aura }; };
const DSKIN = '#a8a0c8';
/** The Drained: grey-lavender zombie ravers, shambling with arms forward. 44x52 canvas. */
interface DrCfg { top: string; trim?: string; pants: string; shoes?: string; skin?: string; hair?: string; eye?: string }
function drained(p: Pix, o: Pose, c: DrCfg, parts: { back?: (b: number) => void; head?: (b: number) => void; hand?: (b: number, a: number) => void; front?: (b: number) => void } = {}) {
  const b = BOB[o.f % 4]; const sw = [0, 1, 0, -1][o.f % 4];
  const S = p.mat(c.skin ?? DSKIN), T = p.mat(c.top), PA = p.mat(c.pants), SH = p.mat(c.shoes ?? '#3a3448');
  parts.back?.(b);
  p.rect(17, 41, 4, 6, PA); p.rect(24, 41, 4, 6, PA); p.rect(15, 46, 6, 3, SH); p.rect(23, 46, 6, 3, SH);
  p.poly([[14, 30 + b], [29, 30 + b], [30, 42], [13, 42]], T);
  if (c.trim) { const TR = p.mat(c.trim); p.rect(13, 40, 18, 2, TR); }
  p.ell(29, 34 + b, 2.5, 3.5, T);
  // head (slouched forward)
  p.ell(21, 19 + b, 11, 10, S);
  if (c.hair) { const H = p.mat(c.hair); p.ell(23, 12 + b, 10, 5, H); p.rect(28, 12 + b, 4, 9, H); }
  // hollow glowing eyes, droopy lids, open mouth
  const K = p.flat('#2a2040'), G = p.flat(c.eye ?? '#c8ff6a');
  p.rect(12, 18 + b, 3, 4, K); p.rect(19, 18 + b, 3, 4, K); p.px(13, 20 + b, G); p.px(20, 20 + b, G);
  p.rect(12, 17 + b, 3, 1, p.flat('#8a80a8')); p.rect(19, 17 + b, 3, 1, p.flat('#8a80a8'));
  p.ell(16, 25 + b, 1.5, 1.5 + (o.f % 2) * 0.5, K);
  parts.head?.(b);
  // reaching arms
  p.ell(9 + sw * 0.5, 33 + b, 4, 2.5, T); p.ell(5 + sw * 0.5, 33 + b, 2, 2, S);
  parts.hand?.(b, sw);
  parts.front?.(b);
}
// 0 Parking Lot
def('glitter_gloop', 44, 40, (p, o) => {
  const b = BOB[o.f]; const SL = p.mat('#b86aff');
  p.ell(22, 26 + b * 0.5, 17 + b, 12 - b, SL); p.poly([[18, 16 + b], [22, 6 + b], [26, 16 + b]], SL);
  const GS = p.mat('#7a7a8a'); p.line(25, 12 + b, 30, 2 + b, GS, 2);
  const F = ['#ffffff', '#ff9ae8', '#6affff', '#ffe03a'];
  for (let i = 0; i < 14; i++) { const x = 8 + ((i * 7 + o.f * 3) % 28), y = 18 + ((i * 5) % 14); p.px(x, y + b, p.flat(F[(i + o.f) % 4])); }
  eyes(p, 14, 25 + b, 9, '#2a1048', 4); p.rect(18, 31 + b, 4, 1, p.flat('#2a1048'));
});
def('tailgate_drained', 44, 52, (p, o) => drained(p, o, { top: '#4a5a8a', pants: '#3a3a5a', hair: '#5a4a3a' }, {
  head: b => { const C = p.mat('#ff3a8a'); p.ell(23, 11 + b, 11, 5, C); p.rect(30, 11 + b, 6, 2, C); },
  hand: (b, a) => { const W = p.mat('#e8e8f0'), R = p.mat('#ff3a3a'); p.rect(-1 + a, 34 + b, 10, 9, W); p.rect(-1 + a, 34 + b, 10, 3, R); p.rect(2 + a, 32 + b, 4, 2, p.mat('#8a8a9a')); },
}));
// 1 Entry Gates
def('wristband_wraith', 40, 46, (p, o) => {
  const fl = [0, -1, -2, -1][o.f]; const B = p.mat('#3affd8'), D = p.mat('#1a8a8a'), CH = p.mat('#e0e8f0');
  p.ell(20, 18 + fl, 11, 11, B); p.poly([[9, 20 + fl], [31, 20 + fl], [28 + (o.f % 2) * 2, 42 + fl], [22, 36 + fl], [16, 44 + fl], [12, 34 + fl]], B);
  p.ell(20, 18 + fl, 6, 6, D); p.ell(20, 18 + fl, 6, 6, 0);
  eyes(p, 13, 26 + fl, 8, '#0a3a3a', 3);
  p.rect(14, 33 + fl, 10, 4, CH); for (let x = 15; x < 24; x += 2) p.rect(x, 34 + fl, 1, 2, p.flat('#1a1a2a'));
  const SP = p.flat('#e0fff8'); p.px(4, 30 - fl, SP); p.px(35, 12 + fl, SP);
});
def('gate_drone', 52, 44, (p, o) => {
  const b = BOB[o.f]; const BD = p.mat('#4a4a68'), AR = p.mat('#2a2a3a'), RT = p.mat('#c8c8d8'), EY = p.flat('#ff3a6a'), SR = NEON(p, o.f % 2 ? '#ff3a6a' : '#3a6aff');
  for (const x of [8, 44]) { p.line(x, 14 + b, 26, 22 + b, AR, 2); const w = o.f % 2 ? 7 : 3; p.rect(x - w, 12 + b, w * 2, 2, RT); }
  p.ell(26, 24 + b, 13, 8, BD); p.ell(18, 26 + b, 5, 5, AR); p.ell(18, 26 + b, 3, 3, p.flat('#1a1028')); p.px(17, 25 + b, EY); p.px(18, 26 + b, EY);
  p.rect(23, 14 + b, 6, 3, SR); p.line(20, 32 + b, 16, 40, AR); p.line(32, 32 + b, 36, 40, AR);
});
// 2 Forest Stage
def('flower_crown_drained', 44, 52, (p, o) => drained(p, o, { top: '#e8d8f0', trim: '#ff8ac8', pants: '#6a5a8a', hair: '#c8a07a' }, {
  back: b => { const W = p.mat('#c8f0ff'); const f = o.f % 2; p.poly([[26, 28 + b], [40, 16 + b - f], [38, 30 + b]], W); p.poly([[26, 32 + b], [40, 38 + b + f], [32, 40 + b]], W); },
  head: b => { const cols = ['#ff8ac8', '#ffe03a', '#ffffff', '#b8ff6a', '#ff8ac8', '#6affff']; cols.forEach((c, i) => { p.ell(13 + i * 3.4, 9 + b + (i % 2), 1.6, 1.6, p.mat(c)); }); },
}));
def('moss_bouncer', 52, 54, (p, o) => {
  const b = BOB[o.f]; const BD = p.mat('#2a3a3a'), MO = p.mat('#4a8a4a'), SK = p.mat('#8a9a8a'), SG = p.mat('#1a1a2a'), L = NEON(p, '#b8ff6a');
  p.rect(16, 44, 8, 8, BD); p.rect(30, 44, 8, 8, BD);
  p.ell(27, 34 + b * 0.5, 17, 13, BD); p.ell(18, 26 + b, 7, 4, MO); p.ell(36, 30 + b, 5, 3, MO);
  p.rect(12, 32 + b, 30, 6, BD); p.rect(12, 33 + b, 30, 4, SK); // crossed arms
  p.ell(25, 17 + b, 11, 10, SK); p.ell(30, 9 + b, 8, 4, MO);
  p.rect(14, 15 + b, 16, 4, SG); p.px(16, 15 + b, p.flat('#ffffff'));
  p.rect(17, 23 + b, 6, 1, p.flat('#3a3a3a'));
  p.rect(34, 16 + b, 2, 6, p.flat('#1a1a1a')); p.px(35, 22 + b, L);
  for (const [x, y] of [[8, 40], [44, 38], [22, 48]]) p.px(x, y, L);
});
// 3 Silent Disco
def('static_shusher', 44, 46, (p, o) => {
  const fl = [0, -1, -2, -1][o.f]; const B = p.mat('#ff4a8a'), D = p.mat('#8a2a5a');
  p.ell(21, 20 + fl, 12, 12, B); p.poly([[10, 24 + fl], [32, 24 + fl], [26, 42 + fl], [21, 36 + fl], [16, 42 + fl]], B);
  for (let i = 0; i < 22; i++) { const x = 11 + ((i * 11 + o.f * 7) % 22), y = 10 + ((i * 7 + o.f * 5) % 26); p.px(x, y + fl, p.flat(i % 3 ? '#ffd0e8' : '#3a1028')); }
  eyes(p, 14, 18 + fl, 8, '#2a0a18', 3);
  p.rect(16, 25 + fl, 4, 1, p.flat('#2a0a18')); p.rect(17, 21 + fl, 2, 7, p.mat('#ffd0e8')); // finger to lips
  p.ell(6, 30 + fl, 3, 3, D);
});
def('headphone_ghoul', 44, 52, (p, o) => drained(p, o, { top: '#2a2a3a', trim: '#ff3a3a', pants: '#1a1a2a', hair: '#3a2a3a', eye: '#ff6a6a' }, {
  head: b => { const BAND = p.mat('#3a3a4a'), CUP = p.mat('#4a4a5a'), LED = NEON(p, o.f % 2 ? '#ff3a3a' : '#ff8a3a'); p.curve(12, 13 + b, 21, 2 + b, 31, 13 + b, BAND, 3); p.ell(29, 19 + b, 4, 5, CUP); p.ell(29, 19 + b, 2, 3, LED); },
}));
// 4 Bass Tent
def('fog_phantom', 40, 46, (p, o) => {
  const fl = [0, -1, -2, -1][o.f]; const F = p.mat('#c8d0f0'), F2 = p.mat('#e8ecff');
  for (const [x, y, r] of [[20, 14, 9], [12, 22, 7], [28, 22, 7], [20, 28, 9], [10, 34, 5], [30, 34, 5], [20, 38, 6]] as number[][]) p.ell(x + (o.f % 2) * (x < 20 ? -1 : 1), y + fl, r, r * 0.85, F);
  p.ell(18, 12 + fl, 4, 3, F2);
  eyes(p, 14, 21 + fl, 8, '#3a3a6a', 4); p.ell(19, 30 + fl, 2, 1.5, p.flat('#3a3a6a'));
});
def('subwoofer_stack', 54, 54, (p, o) => {
  const b = BOB[o.f]; const CB = p.mat('#2a2a3a'), CN = p.mat('#4a4a5a'), DC = p.mat('#1a1a24'), L = NEON(p, '#3ae8ff');
  const pump = o.f % 2;
  p.rect(18, 48, 6, 4, CB); p.rect(32, 48, 6, 4, CB);
  p.rect(10, 28 + b, 34, 21, CB); p.ell(27, 38 + b, 8 + pump, 8 + pump, CN); p.ell(27, 38 + b, 4, 4, DC);
  p.rect(13, 6 + b, 28, 22, CB); p.ell(27, 17 + b, 7, 7, CN); p.ell(27, 17 + b, 3, 3, DC);
  p.rect(10, 28 + b, 34, 1, L); p.rect(13, 6 + b, 28, 1, L);
  p.rect(17, 10 + b, 3, 2, p.flat('#3ae8ff')); p.rect(33, 10 + b, 3, 2, p.flat('#3ae8ff'));
  p.ell(6, 34 + b, 4, 7, CB); p.ell(48, 34 + b, 4, 7, CB);
});
// 5 Ferris Wheel
def('balloon_drained', 44, 56, (p, o) => {
  const b = BOB[o.f];
  p.line(5, 37 + b, 9 - (o.f % 2), 14, p.flat('#e8e8f0'));
  const BL = p.mat('#ff4a5a'); p.ell(10 - (o.f % 2), 7, 6, 6, BL); p.poly([[8, 12], [12, 12], [10, 14]], BL); p.px(8, 4, p.flat('#ffd0d8'));
  // body drawn offset down by 4
  const shiftY = 4; const S = p.mat(DSKIN), T = p.mat('#ffcf3a'), PA = p.mat('#5a4a7a'); const sw = [0, 1, 0, -1][o.f];
  p.rect(17, 41 + shiftY, 4, 6, PA); p.rect(24, 41 + shiftY, 4, 6, PA); p.rect(15, 46 + shiftY, 6, 3, p.mat('#3a3448')); p.rect(23, 46 + shiftY, 6, 3, p.mat('#3a3448'));
  p.poly([[14, 30 + b + shiftY], [29, 30 + b + shiftY], [30, 42 + shiftY], [13, 42 + shiftY]], T); p.rect(15, 34 + b + shiftY, 13, 2, p.flat('#ff4a5a'));
  p.ell(21, 19 + b + shiftY, 11, 10, S); const H = p.mat('#2a2a4a'); p.ell(23, 12 + b + shiftY, 10, 5, H);
  const K = p.flat('#2a2040'), G = p.flat('#c8ff6a'); p.rect(12, 18 + b + shiftY, 3, 4, K); p.rect(19, 18 + b + shiftY, 3, 4, K); p.px(13, 20 + b + shiftY, G); p.px(20, 20 + b + shiftY, G); p.ell(16, 25 + b + shiftY, 1.5, 1.5, K);
  p.ell(9 + sw * 0.5, 37 + b, 4, 2.5, T); p.ell(5, 37 + b, 2, 2, S);
});
def('neon_moth', 50, 50, (p, o) => {
  const b = BOB[o.f]; const w = o.f % 2; const WG = p.mat('#8a3aff'), WG2 = p.mat('#c86aff'), SP = NEON(p, '#3affd8'), BD = p.mat('#e8d8c0'), FZ = p.mat('#c8b8a0');
  p.poly([[24, 22 + b], [46, 4 + b + w * 4], [48, 20 + b], [40, 30 + b]], WG); p.poly([[24, 26 + b], [44, 34 + b + w * 2], [36, 44 + b]], WG2);
  p.ell(40, 16 + b + w * 2, 3, 3, SP); p.ell(38, 36 + b + w, 2, 2, SP);
  p.ell(22, 30 + b, 6, 9, BD); for (const y of [26, 30, 34]) p.rect(17, y + b, 10, 1, p.flat('#a89880'));
  p.ell(16, 18 + b, 7, 6, FZ);
  p.curve(13, 12 + b, 8, 4 + b, 3, 6 + b, p.flat('#3a3a3a'), 1); p.curve(17, 12 + b, 14, 3 + b, 10, 2 + b, p.flat('#3a3a3a'), 1);
  p.ell(12, 18 + b, 2.5, 2.5, p.flat('#1a1a2a')); p.px(11, 17 + b, p.flat('#3affd8'));
});
// 6 Main Stage 3AM
def('barricade_drained', 48, 56, (p, o) => drained(p, o, { top: '#5a5a7a', pants: '#2a2a3a', hair: '#1a1a2a', eye: '#ffcf3a' }, {
  front: b => { const Y = p.mat('#ffcf3a'), K = p.mat('#2a2a2a'); p.rect(0, 36 + b, 26, 14, Y); for (let x = 0; x < 26; x += 6) p.poly([[x, 36 + b], [x + 3, 36 + b], [x + 6, 50 + b], [x + 3, 50 + b]], K); p.rect(0, 35 + b, 26, 1, p.mat('#8a8a9a')); },
}));
def('camera_drone', 54, 50, (p, o) => {
  const b = BOB[o.f]; const BD = p.mat('#2a2a3a'), AR = p.mat('#1a1a24'), RT = p.mat('#c8c8d8'), LN = p.mat('#4a4a6a'), REC = NEON(p, o.f % 2 ? '#ff3a3a' : '#5a1a1a');
  for (const x of [6, 48]) { p.line(x, 10 + b, 27, 18 + b, AR, 2); const w = o.f % 2 ? 8 : 3; p.rect(x - w, 8 + b, w * 2, 2, RT); }
  p.rect(14, 16 + b, 26, 10, BD); p.rect(24, 26 + b, 4, 4, AR);
  p.rect(16, 30 + b, 18, 12, BD); p.ell(18, 36 + b, 5, 5, LN); p.ell(18, 36 + b, 3, 3, p.flat('#0a0a14')); p.px(17, 35 + b, p.flat('#8affff'));
  p.ell(36, 19 + b, 2, 2, REC);
});
// Elites (64)
def('elite_security', 64, 64, (p, o) => {
  const b = BOB[o.f]; const SK = p.mat('#c89a7a'), TE = p.mat('#1a1a24'), VE = p.mat('#ffd23a'), ST = p.flat('#e8e8f0'), SG = p.mat('#101018');
  p.rect(20, 52, 9, 10, TE); p.rect(36, 52, 9, 10, TE);
  p.ell(33, 40 + b * 0.5, 19, 15, TE); p.poly([[17, 28 + b], [49, 28 + b], [51, 56], [15, 56]], VE); p.rect(26, 28 + b, 14, 28, TE);
  p.rect(16, 42, 10, 2, ST); p.rect(40, 42, 10, 2, ST);
  p.ell(32, 18 + b, 13, 12, SK); p.rect(21, 14 + b, 22, 5, SG); p.px(24, 15 + b, p.flat('#ffffff'));
  p.rect(26, 25 + b, 10, 1, p.flat('#6a4a3a')); p.ell(32, 7 + b, 12, 4, TE);
  p.ell(52, 40 + b, 6, 9, TE); p.ell(52, 48 + b, 4, 4, SK);
  p.ell(12, 40 + b, 6, 9, TE); p.ell(10, 48 + b, 4, 4, SK); p.rect(6, 36 + b, 5, 9, p.mat('#2a2a2a')); p.px(8, 35 + b, p.flat('#ff3a3a'));
});
def('elite_porta', 60, 66, (p, o) => {
  const b = BOB[o.f]; const BL = p.mat('#3a7aff'), DK = p.mat('#2a4ab0'), RF = p.mat('#e8f0ff'), TE = p.flat('#ffffff'), TG = p.mat('#ff6a8a');
  p.rect(10, 12 + b, 40, 52 - b, BL); p.poly([[8, 12 + b], [52, 12 + b], [48, 4 + b], [12, 4 + b]], RF);
  const open = o.f % 2 ? 4 : 2;
  p.rect(16, 18 + b, 26, 44 - b, DK);
  p.rect(18, 36 + b, 22, open * 2, p.flat('#1a0a14'));
  for (let x = 18; x < 40; x += 4) { p.poly([[x, 36 + b], [x + 2, 39 + b], [x + 4, 36 + b]], TE); p.poly([[x, 36 + b + open * 2], [x + 2, 33 + b + open * 2], [x + 4, 36 + b + open * 2]], TE); }
  p.ell(26, 38 + b + open * 2, 4, 2, TG);
  // crescent moon cutout = eye
  p.ell(28, 24 + b, 5, 5, p.flat('#ffe03a')); p.ell(30, 23 + b, 4, 4, DK);
  p.rect(38, 30 + b, 2, 6, p.mat('#c8c8d8'));
  p.rect(12, 2 + b, 4, 3, p.flat('#ff3a3a')); p.rect(44, 2 + b, 4, 3, p.flat('#3aff6a'));
});
def('elite_pyro', 64, 66, (p, o) => {
  const b = BOB[o.f]; const SU = p.mat('#c8b8a0'), DK = p.mat('#4a4048'), HM = p.mat('#e8e8f0'), VI = p.mat('#ff9a2a'), CN = p.mat('#3a3a44'), F = NEON(p, '#ffb02a'), F2 = NEON(p, '#ff4a2a');
  p.rect(24, 52, 7, 10, DK); p.rect(36, 52, 7, 10, DK);
  p.poly([[20, 30 + b], [46, 30 + b], [48, 54], [18, 54]], SU); p.rect(18, 46, 30, 3, p.flat('#ffcf3a'));
  p.ell(33, 18 + b, 11, 12, HM); p.rect(23, 15 + b, 20, 7, VI); p.px(25, 16 + b, p.flat('#ffffff'));
  // shoulder flame cannon
  p.rect(38, 22 + b, 18, 7, CN); p.rect(54, 21 + b, 4, 9, DK);
  const fh = o.f % 2 ? 14 : 10; p.poly([[54, 21 + b], [58, 21 + b - fh], [62, 21 + b]], F); p.poly([[56, 21 + b], [58, 23 + b - fh * 0.6], [60, 21 + b]], F2);
  p.ell(18, 38 + b, 5, 7, SU); p.rect(8, 34 + b, 10, 6, CN); p.ell(8, 37 + b, 3, 3, F2);
});
def('elite_tube', 60, 66, (p, o) => {
  const f = o.f; const TB = p.mat('#ff3a8a'), TB2 = p.mat('#ff6aaa'), BL = p.mat('#3a3a4a'), FC = p.mat('#ffe03a');
  p.rect(18, 54, 24, 10, BL); p.rect(22, 50, 16, 5, p.mat('#5a5a6a'));
  const sway = [0, 3, 0, -3][f];
  for (let y = 12; y < 52; y++) { const x = 30 + Math.sin(y / 7 + f) * 3 + sway * (1 - (y - 12) / 40); p.rect(Math.round(x - 6), y, 12, 1, y % 8 < 4 ? TB : TB2); }
  const ax = [[-14, -8], [-12, 6], [-14, -12], [-10, 10]][f], ay = [[-6, 10], [8, -8], [-10, 6], [6, -6]][f];
  p.curve(26 + sway, 24, 16 + sway, 22 + ay[0], 10 + ax[0] + 14, 14 + ay[0], TB, 4); p.curve(34 + sway, 24, 46 + sway, 22 + ay[1], 50 + ax[1], 14 + ay[1], TB, 4);
  p.ell(30 + sway, 12, 8, 8, FC); eyes(p, 25 + sway, 9, 7, '#2a1018', 4); p.ell(30 + sway, 16, 3, 2, p.flat('#2a1018'));
  for (let x = 23; x < 38; x += 3) p.rect(x + sway, 3, 2, 3, TB);
});
// DJ Bosses (72-92) with phase-2 looks
def('boss_megaphone', 80, 88, (p, o) => {
  const b = BOB[o.f]; const ph = (o.phase ?? 1) >= 2;
  const S = p.mat('#e8b890'), JK = p.mat(ph ? '#ff1aa8' : '#ff3ac8'), TR = p.mat('#ffe03a'), PA = p.mat('#2a2238'), CP = p.mat('#1a1a2a'), MG = p.mat('#e8e8f0'), GC = p.mat('#ffd23a');
  p.rect(28, 72, 10, 14, PA); p.rect(44, 72, 10, 14, PA); p.rect(26, 82, 13, 5, p.mat('#ffffff')); p.rect(43, 82, 13, 5, p.mat('#ffffff'));
  p.poly([[22, 42 + b], [60, 42 + b], [62, 74], [20, 74]], JK); p.rect(39, 44 + b, 4, 30, TR);
  p.curve(30, 44 + b, 41, 58 + b, 52, 44 + b, GC, 3); p.ell(41, 58 + b, 4, 4, GC);
  p.ell(42, 26 + b, 15, 14, S); p.ell(44, 15 + b, 16, 6, CP); p.rect(20, 13 + b, 14, 4, CP);
  if (ph) { const SG = p.mat('#1a1a2a'); p.rect(28, 22 + b, 26, 6, SG); p.rect(32, 23 + b, 5, 1, p.flat('#ff3ac8')); p.rect(44, 23 + b, 5, 1, p.flat('#ff3ac8')); }
  else eyes(p, 33, 22 + b, 11, '#1a1028', 4);
  p.ell(38, 34 + b, 5, 3, p.flat('#5a1a2a')); p.rect(35, 33 + b, 6, 1, p.flat('#ffffff'));
  // megaphone in front hand (pointing left)
  p.ell(20, 50 + b, 5, 6, JK); p.poly([[18, 44 + b], [4, 34 + b], [4, 58 + b], [18, 52 + b]], MG); p.ell(4, 46 + b, 3, 12, p.mat('#c8c8d8'));
  p.rect(14, 46 + b, 6, 4, p.mat('#ff3a3a'));
  if (ph) { const L = NEON(p, '#ffe03a'); for (const [x, y] of [[66, 14], [70, 34], [10, 14], [62, 4]]) { p.poly([[x, y + b], [x + 4, y + 6 + b], [x + 1, y + 6 + b], [x + 5, y + 13 + b], [x - 1, y + 5 + b], [x + 2, y + 5 + b]], L); } }
  if (o.f % 2) { const N = p.flat('#ffffff'); p.rect(0, 30 + b, 2, 1, N); p.rect(0, 46 + b, 3, 1, N); p.rect(0, 62 + b, 2, 1, N); }
}, o => (o.phase ?? 1) >= 2 ? '#ffe03a' : null);
def('boss_mxrror', 80, 88, (p, o) => {
  const b = BOB[o.f]; const ph = (o.phase ?? 1) >= 2;
  const CH = p.mat('#c8d0e8'), CH2 = p.mat('#8a92b0'), JK = p.mat('#e8ecf8'), PA = p.mat('#3a3a50'), DK = p.mat('#2a2a3a'), VS = p.mat('#1a1a2a'), R = NEON(p, '#ffffff');
  p.rect(30, 70, 9, 16, PA); p.rect(43, 70, 9, 16, PA);
  p.poly([[24, 40 + b], [58, 40 + b], [60, 72], [22, 72]], JK); p.rect(39, 42 + b, 4, 30, CH2);
  p.ell(41, 22 + b, 16, 16, CH); p.ell(38, 24 + b, 12, 9, VS);
  for (let i = 0; i < 4; i++) p.line(30 + i * 3, 30 + b, 36 + i * 3, 17 + b, i % 2 ? R : p.flat('#6a7aa8'));
  if (ph) { const K = p.flat('#ffffff'); p.line(34, 16 + b, 40, 26 + b, K); p.line(40, 26 + b, 46, 22 + b, K); p.line(40, 26 + b, 38, 32 + b, K);
    const SH = NEON(p, '#c8f0ff'); for (const [x, y] of [[8, 20], [70, 16], [66, 52], [12, 58], [40, 2]]) { const t = (o.f % 2) * 2; p.poly([[x, y - 4 + t + b], [x + 3, y + t + b], [x, y + 5 + t + b], [x - 2, y + t + b]], SH); } }
  // DJ deck in front
  p.rect(4, 56, 44, 14, DK); p.rect(4, 56, 44, 2, CH2); p.ell(15, 62, 6, 3, CH); p.ell(37, 62, 6, 3, CH); p.px(15 + (o.f % 2 ? 2 : -2), 62, p.flat('#ff3ac8')); p.px(37 + (o.f % 2 ? -2 : 2), 62, p.flat('#3ae8ff'));
  p.rect(24, 60, 4, 6, p.mat('#5a5a7a'));
}, o => (o.phase ?? 1) >= 2 ? '#c8f0ff' : null);
def('boss_kaleido', 80, 88, (p, o) => {
  const b = BOB[o.f]; const ph = (o.phase ?? 1) >= 2;
  const RB = p.mat('#2a1a4a'), RB2 = p.mat('#4a2a7a'), S = p.mat('#e8c8b8');
  const fac = ['#ff6ae8', '#6affff', '#ffe03a', '#8aff6a', '#ff6a6a', '#8a6aff'];
  const prism = (cx: number, cy: number, r: number, rot: number) => { for (let i = 0; i < 6; i++) { const a0 = rot + (i / 6) * Math.PI * 2, a1 = rot + ((i + 1) / 6) * Math.PI * 2; p.poly([[cx, cy], [cx + Math.cos(a0) * r, cy + Math.sin(a0) * r], [cx + Math.cos(a1) * r, cy + Math.sin(a1) * r]], p.mat(fac[i], { glow: i % 2 === 0 })); } };
  if (ph) { prism(12, 22 + b, 8, o.f * 0.5 + 1); prism(68, 26 + b, 8, -o.f * 0.5); }
  p.poly([[24, 42 + b], [58, 42 + b], [70, 86], [12, 86]], RB); p.poly([[32, 42 + b], [50, 42 + b], [56, 86], [26, 86]], RB2);
  for (let i = 0; i < 6; i++) p.px(20 + i * 8, 80 - (i % 2) * 4, p.flat(fac[i]));
  p.rect(36, 34 + b, 10, 8, S);
  prism(41, 20 + b, 16, o.f * 0.26);
  p.ell(41, 20 + b, 5, 5, p.mat('#ffffff')); p.ell(41, 20 + b, 2.5, 2.5, p.flat('#1a1028')); p.px(40, 19 + b, p.flat('#ffffff'));
  p.ell(20, 52 + b, 4, 6, RB); p.ell(16, 58 + b, 3, 3, S);
}, o => (o.phase ?? 1) >= 2 ? '#ff6ae8' : '#6a3aaa');
def('boss_nullpointer', 84, 88, (p, o) => {
  const b = BOB[o.f]; const ph = (o.phase ?? 1) >= 2;
  const HD = p.mat('#2a2a3a'), HD2 = p.mat('#3a3a4e'), CRT = p.mat('#c8c0a8'), SC = p.mat(ph ? '#3a0a0a' : '#0a2a14'), TX = p.flat(ph ? '#ff4a4a' : '#3aff8a'), LT = p.mat('#8a8aa0');
  p.rect(30, 70, 10, 16, HD); p.rect(46, 70, 10, 16, HD);
  p.poly([[22, 44 + b], [62, 44 + b], [64, 72], [20, 72]], HD2); p.poly([[30, 44 + b], [54, 44 + b], [50, 52 + b], [34, 52 + b]], HD);
  p.rect(22, 8 + b, 40, 34, CRT); p.rect(26, 12 + b, 32, 24, SC); p.rect(36, 42 + b, 12, 3, CRT);
  if (ph) { p.rect(30, 18 + b, 3, 3, TX); p.rect(45, 18 + b, 3, 3, TX); p.line(29, 29 + b, 33, 26 + b, TX); p.line(33, 26 + b, 37, 29 + b, TX); p.line(37, 29 + b, 41, 26 + b, TX); p.line(41, 26 + b, 45, 29 + b, TX); p.line(45, 29 + b, 49, 26 + b, TX); }
  else { p.rect(30, 18 + b, 1, 5, TX); p.rect(31, 22 + b, 3, 1, TX); p.rect(44, 18 + b, 4, 1, TX); p.rect(44, 22 + b, 4, 1, TX); p.rect(34, 28 + b, 12, 1, TX); if (o.f % 2) p.rect(48, 28 + b, 2, 1, TX); }
  for (let y = 12; y < 36; y += 2) p.rect(26, y + b, 32, 1, p.flat(ph ? '#2a0606' : '#06200e'));
  p.rect(4, 58, 32, 3, LT); p.poly([[8, 58], [32, 58], [28, 44], [12, 44]], p.mat('#5a5a70')); p.ell(20, 51, 3, 3, p.flat('#e8e8f0'));
  if (ph) { const G1 = p.flat('#3aff8a'), G2 = p.flat('#ff3ac8'); const off = o.f * 7; for (let i = 0; i < 6; i++) { const y = (off + i * 13) % 80; p.rect(i % 2 ? 0 : 68, y, 10 + (i % 3) * 4, 2, i % 2 ? G1 : G2); } }
}, o => (o.phase ?? 1) >= 2 ? '#ff4a4a' : '#1a8a4a');
def('boss_baron', 84, 88, (p, o) => {
  const b = BOB[o.f]; const ph = (o.phase ?? 1) >= 2;
  const CP = p.mat(ph ? '#7a1a9a' : '#5a1a6a'), CPI = p.mat('#c8202a'), S = p.mat('#e8c8b8'), TH = p.mat('#1a1424'), GD = p.mat('#ffcf3a'), SP = p.mat('#2a2238'), CN = p.mat('#4a3a5a'), L = NEON(p, '#3ae8ff');
  const spread = ph ? 10 : 0;
  p.poly([[26, 36 + b], [58, 36 + b], [76 + spread, 86], [8 - spread, 86]], CP); p.poly([[30, 40 + b], [54, 40 + b], [62, 86], [22, 86]], CPI);
  p.rect(30, 42 + b, 24, 34, SP); p.ell(42, 52 + b, 7, 7, CN); p.ell(42, 52 + b, 3, 3, L); p.ell(42, 68 + b, 5, 5, CN); p.ell(42, 68 + b, 2, 2, L);
  if (ph) for (const x of [12, 70]) { p.ell(x, 66, 6, 6, SP); p.ell(x, 66, 4, 4, CN); p.ell(x, 66, 1.5, 1.5, L); }
  p.ell(42, 26 + b, 12, 11, S); p.rect(30, 4 + b, 24, 14, TH); p.rect(24, 16 + b, 36, 3, TH); p.rect(30, 13 + b, 24, 2, GD);
  eyes(p, 35, 24 + b, 9, '#1a1028', 3); p.ell(45, 25 + b, 3.5, 3.5, GD); p.ell(45, 25 + b, 2.5, 2.5, p.flat('#c8f0ff')); p.line(48, 27 + b, 50, 36 + b, GD);
  p.curve(34, 31 + b, 38, 34 + b, 42, 31 + b, p.flat('#3a1a2a'), 1); p.curve(42, 31 + b, 46, 34 + b, 50, 31 + b, p.flat('#3a1a2a'), 1);
  if (ph) { for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + o.f * 0.4; p.ell(42 + Math.cos(a) * 34, 50 + Math.sin(a) * 30, 2.5, 2.5, GD); } }
}, o => (o.phase ?? 1) >= 2 ? '#c86aff' : null);
def('boss_ringmaster', 80, 88, (p, o) => {
  const b = BOB[o.f]; const ph = (o.phase ?? 1) >= 2;
  const RD = p.mat(ph ? '#ffe03a' : '#ff3a3a'), YL = p.mat(ph ? '#ff3a3a' : '#ffe03a'), S = p.mat('#e8b890'), TH = p.mat('#1a1424'), WH = p.mat('#ffffff'), CN = p.mat('#2a2238'), WL = p.mat('#8a8aa0');
  // ferris wheel behind
  const rot = o.f * (ph ? 0.5 : 0.15); const cx = 62, cy = 26;
  for (let i = 0; i < 8; i++) { const a = rot + (i / 8) * Math.PI * 2; p.line(cx, cy, cx + Math.cos(a) * 16, cy + Math.sin(a) * 16, WL); p.ell(cx + Math.cos(a) * 16, cy + Math.sin(a) * 16, 2, 2, p.mat(['#ff3ac8', '#3ae8ff', '#ffe03a', '#8aff6a'][i % 4], { glow: ph })); }
  p.line(cx, cy, cx - 8, cy + 30, WL, 2); p.line(cx, cy, cx + 8, cy + 30, WL, 2);
  p.rect(28, 70, 9, 16, CN); p.rect(42, 70, 9, 16, CN);
  p.poly([[22, 40 + b], [56, 40 + b], [62, 76], [16, 76]], RD); for (let x = 24; x < 58; x += 8) p.poly([[x, 40 + b], [x + 4, 40 + b], [x + 6, 76], [x + 2, 76]], YL);
  p.rect(36, 40 + b, 6, 30, WH); p.rect(37, 46 + b, 4, 2, GDot()); 
  p.ell(39, 26 + b, 12, 12, S); p.rect(28, 2 + b, 22, 16, TH); p.rect(22, 16 + b, 34, 3, TH); p.rect(28, 13 + b, 22, 2, RD);
  eyes(p, 32, 24 + b, 9, '#1a1028', 3); p.curve(31, 31 + b, 39, 28 + b, 47, 31 + b, p.flat('#3a1a2a'), 2);
  p.line(10, 86, 16, 36 + b, p.mat('#1a1424'), 2); p.ell(16, 34 + b, 3, 3, p.mat('#ffcf3a'));
  p.ell(18, 50 + b, 4, 6, RD); p.ell(16, 56 + b, 3, 3, WH);
  function GDot() { return p.flat('#ffcf3a'); }
}, o => (o.phase ?? 1) >= 2 ? '#ffe03a' : null);
def('boss_subsonic', 80, 92, (p, o) => {
  const b = BOB[o.f]; const ph = (o.phase ?? 1) >= 2;
  const GW = p.mat('#1a1030'), GW2 = p.mat('#2a1a4a'), S = p.mat('#c89a8a'), HR = p.mat(ph ? '#ff3ac8' : '#6a2a9a'), HP = p.mat('#2a2238'), WV = NEON(p, ph ? '#ffffff' : '#ff3ac8'), MC = p.mat('#c8c8d8');
  if (ph) { const R = NEON(p, '#ff3ac8'); for (let k = 0; k < 2; k++) { const r = 30 + k * 8 + (o.f % 2) * 3; for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2; if (i % 3) p.px(40 + Math.cos(a) * r, 50 + Math.sin(a) * r * 1.1, R); } } }
  p.poly([[16, 26 + b], [62, 26 + b], [66, 60], [12, 60]], HR);
  p.poly([[26, 40 + b], [54, 40 + b], [70, 90], [10, 90]], GW); p.poly([[34, 40 + b], [46, 40 + b], [52, 90], [28, 90]], GW2);
  for (let x = 14; x < 66; x += 2) { const y = 66 + Math.round(Math.sin(x / 3 + o.f) * (ph ? 6 : 3)); p.px(x, y, WV); }
  p.ell(40, 26 + b, 12, 12, S);
  eyes(p, 33, 25 + b, 9, ph ? '#ff3ac8' : '#2a1040', 4); p.rect(37, 33 + b, 6, 2, p.flat('#c8205a'));
  p.curve(26, 22 + b, 40, 4 + b, 54, 22 + b, HP, 4); p.ell(26, 24 + b, 5, 7, HP); p.ell(54, 24 + b, 5, 7, HP); p.ell(26, 24 + b, 2, 4, WV); p.ell(54, 24 + b, 2, 4, WV);
  p.poly([[34, 6 + b], [40, -1 + b + 2], [46, 6 + b]], WV);
  p.ell(22, 48 + b, 4, 6, GW); p.ell(20, 44 + b, 3, 3, S); p.rect(16, 36 + b, 3, 8, MC); p.ell(17, 35 + b, 3, 3, p.mat('#5a5a6a'));
}, o => (o.phase ?? 1) >= 2 ? '#ff3ac8' : '#4a1a7a');
export const ENEMY_SPRITES = E;
