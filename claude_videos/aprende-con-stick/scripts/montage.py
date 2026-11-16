#!/usr/bin/env python3
"""Une fotogramas PNG en una hoja de contactos: montage.py salida.png f1.png f2.png ... [--cols 4]"""
import sys
from PIL import Image, ImageDraw
args = sys.argv[1:]
cols = 4
if '--cols' in args:
    i = args.index('--cols'); cols = int(args[i + 1]); del args[i:i + 2]
out, files = args[0], args[1:]
ims = [Image.open(f).convert('RGB') for f in files]
w, h = 270, 480
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (w + 8) + 8, rows * (h + 30) + 8), (40, 40, 40))
d = ImageDraw.Draw(sheet)
for k, (im, f) in enumerate(zip(ims, files)):
    x, y = 8 + (k % cols) * (w + 8), 8 + (k // cols) * (h + 30)
    sheet.paste(im.resize((w, h)), (x, y))
    fr = int(f.split('_')[-1].split('.')[0])
    d.text((x + 4, y + h + 6), f'{fr / 30:.2f}s', fill=(255, 255, 255))
sheet.save(out)
