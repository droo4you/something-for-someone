"""Sprites-only preview: shots/heroes-v4-sheet.png (rows bass/flow/tempo/wall, cols evo 0-2, 3x nearest, dark bg)."""
import json, base64, numpy as np
from PIL import Image
d = json.load(open('src/ui/heromaps.json')); W, H = d['w'], d['h']; S = 3
def un(s):
    b = base64.b64decode(s); o = np.zeros(W * H, np.uint8); p = 0
    for i in range(0, len(b), 2): o[p:p + b[i]] = b[i + 1]; p += b[i]
    return o.reshape(H, W)
sheet = np.zeros((H * 4, W * 3, 3), np.uint8); sheet[:] = (22, 16, 34)
for r, hid in enumerate(['bass', 'flow', 'tempo', 'wall']):
    for c, ev in enumerate(d['heroes'][hid]):
        m = un(ev['body'])
        if ev['addon']: a = un(ev['addon']); m = np.where(a > 0, a, m)
        for i, h in enumerate(ev['pal']):  # palette lookup is pal[v-1]
            sheet[r * H:(r + 1) * H, c * W:(c + 1) * W][m == i + 1] = [int(h[j:j + 2], 16) for j in (1, 3, 5)]
Image.fromarray(sheet).resize((W * 3 * S, H * 4 * S), Image.NEAREST).save('shots/heroes-v4-sheet.png'); print('ok')
