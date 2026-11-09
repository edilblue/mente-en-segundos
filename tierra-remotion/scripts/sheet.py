import sys
from PIL import Image
ims=[Image.open(f) for f in sys.argv[2:]]
o=Image.new('RGB',(sum(i.width for i in ims),ims[0].height))
x=0
for i in ims: o.paste(i,(x,0)); x+=i.width
o.save(sys.argv[1], quality=82)
