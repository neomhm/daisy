"""Draw the Tulip and Jasmine logos in the same network-of-nodes style as the Daisy logo.

Usage: python3 tools/make_flowers.py OUTPUT_DIR
Writes OUTPUT_DIR/tulip.svg and OUTPUT_DIR/jasmine.svg.
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
    def __init__(self):
        self.defs, self.lines, self.nodes = [], [], []

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
                '<g stroke-linecap="round">' + ''.join(self.lines) + '</g>'
                '<g>' + ''.join(self.nodes) + '</g></svg>\n')


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


def tulip():
    d = Drawing()
    # Tulip head: two side petals behind, one petal in front, built from named nodes.
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
    d.gradient('tl', (0, 4), (-36, -91), ORANGE, petal['left'], 0.55)
    d.gradient('tc', (0, 4), (0, -97), ORANGE, petal['centre'], 0.55)
    d.gradient('tr', (0, 4), (36, -91), ORANGE, petal['right'], 0.55)
    edges = {
        'tl': 'B-L1 L1-L2 L2-L3 L3-L4 L4-Lt Lt-SVL SVL-C3L L1-S1L L2-S1L S1L-C1L S1L-C2L S1L-S2L L2-S2L L3-S2L S2L-C2L S2L-SVL L4-SVL',
        'tr': 'B-R1 R1-R2 R2-R3 R3-R4 R4-Rt Rt-SVR SVR-C3R R1-S1R R2-S1R S1R-C1R S1R-C2R S1R-S2R R2-S2R R3-S2R S2R-C2R S2R-SVR R4-SVR',
        'tc': 'B-C1L C1L-C2L C2L-C3L C3L-Ct Ct-C3R C3R-C2R C2R-C1R C1R-B B-M1 M1-M2 M2-M3 M3-Ct '
              'C1L-M1 C1R-M1 C2L-M1 C2R-M1 C2L-M2 C2R-M2 C3L-M2 C3R-M2 C3L-M3 C3R-M3',
    }
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


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    out = sys.argv[1]
    open(os.path.join(out, 'tulip.svg'), 'w').write(tulip())
    open(os.path.join(out, 'jasmine.svg'), 'w').write(jasmine())
