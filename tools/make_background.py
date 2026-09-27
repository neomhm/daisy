"""Draw the page background: gentle pastel squares in the logo's colours, as one seamless tile.

Soft rounded squares of a few sizes, mostly large and calm with a few small ones, are spread
evenly (no clumps, no overlaps) and wrap around the tile's edges, so the pattern repeats
without a seam. Colours are the logo's, mixed mostly with white.

Usage: python3 tools/make_background.py OUTPUT.svg
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_akiki_logo as logo  # noqa: E402  (same colours as the logo)

TILE = 1080
SIZES = [(96, 7), (64, 11), (40, 11), (22, 11)]   # (side in px, how many per tile)
COLOURS = logo.PETALS + [logo.GOLD, '#ec8e4a']
WHITE = 0.84                                      # share of white mixed into each colour
SEED = 11


def mix(c, t):
    r, g, b = (int(c[i:i + 2], 16) for i in (1, 3, 5))
    return '#%02x%02x%02x' % tuple(round(v + (255 - v) * t) for v in (r, g, b))


def wrap(d):
    return min(d, TILE - d)


def place():
    """Largest squares first; each new one goes where it is farthest from the others."""
    rnd = random.Random(SEED)
    squares = []
    for side, count in SIZES:
        for _ in range(count):
            best, best_gap = None, -1
            for _ in range(400):
                x, y = rnd.uniform(0, TILE), rnd.uniform(0, TILE)
                gap = min((max(wrap(abs(x - sx)), wrap(abs(y - sy))) - (side + ss) / 2
                           for sx, sy, ss, _ in squares), default=TILE)
                if gap > best_gap:
                    best, best_gap = (x, y), gap
            squares.append((best[0], best[1], side, rnd.choice(COLOURS)))
    return squares


def svg(squares):
    rects = []
    for x, y, side, colour in squares:
        for dx in (-TILE, 0, TILE):                # copies across the edges keep the tile seamless
            for dy in (-TILE, 0, TILE):
                cx, cy = x + dx, y + dy
                if -side < cx < TILE + side and -side < cy < TILE + side:
                    rects.append(f'<rect x="{cx - side / 2:.1f}" y="{cy - side / 2:.1f}" width="{side}" '
                                 f'height="{side}" rx="{side * 0.12:.1f}" fill="{mix(colour, WHITE)}"/>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{TILE}" height="{TILE}" '
            f'viewBox="0 0 {TILE} {TILE}">' + ''.join(rects) + '</svg>\n')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    squares = place()
    open(sys.argv[1], 'w').write(svg(squares))
    gap = min(max(wrap(abs(a[0] - b[0])), wrap(abs(a[1] - b[1]))) - (a[2] + b[2]) / 2
              for i, a in enumerate(squares) for b in squares[i + 1:])
    print(f'{len(squares)} squares; the closest two are {gap:.0f}px apart')
