"""Draw the large D.AI.SY daisy with a QR code hidden in its heart.

A real daisy's heart is made of hundreds of tiny florets. Here those florets are
a QR code: its dark squares are golden dots, the light squares and the rest of
the heart are pale dots, and its three corner "eyes" are golden ring nodes.
Phone cameras read the code; people see the flower's dotted golden centre.

Usage: python3 tools/make_daisy_qr.py URL OUTPUT.svg
Needs: pip install segno
"""
import math
import random
import sys

import segno

PETALS = ['#3aa56f', '#7f8fb3', '#a06fc2', '#ad76bb', '#a07cc8', '#927fcc',
          '#8a80cf', '#7c8acb', '#6f94c4', '#6592b4', '#35adb0', '#2fb39a']
INNER, OUTER = '#c96f24', '#d9962a'     # golden heart: orange in the middle, gold outside
DISC = '#fff8ec'                        # cream heart background


def rgb(h):
    h = h.lstrip('#')
    return [int(h[i:i + 2], 16) for i in (0, 2, 4)]


def hexc(c):
    return '#%02x%02x%02x' % tuple(max(0, min(255, round(v))) for v in c)


def mix(a, b, t):
    a, b = rgb(a), rgb(b)
    return hexc([a[i] + (b[i] - a[i]) * t for i in range(3)])


def grey(c):
    r, g, b = rgb(c)
    return 0.299 * r + 0.587 * g + 0.114 * b


def dark_enough(c, limit):
    y = grey(c)
    return c if y <= limit else hexc([v * limit / y for v in rgb(c)])


def f(x):
    s = ('%.2f' % x).rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s


def build(url, dark_limit=175, pale='#eecd92', dot=0.42, link=0, pale_dot=0.42, dotted_eyes=True, scatter=0.45):
    qr = segno.make(url, error='q', micro=False, boost_error=False)
    grid = [list(row) for row in qr.matrix]
    n = len(grid)
    half = 33.0                      # half-width of the code (the logo spans -102..102)
    m = 2 * half / n                 # one module
    disc_r = half * math.sqrt(2) + 3 * m
    pos = lambda i: -half + (i + 0.5) * m

    finders = [(0, 0), (0, n - 7), (n - 7, 0)]
    aligns = [(n - 7, n - 7)] if qr.version >= 2 else []
    in_finder = lambda r, c: any(fr <= r < fr + 7 and fc <= c < fc + 7 for fr, fc in finders)
    in_align = lambda r, c: any(abs(r - ar) <= 2 and abs(c - ac) <= 2 for ar, ac in aligns)
    dark = lambda r, c: 0 <= r < n and 0 <= c < n and grid[r][c] and not in_finder(r, c) and not in_align(r, c)

    def gold(x, y):
        return dark_enough(mix(INNER, OUTER, min(1, math.hypot(x, y) / (half * 1.3))), dark_limit)

    florets, links, dots = [], [], []
    rnd = random.Random(20260926)
    k = int(math.ceil(disc_r / m)) + 1
    for r in range(-k, n + k):
        for c in range(-k, n + k):
            x, y = pos(c), pos(r)
            inside = 0 <= r < n and 0 <= c < n
            if inside and (grid[r][c] or in_finder(r, c) or in_align(r, c)):
                if dark(r, c):
                    col = gold(x, y)
                    dots.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(dot * m)}" fill="{col}"/>')
                    for dr, dc in ((0, 1), (1, 0)):
                        if link and dark(r + dr, c + dc):
                            links.append(f'<line x1="{f(x)}" y1="{f(y)}" x2="{f(pos(c + dc))}" y2="{f(pos(r + dr))}" stroke="{col}" stroke-width="{f(link * m)}"/>')
                continue
            if math.hypot(x, y) + 0.4 * m <= disc_r - 0.8:
                gap = max(-r - 1, r - n, -c - 1, c - n) + 1          # modules outside the code's edge
                if scatter and gap > 3 and rnd.random() < scatter * max(0.0, 1 - (math.hypot(x, y) - half) / (disc_r - half)):
                    dots.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(dot * m)}" fill="{gold(x, y)}"/>')
                    continue
                florets.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(pale_dot * m)}"/>')

    # The three finder "eyes" and the alignment mark, as golden ring nodes (same proportions a reader expects).
    def ring(x, y, radius, col):
        if not dotted_eyes:
            dots.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(radius)}" fill="none" stroke="{col}" stroke-width="{f(m)}"/>')
            return
        count = max(8, round(2 * math.pi * radius / (0.95 * m)))
        for i in range(count):
            a = 2 * math.pi * i / count
            dots.append(f'<circle cx="{f(x + radius * math.cos(a))}" cy="{f(y + radius * math.sin(a))}" r="{f(0.55 * m)}" fill="{col}"/>')

    def floret(x, y, radius, col):
        if not dotted_eyes or radius < m:
            dots.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(radius)}" fill="{col}"/>')
            return
        dots.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(0.62 * radius)}" fill="{col}"/>')
        for i in range(6):
            a = math.pi / 6 + math.pi / 3 * i
            dots.append(f'<circle cx="{f(x + 0.62 * radius * math.cos(a))}" cy="{f(y + 0.62 * radius * math.sin(a))}" r="{f(0.4 * radius)}" fill="{col}"/>')

    for fr, fc in finders:
        x, y = pos(fc + 3), pos(fr + 3)
        col = gold(x, y)
        ring(x, y, 3 * m, col)
        floret(x, y, 1.5 * m, col)
    for ar, ac in aligns:
        x, y = pos(ac), pos(ar)
        col = gold(x, y)
        ring(x, y, 2 * m, col)
        floret(x, y, 0.5 * m, col)

    # Petals: node-and-line petals around the heart, joined to it by fibres.
    petal_nodes = {'b0': (0, 0, 1.9), 'bL': (4, -6, 2.1), 'bR': (4, 6, 2.1), 'm0': (12, 0, 2.0),
                   'mL': (16, -9.5, 2.4), 'mR': (16, 9.5, 2.4), 'u0': (24, 0, 2.2), 'uL': (27, -8, 2.7),
                   'uR': (27, 8, 2.7), 'tL': (34.5, -4.8, 3.0), 'tR': (34.5, 4.8, 3.0), 'tip': (41, 0, 4.4)}
    petal_edges = ['bL-mL', 'mL-uL', 'uL-tL', 'tL-tip', 'tip-tR', 'tR-uR', 'uR-mR', 'mR-bR',
                   'b0-m0', 'm0-u0', 'u0-tip', 'bL-b0', 'bR-b0', 'bL-m0', 'bR-m0', 'mL-m0', 'mR-m0',
                   'mL-u0', 'mR-u0', 'uL-u0', 'uR-u0', 'tL-u0', 'tR-u0']
    base = disc_r + 3.5
    defs, lines, nodes = [], [], []
    for i in range(12):
        th = math.radians(-90 + 30 * i)
        cs, sn = math.cos(th), math.sin(th)
        pt = lambda u, v: ((base + u) * cs - v * sn, (base + u) * sn + v * cs)
        col = PETALS[i]
        start = mix(OUTER, col, 0.3)
        g0, g1 = pt(-4, 0), pt(41, 0)
        defs.append(f'<linearGradient id="p{i}" gradientUnits="userSpaceOnUse" x1="{f(g0[0])}" y1="{f(g0[1])}" '
                    f'x2="{f(g1[0])}" y2="{f(g1[1])}"><stop offset="0" stop-color="{start}"/>'
                    f'<stop offset="0.45" stop-color="{col}"/></linearGradient>')
        P = {name: pt(u, v) for name, (u, v, _) in petal_nodes.items()}
        for e in petal_edges:
            a, b = e.split('-')
            lines.append(f'<line x1="{f(P[a][0])}" y1="{f(P[a][1])}" x2="{f(P[b][0])}" y2="{f(P[b][1])}" stroke="url(#p{i})" stroke-width="0.8"/>')
        for v in (-5, 0, 5):   # fibres from the rim of the heart into the petal
            a0 = th + math.radians(v * 1.3)
            x0, y0 = (disc_r - 0.5) * math.cos(a0), (disc_r - 0.5) * math.sin(a0)
            tgt = P['bL'] if v < 0 else P['bR'] if v > 0 else P['b0']
            lines.append(f'<line x1="{f(x0)}" y1="{f(y0)}" x2="{f(tgt[0])}" y2="{f(tgt[1])}" stroke="url(#p{i})" stroke-width="0.7"/>')
        for name, (u, v, rad) in petal_nodes.items():
            nodes.append(f'<circle cx="{f(P[name][0])}" cy="{f(P[name][1])}" r="{f(rad)}" fill="{mix(start, col, min(1, u / 18))}"/>')

    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="-102 -102 204 204" role="img" aria-label="D.AI.SY daisy">'
            '<defs>' + ''.join(defs) + '</defs>'
            f'<circle r="{f(disc_r)}" fill="{DISC}"/>'
            f'<g fill="{pale}">' + ''.join(florets) + '</g>'
            '<g stroke-linecap="round">' + ''.join(lines) + ''.join(links) + '</g>'
            '<g>' + ''.join(nodes) + ''.join(dots) + '</g></svg>\n')


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    open(sys.argv[2], 'w').write(build(sys.argv[1]))
