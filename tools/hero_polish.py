"""Step-4 hand-polish pass (called by hero_evos.py after the evo overlays, on every hero/evo).
Scripted 'hand' fixes on the indexed maps, mirroring what a pixel artist would touch last:
  faces  : de-noise the skin, redraw eyes (2px lid, 3-tone iris ramp, catchlight), tight 2-tone blush
  hands  : skin clusters below the head get 2-3 finger separators + knuckle light (grip read)
  props  : speaker side plane (3/4 depth) + contact/occlusion shadow; visor lens with gradient + glint
  feet   : 3/4 toe boxes (rounded toe-cap light, midsole, dark sole) on every shoe
  extras : puffer quilting (Wall), magenta jacket lining (Bass), crown as its own add-on object (Wall evo2),
           folded/graded cape (Wall evo1), tapered sinuous ribbons (Flow evo1).
Faces of evo 1/2 are located by template matching against evo 0 so every edit lands on the right pixels.
Expression patches (shout/hurt) get the same pass; hurt keeps its squeezed eyes."""
import numpy as np, cv2, colorsys
from scipy import ndimage as nd

# evo-0 eye boxes (x0,y0,x1,y1 excl) + iris ramp (dark, mid, light); mouth y bounds the face box
FACE = {
    'bass':  dict(near=(66, 55, 74, 61), far=(78, 55, 84, 61), my=72, iris=('#2a0f4a', '#6a2ab0', '#b47aff')),
    'flow':  dict(near=(65, 51, 73, 57), far=(77, 51, 82, 57), my=66, iris=('#0b2f6a', '#1a78d0', '#5fd8ff')),
    'tempo': dict(near=(67, 55, 74, 61), far=(79, 55, 84, 61), my=70, iris=('#0c3a10', '#2f9a1a', '#9be04a')),
    'wall':  dict(near=None, far=None, my=66, iris=None),
}
EYES_HIDDEN = {'bass': [0, 1, 1], 'flow': [0, 0, 0], 'tempo': [0, 0, 1], 'wall': [1, 1, 1]}
INK, WHITE = '#1a0c22', '#ffffff'

def h2r(h): return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], float)
def r2h(r): return '#%02x%02x%02x' % tuple(int(max(0, min(255, round(v)))) for v in r)
def hsv(h): return colorsys.rgb_to_hsv(*(h2r(h) / 255))

class P:
    def __init__(s, m, pal): s.m = m.copy(); s.pal = list(pal); s.H, s.W = m.shape
    def c(s, hx):
        if hx in s.pal: return s.pal.index(hx) + 1
        s.pal.append(hx); return len(s.pal)
    def px(s, x, y, v, behind=False):
        if 0 <= x < s.W and 0 <= y < s.H and (not behind or s.m[y, x] == 0): s.m[y, x] = v
    def col(s, v): return s.pal[v - 1] if v else None
    def skin(s, box):
        """Dominant light skin index (warm, mid-sat, bright) inside box, and a darker ramp step."""
        x0, y0, x1, y1 = box; vals, cnt = np.unique(s.m[y0:y1, x0:x1], return_counts=True)
        best = None
        for v, n in sorted(zip(vals, cnt), key=lambda t: -t[1]):
            if not v: continue
            H, S, V = hsv(s.pal[v - 1])
            if 0.03 <= H <= 0.13 and 0.2 <= S <= 0.75 and V > 0.75: best = int(v); break
        if best is None: return None, None
        r = h2r(s.pal[best - 1]); sh = s.c(r2h(r * np.array([0.82, 0.62, 0.55])))
        return best, sh

def rgb(m, pal):
    o = np.zeros(m.shape + (3,), np.float32)
    for i, h in enumerate(pal): o[m == i + 1] = h2r(h)
    return o

# ------------------------------------------------------------------ faces
def denoise(p, box, keep):
    x0, y0, x1, y1 = box
    for _ in range(2):
        m = p.m.copy()
        for y in range(max(1, y0), min(p.H - 1, y1)):
            for x in range(max(1, x0), min(p.W - 1, x1)):
                if keep[y, x] or not m[y, x]: continue
                nb = m[y - 1:y + 2, x - 1:x + 2].ravel(); nb = np.delete(nb, 4)
                v, n = np.unique(nb, return_counts=True); k = n.argmax()
                if v[k] and v[k] != m[y, x] and n[k] >= 6 and (nb == m[y, x]).sum() <= 1: p.m[y, x] = v[k]

def eye(p, box, iris, sk, near):
    x0, y0, x1, y1 = box; w = x1 - x0
    I0, I1, I2 = (p.c(h) for h in iris); K, Wt = p.c(INK), p.c(WHITE)
    p.m[y0:y1 + 2, x0 - 1:x1 + 1] = np.where(p.m[y0:y1 + 2, x0 - 1:x1 + 1] > 0, sk, 0)  # clear the old eye
    iw = 3 if near else 2; ix = x1 - iw - (1 if near else 0)
    for x in range(x0, x1):
        for y in range(y0 + 2, y1 - 1): p.m[y, x] = Wt if x < ix or x >= ix + iw else p.m[y, x]
    for x in range(ix, ix + iw):  # iris ramp dark top -> light bottom
        p.m[y0 + 2, x] = I0; p.m[y0 + 3, x] = I1
        for y in range(y0 + 4, y1 - 1): p.m[y, x] = I2 if y == y1 - 2 else I1
    p.m[y0 + 3, ix + iw // 2] = I0                        # pupil
    p.m[y0 + 2, ix] = Wt                                  # catchlight
    p.m[y0, x0 + 1:x1] = K; p.m[y0 + 1, x0:x1] = K       # 2px upper lid
    p.m[y0 + 2, x1 - 1 if near else x0] = K               # outer lash tick
    p.m[y1 - 1, x0 + 1:x1 - 1] = sk                       # open lower lid (skin)
    p.m[y1 - 1, ix:ix + iw] = p.skin_sh

def face(p, hid, e, dx, dy, mode):
    f = FACE[hid]
    if f['near'] is None and hid != 'wall': return
    n = f['near'] or (62, 50, 72, 56); fa = f['far'] or (76, 50, 86, 56)
    box = (n[0] - 4 + dx, n[1] - 5 + dy, fa[2] + 4 + dx, f['my'] + 3 + dy)
    sk, sh = p.skin(box)
    if sk is None: return
    p.skin_sh = sh
    keep = np.zeros_like(p.m, bool)
    mouth = f['my'] + dy; keep[mouth - 4:mouth + 4, :] = mode != 'neutral'
    hidden = EYES_HIDDEN[hid][e]
    if hidden or mode == 'hurt':
        for b in (n, fa): keep[b[1] + dy - 1:b[3] + dy + 1, b[0] + dx - 1:b[2] + dx + 1] = True
    denoise(p, box, keep | (p.m == p.c(INK)) & (mode == 'hurt'))
    if not hidden and mode != 'hurt':
        for b, nr in ((n, True), (fa, False)): eye(p, (b[0] + dx, b[1] + dy, b[2] + dx, b[3] + dy), f['iris'], sk, nr)
    # tight blush: 3+2 cluster, two tones, under each eye on skin only
    r = h2r(p.pal[sk - 1]); B1 = p.c(r2h(r * 0.55 + h2r('#ff4a78') * 0.45)); B2 = p.c(r2h(r * 0.75 + h2r('#ff7a96') * 0.25))
    yb = (n[3] if not hidden else n[3] + 2) + dy + 2
    for cx, wd in ((n[0] + dx + 1, 3), (fa[0] + dx + 2, 2)):
        for k in range(wd):
            if p.m[yb, cx + k] == sk: p.m[yb, cx + k] = B1
            if k < wd - 1 and p.m[yb - 1, cx + k + 1] == sk: p.m[yb - 1, cx + k + 1] = B2

# ------------------------------------------------------------------ hands
def hands(p, ytop):
    warm = np.zeros(p.m.shape, bool)
    for i, h in enumerate(p.pal):
        H, S, V = hsv(h)
        if 0.03 <= H <= 0.13 and 0.2 <= S <= 0.8 and V > 0.6: warm |= p.m == i + 1
    warm[:ytop] = False
    lab, n = nd.label(warm)
    for k in range(1, n + 1):
        ys, xs = np.nonzero(lab == k)
        if not 10 <= len(ys) <= 80: continue
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        if x1 - x0 < 3 or y1 - y0 < 4: continue
        sk, sh = p.skin((x0, y0, x1, y1))
        if sk is None: continue
        hl = p.c(r2h(h2r(p.pal[sk - 1]) * 0.6 + 255 * 0.4)); K = p.c(INK)
        reg = lab == k
        nf = 3 if y1 - y0 >= 6 else 2; step = max(2, (y1 - y0) // nf)
        for j in range(1, nf):  # finger separators across the front 2/3 of the fist
            y = y0 + j * step
            for x in range(x0 + (x1 - x0) // 3, x1):
                if reg[y, x]: p.m[y, x] = sh
        for j in range(nf):     # knuckle light on each finger
            y = y0 + j * step + (0 if j else 1)
            xs_ = [x for x in range(x0, x1) if reg[min(y, y1 - 1), x]]
            if xs_: p.m[min(y, y1 - 1), xs_[len(xs_) // 2]] = hl
        for y in range(y0, y1):  # crisp ink on the grip side so the fist reads against the prop
            xs_ = [x for x in range(x0, x1) if reg[y, x]]
            if xs_ and xs_[-1] + 1 < p.W and not warm[y, xs_[-1] + 1]: p.m[y, xs_[-1] + 1] = p.m[y, xs_[-1] + 1] if p.m[y, xs_[-1] + 1] == 0 else K

# ------------------------------------------------------------------ props
def speaker(p, box, side_dark, side_mid, contact):
    """3/4 side plane on the speaker's right edge (parallelogram, top receding) + contact shadow on the left."""
    x0, y0, x1, y1 = box
    rows = [y for y in range(y0, y1) if (p.m[y, x0:x1] > 0).mean() > 0.6]
    if not rows: return
    rx = int(np.median([x0 + np.nonzero(p.m[y, x0:x1])[0].max() for y in rows]))
    ty, by = min(rows), max(rows)
    D, M = p.c(side_dark), p.c(side_mid)
    for y in range(ty + 3, by + 1):
        for k in range(1, 4):
            if y - ty >= 3 - (3 - k): p.px(rx + k, y, D if k == 3 or y == by else M, behind=True)
    for k in range(1, 4): p.px(rx + k, ty + 3 - k, M, behind=True)  # receding top corner
    C = p.c(contact)
    lx = int(np.median([x0 + np.nonzero(p.m[y, x0:x1])[0].min() for y in rows]))
    for y in range(ty + 2, by - 1):  # occlusion shadow where the body meets the cabinet
        for x in (lx + 2, lx + 3):
            if p.m[y, x] and hsv(p.col(p.m[y, x]))[2] > 0.25: p.m[y, x] = C

def visor(p, box, frame, lens, glint):
    x0, y0, x1, y1 = box; F = p.c(frame); L = [p.c(h) for h in lens]; G = p.c(glint)
    p.m[y0:y1, x0:x1] = F
    h = y1 - y0 - 2
    for y in range(y0 + 1, y1 - 1):
        t = (y - y0 - 1) / max(1, h - 1); v = L[min(len(L) - 1, int(t * len(L)))]
        p.m[y, x0 + 1:x1 - 1] = v
    mid = (x0 + x1) // 2; p.m[y1 - 2:y1, mid - 1:mid + 1] = F
    for k in range(4):
        p.px(x0 + 3 + k, y1 - 2 - k, G); p.px(x0 + 4 + k, y1 - 2 - k, G)
    p.px(x1 - 3, y0 + 1, G)

def toes(p, gy):
    sole = p.c('#120a18')
    reg = p.m[gy - 13:gy + 1] > 0; lab, n = nd.label(reg)
    for k in range(1, n + 1):
        ys, xs = np.nonzero(lab == k)
        if len(ys) < 25: continue
        ys = ys + gy - 13; x0, x1 = xs.min(), xs.max() + 1
        if not 8 <= x1 - x0 <= 24: continue
        bot = ys.max()
        row = [x for x in range(x0, x1) if p.m[bot - 2, x]]
        if not row: continue
        # pick the shoe's light upper tone for the midsole and toe-cap light
        cols = [p.m[y, x] for y in range(bot - 9, bot - 2) for x in range(x0, x1) if p.m[y, x]]
        light = max(set(cols), key=lambda v: hsv(p.pal[v - 1])[2]) if cols else p.c('#ffffff')
        for x in range(row[0], row[-1] + 1):
            if p.m[bot, x]: p.m[bot, x] = sole
            if p.m[bot - 1, x]: p.m[bot - 1, x] = p.c('#e8e4f0') if row[0] < x < row[-1] else sole
        # rounded toe box on the front (right) end: curved light arc + dark front edge
        tx = row[-1]
        for i, (ox, oy) in enumerate([(-4, -6), (-3, -6), (-2, -5), (-1, -4), (-1, -3)]):
            if p.m[bot + oy, tx + ox]: p.m[bot + oy, tx + ox] = light
        for oy in (-4, -3, -2):
            if p.m[bot + oy, tx]: p.m[bot + oy, tx] = sole

# ------------------------------------------------------------------ hero extras
def quilt(p, sample_pts, rows, xr):
    vals = set(int(p.m[y, x]) for x, y in sample_pts if p.m[y, x])
    hues = [hsv(p.pal[v - 1])[0] for v in vals]
    if not hues: return
    hc = float(np.median(hues))
    mat = np.zeros(p.m.shape, bool)
    for i, h in enumerate(p.pal):
        H, S, V = hsv(h)
        if abs(H - hc) < 0.06 and S > 0.15 and V > 0.18: mat |= p.m == i + 1
    ramp = sorted({int(v) for v in np.unique(p.m[mat])}, key=lambda v: hsv(p.pal[v - 1])[2])
    if len(ramp) < 2: return
    dark, light = ramp[0], ramp[-1]
    for y in range(rows[0], rows[1], 7):  # seam + puffed light band above it, bowed like a tube
        for x in range(xr[0], xr[1]):
            yy = y + int(round(1.5 * np.cos((x - xr[0]) / (xr[1] - xr[0]) * np.pi * 2)))
            if 0 < yy < p.H and mat[yy, x]: p.m[yy, x] = dark
            if mat[yy - 2, x] and x % 3: p.m[yy - 2, x] = light

def lining(p, pts, w=2):
    M0, M1 = p.c('#8a0f6a'), p.c('#ff3ec8')
    for (xa, ya), (xb, yb) in zip(pts, pts[1:]):
        for t in np.linspace(0, 1, 2 * max(abs(xb - xa), abs(yb - ya)) + 1):
            x, y = int(round(xa + (xb - xa) * t)), int(round(ya + (yb - ya) * t))
            if p.m[y, x]: p.m[y, x] = M1
            if p.m[y, x + 1]: p.m[y, x + 1] = M0

def crown(p, cx, base_y):
    G0, G1, G2, G3, J = p.c('#7a3a08'), p.c('#d4880f'), p.c('#ffcf3a'), p.c('#fff2a8'), p.c('#ff2e7a')
    mask = np.zeros(p.m.shape, bool); w = 22; x0 = cx - w // 2
    for x in range(x0, x0 + w):
        t = x - x0; peak = 9 if t in (1, 2, 10, 11, 19, 20) else (5 if t in (5, 6, 15, 16) else 3)
        for y in range(base_y - peak, base_y + 4): mask[y, x] = True
    for y, x in zip(*np.nonzero(mask)):
        rel = y - (base_y - 9)
        v = G2 if x < cx else G1
        if y >= base_y + 2: v = G0
        elif y == base_y: v = G3 if x % 2 else G2
        p.m[y, x] = v
    for y, x in zip(*np.nonzero(mask)):  # sel-out on right/bottom, dark ink on top tips
        if x + 1 >= p.W or not mask[y, x + 1] or not mask[min(y + 1, p.H - 1), x]: p.m[y, x] = G0
    for jx in (x0 + 5, cx, x0 + w - 6):
        p.m[base_y + 1, jx] = J; p.m[base_y + 1, jx + 1] = J
    for t in (1, 10, 19): p.m[base_y - 9, x0 + t] = G3
    return mask

def cape(p, R):
    """Wall evo1 cape: vertical fold bands (lit/mid/shadow), darker toward the hem, crisp crease lines."""
    R0, R1, R2, R3 = (p.c(h) for h in R)
    cap = np.isin(p.m, [p.c(R[1]), p.c(R[2]), p.c(R[3])]); cap[:66] = False
    for y, x in zip(*np.nonzero(cap)):
        band = (x - 22 + (y - 64) // 6) % 12
        v = R3 if band < 2 else R2 if band < 5 else R1 if band < 9 else R0
        if y > 138 and v == R3: v = R2
        if y > 146 and v == R2: v = R1
        p.m[y, x] = v

def ribbon(p, pts, cols, w0=5):
    C0, C1, C2, C3 = (p.c(h) for h in cols)
    from scipy.interpolate import splprep, splev
    tck, _ = splprep(np.array(pts, float).T, s=0, k=3); u = np.linspace(0, 1, 160)
    xs, ys = splev(u, tck); dx, dy = splev(u, tck, der=1)
    for i in range(len(u)):
        n = np.array([-dy[i], dx[i]]); n /= np.linalg.norm(n) + 1e-6
        half = (w0 * (1 - 0.7 * u[i]) + 1.2 * np.sin(u[i] * 9)) / 2
        for s in np.linspace(-half, half, 9):
            x, y = int(round(xs[i] + n[0] * s)), int(round(ys[i] + n[1] * s))
            edge = abs(s) > half - 0.8
            v = C0 if (edge and s > 0) else C3 if (edge and s < 0) else (C2 if s < 0 else C1)
            p.px(x, y, v, behind=True)

# ------------------------------------------------------------------ driver
SPEAKERS = {'bass': [((86, 74, 118, 112),), ((88, 74, 120, 112),), ((88, 74, 122, 112), (2, 58, 40, 114))],
            'wall': [((80, 38, 124, 124),), ((80, 38, 124, 124), (2, 100, 42, 156)), ((82, 38, 126, 124),)]}

def apply(hid, e, full, pal, gy, ref, mode='neutral'):
    p = P(full, pal)
    dx = dy = 0
    if ref is not None and e:
        f = FACE[hid]; n = f['near'] or (62, 50, 72, 56)
        x0, y0 = n[0] - 6, n[1] - 8; tpl = ref[y0:y0 + 24, x0:x0 + 26]; S = 6
        reg = rgb(p.m, p.pal)[y0 - S:y0 + 24 + S, x0 - S:x0 + 26 + S]
        res = cv2.matchTemplate(reg, tpl, cv2.TM_CCOEFF_NORMED); _, _, _, loc = cv2.minMaxLoc(res); dx, dy = loc[0] - S, loc[1] - S
    face(p, hid, e, dx, dy, mode)
    if mode != 'neutral': return p, (dx, dy)
    hands(p, 72 + dy)
    for b in SPEAKERS.get(hid, [()] * 3)[e]:
        speaker(p, b, '#140a1e', '#3a2a4e' if hid == 'bass' else '#6a3208', '#0d0716')
    toes(p, gy)
    if hid == 'tempo' and e == 2: visor(p, (69 + dx, 52 + dy, 88 + dx, 61 + dy), INK, ['#5a0a4a', '#c41a9a', '#ff5ad0', '#ffc0ee'], WHITE)
    if hid == 'wall':
        quilt(p, [(45, 85), (50, 95), (70, 80)], (68, 106), (34, 84))
        if e == 1: cape(p, ['#4c1615', '#8a1c2c', '#c8343a', '#ff6a50'])
    if hid == 'bass':
        lining(p, [(51, 76), (50, 92), (49, 112)])
        lining(p, [(79, 80), (80, 96), (80, 112)])
    if hid == 'flow' and e == 1:
        cols = ['#0e4a70', '#1e9ad0', '#4dd4de', '#ece9ec']
        ribbon(p, [(40, 104), (28, 112), (22, 128), (8, 146)], cols, 7)
        ribbon(p, [(40, 112), (32, 124), (28, 138), (16, 152)], cols, 6)
    return p, (dx, dy)
