"""Draw Butterfly's logo, the lead of PLAN 2's team, in the flower logos' network-of-nodes style.

Four wings drawn as node lattices (the large upper wings and the smaller lower ones), a body of
nodes down the middle with a golden heart, and two curled antennae. Also a grey, bolder version
for the page header, the way daisy-grey.svg stands for the Daisy logo there.

Usage: python3 tools/make_butterfly.py OUTPUT_DIR
Writes OUTPUT_DIR/butterfly.svg and OUTPUT_DIR/butterfly-grey.svg.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_flowers import Drawing, lattice, mix, YELLOW, ORANGE  # noqa: E402  (same style as the flowers)

UPPER, LOWER, BODY = '#2fb39a', '#6592b4', '#2f4d5c'


def butterfly():
    d = Drawing()
    body = [(0, -30), (0, -14), (0, 2), (0, 18), (0, 34), (0, 52)]
    warm = lambda p: mix(YELLOW, ORANGE, min(1, max(0, (p[1] + 30) / 80)))
    # The wings, each a lattice from the body out to its tip: (name, base, tip, width, colour, bulge, steps)
    wings = [
        ('wul', (-4, -16), (-90, -64), 34, UPPER, 0.55, 6),
        ('wur', (4, -16), (90, -64), 34, UPPER, 0.55, 6),
        ('wll', (-4, 10), (-70, 70), 24, LOWER, 0.6, 5),
        ('wlr', (4, 10), (70, 70), 24, LOWER, 0.6, 5),
    ]
    for gid, base, tip, width, col, bulge, steps in wings:
        start = warm(base)
        d.gradient(gid, base, tip, start, col, 0.4)
        b, left, right = lattice(d, gid, base, tip, width, lambda t, s=start, c=col: mix(s, c, min(1, t / 0.4)),
                                 sizes=(2.1, 3.1), tip_r=5.2, bulge=bulge, steps=steps)
        for q in body[:4]:
            if math.dist(q, b) < 30:
                d.line(q, b, f'url(#{gid})', 0.6, 0.85)
    # Antennae, curling out at their tips.
    for sx in (-1, 1):
        pts = [(0, -30), (sx * 8, -52), (sx * 18, -72), (sx * 30, -84)]
        for p, q in zip(pts, pts[1:]):
            d.line(p, q, BODY, 0.8)
        d.node(pts[-1], 3.6, ORANGE)
    d.front()
    for p, q in zip(body, body[1:]):
        d.line(p, q, BODY, 1.4)
    for p in body:
        d.node(p, 3.6 if p[1] < 40 else 3.0, BODY)
    d.node((0, -14), 5.2, YELLOW)                      # the golden heart
    return d.svg('Butterfly')


def grey():
    """The header's version, like daisy-grey.svg: the same butterfly reduced to a few bold grey
    lines and nodes, legible at 32 pixels."""
    G = '#6e7781'
    wings = [[(-3, -6), (-20, -26), (-38, -30), (-44, -18), (-34, -4), (-3, -2)],
             [(-3, 2), (-30, 6), (-38, 22), (-28, 36), (-14, 30), (-3, 10)]]
    parts = []
    for w in wings:
        for sx in (-1, 1):
            pts = [(sx * x, y) for x, y in w]
            path = ' '.join('%g,%g' % p for p in pts)
            parts.append(f'<polygon points="{path}" fill="none" stroke="{G}" stroke-width="3.2"/>')
            mid = pts[len(pts) // 2]
            parts.append(f'<line x1="{sx * -3}" y1="{pts[0][1]}" x2="{mid[0]}" y2="{mid[1]}" stroke="{G}" stroke-width="2.4"/>')
            parts += [f'<circle cx="{x}" cy="{y}" r="3.4" fill="{G}"/>' for x, y in pts[1:-1]]
    for sx in (-1, 1):
        parts.append(f'<polyline points="0,-12 {sx * 6},-26 {sx * 14},-36" fill="none" stroke="{G}" stroke-width="3.2"/>')
        parts.append(f'<circle cx="{sx * 14}" cy="-36" r="3.2" fill="{G}"/>')
    parts.append(f'<line x1="0" y1="-12" x2="0" y2="30" stroke="{G}" stroke-width="5"/>')
    parts.append(f'<circle cx="0" cy="-6" r="5" fill="{G}"/>')
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 100 100"><g stroke-linecap="round" '
            'stroke-linejoin="round">' + ''.join(parts) + '</g></svg>\n')

if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    svg = butterfly()
    open(os.path.join(sys.argv[1], 'butterfly.svg'), 'w').write(svg)
    open(os.path.join(sys.argv[1], 'butterfly-grey.svg'), 'w').write(grey())
