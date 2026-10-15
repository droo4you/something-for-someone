"""shots/heroes-v4-pipeline.png: per hero/evo -> target crop | unfake recovered grid | final sprite (all 3x-ish nearest)."""
import sys
from PIL import Image, ImageDraw, ImageFont
W = sys.argv[1] if len(sys.argv) > 1 else '/tmp/pxwork'
ids = ['bass', 'flow', 'tempo', 'wall']; CH = 480; CW = 330
f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 16)
S = Image.new('RGBA', (CW * 9 + 20, 40 + CH * 4), (14, 10, 28, 255)); d = ImageDraw.Draw(S)
d.text((10, 10), 'v4 pipeline   per evo: TARGET crop | RECOVERED grid (unfake) | FINAL sprite (136x160 map, 3x nearest)', fill=(230, 220, 255), font=f)
for r, h in enumerate(ids):
    for e in range(3):
        ims = [Image.open(f'{W}/{h}{e}_crop.png'), Image.open(f'{W}/{h}{e}_grid.png'), Image.open(f'{W}/{h}{e}_final.png')]
        for k, im in enumerate(ims):
            im = im.convert('RGBA'); im = im.crop(im.getbbox()) if k == 2 else im; s = min((CW - 10) / im.width, (CH - 30) / im.height)
            if k: s = max(1, int(s))
            im = im.resize((int(im.width * s), int(im.height * s)), Image.NEAREST if k else Image.LANCZOS)
            x = 10 + (e * 3 + k) * CW; S.alpha_composite(im, (x + (CW - im.width) // 2, 40 + r * CH + (CH - 20 - im.height)))
            d.text((x + 4, 40 + r * CH + CH - 18), f'{h} evo{e} ' + ['target', 'grid', 'final'][k], fill=(255, 140, 220), font=f)
S.convert('RGB').save('shots/heroes-v4-pipeline.png')
