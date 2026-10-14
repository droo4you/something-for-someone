// Tiny pixel-art rasterizer: draw shapes as "materials", then auto-shade with a hue-shifted
// 4-tone ramp (shadow / base / light / highlight), dithered terminator and a selective outline.
export type RGB = [number, number, number];
export function hex2rgb(h: string): RGB { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h.slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function rgb2hex([r, g, b]: RGB) { return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
function rgb2hsl([r, g, b]: RGB): RGB { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h * 360, s, l]; }
function hsl2rgb([h, s, l]: RGB): RGB { h = ((h % 360) + 360) % 360 / 360; if (!s) return [l * 255, l * 255, l * 255]; const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; const f = (t: number) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }; return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255]; }
/** Shift lightness with hue shifting: shadows drift toward blue/purple, lights toward yellow. */
export function tone(hex: string, dl: number): string {
  const [h, s, l] = rgb2hsl(hex2rgb(hex));
  const target = dl < 0 ? 250 : 55; const amt = Math.min(1, Math.abs(dl)) * 0.22;
  let dh = ((target - h + 540) % 360) - 180; const nh = h + dh * amt;
  const ns = Math.min(1, s * (dl < 0 ? 0.92 : 0.9));
  return rgb2hex(hsl2rgb([nh, ns, Math.max(0.03, Math.min(0.97, l + dl * (dl < 0 ? l * 0.9 : (1 - l) * 0.9)))]));
}
export function ramp(base: string): string[] { return [tone(base, -0.42), base, tone(base, 0.32), tone(base, 0.62)]; }
export function mix(a: string, b: string, t: number) { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex([0, 1, 2].map(i => A[i] * (1 - t) + B[i] * t) as RGB); }

interface Mat { ramp: string[]; flat: boolean; outline: boolean; glow?: boolean }
export class Pix {
  m: Uint8Array; mats: Mat[] = [{ ramp: [], flat: true, outline: false }];
  constructor(public w: number, public h: number) { this.m = new Uint8Array(w * h); }
  mat(base: string, opts: { flat?: boolean; outline?: boolean; glow?: boolean } = {}): number { this.mats.push({ ramp: opts.flat ? [base, base, base, base] : ramp(base), flat: !!opts.flat, outline: opts.outline !== false, glow: opts.glow }); return this.mats.length - 1; }
  flat(c: string, outline = false) { return this.mat(c, { flat: true, outline }); }
  px(x: number, y: number, k: number) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.m[y * this.w + x] = k; }
  get(x: number, y: number) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.m[y * this.w + x] : 0; }
  rect(x: number, y: number, w: number, h: number, k: number) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, k); }
  ell(cx: number, cy: number, rx: number, ry: number, k: number) { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const dx = (x - cx) / (rx + 0.35), dy = (y - cy) / (ry + 0.35); if (dx * dx + dy * dy <= 1) this.px(x, y, k); } }
  poly(pts: number[][], k: number) {
    const ys = pts.map(p => p[1]); for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      const xs: number[] = []; for (let i = 0; i < pts.length; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length]; if ((y0 <= y + 0.5 && y1 > y + 0.5) || (y1 <= y + 0.5 && y0 > y + 0.5)) xs.push(x0 + ((y + 0.5 - y0) / (y1 - y0)) * (x1 - x0)); }
      xs.sort((a, b) => a - b); for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.round(xs[i]); x < Math.round(xs[i + 1]); x++) this.px(x, y, k);
    }
  }
  line(x0: number, y0: number, x1: number, y1: number, k: number, th = 1) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n; if (th <= 1) this.px(x, y, k); else this.ell(x, y, th / 2 - 0.2, th / 2 - 0.2, k); } }
  /** quadratic curve, thick */
  curve(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, k: number, th = 1, taper = false) { const n = 24; for (let i = 0; i <= n; i++) { const t = i / n, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t; const w = taper ? Math.max(1, th * (1 - t * 0.8)) : th; const x = a * x0 + b * cx + c * x1, y = a * y0 + b * cy + c * y1; if (w <= 1) this.px(x, y, k); else this.ell(x, y, w / 2 - 0.2, w / 2 - 0.2, k); } }
  erase(x: number, y: number, w: number, h: number) { this.rect(x, y, w, h, 0); }
  mirrorX() { for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w >> 1; x++) { const a = y * this.w + x, b = y * this.w + this.w - 1 - x; const t = this.m[a]; this.m[a] = this.m[b]; this.m[b] = t; } }

  render(opts: { outline?: string; flash?: boolean } = {}): HTMLCanvasElement {
    const { w, h, m, mats } = this; const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d')!; const img = g.createImageData(w, h); const d = img.data;
    const run = (x: number, y: number, dx: number, dy: number, same: boolean) => { const k = m[y * w + x]; let n = 0; for (let i = 1; i <= 4; i++) { const q = this.get(x + dx * i, y + dy * i); if (same ? q !== k && !(q && mats[q].flat && !mats[q].outline) : !q) break; n++; } return n; };
    const set = (x: number, y: number, hex: string) => { const [r, gg, b] = hex2rgb(hex); const i = (y * w + x) * 4; d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255; };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const k = m[y * w + x];
      if (!k) {
        // selective outline: darkest tone of the neighbouring material, darkened
        let nk = 0; for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const q = this.get(x + dx, y + dy); if (q && mats[q].outline) { nk = q; break; } }
        if (nk) set(x, y, opts.flash ? '#ffffff' : opts.outline ?? mix(mats[nk].ramp[0], '#140c1c', 0.62));
        continue;
      }
      const mt = mats[k]; if (opts.flash) { set(x, y, '#ffffff'); continue; }
      if (mt.flat) { set(x, y, mt.ramp[1]); continue; }
      const up = run(x, y, 0, -1, true), lf = run(x, y, -1, 0, true), dn = run(x, y, 0, 1, false), rt = run(x, y, 1, 0, false);
      const dnS = run(x, y, 0, 1, true);
      let t = 1;
      if (dn === 0 || (rt === 0 && dn <= 2)) t = 0;
      else if (up === 0) t = lf <= 1 ? 3 : 2;
      else if (lf === 0) t = 2;
      else if (rt === 0) t = 0;
      else if (dn === 1 && (x + y) % 2 === 0) t = 0;
      else if (dnS === 0 && dn > 0 && x % 2 === 0) t = 0;
      set(x, y, mt.ramp[t]);
    }
    g.putImageData(img, 0, 0); return c;
  }
}
/** Draw a circular glow aura behind (into a separate canvas) */
export function withAura(src: HTMLCanvasElement, color: string, pad = 0): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = src.width + pad * 2; c.height = src.height + pad * 2; const g = c.getContext('2d')!;
  const cx = c.width / 2, cy = c.height * 0.55, r = Math.min(c.width, c.height) * 0.48;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) { const dd = Math.hypot(x - cx, (y - cy) * 1.15) / r; if (dd < 1) { const a = dd < 0.7 ? 0.22 : dd < 0.85 ? 0.14 : 0.07; if ((x + y) % 2 === 0 || dd < 0.7) { g.fillStyle = color; g.globalAlpha = a; g.fillRect(x, y, 1, 1); } } }
  g.globalAlpha = 1; g.drawImage(src, pad, pad); return c;
}
