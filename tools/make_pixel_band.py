"""Draw the pixel stripe that leads from the top of the page into the models.

The idea comes from the "sunset stripe" on mistral.ai, redone with AKIKI's own pixel and colours:
five rows of logo pixels step from Jasmine's purple through Daisy's blue, teal and Tulip's
green down to the daisy's golden heart. Above and below, the pixels thin out into the page
(blue-noise dither), so the stripe dissolves in and out instead of starting with a hard edge.

The SVG is one tile that repeats sideways without a seam. Pixel shape and colours come from
tools/make_akiki_logo.py.

Usage: python3 tools/make_pixel_band.py OUTPUT.svg
"""
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_akiki_logo as logo  # noqa: E402  (same pixel and colours as the logo)

COLS = 128                             # tile width in pixels: wider than the README box at 8px
STRIPES = [logo.PETALS[6], logo.PETALS[4], logo.PETALS[2], logo.PETALS[0], logo.GOLD]
FADE = [0.65, 0.4, 0.2, 0.08]          # share of pixels left in each row as the stripe dissolves


def blue_noise_ranks(rows, seed):
    """Rank every cell so that any number of the first ones is evenly spread (x wraps around)."""
    rnd = random.Random(seed)
    far = {(c, r): float('inf') for r in range(rows) for c in range(COLS)}
    rank = {}
    while far:
        best = max(far.values())
        pick = rnd.choice([cell for cell, d in far.items() if d == best])
        rank[pick] = len(rank)
        del far[pick]
        for c, r in far:
            dx = abs(c - pick[0])
            d = min(dx, COLS - dx) ** 2 + (1.6 * (r - pick[1])) ** 2   # rows count a bit further apart
            if d < far[(c, r)]:
                far[(c, r)] = d
    return rank


def fade_rows(colour, shares, seed):
    rank = blue_noise_ranks(len(shares), seed)
    rows = []
    for r, share in enumerate(shares):
        keep = {c for _, c in sorted((rank[(c, r)], c) for c in range(COLS))[:round(share * COLS)]}
        rows.append([colour if c in keep else None for c in range(COLS)])
    return rows


def build():
    grid = fade_rows(STRIPES[0], FADE[::-1], seed=7)      # sparse at the top
    grid += [[colour] * COLS for colour in STRIPES]
    grid += fade_rows(STRIPES[-1], FADE, seed=8)          # sparse at the bottom
    return grid


def svg(grid):
    # Each colour is one path of horizontal runs; a pattern mask cuts the runs into logo pixels.
    runs = {}
    for r, line in enumerate(grid):
        c = 0
        while c < COLS:
            start = c
            while c < COLS and line[c] == line[start]:
                c += 1
            if line[start]:
                runs.setdefault(line[start], []).append(f'M{start} {r}h{c - start}v1H{start}z')
    rows = len(grid)
    inset, size, radius = [logo.f(v / logo.PITCH) for v in ((logo.PITCH - logo.SIZE) / 2, logo.SIZE, logo.RADIUS)]
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{COLS * 8}" height="{rows * 8}" viewBox="0 0 {COLS} {rows}">'
            '<defs><pattern id="px" width="1" height="1" patternUnits="userSpaceOnUse">'
            f'<rect x="{inset}" y="{inset}" width="{size}" height="{size}" rx="{radius}" fill="#fff"/></pattern>'
            f'<mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="{COLS}" height="{rows}">'
            f'<rect width="{COLS}" height="{rows}" fill="url(#px)"/></mask></defs>'
            '<g mask="url(#m)">' + ''.join(f'<path fill="{colour}" d="{"".join(d)}"/>' for colour, d in runs.items())
            + '</g></svg>\n')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    grid = build()
    open(sys.argv[1], 'w').write(svg(grid))
    print(f'{len(grid)} rows (the CSS height of .pixel-band assumes this)')
