"""Scripted cleanup on the indexed maps + expression patches.
Face anchors are hand-picked on each hero's base (evo 0) map; evo 1/2 anchors are found by template
matching the evo-0 face against the evo map, so the shout/hurt edits land on the right pixels."""
import numpy as np, cv2
# near eye box, far eye box (x0,y0,x1,y1, inclusive-exclusive) and mouth centre, on the evo-0 canvas
FACE = {
    'bass':  dict(near=(68, 58, 73, 63), far=(79, 56, 83, 62), mouth=(75, 69), shades=False),
    'flow':  dict(near=(62, 52, 67, 58), far=(78, 52, 82, 58), mouth=(70, 64), shades=False),
    'tempo': dict(near=(67, 56, 73, 62), far=(78, 54, 83, 59), mouth=(77, 68), shades=False),
    'wall':  dict(near=(62, 50, 72, 56), far=(76, 50, 86, 56), mouth=(73, 63), shades=True),
}
SHADES = {'bass': [False, True, True], 'flow': [False] * 3, 'tempo': [False, False, True], 'wall': [True] * 3}
EXTRA = ['#ffffff', '#5a1430', '#d84a66', '#1a0c22', '#bfe8ff']  # teeth, mouth, tongue, ink, sweat
_ref = {}

def rgb(idx, pal):
    out = np.zeros(idx.shape + (3,), np.uint8)
    for i, h in enumerate(pal): out[idx == i + 1] = [int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)]
    return out

def offset(hid, idx, pal, e):
    if e == 0: return 0, 0
    r0 = _ref[hid]; im = rgb(idx, pal).astype(np.float32)
    fx = FACE[hid]; cx, cy = fx['mouth']; x0, y0 = cx - 14, cy - 18
    tpl = r0[y0:y0 + 24, x0:x0 + 24]; S = 8
    reg = im[y0 - S:y0 + 24 + S, x0 - S:x0 + 24 + S]
    res = cv2.matchTemplate(reg, tpl, cv2.TM_CCOEFF_NORMED); _, _, _, loc = cv2.minMaxLoc(res)
    return loc[0] - S, loc[1] - S

def patch(idx, box):
    x0, y0, x1, y1 = box; return dict(x=int(x0), y=int(y0), w=int(x1 - x0), h=int(y1 - y0), m=idx[y0:y1, x0:x1].copy())

def make(hid):
    def ed(idx, pal, e):
        if e == 0: _ref[hid] = rgb(idx, pal).astype(np.float32)
        dx, dy = offset(hid, idx, pal, e)
        pal = list(pal) + EXTRA; n = len(pal) - len(EXTRA)
        T, M, G, INK, SW = n + 1, n + 2, n + 3, n + 4, n + 5
        f = FACE[hid]; mx, my = f['mouth'][0] + dx, f['mouth'][1] + dy
        box = (min(f['near'][0], mx - 4) + dx * 0 - 2, min(f['near'][1], f['far'][1]) + dy - 3, max(f['far'][2], mx + 5) + dx + 2, my + 4)
        box = (box[0] + dx, box[1], box[2], box[3])
        sh = idx.copy(); hu = idx.copy()
        # shout: open mouth with an upper-teeth read and tongue
        sh[my - 2:my + 3, mx - 3:mx + 3] = M; sh[my - 2, mx - 3:mx + 3] = T; sh[my + 1:my + 3, mx - 2:mx + 2] = G
        sh[my - 3, mx - 3:mx + 3] = INK; sh[my + 3, mx - 2:mx + 2] = INK
        # hurt: gritted teeth, squeezed-shut eyes (unless hidden by shades), sweat drop
        hu[my - 1:my + 2, mx - 3:mx + 3] = T; hu[my - 2, mx - 4:mx + 4] = INK; hu[my + 2, mx - 4:mx + 4] = INK; hu[my, mx - 1] = INK; hu[my, mx + 1] = INK
        if not SHADES[hid][e]:
            for k, (x0, y0, x1, y1) in enumerate([f['near'], f['far']]):
                x0, x1, y0, y1 = x0 + dx, x1 + dx, y0 + dy, y1 + dy
                skin = np.bincount(idx[y1:y1 + 2, x0:x1].ravel()).argmax()
                hu[y0:y1, x0:x1] = skin; cy = (y0 + y1) // 2; w = x1 - x0
                for i in range(w):
                    t = i if k == 0 else w - 1 - i; yy = cy - (w // 2 - t if t < w // 2 else t - w // 2) // 2
                    hu[yy, x0 + i] = INK
        sx, sy = f['near'][0] + dx - 4, f['near'][1] + dy - 4
        hu[sy:sy + 3, sx] = SW; hu[sy + 1:sy + 3, sx - 1] = SW; hu[sy + 3, sx - 1:sx + 1] = INK
        B = (box[0] - 6, box[1] - 6, box[2] + 2, box[3] + 2)
        ex = dict(shout=patch(sh, B), hurt=patch(hu, B))
        return idx, pal, ex
    return ed
EDITS = {k: make(k) for k in FACE}
