# Build shots/heroes-vs-target.png: for each hero/evo, the target cell next to the new sprite.
import json,base64,io,sys
from PIL import Image, ImageDraw, ImageFont
tgt=Image.open('refs/target-heroes.jpg').convert('RGBA'); TW,TH=tgt.width/3,tgt.height/4
new=[Image.open(io.BytesIO(base64.b64decode(d['url'].split(',')[1]))).convert('RGBA') for d in json.load(open(sys.argv[1]))]
names=['BASS BRAWLER','FLOW HEALER','TEMPO DANCER','WALL OF SOUND']
CW,CH=400,560; W=CW*6+20; H=60+CH*4
im=Image.new('RGBA',(W,H),(12,8,24,255)); d=ImageDraw.Draw(im)
f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',18); sm=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',13)
d.text((10,16),'TARGET (refs/target-heroes.jpg)  vs  NEW (in-game sprite, idle frame, 3x nearest)   columns: base | evo1 | evo2',fill=(230,220,255),font=f)
for r in range(4):
  y=50+r*CH; d.text((10,y),names[r],fill=(184,255,58),font=sm)
  for e in range(3):
    cell=tgt.crop((int(e*TW),int(r*TH),int((e+1)*TW),int((r+1)*TH))).resize((int(TW*(CH-30)/TH),CH-30))
    x=10+e*2*CW; im.alpha_composite(cell,(x,y+16)); d.text((x+4,y+CH-20),'target',fill=(255,120,220),font=sm)
    s=new[r*3+e]; s=s.resize((s.width*3,s.height*3),Image.NEAREST)
    im.alpha_composite(s,(x+CW+(CW-s.width)//2,y+CH-26-s.height)); d.text((x+CW+4,y+CH-20),'new',fill=(90,230,255),font=sm)
im.convert('RGB').save(sys.argv[2])
