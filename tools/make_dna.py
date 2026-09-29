"""Draw the DNA helix of the "Your data" section, as inline SVG for index.html.

Two strands of nodes, in the flower logos' network-of-nodes style: one strand in the logos'
golden and orange heart colours, the other in the models' own colours, joined by rungs. The
twist is done by the page's CSS ("DNA helix" in style.css): every rung has its phase in --p, and
one animated angle turns them all, so the nodes rise, fall, grow and shrink as the helix spins.
Without motion the helix stands still, twisted.

Usage: python3 tools/make_dna.py > dna.txt   (paste into the "Your data" section of index.html)
"""

RUNGS, STEP, TWIST = 30, 24, 24          # rungs, pixels between rungs, degrees of twist per rung
HEART = ['#f2b632', '#f0a444', '#ec8e4a', '#f0a444']
MODELS = ['#c2549e', '#3aa56f', '#a06fc2', '#ec8e4a', '#de7c95', '#7c8acb', '#e65b56', '#35adb0']

if __name__ == '__main__':
    width = RUNGS * STEP
    parts = [f'<svg class="dna" viewBox="0 0 {width} 120" role="img" aria-label="A turning DNA helix of coloured nodes">']
    for i in range(RUNGS):
        x = STEP / 2 + i * STEP
        parts.append(f'<g style="--p:{i * TWIST % 360}deg">'
                     f'<line x1="{x:g}" y1="20" x2="{x:g}" y2="100"/>'
                     f'<circle class="a" cx="{x:g}" cy="60" r="5" fill="{HEART[i % len(HEART)]}"/>'
                     f'<circle class="b" cx="{x:g}" cy="60" r="5" fill="{MODELS[i % len(MODELS)]}"/></g>')
    parts.append('</svg>')
    print(''.join(parts))
