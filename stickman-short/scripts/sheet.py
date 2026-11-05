import sys, glob, os
from PIL import Image, ImageDraw
files = sys.argv[2:]
out = sys.argv[1]
ims = [Image.open(f) for f in files]
w, h = ims[0].size
cols = 6
rows = (len(ims)+cols-1)//cols
sheet = Image.new('RGB', (cols*w, rows*(h+30)), 'white')
d = ImageDraw.Draw(sheet)
for i,(f,im) in enumerate(zip(files,ims)):
    x, y = (i%cols)*w, (i//cols)*(h+30)
    sheet.paste(im, (x, y+30))
    d.text((x+5, y+8), os.path.basename(f), fill='black')
sheet.save(out)
