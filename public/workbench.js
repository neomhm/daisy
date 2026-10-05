/* The workbench ("Workbench" in style.css).

   Tiles move between the panel on the right and the squares of the template field, by dragging
   them or with a click (a click sends a panel tile to the field, next to the group being built,
   and a field tile back to the panel). A tile's few words show only while it sits in the panel.
   On the field, a tile dropped near another one is pulled into the square beside it, and a magnet
   bar joins every two tiles side by side. The two screens add up the size and the latency of the
   group the last moved tile belongs to; tiles with no figures yet are named under them. The panel
   can be resized by dragging its left edge, or with the arrow keys on it. */
(() => {
  const bench = document.querySelector('.bench');
  if (!bench) return;
  const COLS = 8, ROWS = 7;
  const field = bench.querySelector('.field');
  const grid = bench.querySelector('.field-grid');
  const tray = bench.querySelector('.tray');
  const splitter = bench.querySelector('.splitter');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  const phone = window.matchMedia('(max-width: 700px)');
  const tiles = [...tray.querySelectorAll('.wtile')];
  const home = new Map(tiles.map(t => [t, t.parentElement]));
  const squares = [...tray.querySelectorAll('.tray-slot .sq')];

  // The field's squares.
  const cells = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.c = c;
    cell.dataset.r = r;
    grid.append(cell);
    cells.push(cell);
  }
  grid.style.setProperty('--cols', COLS);
  const cellAt = (c, r) => (c >= 0 && r >= 0 && c < COLS && r < ROWS ? cells[r * COLS + c] : null);
  const posOf = cell => [+cell.dataset.c, +cell.dataset.r];
  const tileIn = sq => sq && sq.querySelector('.wtile');
  const onField = t => t.parentElement && t.parentElement.classList.contains('cell');
  const neighbours = cell => {
    const [c, r] = posOf(cell);
    return [cellAt(c + 1, r), cellAt(c - 1, r), cellAt(c, r + 1), cellAt(c, r - 1)].filter(Boolean);
  };

  // Square cells as large as the field allows.
  const fit = () => {
    const cs = getComputedStyle(field);
    const w = field.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const h = field.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const g = 0.14;
    const byW = w / (COLS + (COLS - 1) * g);
    const byH = phone.matches ? Infinity : h / (ROWS + (ROWS - 1) * g);
    const cell = Math.max(30, Math.min(118, byW, byH));
    grid.style.setProperty('--cell', cell.toFixed(1) + 'px');
    grid.style.setProperty('--gap', (cell * g).toFixed(1) + 'px');
    joints();
  };

  // ---- The screens: a dot-matrix display of six digits that counts to each new value. ----
  const FONT = {
    0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
    1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
    2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
    3: ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
    4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
    5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
    6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
    7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
    8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
    9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  };
  const DIGITS = 6;
  class Meter {
    constructor(box, format) {
      this.box = box;
      this.screen = box.querySelector('.screen');
      this.canvas = box.querySelector('canvas');
      this.unit = box.querySelector('.unit');
      this.spoken = box.querySelector('.sr-only');
      this.format = format;
      this.value = 0;
      this.raf = 0;
      this.paint(0);
    }
    paint(v) {
      const { text, unit } = this.format(v);
      this.unit.textContent = unit;
      const cv = this.canvas, dpr = window.devicePixelRatio || 1;
      const W = cv.clientWidth, H = cv.clientHeight;
      if (!W || !H) return;
      if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
      const x = cv.getContext('2d');
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.clearRect(0, 0, W, H);
      // digits right-aligned; a decimal point sits in the gap after its digit
      const digits = text.replace('.', '');
      const dp = text.includes('.') ? text.indexOf('.') - 1 + (DIGITS - digits.length) : -1;
      const cols = DIGITS * 6 - 1, rows = 7;
      const p = Math.min(W / (cols + 3), H / (rows + 2.6));
      const x0 = (W - cols * p) / 2 + p / 2, y0 = (H - rows * p) / 2 + p / 2, rad = p * 0.36;
      const dot = (cx, cy, on) => {
        x.beginPath();
        x.arc(cx, cy, rad, 0, Math.PI * 2);
        x.fillStyle = on ? '#ffc14d' : 'rgba(255, 193, 77, .07)';
        x.shadowBlur = on ? p * 0.9 : 0;
        x.shadowColor = 'rgba(255, 170, 40, .9)';
        x.fill();
      };
      const pad = DIGITS - digits.length;
      for (let i = 0; i < DIGITS; i++) {
        const ch = i < pad ? null : digits[i - pad];
        const glyph = ch === null ? null : FONT[ch];
        for (let r = 0; r < rows; r++) for (let c = 0; c < 5; c++) {
          dot(x0 + (i * 6 + c) * p, y0 + r * p, !!glyph && glyph[r][c] === '1');
        }
        if (i < DIGITS - 1) dot(x0 + (i * 6 + 5) * p, y0 + 6 * p, i === dp);
      }
    }
    set(target) {
      const from = this.value;
      this.value = target;
      this.spoken.textContent = this.format(target).spoken;
      if (from === target) { this.paint(target); return; }
      cancelAnimationFrame(this.raf);
      if (still.matches) { this.paint(target); return; }
      this.screen.classList.remove('is-changing');
      void this.screen.offsetWidth;
      this.screen.classList.add('is-changing');
      const t0 = performance.now(), T = 900;
      const step = now => {
        const k = Math.min(1, (now - t0) / T), e = 1 - Math.pow(1 - k, 3);
        this.paint(from + (target - from) * e);
        if (k < 1) this.raf = requestAnimationFrame(step);
      };
      this.raf = requestAnimationFrame(step);
    }
  }
  const sizeMeter = new Meter(tray.querySelector('[data-meter="size"]'), m => (
    m >= 1000
      ? { text: (m / 1000).toFixed(2), unit: 'B', spoken: (m / 1000).toFixed(2) + ' billion parameters' }
      : { text: m.toFixed(1), unit: 'M', spoken: m.toFixed(1) + ' million parameters' }));
  const msMeter = new Meter(tray.querySelector('[data-meter="latency"]'), v => (
    { text: String(Math.round(v)), unit: 'ms', spoken: Math.round(v) + ' milliseconds' }));
  const note = tray.querySelector('.meter-note');

  // ---- Groups of joined tiles, the magnet bars, and the counting. ----
  let last = null;   // the tile moved last: its group is the one counted
  const groups = () => {
    const seen = new Set(), out = [];
    for (const cell of cells) {
      if (!tileIn(cell) || seen.has(cell)) continue;
      const group = [], todo = [cell];
      seen.add(cell);
      while (todo.length) {
        const c = todo.pop();
        group.push(tileIn(c));
        for (const n of neighbours(c)) if (tileIn(n) && !seen.has(n)) { seen.add(n); todo.push(n); }
      }
      out.push(group);
    }
    return out;
  };
  const list = names => names.length < 3 ? names.join(' and ') : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];

  let jointKeys = new Set(), activeGroup = [];
  const joints = (active = activeGroup) => {
    grid.querySelectorAll('.joint').forEach(j => j.remove());
    const S = parseFloat(grid.style.getPropertyValue('--cell')) || 96;
    const G = parseFloat(grid.style.getPropertyValue('--gap')) || 12;
    const keys = new Set();
    for (const cell of cells) {
      const a = tileIn(cell);
      if (!a) continue;
      const [c, r] = posOf(cell);
      for (const [dc, dr] of [[1, 0], [0, 1]]) {
        const b = tileIn(cellAt(c + dc, r + dr));
        if (!b) continue;
        const key = a.dataset.id + '|' + b.dataset.id;
        keys.add(key);
        const j = document.createElement('i');
        j.className = 'joint';
        const tuck = Math.min(10, S * 0.12), thick = S * 0.34;
        if (dc) Object.assign(j.style, { left: (c * (S + G) + S - tuck) + 'px', top: (r * (S + G) + (S - thick) / 2) + 'px', width: (G + 2 * tuck) + 'px', height: thick + 'px' });
        else Object.assign(j.style, { left: (c * (S + G) + (S - thick) / 2) + 'px', top: (r * (S + G) + S - tuck) + 'px', width: thick + 'px', height: (G + 2 * tuck) + 'px' });
        j.style.setProperty('--a', getComputedStyle(a).getPropertyValue('--tc'));
        j.style.setProperty('--b', getComputedStyle(b).getPropertyValue('--tc'));
        j.style.setProperty('--dir', dc ? 'to right' : 'to bottom');
        if (active.includes(a) && active.includes(b)) j.classList.add('is-active');
        if (!jointKeys.has(key)) j.classList.add('is-new');
        grid.append(j);
      }
    }
    jointKeys = keys;
  };

  const count = () => {
    const all = groups();
    let group = (last && onField(last) && all.find(g => g.includes(last))) || null;
    if (!group) group = all.sort((a, b) => b.length - a.length)[0] || [];
    tiles.forEach(t => t.classList.toggle('is-active', group.includes(t)));
    let size = 0, ms = 0;
    const none = [], timeOnly = [];
    for (const t of group) {
      const p = t.dataset.params, l = t.dataset.ms;
      if (p !== '') size += +p;
      if (l !== '') ms += +l;
      if (p === '' && l === '') none.push(t.dataset.name);
      else if (p === '') timeOnly.push(t.dataset.name);
    }
    sizeMeter.set(Math.round(size * 10) / 10);
    msMeter.set(ms);
    const parts = [];
    if (none.length) parts.push(`No figures yet for ${list(none)}.`);
    if (timeOnly.length) parts.push(`${list(timeOnly)} ${timeOnly.length > 1 ? 'add' : 'adds'} time but no size.`);
    note.textContent = parts.join(' ');
    note.hidden = !parts.length;
    activeGroup = group;
    joints(group);
  };

  // ---- Moving a tile: it lands in its new square at once, then glides there from where it was. ----
  const caption = sq => sq.closest('.tray-slot');
  const setCaption = (slot, tile) => {
    slot.classList.toggle('is-empty', !tile);
    const cap = slot.querySelector('.cap');
    if (tile) cap.innerHTML = `<b>${tile.dataset.name.toLowerCase()}</b><span>${tile.dataset.words}</span>`;
  };
  const place = (tile, sq, { magnet = false } = {}) => {
    const from = tile.getBoundingClientRect();
    const prev = tile.parentElement;
    const focused = document.activeElement === tile;
    tile.classList.remove('is-dragging');
    ['transform', 'width', 'height'].forEach(k => tile.style.removeProperty(k));
    sq.append(tile);
    if (prev && prev.classList.contains('sq')) setCaption(caption(prev), tileIn(prev));
    if (sq.classList.contains('sq')) setCaption(caption(sq), tile);
    if (focused) tile.focus({ preventScroll: true });
    const to = tile.getBoundingClientRect();
    if (still.matches || !from.width || !to.width) return;
    const dx = from.left - to.left, dy = from.top - to.top, s = from.width / to.width;
    tile.style.transformOrigin = 'top left';
    const frames = [{ transform: `translate(${dx}px, ${dy}px) scale(${s})` }];
    if (magnet) frames.push({ transform: 'translate(0, 0) scale(1.07)', offset: 0.72 });
    frames.push({ transform: 'none' });
    const done = () => { tile.style.transformOrigin = ''; };
    tile.animate(frames, { duration: magnet ? 460 : 380, easing: magnet ? 'cubic-bezier(.25, 1.2, .5, 1)' : 'cubic-bezier(.2, .8, .2, 1)' })
      .finished.then(done, done);
  };

  // Where a click sends a panel tile: beside the group being built, else the middle of the field.
  const nextCell = () => {
    const all = groups();
    const group = (last && onField(last) && all.find(g => g.includes(last))) || all.sort((a, b) => b.length - a.length)[0];
    if (!group) return cellAt(Math.floor(COLS / 2) - 1, Math.floor(ROWS / 2));
    const at = group.map(t => posOf(t.parentElement));
    const cx = at.reduce((s, p) => s + p[0], 0) / at.length, cy = at.reduce((s, p) => s + p[1], 0) / at.length;
    const free = new Set();
    group.forEach(t => neighbours(t.parentElement).forEach(n => { if (!tileIn(n)) free.add(n); }));
    if (!free.size) return cells.find(c => !tileIn(c)) || null;
    return [...free].sort((a, b) => {
      const [ac, ar] = posOf(a), [bc, br] = posOf(b);
      return (Math.hypot(ac - cx, ar - cy) + ar * 0.01) - (Math.hypot(bc - cx, br - cy) + br * 0.01);
    })[0];
  };
  const backToPanel = tile => (tileIn(home.get(tile)) ? squares.find(sq => !tileIn(sq)) : home.get(tile));

  // ---- Dragging. ----
  let drag = null, target = null, swallowClick = false;
  const clearTarget = () => {
    if (!target) return;
    target.el.classList.remove('is-target', 'is-magnet');
    target.el.style.removeProperty('--tc');
    target = null;
  };
  const findTarget = (x, y) => {
    const f = field.getBoundingClientRect();
    if (x >= f.left && x <= f.right && y >= f.top && y <= f.bottom) {
      let best = null;
      for (const cell of cells) {
        if (tileIn(cell)) continue;
        const b = cell.getBoundingClientRect();
        const step = b.width * 1.14;
        const d = Math.hypot(x - (b.left + b.width / 2), y - (b.top + b.height / 2)) / step;
        const magnet = neighbours(cell).some(tileIn);
        const score = magnet && d < 1.25 ? d - 0.5 : d < 0.72 ? d : Infinity;
        if (score < Infinity && (!best || score < best.score)) best = { el: cell, sq: cell, magnet, score };
      }
      return best;
    }
    const t = tray.getBoundingClientRect();
    if (x >= t.left && x <= t.right && y >= t.top && y <= t.bottom) {
      let best = null;
      for (const sq of squares) {
        if (tileIn(sq)) continue;
        const b = sq.getBoundingClientRect();
        const d = Math.hypot(x - (b.left + b.width / 2), y - (b.top + b.height / 2));
        if (!best || d < best.d) best = { el: sq.closest('.tray-slot'), sq, d, magnet: false };
      }
      return best;
    }
    return null;
  };
  const dragSize = overTray => {
    if (overTray) return squares[0].getBoundingClientRect().width;
    return cells[0].getBoundingClientRect().width;
  };

  const start = (e, tile) => {
    const r = tile.getBoundingClientRect();
    drag.from = tile.parentElement;
    drag.ox = (e.clientX - r.left) / r.width;
    drag.oy = (e.clientY - r.top) / r.height;
    drag.size = r.width;
    document.body.append(tile);
    if (drag.from.classList.contains('sq')) setCaption(caption(drag.from), null);
    tile.classList.add('is-dragging');
    tile.style.width = tile.style.height = r.width + 'px';
    tile.style.transform = `translate(${r.left}px, ${r.top}px)`;
    tile.focus({ preventScroll: true });
    count();
  };
  const follow = e => {
    const { tile } = drag;
    target && clearTarget();
    const t = findTarget(e.clientX, e.clientY);
    const overTray = !!t && t.el.classList.contains('tray-slot');
    const size = t ? dragSize(overTray) : drag.size;
    drag.size = size;
    tile.style.width = tile.style.height = size + 'px';
    let x = e.clientX - drag.ox * size, y = e.clientY - drag.oy * size;
    if (t) {
      target = t;
      t.el.classList.add('is-target');
      t.el.classList.toggle('is-magnet', t.magnet);
      t.el.style.setProperty('--tc', getComputedStyle(tile).getPropertyValue('--tc'));
      if (t.magnet && !still.matches) {   // the magnet pulls the tile a little toward its square
        const b = t.sq.getBoundingClientRect();
        x += (b.left - x) * 0.3;
        y += (b.top - y) * 0.3;
      }
    }
    tile.style.transform = `translate(${x}px, ${y}px)`;
  };
  const drop = () => {
    const { tile, from } = drag;
    const t = target;
    clearTarget();
    drag = null;
    if (t) {
      place(tile, t.sq, { magnet: t.magnet });
      if (t.sq.classList.contains('cell')) last = tile;
    } else place(tile, from);
    count();
  };

  // The pointer is followed on the window: moving the tile to the top of the page would end a
  // pointer capture on the tile itself.
  const onMove = e => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moving) {
      if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 5) return;
      drag.moving = true;
      start(e, drag.tile);
    }
    e.preventDefault();
    follow(e);
  };
  const onEnd = e => {
    if (!drag || e.pointerId !== drag.id) return;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onEnd);
    window.removeEventListener('pointercancel', onEnd);
    if (drag.moving) { swallowClick = true; drop(); setTimeout(() => { swallowClick = false; }, 0); }
    else drag = null;
  };
  tiles.forEach(tile => {
    tile.addEventListener('pointerdown', e => {
      if (e.button !== 0 || drag) return;
      drag = { tile, id: e.pointerId, x0: e.clientX, y0: e.clientY, moving: false };
      window.addEventListener('pointermove', onMove, { passive: false });
      window.addEventListener('pointerup', onEnd);
      window.addEventListener('pointercancel', onEnd);
    });
    tile.addEventListener('dragstart', e => e.preventDefault());
    tile.addEventListener('click', () => {
      if (swallowClick || drag) return;
      if (onField(tile)) {
        place(tile, backToPanel(tile));
        if (last === tile) last = null;
      } else {
        const cell = nextCell();
        if (!cell) return;
        const magnet = neighbours(cell).some(tileIn);
        place(tile, cell, { magnet });
        last = tile;
      }
      count();
    });
  });

  bench.querySelector('.field-clear').addEventListener('click', () => {
    tiles.filter(onField).forEach((t, i) => setTimeout(() => { place(t, backToPanel(t)); count(); }, i * 60));
    last = null;
  });

  // ---- The panel's width: a quarter of the page to start with; its left edge can be dragged. ----
  const KEY = 'akiki-workbench-panel';
  const setPanel = frac => {
    const W = bench.clientWidth;
    const px = Math.max(220, Math.min(W * 0.6, frac * W));
    bench.style.setProperty('--tray', px + 'px');
    splitter.setAttribute('aria-valuenow', Math.round(px / W * 100));
    return px / W;
  };
  let panel = 0.25;
  try { const saved = parseFloat(localStorage.getItem(KEY)); if (saved > 0.05 && saved < 0.9) panel = saved; } catch (e) { /* no storage: keep a quarter */ }
  splitter.setAttribute('aria-valuemin', '15');
  splitter.setAttribute('aria-valuemax', '60');
  const remember = () => { try { localStorage.setItem(KEY, String(panel)); } catch (e) { /* fine */ } };
  panel = setPanel(panel);
  splitter.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    splitter.setPointerCapture(e.pointerId);
    splitter.classList.add('is-dragging');
    const move = ev => { panel = setPanel((bench.getBoundingClientRect().right - ev.clientX - 6) / bench.clientWidth); };
    const up = () => {
      splitter.classList.remove('is-dragging');
      splitter.removeEventListener('pointermove', move);
      splitter.removeEventListener('pointerup', up);
      remember();
    };
    splitter.addEventListener('pointermove', move);
    splitter.addEventListener('pointerup', up);
  });
  splitter.addEventListener('keydown', e => {
    const k = { ArrowLeft: 0.02, ArrowRight: -0.02 }[e.key];
    if (k === undefined) return;
    e.preventDefault();
    panel = setPanel(panel + k);
    remember();
  });
  splitter.addEventListener('dblclick', () => { panel = setPanel(0.25); remember(); });
  window.addEventListener('resize', () => { panel = setPanel(panel); });

  const ro = new ResizeObserver(() => { fit(); sizeMeter.paint(sizeMeter.value); msMeter.paint(msMeter.value); });
  ro.observe(field);
  ro.observe(tray);
  fit();
  count();
})();
