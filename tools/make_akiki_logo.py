"""Draw the AKIKI logo: a byte-sized, retro-yet-current pixel mark.

- The symbol is a flower made of exactly one byte: eight petal pixels (one per bit)
  around a golden heart pixel.
- The name is set in a tiny hand-made pixel font, every letter the height of the a (the
  fewest pixels that still read). The first a and the last i take the diamond's colours.
  A terminal cursor follows, with the motto in a monospace font underneath.

Usage: python3 tools/make_akiki_logo.py OUTPUT_DIR [--variants]
Needs: pip install fonttools (the motto is converted to outlines from DejaVu Sans Mono).
"""
import os
import sys

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
MOTTO = 'a kinder Kind of AI'
INK, INK_ON_DARK, MUTED, MUTED_ON_DARK = '#2f4d5c', '#e6edf3', '#6a7681', '#9aa6b2'
GOLD = '#f2b632'
PETALS = ['#3aa56f', '#2fb39a', '#35adb0', '#6592b4', '#7c8acb', '#8a80cf', '#a06fc2', '#ad76bb']

PITCH, SIZE, RADIUS = 10, 8.4, 1.9     # one pixel: 10 units apart, drawn 8.4 wide, softly rounded

# Pixel font, every letter 5 rows high (the height of the a). 'd' marks the i dot.
GLYPHS = {
    'a': ['.XX.', '...X', '.XXX', 'X..X', '.XXX'],
    'k': ['X..X', 'X.X.', 'XX..', 'X.X.', 'X..X'],
    'i': ['d', '.', 'X', 'X', 'X'],
}
ROWS = 5
COLOURED = (0, 4)   # the first a and the last i take the diamond's colours
MIRRORED = (1,)     # the first k is flipped, so the two k's face each other around the middle i
# One byte: petals 0-7 clockwise from the top, H is the heart.
FLOWER = ['..0..', '.7.1.', '6.H.2', '.5.3.', '..4..']


def f(x):
    s = ('%.2f' % x).rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s


def pixel(col, row, colour, ox=0, oy=0, cls=''):
    x, y = ox + col * PITCH + (PITCH - SIZE) / 2, oy + row * PITCH + (PITCH - SIZE) / 2
    c = f' class="{cls}"' if cls else ''
    return f'<rect{c} x="{f(x)}" y="{f(y)}" width="{f(SIZE)}" height="{f(SIZE)}" rx="{f(RADIUS)}" fill="{colour}"/>'


BLINK = ('<style>.cursor{animation:blink 1.1s steps(1) infinite}@keyframes blink{50%{opacity:0}}'
         '@media (prefers-reduced-motion:reduce){.cursor{animation:none}}</style>')


def flower(col, row, petals='colour', ink=INK):
    out = []
    for r, line in enumerate(FLOWER):
        for c, ch in enumerate(line):
            if ch == 'H':
                out.append(pixel(col + c, row + r, GOLD))
            elif ch.isdigit():
                out.append(pixel(col + c, row + r, PETALS[int(ch)] if petals == 'colour' else ink))
    return out


def palette_at(t):
    return PETALS[min(len(PETALS) - 1, round(t * (len(PETALS) - 1)))]


def word(col, row, ink, dot=GOLD, cursor=True):
    out, x = [], col
    for n, ch in enumerate('akiki'):
        g = [line[::-1] for line in GLYPHS[ch]] if n in MIRRORED else GLYPHS[ch]
        w = len(g[0])
        for r, line in enumerate(g):
            for c, px in enumerate(line):
                if px == '.':
                    continue
                if n in COLOURED:     # diagonal sweep through the diamond's colours
                    colour = palette_at((c + r) / max(1, (w - 1) + (ROWS - 1)))
                else:
                    colour = dot if px == 'd' else ink
                out.append(pixel(x + c, row + r, colour))
        x += w + 1
    if cursor:  # a terminal cursor on the baseline
        for c in range(3):
            out.append(pixel(x + c, row + ROWS - 1, GOLD if cursor == 'gold' else ink, cls='cursor'))
        x += 3
    return out, x


def motto(x0, baseline, size, colour):
    font = TTFont(MONO)
    glyphs, cmap = font.getGlyphSet(), font.getBestCmap()
    s = size / font['head'].unitsPerEm
    pen, x = SVGPathPen(glyphs), 0
    for ch in MOTTO:
        g = cmap[ord(ch)]
        glyphs[g].draw(TransformPen(pen, (s, 0, 0, -s, x0 + x * s, baseline)))
        x += glyphs[g].width
    return f'<path fill="{colour}" d="{pen.getCommands()}"/>', x * s


def svg(w, h, parts, label):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {f(w)} {f(h)}" width="{f(w)}" height="{f(h)}" '
            f'role="img" aria-label="{label}">' + ''.join(parts) + '</svg>\n')


def logo(dark=False, petals='colour', cursor=True, tagline=True):
    ink, muted = (INK_ON_DARK, MUTED_ON_DARK) if dark else (INK, MUTED)
    pad = 1                                   # in pixels
    parts = [BLINK] + flower(pad, pad, petals, ink)
    letters, end = word(pad + 7, pad, ink, cursor=cursor)
    parts += letters
    w = (end + pad) * PITCH
    h = (pad + ROWS + pad) * PITCH
    if tagline:
        tag, tag_w = motto((pad + 7) * PITCH + 1, (pad + ROWS) * PITCH + 25, 17.5, muted)
        parts.append(tag)
        w = max(w, (pad + 7) * PITCH + tag_w + pad * PITCH)
        h += 28
    return svg(w, h, parts, 'akiki, a kinder Kind of AI' if tagline else 'akiki')


def icon(petals='colour'):
    return svg(7 * PITCH, 7 * PITCH, flower(1, 1, petals), 'akiki')


def build(out, variants=False):
    files = {
        'akiki-logo.svg': logo(),
        'akiki-logo-dark.svg': logo(dark=True),
        'akiki-wordmark.svg': logo(tagline=False),
        'akiki-icon.svg': icon(),
    }
    if variants:
        files = {
            'v1-colour-cursor.svg': logo(),
            'v2-modest-cursor.svg': logo(petals='ink'),
            'v3-colour-gold-cursor.svg': logo(cursor='gold'),
            'v4-colour-no-cursor.svg': logo(cursor=False),
            'v1-dark.svg': logo(dark=True),
            'icon-colour.svg': icon(),
            'icon-modest.svg': icon('ink'),
        }
    for name, content in files.items():
        open(os.path.join(out, name), 'w').write(content)


if __name__ == '__main__':
    if len(sys.argv) not in (2, 3):
        sys.exit(__doc__)
    build(sys.argv[1], variants='--variants' in sys.argv)
