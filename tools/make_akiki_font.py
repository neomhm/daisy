"""Build "AKIKI Pixel", a colour web font that draws the word akiki exactly like the AKIKI logo.

Typing "akiki" in this font triggers a ligature that draws the whole logo word: the flipped
first k, the golden dot on the middle i, and the first a and last i in the diamond's colours
(a COLR/CPAL colour font). Ink pixels use the page's text colour. "_" is the cursor.

The font also sets the motto "A kinder Kind of AI.": letters are unicase (capitals share the
pixel shapes), the small k is flipped like the logo's first k, every i has a golden dot, and
"AI" in capitals becomes the coloured a and i of the logo.
Pixel shapes, spacing and colours come from tools/make_akiki_logo.py, so font and logo match.

Usage: python3 tools/make_akiki_font.py OUTPUT.woff2
Needs: pip install fonttools brotli
"""
import os
import sys

from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_akiki_logo as logo  # noqa: E402  (same pixel font, colours and layout as the logo)

UPM = 1000
P = 140                                   # one pixel pitch in font units; 5 rows = 700 = cap height
SIZE = round(P * logo.SIZE / logo.PITCH)  # drawn pixel, same proportions as the logo
RAD = round(P * logo.RADIUS / logo.PITCH)
GAP = (P - SIZE) / 2
INK = 0xFFFF                              # COLR: use the current text colour


# Extra letters for the motto, in the logo's 5-row style.
EXTRA = {
    'n': ['XXX.', 'X..X', 'X..X', 'X..X', 'X..X'],
    'd': ['...X', '.XXX', 'X..X', 'X..X', '.XXX'],
    'e': ['.XX.', 'X..X', 'XXXX', 'X...', '.XXX'],
    'r': ['X.XX', 'XX..', 'X...', 'X...', 'X...'],
    'o': ['.XX.', 'X..X', 'X..X', 'X..X', '.XX.'],
    'f': ['..XX', '.X..', 'XXX.', '.X..', '.X..'],
    'period': ['.', '.', '.', '.', 'X'],
}


def rgba(h):
    return tuple(int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)) + (1.0,)


def rounded(pen, col, row):
    x0 = round(col * P + GAP)
    y0 = round((logo.ROWS - 1 - row) * P + GAP)
    x1, y1, r = x0 + SIZE, y0 + SIZE, RAD
    pen.moveTo((x0, y0 + r))
    pen.lineTo((x0, y1 - r))
    pen.qCurveTo((x0, y1), (x0 + r, y1))
    pen.lineTo((x1 - r, y1))
    pen.qCurveTo((x1, y1), (x1, y1 - r))
    pen.lineTo((x1, y0 + r))
    pen.qCurveTo((x1, y0), (x1 - r, y0))
    pen.lineTo((x0 + r, y0))
    pen.qCurveTo((x0, y0), (x0, y0 + r))
    pen.closePath()


def glyph(pixels):
    pen = TTGlyphPen(None)
    for col, row in pixels:
        rounded(pen, col, row)
    return pen.glyph()


def letter_pixels(ch, mirrored=False):
    rows = logo.GLYPHS[ch] if ch in logo.GLYPHS else EXTRA[ch]
    rows = [line[::-1] for line in rows] if mirrored else rows
    return [(c, r) for r, line in enumerate(rows) for c, px in enumerate(line) if px != '.'], len(rows[0])


def word_layers(word='akiki', coloured=logo.COLOURED, mirrored=logo.MIRRORED):
    """Pixels of a word, grouped by colour (same rules as the logo)."""
    layers, x = {}, 0
    for n, ch in enumerate(word):
        pixels, w = letter_pixels(ch, n in mirrored)
        rows = [line[::-1] for line in logo.GLYPHS[ch]] if n in mirrored else logo.GLYPHS[ch]
        for c, r in pixels:
            if n in coloured:
                colour = logo.palette_at((c + r) / max(1, (w - 1) + (logo.ROWS - 1)))
            else:
                colour = logo.GOLD if rows[r][c] == 'd' else 'ink'
            layers.setdefault(colour, []).append((x + c, r))
        x += w + 1
    return layers, x


def build(out):
    glyphs = {'.notdef': glyph([]), 'space': glyph([])}
    advance = {'.notdef': 2 * P, 'space': 3 * P}
    cmap = {0x20: 'space', ord('_'): 'underscore', ord('.'): 'period'}
    for ch in 'akinderof':
        for name in (ch, ch.upper()):             # unicase: capitals share the pixel shapes
            # the small k is flipped, like the logo's first k, so "kinder Kind" face each other
            pixels, w = letter_pixels(ch, mirrored=(name == 'k'))
            glyphs[name] = glyph(pixels)
            advance[name] = (w + 1) * P
            cmap[ord(name)] = name
    pixels, w = letter_pixels('period')
    glyphs['period'], advance['period'] = glyph(pixels), (w + 1) * P
    glyphs['underscore'] = glyph([(0, logo.ROWS - 1), (1, logo.ROWS - 1), (2, logo.ROWS - 1)])
    advance['underscore'] = 4 * P

    colours, colr = [], {}

    def colour_glyph(name, layers, width):
        """A colour glyph: plain outline for fallback plus one layer per colour."""
        glyphs[name] = glyph([p for pixels in layers.values() for p in pixels])
        advance[name] = width * P
        colr[name] = []
        for i, (colour, pixels) in enumerate(layers.items()):
            lname = f'{name}.layer{i}'
            glyphs[lname] = glyph(pixels)
            advance[lname] = width * P
            if colour != 'ink' and colour not in colours:
                colours.append(colour)
            colr[name].append((lname, INK if colour == 'ink' else colours.index(colour)))

    layers, width = word_layers()
    colour_glyph('akiki', layers, width)                                   # the logo word
    layers, width = word_layers('ai', coloured=(0, 1), mirrored=())
    colour_glyph('A_I', layers, width)                                     # "AI": the logo's coloured a and i
    for name in ('i', 'I'):                                                # every i gets the golden dot
        layers, width = word_layers('i', coloured=(), mirrored=())
        colour_glyph(name, layers, width)
    palette = [rgba(c) for c in colours]

    order = list(glyphs)
    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(glyphs)
    glyf = fb.font['glyf']
    metrics = {}
    for name in order:
        g = glyf[name]
        g.recalcBounds(glyf)
        metrics[name] = (advance[name], getattr(g, 'xMin', 0) if g.numberOfContours else 0)
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=800, descent=-200)
    fb.setupNameTable({'familyName': 'AKIKI Pixel', 'styleName': 'Regular'})
    fb.setupOS2(sTypoAscender=800, sTypoDescender=-200, sTypoLineGap=0, usWinAscent=800, usWinDescent=200,
                sxHeight=700, sCapHeight=700)
    fb.setupPost()
    fb.setupCPAL([palette])
    fb.setupCOLR(colr)
    addOpenTypeFeaturesFromString(fb.font, 'feature liga { sub a k i k i by akiki; sub A I by A_I; } liga;')
    fb.font.flavor = 'woff2' if out.endswith('.woff2') else None
    fb.save(out)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    build(sys.argv[1])
