"""Draw Siren's logo, the voice of PLAN 3's sea creatures, in the flower logos' network-of-nodes style.

A spiral shell, the conch that carries the voice of the sea: its outer wall a logarithmic spiral of
nodes, its chambers' walls as links across to the turn inside, a second run of nodes down the
middle of the chambers, and a golden heart where the spiral starts. Out of its mouth come three
arcs of nodes: the voice. Also a grey, bolder version for the page header, the way
butterfly-grey.svg stands for Butterfly's logo there.

Usage: python3 tools/make_siren.py OUTPUT_DIR
Writes OUTPUT_DIR/siren.svg and OUTPUT_DIR/siren-grey.svg.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_flowers import Drawing, mix, YELLOW, ORANGE  # noqa: E402  (same style as the flowers)

SEA, DEEP = '#35b4c4', '#2b7fd4'
B = math.log(2.6) / (2 * math.pi)       # each turn of the shell is 2.6 times as wide as the one inside it
PITCH = math.atan(1 / B)                # a log spiral's tangent keeps this angle to its radius
TURNS, STEP = 2.5, math.radians(24)
END = TURNS * 2 * math.pi
AIM = math.radians(14)                  # the mouth opens to the right, a little down, and the voice goes that way


def geometry():
    """The shell and the voice in their own units: the outer wall's points (with t, 0 at the heart
    to 1 at the mouth), each one's point a turn further in, and the three arcs of the voice."""
    start = AIM - PITCH - END
    wall, inner = [], []
    theta = 0.0
    while theta <= END + 1e-9:
        a = start + theta
        r, r_in = math.exp(B * theta), math.exp(B * (theta - 2 * math.pi))
        wall.append(((r * math.cos(a), r * math.sin(a)), theta / END, theta >= 2 * math.pi))
        inner.append((r_in * math.cos(a), r_in * math.sin(a)))
        theta += STEP
    (p, _, _), q = wall[-1], inner[-1]
    mouth = ((p[0] + q[0]) / 2, (p[1] + q[1]) / 2)
    size = math.dist(p, q)
    arcs = []
    for radius, spread, n in ((0.55, 38, 3), (0.95, 40, 5), (1.35, 42, 7)):
        arcs.append([(mouth[0] + size * radius * math.cos(AIM + math.radians(spread * (2 * i / (n - 1) - 1))),
                      mouth[1] + size * radius * math.sin(AIM + math.radians(spread * (2 * i / (n - 1) - 1)))) for i in range(n)])
    return wall, inner, arcs


def fitted(half):
    """The geometry scaled and moved to fill a box from -half to half."""
    wall, inner, arcs = geometry()
    pts = [p for p, _, _ in wall] + [p for arc in arcs for p in arc]
    x0, x1 = min(p[0] for p in pts), max(p[0] for p in pts)
    y0, y1 = min(p[1] for p in pts), max(p[1] for p in pts)
    k = 2 * half / max(x1 - x0, y1 - y0)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    to = lambda p: ((p[0] - cx) * k, (p[1] - cy) * k)
    return [(to(p), t, chambered) for p, t, chambered in wall], [to(q) for q in inner], [[to(p) for p in arc] for arc in arcs]


def colour(t):
    return mix(mix(YELLOW, ORANGE, 0.3), SEA, t / 0.45) if t < 0.45 else mix(SEA, DEEP, (t - 0.45) / 0.55)


def siren():
    d = Drawing()
    wall, inner, arcs = fitted(88)
    d.gradient('wall', wall[0][0], wall[-1][0], colour(0.25), DEEP, 0.6)
    # The chambers: from each point of the outer wall across to the turn inside it, with a node at
    # the middle of each chamber; those middles are linked in a second, inner run, and cross-linked
    # to the wall, as the petals are.
    mids = []
    for i, ((p, t, chambered), q) in enumerate(zip(wall, inner)):
        if not chambered:
            continue
        m = ((p[0] + q[0]) / 2, (p[1] + q[1]) / 2)
        if mids:
            d.line(mids[-1][0], m, colour(t), 0.6, 0.8)
            d.line(m, wall[i - 1][0], colour(t), 0.5, 0.7)
        mids.append((m, t))
        d.line(p, m, colour(t), 0.7, 0.9)
        d.line(m, q, colour(t), 0.7, 0.9)
    for (p, _, _), (q, _, _) in zip(wall, wall[1:]):
        d.line(p, q, 'url(#wall)', 1.0)
    for k, arc in enumerate(arcs):                  # the voice
        for p, q in zip(arc, arc[1:]):
            d.line(p, q, mix(DEEP, SEA, k / 2), 0.8, 0.9)
    d.front()
    for m, t in mids:
        d.node(m, 1.5 + 1.3 * t, colour(t))
    for p, t, _ in wall:
        d.node(p, 1.6 + 2.6 * t, colour(t))
    for k, arc in enumerate(arcs):
        for i, p in enumerate(arc):
            d.node(p, 2.2 + 0.5 * k + (0.9 if i == len(arc) // 2 else 0), mix(DEEP, SEA, k / 2))
    d.node(wall[0][0], 5.2, YELLOW)                 # the golden heart, where the spiral starts
    return d.svg('Siren')


def grey():
    """The header's version: the same shell and voice in a few bold grey lines and nodes, legible at
    32 pixels."""
    G = '#6e7781'
    wall, inner, arcs = fitted(42)
    pts = [p for p, _, _ in wall]
    parts = ['<polyline points="' + ' '.join('%.1f,%.1f' % p for p in pts) + f'" fill="none" stroke="{G}" stroke-width="3.6"/>']
    for i, ((p, _, chambered), q) in enumerate(zip(wall, inner)):
        if chambered and i % 2 == 0:
            parts.append(f'<line x1="{p[0]:.1f}" y1="{p[1]:.1f}" x2="{q[0]:.1f}" y2="{q[1]:.1f}" stroke="{G}" stroke-width="2.2"/>')
    for p in pts[4::3]:
        parts.append(f'<circle cx="{p[0]:.1f}" cy="{p[1]:.1f}" r="3" fill="{G}"/>')
    for arc in arcs[1:]:
        parts.append('<polyline points="' + ' '.join('%.1f,%.1f' % p for p in arc) + f'" fill="none" stroke="{G}" stroke-width="3.2"/>')
    parts.append(f'<circle cx="{pts[0][0]:.1f}" cy="{pts[0][1]:.1f}" r="4.4" fill="{G}"/>')
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 -50 100 100"><g stroke-linecap="round" '
            'stroke-linejoin="round">' + ''.join(parts) + '</g></svg>\n')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    open(os.path.join(sys.argv[1], 'siren.svg'), 'w').write(siren())
    open(os.path.join(sys.argv[1], 'siren-grey.svg'), 'w').write(grey())
