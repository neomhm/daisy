"""Draw the AKIKI logo: the word drawn as a row of small plants in the node-and-line style
of the D.AI.SY flowers. Stems are rooted on the baseline, buds at the top take the daisy's
colours, and each K branches from a golden heart node, like the organizer at the daisy's centre.

Usage: python3 tools/make_akiki_logo.py OUTPUT_DIR
Writes akiki-logo.svg, akiki-logo-dark.svg, akiki-wordmark.svg and akiki-icon.svg.
Needs: pip install fonttools (the motto is converted to outlines from Liberation Sans Italic).
"""
import os
import sys

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

FONT = '/usr/share/fonts/truetype/liberation/LiberationSans-Italic.ttf'
MOTTO = 'a kinder Kind of AI'
SLATE, SLATE_DARK_BG = '#2f4d5c', '#e6edf3'
GOLD = '#f2b632'
STOPS = [(0.0, '#2fb39a'), (0.25, '#35adb0'), (0.5, '#6592b4'), (0.75, '#8a80cf'), (1.0, '#ad76bb')]
STROKE = 8


def rgb(h):
    return [int(h[i:i + 2], 16) for i in (1, 3, 5)]


def mix(a, b, t):
    a, b = rgb(a), rgb(b)
    return '#%02x%02x%02x' % tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def palette(t):
    for (t0, c0), (t1, c1) in zip(STOPS, STOPS[1:]):
        if t <= t1:
            return mix(c0, c1, (t - t0) / (t1 - t0))
    return STOPS[-1][1]


def f(x):
    s = ('%.2f' % x).rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s


def letters():
    """Edges and nodes of the word AKIKI (cap height 100, baseline y=100)."""
    edges, nodes = [], []           # nodes: (x, y, kind) with kind in bud / heart / root / joint

    def A(x):
        L, T, R = (x, 100), (x + 42, 0), (x + 84, 100)
        cy = 64
        cl, cr = (x + 42 * (100 - cy) / 100, cy), (x + 84 - 42 * (100 - cy) / 100, cy)
        edges.extend([(L, T), (T, R), (cl, cr)])
        nodes.extend([(*T, 'bud'), (*L, 'root'), (*R, 'root'), (*cl, 'joint'), (*cr, 'joint')])

    def K(x):
        top, bottom, heart, up, down = (x, 0), (x, 100), (x, 56), (x + 60, 0), (x + 60, 100)
        edges.extend([(top, bottom), (heart, up), (heart, down)])
        nodes.extend([(*top, 'bud'), (*up, 'bud'), (*bottom, 'root'), (*down, 'root'), (*heart, 'heart')])

    def I(x):
        edges.append(((x, 0), (x, 100)))
        nodes.extend([(x, 0, 'bud'), (x, 100, 'root')])

    A(0)
    K(120)
    I(220)
    K(256)
    I(356)
    return edges, nodes, 356


def wordmark(ox, oy, scale, line_colour):
    edges, nodes, width = letters()
    p = lambda x, y: (ox + x * scale, oy + y * scale)
    out = [f'<g stroke="{line_colour}" stroke-width="{f(STROKE * scale)}" stroke-linecap="round">']
    for a, b in edges:
        (x1, y1), (x2, y2) = p(*a), p(*b)
        out.append(f'<line x1="{f(x1)}" y1="{f(y1)}" x2="{f(x2)}" y2="{f(y2)}"/>')
    out.append('</g><g>')
    radius = {'bud': 12.5, 'heart': 10, 'root': 7.5, 'joint': 6.5}
    for x, y, kind in nodes:
        colour = palette(x / width) if kind == 'bud' else GOLD if kind == 'heart' else line_colour
        cx, cy = p(x, y)
        out.append(f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(radius[kind] * scale)}" fill="{colour}"/>')
    out.append('</g>')
    return ''.join(out)


def motto(x0, baseline, size, colour):
    font = TTFont(FONT)
    glyphs, cmap = font.getGlyphSet(), font.getBestCmap()
    s = size / font['head'].unitsPerEm
    pen, x = SVGPathPen(glyphs), 0
    for ch in MOTTO:
        g = cmap[ord(ch)]
        glyphs[g].draw(TransformPen(pen, (s, 0, 0, -s, x0 + x * s, baseline)))
        x += glyphs[g].width
    return f'<path fill="{colour}" d="{pen.getCommands()}"/>', x * s


def svg(w, h, body, label):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {f(w)} {f(h)}" width="{f(w)}" height="{f(h)}" '
            f'role="img" aria-label="{label}">{body}</svg>\n')


def build(out):
    pad = 16
    # Full logo: wordmark with the motto underneath, for light and dark backgrounds.
    for name, line, text in (('akiki-logo.svg', SLATE, '#59636e'), ('akiki-logo-dark.svg', SLATE_DARK_BG, '#b7c2cc')):
        words = wordmark(pad, pad, 1, line)
        tag, tag_w = motto(pad - 4, pad + 100 + 62, 34, text)
        w = pad * 2 + 356
        open(os.path.join(out, name), 'w').write(svg(w, pad + 100 + 62 + 12 + pad, words + tag, 'AKIKI, a kinder Kind of AI'))
    open(os.path.join(out, 'akiki-wordmark.svg'), 'w').write(svg(pad * 2 + 356, pad * 2 + 100, wordmark(pad, pad, 1, SLATE), 'AKIKI'))
    # Icon: one K, a stem that branches from a golden heart, with buds.
    icon = ('<g stroke="%s" stroke-width="9" stroke-linecap="round">'
            '<line x1="32" y1="14" x2="32" y2="86"/><line x1="32" y1="54" x2="78" y2="14"/><line x1="32" y1="54" x2="78" y2="86"/></g>'
            '<circle cx="32" cy="14" r="10.5" fill="#2fb39a"/><circle cx="78" cy="14" r="10.5" fill="#8a80cf"/>'
            '<circle cx="32" cy="86" r="7.5" fill="%s"/><circle cx="78" cy="86" r="7.5" fill="%s"/>'
            '<circle cx="32" cy="54" r="10" fill="%s"/>') % (SLATE, SLATE, SLATE, GOLD)
    open(os.path.join(out, 'akiki-icon.svg'), 'w').write(svg(100, 100, icon, 'AKIKI'))


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    build(sys.argv[1])
