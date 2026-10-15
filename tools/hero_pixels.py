"""Rave Rollers hero pixel pipeline (v4). refs/target-heroes.jpg -> src/ui/heromaps.json
  1 crop      tools/hero_crops.py: per-cell cutouts by connected components (no bleed)
  2 grid      unfake: detects the pseudo-pixel scale, rebuilds one true pixel per cell (dominant colour)
  3 resize    dominant-colour block resample to the final scale; quantize in OKLab (k-means, no dither)
  4 cleanup   palette hue-shift (shadows->blue/purple, lights->warm, sat peaks mid), orphan removal,
              sel-out outline (darker tone of own ramp, broken on the lit top-left side), scripted face/FX edits
  5 layers    shared 136x160 canvas, one foot pivot; evo add-ons outside the base silhouette -> overlay layer
  6 indexed   each layer = index map (base64, 1 byte/px, 0 = transparent) + per-evo palette LUT
Run: python tools/hero_pixels.py refs/target-heroes.jpg   (needs: pip install unfake opencv-python-headless scipy pillow)
"""
import sys, os, json, base64, subprocess, tempfile, numpy as np, cv2
from PIL import Image
from scipy import ndimage as nd
sys.path.insert(0, os.path.dirname(__file__))
from hero_crops import crops
from hero_edits import EDITS
HW, HH, GY = 136, 160, 154      # canvas + foot baseline (shared pivot)
SCALE = 0.30                     # source px -> sprite px (target ~128 tall)
K = 15
IDS = ['bass', 'flow', 'tempo', 'wall']
OUT = 'src/ui/heromaps.json'; WORK = os.environ.get('PXWORK', '/tmp/pxwork')

def srgb2lin(c): c = c / 255.0; return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def lin2srgb(c): c = np.clip(c, 0, 1); return np.clip(np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055) * 255, 0, 255)
def to_oklab(rgb):
    l = srgb2lin(rgb.astype(float)); M1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929], [0.2119034982, 0.6806995451, 0.1073969566], [0.0883024619, 0.2817188376, 0.6299787005]])
    lms = np.cbrt(l @ M1.T); M2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468], [1.9779984951, -2.4285922050, 0.4505937099], [0.0259040371, 0.7827717662, -0.8086757660]])
    return lms @ M2.T
def from_oklab(lab):
    M2i = np.array([[1, 0.3963377774, 0.2158037573], [1, -0.1055613458, -0.0638541728], [1, -0.0894841775, -1.2914855480]])
    lms = (lab @ M2i.T) ** 3; M1i = np.array([[4.0767416621, -3.3077115913, 0.2309699292], [-1.2684380046, 2.6097574011, -0.3413193965], [-0.0041960863, -0.7034186147, 1.7076147010]])
    return lin2srgb(lms @ M1i.T)

def unfake_grid(img, tag):
    p = f'{WORK}/{tag}_in.png'; o = f'{WORK}/{tag}_grid.png'; img.save(p)
    subprocess.run([os.path.join(os.path.dirname(sys.executable), 'unfake'), p, '-o', o, '-m', 'dominant', '--cleanup', 'morph,jaggy', '--quiet'], check=True)
    g = Image.open(o).convert('RGBA'); a = np.asarray(g).copy()
    # unfake drops our alpha on some inputs: re-derive it from the cutout mask sampled at the grid
    m = np.asarray(img.split()[3].resize(g.size, Image.BOX)) > 127; a[..., 3] = np.where(m, 255, 0); return Image.fromarray(a, 'RGBA')

def block_resample(img, w, h):
    """Dominant colour per destination cell (no blending, so no new colours)."""
    a = np.asarray(img); H, W = a.shape[:2]; out = np.zeros((h, w, 4), np.uint8)
    ys = np.linspace(0, H, h + 1).astype(int); xs = np.linspace(0, W, w + 1).astype(int)
    for j in range(h):
        for i in range(w):
            c = a[ys[j]:max(ys[j + 1], ys[j] + 1), xs[i]:max(xs[i + 1], xs[i] + 1)].reshape(-1, 4)
            op = c[c[:, 3] > 127]
            if len(op) * 2 < len(c): continue
            k = op[:, 0].astype(int) << 16 | op[:, 1].astype(int) << 8 | op[:, 2]; u, n = np.unique(k, return_counts=True)
            # tie-break toward the darker colour so outlines survive
            best = u[np.lexsort((((u >> 16) + ((u >> 8) & 255) + (u & 255)), -n))[0]]
            out[j, i] = [best >> 16, (best >> 8) & 255, best & 255, 255]
    return out

def quantize(rgba, k=K):
    m = rgba[..., 3] > 0; px = rgba[m][:, :3]; lab = to_oklab(px).astype(np.float32)
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 60, 1e-4); cv2.setRNGSeed(7)
    _, lbl, cen = cv2.kmeans(lab * np.array([1, 1.6, 1.6], np.float32), k, None, crit, 6, cv2.KMEANS_PP_CENTERS)
    cen = cen / np.array([1, 1.6, 1.6], np.float32)
    order = np.argsort(cen[:, 0]); remap = np.empty(k, int); remap[order] = np.arange(k)
    idx = np.zeros(m.shape, np.uint8); idx[m] = remap[lbl.ravel()] + 1
    return idx, cen[order]

def hue_shift(lab):
    """Shadows rotate toward blue/purple, highlights toward warm yellow, chroma peaks in the mid-tones."""
    L, a, b = lab[:, 0].copy(), lab[:, 1].copy(), lab[:, 2].copy(); C = np.hypot(a, b); h = np.arctan2(b, a)
    t = np.clip((L - 0.55) / 0.35, -1, 1)
    cool, warm = np.deg2rad(290), np.deg2rad(95)
    def rot(h, tgt, amt): d = (tgt - h + np.pi) % (2 * np.pi) - np.pi; return h + d * amt
    h = np.where(t < 0, rot(h, cool, -t * 0.35), rot(h, warm, np.clip(t - 0.3, 0, 1) * 0.2))
    C = C * (1 + 0.35 * np.exp(-((L - 0.6) / 0.18) ** 2)) + np.where(L < 0.35, 0.025, 0)  # sat peaks mid; darks get a purple tint
    return np.stack([L, C * np.cos(h), C * np.sin(h)], 1)

def kill_orphans(idx):
    out = idx.copy(); H, W = idx.shape
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            v = idx[y, x]
            if v == 0: continue
            nb = idx[y - 1:y + 2, x - 1:x + 2].ravel(); nb = np.delete(nb, 4)
            if (nb == v).sum() == 0:
                vals, cnt = np.unique(nb, return_counts=True)
                if vals[np.argmax(cnt)] != 0 or (nb == 0).sum() >= 6: out[y, x] = vals[np.argmax(cnt)]
    return out

def selout(idx, lab):
    """Outer edge: each material outlined in a darker tone of its own ramp; lit (top/left) edges stay unbroken-free."""
    H, W = idx.shape; out = idx.copy(); n = len(lab)
    darker = {}
    for i in range(n):
        L, a, b = lab[i]; best, bd = None, 9
        for j in range(n):
            if lab[j, 0] >= L - 0.08: continue
            d = np.hypot(lab[j, 1] - a, lab[j, 2] - b) + abs(L - 0.22 - lab[j, 0]) * 0.6
            if d < bd: best, bd = j, d
        darker[i + 1] = (best + 1) if best is not None else i + 1
    for y in range(H):
        for x in range(W):
            v = idx[y, x]
            if not v: continue
            up = y == 0 or idx[y - 1, x] == 0; lf = x == 0 or idx[y, x - 1] == 0
            dn = y == H - 1 or idx[y + 1, x] == 0; rt = x == W - 1 or idx[y, x + 1] == 0
            if (dn or rt) and not (up or lf): out[y, x] = darker[v]      # shadow side: own-ramp dark
            elif (up or lf) and lab[v - 1, 0] < 0.3: out[y, x] = min(n, v + 2)  # lit side: break near-black outline
    return out

def place(idx):
    """Shared foot pivot: lowest opaque row -> GY, feet centre -> canvas centre."""
    ys, xs = np.nonzero(idx); y1 = ys.max(); foot = xs[ys >= y1 - 8]; cx = int(round((foot.min() + foot.max()) / 2))
    can = np.zeros((HH, HW), np.uint8); oy = GY - y1; ox = HW // 2 - cx
    for y, x in zip(ys, xs):
        Y, X = y + oy, x + ox
        if 0 <= Y < HH and 0 <= X < HW: can[Y, X] = idx[y, x]
    return can

def to_hex(lab): rgb = from_oklab(lab).round().astype(int); return ['#%02x%02x%02x' % tuple(c) for c in rgb]

def main(src):
    os.makedirs(WORK, exist_ok=True); cs = crops(src); data = {'w': HW, 'h': HH, 'gy': GY, 'heroes': {}}
    for hi, hid in enumerate(IDS):
        evos = []
        for e in range(3):
            c = cs[hi * 3 + e]; tag = f'{hid}{e}'; c['img'].save(f'{WORK}/{tag}_crop.png')
            g = unfake_grid(c['img'], tag)
            w, h = round(c['img'].width * SCALE), round(c['img'].height * SCALE)
            q = block_resample(g, w, h)
            idx, lab = quantize(q)
            lab = hue_shift(lab)
            idx = kill_orphans(idx); idx = place(idx); idx = selout(idx, lab)
            pal = to_hex(lab); idx, pal, ex = EDITS[hid](idx, pal, e)
            evos.append((idx, pal, ex))
        base = evos[0][0] > 0
        reg = nd.binary_dilation(base, iterations=2)
        out = []
        for e, (idx, pal, ex) in enumerate(evos):
            body = np.where(reg, idx, 0).astype(np.uint8); add = np.where(reg, 0, idx).astype(np.uint8)
            if e == 0: add[:] = 0
            out.append({'pal': pal, 'body': rle(body), 'addon': rle(add) if add.any() else None,
                        'expr': {k: dict(x=p['x'], y=p['y'], w=p['w'], h=p['h'], m=rle(p['m'])) for k, p in ex.items()}})
            for k, p in ex.items():
                t = idx.copy(); t[p['y']:p['y'] + p['h'], p['x']:p['x'] + p['w']] = p['m']; Image.fromarray(render(t, pal)).save(f'{WORK}/{hid}{e}_{k}.png')
            Image.fromarray(render(idx, pal)).save(f'{WORK}/{hid}{e}_final.png')
        data['heroes'][hid] = out
    json.dump(data, open(OUT, 'w'))
    print('wrote', OUT, os.path.getsize(OUT), 'bytes')

def rle(a):
    """Run-length (count<=255, index) byte pairs, base64."""
    f = a.ravel(); out = bytearray(); i = 0
    while i < len(f):
        j = i
        while j < len(f) and j - i < 255 and f[j] == f[i]: j += 1
        out += bytes([j - i, int(f[i])]); i = j
    return base64.b64encode(bytes(out)).decode()

def render(idx, pal):
    rgb = np.zeros(idx.shape + (4,), np.uint8)
    for i, hx in enumerate(pal):
        if hx is None: continue
        rgb[idx == i + 1] = [int(hx[1:3], 16), int(hx[3:5], 16), int(hx[5:7], 16), 255]
    return rgb

if __name__ == '__main__': main(sys.argv[1] if len(sys.argv) > 1 else 'refs/target-heroes.jpg')
