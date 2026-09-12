"""Key the flat studio background out of the supplied category shots.

Flood-fills inward from the border rather than thresholding on colour, so a
cream t-shirt on a light-grey ground keeps its body: only background actually
connected to the edge becomes transparent.

Sizing is normalised by *ink area*, not by bounding box: a long thin coat and a
wide handbag cover a similar number of opaque pixels, so they carry the same
visual weight in the rail. Fitting them by bounding box instead would leave the
coat a thin sliver next to a bag that fills its disc.
"""
import os, sys, math
from PIL import Image, ImageDraw, ImageFilter

SRC = '/Users/Bekhzod_Tokhirjonov/Desktop/Swipe/svayp_webapp/swipe-web/public/images/market/categories'
OUT = sys.argv[1]
WORK = 720        # key at this size, then downsample — cheaper and anti-aliases
FINAL = 320
SPAN = 275        # target longest edge on a 320 canvas
INK = 165         # target sqrt(opaque px): the item's optical size
MAX_SPAN = 296    # but never let a dimension exceed this, so nothing clips
SENTINEL = (255, 0, 255)

MAP = {
    'tops_category.avif': 'tops',
    'dress_category.webp': 'dresses',
    'bottoms_category.avif': 'bottoms',
    'outwear_category.avif': 'outerwear',
    'shoes_category.avif': 'shoes',
    'bags_category.avif': 'bags',
    'headscarf_category.avif': 'hijab',
    'jewelery_category.avif': 'jewelry',
    'underwear_category.jpg': 'underwear',
}

os.makedirs(OUT, exist_ok=True)

for fname, gid in MAP.items():
    im = Image.open(os.path.join(SRC, fname)).convert('RGB')
    im.thumbnail((WORK, WORK), Image.LANCZOS)
    w, h = im.size

    # Flood from many border points so a garment touching one edge can't seal
    # the background off from the rest.
    for t in range(0, 21):
        for s in ((int(t * (w - 1) / 20), 0), (int(t * (w - 1) / 20), h - 1),
                  (0, int(t * (h - 1) / 20)), (w - 1, int(t * (h - 1) / 20))):
            if im.getpixel(s) != SENTINEL:
                ImageDraw.floodfill(im, s, SENTINEL, thresh=26)

    mask = Image.new('L', (w, h), 255)
    px, mp = im.load(), mask.load()
    for y in range(h):
        for x in range(w):
            if px[x, y] == SENTINEL:
                mp[x, y] = 0
    mask = mask.filter(ImageFilter.GaussianBlur(0.6))  # soften the flood's staircase

    # Flatten the keyed-out pixels to the studio tone first: where alpha is
    # partial the colour still shows, and magenta fringing would be obvious.
    bg = Image.new('RGB', (w, h), (240, 240, 242))
    im = Image.composite(im, bg, mask.point(lambda v: 255 if v > 128 else 0))
    im.putalpha(mask)

    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)

    # Two sizing metrics, geometrically averaged. Bounding box alone leaves a
    # long coat a thin sliver beside a handbag; ink area alone shrinks a solid
    # t-shirt beside a pair of strappy sandals that barely cover any pixels.
    # The mean damps both extremes.
    ink = sum(im.getchannel('A').histogram()[200:])
    scale = math.sqrt((SPAN / max(im.size)) * (INK / max(math.sqrt(ink), 1)))
    scale = min(scale, MAX_SPAN / max(im.size))     # never clip
    target = (max(1, round(im.width * scale)), max(1, round(im.height * scale)))
    im = im.resize(target, Image.LANCZOS)

    canvas = Image.new('RGBA', (FINAL, FINAL), (0, 0, 0, 0))
    canvas.paste(im, ((FINAL - im.width) // 2, (FINAL - im.height) // 2))

    dest = os.path.join(OUT, f'{gid}.webp')
    canvas.save(dest, 'WEBP', quality=88, method=6)
    print(f'{gid:11} {os.path.getsize(dest)//1024:3} KB  {target[0]:3}x{target[1]:3}  scale {scale:.2f}')
