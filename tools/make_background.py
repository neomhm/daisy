"""Draw the page background: gentle pastel squares in the logo's colours, drifting very slowly.

Soft rounded squares of a few sizes, mostly large and calm with a few small ones, are spread
evenly over the window (no clumps). Each one glides back and forth in its own direction over
five to ten minutes, never in step with the others. Colours are the logo's, mixed
mostly with white. The squares are plain HTML elements moved by CSS, which is light work for
the browser.

Usage: python3 tools/make_background.py > drift.txt   (paste into daisy.html, right after <body>)
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_akiki_logo as logo  # noqa: E402  (same colours as the logo)

SIZES = [(96, 5), (64, 8), (40, 8), (22, 9)]      # (side in px, how many)
COLOURS = logo.PETALS + [logo.GOLD, '#ec8e4a']
WHITE = 0.84                                      # share of white mixed into each colour
ASPECT = 1.6                                      # spread them for a typical wide window
SEED = 11


def mix(c, t):
    r, g, b = (int(c[i:i + 2], 16) for i in (1, 3, 5))
    return '#%02x%02x%02x' % tuple(round(v + (255 - v) * t) for v in (r, g, b))


def place():
    """Largest squares first; each new one goes where it is farthest from the others."""
    rnd = random.Random(SEED)
    squares = []
    for side, count in SIZES:
        for _ in range(count):
            best, best_gap = None, -1
            for _ in range(300):
                x, y = rnd.uniform(0, 100), rnd.uniform(0, 100)
                gap = min((math.hypot((x - q['x']) * ASPECT, y - q['y']) for q in squares), default=1e9)
                if gap > best_gap:
                    best, best_gap = (x, y), gap
            a = rnd.uniform(0, 2 * math.pi)                     # its own direction
            reach = rnd.uniform(50, 140)                        # px travelled each way
            time = rnd.uniform(280, 560)                        # seconds per glide
            squares.append(dict(x=best[0], y=best[1], s=side, c=mix(rnd.choice(COLOURS), WHITE),
                                dx=reach * math.cos(a), dy=reach * math.sin(a), t=time,
                                p=-rnd.uniform(0, 2 * time)))   # start part-way, out of step
    return squares


def html(squares):
    items = ''.join(f'<i style="--x:{q["x"]:.1f}vw;--y:{q["y"]:.1f}vh;--s:{q["s"]}px;--c:{q["c"]};'
                    f'--dx:{q["dx"]:.0f}px;--dy:{q["dy"]:.0f}px;--t:{q["t"]:.0f}s;--p:{q["p"]:.0f}s"></i>'
                    for q in squares)
    return f'  <div class="drift" aria-hidden="true">{items}</div>'


if __name__ == '__main__':
    print(html(place()))
