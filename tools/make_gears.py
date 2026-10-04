"""Draw the machine behind the box stack: one gear train, seen only through the grey slots.

Gears of different sizes, all with the same tooth size, mesh tooth to gap: each one drives the
next, small ones spin faster, neighbours turn opposite ways. Every gear is a sharp vector wheel
in one of the logo's colours (the page shows the whole machine at half strength). The picture is
an animated SVG sized like the stack frame: 100 units per box, 5 x 4.3 boxes (the Butterfly page's
frame is 3.3 boxes tall and shows only the top).

Usage: python3 tools/make_gears.py OUTPUT.svg [--check]
  Also writes OUTPUT-still.svg, the same picture standing still, for visitors who ask for less motion.
  --check  also tests, by drawing every step of one tooth, that no two gears ever touch
"""
import math
import sys

W, H = 500, 430
M = 2.0                         # module: a gear with N teeth has a pitch radius of N units
RATE = 1.4                      # teeth per second passing every contact
TIP, ROOT = 0.9 * M, 1.25 * M   # addendum and dedendum
THICK = 0.42 * math.pi * M      # tooth thickness on the pitch circle
FLANK = math.tan(math.radians(14))
BACKLASH = 0.8                  # extra distance between meshing gears

# The slots of the stack (x, y, width, height): the machine only shows through these.
SLOTS = [(50, 115, 100, 100), (350, 215, 100, 100), (150, 15, 200, 100), (350, 15, 100, 100),
         (50, 15, 100, 100), (150, 115, 100, 100), (250, 115, 100, 100), (350, 115, 100, 100),
         (50, 215, 100, 100), (150, 215, 200, 100), (200, 315, 100, 100)]

# teeth, colour, the gear it meshes with, direction from that gear (degrees clockwise from east)
TRAIN = [
    (40, '#2fb39a', None, (78, 172)),   # the big wheel in the slot left of Tulip, behind Orchid
    (16, '#ec8e4a', 0, -35),
    (24, '#3aa56f', 1, 20),
    (32, '#35adb0', 2, 35),
    (14, '#ad76bb', 3, -40),
    (36, '#a06fc2', 4, 10),
    (18, '#7c8acb', 5, -30),
    (28, '#8a80cf', 6, 40),
    (20, '#6592b4', 7, 75),
    (44, '#7c8acb', 8, 60),             # the big wheel in the slot under Daisy, behind Magnolia
    (12, '#ec8e4a', 9, 190),
    (24, '#6592b4', 0, 70),
    (20, '#a06fc2', 11, 0),
    (24, '#3aa56f', 5, -100),
    (36, '#ec8e4a', 13, 185),
    (30, '#35adb0', 10, 180),
    (20, '#8a80cf', 3, 100),             # reaching up behind "your computer"
    (16, '#2fb39a', 5, 80),
    (30, '#7c8acb', 6, -65),            # up into Iris's slot, beside the bouquet
    (36, '#e65b56', 0, -100),           # up into Lily's slot, on the bouquet's other side
    (20, '#94549f', 15, 125),           # down under "your computer"...
    (40, '#2fb39a', 20, 125),           # ...to the big wheel in Thistle's slot, below everything
]


def f(x):
    s = ('%.2f' % x).rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s


def place():
    gears = []
    for n, colour, parent, where in TRAIN:
        g = {'n': n, 'colour': colour, 'r': M * n / 2, 'tau': 2 * math.pi / n}
        if parent is None:
            g.update(x=where[0], y=where[1], phase=0.0, speed=2 * math.pi * RATE / n)
        else:
            p = gears[parent]
            b = math.radians(where)
            d = p['r'] + g['r'] + BACKLASH
            g.update(x=p['x'] + d * math.cos(b), y=p['y'] + d * math.sin(b), speed=-p['speed'] * p['n'] / n)
            # a tooth of one gear always meets a gap of the other
            g['phase'] = b + math.pi - g['tau'] * (0.5 - (b - p['phase']) / p['tau'])
        gears.append(g)
    return gears


def outline(g, angle=0.0, steps=6):
    """The toothed rim as a list of points: straight flanks, arcs at root and tip."""
    n, r = g['n'], g['r']
    rt, rr = r + TIP, r - ROOT
    pts = []
    for i in range(n):
        c = angle + i * g['tau']
        half = lambda rad: (THICK - 2 * FLANK * (rad - r)) / 2 / rad     # half a tooth, as an angle
        a_root, a_tip = half(rr), half(rt)
        pts.append((rr, c - a_root))
        pts.append((rt, c - a_tip))
        pts += [(rt, c - a_tip + 2 * a_tip * k / steps) for k in range(1, steps)]
        pts.append((rt, c + a_tip))
        pts.append((rr, c + a_root))
        gap = g['tau'] - 2 * a_root
        pts += [(rr, c + a_root + gap * k / steps) for k in range(1, steps)]
    return [(g['x'] + rad * math.cos(a), g['y'] + rad * math.sin(a)) for rad, a in pts]


def path(g):
    """The gear drawn around its own centre: rim, then holes cut with the even-odd rule."""
    n, r = g['n'], g['r']
    rt, rr = r + TIP, r - ROOT
    d = []
    for i in range(n):
        c = i * g['tau']
        half = lambda rad: (THICK - 2 * FLANK * (rad - r)) / 2 / rad
        a_root, a_tip = half(rr), half(rt)
        pt = lambda rad, a: f(rad * math.cos(a)) + ' ' + f(rad * math.sin(a))
        d.append(('M' if i == 0 else 'L') + pt(rr, c - a_root) + 'L' + pt(rt, c - a_tip)
                 + f'A{f(rt)} {f(rt)} 0 0 1 ' + pt(rt, c + a_tip) + 'L' + pt(rr, c + a_root)
                 + f'A{f(rr)} {f(rr)} 0 0 1 ' + pt(rr, c + g['tau'] - a_root))
    d.append('Z')
    circle = lambda rad, cx=0.0, cy=0.0: (f'M{f(cx + rad)} {f(cy)}A{f(rad)} {f(rad)} 0 1 0 {f(cx - rad)} {f(cy)}'
                                          f'A{f(rad)} {f(rad)} 0 1 0 {f(cx + rad)} {f(cy)}Z')
    axle = max(1.6, r * 0.12)
    d.append(circle(axle))
    if n >= 24:                                       # big wheels: rim, spokes and a hub
        rim, hub, spokes, w = rr - 3.2, max(axle + 3.4, r * 0.3), 6 if n >= 32 else 5, max(2.2, r * 0.09) / 2
        for k in range(spokes):
            a, b = 2 * math.pi * k / spokes, 2 * math.pi * (k + 1) / spokes
            p = lambda rad, a: f(rad * math.cos(a)) + ' ' + f(rad * math.sin(a))
            d.append(f'M{p(hub, a + math.asin(w / hub))}L{p(rim, a + math.asin(w / rim))}'
                     f'A{f(rim)} {f(rim)} 0 0 1 {p(rim, b - math.asin(w / rim))}'
                     f'L{p(hub, b - math.asin(w / hub))}A{f(hub)} {f(hub)} 0 0 0 {p(hub, a + math.asin(w / hub))}Z')
    elif n >= 16:                                     # middle wheels: round holes
        holes, ring = 4, (axle + rr) / 2
        rad = min((rr - axle) / 2 - 1.2, ring * math.sin(math.pi / holes) - 1)
        for k in range(holes):
            a = 2 * math.pi * (k + 0.5) / holes
            d.append(circle(rad, ring * math.cos(a), ring * math.sin(a)))
    return ''.join(d)


def svg(gears, moving=True):
    # Each gear sits at its starting angle; the animation turns it from there, once per N / RATE seconds.
    style = ('<style>.g{transform-box:fill-box;transform-origin:center;animation:turn linear infinite}'
             '@keyframes turn{to{transform:rotate(360deg)}}'
             '@media (prefers-reduced-motion:reduce){.g{animation:none}}</style>') if moving else ''
    body = []
    for g in gears:
        turn = (f' class="g" style="animation-duration:{f(g["n"] / RATE)}s'
                + (';animation-direction:reverse"' if g['speed'] < 0 else '"')) if moving else ''
        body.append(f'<g transform="translate({f(g["x"])} {f(g["y"])}) rotate({f(math.degrees(g["phase"]) % 360)})">'
                    f'<path{turn} fill="{g["colour"]}" fill-rule="evenodd" d="{path(g)}"/></g>')
    clip = ''.join(f'<rect x="{x}" y="{y}" width="{w}" height="{h}"/>' for x, y, w, h in SLOTS)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">'
            f'{style}<defs><clipPath id="slots">{clip}</clipPath></defs>'
            f'<g clip-path="url(#slots)">{"".join(body)}</g></svg>\n')


def check(gears, scale=4, steps=40):
    """Draw every gear at each step of one tooth and report any two that touch."""
    from PIL import Image, ImageChops, ImageDraw
    worst = 0
    pairs = [(a, b) for a in range(len(gears)) for b in range(a + 1, len(gears))
             if math.hypot(gears[a]['x'] - gears[b]['x'], gears[a]['y'] - gears[b]['y'])
             < gears[a]['r'] + gears[b]['r'] + 2 * TIP + 2]
    for s in range(steps):
        t = s / steps / RATE
        masks = []
        for g in gears:
            im = Image.new('1', (W * scale, H * scale), 0)
            ImageDraw.Draw(im).polygon([(x * scale, y * scale) for x, y in outline(g, g['phase'] + g['speed'] * t)], fill=1)
            masks.append(im)
        for a, b in pairs:
            touching = ImageChops.logical_and(masks[a], masks[b]).getbbox()
            if touching:
                worst += 1
                print(f'  step {s}: gears {a} and {b} touch around {touching}')
    return worst


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    gears = place()
    open(sys.argv[1], 'w').write(svg(gears))
    open(sys.argv[1].replace('.svg', '-still.svg'), 'w').write(svg(gears, moving=False))
    print(f'{len(gears)} gears')
    if '--check' in sys.argv:
        bad = check(gears)
        print('no gears touch' if not bad else f'{bad} contacts found')
