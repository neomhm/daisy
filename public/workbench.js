/* The workbench ("Workbench" in style.css).

   Tiles move between the panel on the right and the squares of the template field, by dragging
   them or with a click (a click sends a panel tile to the field, next to the group being built,
   and a field tile back to the panel). A tile's few words show only while it sits in the panel.
   On the field, a tile dropped near another one is pulled into the square beside it, and a magnet
   bar joins every two tiles side by side. The two screens add up the size and the latency of the
   group the last moved tile belongs to, and a third the weights' size on disk; tiles with no figures
   yet are named under them. The TesT key, on the field, sends a signal through the tiles to show
   whether they make one model; the CODE key opens, above the screens, the Python that joins them,
   written live. The panel can be resized by dragging its left edge, or with the arrow keys on it. */
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
  let test = null;   // the test running, if any (see "The keys" below)
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
    if (test && cell.toFixed(1) + 'px' !== grid.style.getPropertyValue('--cell')) stopTest();
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
  const mbMeter = new Meter(tray.querySelector('[data-meter="weights"]'), mb => (
    mb > 10000
      ? { text: (mb / 1000).toFixed(2), unit: 'GB', spoken: (mb / 1000).toFixed(2) + ' gigabytes' }
      : { text: mb.toFixed(1), unit: 'MB', spoken: mb.toFixed(1) + ' megabytes' }));
  const meters = [sizeMeter, msMeter, mbMeter];
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
    let size = 0, ms = 0, mb = 0;
    const none = [], timeOnly = [], noFile = [];
    for (const t of group) {
      const p = t.dataset.params, l = t.dataset.ms, w = t.dataset.mb || '';
      if (p !== '') size += +p;
      if (l !== '') ms += +l;
      if (w !== '') mb += +w;
      if (p === '' && l === '') none.push(t.dataset.name);
      else if (p === '') timeOnly.push(t.dataset.name);
      else if (w === '') noFile.push(t.dataset.name);
    }
    sizeMeter.set(Math.round(size * 10) / 10);
    msMeter.set(ms);
    mbMeter.set(Math.round(mb * 10) / 10);
    const parts = [];
    if (none.length) parts.push(`No figures yet for ${list(none)}.`);
    if (timeOnly.length) parts.push(`${list(timeOnly)} ${timeOnly.length > 1 ? 'add' : 'adds'} time but no size.`);
    if (noFile.length) parts.push(`No size on disk measured yet for ${list(noFile)}.`);
    note.textContent = parts.join(' ');
    note.hidden = !parts.length;
    activeGroup = group;
    joints(group);
    writeCode(group, all.length - (group.length ? 1 : 0));
    refilter();
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
      if (kind !== 'all' && drag) {   // with a filter on, the tile goes back to its own place
        const sq = backToPanel(drag.tile);
        return sq ? { el: trayScroll, sq, magnet: false } : null;
      }
      let best = null;
      for (const sq of squares) {
        if (tileIn(sq) || !sq.offsetParent) continue;
        const b = sq.getBoundingClientRect();
        const d = Math.hypot(x - (b.left + b.width / 2), y - (b.top + b.height / 2));
        if (!best || d < best.d) best = { el: sq.closest('.tray-slot'), sq, d, magnet: false };
      }
      return best;
    }
    return null;
  };
  const dragSize = overTray => {
    if (overTray) { const sq = squares.find(x => x.offsetParent); return sq ? sq.getBoundingClientRect().width : 72; }
    return cells[0].getBoundingClientRect().width;
  };

  const start = (e, tile) => {
    const r = tile.getBoundingClientRect();
    drag.from = tile.parentElement;
    drag.ox = (e.clientX - r.left) / r.width;
    drag.oy = (e.clientY - r.top) / r.height;
    drag.size = r.width;
    resetTest();
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
    const overTray = !!t && t.sq.classList.contains('sq');
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
      resetTest();
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
    resetTest();
    tiles.filter(onField).forEach((t, i) => setTimeout(() => { place(t, backToPanel(t)); count(); }, i * 60));
    last = null;
  });

  // ---- The keys. TesT sends a signal into the field: a spark leaves the key for the nearest tile
  // of the largest group, then runs from tile to tile along the magnet bars, lighting each tile it
  // reaches. If it reaches every tile on the field, one line is drawn round them all: they make one
  // model. Tiles it cannot reach turn red. Download is not ready yet. ----
  const keyTest = bench.querySelector('.key-test');
  const keyDownload = bench.querySelector('.key-download');
  const said = bench.querySelector('.field-said');
  const SVG = 'http://www.w3.org/2000/svg';
  const pixels = cells => cells.map(([c, r]) => `<rect x="${c * 3}" y="${r * 3}" width="2.6" height="2.6" rx=".6"/>`).join('');
  const CHECK = pixels([[4, 1], [3, 2], [0, 3], [2, 3], [1, 4]]);
  const CROSS = pixels([[0, 0], [4, 0], [1, 1], [3, 1], [2, 2], [1, 3], [3, 3], [0, 4], [4, 4]]);
  const el = (tag, cls, parent) => { const e = document.createElement(tag); e.className = cls; parent.append(e); return e; };

  function stopTest() {
    if (!test) return;
    test.timers.forEach(clearTimeout);
    test.layer.remove();
    test.plate.remove();
    tiles.forEach(t => t.classList.remove('is-live', 'is-dead'));
    keyTest.classList.remove('is-running');
    test = null;
  }
  function resetTest() { stopTest(); keyTest.classList.remove('is-pass', 'is-fail'); }

  // The outline of a group: its squares, with the gaps between joined tiles filled in, traced into
  // closed loops going clockwise, pushed out by d pixels and rounded at the corners.
  const outline = (group, m, d, round) => {
    const at = new Set(group.map(t => posOf(t.parentElement).join()));
    const has = (c, r) => at.has(c + ',' + r);
    // a finer grid: its even columns and rows are the squares, its odd ones the gaps after them
    const full = (i, j) => {
      if (i < 0 || j < 0) return false;
      const c = i >> 1, r = j >> 1;
      if (i % 2 === 0 && j % 2 === 0) return has(c, r);
      if (j % 2 === 0) return has(c, r) && has(c + 1, r);
      if (i % 2 === 0) return has(c, r) && has(c, r + 1);
      return has(c, r) && has(c + 1, r) && has(c, r + 1) && has(c + 1, r + 1);
    };
    const px = k => (k >> 1) * m.step + (k % 2 ? m.S : 0);
    const next = new Map();   // each corner of the fine grid on the line -> the next one, clockwise
    for (let j = 0; j < 2 * ROWS; j++) for (let i = 0; i < 2 * COLS; i++) {
      if (!full(i, j)) continue;
      if (!full(i, j - 1)) next.set(`${i},${j}`, [i + 1, j]);
      if (!full(i + 1, j)) next.set(`${i + 1},${j}`, [i + 1, j + 1]);
      if (!full(i, j + 1)) next.set(`${i + 1},${j + 1}`, [i, j + 1]);
      if (!full(i - 1, j)) next.set(`${i},${j + 1}`, [i, j]);
    }
    const seen = new Set();
    let path = '';
    for (const key of next.keys()) {
      if (seen.has(key)) continue;
      const loop = [];
      for (let k = key; !seen.has(k); k = next.get(k).join()) { seen.add(k); loop.push(k.split(',').map(Number)); }
      const n = loop.length;
      const corners = [];
      loop.forEach((p, q) => {
        const a = loop[(q + n - 1) % n], b = loop[(q + 1) % n];
        const din = [Math.sign(p[0] - a[0]), Math.sign(p[1] - a[1])], dout = [Math.sign(b[0] - p[0]), Math.sign(b[1] - p[1])];
        if (din[0] === dout[0] && din[1] === dout[1]) return;   // not a corner
        // pushed out along both sides' outward normals (a side going (x, y) has its outside at (y, -x))
        corners.push([px(p[0]) + d * (din[1] + dout[1]), px(p[1]) - d * (din[0] + dout[0])]);
      });
      const toward = (p, q, r) => {
        const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
        return (p[0] + (q[0] - p[0]) * r / L).toFixed(1) + ' ' + (p[1] + (q[1] - p[1]) * r / L).toFixed(1);
      };
      corners.forEach((p, q) => {
        const a = corners[(q + corners.length - 1) % corners.length], b = corners[(q + 1) % corners.length];
        const r = Math.min(round, Math.hypot(p[0] - a[0], p[1] - a[1]) / 2, Math.hypot(b[0] - p[0], b[1] - p[1]) / 2);
        path += (q ? 'L' : 'M') + toward(p, a, r) + 'Q' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ' ' + toward(p, b, r);
      });
      path += 'Z';
    }
    return path;
  };

  const runTest = () => {
    resetTest();
    const S = parseFloat(grid.style.getPropertyValue('--cell')) || 96;
    const G = parseFloat(grid.style.getPropertyValue('--gap')) || 12;
    const m = { S, G, step: S + G };
    const slow = !still.matches;
    const layer = el('div', 'test-layer', grid);
    const plate = document.createElementNS(SVG, 'svg');
    plate.setAttribute('class', 'test-plate');
    grid.prepend(plate);
    test = { layer, plate, timers: [] };
    const run = test;
    const later = (ms, fn) => run.timers.push(setTimeout(fn, slow ? ms : 0));
    keyTest.classList.add('is-running');

    const centre = t => { const [c, r] = posOf(t.parentElement); return [c * m.step + S / 2, r * m.step + S / 2]; };
    const box = group => {
      const at = group.map(t => posOf(t.parentElement));
      const c0 = Math.min(...at.map(p => p[0])), c1 = Math.max(...at.map(p => p[0]));
      const r0 = Math.min(...at.map(p => p[1])), r1 = Math.max(...at.map(p => p[1]));
      return { x: c0 * m.step, y: r0 * m.step, w: (c1 - c0 + 1) * m.step - G, h: (r1 - r0 + 1) * m.step - G };
    };
    const g = grid.getBoundingClientRect(), k = keyTest.getBoundingClientRect();
    const from = [k.left + k.width / 2 - g.left, k.top + k.height / 2 - g.top];

    // A spark, with a short tail, along a few points.
    const fly = (pts, ms, delay) => {
      const frames = pts.map(([x, y]) => ({ transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)` }));
      [0, 1, 2, 3].forEach(i => {
        const s = el('i', i ? 'spark is-trail' : 'spark', layer);
        s.animate(frames.map(f => ({ ...f, opacity: i ? 0.6 - i * 0.14 : 1 })),
                  { duration: ms, delay: delay + i * 26, easing: 'cubic-bezier(.45, 0, .55, 1)', fill: 'both' })
          .finished.then(() => s.remove(), () => {});
      });
    };
    const arc = (a, b, bend) => {   // points along a gentle curve from a to b
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      let nx = a[1] - b[1], ny = b[0] - a[0];
      if (ny > 0) { nx = -nx; ny = -ny; }
      const c = [mx + nx * bend, my + ny * bend];
      return Array.from({ length: 15 }, (_, i) => {
        const t = i / 14, u = 1 - t;
        return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
      });
    };
    // A tile coming alive: it flashes, and a ring the shape of its square spreads out from it.
    const boot = t => {
      t.classList.add('is-live');
      glow(t.dataset.id);
      if (!slow) return;
      t.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(1.75)', transform: 'scale(1.08)', offset: 0.3 }, { filter: 'brightness(1)', transform: 'none' }],
                { duration: 480, easing: 'ease-out' });
      const [x, y] = centre(t);
      const ring = el('i', 'ring', layer);
      Object.assign(ring.style, { left: x - S / 2 + 'px', top: y - S / 2 + 'px', width: S + 'px', height: S + 'px' });
      ring.animate([{ transform: 'scale(.75)', opacity: 1 }, { transform: 'scale(1.5)', opacity: 0 }],
                   { duration: 700, easing: 'cubic-bezier(.2, .8, .2, 1)', fill: 'forwards' });
    };
    // The signal filling the magnet bar between two tiles, from a to b.
    const current = (a, b, ms, delay) => {
      const [c1, r1] = posOf(a.parentElement), [c2, r2] = posOf(b.parentElement);
      const across = r1 === r2, c = Math.min(c1, c2), r = Math.min(r1, r2);
      const thick = Math.max(3, S * 0.13), tuck = Math.min(10, S * 0.12);
      const j = el('i', 'current', layer);
      if (across) Object.assign(j.style, { left: c * m.step + S - tuck + 'px', top: r * m.step + (S - thick) / 2 + 'px', width: G + 2 * tuck + 'px', height: thick + 'px' });
      else Object.assign(j.style, { left: c * m.step + (S - thick) / 2 + 'px', top: r * m.step + S - tuck + 'px', width: thick + 'px', height: G + 2 * tuck + 'px' });
      const ahead = across ? c2 > c1 : r2 > r1;
      j.style.setProperty('--dir', across ? (ahead ? 'to right' : 'to left') : (ahead ? 'to bottom' : 'to top'));
      j.style.transformOrigin = across ? (ahead ? 'left' : 'right') : (ahead ? 'top' : 'bottom');
      if (slow) j.animate([{ transform: across ? 'scaleX(0)' : 'scaleY(0)' }, { transform: 'none' }], { duration: ms, delay, easing: 'ease-in', fill: 'both' });
    };
    const line = (group, cls, ms) => {
      const svg = document.createElementNS(SVG, 'svg');
      layer.prepend(svg);
      const p = document.createElementNS(SVG, 'path');
      p.setAttribute('class', cls);
      p.setAttribute('d', outline(group, m, Math.min(7, G * 0.55), Math.min(14, S * 0.16)));
      svg.append(p);
      if (slow && ms) {
        const len = p.getTotalLength();
        p.style.strokeDasharray = len;
        p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: ms, easing: 'cubic-bezier(.6, 0, .4, 1)', fill: 'both' });
        const head = el('i', 'spark', layer);   // a spark runs ahead of the line as it is drawn
        head.animate(Array.from({ length: 41 }, (_, i) => {
          const pt = p.getPointAtLength(len * i / 40);
          return { transform: `translate(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px)` };
        }), { duration: ms, easing: 'cubic-bezier(.6, 0, .4, 1)', fill: 'both' }).finished.then(() => head.remove(), () => {});
      } else if (slow) p.animate([{ opacity: 0 }, { opacity: 1 }], 400);
      return p;
    };
    const verdict = (b, fail, big, small) => {
      const below = b.y < 70;
      const v = el('div', 'verdict' + (fail ? ' is-fail' : '') + (below ? ' is-below' : ''), layer);
      v.innerHTML = `<svg viewBox="0 0 15 15" aria-hidden="true">${fail ? CROSS : CHECK}</svg><div><b></b><span></span></div>`;
      v.querySelector('b').textContent = big;
      v.querySelector('span').textContent = small;
      Object.assign(v.style, { left: b.x + b.w / 2 + 'px', top: (below ? b.y + b.h + 16 : b.y - 16) + 'px' });
      if (slow) v.animate([{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1.07)', opacity: 1, offset: 0.6 }, { transform: 'none', opacity: 1 }], { duration: 440, easing: 'ease-out' });
    };
    const flash = () => meters.forEach(mt => {
      mt.screen.classList.remove('is-changing');
      void mt.screen.offsetWidth;
      mt.screen.classList.add('is-changing');
    });
    const finish = hold => run.timers.push(setTimeout(() => {   // the verdict stays a while, then all fades
      tiles.forEach(t => t.classList.remove('is-live', 'is-dead'));
      keyTest.classList.remove('is-running');
      if (!slow) { stopTest(); return; }
      plate.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: 'forwards' });
      layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: 'forwards' })
        .finished.then(() => { if (test === run) stopTest(); }, () => {});
    }, slow ? hold : 3000));

    const pieces = groups().sort((a, b) => b.length - a.length);
    if (!pieces.length) {   // nothing to test
      const W = COLS * m.step - G, H = ROWS * m.step - G;
      later(380, () => {
        keyTest.classList.replace('is-running', 'is-fail');
        verdict({ x: 0, y: H / 2 + 30, w: W, h: 0 }, true, 'no tiles', 'put some on the field first');
        said.textContent = 'Test: there are no tiles on the field yet.';
      });
      finish(2600);
      return;
    }
    const main = pieces[0], loose = pieces.slice(1);
    const dist = t => { const [x, y] = centre(t); return Math.hypot(x - from[0], y - from[1]); };
    const first = main.reduce((a, b) => (dist(b) < dist(a) ? b : a));
    // From the first tile, outward: when each tile is reached, and from which tile.
    const level = new Map([[first, 0]]), via = new Map(), queue = [first];
    while (queue.length) {
      const t = queue.shift();
      for (const n of neighbours(t.parentElement)) {
        const u = tileIn(n);
        if (u && !level.has(u)) { level.set(u, level.get(t) + 1); via.set(u, t); queue.push(u); }
      }
    }
    const depth = Math.max(...level.values());
    const FLY = 560, HOP = Math.max(110, Math.min(260, 1500 / Math.max(1, depth)));
    if (slow) fly(arc(from, centre(first), 0.22), FLY, 0);
    later(FLY, () => boot(first));
    for (const [u, lv] of level) {
      if (u === first) continue;
      const a = via.get(u), start = FLY + (lv - 1) * HOP + 40;
      later(start, () => {
        current(a, u, HOP - 40, 0);
        if (slow) fly([centre(a), centre(u)], HOP - 40, 0);
      });
      later(FLY + lv * HOP, () => boot(u));
    }
    const lit = FLY + depth * HOP + 140;
    const n = main.length, DRAW = 700;

    if (!loose.length) {   // one model: drawn round, the bars between them all lit, a pulse
      later(lit, () => {
        line(main, 'test-line', DRAW);
        const fill = document.createElementNS(SVG, 'path');
        fill.setAttribute('d', outline(main, m, Math.min(7, G * 0.55), Math.min(14, S * 0.16)));
        plate.append(fill);
        if (slow) plate.animate([{ opacity: 0 }, { opacity: 1 }], { duration: DRAW, fill: 'both' });
        for (const t of main) for (const nb of neighbours(t.parentElement)) {
          const u = tileIn(nb);
          if (u && via.get(u) !== t && via.get(t) !== u && centre(t)[0] + centre(t)[1] < centre(u)[0] + centre(u)[1]) current(t, u, 300, 0);
        }
      });
      later(lit + DRAW, () => {
        keyTest.classList.replace('is-running', 'is-pass');
        flash();
        const b = box(main);
        if (slow) {
          main.forEach(t => t.animate([{ transform: 'none' }, { transform: 'scale(1.06)', filter: 'brightness(1.5)', offset: 0.35 }, { transform: 'none' }], { duration: 560, easing: 'ease-out' }));
          const wave = el('i', 'ring', layer);
          Object.assign(wave.style, { left: b.x - 8 + 'px', top: b.y - 8 + 'px', width: b.w + 16 + 'px', height: b.h + 16 + 'px', borderRadius: '18px' });
          wave.animate([{ transform: 'scale(1)', opacity: 0.9 }, { transform: 'scale(1.25)', opacity: 0 }], { duration: 950, easing: 'cubic-bezier(.2, .8, .2, 1)', fill: 'forwards' });
        }
        verdict(b, false, '1 model', n === 1 ? '1 tile' : `${n} tiles joined`);
        said.textContent = n === 1 ? 'Test: the one tile on the field is one model.' : `Test: the ${n} tiles on the field are joined into one model.`;
      });
      finish(lit + DRAW + 2800);
    } else {   // more than one piece: the signal reaches for each loose piece and fizzles at the gap
      const mainAt = main.map(centre);
      loose.slice(0, 4).forEach((piece, i) => {
        let best = null;
        for (const t of piece) {
          const q = centre(t);
          mainAt.forEach(p => { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (!best || d < best.d) best = { d, p, q }; });
        }
        const stop = [best.p[0] + (best.q[0] - best.p[0]) * 0.5, best.p[1] + (best.q[1] - best.p[1]) * 0.5];
        later(lit + i * 90, () => { if (slow) fly([best.p, stop], 360, 0); });
        later(lit + i * 90 + 360, () => {
          const x = document.createElementNS(SVG, 'svg');
          x.setAttribute('class', 'test-x');
          x.setAttribute('viewBox', '0 0 15 15');
          x.innerHTML = CROSS;
          Object.assign(x.style, { left: stop[0] + 'px', top: stop[1] + 'px', position: 'absolute' });
          layer.append(x);
          if (slow) x.animate([{ transform: 'scale(2.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 300, easing: 'ease-out' });
        });
      });
      later(lit + 460, () => {
        keyTest.classList.replace('is-running', 'is-fail');
        line(main, 'test-line', 420);
        loose.forEach(piece => {
          piece.forEach(t => {
            t.classList.add('is-dead');
            if (slow) t.animate([0, -5, 5, -4, 4, -2, 0].map(dx => ({ transform: `translateX(${dx}px)` })), { duration: 460, easing: 'ease-out' });
          });
          line(piece, 'test-line is-loose', 0);
        });
        const all = pieces.flat();
        verdict(box(all), true, `${pieces.length} pieces`, 'not joined as 1 model');
        said.textContent = `Test: the tiles on the field are in ${pieces.length} pieces, not joined into one model.`;
      });
      finish(lit + 460 + 2800);
    }
  };
  keyTest.addEventListener('click', runTest);

  let soon = 0;
  keyDownload.addEventListener('click', () => {   // not ready yet: the key says "soon" for a moment
    keyDownload.classList.add('is-soon');
    said.textContent = 'Download is not ready yet.';
    clearTimeout(soon);
    soon = setTimeout(() => keyDownload.classList.remove('is-soon'), 1400);
  });

  // ---- The code. CODE opens an editor above the screens with the Python that joins the team the
  // screens count: each model loaded from its own folder, then, outward from the model that comes
  // earliest in the work, each one called with what the models joined to it hand on. It is
  // rewritten as tiles move: new lines are typed in, lines that go fold away. ----
  const keyCode = bench.querySelector('.key-code');
  const codeWrap = bench.querySelector('.code-wrap');
  const view = codeWrap.querySelector('.code-view');
  const codeBox = view.querySelector('code');
  const codeStatus = codeWrap.querySelector('.code-status');
  const codePos = codeWrap.querySelector('.code-pos');
  const codeCount = codeWrap.querySelector('.code-count');
  // For each model: what it is given when a team starts with it, what it hands on, and how early
  // in the work it comes.
  const ROLES = {
    bouquet: ['brief', 'plan', 0], cricket: ['request', 'questions', 0], cicada: ['project', 'memory', 0],
    butterfly: ['request', 'steps', 1], orchid: ['files', 'facts', 1], lily: ['files', 'logo', 1],
    tulip: ['sheets', 'tables', 1], magnolia: ['database', 'meaning', 1], dragonfly: ['query', 'found', 2],
    daisy: ['question', 'answer', 2], jasmine: ['signals', 'design', 2], bees: ['step', 'code', 2],
    ants: ['step', 'parts', 2], mantis: ['work', 'audit', 3], ladybug: ['work', 'bugs', 3],
    thistle: ['site', 'findings', 3], iris: ['site', 'report', 3], firefly: ['problem', 'advice', 4],
    siren: ['message', 'reply', 0],
  };
  const role = t => ROLES[t.dataset.id] || ['data', t.dataset.id + '_out', 2];
  const colour = id => { const t = tiles.find(x => x.dataset.id === id); return t ? t.style.getPropertyValue('--tc') : ''; };

  // The lines of team.py, each a list of [kind, text] (a model's name also carries its colour).
  const teamPy = (group, loose) => {
    const out = [];
    const add = (model, ...tokens) => out.push({ model, tokens, key: (model || '') + '|' + tokens.map(t => t[1]).join('') });
    const mdl = id => ['mdl', id, colour(id)];
    add(null, ['com', '# Joined live on the workbench.']);
    if (!group.length) {
      add(null, ['com', '# Put tiles on the field to join them.']);
      return out;
    }
    add(null, ['kw', 'from'], ['op', ' '], ['pkg', 'akiki'], ['op', ' '], ['kw', 'import'], ['op', ' '], ['fn', 'load']);
    add(null);
    const at = t => posOf(t.parentElement);
    const reading = (a, b) => at(a)[1] - at(b)[1] || at(a)[0] - at(b)[0];
    const first = group.slice().sort((a, b) => role(a)[2] - role(b)[2] || reading(a, b))[0];
    const level = new Map([[first, 0]]), queue = [first];
    while (queue.length) {
      const t = queue.shift();
      for (const n of neighbours(t.parentElement)) {
        const u = tileIn(n);
        if (u && group.includes(u) && !level.has(u)) { level.set(u, level.get(t) + 1); queue.push(u); }
      }
    }
    const order = group.slice().sort((a, b) => level.get(a) - level.get(b) || reading(a, b));
    const joined = t => neighbours(t.parentElement).map(tileIn).filter(u => u && group.includes(u));
    for (const t of order) {   // squares side by side are always a step apart outward, never level
      const id = t.dataset.id;
      const note = t.dataset.params === '' && t.dataset.note ? t.dataset.note.split(/[,;]/)[0] : '';
      add(id, mdl(id), ['op', ' = '], ['fn', 'load'], ['op', '('], ['str', `"${id}"`], ['op', ')'], ...(note ? [['com', `  # ${note}`]] : []));
    }
    add(null);
    add(null, ['kw', 'def'], ['op', ' '], ['fn', 'team'], ['op', '('], ['prm', role(first)[0]], ['op', '):']);
    const ends = order.filter(t => !joined(t).some(u => level.get(u) > level.get(t)));
    const list = items => items.flatMap((x, i) => (i ? [['op', ', '], x] : [x]));
    for (const t of order) {
      const given = level.get(t) === 0
        ? [['prm', role(first)[0]]]
        : joined(t).filter(u => level.get(u) < level.get(t)).sort(reading).map(u => ['var', role(u)[1]]);
      const call = [mdl(t.dataset.id), ['op', '('], ...list(given), ['op', ')']];
      if (ends.length === 1 && ends[0] === t) add(t.dataset.id, ['op', '    '], ['kw', 'return'], ['op', ' '], ...call);
      else add(t.dataset.id, ['op', '    '], ['var', role(t)[1]], ['op', ' = '], ...call);
    }
    if (ends.length > 1) add(null, ['op', '    '], ['kw', 'return'], ['op', ' '], ...list(ends.map(t => ['var', role(t)[1]])));
    if (loose) {
      add(null);
      add(null, ['com', `# ${loose} more ${loose > 1 ? 'pieces' : 'piece'} on the field, not joined`]);
    }
    return out;
  };

  // Which lines stay: the longest run the old and new code share, in order.
  const common = (a, b) => {
    const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
    const keep = new Map();   // new index -> old index
    for (let i = 0, j = 0; i < a.length && j < b.length;) {
      if (a[i] === b[j]) keep.set(j++, i++);
      else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
      else j++;
    }
    return keep;
  };

  let shown = [];     // the lines on screen: { key, el }
  let typing = [];    // lines still being typed: { el, spans, i, j, rest }
  let raf = 0;
  let codeAt = [[], 0];   // the team and the loose pieces last written
  const caret = document.createElement('i');
  caret.className = 'caret';
  const lineEl = l => {
    const el = document.createElement('span');
    el.className = 'ln';
    if (l.model) {
      el.dataset.model = l.model;
      el.style.setProperty('--tc', colour(l.model));
    }
    const spans = l.tokens.map(([kind, text, tc]) => {
      const s = document.createElement('span');
      s.className = 'c-' + kind;
      if (tc) s.style.setProperty('--tc', tc);
      s.dataset.text = text;
      el.append(s);
      return s;
    });
    return { el, spans };
  };
  const current = el => {   // the line with the caret, as in an editor
    codeBox.querySelectorAll('.ln.is-cur').forEach(x => x.classList.remove('is-cur'));
    if (!el) return;
    el.classList.add('is-cur');
    el.append(caret);
    const n = [...codeBox.querySelectorAll('.ln:not(.is-gone)')].indexOf(el) + 1;
    codePos.textContent = `Ln ${n}, Col ${el.textContent.length + 1}`;
    const top = el.offsetTop, h = el.offsetHeight;
    if (top < view.scrollTop + 6) view.scrollTop = top - 6;
    else if (top + h > view.scrollTop + view.clientHeight - 12) view.scrollTop = top + h - view.clientHeight + 12;
  };
  const type = () => {
    if (raf) return;
    codeStatus.classList.add('is-writing');
    const frame = () => {
      // a few letters a frame, more when much is waiting: a whole file takes about a second
      let budget = Math.max(2, Math.ceil(typing.reduce((n, q) => n + q.rest, 0) / 40));
      while (budget > 0 && typing.length) {
        const q = typing[0];
        if (!q.begun) { q.begun = true; current(q.el); }
        const span = q.spans[q.i];
        if (!span) { typing.shift(); continue; }
        const text = span.dataset.text, take = Math.min(budget, text.length - q.j);
        span.textContent += text.slice(q.j, q.j + take);
        q.j += take;
        q.rest -= take;
        budget -= take;
        if (q.j >= text.length) { q.i += 1; q.j = 0; }
      }
      const last = codeBox.querySelector('.ln.is-cur');
      if (last) codePos.textContent = codePos.textContent.replace(/Col \d+/, `Col ${last.textContent.length + 1}`);
      if (typing.length) { raf = requestAnimationFrame(frame); return; }
      raf = 0;
      codeStatus.classList.remove('is-writing');
    };
    raf = requestAnimationFrame(frame);
  };

  const writeCode = (group, loose, fresh = false) => {
    codeAt = [group, loose];
    const live = codeWrap.classList.contains('is-open') && !still.matches;
    if (fresh) {   // start the file again (when the editor opens)
      shown.forEach(s => s.el.remove());
      shown = [];
      typing = [];
    }
    const next = teamPy(group, loose);
    const keep = common(shown.map(s => s.key), next.map(l => l.key));
    const kept = new Set(keep.values());
    shown.forEach((s, i) => {   // the lines that go fold away
      if (kept.has(i)) return;
      typing = typing.filter(q => q.el !== s.el);
      s.el.classList.add('is-gone');
      if (!live) { s.el.remove(); return; }
      s.el.animate([{ height: '18px', minHeight: '18px', opacity: 1 }, { height: '0px', minHeight: '0px', opacity: 0 }],
                   { duration: 240, easing: 'ease-in' }).finished.then(() => s.el.remove(), () => s.el.remove());
    });
    const result = [];
    let after = null;
    next.forEach((l, j) => {
      if (keep.has(j)) {
        const s = shown[keep.get(j)];
        result.push(s);
        after = s.el;
        return;
      }
      const { el, spans } = lineEl(l);
      if (after) after.after(el); else codeBox.prepend(el);
      after = el;
      result.push({ key: l.key, el });
      if (live) typing.push({ el, spans, i: 0, j: 0, rest: l.tokens.reduce((n, t) => n + t[1].length, 0) });
      else spans.forEach(s => { s.textContent = s.dataset.text; });
    });
    shown = result;
    const n = group.length;
    codeCount.textContent = n ? `${n} model${n > 1 ? 's' : ''}` : 'no models';
    if (typing.length) type();
    else if (!raf) current(shown.length ? shown[shown.length - 1].el : null);
  };

  // A model's lines light up: while its tile is pointed at, and as a test's signal reaches it.
  const glow = (id, on) => codeBox.querySelectorAll(`.ln[data-model="${id}"]`).forEach(el => {
    el.classList.toggle('is-hot', on !== false);
    if (on === undefined) setTimeout(() => el.classList.remove('is-hot'), 650);
  });
  tiles.forEach(t => {
    const hot = on => () => { if (onField(t)) glow(t.dataset.id, on); };
    t.addEventListener('pointerenter', hot(true));
    t.addEventListener('pointerleave', hot(false));
    t.addEventListener('focus', hot(true));
    t.addEventListener('blur', hot(false));
  });

  const openCode = open => {
    keyCode.setAttribute('aria-expanded', String(open));
    codeWrap.classList.toggle('is-open', open);
    codeWrap.inert = !open;
    if (open) writeCode(codeAt[0], codeAt[1], true);   // typed out afresh each time it opens
  };
  keyCode.addEventListener('click', () => openCode(keyCode.getAttribute('aria-expanded') !== 'true'));
  codeWrap.querySelector('.code-close').addEventListener('click', () => { openCode(false); keyCode.focus(); });
  codeWrap.addEventListener('keydown', e => { if (e.key === 'Escape') { openCode(false); keyCode.focus(); } });

  // ---- The filters, between the screens and the tiles: one chip per kind of tile, made from the
  // tiles' own tags (data-tags), and Ready for the tiles that have measured figures. Only kinds
  // some tile has are offered, each with how many tiles it holds. The tiles that do not fit the
  // chosen kind leave the panel, and the rest close up. ----
  const KINDS = [['all', 'All'], ['ready', 'Ready'], ['brains', 'Brains'], ['voice', 'Voice'], ['database', 'Database'],
    ['documents', 'Documents'], ['website', 'Website'], ['code', 'Code'], ['checks', 'Checks']];
  const filterBar = tray.querySelector('.filters');
  const filterNone = tray.querySelector('.filter-none');
  const trayScroll = tray.querySelector('.tray-scroll');
  const slots = [...tray.querySelectorAll('.tray-slot')];
  const tagsOf = t => (t.dataset.tags || '').split(' ').filter(Boolean);
  const fits = (t, k) => k === 'all' || (k === 'ready' ? t.dataset.params !== '' || t.dataset.ms !== '' : tagsOf(t).includes(k));
  let kind = 'all';
  const found = [...new Set(tiles.flatMap(tagsOf))].filter(k => !KINDS.some(([x]) => x === k));
  for (const [k, name] of [...KINDS, ...found.map(k => [k, k[0].toUpperCase() + k.slice(1)])]) {
    const n = tiles.filter(t => fits(t, k)).length;
    if (!n) continue;
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.dataset.kind = k;
    chip.setAttribute('aria-pressed', String(k === kind));
    chip.append(name + ' ');
    const count = document.createElement('b');
    count.textContent = n;
    chip.append(count);
    filterBar.append(chip);
  }
  filterBar.hidden = false;

  function refilter(animate = true) {
    const motion = animate && !still.matches;
    const before = motion ? new Map(slots.filter(s => !s.hidden).map(s => [s, s.getBoundingClientRect()])) : null;
    for (const slot of slots) {
      const t = tileIn(slot.querySelector('.sq'));
      slot.hidden = kind !== 'all' && !(t && fits(t, kind));
    }
    for (const g of tray.querySelectorAll('.tray-grid')) {   // a heading goes with its tiles
      g.hidden = g.previousElementSibling.hidden = ![...g.children].some(s => !s.hidden);
    }
    filterNone.hidden = slots.some(s => !s.hidden);
    if (!motion) return;
    for (const slot of slots) {
      if (slot.hidden) continue;
      const a = before.get(slot), b = slot.getBoundingClientRect();
      if (!a) slot.animate([{ opacity: 0, transform: 'scale(.8)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.2, .8, .2, 1)' });
      else if (a.left !== b.left || a.top !== b.top) {
        slot.animate([{ transform: `translate(${a.left - b.left}px, ${a.top - b.top}px)` }, { transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.2, .8, .2, 1)' });
      }
    }
  }
  filterBar.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip || chip.dataset.kind === kind) return;
    kind = chip.dataset.kind;
    filterBar.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
    trayScroll.scrollTop = 0;
    refilter();
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

  const ro = new ResizeObserver(() => { fit(); meters.forEach(mt => mt.paint(mt.value)); });
  ro.observe(field);
  ro.observe(tray);
  fit();
  count();
})();
