"""Draw the Tulip, Jasmine, Orchid, Bouquet, Magnolia and Iris logos in the same network-of-nodes style as the Daisy logo.

Usage: python3 tools/make_flowers.py OUTPUT_DIR
Writes OUTPUT_DIR/tulip.svg, OUTPUT_DIR/jasmine.svg, OUTPUT_DIR/orchid.svg, OUTPUT_DIR/bouquet.svg,
OUTPUT_DIR/magnolia.svg and OUTPUT_DIR/iris.svg.
"""
import math
import os
import sys

YELLOW, ORANGE = '#f2b632', '#ec8e4a'


def rgb(h):
    h = h.lstrip('#')
    return [int(h[i:i + 2], 16) for i in (0, 2, 4)]


def mix(a, b, t):
    a, b = rgb(a), rgb(b)
    return '#%02x%02x%02x' % tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def f(x):
    s = ('%.2f' % x).rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s


class Drawing:
    """Lines under nodes, in layers: a later layer is drawn over everything before it."""

    def __init__(self):
        self.defs, self.layers = [], [([], [])]

    lines = property(lambda self: self.layers[-1][0])
    nodes = property(lambda self: self.layers[-1][1])

    def front(self):
        self.layers.append(([], []))

    def gradient(self, gid, p0, p1, c0, c1, mid=0.45):
        self.defs.append(f'<linearGradient id="{gid}" gradientUnits="userSpaceOnUse" x1="{f(p0[0])}" y1="{f(p0[1])}" '
                         f'x2="{f(p1[0])}" y2="{f(p1[1])}"><stop offset="0" stop-color="{c0}"/>'
                         f'<stop offset="{mid}" stop-color="{c1}"/></linearGradient>')

    def line(self, a, b, stroke, w=0.8, opacity=None):
        op = f' stroke-opacity="{opacity}"' if opacity else ''
        self.lines.append(f'<line x1="{f(a[0])}" y1="{f(a[1])}" x2="{f(b[0])}" y2="{f(b[1])}" stroke="{stroke}" stroke-width="{w}"{op}/>')

    def node(self, p, r, fill):
        self.nodes.append(f'<circle cx="{f(p[0])}" cy="{f(p[1])}" r="{f(r)}" fill="{fill}"/>')

    def svg(self, label):
        return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="-102 -102 204 204" role="img" aria-label="' + label + '">'
                '<defs>' + ''.join(self.defs) + '</defs>'
                + ''.join('<g stroke-linecap="round">' + ''.join(lines) + '</g><g>' + ''.join(nodes) + '</g>'
                          for lines, nodes in self.layers) + '</svg>\n')


def lattice(d, gid, base, tip, width, colour_at, sizes=(2.0, 3.0), tip_r=4.8, shear=0.0, bulge=0.7, steps=5):
    """A petal or leaf drawn as a lattice of nodes: outline on both sides, a midrib, and cross links."""
    ax, ay = tip[0] - base[0], tip[1] - base[1]
    length = math.hypot(ax, ay)
    ux, uy = ax / length, ay / length
    vx, vy = -uy, ux
    pt = lambda u, v: (base[0] + ux * u + vx * (v + shear * u), base[1] + uy * u + vy * (v + shear * u))
    ts = [0.12 + 0.76 * i / (steps - 1) for i in range(steps)]
    left = [(t, pt(length * t, -width * math.sin(math.pi * t) ** bulge)) for t in ts]
    right = [(t, pt(length * t, width * math.sin(math.pi * t) ** bulge)) for t in ts]
    rib = [(t, pt(length * t, 0)) for t in (0.3, 0.55, 0.78)]
    b, e = pt(0, 0), pt(length, 0)
    for side in (left, right):
        chain = [b] + [p for _, p in side] + [e]
        for p, q in zip(chain, chain[1:]):
            d.line(p, q, f'url(#{gid})')
        for t, p in side:           # link each outline node to the nearest midrib nodes
            near = sorted(rib, key=lambda r: abs(r[0] - t))[:2 if 0.25 < t < 0.8 else 1]
            for _, q in near:
                d.line(p, q, f'url(#{gid})', 0.7)
    chain = [b] + [p for _, p in rib] + [e]
    for p, q in zip(chain, chain[1:]):
        d.line(p, q, f'url(#{gid})')
    for t, p in left + right:
        d.node(p, sizes[0] + (sizes[1] - sizes[0]) * t, colour_at(t))
    for t, p in rib:
        d.node(p, sizes[0], colour_at(t))
    d.node(e, tip_r, colour_at(1))
    return b, [p for _, p in left], [p for _, p in right]


def jasmine():
    d = Drawing()
    colours = ['#a06fc2', '#8a80cf', '#ad76bb', '#927fcc', '#7c8acb']
    hub_inner = [(10 * math.cos(math.radians(-54 + 72 * k)), 10 * math.sin(math.radians(-54 + 72 * k))) for k in range(5)]
    hub_outer = [(21 * math.cos(math.radians(-90 + 36 * k)), 21 * math.sin(math.radians(-90 + 36 * k))) for k in range(10)]
    warm = lambda p: mix(YELLOW, ORANGE, (1 + p[0] / 21) / 2)
    for p in hub_inner:
        d.line((0, 0), p, warm(p), 0.7, 0.85)
    for i in range(5):
        d.line(hub_inner[i], hub_inner[(i + 1) % 5], warm(hub_inner[i]), 0.7, 0.85)
        for j in (2 * i, 2 * i + 1, 2 * i + 2):
            d.line(hub_inner[i], hub_outer[j % 10], warm(hub_inner[i]), 0.6, 0.8)
    for j in range(10):
        d.line(hub_outer[j], hub_outer[(j + 1) % 10], warm(hub_outer[j]), 0.6, 0.8)
        d.line(hub_outer[j], hub_outer[(j + 3) % 10], warm(hub_outer[j]), 0.5, 0.7)
    for k in range(5):
        th = math.radians(-90 + 72 * k)
        base = (24 * math.cos(th), 24 * math.sin(th))
        tip = (95 * math.cos(th + 0.16), 95 * math.sin(th + 0.16))
        col, start = colours[k], warm(base)
        d.gradient(f'j{k}', hub_outer[2 * k], tip, start, col)
        b, left, right = lattice(d, f'j{k}', base, tip, 23, lambda t, s=start, c=col: mix(s, c, min(1, t / 0.45)),
                                 sizes=(2.1, 3.2), tip_r=5.4, shear=0.05, steps=6)
        for q in (b, left[0], right[0]):
            d.line(hub_outer[2 * k], q, f'url(#j{k})', 0.6, 0.85)
        d.line(hub_outer[(2 * k - 1) % 10], left[0], f'url(#j{k})', 0.55, 0.7)
        d.line(hub_outer[2 * k + 1], right[0], f'url(#j{k})', 0.55, 0.7)
    for p in hub_outer:
        d.node(p, 3.0, warm(p))
    for p in hub_inner:
        d.node(p, 2.6, mix(YELLOW, ORANGE, (1 + p[0] / 10) / 4))
    d.node((0, 0), 5.2, YELLOW)
    return d.svg('Jasmine')


def tulip_head():
    """The tulip's head: two side petals behind, one petal in front, as named nodes and edges."""
    N = {'B': (0, 4, 3.2),
         'L1': (-24, -2, 2.4), 'L2': (-40, -24, 2.8), 'L3': (-46, -50, 3.0), 'L4': (-44, -72, 3.2), 'Lt': (-36, -91, 4.6),
         'C1L': (-12, -20, 2.2), 'C2L': (-20, -48, 2.6), 'C3L': (-16, -75, 2.8), 'Ct': (0, -97, 5.0),
         'M1': (0, -30, 2.2), 'M2': (0, -58, 2.4), 'M3': (0, -81, 2.4),
         'S1L': (-30, -30, 2.4), 'S2L': (-34, -60, 2.6), 'SVL': (-26, -81, 2.8)}
    for name in list(N):
        if name.endswith('L') or name in ('L1', 'L2', 'L3', 'L4', 'Lt'):
            x, y, r = N[name]
            N[name.replace('L', 'R', 1) if name[0] == 'L' else name[:-1] + 'R'] = (-x, y, r)
    petal = {'left': '#a06fc2', 'centre': '#ad76bb', 'right': '#927fcc'}
    edges = {
        'tl': 'B-L1 L1-L2 L2-L3 L3-L4 L4-Lt Lt-SVL SVL-C3L L1-S1L L2-S1L S1L-C1L S1L-C2L S1L-S2L L2-S2L L3-S2L S2L-C2L S2L-SVL L4-SVL',
        'tr': 'B-R1 R1-R2 R2-R3 R3-R4 R4-Rt Rt-SVR SVR-C3R R1-S1R R2-S1R S1R-C1R S1R-C2R S1R-S2R R2-S2R R3-S2R S2R-C2R S2R-SVR R4-SVR',
        'tc': 'B-C1L C1L-C2L C2L-C3L C3L-Ct Ct-C3R C3R-C2R C2R-C1R C1R-B B-M1 M1-M2 M2-M3 M3-Ct '
              'C1L-M1 C1R-M1 C2L-M1 C2R-M1 C2L-M2 C2R-M2 C3L-M2 C3R-M2 C3L-M3 C3R-M3',
    }
    return N, edges, petal


def tulip():
    d = Drawing()
    N, edges, petal = tulip_head()
    d.gradient('tl', (0, 4), (-36, -91), ORANGE, petal['left'], 0.55)
    d.gradient('tc', (0, 4), (0, -97), ORANGE, petal['centre'], 0.55)
    d.gradient('tr', (0, 4), (36, -91), ORANGE, petal['right'], 0.55)
    for gid, spec in edges.items():
        for e in spec.split():
            a, b = e.split('-')
            d.line(N[a][:2], N[b][:2], f'url(#{gid})')

    # Stem and two leaves in greens and teals.
    stem = [(0, 4), (0, 24), (0, 46), (0, 68), (0, 94)]
    d.gradient('st', (0, 4), (0, 94), mix(ORANGE, '#3aa56f', 0.6), '#3aa56f', 0.3)
    for p, q in zip(stem, stem[1:]):
        d.line(p, q, 'url(#st)', 1.0)
    for p in stem[1:-1]:
        d.node(p, 2.2, '#3aa56f')
    d.node(stem[-1], 3.0, '#3aa56f')
    for gid, base, tip, col, sh in (('lf', (0, 76), (-50, 22), '#2fb39a', 0.06), ('rf', (0, 58), (48, 10), '#35adb0', -0.06)):
        d.gradient(gid, base, tip, '#3aa56f', col, 0.5)
        lattice(d, gid, base, tip, 11, lambda t, c=col: mix('#3aa56f', c, t), sizes=(1.8, 2.4), tip_r=3.8, shear=sh, steps=4)

    for name, (x, y, r) in N.items():
        t = max(0.0, min(1.0, (4 - y) / 101))
        side = petal['left'] if x < -8 else petal['right'] if x > 8 else petal['centre']
        d.node((x, y), r, mix(ORANGE, side, min(1, t / 0.55)))
    return d.svg('Tulip')


def bouquet():
    """Bouquet: the team's flowers, a daisy, a tulip, a jasmine, an orchid, a magnolia and an iris,
    tied together with a golden bow."""
    d = Drawing()
    GREEN = '#3aa56f'
    tie = (0, 56)
    at = lambda c, r, a: (c[0] + r * math.cos(math.radians(a)), c[1] + r * math.sin(math.radians(a)))
    warm = lambda t: mix(YELLOW, ORANGE, t)

    def stem(points, gid):
        d.gradient(gid, points[0], points[-1], mix(ORANGE, GREEN, 0.5), GREEN, 0.4)
        for p, q in zip(points, points[1:]):
            d.line(p, q, f'url(#{gid})', 1.0)
        for p in points[1:-1]:
            d.node(p, 1.9, GREEN)

    # The magnolia and the iris, furthest back, in the upper corners.
    for draw, centre, turn, pre in ((draw_magnolia, (-66, -36), -24, 'bm'), (draw_iris, (62, -58), 22, 'bi')):
        t, sc = math.radians(turn), 0.36
        pl = lambda x, y, c=centre, t=t, sc=sc: (c[0] + sc * (math.cos(t) * x - math.sin(t) * y),
                                                 c[1] + sc * (math.sin(t) * x + math.cos(t) * y))
        stem([pl(0, 12), (centre[0] * 0.6, -14), (centre[0] * 0.3, 24), tie], pre + 's')
        draw(d, pl, sc, dot=0.55, prefix=pre)

    # The daisy, the tallest: twelve petals in the Daisy logo's colours around a golden heart.
    centre = (0, -50)
    colours = ['#3aa56f', '#7f8fb3', '#a06fc2', '#ad76bb', '#a07cc8', '#927fcc',
               '#8a80cf', '#7c8acb', '#6f94c4', '#6592b4', '#35adb0', '#2fb39a']
    ring = [at(centre, 6.5, -60 + 60 * k) for k in range(6)]
    stem([at(centre, 6.5, 90), (0, -8), (0, 16), (0, 38), tie], 'bds')
    for k in range(12):
        a = -75 + 30 * k
        col, gid = colours[k], f'bd{k}'
        base, rib, tip = at(centre, 12, a), at(centre, 27.5, a), at(centre, 47, a)
        l1, r1 = at(at(centre, 21, a), 3.6, a - 90), at(at(centre, 21, a), 3.6, a + 90)
        l2, r2 = at(at(centre, 34, a), 5.0, a - 90), at(at(centre, 34, a), 5.0, a + 90)
        d.gradient(gid, base, tip, warm(0.4), col, 0.45)
        for p, q in ((base, l1), (l1, l2), (l2, tip), (base, r1), (r1, r2), (r2, tip), (l1, r1), (l2, r2),
                     (base, rib), (rib, tip), (l1, rib), (r1, rib), (l2, rib), (r2, rib)):
            d.line(p, q, f'url(#{gid})', 0.6)
        for r in sorted(ring, key=lambda r: math.dist(r, base))[:2]:
            d.line(r, base, warm(0.3), 0.6, 0.85)
        d.node(base, 1.8, mix(ORANGE, col, 0.25))
        for p, r, t in ((l1, 1.6, 0.5), (r1, 1.6, 0.5), (rib, 1.5, 0.7), (l2, 2.0, 0.9), (r2, 2.0, 0.9)):
            d.node(p, r, mix(ORANGE, col, t))
        d.node(tip, 3.4, col)
    for i, r in enumerate(ring):
        d.line(centre, r, warm(0.2), 0.7, 0.85)
        d.line(r, ring[(i + 1) % 6], warm(0.2), 0.7, 0.85)
        d.node(r, 2.0, warm(0.3))
    d.node(centre, 4.6, YELLOW)

    # The tulip, leaning out to the left: the Tulip logo's head, smaller.
    N, edges, petal = tulip_head()
    turn, scale, origin = math.radians(-40), 0.5, (-38, 22)
    tp = lambda x, y: (origin[0] + scale * (math.cos(turn) * x - math.sin(turn) * y),
                       origin[1] + scale * (math.sin(turn) * x + math.cos(turn) * y))
    stem([tp(0, 4), (-24, 36), (-11, 47), tie], 'bts')
    for gid, tip in (('tl', 'Lt'), ('tc', 'Ct'), ('tr', 'Rt')):
        side = {'tl': 'left', 'tc': 'centre', 'tr': 'right'}[gid]
        d.gradient('b' + gid, tp(0, 4), tp(*N[tip][:2]), ORANGE, petal[side], 0.55)
    for gid, spec in edges.items():
        for e in spec.split():
            a, b = e.split('-')
            d.line(tp(*N[a][:2]), tp(*N[b][:2]), f'url(#b{gid})', 0.6)
    for name, (x, y, r) in N.items():
        t = max(0.0, min(1.0, (4 - y) / 101))
        side = petal['left'] if x < -8 else petal['right'] if x > 8 else petal['centre']
        d.node(tp(x, y), r * 0.6, mix(ORANGE, side, min(1, t / 0.55)))

    # The jasmine, leaning out to the right: five petals around a golden heart.
    centre, spin = (62, 4), 184
    stem([at(centre, 6, spin - 36), (30, 34), (14, 47), tie], 'bjs')
    jcol = ['#a06fc2', '#8a80cf', '#ad76bb', '#927fcc', '#7c8acb']
    hub = [at(centre, 5.5, spin + 36 + 72 * k) for k in range(5)]
    for k in range(5):
        a = spin + 72 * k
        base, tip = at(centre, 7, a), at(centre, 36, a + 6)
        col = jcol[k]
        d.gradient(f'bj{k}', base, tip, warm(0.5), col)
        b, left, right = lattice(d, f'bj{k}', base, tip, 10, lambda t, c=col: mix(warm(0.5), c, min(1, t / 0.45)),
                                 sizes=(1.4, 1.9), tip_r=3.0, shear=0.05, steps=4)
        for h in (hub[k - 1], hub[k]):
            d.line(h, b, warm(0.5), 0.6, 0.85)
    for i, h in enumerate(hub):
        d.line(centre, h, warm(0.3), 0.6, 0.85)
        d.line(h, hub[(i + 1) % 5], warm(0.3), 0.6, 0.85)
        d.node(h, 1.8, warm(0.4))
    d.node(centre, 3.8, YELLOW)

    # The orchid's stem (the orchid herself is drawn last, in front of the others).
    oturn, oscale, ocentre = math.radians(8), 0.4, (33, -21)       # the Orchid logo's centre is (0, -8)
    op = lambda x, y: (ocentre[0] + oscale * (math.cos(oturn) * x - math.sin(oturn) * (y + 8)),
                       ocentre[1] + oscale * (math.sin(oturn) * x + math.cos(oturn) * (y + 8)))
    stem([op(0, 60), (17, 30), (7, 46), tie], 'bos')

    # Below the bow the three stems fan out again.
    for end in ((-14, 98), (0, 100), (14, 98)):
        mid = (end[0] * 0.55, (tie[1] + end[1]) / 2 + 2)
        d.line(tie, mid, GREEN, 1.0)
        d.line(mid, end, GREEN, 1.0)
        d.node(mid, 1.9, GREEN)
        d.node(end, 2.6, GREEN)

    # The golden bow that ties them: two loops and two ribbon ends.
    for sx in (-1, 1):
        loop = [(sx * 10, 47), (sx * 20, 44), (sx * 26, 52), (sx * 22, 62), (sx * 11, 62)]
        chain = [tie] + loop + [tie]
        for p, q in zip(chain, chain[1:]):
            d.line(p, q, warm(0.55), 0.8)
        d.line(loop[0], loop[3], warm(0.55), 0.6, 0.8)
        d.line(loop[1], loop[4], warm(0.55), 0.6, 0.8)
        tail = [(sx * 6, 68), (sx * 9, 78)]
        d.line(tie, tail[0], warm(0.7), 0.8)
        d.line(tail[0], tail[1], warm(0.7), 0.8)
        for p, r, t in zip(loop + tail, (1.8, 2.2, 2.8, 2.2, 1.8, 1.9, 2.6), (0.3, 0.5, 0.7, 0.6, 0.4, 0.6, 0.9)):
            d.node(p, r, warm(t))
    d.node(tie, 4.6, YELLOW)

    # The orchid, in front, half over the daisy and half over the jasmine. A soft white glow
    # behind her fades the flowers she covers.
    d.defs.append('<radialGradient id="bglow"><stop offset="0" stop-color="#fff" stop-opacity=".88"/>'
                  '<stop offset=".6" stop-color="#fff" stop-opacity=".72"/>'
                  '<stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>')
    d.front()
    d.node(ocentre, 42, 'url(#bglow)')
    d.front()
    draw_orchid(d, op, oscale, dot=0.6, prefix='bo')
    return d.svg('Bouquet')


def draw_orchid(d, place=lambda x, y: (x, y), scale=1.0, dot=1.0, prefix=''):
    """Draw the moth orchid into d. place maps the Orchid logo's coordinates to d's, scale is how
    much it shrinks them (for the petals' width) and dot how much the nodes shrink."""
    centre = (0, -8)
    at = lambda c, r, a: (c[0] + r * math.cos(math.radians(a)), c[1] + r * math.sin(math.radians(a)))
    warm = lambda p: mix(YELLOW, ORANGE, min(1, max(0, (1 + p[0] / 14) / 2)))
    P = lambda p: place(*p)
    hub = [at(centre, 10, -90 + 60 * k) for k in range(6)]
    for i, p in enumerate(hub):
        d.line(P(centre), P(p), warm(p), 0.7, 0.85)
        d.line(P(p), P(hub[(i + 1) % 6]), warm(p), 0.7, 0.85)
    # (name, base, tip, width, colour, node sizes, tip node, bulge, steps)
    parts = [
        ('os', at(centre, 13, -90), (0, -96), 17, '#b85aa8', (2.0, 2.8), 5.0, 0.8, 5),     # sepal on top
        ('ol', at(centre, 13, -150), (-94, -40), 29, '#c2549e', (2.1, 3.2), 5.4, 0.55, 6),   # petals
        ('or', at(centre, 13, -30), (94, -40), 29, '#c2549e', (2.1, 3.2), 5.4, 0.55, 6),
        ('ll', at(centre, 13, 150), (-60, 86), 16, '#ad76bb', (2.0, 2.8), 4.8, 0.8, 5),     # sepals below
        ('lr', at(centre, 13, 30), (60, 86), 16, '#ad76bb', (2.0, 2.8), 4.8, 0.8, 5),
        ('lp', at(centre, 13, 90), (0, 64), 12, '#a8488c', (1.9, 2.6), 4.6, 0.9, 4),        # the lip
    ]
    for gid, base, tip, width, col, sizes, tip_r, bulge, steps in parts:
        start = warm(base)
        d.gradient(prefix + gid, P(base), P(tip), start, col, 0.45)
        b, left, right = lattice(d, prefix + gid, P(base), P(tip), width * scale,
                                 lambda t, s=start, c=col: mix(s, c, min(1, t / 0.45)),
                                 sizes=(sizes[0] * dot, sizes[1] * dot), tip_r=tip_r * dot, bulge=bulge, steps=steps)
        for h in sorted(hub, key=lambda h: math.dist(P(h), b))[:2]:
            d.line(P(h), b, f'url(#{prefix}{gid})', 0.6, 0.85)
    # two little curls on the lip, as moth orchids have
    for sx in (-1, 1):
        a, b = (sx * 9, 40), (sx * 17, 30)
        d.line(P((0, 34)), P(a), '#a8488c', 0.7)
        d.line(P(a), P(b), '#a8488c', 0.7)
        d.node(P(a), 2.0 * dot, '#b85aa8')
        d.node(P(b), 2.6 * dot, '#a8488c')
    for p in hub:
        d.node(P(p), 2.6 * dot, warm(p))
    d.node(P(centre), 5.2 * dot, YELLOW)


def orchid():
    """Orchid: a moth orchid seen from the front. A sepal on top, two broad petals, two sepals
    below and the lip in the middle, around a golden column."""
    d = Drawing()
    draw_orchid(d)
    return d.svg('Orchid')


def draw_head(d, centre, hub_radii, parts, beards=(), place=lambda x, y: (x, y), scale=1.0, dot=1.0, prefix=''):
    """Draw a flower head of lattice petals around a golden hub into d: Magnolia's and Iris's.
    parts are (name, base angle on the hub, tip, width, colour, node sizes, tip node, bulge,
    steps); a part named in beards gets two golden nodes along it. place, scale and dot work as
    in draw_orchid."""
    warm = lambda p: mix(YELLOW, ORANGE, min(1, max(0, (1 + (p[0] - centre[0]) / 12) / 2)))
    P = lambda p: place(*p)
    rx, ry, start = hub_radii
    hub = [(centre[0] + rx * math.cos(math.radians(a)), centre[1] + ry * math.sin(math.radians(a)))
           for a in range(start, start + 360, 60)]
    for i, p in enumerate(hub):
        d.line(P(centre), P(p), warm(p), 0.7, 0.85)
        d.line(P(p), P(hub[(i + 1) % 6]), warm(p), 0.7, 0.85)
    for gid, angle, tip, width, col, sizes, tip_r, bulge, steps in parts:
        base = (centre[0] + (rx + 2) * math.cos(math.radians(angle)), centre[1] + (ry + 2) * math.sin(math.radians(angle)))
        begin = warm(base)
        d.gradient(prefix + gid, P(base), P(tip), begin, col, 0.45)
        b, left, right = lattice(d, prefix + gid, P(base), P(tip), width * scale,
                                 lambda t, s=begin, c=col: mix(s, c, min(1, t / 0.45)),
                                 sizes=(sizes[0] * dot, sizes[1] * dot), tip_r=tip_r * dot, bulge=bulge, steps=steps)
        for h in sorted(hub, key=lambda h: math.dist(P(h), b))[:2]:
            d.line(P(h), b, f'url(#{prefix}{gid})', 0.6, 0.85)
        if gid in beards:
            for k in (0.3, 0.5):
                d.node(P((base[0] + (tip[0] - base[0]) * k, base[1] + (tip[1] - base[1]) * k)), 2.4 * dot, YELLOW)
    for p in hub:
        d.node(P(p), 2.6 * dot, warm(p))
    d.node(P(centre), 5.2 * dot, YELLOW)


def draw_magnolia(d, place=lambda x, y: (x, y), scale=1.0, dot=1.0, prefix=''):
    """Magnolia's flower: three inner petals stand up around a golden centre, two outer petals
    open wide."""
    rose, blush, deep = '#de7c95', '#ec9fb4', '#c75f86'
    draw_head(d, (0, 8), (11, 7, 0), [
        ('mol', 180, (-92, -30), 24, blush, (2.0, 2.9), 5.0, 0.6, 5),   # outer petals, open wide
        ('mor', 0, (92, -30), 24, blush, (2.0, 2.9), 5.0, 0.6, 5),
        ('mil', 240, (-40, -90), 21, rose, (2.1, 3.1), 5.2, 0.7, 6),    # inner petals, standing up
        ('mir', 300, (40, -90), 21, rose, (2.1, 3.1), 5.2, 0.7, 6),
        ('mic', 270, (0, -100), 18, deep, (2.1, 3.1), 5.4, 0.8, 6),
    ], place=place, scale=scale, dot=dot, prefix=prefix)


def draw_iris(d, place=lambda x, y: (x, y), scale=1.0, dot=1.0, prefix=''):
    """Iris's flower: three standards stand up, three falls droop out and down, each fall with a
    golden beard."""
    blue, violet, deep = '#6592b4', '#7c8acb', '#5c6fbd'
    draw_head(d, (0, 2), (10, 10, -90), [
        ('ifl', 150, (-92, 40), 22, blue, (2.0, 2.9), 5.0, 0.6, 5),     # falls, drooping out and down
        ('ifr', 30, (92, 40), 22, blue, (2.0, 2.9), 5.0, 0.6, 5),
        ('ifc', 90, (0, 62), 15, deep, (1.9, 2.6), 4.6, 0.8, 4),
        ('isl', 210, (-50, -86), 18, violet, (2.0, 2.9), 5.0, 0.7, 5),  # standards, standing up
        ('isr', 330, (50, -86), 18, violet, (2.0, 2.9), 5.0, 0.7, 5),
        ('isc', 270, (0, -100), 16, deep, (2.1, 3.0), 5.4, 0.8, 6),
    ], beards=('ifl', 'ifr', 'ifc'), place=place, scale=scale, dot=dot, prefix=prefix)


def magnolia():
    """Magnolia: a cup-shaped flower opening at the tip of a branch, with a leaf on the woody
    branch."""
    d = Drawing()
    branch = [(0, 14), (-4, 38), (-12, 62), (-22, 84), (-30, 98)]
    d.gradient('mb', branch[0], branch[-1], mix(ORANGE, '#3aa56f', 0.6), '#3aa56f', 0.3)
    for p, q in zip(branch, branch[1:]):
        d.line(p, q, 'url(#mb)', 1.1)
    d.gradient('ml', (-8, 56), (46, 70), '#3aa56f', '#2fb39a', 0.5)
    lattice(d, 'ml', (-8, 56), (46, 70), 11, lambda t: mix('#3aa56f', '#2fb39a', t), sizes=(1.8, 2.4), tip_r=3.8, shear=-0.05, steps=4)
    for p in branch[1:-1]:
        d.node(p, 2.2, '#3aa56f')
    d.node(branch[-1], 3.0, '#3aa56f')
    d.front()
    draw_magnolia(d)
    return d.svg('Magnolia')


def iris():
    """Iris: a bearded iris seen from the front, above a stem and a sword-shaped leaf."""
    d = Drawing()
    stem = [(0, 12), (0, 40), (0, 66), (0, 96)]
    d.gradient('is', stem[0], stem[-1], mix(ORANGE, '#3aa56f', 0.6), '#3aa56f', 0.3)
    for p, q in zip(stem, stem[1:]):
        d.line(p, q, 'url(#is)', 1.1)
    d.gradient('il', (0, 92), (40, 30), '#3aa56f', '#2fb39a', 0.5)
    lattice(d, 'il', (0, 92), (40, 30), 8, lambda t: mix('#3aa56f', '#2fb39a', t), sizes=(1.8, 2.3), tip_r=3.6, shear=0.08, steps=4)
    for p in stem[1:-1]:
        d.node(p, 2.2, '#3aa56f')
    d.node(stem[-1], 3.0, '#3aa56f')
    d.front()
    draw_iris(d)
    return d.svg('Iris')

if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    out = sys.argv[1]
    open(os.path.join(out, 'tulip.svg'), 'w').write(tulip())
    open(os.path.join(out, 'jasmine.svg'), 'w').write(jasmine())
    open(os.path.join(out, 'orchid.svg'), 'w').write(orchid())
    open(os.path.join(out, 'bouquet.svg'), 'w').write(bouquet())
    open(os.path.join(out, 'magnolia.svg'), 'w').write(magnolia())
    open(os.path.join(out, 'iris.svg'), 'w').write(iris())
