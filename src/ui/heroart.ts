// Hi-res volumetric heroes (136x144 art px), modelled on refs/target-heroes.jpg. Each hero has its
// own rig/pose; heads are big and round (about 1/3 of height) with soft jaws, ears and large eyes.
// Expression frames: neutral, 'shout' (attack/cast) and 'hurt'. Rendered by the Vol renderer.
import { Vol } from './vol';
import type { Pose, SpriteDef } from './characters';
export const HW = 136, HH = 160;
type P = [number, number];
const INK = '#160c20';
type Expr = 'neutral' | 'shout' | 'hurt';
interface FaceCfg { skin: string; iris: string; brow: 'fierce' | 'calm' | 'excited' | 'stern'; mouth: 'smirk' | 'pout' | 'oh' | 'flat'; hideEyes?: boolean; blush?: boolean }
const dk = (h: string, k = 0.55) => { const n = parseInt(h.slice(1), 16); const f = (x: number) => Math.round(x * k).toString(16).padStart(2, '0'); return '#' + f((n >> 16) & 255) + f((n >> 8) & 255) + f(n & 255); };
const lt = (h: string, k = 0.45) => { const n = parseInt(h.slice(1), 16); const f = (x: number) => Math.round(x + (255 - x) * k).toString(16).padStart(2, '0'); return '#' + f((n >> 16) & 255) + f((n >> 8) & 255) + f(n & 255); };
function exprOf(o: Pose): Expr { return (o as any).expr ?? 'neutral'; }

/** Round cranium + soft jaw + ear + neck. Returns nothing; face drawn by face(). */
function headShape(v: Vol, cx: number, cy: number, skin: string) {
  const S = v.mat(skin, 'skin');
  v.part(() => {
    v.cap(cx - 1, cy + 16, cx - 1, cy + 24, 5.5, 6, S); // neck
    v.ell(cx, cy, 22, 21, S, [-0.05, -0.05]);          // cranium
    v.ell(cx + 3, cy + 9, 16, 12, S, [0.05, 0.1]);      // cheeks + soft jaw
    v.ell(cx + 6, cy + 16, 8, 5, S, [0.1, 0.3]);        // chin
    v.ell(cx - 18, cy + 4, 4, 6, S, [-0.4, 0]);         // ear
    v.ell(cx + 16, cy + 6, 2.5, 2.5, S, [0.5, 0.1]);    // nose bump
  });
  v.dot(cx - 18, cy + 3, dk(skin, 0.72)); v.dot(cx - 18, cy + 4, dk(skin, 0.72)); v.dot(cx - 17, cy + 5, dk(skin, 0.8));
}
function eye(v: Vol, x: number, y: number, w: number, h: number, iris: string, ex: Expr, near: boolean) {
  if (ex === 'hurt') { // squeezed shut: > <
    const c = INK; if (near) { v.dline(x, y + 2, x + w - 1, y + h / 2, c); v.dline(x, y + h - 2, x + w - 1, y + h / 2, c); } else { v.dline(x + w - 1, y + 2, x, y + h / 2, c); v.dline(x + w - 1, y + h - 2, x, y + h / 2, c); }
    return;
  }
  const top = ex === 'shout' ? 3 : 0; // fierce lid cuts the top
  v.drect(x, y + top, w, h - top, '#ffffff');
  const ix = x + Math.floor(w * 0.3), iw = w - Math.floor(w * 0.3);
  v.drect(ix, y + top, iw, h - top, iris); v.drect(ix, y + top, iw, 2, dk(iris, 0.45)); v.drect(ix, y + h - 3, iw, 2, lt(iris, 0.35));
  v.drect(ix + Math.floor(iw / 2) - 1, y + top + 2, 3, Math.max(2, h - top - 5), INK); // pupil
  v.drect(ix, y + top + 1, 2, 2, '#ffffff'); v.dot(ix + iw - 1, y + h - 2, '#ffffff'); // highlights
  // lashes: thick upper lid, flick at the outer corner, thin lower lid
  if (ex === 'shout') v.dline(x - 1, y + (near ? 1 : 3), x + w, y + (near ? 3 : 1), INK); else v.drect(x - 1, y - 1, w + 2, 2, INK);
  v.dot(near ? x - 2 : x + w + 1, y - 2, INK); v.dot(near ? x - 1 : x + w, y - 2, INK);
  v.drect(x, y + h, w, 1, '#9a5a5a');
}
function face(v: Vol, cx: number, cy: number, f: FaceCfg, ex: Expr) {
  const ny = cy - 1; const nx = cx - 3, fx = cx + 10;
  if (!f.hideEyes) { eye(v, nx, ny, 8, 10, f.iris, ex, true); eye(v, fx, ny, 6, 10, f.iris, ex, false); }
  // brows
  const by = ny - 4; const B = INK;
  const brow = ex === 'shout' ? 'fierce' : ex === 'hurt' ? 'worry' : f.brow;
  const L = (x0: number, y0: number, x1: number, y1: number) => { v.dline(x0, y0, x1, y1, B); v.dline(x0, y0 + 1, x1, y1 + 1, B); };
  if (brow === 'fierce') { L(nx - 1, by - 1, nx + 8, by + 2); L(fx, by + 2, fx + 6, by - 1); }
  else if (brow === 'calm') { L(nx, by + 1, nx + 7, by); v.dline(fx, by, fx + 5, by + 1, B); }
  else if (brow === 'excited') { L(nx, by, nx + 7, by - 2); L(fx, by - 2, fx + 5, by - 1); }
  else if (brow === 'stern') { L(nx - 2, by, nx + 8, by + 2); L(fx - 1, by + 2, fx + 7, by - 1); }
  else { L(nx, by + 2, nx + 7, by - 1); L(fx, by - 1, fx + 5, by + 2); } // worry
  // nose shadow + blush
  v.dot(cx + 15, cy + 9, dk(f.skin, 0.7)); v.dot(cx + 14, cy + 10, dk(f.skin, 0.72)); v.dot(cx + 15, cy + 10, dk(f.skin, 0.65));
  if (f.blush !== false) { const P = '#f2869a'; for (const [x, y] of [[nx, cy + 11], [nx + 2, cy + 11], [nx + 1, cy + 12], [fx + 2, cy + 11], [fx + 4, cy + 11]]) v.dot(x, y, P); }
  // mouth
  const mx = cx + 6, my = cy + 15; const R = '#5a1626', T = '#ffffff', TG = '#d84a66';
  const m = ex === 'shout' ? 'shout' : ex === 'hurt' ? 'grit' : f.mouth;
  if (m === 'shout') { v.drect(mx, my - 2, 8, 6, R); v.drect(mx, my - 2, 8, 1, T); v.drect(mx + 2, my + 2, 5, 2, TG); v.dot(mx - 1, my - 2, INK); v.dot(mx + 8, my - 2, INK); }
  else if (m === 'grit') { v.drect(mx, my, 8, 3, T); v.drect(mx - 1, my - 1, 10, 1, INK); v.drect(mx - 1, my + 3, 10, 1, INK); v.dot(mx + 3, my + 1, '#c8c8d8'); v.dot(mx + 5, my + 1, '#c8c8d8'); v.dot(cx - 14, cy - 6, '#bfe8ff'); v.dot(cx - 14, cy - 5, '#7ac8f0'); v.dot(cx - 15, cy - 5, '#bfe8ff'); }
  else if (m === 'smirk') { v.drect(mx, my, 7, 3, R); v.drect(mx, my, 7, 1, T); v.dot(mx + 5, my + 1, T); v.drect(mx + 1, my + 2, 4, 1, TG); v.dot(mx - 1, my - 1, INK); v.dot(mx + 7, my - 1, INK); }
  else if (m === 'pout') { v.dline(mx + 1, my + 1, mx + 5, my + 1, INK); v.dot(mx + 2, my + 2, '#c86a7a'); v.dot(mx + 3, my + 2, '#c86a7a'); }
  else if (m === 'oh') { v.drect(mx + 1, my - 1, 5, 5, R); v.drect(mx + 2, my + 2, 3, 1, TG); v.dot(mx + 1, my - 1, INK); v.dot(mx + 5, my - 1, INK); v.dot(mx + 1, my + 3, INK); v.dot(mx + 5, my + 3, INK); }
  else { v.dline(mx, my + 1, mx + 6, my + 1, INK); v.dot(mx + 7, my, INK); }
}
/** Limb: two tapered capsules with a crease at the joint. */
function limb(v: Vol, a: P, j: P, c: P, r0: number, r1: number, m: number) {
  v.part(() => { v.cap(a[0], a[1], j[0], j[1], r0, (r0 + r1) / 2, m); v.cap(j[0], j[1], c[0], c[1], (r0 + r1) / 2, r1, m); });
  v.fold(j[0] - 4, j[1] - 3, j[0], j[1] + 1, j[0] + 4, j[1] - 3, 1, 0.6);
}
function hand(v: Vol, x: number, y: number, skin: string, r = 4.5) { const S = v.mat(skin, 'skin'); v.part(() => { v.ell(x, y, r, r, S); v.ell(x + r * 0.6, y - r * 0.5, r * 0.45, r * 0.45, S); }); v.dot(x - 1, y + 1, dk(skin, 0.75)); v.dot(x + 1, y + 1, dk(skin, 0.75)); }
function hiTop(v: Vol, x: number, y: number, up: string, trim: string, sole: string, soleKind: 'rubber' | 'emit' = 'rubber') {
  const U = v.mat(up, 'plastic'), Tm = v.mat(trim, 'plastic'), So = v.mat(sole, soleKind);
  v.part(() => { v.poly([[x - 8, y - 12], [x + 4, y - 12], [x + 6, y - 5], [x + 15, y - 2], [x + 16, y + 4], [x - 9, y + 4]], U, 4); });
  v.poly([[x - 2, y - 6], [x + 8, y - 4], [x + 6, y + 1], [x - 4, y + 1]], Tm, 2);
  v.poly([[x - 10, y + 3], [x + 17, y + 3], [x + 17, y + 8], [x - 10, y + 8]], So, 2);
  for (let i = 0; i < 3; i++) v.dline(x - 5 + i * 3, y - 10 + i * 2, x - 1 + i * 3, y - 10 + i * 2, '#ffffff');
}
function boot(v: Vol, x: number, y: number) {
  const B = v.mat('#2a2234', 'plastic'), So = v.mat('#120e18', 'rubber');
  v.part(() => { v.poly([[x - 9, y - 13], [x + 5, y - 13], [x + 7, y - 4], [x + 16, y - 2], [x + 17, y + 4], [x - 10, y + 4]], B, 4); });
  v.poly([[x - 11, y + 3], [x + 18, y + 3], [x + 18, y + 9], [x - 11, y + 9]], So, 2);
  for (let i = 0; i < 4; i++) { v.dline(x - 4, y - 11 + i * 3, x + 3, y - 10 + i * 3, '#8a8098'); }
}
function star(v: Vol, x: number, y: number, c: string) { v.dot(x, y, c); v.dot(x - 1, y, c); v.dot(x + 1, y, c); v.dot(x, y - 1, c); v.dot(x, y + 1, c); v.dot(x, y - 2, '#ffffff'); v.dot(x, y + 2, '#ffffff'); v.dot(x - 2, y, '#ffffff'); v.dot(x + 2, y, '#ffffff'); }
function speaker(v: Vol, x: number, y: number, w: number, h: number, frame: string, ring: string, cones: number) {
  const F = v.mat(frame, 'metal'), C = v.mat('#1e1a28', 'plastic'), S = v.mat('#100c16', 'rubber'), K = v.mat('#2e2840', 'plastic'), D = v.mat('#c8c0e0', 'metal'), R = v.mat(ring, 'emit');
  v.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], F, 3, [0.12, 0]);
  v.poly([[x + 3, y + 3], [x + w - 3, y + 3], [x + w - 3, y + h - 3], [x + 3, y + h - 3]], C, 3);
  const cx = x + w / 2; const rr = Math.min(w, h / cones) / 2 - 4;
  for (let i = 0; i < cones; i++) { const cy = y + (h / cones) * (i + 0.5); v.ell(cx, cy, rr + 1, rr + 1, R); v.ell(cx, cy, rr, rr, S); v.ell(cx, cy, rr * 0.72, rr * 0.72, K, [0, 0], true); v.ell(cx, cy, rr * 0.28, rr * 0.28, D); }
  for (const [bx, by] of [[x + 2, y + 2], [x + w - 3, y + 2], [x + 2, y + h - 3], [x + w - 3, y + h - 3]]) v.dot(bx, by, '#fff2c0');
}
interface Rig { b: number; hb: number; sw: number; wk: number; st: number }
function rig(o: Pose): Rig { const f = o.f % 4; const wk = o.walk ?? -1; return { b: [0, 1, 1, 0][f], hb: [0, 0, 1, 1][f], sw: [0, 1, 2, 1][f], wk, st: wk < 0 ? 0 : [0, 1, 0, -1][wk] }; }
/** Two legs from hips to shoes; walk swings them. */
function legs(v: Vol, r: Rig, hipB: P, hipF: P, pants: number, rad: number, shoe: (x: number, y: number) => void, gy = 150) {
  const s = r.st;
  const kB: P = [hipB[0] - 3 - s * 6, (hipB[1] + gy - 10) / 2 + (s < 0 ? -3 : 0)], aB: P = [hipB[0] - 7 - s * 9, gy - 10 + (s < 0 ? -3 : 0)];
  const kF: P = [hipF[0] + 3 + s * 6, (hipF[1] + gy - 10) / 2 + (s > 0 ? -3 : 0)], aF: P = [hipF[0] + 8 + s * 9, gy - 10 + (s > 0 ? -3 : 0)];
  limb(v, hipB, kB, aB, rad, rad - 1.5, pants); shoe(aB[0], aB[1] + 10);
  limb(v, hipF, kF, aF, rad, rad - 1.5, pants); shoe(aF[0], aF[1] + 10);
  return { kB, kF, aB, aF };
}

// ============================================================ BASS BRAWLER
const SPIKES: [number, number, number][] = [[-16, 14, -10], [-11, 22, -10], [-5, 28, -8], [1, 30, -5], [7, 27, -1], [12, 20, 3], [16, 12, 6]];
function bass(v: Vol, o: Pose) {
  const e = o.evo ?? 0, r = rig(o), ex = exprOf(o), b = r.b;
  const skin = '#e8b088', pink = '#ff3ec8';
  const JK = v.mat(e >= 1 ? '#4a2a72' : '#3a3644', 'cloth'), TEE = v.mat(e >= 2 ? '#3a1e5a' : '#1e1a26', 'cloth'), PANT = v.mat('#24222c', 'cloth');
  const cx = 62, cy = 42 + b + r.hb;
  if (e >= 2) speaker(v, 6, 58 + b, 30, 54, '#2a2238', pink, 2); // stack behind
  if (e >= 1) { const CP = v.mat(e >= 2 ? '#6a2496' : '#5a2486', 'cloth'); v.poly([[42, 70 + b], [64, 70 + b], [58 - r.sw, 146], [20 - r.sw * 2, 150], [28, 104]], CP, 5); for (const k of [0, 1, 2]) v.fold(44 + k * 6, 76 + b, 37 + k * 6, 110, 30 + k * 8 - r.sw, 146, 1, 0.7); }
  // back arm: hand tucked in the jacket pocket
  limb(v, [46, 74 + b], [41, 88 + b], [45, 100 + b], 6, 5, JK);
  const shoe = (x: number, y: number) => hiTop(v, x, y, e >= 1 ? '#e83ab8' : '#a890e0', '#ffffff', '#f2eeff');
  const lg = legs(v, r, [52, 104 + b], [70, 104 + b], PANT, 7.5, shoe);
  const PK = v.mat('#302c3a', 'cloth'); v.poly([[lg.kF[0] - 3, lg.kF[1] - 10], [lg.kF[0] + 7, lg.kF[1] - 10], [lg.kF[0] + 7, lg.kF[1] - 2], [lg.kF[0] - 3, lg.kF[1] - 2]], PK, 2);
  // torso: tee + open jacket
  v.part(() => { v.poly([[48, 68 + b], [76, 68 + b], [78, 106 + b], [46, 106 + b]], TEE, 5); });
  v.part(() => {
    v.poly([[42, 70 + b], [55, 67 + b], [56, 108 + b], [40, 108 + b]], JK, 5);
    v.poly([[69, 67 + b], [82, 70 + b], [84, 108 + b], [68, 108 + b]], JK, 5);
    v.ell(61, 67 + b, 15, 5, JK, [0, -0.3]); // hood roll behind the neck
  });
  v.fold(45, 78 + b, 46, 92 + b, 44, 106 + b, 1); v.fold(80, 78 + b, 81, 92 + b, 82, 106 + b, 1);
  for (let y = 70; y < 107; y += 2) { v.dot(55, y + b, '#b8b0c8'); v.dot(69, y + b, '#b8b0c8'); } // zipper teeth
  v.dline(58, 70 + b, 57, 86 + b, '#f0ecff'); v.dline(66, 70 + b, 67, 85 + b, '#f0ecff'); v.drect(56, 86 + b, 2, 3, '#ffffff'); v.drect(67, 85 + b, 2, 3, '#ffffff');
  v.drect(73, 80 + b, 3, 3, '#5ac8ff'); v.dot(74, 79 + b, '#bfefff');
  if (e >= 1) { const G = v.mat('#ffcf3a', 'metal'); for (let i = 0; i <= 12; i++) v.ell(54 + i * 1.3, 69 + b + Math.sin((i / 12) * Math.PI) * 6, 1.4, 1.4, G); }
  // head
  const HB = v.mat('#1e1826', 'hair'), HP = v.mat(pink, 'hair');
  v.part(() => { v.ell(cx - 3, cy - 4, 22, 19, HB); });
  headShape(v, cx, cy, skin);
  face(v, cx, cy, { skin, iris: e >= 2 ? '#ffb43a' : '#8a4ae8', brow: 'fierce', mouth: 'smirk', hideEyes: e >= 2 }, ex);
  // dark side hair + fringe locks, then the pink mohawk on top
  v.part(() => { v.poly([[cx - 21, cy + 2], [cx - 22, cy - 12], [cx - 10, cy - 20], [cx + 6, cy - 20], [cx + 18, cy - 14], [cx + 21, cy - 4], [cx + 14, cy - 9], [cx + 10, cy - 3], [cx + 4, cy - 10], [cx - 2, cy - 5], [cx - 8, cy - 11], [cx - 14, cy - 3], [cx - 18, cy + 6]], HB, 4); });
  v.part(() => {
    for (const [dx, h, lean] of SPIKES) v.poly([[cx + dx - 7, cy - 10], [cx + dx + lean, cy - 12 - h - (o.f % 2 ? 0 : 1)], [cx + dx + 5, cy - 12]], HP, 3, [0.15, -0.1]);
    v.ell(cx, cy - 15, 13, 6, HP);
    for (const [dx, dy] of [[4, 2], [12, 1]]) v.poly([[cx + dx - 3, cy - 14], [cx + dx + 3, cy - 14], [cx + dx + 1, cy - 4 + dy]], HP, 2);
  });
  for (const [dx, h, lean] of SPIKES) v.fold(cx + dx + lean * 0.8, cy - 12 - h * 0.85, cx + dx + lean * 0.4, cy - 12 - h * 0.45, cx + dx, cy - 13, 1, 0.5);
  if (e >= 2) for (const [dx, h, lean] of SPIKES.filter((_, i) => i % 2 === 0)) star(v, cx + dx + lean, cy - 15 - h, '#ffe0fa');
  // headphones: band over the crown, big cup on the ear
  const BD = v.mat('#2a2434', 'plastic'), CU = v.mat('#24202e', 'plastic'), RG = v.mat(e >= 1 ? '#e040c0' : '#2ad0d8', 'plastic');
  v.part(() => { v.cap(cx - 19, cy - 2, cx - 10, cy - 18, 2.5, 2.5, BD); v.cap(cx - 10, cy - 18, cx + 6, cy - 21, 2.5, 2.5, BD); });
  v.ell(cx - 19, cy + 3, 8, 10, RG); v.ell(cx - 18, cy + 3, 5.5, 7.5, CU); v.ell(cx - 19, cy + 2, 2.5, 3.5, v.mat('#3a3448', 'cloth'));
  if (e === 1) { const SG = v.mat('#1a1624', 'plastic'), LN = v.mat('#9a5aff', 'plastic'); v.poly([[cx - 8, cy - 18], [cx + 20, cy - 16], [cx + 20, cy - 9], [cx - 8, cy - 11]], SG, 2); v.ell(cx + 2, cy - 13, 5, 3, LN); v.ell(cx + 14, cy - 12, 4, 3, LN); v.dot(cx + 1, cy - 14, '#ffffff'); v.dot(cx + 13, cy - 13, '#ffffff'); }
  if (e >= 2) { const VZ = v.mat('#ffc030', 'plastic'), LN = v.mat('#ff7a2a', 'emit'); v.poly([[cx - 6, cy - 3], [cx + 21, cy - 2], [cx + 20, cy + 8], [cx - 6, cy + 7]], VZ, 2); v.poly([[cx - 4, cy - 1], [cx + 19, cy], [cx + 18, cy + 6], [cx - 4, cy + 5]], LN, 1); v.dline(cx - 2, cy, cx + 6, cy, '#fff4b0'); }
  // front arm: elbow bent, hand gripping the speaker's side handle
  const fa = r.wk >= 0 ? [0, 2, 0, -2][r.wk] : 0;
  limb(v, [77, 74 + b], [85, 88 + b + fa], [91, 94 + b + fa], 6, 5, JK);
  hand(v, 92, 94 + b + fa, skin);
  const sz = e * 2; speaker(v, 92, 74 + b + fa - sz, 30 + sz, 34 + sz, e >= 2 ? '#3a2a50' : '#2e2a3a', e >= 1 ? pink : '#9a5aff', 1);
}

// ============================================================ FLOW HEALER
function flow(v: Vol, o: Pose) {
  const e = o.evo ?? 0, r = rig(o), ex = exprOf(o), b = r.b;
  const skin = '#ecbe96', cy0 = '#3ad8f0', gold = '#e8c060';
  const HAORI = v.mat(e >= 2 ? '#f2f4fa' : '#2a62b0', 'cloth'), TOP = v.mat('#f4f2f8', 'cloth'), HAK = v.mat(e >= 2 ? '#f6f6fc' : '#e8e8f2', 'cloth'), OBI = v.mat(e >= 2 ? gold : '#e03aa8', 'cloth'), HAIR = v.mat(cy0, 'hair');
  const cx = 62, cy = 42 + b + r.hb;
  if (e >= 2) { const HL = v.mat('#ffd860', 'emit'); for (let i = 0; i < 64; i++) { const an = (i / 64) * Math.PI * 2; v.ell(cx + Math.cos(an) * 17, cy - 30 + Math.sin(an) * 3.5, 0.7, 0.7, HL); } }
  // ponytail + back hair
  v.part(() => { v.ell(cx - 3, cy - 3, 23, 21, HAIR); v.poly([[cx - 22, cy - 2], [cx - 8, cy - 6], [cx - 12, cy + 34], [cx - 20, cy + 40 + r.sw], [cx - 28, cy + 24]], HAIR, 5); });
  v.fold(cx - 20, cy + 4, cx - 21, cy + 22, cx - 20, cy + 36, 1, 0.6); v.fold(cx - 13, cy + 2, cx - 15, cy + 20, cx - 15, cy + 34, 1, 0.6);
  // haori back panel (long coat behind the body)
  v.poly([[42, 70 + b], [80, 70 + b], [90, 138], [34, 138]], HAORI, 5);
  // back arm hanging in a wide sleeve
  v.part(() => { v.poly([[38, 72 + b], [50, 70 + b], [52, 104 + b], [32, 108 + b]], HAORI, 5); });
  v.fold(42, 78 + b, 40, 92 + b, 38, 104 + b, 1); hand(v, 44, 108 + b, skin);
  const shoe = (x: number, y: number) => hiTop(v, x, y, '#f0f2ff', '#3a6ae0', e >= 2 ? '#ffd060' : '#4a8af0');
  legs(v, r, [54, 108 + b], [68, 108 + b], v.mat('#f0f0f8', 'cloth'), 6, shoe);
  // hakama: wide pleated skirt
  v.poly([[44, 96 + b], [80, 96 + b], [90, 141], [34, 141]], HAK, 4);
  for (let k = 0; k < 6; k++) { const x = 44 + k * 7; v.fold(x + 2, 100 + b, x + 1 + (x - 62) * 0.06, 118, x + (x - 62) * 0.16, 139, 1, 0.75); }
  // kimono top (crossed V collar)
  v.part(() => { v.poly([[48, 68 + b], [76, 68 + b], [78, 98 + b], [46, 98 + b]], TOP, 5); });
  v.dline(52, 68 + b, 63, 86 + b, '#b8b8c8'); v.dline(72, 68 + b, 63, 86 + b, '#b8b8c8');
  // haori fronts with patterned trim
  v.poly([[42, 70 + b], [52, 68 + b], [56, 138], [34, 138]], HAORI, 4); v.poly([[72, 68 + b], [82, 70 + b], [90, 138], [70, 138]], HAORI, 4);
  v.fold(46, 80 + b, 44, 106, 41, 134, 1); v.fold(78, 80 + b, 80, 106, 84, 134, 1);
  const TR = e >= 2 ? gold : '#e8c860'; v.dline(52, 68 + b, 56, 137, TR); v.dline(72, 68 + b, 70, 137, TR);
  const FL = e >= 2 ? ['#e8c060', '#ffffff'] : ['#ff7ac8', '#ffd860']; for (const [x, y, i] of [[40, 112, 0], [45, 126, 1], [80, 110, 0], [85, 124, 1], [44, 90, 1], [78, 92, 0], [38, 132, 1], [86, 134, 0]]) { v.dot(x, y + (y < 100 ? b : 0), FL[i]); v.dot(x + 1, y + (y < 100 ? b : 0), FL[i]); v.dot(x, y + 1 + (y < 100 ? b : 0), FL[i]); }
  // obi + knot + hanging tie
  v.poly([[46, 90 + b], [78, 90 + b], [78, 98 + b], [46, 98 + b]], OBI, 3); v.ell(62, 94 + b, 5, 4.5, OBI); v.poly([[60, 96 + b], [65, 96 + b], [64, 112 + b], [58, 110 + b]], OBI, 2);
  headShape(v, cx, cy, skin);
  face(v, cx, cy, { skin, iris: '#18a8c8', brow: 'calm', mouth: 'pout' }, ex);
  v.part(() => { v.poly([[cx - 21, cy + 4], [cx - 20, cy - 12], [cx - 8, cy - 21], [cx + 8, cy - 21], [cx + 19, cy - 13], [cx + 21, cy - 2], [cx + 15, cy - 9], [cx + 11, cy - 4], [cx + 6, cy - 12], [cx, cy - 6], [cx - 5, cy - 13], [cx - 12, cy - 4], [cx - 17, cy + 10]], HAIR, 5); v.cap(cx + 19, cy - 6, cx + 21, cy + 12, 3, 1.5, HAIR); });
  v.fold(cx - 6, cy - 20, cx - 4, cy - 14, cx - 4, cy - 7, 1, 0.5); v.fold(cx + 6, cy - 20, cx + 8, cy - 14, cx + 9, cy - 5, 1, 0.5);
  const ER = v.mat('#ffd040', 'metal'); v.ell(cx - 18, cy + 12, 1.5, 2, ER);
  if (e === 0) { const BD = v.mat('#e040b0', 'plastic'); v.ell(cx - 14, cy - 18, 3.5, 3.5, BD); v.ell(cx - 18, cy - 13, 2.5, 2.5, BD); }
  else { const cols = e >= 2 ? ['#ffd060', '#ffffff', '#ffb8d8', '#ffe8a0'] : ['#e040b0', '#ffd040', '#d0d0ff', '#ff70c0']; [[-19, -12], [-14, -18], [-7, -22], [0, -23], [7, -22], [13, -19], [18, -14]].forEach(([dx, dy], i) => { const M = v.mat(cols[i % 4], 'plastic'); v.ell(cx + dx, cy + dy, 3.2, 3.2, M); }); }
  // front arm: elbow bent, fan raised at shoulder height
  const fa = r.wk >= 0 ? [0, 2, 0, -2][r.wk] : 0;
  v.part(() => { v.poly([[72, 70 + b], [84, 72 + b], [90, 96 + b + fa], [74, 98 + b + fa]], HAORI, 5); });
  v.fold(78, 76 + b, 82, 86 + b, 80, 96 + b, 1);
  limb(v, [84, 84 + b + fa], [88, 90 + b + fa], [92, 82 + b + fa], 4, 3.5, v.mat(skin, 'skin'));
  const fx = 96, fy = 80 + b + fa, rr = 22 + e * 3; const a0 = -Math.PI * 0.55, a1 = Math.PI * 0.02, ribs = 11;
  const c1 = v.mat(e >= 2 ? '#e8c878' : '#ff6ac8', 'cloth'), c2 = v.mat(e >= 2 ? '#f6e0a0' : '#5ae0ff', 'cloth');
  for (let i = 0; i < ribs; i++) { const t0 = a0 + ((a1 - a0) * i) / ribs, t1 = a0 + ((a1 - a0) * (i + 1)) / ribs, tm = (t0 + t1) / 2;
    v.poly([[fx, fy], [fx + Math.cos(t0) * rr, fy + Math.sin(t0) * rr], [fx + Math.cos(tm) * (rr + 1.5), fy + Math.sin(tm) * (rr + 1.5)], [fx + Math.cos(t1) * rr, fy + Math.sin(t1) * rr]], i % 2 ? c1 : c2, 2, [Math.cos(tm) * (i % 2 ? 0.2 : -0.2), 0]); }
  for (let i = 0; i <= ribs; i++) { const t = a0 + ((a1 - a0) * i) / ribs; v.dline(fx, fy, fx + Math.cos(t) * rr * 0.42, fy + Math.sin(t) * rr * 0.42, '#5a3424'); }
  if (e >= 1) for (let i = 0; i <= ribs; i++) { const t = a0 + ((a1 - a0) * i) / ribs; v.dot(fx + Math.cos(t) * (rr - 1), fy + Math.sin(t) * (rr - 1), e >= 2 ? '#fff6d0' : '#ffffff'); }
  hand(v, 94, 82 + b + fa, skin);
}

// ============================================================ TEMPO DANCER
function tempo(v: Vol, o: Pose) {
  const e = o.evo ?? 0, r = rig(o), ex = exprOf(o), b = r.b;
  const skin = '#e0a882', lime = '#a8f03a', mag = '#ff3ec8';
  const JK = v.mat('#24224a', 'cloth'), PANT = v.mat('#2a2452', 'cloth'), STR = v.mat(lime, 'cloth'), HAIR = v.mat('#98e040', 'hair');
  const cx = 62, cy = 42 + b + r.hb;
  if (e >= 2) { const AR = v.mat('#5af0c8', 'plastic'); v.poly([[34, 78 + b], [4, 60 + b - r.sw], [16, 86 + b], [2, 96 + b], [30, 98 + b]], AR, 3, [-0.2, 0]); }
  // back arm raised: hand at head height holding the pink stick up, lime stick over the shoulder
  const G1 = v.mat(lime, 'emit'), G2 = v.mat(mag, 'emit');
  v.cap(36, 70 + b - r.sw, 4, 60 + b - r.sw, 2.6, 2.6, G1);
  limb(v, [46, 74 + b], [36, 84 + b], [38, 70 + b - r.sw], 6, 5, JK);
  v.cap(39, 70 + b - r.sw, 34, 44 + b - r.sw * 2, 2.6, 2.6, G2);
  hand(v, 38, 70 + b - r.sw, skin);
  const shoe = (x: number, y: number) => hiTop(v, x, y, '#3a52d8', '#f0f2ff', lime, e >= 1 ? 'emit' : 'rubber');
  const lg = legs(v, r, [52, 104 + b], [70, 104 + b], PANT, 7.5, shoe);
  v.cap(52 - 6, 104 + b, lg.kB[0] - 6, lg.kB[1], 0.7, 0.7, STR); v.cap(lg.kB[0] - 6, lg.kB[1], lg.aB[0] - 5, lg.aB[1] - 2, 0.7, 0.7, STR);
  v.cap(70 + 5, 104 + b, lg.kF[0] + 6, lg.kF[1], 0.7, 0.7, STR); v.cap(lg.kF[0] + 6, lg.kF[1], lg.aF[0] + 6, lg.aF[1] - 2, 0.7, 0.7, STR);
  // hooded track jacket
  v.part(() => { v.poly([[46, 68 + b], [78, 68 + b], [82, 106 + b], [42, 106 + b]], JK, 6); v.ell(60, 67 + b, 15, 5, JK, [0, -0.3]); });
  v.fold(48, 78 + b, 49, 92 + b, 46, 104 + b, 1); v.fold(76, 78 + b, 77, 92 + b, 80, 104 + b, 1);
  v.poly([[49, 70 + b], [52, 70 + b], [47, 106 + b], [44, 106 + b]], STR, 1); v.poly([[72, 70 + b], [75, 70 + b], [80, 106 + b], [77, 106 + b]], STR, 1);
  const ZIP = v.mat('#d0d0e8', 'metal'); v.cap(62, 70 + b, 62, 105 + b, 0.9, 0.9, ZIP); v.ell(62, 76 + b, 1.6, 2.2, ZIP);
  v.drect(66, 84 + b, 6, 4, mag); v.dot(68, 85 + b, '#ffffff'); v.dot(69, 86 + b, '#ffffff');
  const HM = v.mat('#302c64', 'cloth'); v.poly([[42, 102 + b], [82, 102 + b], [82, 107 + b], [42, 107 + b]], HM, 2);
  headShape(v, cx, cy, skin);
  face(v, cx, cy, { skin, iris: '#3ab83a', brow: 'excited', mouth: 'oh', hideEyes: e >= 2 }, ex);
  // buns, fringe, headband
  v.part(() => { v.ell(cx - 11, cy - 25, 9, 9, HAIR); v.ell(cx + 9, cy - 27, 9, 9, HAIR); });
  v.fold(cx - 15, cy - 30, cx - 11, cy - 25, cx - 7, cy - 20, 1, 0.45); v.fold(cx + 5, cy - 32, cx + 9, cy - 27, cx + 13, cy - 22, 1, 0.45);
  v.part(() => { v.poly([[cx - 21, cy + 5], [cx - 20, cy - 12], [cx - 6, cy - 19], [cx + 10, cy - 18], [cx + 20, cy - 10], [cx + 21, cy], [cx + 15, cy - 6], [cx + 12, cy - 1], [cx + 7, cy - 8], [cx + 1, cy - 3], [cx - 4, cy - 9], [cx - 11, cy - 2], [cx - 17, cy + 10]], HAIR, 5); });
  v.fold(cx - 2, cy - 17, cx - 1, cy - 11, cx, cy - 4, 1, 0.5); v.fold(cx + 10, cy - 16, cx + 11, cy - 10, cx + 12, cy - 2, 1, 0.5);
  const SB = v.mat('#e040b0', 'cloth'); v.part(() => { v.cap(cx - 22, cy - 9, cx - 2, cy - 17, 4, 4, SB); v.cap(cx - 2, cy - 17, cx + 21, cy - 12, 4, 4, SB); });
  if (e >= 2) { const VZ = v.mat(mag, 'plastic'); v.poly([[cx - 5, cy - 4], [cx + 22, cy - 3], [cx + 21, cy + 7], [cx - 5, cy + 6]], VZ, 3); v.dline(cx - 2, cy - 2, cx + 8, cy - 2, '#ffd0f0'); }
  // front arm bent down-right holding a lime stick angled up
  const fa = r.wk >= 0 ? [0, 2, 0, -2][r.wk] : 0;
  limb(v, [77, 74 + b], [85, 88 + b + fa], [91, 98 + b + fa], 6, 5, JK);
  v.cap(80, 76 + b, 88, 92 + b + fa, 0.7, 0.7, STR);
  const WB = v.mat('#e040b0', 'cloth'); v.cap(88, 94 + b + fa, 90, 96 + b + fa, 3.6, 3.6, WB);
  v.cap(92, 100 + b + fa, 110 + e * 2, 76 + b + fa - (o.f % 2) - e * 2, 2.6, 2.6, G1);
  hand(v, 92, 99 + b + fa, skin);
  if (e >= 1) { star(v, 112 + e * 2, 73 + b + fa - e * 2, '#e8ffb0'); star(v, 33, 41 + b - r.sw * 2, '#ffc8f0'); }
}

// ============================================================ WALL OF SOUND
function wall(v: Vol, o: Pose) {
  const e = o.evo ?? 0, r = rig(o), ex = exprOf(o), b = r.b;
  const skin = '#d8a47c', orange = '#ff8a1a', gold = '#ffc23a';
  const PJ = v.mat(e >= 2 ? '#5a2c96' : '#2c2850', 'cloth'), PANT = v.mat('#6a6438', 'cloth'), HAIR = v.mat(orange, 'hair');
  const cx = 60, cy = 40 + b + r.hb;
  if (e >= 1) { const CP = v.mat(e >= 2 ? '#7a3ab8' : '#8a5a2a', 'cloth'); v.poly([[40, 72 + b], [70, 72 + b], [66 - r.sw, 152], [22 - r.sw * 2, 152], [28, 106]], CP, 5); for (const k of [0, 1, 2]) v.fold(42 + k * 7, 78 + b, 35 + k * 8, 112, 28 + k * 10 - r.sw, 148, 1, 0.7); }
  limb(v, [42, 76 + b], [38, 92 + b], [42, 104 + b], 9, 7, PJ); hand(v, 43, 106 + b, skin, 5);
  const lg = legs(v, r, [52, 106 + b], [70, 106 + b], PANT, 9, (x, y) => boot(v, x, y));
  const PK = v.mat('#7a7444', 'cloth'); v.poly([[lg.kB[0] - 8, lg.kB[1] - 8], [lg.kB[0] + 1, lg.kB[1] - 8], [lg.kB[0] + 1, lg.kB[1]], [lg.kB[0] - 8, lg.kB[1]]], PK, 2);
  // puffer: hood behind, wide shoulders, stacked quilted bands
  v.part(() => { v.ell(58, 68 + b, 20, 8, PJ, [0, -0.3]); v.ell(42, 76 + b, 12, 10, PJ); v.ell(76, 76 + b, 12, 10, PJ); for (let i = 0; i < 4; i++) { const y = 78 + b + i * 8; v.cap(36 + i, y, 82 - i, y, 6.5, 6.5, PJ); } });
  const ZP = v.mat(gold, 'metal'); v.cap(60, 70 + b, 60, 110 + b, 0.9, 0.9, ZP);
  const CH = v.mat(gold, 'metal'); for (let i = 0; i <= 12; i++) { const t = i / 12; v.ell(49 + i * 1.8, 71 + b + Math.sin(t * Math.PI) * 11, 1.8, 1.6, CH); } v.ell(60, 86 + b, 5, 5, CH); v.ell(60, 86 + b, 2.5, 2.5, v.mat('#fff0b0', 'metal'));
  if (e >= 1) { const SD = v.mat('#e0e0f0', 'metal'); for (const [x, y] of [[34, 74], [38, 69], [44, 67]]) v.ell(x, y + b, 1.8, 1.8, SD); }
  // head: tall flat-top, shades, stern frown
  headShape(v, cx, cy, skin);
  face(v, cx, cy, { skin, iris: orange, brow: 'stern', mouth: 'flat', hideEyes: true, blush: false }, ex);
  v.part(() => { v.poly([[cx - 21, cy + 2], [cx - 21, cy - 34], [cx + 19, cy - 36], [cx + 21, cy - 6], [cx + 14, cy - 12], [cx, cy - 10], [cx - 14, cy - 9]], HAIR, 5, [0, -0.1]); });
  for (const dx of [-14, -7, 0, 7, 14]) v.fold(cx + dx, cy - 35, cx + dx + 0.5, cy - 24, cx + dx, cy - 11, 1, 0.45);
  for (let x = cx - 20; x <= cx + 18; x += 4) v.poly([[x, cy - 34], [x + 2, cy - 39], [x + 4, cy - 34]], HAIR, 1);
  const SG = v.mat('#14101c', 'plastic'), LENS = v.mat('#8a3ae8', 'plastic');
  v.part(() => { v.poly([[cx - 6, cy - 4], [cx + 23, cy - 5], [cx + 22, cy + 7], [cx + 13, cy + 8], [cx + 10, cy + 3], [cx + 7, cy + 8], [cx - 5, cy + 7]], SG, 2); v.cap(cx - 19, cy - 2, cx - 6, cy - 2, 1.3, 1.3, SG); });
  v.poly([[cx - 4, cy - 2], [cx + 8, cy - 3], [cx + 7, cy + 6], [cx - 3, cy + 5]], LENS, 2); v.poly([[cx + 12, cy - 3], [cx + 21, cy - 3], [cx + 20, cy + 6], [cx + 13, cy + 6]], LENS, 2);
  v.dline(cx - 2, cy - 1, cx + 3, cy - 1, '#f0d0ff'); v.dline(cx + 14, cy - 2, cx + 17, cy - 2, '#f0d0ff');
  if (e >= 2) { const CR = v.mat(gold, 'metal'); v.part(() => { v.poly([[cx - 20, cy - 36], [cx + 19, cy - 38], [cx + 19, cy - 31], [cx - 20, cy - 30]], CR, 2); for (const dx of [-15, -5, 5, 15]) v.poly([[cx + dx - 4, cy - 34], [cx + dx, cy - 46], [cx + dx + 4, cy - 35]], CR, 2); }); v.ell(cx, cy - 33, 1.8, 1.8, v.mat('#ff3ec8', 'plastic')); }
  // front arm behind the shield, shield held upright
  const fa = r.wk >= 0 ? [0, 2, 0, -2][r.wk] : 0;
  limb(v, [76, 76 + b], [84, 90 + b + fa], [90, 96 + b + fa], 9, 7, PJ);
  const big = e * 2; speaker(v, 80 - big / 2, 68 + b + fa - big, 42 + big, 74 + big, gold, e >= 2 ? '#ff3ec8' : '#ff8a1a', 2);
}

const RIM: Record<string, string[]> = { bass: ['#ff7ad8', '#ff5ad0', '#e080ff'], flow: ['#7aeaff', '#5ae0ff', '#fff0b0'], tempo: ['#c8ff6a', '#b8ff4a', '#6affd8'], wall: ['#ffb060', '#ffa040', '#d080ff'] };
const AURAS: Record<string, string[]> = { bass: ['', '#ff3ec8', '#d070ff'], flow: ['', '#3ae8ff', '#fff0b0'], tempo: ['', '#b8ff3a', '#6affd8'], wall: ['', '#ff9a2a', '#b070ff'] };
const SX: Record<string, number> = { bass: 1.12, flow: 1.12, tempo: 1.12, wall: 1.14 };
const FN: Record<string, (v: Vol, o: Pose) => void> = { bass, flow, tempo, wall };
const def = (id: string): SpriteDef => ({
  w: HW, h: HH, res: 2, draw: () => {}, aura: o => AURAS[id][o.evo ?? 0] || null,
  render: (o, flash) => { const v = new Vol(HW, HH); v.sx = SX[id]; v.ox = 60; FN[id](v, o); return v.render({ rim: RIM[id][o.evo ?? 0], flash }); },
});
export const HERO_SPRITES: Record<string, SpriteDef> = { bass: def('bass'), flow: def('flow'), tempo: def('tempo'), wall: def('wall') };
