"""Evo distinctness pass (run after hero_pixels.py): tools/heromaps_base.json -> src/ui/heromaps.json.
The target sheet barely changes between some stages, so each evo gets scripted pixel overlays and palette
swaps on top of the recovered maps: every stage changes the silhouette or a dominant colour.
Rules: palette swaps pick materials by hue (robust to k-means reruns), new colours are 3-5 tone ramps,
overlays get sel-out outlines, no dither. Overlays drawn 'behind' only paint transparent pixels so the body
stays in front. The same edit is re-applied to the shout/hurt face patches so expressions stay consistent.
Run: python tools/hero_evos.py"""
import json, base64, colorsys, os, numpy as np
IN, OUT = 'tools/heromaps_base.json', 'src/ui/heromaps.json'

def unrle(s, n):
    b = base64.b64decode(s); o = np.zeros(n, np.uint8); p = 0
    for i in range(0, len(b), 2): o[p:p + b[i]] = b[i + 1]; p += b[i]
    return o
def rle(a):
    f = a.ravel(); out = bytearray(); i = 0
    while i < len(f):
        j = i
        while j < len(f) and j - i < 255 and f[j] == f[i]: j += 1
        out += bytes([j - i, int(f[i])]); i = j
    return base64.b64encode(bytes(out)).decode()
def hsv(h): r, g, b = (int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)); H, S, V = colorsys.rgb_to_hsv(r, g, b); return H * 360, S, V

class Ed:
    def __init__(s, idx, pal): s.m = idx.copy(); s.pal = list(pal); s.H, s.W = idx.shape
    def c(s, hx):
        if hx in s.pal: return s.pal.index(hx) + 1
        s.pal.append(hx); return len(s.pal)
    def pick(s, hlo, hhi, smin=0.0, vmin=0.0, vmax=1.01):
        out = []
        for i, h in enumerate(s.pal):
            H, S, V = hsv(h)
            inh = hlo <= H <= hhi if hlo <= hhi else (H >= hlo or H <= hhi)
            if inh and S >= smin and vmin <= V < vmax and (s.m == i + 1).any(): out.append(i)
        return out
    def swap(s, ids, ramp):
        """Palette swap: the chosen material indices, sorted dark->light, take the ramp (LUT change only)."""
        ids = sorted(ids, key=lambda i: hsv(s.pal[i])[2])
        for k, i in enumerate(ids): s.pal[i] = ramp[min(len(ramp) - 1, round(k * (len(ramp) - 1) / max(1, len(ids) - 1)))]
    def near(s, h):
        return min(range(len(s.pal)), key=lambda i: sum((int(s.pal[i][j:j + 2], 16) - int(h[j:j + 2], 16)) ** 2 for j in (1, 3, 5))) + 1
    def px(s, x, y, v, behind=False):
        if 0 <= x < s.W and 0 <= y < s.H and (not behind or s.m[y, x] == 0): s.m[y, x] = v
    def rect(s, x0, y0, x1, y1, v, behind=False):
        for y in range(y0, y1):
            for x in range(x0, x1): s.px(x, y, v, behind)
    def line(s, a, b, v, w=1, behind=False):
        (x0, y0), (x1, y1) = a, b; n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
        for t in np.linspace(0, 1, n * 2):
            x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            for dx in range(-(w // 2), w - w // 2):
                for dy in range(-(w // 2), w - w // 2): s.px(int(round(x + dx)), int(round(y + dy)), v, behind)
    def poly(s, pts, v, behind=True):
        import cv2
        inside = np.zeros((s.H, s.W), np.uint8); cv2.fillPoly(inside, [np.array(pts, np.int32)], 1); inside = inside > 0
        for y, x in zip(*np.nonzero(inside)): s.px(x, y, v, behind)
        return inside
    def outline(s, mask, dark, behind=True):
        """Sel-out for an overlay region: darker own-ramp tone on the outer shadow edge (bottom/right)."""
        H, W = mask.shape
        for y in range(H):
            for x in range(W):
                if not mask[y, x]: continue
                dn = y == H - 1 or not mask[y + 1, x]; rt = x == W - 1 or not mask[y, x + 1]; lf = x == 0 or not mask[y, x - 1]
                if dn or rt or lf: s.px(x, y, dark, behind)

def glowstick(e, hand, tip, core, mid, halo):
    """Emissive ramp: 5px halo, 3px saturated body, 1px white-hot core."""
    e.line(hand, tip, halo, 5, behind=True); e.line(hand, tip, mid, 3); 
    hx, hy = hand; tx, ty = tip; e.line((hx + (tx - hx) * .12, hy + (ty - hy) * .12), (hx + (tx - hx) * .92, hy + (ty - hy) * .92), core, 1)

# ---------------------------------------------------------------- per hero / evo
def tempo1(e):
    # jacket + pants navy -> plum (keeps lime stripes, shoes, skin): dominant colour change
    e.swap(e.pick(235, 275, smin=0.3, vmin=0.2, vmax=0.8), ['#3a0c3a', '#6e1a62', '#a8389a', '#e070c8'])
    # emissive ramps reuse the sprite's own lime / pink / white entries (keeps the colour budget)
    W_ = e.c('#ffffff'); near = lambda h: min(range(len(e.pal)), key=lambda i: sum((int(e.pal[i][j:j+2],16)-int(h[j:j+2],16))**2 for j in (1,3,5))) + 1
    LIME, LIMEM, LH = W_, near('#b5d62f'), near('#4ca400')
    PK, PKH = near('#eb26b6'), e.c('#a8389a')
    # longer, brighter glowsticks (tips pushed ~10px past the old ones)
    glowstick(e, (39, 70), (9, 61), LIME, LIMEM, LH)
    glowstick(e, (41, 72), (29, 41), W_, PK, PKH)
    glowstick(e, (96, 97), (115, 66), LIME, LIMEM, LH)
    # re-draw the gripping hands over the sticks (skin cluster from the map)
    # cyan visor: frame, gradient lens dark top -> bright bottom, white reflection streak
    FR, L2, L3 = e.c('#1a0c22'), e.c('#2ec4f0'), e.c('#bfe8ff')
    x0, x1, y0 = 62, 88, 54
    e.rect(x0, y0, x1, y0 + 9, FR)
    e.rect(x0 + 1, y0 + 1, x1 - 1, y0 + 3, FR); e.rect(x0 + 1, y0 + 3, x1 - 1, y0 + 6, L2); e.rect(x0 + 1, y0 + 6, x1 - 1, y0 + 8, L3)
    e.rect(74, y0 + 6, 76, y0 + 9, FR)  # nose bridge notch
    for k in range(4): e.px(x0 + 4 + k, y0 + 5 - k, W_); e.px(x0 + 5 + k, y0 + 5 - k, W_)
    e.px(x1 - 4, y0 + 2, W_)

def wall1(e):
    # puffer purple-grey -> teal quilt (dark purple shadows stay: hue-shifted shadow side)
    e.swap(e.pick(255, 295, smin=0.25, vmin=0.34), ['#1f6a6a', '#2fa596', '#7fe6c8'])
    # gold + speaker tones reuse the sprite's own frame/hair ramp; cape adds two reds to its dark-red ramp
    G0, G1, G2, G3 = e.near('#a44d00'), e.near('#e46600'), e.near('#f3a41d'), e.near('#eabd85')
    R0, R1, R2, R3 = e.near('#4c1615'), e.c('#8a1c2c'), e.c('#c8343a'), e.c('#ff6a50')
    # fuller cape: wide trapezoid behind the body, flaring past both sides, with fold lines
    m = e.poly([(48, 64), (82, 64), (98, 146), (80, 151), (60, 147), (42, 151), (24, 146)], R1)
    lit = e.poly([(48, 64), (60, 64), (52, 147), (42, 151), (24, 146)], R2)
    e.outline(m, R0)
    for x0, x1 in [(54, 47), (66, 62), (74, 82)]: e.line((x0, 72), (x1, 146), R0, 1, behind=True)
    e.line((48, 65), (25, 145), R3, 1, behind=True)  # lit left edge
    # second speaker stacked on the floor behind, left side
    sx0, sy0, sx1, sy1 = 6, 104, 36, 154
    S0, S1 = e.near('#150d26'), e.near('#291f3b')
    keep = e.m.copy(); occ = keep > 0   # draw the cabinet as one layer, then put everything in front back
    e.rect(sx0, sy0, sx1, sy1, G1); e.rect(sx0 + 2, sy0 + 2, sx1 - 2, sy1 - 2, S1)
    e.rect(sx1 - 2, sy0, sx1, sy1, G0); e.rect(sx0, sy0, sx1, sy0 + 1, G2)
    for cy, r in [(sy0 + 13, 9), (sy0 + 35, 9)]:
        for y in range(cy - r, cy + r + 1):
            for x in range(21 - r, 21 + r + 1):
                d = (x - 21) ** 2 + (y - cy) ** 2
                if d <= r * r: e.px(x, y, S0 if d > (r - 2) ** 2 else (S1 if d > 9 else G1))
        e.px(20, cy - 1, G3)
    e.m[occ] = keep[occ]
    # big gold chain: chunky 2px links in a U with a 7x7 medallion
    pts = [(60 + 2 * k, 66 + int(18 * np.sin(np.pi * k / 12))) for k in range(13)]
    for k, (x, y) in enumerate(pts):
        e.rect(x, y, x + 2, y + 2, G2 if k % 2 else G1); e.px(x, y + 2, G0); e.px(x + 1, y + 2, G0)
    mx, my = 69, 84
    e.rect(mx - 1, my, mx + 6, my + 7, G0); e.rect(mx, my, mx + 5, my + 6, G1); e.rect(mx, my, mx + 4, my + 4, G2); e.px(mx + 1, my + 1, G3); e.px(mx + 2, my + 1, G3)

def flow1(e):
    # haori blue -> violet (bright cyan hair/highlights stay): dominant colour change
    e.swap(e.pick(205, 235, smin=0.6, vmax=0.75), ['#2a1060', '#4a24a0', '#7a48e0'])
    C0, C1, C2, C3 = e.c('#0e4a70'), e.c('#1e9ad0'), e.c('#4dd4de'), e.c('#ece9ec')
    # sleeve ribbons are drawn (tapered, sinuous) by hero_polish.ribbon
    # anime 'angel ring' highlight band across the hair
    for x in range(56, 82):
        y = 39 + int(round(((x - 69) / 13) ** 2 * 3))
        if e.m[y, x]: e.m[y, x] = C3 if 62 <= x <= 74 else C2

EVOS = {('tempo', 1): tempo1, ('wall', 1): wall1, ('flow', 1): flow1}

def main():
    import hero_polish as HP
    from scipy import ndimage as nd
    d = json.load(open(IN)); W, H = d['w'], d['h']; N = W * H
    for hid, evs in d['heroes'].items():
        base0 = unrle(evs[0]['body'], N).reshape(H, W) > 0; ref = None
        for k, ev in enumerate(evs):
            fn = EVOS.get((hid, k)) or (lambda e: None)
            body = unrle(ev['body'], N).reshape(H, W); add = unrle(ev['addon'], N).reshape(H, W) if ev['addon'] else np.zeros((H, W), np.uint8)
            full = np.where(add > 0, add, body); reg = body > 0
            def run(m): e = Ed(m, ev['pal']); fn(e); return e
            e = run(full)
            p, _ = HP.apply(hid, k, e.m, e.pal, d['gy'], ref)
            if k == 0: ref = HP.rgb(p.m, p.pal)
            crown = HP.crown(p, 72, 40) if (hid, k) == ('wall', 2) else np.zeros((H, W), bool)
            new = p.m
            # body/add-on split: pixels inside the old body region stay body, new pixels outside (and the crown) are add-on
            R = (nd.binary_dilation(base0, iterations=2) | reg) & ~crown
            ev['body'] = rle(np.where(R, new, 0).astype(np.uint8)); a2 = np.where(R, 0, new).astype(np.uint8)
            ev['addon'] = rle(a2) if a2.any() else None
            for name, pt in ev['expr'].items():
                t = full.copy(); t[pt['y']:pt['y'] + pt['h'], pt['x']:pt['x'] + pt['w']] = unrle(pt['m'], pt['w'] * pt['h']).reshape(pt['h'], pt['w'])
                te = run(t); q = HP.P(new, p.pal)  # start from the polished neutral, swap in the expression region
                q.m[pt['y']:pt['y'] + pt['h'], pt['x']:pt['x'] + pt['w']] = te.m[pt['y']:pt['y'] + pt['h'], pt['x']:pt['x'] + pt['w']]
                q2, _ = HP.apply(hid, k, q.m, p.pal, d['gy'], ref, mode=name)
                if (hid, k) == ('wall', 2): q2.m[crown] = new[crown]
                p.pal = q2.pal; pt['m'] = rle(q2.m[pt['y']:pt['y'] + pt['h'], pt['x']:pt['x'] + pt['w']])
            ev['pal'] = p.pal
            print(f'{hid} evo{k}: {len(np.unique(new)) - 1} colours in neutral frame, palette {len(p.pal)}')
    json.dump(d, open(OUT, 'w')); print('wrote', OUT, os.path.getsize(OUT))

if __name__ == '__main__': main()
