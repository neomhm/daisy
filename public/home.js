/* The home board ("Home" in style.css). Every five seconds a few neighbouring tiles swap places:
   when both cells hold a tile, one lifts over the other on a small arc while the other dips under;
   a tile next to an empty slot slides into it. The board rests while the pointer or keyboard
   focus is on it, while the page is hidden, and for visitors who ask for less motion. */
(() => {
  const board = document.querySelector('.board');
  if (!board) return;
  const N = 5, ROUND = 5000, SWAPS = 3, STAGGER = 160, TIME = 950;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  const tiles = [...board.querySelectorAll('.tile')];

  for (let y = N - 1; y >= 0; y--) for (let x = N - 1; x >= 0; x--) {
    const slot = document.createElement('i');
    slot.className = 'slot';
    slot.style.cssText = `--x:${x};--y:${y}`;
    board.prepend(slot);
  }
  const step = () => { const s = board.querySelectorAll('.slot'); return s[1].offsetLeft - s[0].offsetLeft; };

  const key = (x, y) => x + ',' + y;
  const at = new Map();
  tiles.forEach(t => at.set(key(+t.style.getPropertyValue('--x'), +t.style.getPropertyValue('--y')), t));

  const pairs = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (x + 1 < N) pairs.push([[x, y], [x + 1, y]]);
    if (y + 1 < N) pairs.push([[x, y], [x, y + 1]]);
  }

  // Move a tile to a new cell: it lands there at once, then glides from where it was (FLIP).
  const move = (tile, from, to, role) => {
    const S = step();
    const dx = (from[0] - to[0]) * S, dy = (from[1] - to[1]) * S;
    const side = role === 'over' ? -0.16 : role === 'under' ? 0.08 : 0;   // the arc, across the direction of travel
    const ax = dy === 0 ? 0 : side * S, ay = dx === 0 ? 0 : side * S;
    const lift = role === 'over' ? 1.16 : role === 'under' ? 0.86 : 1.06;
    tile.style.setProperty('--x', to[0]);
    tile.style.setProperty('--y', to[1]);
    tile.classList.add('is-' + role);
    const done = () => tile.classList.remove('is-' + role);
    tile.animate([
      { transform: `translate(${dx}px, ${dy}px)` },
      { transform: `translate(${dx / 2 + ax}px, ${dy / 2 + ay}px) scale(${lift})`, offset: 0.5 },
      { transform: 'none' },
    ], { duration: TIME, easing: 'cubic-bezier(.65, 0, .35, 1)' }).finished.then(done, done);
  };

  const swap = ([a, b]) => {
    const ta = at.get(key(...a)), tb = at.get(key(...b));
    at.delete(key(...a)); at.delete(key(...b));
    if (ta) at.set(key(...b), ta);
    if (tb) at.set(key(...a), tb);
    const both = ta && tb, up = Math.random() < 0.5;
    if (ta) move(ta, a, b, both ? (up ? 'over' : 'under') : 'slide');
    if (tb) move(tb, b, a, both ? (up ? 'under' : 'over') : 'slide');
  };

  let last = [];
  const round = () => {
    if (paused || document.hidden || still.matches) return;
    const used = new Set(), chosen = [];
    for (const p of pairs.slice().sort(() => Math.random() - 0.5)) {
      if (chosen.length === SWAPS) break;
      const [a, b] = p.map(c => key(...c));
      if (used.has(a) || used.has(b) || (!at.has(a) && !at.has(b))) continue;
      if (last.some(q => q[0] === a && q[1] === b)) continue;   // never straight back
      used.add(a); used.add(b);
      chosen.push(p);
    }
    last = chosen.map(p => p.map(c => key(...c)));
    chosen.forEach((p, i) => setTimeout(() => swap(p), i * STAGGER));
  };

  let paused = false;
  board.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') paused = true; });
  board.addEventListener('pointerleave', () => { paused = false; });
  board.addEventListener('focusin', () => { paused = true; });
  board.addEventListener('focusout', () => { paused = false; });

  setTimeout(() => { round(); setInterval(round, ROUND); }, 2000);
})();

/* The workbench under the board ("Home, second screen" in style.css). Scroll snapping stops the
   page on one or the other, but a short wheel or trackpad scroll would only spring back; here even
   a little scroll down from the board glides the page to the workbench, and a little scroll up from
   the workbench's top glides it back. Scrolls inside the tiles panel stay there. On phones the page
   scrolls freely. */
(() => {
  const bench = document.querySelector('.home .bench');
  if (!bench) return;
  const html = document.documentElement;
  const wide = window.matchMedia('(min-width: 701px)');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  const benchAt = () => Math.min(html.scrollHeight - innerHeight,
    Math.round(bench.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(html).scrollPaddingTop) || 0)));
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  let gliding = false;
  const glide = to => {
    const from = scrollY;
    if (Math.abs(to - from) < 2) return;
    if (still.matches) { window.scrollTo(0, to); return; }
    gliding = true;
    html.style.scrollSnapType = 'none';     // the snapping would catch the page on its way
    html.style.scrollBehavior = 'auto';
    const T = Math.min(850, 480 + Math.abs(to - from) * 0.3), t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / T);
      window.scrollTo(0, from + (to - from) * ease(k));
      if (k < 1) { requestAnimationFrame(step); return; }
      html.style.scrollSnapType = '';
      html.style.scrollBehavior = '';
      gliding = false;
    };
    requestAnimationFrame(step);
  };

  // Could this wheel scroll something inside the page (the tiles panel, an open menu) instead?
  const inner = (el, dy) => {
    for (; el && el !== document.body && el !== html; el = el.parentElement) {
      if (!/(auto|scroll)/.test(getComputedStyle(el).overflowY) || el.scrollHeight <= el.clientHeight + 1) continue;
      if (dy > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0) return true;
    }
    return false;
  };

  window.addEventListener('wheel', e => {
    if (!wide.matches || e.ctrlKey || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    const y = scrollY, at = benchAt();
    const down = e.deltaY > 0;
    if (down ? y >= at - 1 : (y <= 0 || y > at + 1)) return;   // already there, or further down the page
    if (!gliding && inner(e.target, e.deltaY)) return;
    e.preventDefault();
    if (!gliding) glide(down ? at : 0);
  }, { passive: false });

  const next = document.querySelector('.board-next');
  if (next) next.addEventListener('click', e => { e.preventDefault(); glide(benchAt()); });
})();
