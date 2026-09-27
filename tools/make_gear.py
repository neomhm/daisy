"""Draw the mechanical wheel that turns in the slots behind the box stack, as an SVG <symbol>.

A 24-tooth gear (three bytes: one tooth per bit, as the logo flower is one byte) with a rim, six
spokes and a bolted hub. It is a single path, its holes cut with the even-odd rule, filled with
currentColor so each slot gives it its own colour. Tooth 0 points east.

Usage: python3 tools/make_gear.py > gear.txt   (paste into the sprite in index.html)
"""
import math

TEETH = 24
TIP, ROOT, RIM, HUB, AXLE = 47, 41, 34, 13, 5    # radii, in a 100-unit box
TIP_HALF, ROOT_HALF = 0.21, 0.31                  # half a tooth, in tooth pitches, at the tip and root
SPOKES, SPOKE = 6, 7                              # six spokes, 7 units wide
BOLTS, BOLT_RING, BOLT = 6, 9, 1.5


def f(x):
    s = ('%.2f' % x).rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s


def pt(r, a):
    return f(r * math.cos(a)) + ' ' + f(r * math.sin(a))


def circle(r, cx=0.0, cy=0.0):
    return (f'M{f(cx + r)} {f(cy)}A{f(r)} {f(r)} 0 1 0 {f(cx - r)} {f(cy)}'
            f'A{f(r)} {f(r)} 0 1 0 {f(cx + r)} {f(cy)}Z')


def teeth():
    step = 2 * math.pi / TEETH
    d = []
    for i in range(TEETH):
        c = i * step
        d.append(('M' if i == 0 else 'L') + pt(ROOT, c - ROOT_HALF * step))
        d.append('L' + pt(TIP, c - TIP_HALF * step))
        d.append(f'A{TIP} {TIP} 0 0 1 ' + pt(TIP, c + TIP_HALF * step))
        d.append('L' + pt(ROOT, c + ROOT_HALF * step))
        d.append(f'A{ROOT} {ROOT} 0 0 1 ' + pt(ROOT, c + step - ROOT_HALF * step))
    return ''.join(d) + 'Z'


def windows():
    # The openings between the spokes: straight sides keep every spoke the same width.
    d, w = [], SPOKE / 2
    for k in range(SPOKES):
        a, b = 2 * math.pi * k / SPOKES, 2 * math.pi * (k + 1) / SPOKES
        p1, p2 = pt(HUB, a + math.asin(w / HUB)), pt(RIM, a + math.asin(w / RIM))
        p3, p4 = pt(RIM, b - math.asin(w / RIM)), pt(HUB, b - math.asin(w / HUB))
        d.append(f'M{p1}L{p2}A{RIM} {RIM} 0 0 1 {p3}L{p4}A{HUB} {HUB} 0 0 0 {p1}Z')
    return ''.join(d)


def gear():
    holes = [circle(AXLE)] + [circle(BOLT, BOLT_RING * math.cos(a), BOLT_RING * math.sin(a))
                              for a in (2 * math.pi * (k + 0.5) / BOLTS for k in range(BOLTS))]
    return ('<symbol id="gear" viewBox="-50 -50 100 100"><path fill="currentColor" fill-rule="evenodd" d="'
            + teeth() + windows() + ''.join(holes) + '"/></symbol>')


if __name__ == '__main__':
    print('    ' + gear())
