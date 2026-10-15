// "Vol": a tiny volumetric pixel renderer for the hi-res heroes. Shapes write a per-pixel material +
// surface normal; render() lights them (key light top-left, coloured rim light from the right),
// quantises into 10-tone hue-shifted ramps with a light ordered dither, adds specular per material
// kind, contour lines where a part overlaps another, and a selective (non-black) outline.
import { tone, mix, hex2rgb } from './pix';
export type Kind = 'skin' | 'cloth' | 'metal' | 'plastic' | 'hair' | 'rubber' | 'emit';
interface M { ramp: string[]; kind: Kind; base: string }
type V3 = [number, number, number];
const N = 10;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => v / 16 - 0.47);
const norm = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const L = norm([-0.55, -0.7, 0.55]); const H = norm([L[0], L[1], L[2] + 1]);
function makeRamp(base: string, kind: Kind): string[] {
  const lo = kind === 'metal' ? -0.85 : kind === 'rubber' ? -0.7 : kind === 'skin' ? -0.55 : -0.72;
  const hi = kind === 'metal' ? 0.85 : kind === 'rubber' ? 0.35 : kind === 'skin' ? 0.5 : 0.62;
  const r: string[] = [];
  for (let i = 0; i < N; i++) { const dl = lo + ((hi - lo) * i) / (N - 1); let c = tone(base, dl); if (kind === 'skin' && dl < 0) c = mix(c, '#b0304a', -dl * 0.25); r.push(c); }
  return r;
}
export class Vol {
  mats: M[] = []; cols: string[] = [];
  m: Int16Array; g: Int16Array; ord: Int32Array; nx: Float32Array; ny: Float32Array; nz: Float32Array; dc: Int16Array;
  o = 0; grp = 0; private inPart = false;
  constructor(public w: number, public h: number) {
    const n = w * h; this.m = new Int16Array(n).fill(-1); this.g = new Int16Array(n); this.ord = new Int32Array(n);
    this.nx = new Float32Array(n); this.ny = new Float32Array(n); this.nz = new Float32Array(n); this.dc = new Int16Array(n).fill(-1);
  }
  mat(base: string, kind: Kind = 'cloth'): number { this.mats.push({ ramp: makeRamp(base, kind), kind, base }); return this.mats.length - 1; }
  /** Shapes drawn inside one part share a group (no contour line between them). */
  part(fn: () => void) { this.grp++; this.inPart = true; fn(); this.inPart = false; }
  private next() { this.o++; if (!this.inPart) this.grp++; }
  private set(x: number, y: number, mi: number, n: V3) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; const i = y * this.w + x; const v = norm(n);
    this.m[i] = mi; this.g[i] = this.grp; this.ord[i] = this.o; this.nx[i] = v[0]; this.ny[i] = v[1]; this.nz[i] = v[2]; this.dc[i] = -1;
  }
  ell(cx: number, cy: number, rx: number, ry: number, mi: number, tilt: [number, number] = [0, 0], concave = false) {
    this.next();
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      const dx = (x + 0.5 - cx) / (rx + 0.25), dy = (y + 0.5 - cy) / (ry + 0.25); const d2 = dx * dx + dy * dy; if (d2 > 1) continue;
      const nz = Math.sqrt(1 - d2); const s = concave ? -0.8 : 1; this.set(x, y, mi, [dx * s + tilt[0], dy * s + tilt[1], nz + 0.15]);
    }
  }
  /** Tapered capsule (limbs, tubes): cylinder normals around the axis. */
  cap(x0: number, y0: number, x1: number, y1: number, r0: number, r1: number, mi: number, tilt: [number, number] = [0, 0]) {
    this.next(); const vx = x1 - x0, vy = y1 - y0, ll = vx * vx + vy * vy || 1; const R = Math.max(r0, r1);
    for (let y = Math.floor(Math.min(y0, y1) - R - 1); y <= Math.ceil(Math.max(y0, y1) + R + 1); y++) for (let x = Math.floor(Math.min(x0, x1) - R - 1); x <= Math.ceil(Math.max(x0, x1) + R + 1); x++) {
      const px = x + 0.5, py = y + 0.5; let t = ((px - x0) * vx + (py - y0) * vy) / ll; t = Math.max(0, Math.min(1, t));
      const r = r0 + (r1 - r0) * t; const dx = px - (x0 + vx * t), dy = py - (y0 + vy * t); const d = Math.hypot(dx, dy) / (r + 0.25); if (d > 1) continue;
      this.set(x, y, mi, [(dx / (r + 0.25)) + tilt[0], (dy / (r + 0.25)) + tilt[1], Math.sqrt(Math.max(0, 1 - d * d)) + 0.2]);
    }
  }
  /** Polygon with a rounded bevel of `bev` px: flat face (optionally tilted) and rounded edges. */
  poly(pts: number[][], mi: number, bev = 4, tilt: [number, number] = [0, 0]) {
    this.next(); const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
      const px = x + 0.5, py = y + 0.5; let inside = false, best = 1e9, bnx = 0, bny = 0;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
        const ex = xi - xj, ey = yi - yj, el = ex * ex + ey * ey || 1; let t = ((px - xj) * ex + (py - yj) * ey) / el; t = Math.max(0, Math.min(1, t));
        const qx = px - (xj + ex * t), qy = py - (yj + ey * t); const d = Math.hypot(qx, qy); if (d < best) { best = d; bnx = -qx / (d || 1); bny = -qy / (d || 1); }
      }
      if (!inside) continue;
      const t = best < bev ? 1 - best / bev : 0; const k = Math.sin(t * Math.PI / 2) * 0.95;
      this.set(x, y, mi, [-bnx * k + tilt[0], -bny * k + tilt[1], 1 - k * 0.7]);
    }
  }
  /** Cloth fold / crease: bends existing normals across a curve so one side catches light and the other falls into shadow. */
  fold(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, w = 2, str = 0.7) {
    const n = 40; const seen = new Set<number>();
    for (let i = 0; i <= n; i++) {
      const t = i / n, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t; const x = a * x0 + b * cx + c * x1, y = a * y0 + b * cy + c * y1;
      const tx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx), ty = 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy); const tl = Math.hypot(tx, ty) || 1; const px = -ty / tl, py = tx / tl;
      for (let s = -w; s <= w; s++) { const X = Math.round(x + px * s), Y = Math.round(y + py * s); if (X < 0 || Y < 0 || X >= this.w || Y >= this.h) continue; const k = Y * this.w + X; if (seen.has(k) || this.m[k] < 0 || this.dc[k] >= 0) continue; seen.add(k);
        const side = s === 0 ? 0 : Math.sign(s) * (1 - Math.abs(s) / (w + 1)); const v = norm([this.nx[k] + px * side * str, this.ny[k] + py * side * str, this.nz[k] - (s === 0 ? 0.35 * str : 0)]); this.nx[k] = v[0]; this.ny[k] = v[1]; this.nz[k] = v[2]; }
    }
  }
  /** Unlit detail pixel (eyes, logos, stitching, LEDs). */
  dot(x: number, y: number, col: string) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; const i = y * this.w + x; let k = this.cols.indexOf(col); if (k < 0) { this.cols.push(col); k = this.cols.length - 1; } if (this.m[i] < 0) { this.m[i] = 0; this.g[i] = this.grp; this.ord[i] = this.o; this.nz[i] = 1; } this.dc[i] = k; }
  drect(x: number, y: number, w: number, h: number, col: string) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.dot(x + i, y + j, col); }
  dline(x0: number, y0: number, x1: number, y1: number, col: string) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) this.dot(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, col); }
  has(x: number, y: number) { return x >= 0 && y >= 0 && x < this.w && y < this.h && this.m[y * this.w + x] >= 0; }

  render(opts: { rim?: string; flash?: boolean } = {}): HTMLCanvasElement {
    const { w, h } = this; const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d')!; const img = g.createImageData(w, h); const d = img.data;
    const rim = opts.rim ?? '#ff3ec8';
    const idxA = new Int8Array(w * h).fill(-1); const out: (string | null)[] = new Array(w * h).fill(null);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (this.m[i] < 0) continue;
      if (this.dc[i] >= 0) { out[i] = this.cols[this.dc[i]]; continue; }
      const mt = this.mats[this.m[i]]; const nx = this.nx[i], ny = this.ny[i], nz = this.nz[i];
      const ndl = nx * L[0] + ny * L[1] + nz * L[2];
      let I: number;
      if (mt.kind === 'emit') I = 0.78 + 0.22 * Math.max(0, ndl);
      else if (mt.kind === 'skin' || mt.kind === 'cloth' || mt.kind === 'hair') I = 0.12 + 0.88 * Math.max(0, (ndl + 0.35) / 1.35) ** 1.15;
      else if (mt.kind === 'metal') { const env = 0.5 - ny * 0.45; I = 0.08 + 0.55 * Math.max(0, ndl) + 0.37 * env; }
      else I = 0.08 + 0.9 * Math.max(0, ndl);
      const nh = Math.max(0, nx * H[0] + ny * H[1] + nz * H[2]);
      if (mt.kind === 'metal') I += nh ** 18 * 0.9; else if (mt.kind === 'plastic') I += nh ** 30 * 0.8; else if (mt.kind === 'hair') { const band = Math.exp(-(((ny + 0.45) * 5) ** 2)) * Math.max(0, nz); I += band * 0.22; }
      let t = Math.floor(I * (N - 1) + 0.5 + BAYER[(y & 3) * 4 + (x & 3)] * (mt.kind === 'skin' ? 0.25 : 0.5)); t = Math.max(0, Math.min(N - 1, t));
      let col = mt.ramp[t];
      if ((mt.kind === 'metal' && nh ** 40 > 0.6) || (mt.kind === 'plastic' && nh ** 60 > 0.55)) col = '#ffffff';
      const rimAmt = Math.max(0, nx) * (1 - Math.max(0, nz)) * 1.6 + Math.max(0, nx) * 0.15;
      if (mt.kind !== 'emit' && rimAmt > 0.62) col = mix(col, rim, mt.kind === 'metal' ? 0.7 : 0.55);
      idxA[i] = t; out[i] = col;
    }
    // contour lines where a later (front) part overlaps an earlier one
    const final = out.slice();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (idxA[i] < 0) continue; const mt = this.mats[this.m[i]]; if (mt.kind === 'emit') continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const j = Y * w + X;
        if (this.m[j] < 0 || this.g[j] === this.g[i] || this.ord[j] <= this.ord[i] || this.dc[j] >= 0) continue;
        final[i] = mix(mt.ramp[Math.max(0, idxA[i] - 4)], '#140a20', 0.35); break; }
    }
    // selective outline: lit side gets a softer, coloured outline; shadow side a deep one
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (this.m[i] >= 0) continue; let nb = -1;
      for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < w && Y < h && this.m[Y * w + X] >= 0) { nb = Y * w + X; break; } }
      if (nb < 0) continue;
      if (this.dc[nb] >= 0 || this.m[nb] < 0) { final[i] = '#140a20'; continue; }
      const mt = this.mats[this.m[nb]]; const lit = idxA[nb] >= 6;
      final[i] = mt.kind === 'emit' ? mix(mt.base, '#140a20', 0.45) : mix(mt.ramp[lit ? 1 : 0], '#0c0614', lit ? 0.35 : 0.6);
    }
    for (let i = 0; i < w * h; i++) { const cc = final[i]; if (!cc) continue; const [r, gg, b] = opts.flash ? [255, 255, 255] : hex2rgb(cc); d[i * 4] = r; d[i * 4 + 1] = gg; d[i * 4 + 2] = b; d[i * 4 + 3] = 255; }
    g.putImageData(img, 0, 0); return c;
  }
}
