import json,base64,io,sys
from PIL import Image, ImageDraw, ImageFont
def load(f): return [(d['label'], Image.open(io.BytesIO(base64.b64decode(d['url'].split(',')[1]))).convert('RGBA')) for d in json.load(open(f))]
old=load(sys.argv[1]); new=load(sys.argv[2])
names={'bass':'BASS BRAWLER (Dubstep)','flow':'FLOW HEALER (House)','tempo':'TEMPO DANCER (DnB)','wall':'WALL OF SOUND (Hardstyle)'}
cw=260; ch=300; W=60+cw*6+40; H=70+ch*4
im=Image.new('RGBA',(W,H),(16,10,34,255)); d=ImageDraw.Draw(im)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',18); sm=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',13)
d.text((60,18),'BEFORE  (48x50 art, shown 4x)',fill=(255,106,216),font=font)
d.text((60+cw*3+40,18),'AFTER  (96x100 art, shown 2x, same on-screen size)',fill=(58,232,255),font=font)
d.line((60+cw*3+20,50,60+cw*3+20,H-10),fill=(90,70,140),width=3)
for r,h in enumerate(['bass','flow','tempo','wall']):
  y=55+r*ch; d.text((8,y),names[h],fill=(184,255,58),font=sm)
  for e in range(3):
    for arr,sc,x0 in ((old,4,60),(new,2,60+cw*3+40)):
      lab,spr=arr[r*3+e]; s=spr.resize((spr.width*sc,spr.height*sc),Image.NEAREST)
      im.alpha_composite(s,(x0+e*cw+(cw-s.width)//2, y+ch-30-s.height))
      d.text((x0+e*cw+cw//2-18,y+ch-24),['base','evo 1','evo 2'][e],fill=(200,190,230),font=sm)
im.convert('RGB').save(sys.argv[3])
