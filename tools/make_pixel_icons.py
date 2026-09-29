"""Draw the pixel icons of the box stack at the top of the page, as SVG <symbol>s.

Each icon is a 5x5 glyph of the AKIKI logo's rounded pixels. The models get a white glyph (the
bouquet, a moth orchid, Tulip's flower head, Jasmine's star, Magnolia's cup, the one-byte daisy)
on a tile in their card's colour; "your data" is a bare glyph in ink. "Your computer" is a little farm, 15 pixels wide:
a barn, a silo and a row of flowers in the colours of the small models that grow there. H marks a
golden pixel; m, g, p and o mark Orchid magenta, Tulip green, Jasmine purple and Daisy orange.

Usage: python3 tools/make_pixel_icons.py > symbols.txt   (paste into the sprite in index.html)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_akiki_logo as logo  # noqa: E402  (same pixel and colours as the logo)

PITCH = 6                                   # 5 x 5 glyph = 30 units, centred in a 40-unit icon
SIZE = PITCH * logo.SIZE / logo.PITCH
RADIUS = PITCH * logo.RADIUS / logo.PITCH

ICONS = {
    'bouquet': ('#35adb0', ['.X.X.', 'X.X.X', '.XXX.', '..H..', '.X.X.']),     # flowers tied with a golden bow
    'orchid': ('#c2549e', ['XX.XX', 'XX.XX', '..H..', '.XXX.', 'X.X.X']),     # a moth orchid: broad petals, lip
    'tulip': ('#3aa56f', ['X.X.X', 'XXXXX', 'XXXXX', '.XXX.', '..X..']),
    'jasmine': ('#a06fc2', ['..X..', '..X..', 'XXHXX', '.X.X.', 'X...X']),
    'magnolia': ('#de7c95', ['.X.X.', 'XX.XX', '.XXX.', '.XHX.', '..X..']),  # a cup of petals on a stem
    'daisy': ('#ec8e4a', ['..X..', '.X.X.', 'X.H.X', '.X.X.', '..X..']),       # the one-byte flower
    'data': (None, ['XXXXX', 'X.H.X', 'XXXXX', 'X.X.X', 'XXXXX']),             # a spreadsheet
    'farm': (None, ['.XXX...........',                                          # your computer
                    'XXXXX.X........',
                    'XXHXX.X.m.g.p.o',
                    'XX.XX.X.g.g.g.g',
                    'XXXXXXXXXXXXXXX']),
}
FLOWERS = {'m': '#c2549e', 'g': '#3aa56f', 'p': '#a06fc2', 'o': '#ec8e4a'}


def symbol(name, tile, rows):
    ink = '#ffffff' if tile else logo.INK
    width = len(rows[0]) * PITCH + 10                   # 5 units of margin on each side
    parts = [f'<rect width="{width}" height="40" fill="{tile}"/>'] if tile else []
    for mark, colour in [('X', ink), ('H', logo.GOLD)] + list(FLOWERS.items()):
        px = [(c, r) for r, line in enumerate(rows) for c, ch in enumerate(line) if ch == mark]
        if px:
            inset = (PITCH - SIZE) / 2 + 5
            parts.append(f'<g fill="{colour}">' + ''.join(
                f'<rect x="{logo.f(inset + c * PITCH)}" y="{logo.f(inset + r * PITCH)}" width="{logo.f(SIZE)}" '
                f'height="{logo.f(SIZE)}" rx="{logo.f(RADIUS)}"/>' for c, r in px) + '</g>')
    return f'<symbol id="px-{name}" viewBox="0 0 {width} 40">' + ''.join(parts) + '</symbol>'


if __name__ == '__main__':
    for name, (tile, rows) in ICONS.items():
        print('    ' + symbol(name, tile, rows))
