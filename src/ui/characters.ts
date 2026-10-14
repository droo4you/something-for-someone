// Every character is drawn procedurally with the Pix rasterizer. One function per hero/enemy.
import { Pix } from './pix';
export interface Pose { f: number; walk?: number; evo?: number; phase?: number }
type Draw = (p: Pix, o: Pose) => void;
export interface SpriteDef { w: number; h: number; draw: Draw; aura?: (o: Pose) => string | null }

const BOB = [0, 0, 1, 1];
const SKIN = '#f6c9a0';
function eyes(p: Pix, x: number, y: number, gap: number, col = '#2a1b2e', h = 3, w = 2) {
  const E = p.flat(col), W = p.flat('#ffffff');
  for (const ex of [x, x + gap]) { p.rect(ex, y, w, h, E); p.px(ex, y, W); }
}
function blush(p: Pix, x: number, y: number, gap: number) { const B = p.flat('#f08a8a'); p.rect(x, y, 2, 1, B); p.rect(x + gap, y, 2, 1, B); }

// ---------------------------------------------------------------- HEROES (48x52, face right)
interface ChibiCfg { hair: string; body: string; trim: string; pants: string; boots: string; cape?: string; skin?: string; eye?: string }
function chibiBase(p: Pix, o: Pose, c: ChibiCfg, parts: { backHair?: (b: number) => void; fringe?: (b: number) => void; weapon?: (b: number, arm: number) => void; backItem?: (b: number) => void; armor?: (b: number) => void }) {
  const b = BOB[o.f % 4]; const wk = o.walk ?? -1;
  const S = p.mat(c.skin ?? SKIN), BD = p.mat(c.body), TR = p.mat(c.trim), PA = p.mat(c.pants), BO = p.mat(c.boots);
  if (c.cape) { const CP = p.mat(c.cape); const sway = (o.f % 2) + (wk >= 0 ? 2 : 0); p.poly([[17, 28 + b], [27, 28 + b], [24 - sway, 46], [10 - sway, 47], [12, 36]], CP); }
  parts.backItem?.(b);
  parts.backHair?.(b);
  // legs
  const l1 = wk < 0 ? 0 : [0, -2, 0, 2][wk], l2 = -l1;
  p.rect(19 + l1, 40, 4, 6, PA); p.rect(25 + l2, 40, 4, 6, PA);
  p.rect(18 + l1, 45, 6, 3, BO); p.rect(24 + l2, 45, 6, 3, BO);
  // torso
  p.poly([[17, 29 + b], [31, 29 + b], [32, 41], [16, 41]], BD);
  p.rect(16, 39, 17, 2, TR);
  p.rect(23, 30 + b, 2, 9, TR);
  parts.armor?.(b);
  // back arm
  p.ell(16, 33 + b, 2.5, 3.5, BD); p.ell(15, 37 + b, 2, 2, S);
  // head
  p.ell(24, 18 + b, 11.5, 10.5, S);
  p.ell(14, 19 + b, 2, 3, S); // ear
  eyes(p, 25, 17 + b, 6, c.eye ?? '#2a1b2e', 5, 3); blush(p, 23, 23 + b, 10);
  const M = p.flat('#b0574a'); p.rect(29, 25 + b, 2, 1, M);
  parts.fringe?.(b);
  // front arm + weapon
  const arm = wk >= 0 ? [0, 1, 0, -1][wk] : 0;
  p.ell(32, 33 + b + arm, 2.5, 3.5, BD); p.ell(33, 37 + b + arm, 2, 2, S);
  parts.weapon?.(b, arm);
}
const heroAuras: Record<string, string[]> = { ember: ['', '#ff9a3d', '#ffcf4a'], tide: ['', '#6fc3ff', '#b8f0ff'], gale: ['', '#9ef07a', '#e0ffb0'], stone: ['', '#d9b26a', '#f5e0a0'] };

const ember: Draw = (p, o) => {
  const e = o.evo ?? 0;
  const metal = e >= 2 ? '#e8c35a' : '#a9b3c2';
  chibiBase(p, o, { hair: '#d8432f', body: metal, trim: e >= 2 ? '#c0392b' : '#e8692b', pants: '#5a3a2a', boots: '#4a2e22', cape: e >= 1 ? (e >= 2 ? '#b0202a' : '#c0392b') : undefined }, {
    backHair: b => { const H = p.mat('#d8432f'); p.ell(22, 14 + b, 12, 9, H); },
    fringe: b => {
      const H = p.mat('#d8432f');
      p.poly([[12, 14 + b], [16, 2 + b], [20, 9 + b], [24, 0 + b], [28, 8 + b], [33, 3 + b], [35, 14 + b], [30, 12 + b], [26, 15 + b], [20, 12 + b], [15, 17 + b]], H);
      if (e >= 2) { const G = p.mat('#f5c542'); p.poly([[17, 7 + b], [19, 2 + b], [21, 6 + b], [24, 0 + b], [27, 6 + b], [29, 2 + b], [31, 7 + b]], G); p.px(24, 4 + b, p.flat('#e8423f')); }
      else if (e >= 1) { const T = p.mat('#e8692b'); p.rect(14, 10 + b, 20, 2, T); }
    },
    armor: b => { if (e >= 1) { const PA = p.mat(metal); p.ell(17, 30 + b, 4, 3, PA); p.ell(31, 30 + b, 4, 3, PA); } const G = p.flat('#ff9a3d'); p.rect(22, 33 + b, 4, 3, G); },
    weapon: (b, a) => {
      const BL = p.mat(e >= 2 ? '#ffe6a0' : '#dfe6ee'), HI = p.mat('#7a4a2a'), GD = p.mat('#f5c542');
      p.poly([[34, 35 + b + a], [44, 8 + b + a], [46, 9 + b + a], [37, 36 + b + a]], BL);
      p.rect(31, 35 + b + a, 9, 2, GD); p.rect(33, 37 + b + a, 3, 4, HI);
      if (e >= 1) { const F = p.flat('#ff9a3d'); p.px(45, 6 + b + a + (o.f % 2), F); p.px(43, 12 + b + a - (o.f % 2), F); }
    },
  });
};
const tide: Draw = (p, o) => {
  const e = o.evo ?? 0;
  chibiBase(p, o, { hair: '#3a6fd8', body: e >= 2 ? '#e8f4ff' : '#2b5aa8', trim: e >= 2 ? '#7fd6e8' : '#9ad8f0', pants: '#22386a', boots: '#2a2f4a', cape: e >= 1 ? '#1e3f7a' : undefined }, {
    backHair: b => { const H = p.mat('#3a6fd8'); p.ell(22, 15 + b, 12, 10, H); p.poly([[12, 16 + b], [22, 16 + b], [20, 40], [14, 42 + (o.f % 2)], [10, 34]], H); },
    fringe: b => {
      const H = p.mat('#3a6fd8');
      p.poly([[12, 16 + b], [14, 7 + b], [22, 4 + b], [32, 6 + b], [36, 14 + b], [31, 11 + b], [27, 15 + b], [24, 11 + b], [19, 15 + b], [15, 19 + b]], H);
      if (e >= 1) { const HD = p.mat(e >= 2 ? '#dfefff' : '#1e3f7a'); p.poly([[10, 18 + b], [12, 5 + b], [24, 0 + b], [36, 5 + b], [37, 13 + b], [33, 8 + b], [24, 4 + b], [15, 8 + b], [13, 20 + b]], HD); }
      const P = p.flat('#9ae8ff'); p.px(17, 9 + b, P); p.px(18, 9 + b, P);
    },
    armor: b => { const SH = p.mat(e >= 2 ? '#7fd6e8' : '#9ad8f0'); p.poly([[16, 41], [32, 41], [34, 46], [14, 46]], p.mat(e >= 2 ? '#e8f4ff' : '#2b5aa8')); p.rect(16, 44, 18, 1, SH); },
    weapon: (b, a) => {
      const ST = p.mat('#8a5a3a'), OR = p.mat(e >= 2 ? '#c8f8ff' : '#5fd0ff', { glow: true });
      p.line(36, 46, 40, 10 + b + a, ST, 2);
      p.ell(40, 8 + b + a, 4, 4, OR); const W = p.flat('#ffffff'); p.px(39, 6 + b + a, W);
      if (e >= 2) { const R = p.mat('#f5c542'); p.line(35, 5 + b + a, 45, 5 + b + a, R); }
    },
  });
  if ((o.evo ?? 0) >= 2) { const HL = p.mat('#ffe680'); for (let x = 16; x <= 32; x++) if (x < 18 || x > 30) p.px(x, 0, HL); else { p.px(x, 0, HL); } }
};
const gale: Draw = (p, o) => {
  const e = o.evo ?? 0;
  chibiBase(p, o, { hair: '#3fae6a', body: '#2f3b2e', trim: '#a5e36b', pants: '#2a2a22', boots: '#3a2a1a', cape: undefined }, {
    backItem: b => { const SC = p.mat(e >= 2 ? '#e8f0a0' : '#a5e36b'); const len = e >= 1 ? 14 : 8; const sw = o.f % 2; p.curve(18, 28 + b, 10, 26 + sw * 2, 18 - len, 22 + sw * 3, SC, 4, true); if (e >= 2) { const WG = p.mat('#c8ffd8'); p.poly([[14, 30 + b], [2, 18 + b + sw], [6, 30 + b], [1, 34 + b], [12, 36 + b]], WG); } },
    backHair: b => { const H = p.mat('#3fae6a'); p.ell(22, 15 + b, 12, 10, H); },
    fringe: b => {
      const H = p.mat('#3fae6a');
      p.poly([[12, 17 + b], [13, 6 + b], [20, 2 + b], [30, 3 + b], [37, 10 + b], [33, 11 + b], [35, 16 + b], [29, 12 + b], [25, 14 + b], [21, 10 + b], [16, 15 + b]], H);
      const HD = p.mat('#2f3b2e'); p.poly([[11, 20 + b], [12, 6 + b], [22, 1 + b], [30, 2 + b], [24, 4 + b], [16, 8 + b], [14, 20 + b]], HD);
      if (e >= 2) { const MK = p.mat('#1a2418'); p.rect(23, 22 + b, 13, 4, MK); }
    },
    armor: b => { const BL = p.mat('#6a4a2a'); p.rect(16, 36 + b, 17, 2, BL); },
    weapon: (b, a) => {
      const BL = p.mat('#e0e6ea'), HI = p.mat('#5a3a22');
      p.poly([[34, 37 + b + a], [43, 28 + b + a], [44, 30 + b + a], [36, 38 + b + a]], BL); p.rect(32, 37 + b + a, 3, 3, HI);
      p.poly([[12, 38 + b], [6, 31 + b], [7, 30 + b], [14, 37 + b]], BL);
    },
  });
};
const stone: Draw = (p, o) => {
  const e = o.evo ?? 0;
  chibiBase(p, o, { hair: '#8a6a3f', body: e >= 2 ? '#8a7a6a' : '#6b5a44', trim: '#c9a24a', pants: '#4a3a2a', boots: '#3a2a1a', skin: '#e9be93', cape: e >= 1 ? '#5a4a3a' : undefined }, {
    backHair: b => { const H = p.mat('#8a6a3f'); p.ell(22, 15 + b, 12, 9, H); },
    fringe: b => {
      const HM = p.mat(e >= 2 ? '#9aa8b8' : '#8a8f99');
      for (let y = 4; y <= 13; y++) { const hw = Math.round(13 * Math.sqrt(Math.max(0, 1 - ((13 - y) / 9) ** 2))); p.rect(24 - hw, y + b, hw * 2, 1, HM); } p.rect(10, 13 + b, 28, 3, HM); p.rect(11, 16 + b, 3, 8, HM);
      p.rect(23, 4 + b, 2, 9, p.mat('#c9a24a'));
      if (e >= 2) { const CR = p.mat('#7ae8d0', { glow: true }); p.poly([[18, 6 + b], [20, -1 + b + 1], [22, 6 + b]], CR); p.poly([[26, 6 + b], [28, 0 + b + 1], [30, 6 + b]], CR); }
    },
    armor: b => { const PA = p.mat(e >= 1 ? '#9a8a6a' : '#7a6a54'); p.ell(16, 30 + b, 5, 4, PA); p.ell(32, 30 + b, 5, 4, PA); if (e >= 2) { const R = p.mat('#7a7a82'); p.poly([[12, 28 + b], [14, 23 + b], [18, 27 + b]], R); } },
    weapon: (b, a) => {
      const SH = p.mat(e >= 1 ? '#b8a070' : '#8a7a5a'), RM = p.mat('#c9a24a');
      const big = e >= 1 ? 2 : 0;
      p.ell(36, 33 + b + a, 7 + big, 10 + big, RM); p.ell(36, 33 + b + a, 5.5 + big, 8.5 + big, SH);
      const EM = p.mat(e >= 2 ? '#7ae8d0' : '#c9a24a'); p.poly([[36, 28 + b + a], [39, 33 + b + a], [36, 38 + b + a], [33, 33 + b + a]], EM);
    },
  });
};
export const HERO_SPRITES: Record<string, SpriteDef> = {
  ember: { w: 48, h: 50, draw: ember, aura: o => heroAuras.ember[o.evo ?? 0] || null },
  tide: { w: 48, h: 50, draw: tide, aura: o => heroAuras.tide[o.evo ?? 0] || null },
  gale: { w: 48, h: 50, draw: gale, aura: o => heroAuras.gale[o.evo ?? 0] || null },
  stone: { w: 48, h: 50, draw: stone, aura: o => heroAuras.stone[o.evo ?? 0] || null },
};

// ---------------------------------------------------------------- ENEMIES (face left)
const E: Record<string, SpriteDef> = {};
const def = (id: string, w: number, h: number, draw: Draw, aura?: (o: Pose) => string | null) => { E[id] = { w, h, draw, aura }; };

def('puddle_slime', 44, 40, (p, o) => {
  const b = BOB[o.f]; const SL = p.mat('#4fb0f0');
  p.ell(22, 26 + b * 0.5, 17 + b, 12 - b, SL); p.poly([[18, 16 + b], [22, 5 + b], [26, 16 + b]], SL);
  const HI = p.flat('#d8f4ff'); p.rect(12, 20 + b, 3, 2, HI); p.px(12, 23 + b, HI); p.px(21, 9 + b, HI);
  eyes(p, 14, 25 + b, 9, '#173a5a', 4); blush(p, 11, 30 + b, 14); p.rect(18, 31 + b, 3, 1, p.flat('#173a5a'));
});
def('field_rat', 48, 40, (p, o) => {
  const b = BOB[o.f]; const FU = p.mat('#9a7b5a'), BE = p.mat('#e0c49a'), PK = p.mat('#e8a0a0');
  p.curve(36, 30, 46, 26, 44, 14 + b, PK, 2);
  p.ell(28, 28, 12, 8 + b * 0.3, FU); p.ell(26, 31, 7, 4, BE);
  p.ell(15, 22 + b, 9, 7, FU); p.poly([[4, 25 + b], [9, 19 + b], [10, 27 + b]], FU);
  p.ell(15, 13 + b, 5, 5, FU); p.ell(15, 13 + b, 3, 3, PK); p.ell(22, 14 + b, 4, 4, FU); p.ell(22, 14 + b, 2, 2, PK);
  p.px(4, 24 + b, p.flat('#3a2020')); eyes(p, 11, 20 + b, 0, '#1a1010', 3);
  const T = p.flat('#ffffff'); p.rect(6, 27 + b, 2, 2, T);
  p.rect(18, 35, 4, 3, FU); p.rect(30, 35, 4, 3, FU);
});
def('moss_sprite', 40, 44, (p, o) => {
  const fl = [0, -1, -2, -1][o.f]; const LF = p.mat('#9ae07a'), BD = p.mat('#5aa84a'), FL = p.mat('#ff9ac8'), S = p.mat('#e8f5c8');
  const fw = o.f % 2;
  p.poly([[22, 22 + fl], [36, 10 + fl - fw], [34, 24 + fl]], LF); p.poly([[22, 24 + fl], [37, 26 + fl + fw], [30, 32 + fl]], LF);
  p.ell(18, 31 + fl, 6, 7, BD); p.ell(17, 19 + fl, 9, 8, S);
  p.ell(18, 11 + fl, 4, 3, FL); p.px(18, 11 + fl, p.flat('#fff3a0'));
  eyes(p, 12, 18 + fl, 6, '#20401a', 3); blush(p, 11, 22 + fl, 7);
  const D = p.flat('#fff8a0'); p.px(6, 36 + fl * -1, D); p.px(30, 40 + fl, D);
});
def('bark_wolf', 52, 44, (p, o) => {
  const b = BOB[o.f]; const BK = p.mat('#6b5238'), DK = p.mat('#4a3826'), MO = p.mat('#6aa84a'), EY = p.flat('#ffd23a');
  p.curve(40, 24, 50, 18, 48, 10 + b, BK, 4, true);
  p.ell(30, 26, 14, 8, BK); p.ell(26, 20 + b * 0.5, 10, 6, MO);
  for (const x of [20, 26, 34, 40]) p.rect(x, 31, 4, 8, DK);
  p.ell(13, 20 + b, 8, 7, BK); p.poly([[2, 24 + b], [8, 18 + b], [10, 27 + b]], BK);
  p.poly([[10, 15 + b], [12, 6 + b], [16, 14 + b]], DK); p.poly([[16, 14 + b], [19, 6 + b], [21, 15 + b]], DK);
  p.rect(9, 18 + b, 3, 2, EY); p.px(2, 23 + b, p.flat('#1a1010'));
  const L = p.flat('#4a3826'); p.line(26, 27, 34, 27, L); p.line(28, 30, 36, 30, L);
});
def('road_bandit', 44, 50, (p, o) => {
  const b = BOB[o.f]; const S = p.mat('#e0b08a'), CL = p.mat('#5a3e2b'), BA = p.mat('#c0392b'), MK = p.mat('#2a2a2a'), BL = p.mat('#d8dde4');
  p.rect(15, 40, 4, 6, MK); p.rect(23, 40, 4, 6, MK); p.rect(14, 45, 6, 3, CL); p.rect(22, 45, 6, 3, CL);
  p.poly([[13, 29 + b], [29, 29 + b], [30, 41], [12, 41]], CL); p.line(13, 30 + b, 28, 40, BA, 2);
  p.ell(22, 18 + b, 11, 10, S); p.rect(11, 20 + b, 22, 6, MK);
  p.ell(22, 12 + b, 11, 6, BA); p.erase(10, 17 + b, 24, 2); p.poly([[31, 10 + b], [38, 6 + b], [37, 14 + b]], BA);
  eyes(p, 15, 16 + b, 7, '#1a1010', 3);
  p.ell(11, 34 + b, 2.5, 3.5, CL); p.poly([[9, 36 + b], [2, 26 + b], [3, 25 + b], [11, 35 + b]], BL);
});
def('rust_knight', 46, 52, (p, o) => {
  const b = BOB[o.f]; const RU = p.mat('#a0663a'), ME = p.mat('#8a7a6a'), PL = p.mat('#c0392b'), WD = p.mat('#6a4a2a');
  p.rect(16, 41, 5, 6, ME); p.rect(25, 41, 5, 6, ME); p.rect(15, 46, 7, 3, RU); p.rect(24, 46, 7, 3, RU);
  p.poly([[13, 29 + b], [33, 29 + b], [34, 42], [12, 42]], ME); p.ell(23, 34 + b, 5, 4, RU);
  p.rect(13, 8 + b, 20, 22, ME); p.ell(23, 9 + b, 10, 5, ME); p.rect(14, 16 + b, 18, 3, p.flat('#1a1010'));
  p.px(17, 17 + b, p.flat('#ff6040')); p.px(22, 17 + b, p.flat('#ff6040'));
  const RS = p.flat('#7a3a1a'); p.px(28, 12 + b, RS); p.px(16, 24 + b, RS); p.px(29, 25 + b, RS);
  p.curve(23, 5 + b, 30, -1 + b + 2, 38, 6 + b, PL, 3, true);
  p.ell(10, 34 + b, 7, 9, WD); p.ell(10, 34 + b, 5, 7, RU);
});
def('cinder_imp', 44, 46, (p, o) => {
  const fl = [0, -1, -2, -1][o.f]; const RD = p.mat('#e0502b'), DK = p.mat('#7a2a2a'), HN = p.mat('#3a2020'), FL = p.mat('#ffc23a', { glow: true });
  const w = o.f % 2;
  p.poly([[24, 20 + fl], [40, 8 + fl - w], [36, 26 + fl]], DK); p.poly([[24, 22 + fl], [42, 24 + fl + w], [32, 30 + fl]], DK);
  p.curve(26, 34 + fl, 36, 42, 40, 32 + fl, RD, 2); p.ell(41, 30 + fl, 2.5, 3.5, FL);
  p.ell(21, 31 + fl, 7, 7, RD); p.ell(19, 18 + fl, 10, 9, RD);
  p.poly([[10, 12 + fl], [8, 2 + fl], [14, 10 + fl]], HN); p.poly([[24, 10 + fl], [28, 1 + fl], [27, 12 + fl]], HN);
  eyes(p, 12, 17 + fl, 7, '#ffe680', 3); p.poly([[13, 23 + fl], [20, 23 + fl], [16, 26 + fl]], p.flat('#3a1010'));
});
def('ash_hound', 54, 42, (p, o) => {
  const b = BOB[o.f]; const AS = p.mat('#4a4048'), DK = p.mat('#2a2228'), LV = p.flat('#ff7a2b'), EY = p.flat('#ffd23a');
  p.curve(42, 22, 52, 14 + b, 50, 6 + b, AS, 3, true); p.px(50, 5 + b, LV); p.px(51, 4 + b - (o.f % 2), p.flat('#ffc23a'));
  p.ell(32, 24, 13, 7, AS);
  for (const x of [22, 28, 36, 42]) p.rect(x, 29, 3, 9, DK);
  p.ell(14, 18 + b, 8, 6, AS); p.poly([[2, 22 + b], [9, 15 + b], [10, 24 + b]], AS); p.poly([[12, 13 + b], [15, 4 + b], [18, 13 + b]], DK);
  p.rect(9, 16 + b, 3, 2, EY); p.line(25, 22, 30, 27, LV); p.line(34, 20, 38, 24, LV); p.line(30, 19, 33, 21, LV);
  p.rect(4, 24 + b, 6, 1, LV);
});
def('frost_wisp', 40, 46, (p, o) => {
  const fl = [0, -1, -2, -1][o.f]; const IC = p.mat('#9fd8f5'), CR = p.mat('#e8f8ff'), DP = p.mat('#4a8ad8');
  p.poly([[20, 2 + fl], [30, 16 + fl], [32, 30 + fl], [26, 40 + fl], [14, 40 + fl], [8, 30 + fl], [10, 16 + fl]], IC);
  p.poly([[20, 8 + fl], [26, 18 + fl], [24, 32 + fl], [16, 32 + fl], [14, 18 + fl]], CR);
  p.poly([[6, 12 + fl], [3, 6 + fl], [9, 9 + fl]], DP); p.poly([[34, 14 + fl], [37, 6 + fl], [31, 10 + fl]], DP);
  eyes(p, 14, 22 + fl, 7, '#2a4a8a', 4); p.rect(17, 30 + fl, 4, 1, p.flat('#2a4a8a'));
  const SP = p.flat('#ffffff'); p.px(4, 30 - fl, SP); p.px(35, 24 + fl, SP); p.px(30, 42 - fl, SP);
});
def('snow_yeti', 54, 54, (p, o) => {
  const b = BOB[o.f]; const FU = p.mat('#e8f2f8'), SK = p.mat('#8fb8d8'), HN = p.mat('#c8b890');
  p.rect(16, 44, 8, 7, FU); p.rect(30, 44, 8, 7, FU);
  p.ell(27, 34 + b * 0.5, 16, 13, FU); p.ell(26, 36 + b, 8, 7, SK);
  p.ell(10, 34 + b, 6, 10, FU); p.ell(44, 34 + b, 6, 10, FU); p.ell(9, 44 + b, 5, 4, SK); p.ell(45, 44 + b, 5, 4, SK);
  p.ell(25, 18 + b, 13, 11, FU); p.ell(23, 21 + b, 8, 6, SK);
  p.poly([[13, 12 + b], [7, 4 + b], [15, 8 + b]], HN); p.poly([[35, 12 + b], [42, 4 + b], [34, 8 + b]], HN);
  eyes(p, 18, 19 + b, 7, '#1a2a4a', 3); p.rect(19, 25 + b, 8, 2, p.flat('#3a3a5a')); p.px(20, 25 + b, p.flat('#fff')); p.px(25, 25 + b, p.flat('#fff'));
});
def('bog_toad', 52, 42, (p, o) => {
  const b = BOB[o.f]; const GR = p.mat('#6a8a3a'), BE = p.mat('#d8d890'), SP = p.mat('#4a6a2a');
  p.ell(36, 32, 9, 6, GR); p.ell(14, 34, 7, 5, GR);
  p.ell(26, 26 - b, 19, 13 + b, GR); p.ell(24, 32 - b * 0.5, 13, 7, BE);
  p.ell(14, 13 - b, 6, 6, GR); p.ell(32, 13 - b, 6, 6, GR);
  for (const [x, y] of [[36, 20], [40, 27], [30, 18]]) p.ell(x, y - b, 2, 2, SP);
  eyes(p, 12, 11 - b, 18, '#1a1a0a', 4);
  p.curve(10, 26 - b, 24, 31 - b, 40, 25 - b, p.flat('#3a2a1a'), 1);
});
def('reed_harpy', 50, 50, (p, o) => {
  const b = BOB[o.f]; const FE = p.mat('#6a8a6a'), WG = p.mat('#4a6a4a'), BK = p.mat('#e0c070'), CR = p.mat('#c8b060'), LG = p.mat('#e0a040');
  const w = o.f % 2;
  p.poly([[26, 22 + b], [48, 8 + b + w * 3], [44, 22 + b], [48, 28 + b], [30, 32 + b]], WG);
  p.line(22, 38, 20, 48, LG, 2); p.line(28, 38, 30, 48, LG, 2);
  p.ell(25, 30 + b * 0.5, 9, 10, FE); p.ell(18, 16 + b, 8, 7, FE);
  p.poly([[11, 16 + b], [1, 19 + b], [11, 20 + b]], BK);
  for (let i = 0; i < 4; i++) p.line(20 + i * 2, 9 + b, 24 + i * 3, 1 + b, CR);
  eyes(p, 13, 14 + b, 0, '#a01010', 3);
});
def('hollow_guard', 48, 56, (p, o) => {
  const b = BOB[o.f]; const AR = p.mat('#4a4a5e'), TR = p.mat('#7a5af5'), SH = p.mat('#9aa0a6'), GL = p.flat('#c8a0ff');
  p.line(8, 54, 8, 4 + b, p.mat('#6a4a2a'), 2); p.poly([[4, 6 + b], [8, 0 + b], [12, 6 + b], [8, 12 + b]], SH); p.poly([[8, 6 + b], [1, 10 + b], [7, 13 + b]], SH);
  p.rect(18, 44, 5, 8, AR); p.rect(27, 44, 5, 8, AR);
  p.poly([[15, 28 + b], [35, 28 + b], [37, 45], [13, 45]], AR); p.rect(23, 30 + b, 4, 13, TR);
  p.ell(25, 16 + b, 10, 11, AR); p.rect(15, 15 + b, 20, 4, p.flat('#0a0a14'));
  p.rect(18, 16 + b, 3, 2, GL); p.rect(25, 16 + b, 3, 2, GL);
  p.poly([[25, 5 + b], [29, -0 + b + 1], [33, 6 + b]], TR);
  p.ell(12, 32 + b, 3, 4, AR);
});
def('gargoyle', 54, 50, (p, o) => {
  const b = BOB[o.f]; const ST = p.mat('#7a7a86'), DK = p.mat('#55555f'), HN = p.mat('#a0a0b0'), EY = p.flat('#ff5040');
  const w = o.f % 2;
  p.poly([[26, 20 + b], [52, 4 + b + w * 2], [48, 14 + b], [53, 20 + b], [46, 24 + b], [50, 30 + b], [32, 32 + b]], DK);
  p.ell(27, 34 + b * 0.5, 11, 10, ST);
  p.rect(18, 42, 6, 6, ST); p.rect(30, 42, 6, 6, ST);
  p.ell(18, 20 + b, 10, 9, ST); p.poly([[10, 13 + b], [6, 2 + b], [14, 10 + b]], HN); p.poly([[22, 12 + b], [26, 2 + b], [27, 13 + b]], HN);
  p.rect(11, 18 + b, 3, 2, EY); p.rect(18, 18 + b, 3, 2, EY);
  const F = p.flat('#ffffff'); p.px(12, 25 + b, F); p.px(17, 25 + b, F); p.rect(11, 24 + b, 8, 1, p.flat('#2a2a30'));
  const CK = p.flat('#4a4a54'); p.line(30, 30, 34, 36, CK);
});
// Elites (64)
def('elite_ogre', 64, 64, (p, o) => {
  const b = BOB[o.f]; const SK = p.mat('#7a9a4a'), CL = p.mat('#7a5a3a'), WD = p.mat('#5a3a22'), BL = p.mat('#c8c0a8');
  p.rect(20, 52, 9, 10, SK); p.rect(36, 52, 9, 10, SK);
  p.ell(33, 40 + b * 0.5, 19, 15, SK); p.poly([[16, 44], [50, 44], [52, 56], [14, 56]], CL);
  p.ell(32, 18 + b, 13, 12, SK); p.ell(27, 26 + b, 9, 4, p.mat('#8aaa5a'));
  p.poly([[22, 28 + b], [24, 22 + b], [26, 28 + b]], BL); p.poly([[34, 28 + b], [36, 22 + b], [38, 28 + b]], BL);
  eyes(p, 23, 15 + b, 9, '#3a1010', 3); p.rect(22, 13 + b, 5, 1, p.flat('#3a3a1a')); p.rect(31, 13 + b, 5, 1, p.flat('#3a3a1a'));
  p.ell(52, 40 + b, 6, 9, SK);
  p.line(14, 46 + b, 4, 12 + b, WD, 5); p.ell(5, 12 + b, 6, 8, WD); p.px(2, 8 + b, p.flat('#c8c0a8')); p.px(7, 6 + b, p.flat('#c8c0a8'));
  p.ell(14, 44 + b, 5, 5, SK);
});
def('elite_witch', 60, 66, (p, o) => {
  const b = BOB[o.f]; const SK = p.mat('#c8e0a8'), RB = p.mat('#3a2050'), HT = p.mat('#2a1a3a'), HB = p.mat('#b05af5'), HR = p.mat('#5a2a6a'), BR = p.mat('#8a6a3a'), ST = p.mat('#e0c070');
  p.line(4, 60, 54, 44, BR, 2); for (let i = 0; i < 6; i++) p.line(50, 44, 58, 38 + i * 2, ST);
  p.poly([[18, 34 + b], [38, 34 + b], [44, 60], [12, 60]], RB);
  p.poly([[16, 26 + b], [24, 26 + b], [22, 46], [12, 44]], HR);
  p.ell(28, 26 + b, 10, 9, SK);
  p.poly([[14, 20 + b], [44, 20 + b], [32, 14 + b], [36, 0 + b], [26, 12 + b]], HT); p.rect(18, 17 + b, 22, 3, HB);
  p.poly([[16, 28 + b], [12, 30 + b], [16, 31 + b]], SK);
  eyes(p, 20, 25 + b, 8, '#d8d020', 3); p.rect(23, 32 + b, 4, 1, p.flat('#3a1a2a'));
  p.ell(14, 44 + b, 3, 4, RB); const OR = p.mat('#b05af5', { glow: true }); p.ell(10, 40 + b - (o.f % 2), 4, 4, OR); p.px(9, 38 + b, p.flat('#fff'));
});
def('elite_knight', 64, 66, (p, o) => {
  const b = BOB[o.f]; const AR = p.mat('#2a2a30'), TR = p.mat('#c0392b'), HN = p.mat('#8a8a90'), BL = p.mat('#c8ccd4'), EY = p.flat('#ff3a2a');
  p.poly([[26, 30 + b], [44, 30 + b], [56, 62], [22, 62]], TR);
  p.rect(24, 52, 7, 10, AR); p.rect(36, 52, 7, 10, AR);
  p.poly([[20, 30 + b], [46, 30 + b], [48, 54], [18, 54]], AR); p.ell(22, 32 + b, 7, 5, AR); p.ell(44, 32 + b, 7, 5, AR);
  p.rect(30, 34 + b, 6, 14, TR);
  p.ell(33, 18 + b, 11, 12, AR); p.rect(23, 17 + b, 20, 3, p.flat('#0a0a0a')); p.rect(25, 18 + b, 3, 1, EY); p.rect(31, 18 + b, 3, 1, EY);
  p.curve(24, 12 + b, 16, 6 + b, 18, -1 + b + 2, HN, 3, true); p.curve(42, 12 + b, 50, 6 + b, 48, 1 + b, HN, 3, true);
  p.poly([[16, 44 + b], [4, 4 + b], [8, 2 + b], [20, 42 + b]], BL); p.rect(12, 42 + b, 12, 3, TR); p.rect(15, 45 + b, 4, 6, p.mat('#4a3020'));
});
def('elite_drake', 66, 60, (p, o) => {
  const b = BOB[o.f]; const SC = p.mat('#3a9a8a'), BE = p.mat('#c8f0d8'), WG = p.mat('#2a6a6a'), HN = p.mat('#e8f0e0'), EY = p.flat('#ffe040');
  const w = o.f % 2;
  p.poly([[34, 26 + b], [64, 2 + b + w * 4], [58, 20 + b], [66, 24 + b], [54, 32 + b], [62, 38 + b], [40, 40 + b]], WG);
  p.curve(48, 44, 62, 50, 64, 38 + b, SC, 4, true);
  p.ell(38, 40 + b * 0.5, 14, 10, SC); p.ell(34, 44, 8, 5, BE);
  p.rect(30, 48, 5, 8, SC); p.rect(42, 48, 5, 8, SC);
  p.curve(30, 36, 20, 30, 18, 18 + b, SC, 7);
  p.ell(14, 16 + b, 9, 7, SC); p.poly([[2, 20 + b], [8, 13 + b], [10, 22 + b]], SC);
  p.poly([[14, 10 + b], [22, 2 + b], [19, 12 + b]], HN); p.poly([[10, 10 + b], [12, 2 + b], [14, 10 + b]], HN);
  p.rect(9, 14 + b, 3, 2, EY); p.rect(3, 22 + b, 6, 1, p.flat('#1a3a3a'));
});
// Bosses (88) with phase-2 looks
def('boss_scarecrow', 80, 88, (p, o) => {
  const b = BOB[o.f]; const ph = (o.phase ?? 1) >= 2;
  const PO = p.mat('#6a4a2a'), ST = p.mat('#e0c060'), CL = p.mat(ph ? '#5a2020' : '#7a4a2a'), PU = p.mat(ph ? '#ff7a1a' : '#e8902a'), CR = p.mat('#f5c542'), PT = p.mat('#4a7a3a');
  p.rect(38, 30, 4, 58, PO); p.rect(8, 40 + b, 64, 4, PO);
  for (const x of [6, 70]) for (let i = 0; i < 4; i++) p.line(x, 42 + b, x + (x < 40 ? -4 : 4) + i, 52 + b + i, ST);
  p.poly([[24, 40 + b], [56, 40 + b], [60, 72], [20, 72]], CL); for (let i = 0; i < 7; i++) p.line(22 + i * 6, 72, 20 + i * 6, 80, ST);
  p.rect(26, 52 + b, 8, 8, p.mat('#9a6a3a')); p.rect(46, 58 + b, 7, 6, p.mat('#4a6a8a'));
  p.ell(40, 24 + b, 17, 14, PU); for (const x of [32, 40, 48]) p.line(x, 12 + b, x, 36 + b, p.flat(ph ? '#c84a10' : '#c06a1a'));
  p.rect(38, 6 + b, 4, 5, PT);
  const FC = p.flat(ph ? '#fff2a0' : '#2a1a10'); p.poly([[29, 22 + b], [35, 18 + b], [35, 25 + b]], FC); p.poly([[45, 18 + b], [51, 22 + b], [45, 25 + b]], FC);
  p.poly([[30, 30 + b], [50, 30 + b], [46, 35 + b], [42, 32 + b], [38, 35 + b], [34, 32 + b]], FC);
  p.poly([[26, 12 + b], [28, 2 + b], [33, 8 + b], [40, 0 + b], [47, 8 + b], [52, 2 + b], [54, 12 + b]], CR);
  if (ph) { const F = p.mat('#ff9a2a', { glow: true }), Y = p.flat('#ffe680'); for (const [x, y] of [[22, 20], [58, 18], [30, 6], [52, 4]]) { p.poly([[x - 3, y + b + 4], [x, y + b - 5 - (o.f % 2) * 2], [x + 3, y + b + 4]], F); p.px(x, y + b + 1, Y); } }
}, o => (o.phase ?? 1) >= 2 ? '#ff7a2b' : null);
def('boss_elder_tree', 88, 88, (p, o) => {
  const b = BOB[o.f]; const ph = (o.phase ?? 1) >= 2;
  const BK = p.mat('#5a4430'), DK = p.mat('#3a2c20'), LF = p.mat(ph ? '#8a6a2a' : '#4a9a3a'), LF2 = p.mat(ph ? '#a0502a' : '#6ac04a'), EY = p.flat(ph ? '#ff3a2a' : '#ffe680'), TH = p.mat('#2a2018');
  p.ell(44, 22 + b, 36, 18, LF); p.ell(26, 16 + b, 16, 10, LF2); p.ell(62, 18 + b, 14, 9, LF2);
  p.poly([[28, 30], [60, 30], [64, 80], [24, 80]], BK);
  p.poly([[24, 76], [6, 86], [30, 82]], BK); p.poly([[62, 76], [84, 86], [58, 82]], BK); p.poly([[38, 80], [44, 88], [50, 80]], BK);
  p.curve(28, 46, 14, 40 + b, 6, 50 + b * 2, BK, 5, true); p.curve(60, 46, 74, 38 + b, 82, 46 + b * 2, BK, 5, true);
  p.ell(36, 46, 4, 3, DK); p.ell(52, 46, 4, 3, DK); p.rect(35, 46, 3, 2, EY); p.rect(51, 46, 3, 2, EY);
  p.ell(44, 60, 7, 5 + (ph ? 2 : 0), DK);
  for (const y of [36, 54, 70]) p.line(30, y, 34, y + 2, DK);
  if (ph) for (const [x, y] of [[20, 30], [70, 28], [24, 62], [66, 60], [44, 6]]) p.poly([[x, y + b], [x + 3, y - 6 + b], [x + 5, y + b]], TH);
  if (!ph) { const AP = p.mat('#e04040'); p.ell(20, 26 + b, 2, 2, AP); p.ell(70, 22 + b, 2, 2, AP); p.ell(52, 10 + b, 2, 2, AP); }
}, o => (o.phase ?? 1) >= 2 ? '#c03a2a' : null);
def('boss_toll_lord', 84, 88, (p, o) => {
  const b = BOB[o.f]; const ph = (o.phase ?? 1) >= 2;
  const S = p.mat(ph ? '#e89070' : '#e0b08a'), RB = p.mat('#6a1a2a'), FU = p.mat('#f0e8d8'), GD = p.mat('#f5c542'), BG = p.mat('#a07a4a');
  p.rect(28, 74, 10, 12, RB); p.rect(46, 74, 10, 12, RB);
  p.ell(42, 56 + b * 0.5, 26, 22, RB); p.rect(16, 60, 52, 4, FU); p.ell(42, 36 + b, 16, 5, FU);
  p.rect(39, 40 + b, 6, 30, GD);
  p.ell(42, 24 + b, 14, 13, S); p.ell(42, 32 + b, 11, 5, S);
  eyes(p, 34, 21 + b, 11, '#1a1010', 3); p.rect(37, 31 + b, 10, 1, p.flat('#5a2a2a'));
  p.curve(32, 28 + b, 36, 26 + b, 42, 29 + b, p.flat('#3a2a1a'), 1); p.curve(42, 29 + b, 48, 26 + b, 52, 28 + b, p.flat('#3a2a1a'), 1);
  p.poly([[28, 14 + b], [30, 2 + b], [36, 10 + b], [42, 0 + b], [48, 10 + b], [54, 2 + b], [56, 14 + b]], GD);
  for (const x of [32, 42, 52]) p.px(x, 8 + b, p.flat(x === 42 ? '#3ac0ff' : '#e8423f'));
  p.ell(12, 62 + b, 9, 10, BG); p.rect(9, 51 + b, 6, 3, p.mat('#7a5a2a')); p.px(11, 62 + b, p.flat('#f5c542')); p.rect(10, 60 + b, 5, 1, p.flat('#f5c542'));
  if (ph) { const C = p.mat('#f5c542'); for (const [x, y] of [[8, 30], [70, 20], [74, 46], [4, 44], [66, 6]]) p.ell(x, y + (o.f % 2) * 2, 2.5, 2.5, C); }
}, o => (o.phase ?? 1) >= 2 ? '#f5c542' : null);
def('boss_ash_wyrm', 92, 84, (p, o) => {
  const b = BOB[o.f]; const ph = (o.phase ?? 1) >= 2;
  const SC = p.mat(ph ? '#5a2a22' : '#3a2e2e'), BE = p.mat('#8a5a4a'), WG = p.mat('#2a1e1e'), HN = p.mat('#c8b8a0'), LV = p.flat(ph ? '#ffd040' : '#ff7a2b'), EY = p.flat('#ffe040');
  const w = o.f % 2;
  p.poly([[50, 34 + b], [92, 4 + b + w * 4], [84, 26 + b], [92, 34 + b], [76, 42 + b], [86, 50 + b], [56, 52 + b]], WG);
  p.curve(66, 68, 88, 74, 90, 58, SC, 7, true);
  p.ell(56, 58 + b * 0.5, 22, 15, SC); p.ell(50, 64, 13, 7, BE);
  for (const x of [40, 52, 64]) p.rect(x, 68, 7, 12, SC);
  p.curve(44, 52, 26, 46, 26, 26 + b, SC, 12);
  p.ell(20, 22 + b, 15, 11, SC); p.poly([[2, 28 + b], [12, 18 + b], [16, 34 + b]], SC);
  p.poly([[22, 14 + b], [36, 2 + b], [30, 16 + b]], HN); p.poly([[14, 13 + b], [18, 2 + b], [21, 13 + b]], HN);
  p.rect(12, 19 + b, 4, 3, EY); p.rect(3, 30 + b, 10, 1, LV);
  p.line(50, 50, 58, 60, LV); p.line(62, 52, 68, 62, LV); p.line(30, 36, 34, 44, LV);
  if (ph) { p.line(40, 58, 46, 66, LV); p.line(18, 26 + b, 26, 30 + b, LV); const F = p.mat('#ff9a2a', { glow: true }); p.poly([[0, 32 + b], [6, 28 + b], [8, 36 + b], [2, 38 + b]], F); }
}, o => (o.phase ?? 1) >= 2 ? '#ff5a1a' : null);
def('boss_frost_queen', 72, 92, (p, o) => {
  const b = BOB[o.f]; const ph = (o.phase ?? 1) >= 2;
  const S = p.mat('#d8ecf8'), DR = p.mat(ph ? '#3a6ac0' : '#5a8ad8'), TR = p.mat('#e8f8ff'), HR = p.mat('#f0faff'), CR = p.mat('#9ae8ff', { glow: true });
  p.poly([[26, 40 + b], [46, 40 + b], [66, 90], [6, 90]], DR); p.poly([[30, 40 + b], [42, 40 + b], [50, 90], [22, 90]], TR);
  p.poly([[22, 22 + b], [50, 22 + b], [54, 60], [18, 60]], HR);
  p.ell(36, 26 + b, 11, 11, S);
  eyes(p, 30, 25 + b, 7, '#2a5ab0', 4); p.rect(34, 32 + b, 4, 1, p.flat('#7a9ac0'));
  p.poly([[24, 18 + b], [26, 2 + b], [30, 12 + b], [36, -2 + b + 2], [42, 12 + b], [46, 2 + b], [48, 18 + b]], CR);
  p.poly([[22, 46 + b], [10, 30 + b], [12, 28 + b], [26, 44 + b]], S);
  p.line(10, 90, 10, 20 + b, p.mat('#b8e0f8'), 2); p.poly([[6, 20 + b], [10, 10 + b], [14, 20 + b], [10, 24 + b]], CR);
  if (ph) for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + o.f * 0.3; const x = 36 + Math.cos(a) * 30, y = 50 + Math.sin(a) * 34; p.poly([[x, y - 4], [x + 2, y], [x, y + 4], [x - 2, y]], CR); }
}, o => (o.phase ?? 1) >= 2 ? '#9ae8ff' : null);
def('boss_marsh_mother', 92, 80, (p, o) => {
  const b = BOB[o.f]; const ph = (o.phase ?? 1) >= 2;
  const SL = p.mat('#4a6a3a'), BE = p.mat('#a8c858'), MO = p.mat('#2a1a1a'), LL = p.mat('#7a9a4a'), TO = p.mat('#e07a8a');
  p.ell(46, 52 - b, 42, 26 + b, SL); p.ell(46, 62 - b * 0.5, 30, 12, BE);
  p.ell(22, 26 - b, 10, 10, SL); p.ell(70, 26 - b, 10, 10, SL);
  eyes(p, 18, 22 - b, 48, ph ? '#ff3030' : '#1a1a0a', 6, 4);
  if (ph) { p.ell(46, 52 - b, 24, 12, MO); p.ell(46, 58 - b, 14, 5, TO); for (let x = 26; x < 68; x += 6) p.poly([[x, 41 - b], [x + 3, 47 - b], [x + 6, 41 - b]], p.flat('#f0f0e0')); }
  else p.curve(18, 48 - b, 46, 58 - b, 74, 48 - b, p.flat('#1a2a10'), 2);
  for (const [x, y] of [[12, 74], [80, 72], [40, 78]]) { p.ell(x, y, 3, 2, LL); p.line(x + 3, y, x + 7, y - 1 + (o.f % 2), LL); }
  const LP = p.mat('#4a8a3a'); p.ell(70, 40 - b, 6, 2, LP); p.ell(24, 44 - b, 5, 2, LP); p.ell(70, 37 - b, 2, 2, p.mat('#f0a0c0'));
}, o => (o.phase ?? 1) >= 2 ? '#a8ff58' : null);
def('boss_hollow_king', 80, 92, (p, o) => {
  const b = BOB[o.f]; const ph = (o.phase ?? 1) >= 2;
  const BN = p.mat('#d8d0c0'), RB = p.mat('#2a2040'), TR = p.mat('#7a5af5'), GD = p.mat('#d4af37'), FL = p.mat(ph ? '#c87aff' : '#9a7af5', { glow: true }), EY = p.flat(ph ? '#ffffff' : '#c8a0ff');
  p.poly([[16, 36 + b], [64, 36 + b], [74, 90], [6, 90]], RB); p.rect(38, 40 + b, 4, 50, TR);
  p.ell(18, 38 + b, 9, 6, GD); p.ell(62, 38 + b, 9, 6, GD);
  p.ell(40, 22 + b, 12, 13, BN); p.rect(32, 30 + b, 16, 6, BN);
  p.ell(35, 22 + b, 3.5, 3.5, p.flat('#0a0a14')); p.ell(46, 22 + b, 3.5, 3.5, p.flat('#0a0a14')); p.px(35, 22 + b, EY); p.px(46, 22 + b, EY);
  for (let x = 33; x < 48; x += 3) p.rect(x, 31 + b, 2, 3, p.flat('#3a3a3a'));
  p.poly([[26, 12 + b], [28, -0 + b + 2], [33, 8 + b], [40, -2 + b + 2], [47, 8 + b], [52, 0 + b + 2], [54, 12 + b]], GD);
  p.line(70, 90, 70, 14 + b, GD, 2); p.ell(70, 12 + b, 4, 4, FL);
  p.ell(12, 56 + b, 3, 6, BN);
  if (ph) for (const [x, y] of [[20, 26], [60, 24], [40, 2], [10, 70], [72, 64]]) p.poly([[x - 3, y + b + 4], [x, y + b - 6 - (o.f % 2) * 2], [x + 3, y + b + 4]], FL);
}, o => (o.phase ?? 1) >= 2 ? '#9a5af5' : '#5a3aa5');
export const ENEMY_SPRITES = E;
