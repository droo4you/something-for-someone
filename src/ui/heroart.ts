// Hi-res hero art (96x100 art pixels, drawn at 2x the enemy resolution). Hand-placed shapes on the
// Pix rasterizer, which auto-shades each material with a 4-tone ramp and adds a selective outline.
import { Pix } from './pix';
import type { Pose, SpriteDef } from './characters';
type Draw = (p: Pix, o: Pose) => void;
const BOB = [0, 1, 2, 1];
const SKIN = '#f6c9a0';
const INK = '#1a1026';

interface Face { iris: string; brow: 'fierce' | 'soft' | 'up' | 'stern'; mouth: 'grin' | 'smile' | 'open' | 'smirk'; skin?: string; hideEyes?: boolean }
interface Cfg { top: string; pants: string; shoe: string; sole: string; skin?: string; sleeve?: string; glove?: string }
interface Parts {
  back?: (b: number) => void; backHair?: (b: number) => void; legs?: (b: number, l1: number, l2: number) => void;
  torso?: (b: number) => void; hair?: (b: number) => void; hat?: (b: number) => void; frontArm?: (b: number, a: number) => void; gear?: (b: number, a: number) => void; backGear?: (b: number) => void;
}

function eye(p: Pix, x: number, y: number, w: number, iris: string, blink: boolean) {
  const D = p.flat(INK), W = p.flat('#ffffff');
  if (blink) { p.rect(x - 1, y + 6, w + 2, 2, D); return; }
  const I = p.flat(iris), IL = p.flat(lighten(iris)), ID = p.flat(darken(iris));
  p.rect(x - 1, y, w + 2, 2, D); // heavy upper lash
  p.px(x + w + 1, y - 1, D); // lash flick
  p.rect(x, y + 2, w, 8, W);
  p.rect(x, y + 2, w, 8, I); p.rect(x, y + 2, w, 2, ID); p.rect(x, y + 7, w, 3, IL);
  p.rect(x + Math.floor(w / 2), y + 4, 2, 4, D); // pupil
  p.rect(x, y + 3, 2, 2, W); p.px(x + w - 1, y + 8, W); // catch-lights
  p.rect(x, y + 10, w, 1, p.flat(darken(iris)));
}
function lighten(h: string) { return mixHex(h, '#ffffff', 0.45); }
function darken(h: string) { return mixHex(h, '#140c1c', 0.5); }
function mixHex(a: string, b: string, t: number) { const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16)); return '#' + pa.map((v, i) => Math.round(v * (1 - t) + pb[i] * t).toString(16).padStart(2, '0')).join(''); }

function face(p: Pix, b: number, f: Face, frame: number) {
  const D = p.flat(INK);
  const blink = frame === 3;
  if (!f.hideEyes) { eye(p, 49, 30 + b, 6, f.iris, blink); eye(p, 61, 30 + b, 5, f.iris, blink); }
  // brows
  const BR = p.flat(INK);
  if (f.brow === 'fierce') { p.line(47, 25 + b, 55, 28 + b, BR, 2); p.line(60, 28 + b, 67, 26 + b, BR, 2); }
  else if (f.brow === 'soft') { p.line(48, 25 + b, 51, 24 + b, BR); p.line(52, 24 + b, 55, 24 + b, BR); p.line(61, 24 + b, 66, 25 + b, BR); }
  else if (f.brow === 'up') { p.line(48, 25 + b, 55, 23 + b, BR, 2); p.line(60, 23 + b, 66, 24 + b, BR, 2); }
  else { p.line(46, 26 + b, 56, 28 + b, BR, 2); p.line(59, 28 + b, 69, 25 + b, BR, 2); }
  // nose + blush
  p.px(60, 42 + b, p.flat(darkenSkin(f.skin)));
  const BL = p.flat('#f28a9a'); for (const bx of [46, 64]) { p.px(bx, 44 + b, BL); p.px(bx + 2, 44 + b, BL); p.px(bx + 1, 45 + b, BL); p.px(bx + 3, 45 + b, BL); }
  // mouth
  const M = p.flat('#6a2236'), T = p.flat('#ffffff'), TG = p.flat('#e8607a');
  if (f.mouth === 'grin') { p.rect(56, 47 + b, 8, 3, M); p.rect(56, 47 + b, 8, 1, T); p.px(62, 48 + b, T); p.rect(57, 49 + b, 5, 1, TG); p.px(55, 46 + b, D); p.px(64, 46 + b, D); }
  else if (f.mouth === 'smile') { p.line(56, 47 + b, 58, 48 + b, D); p.line(58, 48 + b, 62, 48 + b, D); p.px(63, 47 + b, D); }
  else if (f.mouth === 'open') { p.rect(57, 46 + b, 6, 4, M); p.rect(58, 49 + b, 4, 1, TG); p.rect(57, 46 + b, 6, 1, T); }
  else { p.line(56, 48 + b, 61, 48 + b, D); p.px(62, 47 + b, D); p.px(63, 46 + b, D); }
}
function darkenSkin(s?: string) { return mixHex(s ?? SKIN, '#8a4a3a', 0.5); }

function base(p: Pix, o: Pose, c: Cfg, f: Face, parts: Parts) {
  const b = BOB[o.f % 4]; const wk = o.walk ?? -1;
  const S = p.mat(c.skin ?? SKIN), TP = p.mat(c.top), SL = p.mat(c.sleeve ?? c.top), PA = p.mat(c.pants), SH = p.mat(c.shoe), SO = p.mat(c.sole), GL = c.glove ? p.mat(c.glove) : S;
  parts.back?.(b);
  parts.backHair?.(b);
  // legs + shoes
  const l1 = wk < 0 ? 0 : [0, -4, 0, 4][wk], l2 = -l1;
  p.rect(38 + l2, 78, 9, 12, PA); p.rect(51 + l1, 78, 9, 12, PA);
  const shoe = (x: number) => { p.poly([[x - 1, 88], [x + 10, 88], [x + 14, 92], [x + 14, 96], [x - 1, 96]], SH); p.rect(x - 1, 95, 16, 2, SO); };
  shoe(37 + l2); shoe(50 + l1);
  parts.legs?.(b, l1, l2);
  // back arm
  p.ell(32, 64 + b, 5, 8, SL); p.ell(31, 73 + b, 4, 4, GL);
  // torso
  p.poly([[35, 55 + b], [61, 55 + b], [64, 81], [32, 81]], TP);
  parts.torso?.(b);
  // neck + head
  p.rect(43, 52 + b, 10, 5, p.mat(darkenSkin(c.skin)));
  p.ell(48, 33 + b, 23, 21, S);
  p.ell(28, 36 + b, 4, 5, S); p.px(28, 36 + b, p.flat(darkenSkin(c.skin)));
  face(p, b, { ...f, skin: c.skin }, o.f % 4);
  parts.hair?.(b);
  parts.hat?.(b);
  // front arm
  const a = wk >= 0 ? [0, 2, 0, -2][wk] : 0;
  parts.backGear?.(b);
  if (parts.frontArm) parts.frontArm(b, a); else { p.ell(64, 64 + b + a, 5, 8, SL); p.ell(66, 73 + b + a, 4, 4, GL); }
  parts.gear?.(b, a);
}

// ---------------------------------------------------------------- BASS BRAWLER (dubstep)
const bass: Draw = (p, o) => {
  const e = o.evo ?? 0;
  const hood = e >= 2 ? '#3a1858' : e >= 1 ? '#34204e' : '#2e2840';
  const pink = '#ff3ec8', cyan = '#3ae8ff';
  base(p, o, { top: hood, pants: '#1c1a2a', shoe: e >= 1 ? '#ff3ec8' : '#e8e4f8', sole: '#ffffff', glove: '#2a2238' }, { iris: e >= 2 ? '#ffe03a' : '#c04aff', brow: 'fierce', mouth: 'grin', hideEyes: e >= 2 }, {
    back: b => {
      if (e >= 2) { // speaker-stack backpack
        const C = p.mat('#221a30'), CN = p.mat('#3e3254'), R = p.mat(pink);
        p.rect(8, 34 + b, 24, 40, C);
        for (const cy of [44, 62]) { p.ell(20, cy + b, 8, 8, R); p.ell(20, cy + b, 6, 6, CN); p.ell(20, cy + b, 2, 2, p.flat('#ffffff')); }
        const L = p.flat(cyan); for (let x = 10; x < 31; x += 3) p.px(x, 36 + b, L);
      }
      if (e >= 1) { const CP = p.mat(e >= 2 ? '#5a1a7a' : '#4a2268'); const sw = o.f % 2 + (o.walk !== undefined ? 2 : 0); p.poly([[36, 56 + b], [56, 56 + b], [50 - sw, 92], [24 - sw * 2, 94], [28, 70]], CP); }
    },
    backHair: b => { const H = p.mat('#c02a9a'); p.ell(44, 26 + b, 20, 13, H); },
    legs: (b, l1, l2) => { const CF = p.mat('#2a2640'); p.rect(38 + l2, 86, 9, 3, CF); p.rect(51 + l1, 86, 9, 3, CF); const LC = p.flat(pink); p.px(41 + l2, 90, LC); p.px(44 + l2, 91, LC); p.px(54 + l1, 90, LC); p.px(57 + l1, 91, LC); },
    torso: b => {
      const HD = p.mat(mixHex(hood, '#ffffff', 0.12)); p.ell(48, 56 + b, 16, 5, HD); // bunched hood
      const PK = p.mat(mixHex(hood, '#000000', 0.25)); p.rect(39, 69 + b, 18, 9, PK); p.rect(39, 69 + b, 18, 1, p.flat(mixHex(hood, '#ffffff', 0.25)));
      const DS = p.flat(e >= 1 ? pink : '#d8d0f0'); p.rect(44, 59 + b, 1, 9, DS); p.rect(51, 59 + b, 1, 8, DS); p.rect(44, 68 + b, 1, 2, p.flat('#ffffff')); p.rect(51, 67 + b, 1, 2, p.flat('#ffffff'));
      const HM = p.mat(mixHex(hood, '#000000', 0.2)); p.rect(32, 78, 33, 4, HM);
      const W = p.flat(e >= 1 ? cyan : '#8a7aa8'); [0, 2, -1, 3, 1, -2, 2, 0].forEach((h, i) => p.rect(54 + i, 63 + b - Math.abs(h), 1, 1 + Math.abs(h) * 2, W)); // waveform print
      if (e >= 1) { const N = p.flat(pink); p.line(35, 56 + b, 32, 81, N); }
      if (e >= 1) { const CH = p.flat('#ffe03a'); for (let i = 0; i < 9; i++) p.px(41 + i * 1.6, 57 + b + Math.sin(i / 8 * Math.PI) * 5, CH); }
    },
    hair: b => {
      const ST = p.mat('#3a2a4a'); p.poly([[26, 30 + b], [30, 18 + b], [40, 12 + b], [36, 22 + b], [31, 34 + b]], ST); p.poly([[60, 14 + b], [68, 20 + b], [70, 28 + b], [63, 22 + b]], ST);
      const H = p.mat(pink);
      p.poly([[34, 20 + b], [35, 6 + b], [40, 14 + b], [42, 0 + b], [47, 11 + b], [51, -1 + b], [54, 10 + b], [60, 2 + b], [60, 14 + b], [64, 18 + b], [50, 20 + b]], H);
      const HL = p.flat('#ff9ae8'); p.line(41, 4 + b, 43, 14 + b, HL); p.line(51, 2 + b, 51, 13 + b, HL); p.line(59, 6 + b, 57, 15 + b, HL);
      if (e >= 2) { const T = p.flat('#ffffff'); for (const [x, y] of [[35, 6], [42, 0], [51, -1], [60, 2]]) p.px(x, y + b + 1, T); }
    },
    hat: b => {
      // headphones: band over the head, cup on the visible ear
      const BD = p.mat('#5a4a7a'); p.curve(27, 34 + b, 44, 4 + b, 68, 24 + b, BD, 4); const BH = p.flat(e >= 1 ? pink : cyan); p.curve(28, 31 + b, 44, 3 + b, 66, 21 + b, BH, 1);
      const RG = p.mat(e >= 1 ? pink : cyan), CU = p.mat('#2a2238');
      p.ell(28, 37 + b, 7, 9, RG); p.ell(28, 37 + b, 5, 7, CU); p.ell(27, 36 + b, 2, 3, p.mat('#4a3a64'));
      p.rect(69, 22 + b, 3, 7, CU);
      if (e === 1) { const SG = p.mat('#1a1428'), LN = p.flat(cyan); p.rect(44, 19 + b, 26, 5, SG); p.rect(45, 20 + b, 24, 1, LN); }
      if (e >= 2) { const V = p.mat('#ffe03a'); p.rect(45, 29 + b, 27, 10, V); const VL = p.flat('#fff6b0'); p.rect(47, 31 + b, 10, 1, VL); p.rect(48, 33 + b, 4, 1, VL); const EY = p.flat('#ff3ec8'); p.rect(51, 33 + b, 4, 3, EY); p.rect(63, 33 + b, 4, 3, EY); }
    },
    frontArm: (b, a) => { const SL = p.mat(hood); p.ell(63, 63 + b + a, 5, 7, SL); },
    gear: (b, a) => {
      const s = e >= 1 ? 2 : 0; const y = 60 + b + a, x = 60;
      const G = p.mat(e >= 2 ? '#4a2a6a' : '#3a3048'), R = p.mat(e >= 1 ? pink : '#b04aff'), C = p.mat('#1a1428'), DM = p.mat('#5a4a74');
      p.rect(x - s, y - s, 24 + s * 2, 24 + s * 2, G);
      p.rect(x - s + 2, y - s + 2, 20 + s * 2, 1, p.flat('#6a5a84'));
      const cx = x + 12, cy = y + 12;
      p.ell(cx, cy, 9 + s / 2, 9 + s / 2, R); p.ell(cx, cy, 7 + s / 2, 7 + s / 2, C); p.ell(cx, cy, 4, 4, DM); p.ell(cx - 1, cy - 1, 1.5, 1.5, p.flat('#ffffff'));
      const BL = p.flat('#8a7aa8'); for (const [bx, by] of [[x + 1, y + 1], [x + 21 + s, y + 1], [x + 1, y + 21 + s], [x + 21 + s, y + 21 + s]]) p.px(bx, by, BL);
      if (e >= 1 && o.f % 2) { const W = p.flat('#ff9ae8'); p.curve(x + 28 + s, y + 4, x + 32 + s, cy, x + 28 + s, y + 20, W); p.curve(x + 32 + s, y + 1, x + 37 + s, cy, x + 32 + s, y + 23, W); }
    },
  });
};

// ---------------------------------------------------------------- FLOW HEALER (house)
const flow: Draw = (p, o) => {
  const e = o.evo ?? 0;
  const cy = '#3ae8ff', pk = '#ff6ad8';
  const robe = e >= 2 ? '#f4f8ff' : e >= 1 ? '#2a6ab0' : '#3a7ad8';
  base(p, o, { top: e >= 2 ? '#fff6dc' : '#f0f4ff', pants: e >= 2 ? '#c8f0ff' : '#5a8ae8', shoe: '#f0f4ff', sole: e >= 2 ? '#ffe08a' : cy, sleeve: robe }, { iris: '#1ab8c8', brow: 'soft', mouth: 'smile' }, {
    back: b => {
      if (e >= 2) { const H = p.mat('#ffe08a'); for (let i = 0; i < 60; i++) { const an = (i / 60) * Math.PI * 2; p.px(26 + Math.cos(an) * 10, 60 + b + Math.sin(an) * 24, i % 6 < 3 ? H : p.flat(cy)); } }
      // flowing robe / kimono behind the body
      const RB = p.mat(robe); const sw = o.f % 2 + (o.walk !== undefined ? 2 : 0); const len = e >= 1 ? 98 : 88;
      p.poly([[34, 56 + b], [60, 56 + b], [62, len - 6], [40, len], [22 - sw, len - 2], [26, 70]], RB);
      const HM = p.flat(e >= 2 ? '#ffe08a' : pk); for (let x = 23 - sw; x < 62; x += 2) p.px(x, len - 4 + ((x >> 1) % 2), HM);
    },
    backHair: b => { const H = p.mat('#20b8d8'); p.ell(44, 30 + b, 23, 20, H); const sw = o.f % 2; p.poly([[24, 30 + b], [44, 34 + b], [40, 70 + b], [30, 76 + sw], [20, 66], [22, 44 + b]], H); const SL = p.flat('#8af4ff'); p.line(26, 46 + b, 28, 68, SL); p.line(33, 46 + b, 34, 70, SL); },
    torso: b => {
      const SK = p.mat(e >= 2 ? '#ffffff' : '#b8e8ff'); p.poly([[34, 72], [62, 72], [68, 88], [28, 88]], SK); // flowy layered skirt
      const SK2 = p.mat(e >= 2 ? '#c8f0ff' : '#3ae8ff'); p.poly([[33, 78], [63, 78], [70, 90], [26, 90]], SK2);
      const SE = p.flat(e >= 2 ? '#ffe08a' : pk); for (let x = 27; x < 70; x += 3) p.px(x, 89, SE);
      const OB = p.mat(e >= 2 ? '#ffe08a' : pk); p.rect(33, 68 + b, 30, 5, OB); p.rect(46, 66 + b, 6, 9, OB); // obi sash + knot
      const RB = p.mat(robe); p.poly([[35, 55 + b], [42, 55 + b], [46, 68 + b], [33, 68 + b]], RB); p.poly([[54, 55 + b], [61, 55 + b], [62, 68 + b], [50, 68 + b]], RB); // robe lapels
      const FL = p.flat('#ffffff'); p.px(39, 62 + b, FL); p.px(57, 63 + b, FL);
    },
    hair: b => {
      const H = p.mat(cy);
      p.poly([[25, 34 + b], [27, 20 + b], [36, 11 + b], [50, 8 + b], [64, 11 + b], [71, 22 + b], [72, 30 + b], [66, 20 + b], [60, 22 + b], [54, 17 + b], [47, 23 + b], [42, 19 + b], [36, 27 + b], [32, 32 + b], [29, 40 + b]], H);
      const HL = p.flat('#b8faff'); p.line(36, 15 + b, 44, 12 + b, HL); p.line(56, 12 + b, 62, 14 + b, HL);
      p.curve(70, 24 + b, 74, 34 + b, 71, 46 + b, H, 4, true); // side lock
      const GM = p.flat('#ffffff'); p.px(60, 39 + b, GM); // face gem
      p.px(59, 40 + b, p.flat(pk)); p.px(61, 40 + b, p.flat(pk));
    },
    hat: b => {
      if (e === 0) { const CL = p.mat(pk); p.ell(34, 16 + b, 3, 3, CL); p.px(34, 16 + b, p.flat('#ffffff')); }
      if (e >= 1) { // flower crown
        const cols = e >= 2 ? ['#ffe08a', '#ffffff', '#ffb8e8'] : [pk, '#ffe03a', '#ffffff'];
        const LF = p.mat('#4ad87a'); p.curve(27, 22 + b, 46, 6 + b, 69, 16 + b, LF, 2);
        [[28, 21], [34, 13], [41, 9], [48, 8], [55, 9], [62, 11], [68, 16]].forEach(([x, y], i) => { const F = p.mat(cols[i % 3]); p.ell(x, y + b, 3, 3, F); p.px(x, y + b, p.flat('#ffe03a')); });
      }
      if (e >= 2) { const HL = p.flat('#ffe08a'); for (let i = 0; i < 28; i++) { const an = (i / 28) * Math.PI * 2; p.px(48 + Math.cos(an) * 16, 1 + Math.sin(an) * 2, HL); } }
    },
    frontArm: (b, a) => { const RB = p.mat(robe); p.poly([[58, 57 + b + a], [70, 58 + b + a], [76, 74 + b + a], [62, 76 + b + a]], RB); const T = p.flat(e >= 2 ? '#ffe08a' : pk); p.line(63, 76 + b + a, 76, 74 + b + a, T); },
    gear: (b, a) => {
      // folding fan, held open beside the face
      const cx = 76, cyy = 70 + b + a, r = e >= 2 ? 24 : e >= 1 ? 21 : 18;
      const c1 = e >= 2 ? '#ffffff' : pk, c2 = e >= 2 ? '#ffe08a' : cy;
      const ribs = 9; const a0 = -Math.PI * 0.72, a1 = -Math.PI * 0.02;
      for (let i = 0; i < ribs; i++) { const t0 = a0 + ((a1 - a0) * i) / ribs, t1 = a0 + ((a1 - a0) * (i + 1)) / ribs; const M = p.mat(i % 2 ? c1 : c2); p.poly([[cx, cyy], [cx + Math.cos(t0) * r, cyy + Math.sin(t0) * r], [cx + Math.cos((t0 + t1) / 2) * (r + 1), cyy + Math.sin((t0 + t1) / 2) * (r + 1)], [cx + Math.cos(t1) * r, cyy + Math.sin(t1) * r]], M); }
      const RB = p.flat('#5a3a2a'); for (let i = 0; i <= ribs; i++) { const t = a0 + ((a1 - a0) * i) / ribs; p.line(cx, cyy, cx + Math.cos(t) * (r * 0.45), cyy + Math.sin(t) * (r * 0.45), RB); }
      if (e >= 1) { const LED = p.flat(o.f % 2 ? '#ffffff' : '#ffe03a'); for (let i = 0; i <= ribs; i++) { const t = a0 + ((a1 - a0) * i) / ribs; p.px(cx + Math.cos(t) * (r - 2), cyy + Math.sin(t) * (r - 2), LED); } }
      p.ell(cx, cyy, 2, 2, p.mat('#ffe03a')); p.ell(cx + 1, cyy + 3, 3.5, 3.5, p.mat(SKIN));
    },
  });
};

// ---------------------------------------------------------------- TEMPO DANCER (drum & bass)
const tempo: Draw = (p, o) => {
  const e = o.evo ?? 0;
  const lime = '#b8ff3a', mag = '#ff3ec8';
  const jk = e >= 2 ? '#1a1a3a' : '#26204a';
  base(p, o, { top: jk, pants: '#26204a', shoe: '#ffffff', sole: e >= 1 ? lime : '#9a9ab8', sleeve: jk }, { iris: '#5ac81a', brow: 'up', mouth: 'open', hideEyes: e >= 2 }, {
    back: b => {
      const SC = p.mat(e >= 2 ? '#e8ff9a' : lime); const len = e >= 1 ? 30 : 18; const sw = o.f % 2;
      p.curve(38, 56 + b, 24, 52 + sw * 3, 38 - len, 46 + sw * 5, SC, 6, true); // scarf tail streaming behind
      if (e >= 2) { const WG = p.mat('#3affd8'); const WG2 = p.mat('#b8fff0'); p.poly([[30, 62 + b], [4, 36 + b + sw], [12, 58 + b], [2, 66 + b], [24, 72 + b]], WG); p.line(8, 42 + b + sw, 26, 64 + b, WG2); }
    },
    backHair: b => { const H = p.mat('#8ad82a'); p.ell(44, 28 + b, 22, 18, H); p.ell(30, 12 + b, 8, 8, H); p.ell(58, 9 + b, 8, 8, H); },
    legs: (b, l1, l2) => { const W = p.flat('#ffffff'); p.rect(40 + l2, 78, 1, 10, W); p.rect(53 + l1, 78, 1, 10, W); const LC = p.flat(lime); for (const x of [40 + l2, 53 + l1]) { p.px(x + 2, 90, LC); p.px(x + 4, 90, LC); p.px(x + 6, 91, LC); } if (e >= 1) { const G = p.flat(lime); p.rect(36 + l2, 97, 16, 1, G); p.rect(49 + l1, 97, 16, 1, G); } },
    torso: b => {
      const ZP = p.flat('#c8c8e0'); p.rect(48, 57 + b, 1, 22, ZP); p.rect(47, 60 + b, 3, 2, p.flat('#ffffff'));
      const CL = p.mat(lime); p.poly([[38, 54 + b], [47, 56 + b], [43, 61 + b]], CL); p.poly([[58, 54 + b], [49, 56 + b], [53, 61 + b]], CL); // collar
      const ST = p.flat(lime); p.rect(35, 58 + b, 1, 22, ST); p.rect(60, 58 + b, 1, 22, ST);
      const HM = p.mat('#3a3268'); p.rect(32, 78, 33, 4, HM); p.rect(32, 79, 33, 1, p.flat(lime));
      const LG = p.flat(mag); p.rect(53, 63 + b, 4, 3, LG); p.px(54, 64 + b, p.flat('#ffffff')); // tiny logo
    },
    hair: b => {
      const H = p.mat(lime);
      p.poly([[25, 34 + b], [26, 20 + b], [36, 11 + b], [52, 9 + b], [66, 13 + b], [73, 24 + b], [67, 23 + b], [69, 30 + b], [61, 23 + b], [55, 27 + b], [50, 20 + b], [42, 27 + b], [38, 20 + b], [30, 30 + b], [28, 40 + b]], H);
      const HL = p.flat('#e8ffb0'); p.line(38, 14 + b, 48, 12 + b, HL); p.px(31, 9 + b, HL); p.px(32, 9 + b, HL); p.px(56, 6 + b, HL);
    },
    hat: b => {
      const SB = p.mat(mag); p.curve(26, 24 + b, 48, 12 + b, 71, 22 + b, SB, 4); // sweatband
      p.rect(44, 15 + b, 4, 2, p.flat('#ffffff'));
      if (e >= 2) { const V = p.mat(mag); p.rect(46, 30 + b, 26, 9, V); const VL = p.flat('#ffb8ec'); p.rect(48, 32 + b, 12, 1, VL); p.rect(50, 34 + b, 4, 1, VL); }
    },
    gear: (b, a) => {
      const G1 = p.mat(lime), G2 = p.mat(mag);
      const tip = o.f % 2;
      p.line(68, 74 + b + a, 82, 52 + b + a - tip, G1, 3); p.line(28, 74 + b, 16, 54 + b + tip, G2, 3);
      if (e >= 1) { const W = p.flat('#ffffff'); p.px(82, 51 + b + a - tip, W); p.px(16, 53 + b + tip, W); const T1 = p.flat('#e8ffb0'); p.px(85, 48 + b + a, T1); p.px(13, 50 + b, p.flat('#ffb8ec')); }
      p.ell(67, 74 + b + a, 4, 4, p.mat(SKIN)); p.ell(29, 74 + b, 4, 4, p.mat(SKIN));
      const WB = p.mat(mag); p.rect(63, 69 + b + a, 7, 2, WB); // wristband
    },
  });
};

// ---------------------------------------------------------------- WALL OF SOUND (hardstyle)
const wall: Draw = (p, o) => {
  const e = o.evo ?? 0;
  const orange = '#ff9a2a', gold = '#ffcf3a';
  const jk = e >= 2 ? '#4a2a6a' : '#2a2438';
  base(p, o, { top: jk, pants: '#3a3428', shoe: '#1a1424', sole: '#4a4038', skin: '#e9be93', sleeve: jk }, { iris: '#ff9a2a', brow: 'stern', mouth: 'smirk', hideEyes: true }, {
    back: b => { if (e >= 1) { const CP = p.mat(e >= 2 ? '#2a1a3a' : '#5a3a20'); const sw = o.f % 2 + (o.walk !== undefined ? 2 : 0); p.poly([[30, 56 + b], [62, 56 + b], [58 - sw, 96], [20 - sw * 2, 96], [24, 70]], CP); } },
    backHair: b => { const H = p.mat('#d8701a'); p.ell(46, 26 + b, 21, 14, H); },
    legs: (b, l1, l2) => { const PK = p.mat('#4a4234'); p.rect(37 + l2, 81, 4, 5, PK); p.rect(56 + l1, 81, 4, 5, PK); const LC = p.flat('#8a7a5a'); for (const x of [38 + l2, 51 + l1]) for (let i = 0; i < 3; i++) p.px(x + 3 + i * 2, 89 + (i % 2), LC); },
    torso: b => {
      // bulky puffer jacket: wide shoulders + quilting
      const PJ = p.mat(jk); p.ell(34, 60 + b, 9, 7, PJ); p.ell(62, 60 + b, 9, 7, PJ); p.poly([[30, 58 + b], [66, 58 + b], [66, 82], [30, 82]], PJ);
      const Q = p.flat(mixHex(jk, '#000000', 0.35)); for (const y of [64, 70, 76]) p.rect(31, y + b, 34, 1, Q);
      const ZP = p.flat(gold); p.rect(48, 57 + b, 1, 25, ZP);
      const FR = p.mat(orange); p.ell(48, 56 + b, 15, 4, FR); // collar trim
      const CH = p.mat(gold); for (let i = 0; i < 11; i++) p.ell(41 + i * 1.4, 58 + b + Math.sin((i / 10) * Math.PI) * 6, 1, 1, CH); p.ell(48, 65 + b, 2.5, 2.5, CH); // chain + medallion
      if (e >= 1) { const SD = p.mat('#c8c8d8'); for (const [x, y] of [[29, 57], [33, 54], [38, 55], [58, 55], [63, 54], [67, 57]]) p.ell(x, y + b, 1.5, 1.5, SD); }
    },
    hair: b => {
      const H = p.mat(orange);
      p.poly([[27, 30 + b], [28, 4 + b], [64, 2 + b], [68, 26 + b], [62, 18 + b], [52, 21 + b], [40, 18 + b], [32, 26 + b]], H); // flat-top
      const HL = p.flat('#ffc88a'); p.rect(31, 5 + b, 30, 1, HL); const HD = p.flat('#b8581a'); p.line(36, 8 + b, 36, 16 + b, HD); p.line(46, 7 + b, 46, 17 + b, HD); p.line(56, 7 + b, 56, 16 + b, HD);
      const SID = p.mat('#7a4a2a'); p.rect(28, 28 + b, 5, 9, SID); // sideburn
    },
    hat: b => {
      // wraparound shades
      const SG = p.mat('#141020'); p.poly([[42, 28 + b], [72, 27 + b], [71, 37 + b], [62, 38 + b], [58, 33 + b], [54, 38 + b], [44, 37 + b]], SG); p.rect(30, 30 + b, 13, 2, SG);
      const RF = p.flat(e >= 2 ? '#ff3ec8' : orange); p.line(46, 30 + b, 50, 30 + b, RF); p.line(47, 32 + b, 48, 32 + b, RF); p.line(62, 30 + b, 66, 30 + b, RF);
      if (e >= 2) { const CR = p.mat(gold); p.poly([[32, 4 + b], [35, -6 + b + 6], [38, 4 + b]], CR); p.poly([[42, 3 + b], [46, -4 + b + 4], [50, 3 + b]], CR); p.poly([[54, 3 + b], [58, -6 + b + 6], [62, 3 + b]], CR); p.rect(32, 3 + b, 30, 2, CR); const GM = p.flat('#ff3ec8'); p.px(46, 2 + b, GM); }
    },
    frontArm: (b, a) => { const PJ = p.mat(jk); p.ell(64, 64 + b + a, 6, 9, PJ); },
    gear: (b, a) => {
      // speaker shield
      const big = e >= 1 ? 3 : 0; const x = 56 - big, y = 44 + b + a - big, w = 30 + big * 2, h = 46 + big * 2;
      const RM = p.mat(gold), SH = p.mat('#2a2238'), CN = p.mat('#46385a'), LED = p.flat(e >= 2 ? '#ff3ec8' : orange), MS = p.flat('#3a2e4c');
      p.rect(x, y, w, h, RM); p.rect(x + 2, y + 2, w - 4, h - 4, SH);
      for (let yy = y + 4; yy < y + h - 4; yy += 2) for (let xx = x + 4 + ((yy >> 1) % 2); xx < x + w - 4; xx += 2) p.px(xx, yy, MS); // grille mesh
      const cx = x + w / 2;
      p.ell(cx, y + 14 + big / 2, 10 + big / 2, 10 + big / 2, CN); p.ell(cx, y + 14 + big / 2, 6, 6, p.mat('#1a1428')); p.ell(cx, y + 14 + big / 2, 2.5, 2.5, LED);
      p.ell(cx, y + h - 14, 7, 7, CN); p.ell(cx, y + h - 14, 3, 3, p.mat('#1a1428'));
      for (const [bx, by] of [[x + 3, y + 3], [x + w - 4, y + 3], [x + 3, y + h - 4], [x + w - 4, y + h - 4]]) p.px(bx, by, p.flat('#fff2b0'));
      p.rect(x + 6, y + h - 4, w - 12, 1, LED);
    },
  });
};

const AURAS: Record<string, string[]> = { bass: ['', '#ff3ec8', '#d070ff'], flow: ['', '#3ae8ff', '#b8f6ff'], tempo: ['', '#b8ff3a', '#e8ff9a'], wall: ['', '#ff9a2a', '#ffcf3a'] };
const def = (id: string, draw: Draw): SpriteDef => ({ w: 96, h: 100, res: 2, draw, aura: o => AURAS[id][o.evo ?? 0] || null });
export const HERO_SPRITES: Record<string, SpriteDef> = { bass: def('bass', bass), flow: def('flow', flow), tempo: def('tempo', tempo), wall: def('wall', wall) };
