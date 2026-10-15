"""Step 1: segment refs/target-heroes.jpg into 12 clean per-cell cutouts (RGBA, bg removed).
Rows are found by background gaps; within a row each connected component is assigned to the cell
holding its centroid, so props that cross the third-lines (glowsticks, arrow, fan) don't bleed."""
import sys, json, numpy as np
from PIL import Image
from scipy import ndimage as nd
BG = np.array([6, 3, 21])
def crops(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(int)
    m = np.abs(a - BG).sum(2) > 40
    m = nd.binary_opening(m, iterations=1)
    rows = m.sum(1) > 2
    bands, y = [], 0
    while y < len(rows):
        if rows[y]:
            s = y
            while y < len(rows) and rows[y]: y += 1
            if y - s > 100: bands.append((s, y))
        y += 1
    assert len(bands) == 4, bands
    W = a.shape[1]; out = []
    for (y0, y1) in bands:
        lab, n = nd.label(m[y0:y1], structure=np.ones((3, 3)))
        objs = nd.find_objects(lab)
        sizes = nd.sum(np.ones_like(lab), lab, range(1, n + 1))
        cells = [np.zeros_like(lab, bool) for _ in range(3)]
        for i in range(n):
            if sizes[i] < 30: continue
            ys, xs = np.nonzero(lab == i + 1)
            k = min(2, int(xs.mean() / (W / 3)))
            cells[k] |= lab == i + 1
        for k in range(3):
            cm = nd.binary_fill_holes(nd.binary_closing(cells[k], iterations=2))
            ys, xs = np.nonzero(cm)
            bx0, bx1, by0, by1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
            rgb = a[y0 + by0:y0 + by1, bx0:bx1].astype(np.uint8)
            al = (cm[by0:by1, bx0:bx1] * 255).astype(np.uint8)
            out.append(dict(rect=[int(bx0), int(y0 + by0), int(bx1), int(y0 + by1)], img=Image.fromarray(np.dstack([rgb, al]), 'RGBA')))
    return out
if __name__ == '__main__':
    res = crops(sys.argv[1]); od = sys.argv[2]
    for i, c in enumerate(res): c['img'].save(f'{od}/crop{i:02d}.png')
    json.dump([c['rect'] for c in res], open(f'{od}/crops.json', 'w'))
    print([c['rect'] for c in res])
