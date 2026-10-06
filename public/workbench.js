/* The workbench ("Workbench" in style.css).

   Tiles move between the panel on the right and the squares of the template field, by dragging
   them or with a click (a click sends a panel tile to the field, next to the group being built,
   and a field tile back to the panel). A tile's few words show only while it sits in the panel.
   On the field, a tile dropped near another one is pulled into the square beside it, and a magnet
   bar joins every two tiles side by side. The two screens add up the size and the latency of the
   group the last moved tile belongs to, and a third the weights' size on disk; tiles with no figures
   yet are named under them. The CODE key opens, above the screens, the Python that joins them,
   written live. The panel can be resized by dragging its left edge, or with the arrow keys on it.

   Every tile comes from tiles.js, the one file that says what each tile is: its ROLE (a start takes
   the data in, a middle works on it, an end gives the result; Siren is a start and an end; an
   attachment such as a brain, a database or a documents folder snaps ONTO a tile that needs it),
   the kinds of data it accepts and hands on, and what it needs. A small square on each tile says its role. Tiles
   side by side pass their work left to right; tiles stacked in a column are alternatives; a tile
   touching Siren is a specialist she calls, whose answer comes back to her. The TesT key checks, in
   this order: a start and an end; every chain going from a start to an end, in one piece; every
   two touching tiles fitting; every tile having what it needs. When a check fails, the tile at
   fault is marked, the reason is said in one sentence, and the panel shows only the tiles that
   would fit in its place. */
(() => {
  const bench = document.querySelector('.bench');
  const DATA = window.AKIKI_TILES;
  if (!bench || !DATA) return;
  const SIZES = [7, 8, 9, 10], GRID_KEY = 'akiki-workbench-grid';
  let COLS = 7, ROWS = 7;   // the grid size control ("The grid's size" below) changes both
  const field = bench.querySelector('.field');
  const grid = bench.querySelector('.field-grid');
  const tray = bench.querySelector('.tray');
  const splitter = bench.querySelector('.splitter');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  const phone = window.matchMedia('(max-width: 700px)');
  const DEF = new Map(DATA.tiles.map(d => [d.id, d]));
  const defOf = t => DEF.get(t.dataset.id);
  const isAtt = t => t.dataset.role === 'attachment';
  const isLensT = t => t.dataset.role === 'lens';
  const orList = words => (words.length < 3 ? words.join(' or ') : words.slice(0, -1).join(', ') + ' or ' + words[words.length - 1]);

  // ---- The panel's tiles, built from tiles.js. Each is its own icon, in its own colour; a small
  // square at its right says its role (style.css, "Roles"). ----
  const NS = 'http://www.w3.org/2000/svg';
  const sprite = (document.querySelector('svg > symbol') || {}).parentNode || document.body.appendChild(document.createElementNS(NS, 'svg'));
  const drawing = d => {   // the page's own icon; for a tile with none, one drawn from its glyph
    const id = `px-${d.id}`;
    if (document.getElementById(id)) return id;
    const sym = document.createElementNS(NS, 'symbol');
    sym.id = id;
    sym.setAttribute('viewBox', '0 0 40 40');
    const tile = document.createElementNS(NS, 'rect');
    tile.setAttribute('width', '40');
    tile.setAttribute('height', '40');
    tile.setAttribute('fill', d.colour);
    sym.append(tile);
    if (d.glyph) {   // the same pixels as tools/make_pixel_icons.py: pitch 6, 5.04 wide, 5 units of margin
      for (const [mark, fill] of [['X', '#ffffff'], ['H', '#f2b632']]) {
        const g = document.createElementNS(NS, 'g');
        g.setAttribute('fill', fill);
        d.glyph.forEach((row, r) => [...row].forEach((ch, c) => {
          if (ch !== mark) return;
          const px = document.createElementNS(NS, 'rect');
          [['x', 5.48 + c * 6], ['y', 5.48 + r * 6], ['width', 5.04], ['height', 5.04], ['rx', 1.14]].forEach(([k, v]) => px.setAttribute(k, v.toFixed(2)));
          g.append(px);
        }));
        sym.append(g);
      }
    }
    sprite.append(sym);
    return id;
  };
  const roleSay = d => DATA.roles[d.role].say;
  const DNAME = id => (DEF.get(id) || { name: id }).name;
  // A tile's profile, in its tooltip and in what it says: what it needs, and the lenses it works best with.
  const profile = d => {
    const parts = [];
    const needs = [...(d.needs || []).map(n => DATA.needs[n]), ...((d.lenses || {}).needs || []).map(x => `${DNAME(x.lens)}${x.why ? ' ' + x.why : ''}`)];
    if (needs.length) parts.push('needs: ' + needs.join(', '));
    if ((d.lenses || {}).best) parts.push('works best with: ' + d.lenses.best.map(DNAME).join(', '));
    if (d.serves) parts.push('a lens for ' + d.serves.map(DNAME).join(', '));
    return parts.join('; ');
  };
  const sectionOf = d => (d.role === 'start' || d.role === 'both' ? 'starters' : d.role === 'middle' ? 'functions' : d.role === 'end' ? 'finishers'
    : d.role === 'lens' || d.gives === 'memory' ? 'lenses' : d.gives === 'brain' ? 'brains' : 'data');
  const fillCap = (cap, d) => {
    cap.innerHTML = '<b></b><span></span>';
    cap.firstChild.textContent = d.name.toLowerCase();
    cap.lastChild.textContent = d.words;
    const plan = (DATA.plans || {})[d.group];
    if (plan) { const tag = document.createElement('em'); tag.className = 'plan-tag'; tag.textContent = plan; cap.append(tag); }
  };
  const makeTile = d => {
    const b = document.createElement('button');
    b.className = 'wtile';
    b.type = 'button';
    Object.assign(b.dataset, { id: d.id, name: d.name, words: d.words, role: d.role, status: d.status,
      params: d.params, ms: d.ms, mb: d.mb, tags: d.tags || '', note: d.note || '' });
    b.style.setProperty('--tc', d.colour);
    const prof = profile(d);
    b.setAttribute('aria-label', `${d.name}: ${d.words[0].toLowerCase() + d.words.slice(1)}. ${roleSay(d)[0].toUpperCase() + roleSay(d).slice(1)}. ${d.note}.${prof ? ' ' + prof[0].toUpperCase() + prof.slice(1) + '.' : ''}`);
    b.title = `${d.name}: ${d.words}${prof ? '\n' + prof[0].toUpperCase() + prof.slice(1) : ''}\n${d.note}`;
    b.innerHTML = `<svg viewBox="0 0 40 40" aria-hidden="true"><use href="#${drawing(d)}"/></svg>`;
    return b;
  };
  {
    const scroll = tray.querySelector('.tray-scroll');
    const level = scroll.dataset.head || '2';
    scroll.querySelectorAll('.tray-head, .tray-grid').forEach(x => x.remove());
    for (const g of DATA.sections) {
      const mine = DATA.tiles.filter(d => sectionOf(d) === g.id);
      if (!mine.length) continue;
      const head = document.createElement('h' + level);
      head.className = 'tray-head';
      head.textContent = g.head;
      const box = document.createElement('div');
      box.className = 'tray-grid';
      for (const d of mine) {
        const slot = document.createElement('div');
        slot.className = 'tray-slot';
        slot.dataset.home = d.id;
        const sq = document.createElement('div');
        sq.className = 'sq';
        sq.append(makeTile(d));
        const cap = document.createElement('p');
        cap.className = 'cap';
        fillCap(cap, d);
        slot.append(sq, cap);
        box.append(slot);
      }
      scroll.append(head, box);
    }
    // The colours' key, on the field.
    const legend = document.createElement('div');
    legend.className = 'field-legend';
    legend.setAttribute('aria-hidden', 'true');
    for (const [role, r] of Object.entries(DATA.roles)) {
      const item = document.createElement('span');
      item.dataset.role = role;
      item.innerHTML = '<i></i>';
      item.append(r.label);
      legend.append(item);
    }
    field.append(legend);
  }
  const tiles = [...tray.querySelectorAll('.wtile')];
  let test = null;   // the test running, if any (see "The keys" below)
  const home = new Map(tiles.map(t => [t, t.parentElement]));
  const squares = [...tray.querySelectorAll('.tray-slot .sq')];

  // The field's squares, COLS x ROWS of them; rebuilt when the grid's size changes.
  const cells = [];
  const buildCells = () => {
    cells.length = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.c = c;
      cell.dataset.r = r;
      grid.append(cell);
      cells.push(cell);
    }
    grid.style.setProperty('--cols', COLS);
  };
  try { const saved = +localStorage.getItem(GRID_KEY); if (SIZES.includes(saved)) COLS = ROWS = saved; } catch (e) { /* no storage: 7 x 7 */ }
  buildCells();
  const cellAt = (c, r) => (c >= 0 && r >= 0 && c < COLS && r < ROWS ? cells[r * COLS + c] : null);
  const posOf = cell => [+cell.dataset.c, +cell.dataset.r];
  const tileIn = sq => sq && sq.querySelector(':scope > .wtile');   // not the attachments docked on it
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

  // A magnet bar joins every two tiles side by side. When the two also FIT (what one hands on, the
  // other accepts; see the rules below), the bar becomes a key: each tile's facing side is notched
  // and the key settles into both notches, a short animation (none with reduced motion). A pair
  // that does not fit keeps the plain bar, and TesT says why. Nothing is cut into a tile's sides
  // before it touches another.
  let jointKeys = new Set(), activeGroup = [];
  const NOTCH = 8, KEYLEN = 0.3;   // the notch: 8% of the tile deep, 30% of its side long
  const pairFits = (a, b, across) => {
    const x = defOf(a), y = defOf(b);
    if (x.hub || y.hub) {   // Siren and a specialist she calls
      const [h, o] = x.hub ? [x, y] : [y, x];
      return (o.role === 'start' || fitsKinds(h.out, o.in)) && (o.role === 'end' || fitsKinds(o.out, h.in));
    }
    if (across) return x.role !== 'end' && y.role !== 'start' && fitsKinds(x.out, y.in);
    return x.role === y.role && (x.role === 'start' || x.in.some(k => y.in.includes(k)));   // alternatives take the same work
  };
  const joints = (active = activeGroup) => {
    grid.querySelectorAll('.joint').forEach(j => j.remove());
    const S = parseFloat(grid.style.getPropertyValue('--cell')) || 96;
    const G = parseFloat(grid.style.getPropertyValue('--gap')) || 12;
    const sides = new Map(tiles.map(t => [t, { l: 0, r: 0, t: 0, b: 0 }]));
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
        const lens = isLensT(a) ? [a, b] : isLensT(b) ? [b, a] : null;
        if (lens && (defOf(lens[0]).serves || []).includes(lens[1].dataset.id)) {   // a lens on its model: a lens-shaped link
          j.classList.add('is-lens');
          const L = S * 0.42, T = G + S * 0.1;
          if (dc) Object.assign(j.style, { left: (c * (S + G) + S + G / 2 - T / 2) + 'px', top: (r * (S + G) + (S - L) / 2) + 'px', width: T + 'px', height: L + 'px' });
          else Object.assign(j.style, { left: (c * (S + G) + (S - L) / 2) + 'px', top: (r * (S + G) + S + G / 2 - T / 2) + 'px', width: L + 'px', height: T + 'px' });
        } else if (!lens && pairFits(a, b, !!dc)) {   // a key in two notches
          j.classList.add('is-keyed');
          if (dc) { sides.get(a).r = NOTCH; sides.get(b).l = NOTCH; } else { sides.get(a).b = NOTCH; sides.get(b).t = NOTCH; }
          const D = S * NOTCH / 100, L = S * KEYLEN, e = Math.max(1.5, S * 0.025);
          if (dc) Object.assign(j.style, { left: (c * (S + G) + S - D + e) + 'px', top: (r * (S + G) + (S - L) / 2 + e) + 'px', width: (G + 2 * D - 2 * e) + 'px', height: (L - 2 * e) + 'px' });
          else Object.assign(j.style, { left: (c * (S + G) + (S - L) / 2 + e) + 'px', top: (r * (S + G) + S - D + e) + 'px', width: (L - 2 * e) + 'px', height: (G + 2 * D - 2 * e) + 'px' });
        } else {
          const tuck = Math.min(10, S * 0.12), thick = S * 0.34;
          if (dc) Object.assign(j.style, { left: (c * (S + G) + S - tuck) + 'px', top: (r * (S + G) + (S - thick) / 2) + 'px', width: (G + 2 * tuck) + 'px', height: thick + 'px' });
          else Object.assign(j.style, { left: (c * (S + G) + (S - thick) / 2) + 'px', top: (r * (S + G) + S - tuck) + 'px', width: thick + 'px', height: (G + 2 * tuck) + 'px' });
        }
        j.style.setProperty('--a', getComputedStyle(a).getPropertyValue('--tc'));
        j.style.setProperty('--b', getComputedStyle(b).getPropertyValue('--tc'));
        j.style.setProperty('--dir', dc ? 'to right' : 'to bottom');
        if (active.includes(a) && active.includes(b)) j.classList.add('is-active');
        if (!jointKeys.has(key)) j.classList.add('is-new');
        grid.append(j);
      }
    }
    for (const [t, n] of sides) {   // the notches, cut into the tile's picture (style.css: --nl, --nr, --nt, --nb)
      const svg = t.querySelector('svg');
      for (const k of 'lrtb') svg.style.setProperty('--n' + k, n[k] + '%');
      t.classList.toggle('is-keyed', Object.values(n).some(Boolean));
    }
    jointKeys = keys;
  };

  const count = () => {
    const all = groups();
    let group = (last && onField(last) && all.find(g => g.includes(last))) || null;
    if (!group) group = all.sort((a, b) => b.length - a.length)[0] || [];
    tiles.forEach(t => t.classList.toggle('is-active', group.includes(t)));
    let size = 0, ms = 0, mb = 0;
    const none = [], timeOnly = [], noFile = [], counted = new Set();
    for (const t of [...group, ...group.flatMap(docked)]) {   // a brain serving two tiles is counted once
      if (counted.has(t.dataset.id) || t.dataset.status === 'yours') continue;
      counted.add(t.dataset.id);
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
    lensHints();
    refilter();
  };
  // When a model with lenses is the one being worked on, the panel marks its lenses: a solid ring for
  // a lens it needs, a dashed one for a lens it works best with; and the field says so once.
  let hintedFor = null;
  const lensHints = () => {
    const host = last && onField(last) && defOf(last).lenses ? last : null;
    const L = host ? defOf(host).lenses : {};
    const need = new Set((L.needs || []).map(x => x.lens)), best = new Set(L.best || []);
    for (const t of tiles.filter(isLensT)) {
      const slot = home.get(t).closest('.tray-slot');
      slot.classList.toggle('is-lens-need', need.has(t.dataset.id));
      slot.classList.toggle('is-lens-best', best.has(t.dataset.id));
    }
    if (host && hintedFor !== host && !placing.length) {
      hintedFor = host;
      const p = profile(defOf(host));
      say(`${host.dataset.name} ${p.replace(/^needs: /, 'needs ').replace(/; works best with: /, '; works best with ')}. Its lenses are marked in the panel.`, 4200);
    }
    if (!host) hintedFor = null;
  };

  // ---- Attachments. A brain, a database or a documents folder is not a link in the chain: a copy of
  // it docks ONTO a tile that needs it, in a small strip at the tile's corner, and the one in the
  // panel stays there, so the same brain can serve several tiles. A tile's attachments go with it;
  // when it goes back to the panel, they come off. ----
  const docks = new Map();   // a tile on the field -> its strip of docked attachments
  const docked = host => (docks.has(host) ? [...docks.get(host).children] : []);
  const hostOf = chip => { for (const [h, d] of docks) if (d.contains(chip)) return h; return null; };
  const givesOf = t => defOf(t).gives;
  const wants = host => { const d = defOf(host); return [...(d.needs || []), ...(d.takes || [])]; };
  const canDock = (host, att) => !!host && !isAtt(host) && onField(host) && wants(host).includes(givesOf(att))
    && !docked(host).some(c => c !== att && givesOf(c) === givesOf(att));
  const original = id => tiles.find(t => t.dataset.id === id);
  const dockOf = host => {
    let d = docks.get(host);
    if (!d) { d = document.createElement('div'); d.className = 'dock'; docks.set(host, d); }
    if (d.parentElement !== host.parentElement) host.parentElement.append(d);
    return d;
  };
  const copyOf = att => {
    const c = att.cloneNode(true);
    c.classList.remove('is-active', 'is-dragging', 'is-fit');
    ['transform', 'width', 'height'].forEach(k => c.style.removeProperty(k));
    wire(c);
    return c;
  };
  const dockOnto = (chip, host, magnet = true) => {
    place(chip, dockOf(host), { magnet });
    chip.setAttribute('aria-label', `${chip.dataset.name}, attached to ${host.dataset.name}. Press to take it off.`);
  };
  const flyHome = (chip, from) => {   // a copy leaving the field flies back to its tile in the panel
    const to = original(chip.dataset.id);
    const r = to && to.offsetParent ? to.getBoundingClientRect() : null;
    if (still.matches || !from.width || !r || !r.width) return;
    const ghost = chip.cloneNode(true);
    ghost.className = 'wtile is-ghost';
    ghost.removeAttribute('aria-label');
    Object.assign(ghost.style, { width: from.width + 'px', height: from.height + 'px' });
    document.body.append(ghost);
    ghost.animate([{ transform: `translate(${from.left}px, ${from.top}px)` },
                   { transform: `translate(${r.left}px, ${r.top}px) scale(${r.width / from.width})`, opacity: 0.3 }],
                  { duration: 380, easing: 'cubic-bezier(.2, .8, .2, 1)' }).finished.then(() => ghost.remove(), () => ghost.remove());
  };
  const undock = chip => {
    const host = hostOf(chip);
    const from = chip.getBoundingClientRect();
    chip.remove();
    if (host && !docked(host).length) { docks.get(host).remove(); docks.delete(host); }
    flyHome(chip, from);
  };
  const say = (text, ms = 2600) => {   // a short line on the field, also read out
    said.textContent = text;
    tip.textContent = text;
    tip.hidden = false;
    clearTimeout(tip.timer);
    tip.timer = setTimeout(() => { tip.hidden = true; }, ms);
  };
  const tip = document.createElement('p');
  tip.className = 'field-tip';
  tip.hidden = true;
  tip.setAttribute('aria-hidden', 'true');
  field.append(tip);
  // Where a click sends an attachment: the tile being built that needs it, else any that does.
  const attachByClick = att => {
    const want = DATA.needs[givesOf(att)];
    const pool = [last, ...activeGroup, ...tiles.filter(onField)].filter(Boolean);
    const host = pool.find(h => canDock(h, att) && (defOf(h).needs || []).includes(givesOf(att))) || pool.find(h => canDock(h, att));
    if (host) { dockOnto(copyOf(att), host); count(); return; }
    say(tiles.some(onField) ? `No tile on the field is waiting for ${want}.` : `Put a tile that needs ${want} on the field first.`);
  };

  // ---- Moving a tile: it lands in its new square at once, then glides there from where it was. ----
  const caption = sq => sq.closest('.tray-slot');
  const setCaption = (slot, tile) => {
    slot.classList.toggle('is-empty', !tile);
    const cap = slot.querySelector('.cap');
    if (tile) fillCap(cap, defOf(tile));
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
    if (docks.has(tile)) {   // its attachments go where it goes; back in the panel, they come off
      if (sq.classList.contains('cell')) { const d = docks.get(tile); sq.append(d); d.classList.remove('is-away'); }
      else docked(tile).forEach(undock);
    }
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

  // A free square beside a model for its lens: below or above first, so the chain's left and right stay free.
  const lensSpot = host => {
    const [c, r] = posOf(host.parentElement);
    return [cellAt(c, r + 1), cellAt(c, r - 1), cellAt(c - 1, r), cellAt(c + 1, r)].find(x => x && !tileIn(x)) || null;
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

  // ---- Dragging. An attachment taken from the panel is dragged as a copy; it can only land on a
  // tile that needs it, and anywhere else it goes back. ----
  let drag = null, target = null, swallowClick = false;
  const clearTarget = () => {
    if (!target) return;
    target.el.classList.remove('is-target', 'is-magnet', 'is-host');
    target.el.style.removeProperty('--tc');
    target = null;
  };
  const findTarget = (x, y) => {
    const f = field.getBoundingClientRect();
    const att = drag && isAtt(drag.tile);
    if (x >= f.left && x <= f.right && y >= f.top && y <= f.bottom) {
      let best = null;
      for (const cell of cells) {
        const host = tileIn(cell);
        if (att ? !canDock(host, drag.tile) : host) continue;
        const b = cell.getBoundingClientRect();
        const step = b.width * 1.14;
        const d = Math.hypot(x - (b.left + b.width / 2), y - (b.top + b.height / 2)) / step;
        if (att) { if (d < 0.8 && (!best || d < best.score)) best = { el: cell, sq: cell, host, magnet: true, score: d }; continue; }
        const magnet = neighbours(cell).some(tileIn);
        const score = magnet && d < 1.25 ? d - 0.5 : d < 0.72 ? d : Infinity;
        if (score < Infinity && (!best || score < best.score)) best = { el: cell, sq: cell, magnet, score };
      }
      return best;
    }
    const t = tray.getBoundingClientRect();
    if (x >= t.left && x <= t.right && y >= t.top && y <= t.bottom) {
      if (att) return { el: trayScroll, sq: null, off: true, magnet: false };   // a copy dropped here comes off
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
  const dragSize = t => {
    if (t.host) return cells[0].getBoundingClientRect().width * 0.42;
    if (!t.sq || t.sq.classList.contains('sq')) { const sq = squares.find(x => x.offsetParent); return sq ? sq.getBoundingClientRect().width : 72; }
    return cells[0].getBoundingClientRect().width;
  };

  const start = (e, tile) => {
    const r = tile.getBoundingClientRect();
    if (isAtt(tile) && !hostOf(tile)) {   // from the panel: the copy is dragged, the tile stays
      tile = drag.tile = copyOf(tile);
      drag.from = null;
    } else drag.from = tile.parentElement;
    drag.ox = (e.clientX - r.left) / r.width;
    drag.oy = (e.clientY - r.top) / r.height;
    drag.size = r.width;
    resetTest();
    if (docks.has(tile)) docks.get(tile).classList.add('is-away');
    document.body.append(tile);
    if (drag.from && drag.from.classList.contains('sq')) setCaption(caption(drag.from), null);
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
    const size = t ? dragSize(t) : drag.size;
    drag.size = size;
    tile.style.width = tile.style.height = size + 'px';
    let x = e.clientX - drag.ox * size, y = e.clientY - drag.oy * size;
    if (t) {
      target = t;
      t.el.classList.add('is-target');
      t.el.classList.toggle('is-magnet', t.magnet);
      t.el.classList.toggle('is-host', !!t.host);
      t.el.style.setProperty('--tc', getComputedStyle(tile).getPropertyValue('--tc'));
      if (t.magnet && t.sq && !still.matches) {   // the magnet pulls the tile a little toward its square
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
    if (isAtt(tile)) {   // an attachment: onto a tile that needs it, back where it was, or off
      const was = from && from.classList.contains('dock') ? [...docks].find(([, d]) => d === from) : null;
      if (t && t.host) dockOnto(tile, t.host);
      else if (was && !t && onField(was[0]) && canDock(was[0], tile)) dockOnto(tile, was[0], false);
      else {
        if (was && !docked(was[0]).length) { was[1].remove(); docks.delete(was[0]); }
        const r = tile.getBoundingClientRect();
        tile.remove();
        flyHome(tile, r);
        if (!t) say(`${tile.dataset.name} goes onto a tile that needs ${DATA.needs[givesOf(tile)]}.`);
      }
    } else if (t) {
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
  // A click: a panel tile goes to the field (when TesT has just named a tile at fault and this one
  // fits in its place, it takes that place, or docks onto it); a field tile goes back to the panel.
  function wire(tile) {
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
      const mend = fix && fix.ids.has(tile.dataset.id) && !onField(tile) && !hostOf(tile) ? fix : null;
      resetTest();
      if (hostOf(tile)) { undock(tile); count(); return; }
      if (mend && mend.mode === 'attach' && onField(mend.host)) { dockOnto(copyOf(tile), mend.host); endFix(); count(); return; }
      if (isAtt(tile)) { attachByClick(tile); return; }
      if (isLensT(tile) && !onField(tile)) {   // a lens goes beside the model it serves (the one at fault first)
        const host = mend && mend.mode === 'lens' && onField(mend.host) ? mend.host
          : [last, ...tiles.filter(onField)].find(h => h && onField(h) && (defOf(tile).serves || []).includes(h.dataset.id) && neighbours(h.parentElement).some(n => !tileIn(n)));
        const cell = host ? lensSpot(host) : nextCell();
        if (!cell) { say(`There is no free square beside ${host ? host.dataset.name : 'the team'}.`); return; }
        place(tile, cell, { magnet: true });
        if (mend) endFix();
        count();
        return;
      }
      if (onField(tile)) {
        place(tile, backToPanel(tile));
        if (last === tile) last = null;
      } else if (mend && mend.mode === 'replace' && (tileIn(mend.cell) === mend.host || !tileIn(mend.cell))) {
        if (tileIn(mend.cell)) place(mend.host, backToPanel(mend.host));
        place(tile, mend.cell, { magnet: true });
        last = tile;
        endFix();
      } else {
        const cell = nextCell();
        if (!cell) return;
        const magnet = neighbours(cell).some(tileIn);
        place(tile, cell, { magnet });
        last = tile;
      }
      count();
    });
    const hot = on => () => { if (onField(tile)) glow(tile.dataset.id, on); };
    tile.addEventListener('pointerenter', hot(true));
    tile.addEventListener('pointerleave', hot(false));
    tile.addEventListener('focus', hot(true));
    tile.addEventListener('blur', hot(false));
  }
  tiles.forEach(wire);

  bench.querySelector('.field-clear').addEventListener('click', () => {
    placing.forEach(clearTimeout);   // a team still being placed stops
    placing = [];
    resetTest();
    endFix();
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
  function resetTest() {
    stopTest();
    keyTest.classList.remove('is-pass', 'is-fail');
    tiles.forEach(t => t.classList.remove('is-wrong'));
    if (fixBox.classList.contains('is-pass')) endFix();   // a pass is about the field as it was
  }

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

  // ---- The rules TesT applies. A board is the tiles on the field as [{ id, c, r, att }], att being
  // the needs their docked attachments fill. Tiles side by side pass their work left to right (a
  // PIPE); tiles stacked in one column are alternatives that all get the same work (a STAGE); a tile
  // touching Siren (a hub) is a specialist she CALLS, and its answer comes back to her. The checks
  // run in order and the first that fails is the answer: (1) a start and an end; (2) one piece, and
  // every start reaching an end, with nothing before a start, nothing after an end, and no middle
  // tile cut off on either side; (3) every two touching tiles fitting, in the direction the work
  // goes; (4) every tile having the attachments it needs. Each fault names the tile at fault (p),
  // and the tile it could not follow (other) when there is one. ----
  const D = id => DEF.get(id);
  const isStart = d => d.role === 'start' || d.role === 'both';
  const isEnd = d => d.role === 'end' || d.role === 'both';
  const kinds = ks => orList(ks.map(k => (k === '*' ? 'any result' : DATA.kinds[k] || k)));
  const fitsKinds = (out, inn) => out.length > 0 && (inn.includes('*') || out.some(k => inn.includes(k)));
  const ORDER = ['ends', 'orphan', 'order', 'kinds', 'needs'];
  const isLensD = p => D(p.id).role === 'lens';
  const check = full => {
    const board = full.filter(p => !isLensD(p));   // lenses sit beside their model: not steps of the chain
    const at = new Map(board.map(p => [p.c + ',' + p.r, p]));
    const get = (c, r) => at.get(c + ',' + r);
    const atAll = new Map(full.map(p => [p.c + ',' + p.r, p]));
    const getAll = (c, r) => atAll.get(c + ',' + r);
    const around = p => [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dc, dr]) => getAll(p.c + dc, p.r + dr)).filter(Boolean);
    const notes = [];
    const nm = p => D(p.id).name;
    const names = ps => list([...new Set(ps.map(nm))]);
    const hub = p => !!(p && D(p.id).hub);
    const stageOf = new Map();
    for (const p of board) {
      if (stageOf.has(p) || hub(p)) continue;
      const st = { members: [], preds: new Set(), succs: new Set(), hubs: new Set() };
      let r0 = p.r;
      while (get(p.c, r0 - 1) && !hub(get(p.c, r0 - 1))) r0--;
      for (let r = r0; get(p.c, r) && !hub(get(p.c, r)); r++) { st.members.push(get(p.c, r)); stageOf.set(get(p.c, r), st); }
    }
    const edges = [];
    for (const p of board) for (const [dc, dr] of [[1, 0], [0, 1]]) {
      const q = get(p.c + dc, p.r + dr);
      if (!q || (hub(p) && hub(q))) continue;
      if (hub(p) || hub(q)) {
        const [h, x] = hub(p) ? [p, q] : [q, p];
        edges.push({ type: 'call', from: h, to: x });
        stageOf.get(x).hubs.add(h);
      } else if (dc) {
        edges.push({ type: 'pipe', from: p, to: q });
        stageOf.get(p).succs.add(q);
        stageOf.get(q).preds.add(p);
      }
    }
    const errs = [];
    const add = (cat, p, sentence, big, more = {}) => errs.push({ cat, p, sentence, big, mode: 'replace', ...more });
    // (1) a start and an end
    const sources = board.filter(p => !hub(p) && !stageOf.get(p).preds.size && !stageOf.get(p).hubs.size);
    const sinks = board.filter(p => !hub(p) && !stageOf.get(p).succs.size && !stageOf.get(p).hubs.size);
    if (!board.length) for (const p of full) add('ends', p, `${nm(p)} is a lens: it is not a model by itself; put it beside ${list((D(p.id).serves || []).map(DNAME))}.`, 'no model', { mode: 'none' });
    if (board.length && !board.some(p => isStart(D(p.id)))) {
      for (const p of (sources.length ? sources : board)) {
        const d = D(p.id);
        add('ends', p, `Nothing starts this chain: ${d.name} ${d.in.length ? `needs ${kinds(d.in)}, and ` : ''}only a Starter can begin a chain.`, 'no start');
      }
    }
    if (board.length && !board.some(p => isEnd(D(p.id)))) {
      for (const p of (sinks.length ? sinks : board)) {
        const d = D(p.id);
        add('ends', p, `Nothing ends this chain: ${d.name} hands on ${kinds(d.out)}, and only a Finisher can give the result.`, 'no end');
      }
    }
    // (2) one piece; then the order
    const pieces = [], seen = new Set();
    for (const p of full) {
      if (seen.has(p)) continue;
      const piece = [], todo = [p];
      seen.add(p);
      while (todo.length) {
        const q = todo.pop();
        piece.push(q);
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const n = getAll(q.c + dc, q.r + dr);
          if (n && !seen.has(n)) { seen.add(n); todo.push(n); }
        }
      }
      pieces.push(piece);
    }
    pieces.sort((a, b) => b.length - a.length);
    for (const piece of pieces.slice(1)) {
      for (const p of piece) {
        add('orphan', p, `${names(piece)} ${piece.length > 1 ? 'are' : 'is'} not joined to the rest: one model is one piece, so put ${piece.length > 1 ? 'them' : 'it'} beside the chain or back in the panel.`, `${pieces.length} pieces`, { mode: 'none' });
      }
    }
    for (const p of board) {
      if (hub(p)) continue;
      const d = D(p.id), st = stageOf.get(p);
      const before = st.preds.size > 0, after = st.succs.size > 0, called = st.hubs.size > 0;
      if (d.role === 'start' && before) add('order', p, `${d.name} cannot follow ${names([...st.preds])}: ${d.name} starts a chain, so nothing can come before ${d.name}.`, 'wrong order', { other: [...st.preds] });
      else if (d.role === 'end' && after) add('order', p, `Nothing can follow ${d.name}: ${d.name} ends a chain, and ${names([...st.succs])} ${st.succs.size > 1 ? 'are' : 'is'} after ${d.name}.`, 'wrong order', { other: [...st.succs] });
      else if (d.role !== 'start' && !before && !called) add('order', p, `Nothing comes before ${d.name}: ${d.name} needs ${kinds(d.in)}, from a start tile on the left or from Siren beside it.`, 'no start');
      else if (d.role !== 'end' && !after && !called) add('order', p, `What ${d.name} gives goes nowhere: ${d.name} hands on ${kinds(d.out)}, and a chain must end in a tile that gives the result.`, 'dead end');
    }
    // (3) every two touching tiles fit
    const piped = new Set();
    for (const e of edges) {
      if (e.type === 'pipe') {   // alternatives: whichever of the left stage answers, each of the right stage must take it
        for (const g of stageOf.get(e.from).members) for (const m of stageOf.get(e.to).members) {
          if (piped.has(g.id + '|' + m.id)) continue;
          piped.add(g.id + '|' + m.id);
          const a = D(g.id), b = D(m.id);
          if (b.role === 'start' || !a.out.length) continue;   // the order check names these
          if (!fitsKinds(a.out, b.in)) add('kinds', m, `${b.name} cannot follow ${a.name}: ${a.name} gives ${kinds(a.out)}, ${b.name} needs ${kinds(b.in)}.`, 'no fit', { other: [g] });
        }
      } else {
        for (const m of stageOf.get(e.to).members) {
          const h = D(e.from.id), x = D(m.id);
          if (x.role !== 'start' && !fitsKinds(h.out, x.in)) add('kinds', m, `${h.name} cannot call ${x.name}: ${h.name} gives ${kinds(h.out)}, ${x.name} needs ${kinds(x.in)}.`, 'no fit', { other: [e.from] });
          else if (x.role !== 'end' && !fitsKinds(x.out, h.in)) add('kinds', m, `${x.name} cannot answer ${h.name}: ${x.name} gives ${kinds(x.out)}, ${h.name} needs ${kinds(h.in)}.`, 'no fit', { other: [e.from] });
        }
      }
    }
    // a lens works only touching a model it serves
    for (const p of full.filter(isLensD)) {
      const near = around(p);
      if (near.length && !near.some(q => (D(p.id).serves || []).includes(q.id))) {
        add('order', p, `${nm(p)} works only beside ${list(D(p.id).serves.map(DNAME))}: it is beside ${names(near)}.`, 'misplaced lens', { mode: 'none' });
      }
    }
    // (4) every tile has what it needs: its attachments, then its lenses
    for (const p of board) for (const need of D(p.id).needs || []) {
      if (!p.att.has(need)) add('needs', p, `${nm(p)} needs ${DATA.needs[need]}: attach one onto ${nm(p)}.`, `needs ${DATA.needs[need].replace(/^an? /, '')}`, { mode: 'attach', need });
    }
    for (const p of board) {
      const L = D(p.id).lenses;
      if (!L) continue;
      const has = new Set(around(p).filter(isLensD).map(q => q.id));
      for (const x of L.needs || []) {
        if (has.has(x.lens)) continue;
        if (x.unless && (p.attIds || new Set()).has(x.unless)) { notes.push(`${nm(p)} does not need ${DNAME(x.lens)} on ${DNAME(x.unless)}.`); continue; }
        add('needs', p, `${nm(p)} needs ${DNAME(x.lens)}${x.why ? ' ' + x.why : ''}: put ${DNAME(x.lens)} beside ${nm(p)}.`, 'needs a lens', { mode: 'lens', lens: x.lens });
      }
      const missing = (L.best || []).filter(id => !has.has(id));
      if (missing.length) notes.push(`${nm(p)} works best with ${list(missing.map(DNAME))}${missing.length < (L.best || []).length ? '' : ''}.`);
    }
    for (const p of board) for (const id of p.attIds || []) {
      if ((DEF.get(id) || {}).where === 'remote') notes.push(`${nm(p)} thinks on ${DNAME(id)}: its data leaves this PC unless that server is yours.`);
    }
    const flow = (a, b) => a.p.c - b.p.c || a.p.r - b.p.r;
    const cat = ORDER.find(c => errs.some(e => e.cat === c));
    const faults = cat ? errs.filter(e => e.cat === cat).sort(flow) : [];
    // the team, as the work goes: "Siren → Daisy → Siren" when Siren only calls; otherwise each chain
    // from its start ("Orchid or Tulip → Bouquet → Jasmine → Iris, Thistle or Lily"), then whom Siren calls
    const stages = [...new Set(stageOf.values())].sort((a, b) => Math.min(...a.members.map(p => p.c)) - Math.min(...b.members.map(p => p.c)) || Math.min(...a.members.map(p => p.r)) - Math.min(...b.members.map(p => p.r)));
    const says = st => orList(st.members.map(nm));
    const h = board.find(hub);
    const called = stages.filter(st => st.hubs.size);
    let path;
    if (h && stages.every(st => st.hubs.size && !st.preds.size && !st.succs.size)) path = [nm(h), ...stages.map(says), ...(stages.length ? [nm(h)] : [])].join(' \u2192 ');
    else {
      const seenSt = new Set(), chains = [];
      for (const st of stages.filter(x => !x.preds.size && (x.succs.size || !x.hubs.size))) {   // a tile Siren only calls is said with her
        const chain = [];
        for (let cur = st; cur;) {
          chain.push(says(cur));
          if (seenSt.has(cur)) break;
          seenSt.add(cur);
          const next = [...cur.succs].map(q => stageOf.get(q));
          cur = next[0] || null;
        }
        chains.push(chain.join(' \u2192 '));
      }
      if (h && called.length) chains.push(`${nm(h)} calls ${list(called.map(says))}`);
      path = chains.filter(Boolean).join('; ');
    }
    return { ok: !cat, cat, faults, all: errs, edges, path, notes: [...new Set(notes)] };
  };
  const board = () => cells.filter(tileIn).map(cell => {
    const t = tileIn(cell), [c, r] = posOf(cell);
    return { id: t.dataset.id, c, r, att: new Set(docked(t).map(givesOf)), attIds: new Set(docked(t).map(x => x.dataset.id)), tile: t };
  });
  // The tiles from the panel that could stand where a fault is: put in that square, nothing at that
  // place breaks the order or the fit any more (what it needs can be attached afterwards).
  const fitting = (b, fault) => {
    if (fault.mode === 'attach') return DATA.tiles.filter(d => d.gives === fault.need).map(d => d.id);
    if (fault.mode === 'lens') return [fault.lens];
    if (fault.mode !== 'replace') return [];
    return tiles.filter(t => !isAtt(t) && !isLensT(t) && !onField(t)).map(t => t.dataset.id).filter(id => {
      const q = { id, c: fault.p.c, r: fault.p.r, att: new Set(D(id).needs || []) };
      const res = check(b.map(p => (p === fault.p ? q : p)));
      return !res.all.some(e => (e.cat === 'ends' || e.cat === 'order' || e.cat === 'kinds') && (e.p === q || (e.other || []).includes(q)));
    });
  };

  // ---- When TesT names a tile at fault: the sentence, in a box above the panel's tiles, and the
  // panel showing only the tiles that fit there ("Fits here"), until "Show all tiles". ----
  let fix = null;   // { host, cell, mode, ids }
  const fixBox = document.createElement('div');
  fixBox.className = 'fix';
  fixBox.hidden = true;
  fixBox.setAttribute('role', 'status');
  fixBox.innerHTML = '<p class="fix-say"></p><p class="fix-what"></p><button class="fix-all" type="button">Show all tiles</button>';
  const filtersEl = tray.querySelector('.filters');
  filtersEl.after(fixBox);
  const startFix = (b, fault) => {
    const ids = new Set(fitting(b, fault));
    const host = fault.p.tile;
    fix = { host, cell: host.parentElement, mode: fault.mode, ids };
    fixBox.classList.remove('is-pass');
    fixBox.querySelector('.fix-say').textContent = fault.sentence;
    const what = fixBox.querySelector('.fix-what');
    if (fault.mode === 'none') what.textContent = '';
    else if (!ids.size) what.textContent = 'No tile in the panel fits there.';
    else if (fault.mode === 'attach') what.textContent = `Below: what can go onto ${host.dataset.name}. Press one to attach it.`;
    else if (fault.mode === 'lens') what.textContent = `Below: the lens ${host.dataset.name} needs. Press it to put it beside ${host.dataset.name}.`;
    else what.textContent = `Below: the ${ids.size === 1 ? 'tile' : `${ids.size} tiles`} that could take ${host.dataset.name}’s place. Press one to swap it in.`;
    fixBox.hidden = false;
    if (fault.mode !== 'none' && ids.size) setKind('fix');
  };
  const showPass = sentence => {
    fix = null;
    fixBox.classList.add('is-pass');
    fixBox.querySelector('.fix-say').textContent = sentence;
    fixBox.querySelector('.fix-what').textContent = '';
    fixBox.hidden = false;
  };
  function endFix() {
    if (!fix && fixBox.hidden) return;
    fix = null;
    fixBox.hidden = true;
    fixBox.classList.remove('is-pass');
    if (kind === 'fix') setKind('all');
  }
  fixBox.querySelector('.fix-all').addEventListener('click', () => { endFix(); });

  // HOOK, for later (not now): once the connector runs on the person's own PC, TesT will also send
  // a sample through the real models here, with recipe() (POST /v1/recipe/test, see
  // CONNECTOR-DESIGN), and show each tile's answer and confidence along the bars. Today nothing
  // leaves the page: sampleRun stays null and no network call is made.
  const sampleRun = null;
  const recipe = res => ({
    schema: 'connector/recipe@1',
    grid: board().map(p => ({ tile: p.id, at: [p.c, p.r] })),
    edges: res.edges.map(e => ({ from: e.from.id, to: e.to.id, type: e.type })),
    bind: Object.fromEntries(board().filter(p => p.att.size).map(p => [p.id, [...p.att]])),
  });

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
    const b0 = board(), res = check(b0);   // the rules decide; the signal below only shows it
    endFix();
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

    if (res.ok) {   // one model: drawn round, the bars between them all lit, a pulse
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
        verdict(b, false, '1 model', res.path.length <= 34 ? res.path : `${n} tiles in order`);
        const unbuilt = [...new Set([...main, ...main.flatMap(docked)].filter(t => t.dataset.status === 'design' || t.dataset.status === 'notbuilt').map(t => t.dataset.name))];
        const sentence = `${res.path}: the order is right, every two touching tiles fit and every tile has what it needs, so ${n === 1 ? 'this tile makes' : `these ${n} tiles make`} one model.`
          + (unbuilt.length ? ` It cannot run yet: ${list(unbuilt)} ${unbuilt.length > 1 ? 'are' : 'is'} not built.` : ' It works as one model.')
          + main.filter(t => t.dataset.status === 'gate').map(t => ` ${t.dataset.name} has passed her gate but is not in use yet.`).join('')
          + (res.notes.length ? ' Note: ' + res.notes.join(' ') : '');
        said.textContent = 'Test: ' + sentence;
        showPass(sentence);
        if (sampleRun) sampleRun(recipe(res));   // later: a sample through the real models (see HOOK)
      });
      finish(lit + DRAW + 2800);
    } else if (res.cat !== 'orphan') {   // a tile at fault: marked, the reason said, and the panel shows what fits there
      const fault = res.faults[0];
      const bad = [...new Set(res.faults.map(f => f.p.tile))];
      later(lit, () => {
        keyTest.classList.replace('is-running', 'is-fail');
        bad.forEach(t => {
          t.classList.add('is-wrong');
          if (slow) t.animate([0, -5, 5, -4, 4, -2, 0].map(dx => ({ transform: `translateX(${dx}px)` })), { duration: 460, easing: 'ease-out' });
        });
        verdict(box(bad), true, fault.big, fault.sentence.split(':')[0]);
        said.textContent = 'Test: ' + fault.sentence;
        startFix(b0, fault);
      });
      finish(lit + 2800);
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
        said.textContent = `Test: the tiles on the field are in ${pieces.length} pieces, not joined into one model. ${res.faults[0].sentence}`;
        loose.flat().forEach(t => t.classList.add('is-wrong'));
        startFix(b0, res.faults[0]);
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
  // in the work it comes, from its role and its kinds in tiles.js.
  const RANK = { start: 0, both: 0, middle: 1, end: 2 };
  const role = t => {
    const d = defOf(t);
    const given = d.role === 'both' ? 'message' : d.role === 'start' ? (d.needs || [])[0] || 'source' : (d.in || [])[0] || 'data';
    return [given === '*' ? 'result' : given, (d.out || [])[0] || 'result', RANK[d.role] ?? 1];
  };
  const colour = id => { const t = tiles.find(x => x.dataset.id === id); return t ? t.style.getPropertyValue('--tc') : ''; };

  // The lines of team.py, each a list of [kind, text] (a model's name also carries its colour).
  const teamPy = (all, loose) => {
    const out = [];
    const group = all.filter(t => !isLensT(t));   // a lens is loaded with its model, not called as a step
    const lensesOf = t => neighbours(t.parentElement).map(tileIn).filter(u => u && isLensT(u) && all.includes(u) && (defOf(u).serves || []).includes(t.dataset.id));
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
      const ls = lensesOf(t).map(u => `"${u.dataset.id}"`);
      const with_ = [...docked(t).flatMap(c => [['op', ', '], ['prm', givesOf(c)], ['op', '='], ['str', `"${c.dataset.id}"`]]),
        ...(ls.length ? [['op', ', '], ['prm', 'lenses'], ['op', '=['], ['str', ls.join(', ')], ['op', ']']] : [])];
      add(id, mdl(id), ['op', ' = '], ['fn', 'load'], ['op', '('], ['str', `"${id}"`], ...with_, ['op', ')'], ...(note ? [['com', `  # ${note}`]] : []));
    }
    add(null);
    add(null, ['kw', 'def'], ['op', ' '], ['fn', 'team'], ['op', '('], ['prm', role(first)[0]], ['op', '):']);
    const hubT = group.length > 1 ? group.find(t => defOf(t).hub) : null;   // Siren: her specialists answer back to her
    const ends = order.filter(t => t !== hubT && !joined(t).some(u => level.get(u) > level.get(t)));
    const list = items => items.flatMap((x, i) => (i ? [['op', ', '], x] : [x]));
    for (const t of order) {
      const given = level.get(t) === 0
        ? [['prm', role(first)[0]]]
        : joined(t).filter(u => level.get(u) < level.get(t)).sort(reading).map(u => ['var', role(u)[1]]);
      const call = [mdl(t.dataset.id), ['op', '('], ...list(given), ['op', ')']];
      if (!hubT && ends.length === 1 && ends[0] === t) add(t.dataset.id, ['op', '    '], ['kw', 'return'], ['op', ' '], ...call);
      else add(t.dataset.id, ['op', '    '], ['var', role(t)[1]], ['op', ' = '], ...call);
    }
    if (hubT) add(hubT.dataset.id, ['op', '    '], ['kw', 'return'], ['op', ' '], mdl(hubT.dataset.id), ['op', '('], ...list(ends.map(t => ['var', role(t)[1]])), ['op', ')']);
    else if (ends.length > 1) add(null, ['op', '    '], ['kw', 'return'], ['op', ' '], ...list(ends.map(t => ['var', role(t)[1]])));
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
  const fits = (t, k) => k === 'all' || (k === 'fix' ? !!fix && fix.ids.has(t.dataset.id)
    : k === 'ready' ? t.dataset.params !== '' || t.dataset.ms !== '' : tagsOf(t).includes(k));
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
  // "Fits here": shown only after TesT has named a tile at fault, for the tiles that would fit there.
  const fixChip = document.createElement('button');
  fixChip.type = 'button';
  fixChip.className = 'chip chip-fix';
  fixChip.dataset.kind = 'fix';
  fixChip.hidden = true;
  fixChip.setAttribute('aria-pressed', 'false');
  fixChip.innerHTML = 'Fits here <b>0</b>';
  filterBar.prepend(fixChip);
  filterBar.hidden = false;
  function setKind(k) {
    kind = k;
    fixChip.hidden = k !== 'fix';
    fixChip.querySelector('b').textContent = fix ? fix.ids.size : 0;
    filterBar.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.kind === k)));
    trayScroll.scrollTop = 0;
    refilter();
  }

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
  // ---- The teams, above the filters: one button per plan (presets in tiles.js). A press puts every
  // tile back, then places that plan's tiles in its working order, one after another, with what
  // they need attached (all at once with reduced motion). The field stays as editable as ever. ----
  const presetBar = document.createElement('div');
  presetBar.className = 'presets';
  presetBar.setAttribute('role', 'group');
  presetBar.setAttribute('aria-label', 'Place a whole team');
  presetBar.innerHTML = '<span class="presets-label">Teams</span>';
  for (const team of DATA.presets || []) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'preset';
    b.dataset.team = team.id;
    b.style.setProperty('--pc', team.colour);
    b.title = team.say;
    b.innerHTML = '<i></i><span></span><b></b>';
    b.querySelector('span').textContent = team.name;
    b.querySelector('b').textContent = team.plan;
    b.setAttribute('aria-label', `${team.name}: place ${team.plan} on the field`);
    presetBar.append(b);
  }
  filterBar.before(presetBar);
  let placing = [];
  const placeTeam = team => {
    if (drag) return;
    placing.forEach(clearTimeout);
    placing = [];
    resetTest();
    endFix();
    if (kind !== 'all') setKind('all');
    tiles.filter(onField).forEach(t => place(t, backToPanel(t)));
    last = null;
    count();
    // the team is centred on the grid; a team larger than the grid first grows it to the smallest size that holds it
    const cs = team.tiles.map(x => x[1]), rs = team.tiles.map(x => x[2]);
    const w = Math.max(...cs) - Math.min(...cs) + 1, h = Math.max(...rs) - Math.min(...rs) + 1;
    if (Math.max(w, h) > COLS) resizeGrid(SIZES.find(n => n >= Math.max(w, h)) || SIZES[SIZES.length - 1]);
    const dc = Math.floor((COLS - w) / 2) - Math.min(...cs), dr = Math.floor((ROWS - h) / 2) - Math.min(...rs);
    const step = still.matches ? 0 : 70, wait = still.matches ? 0 : 300;
    const later = (ms, fn) => { if (ms) placing.push(setTimeout(fn, ms)); else fn(); };
    team.tiles.forEach(([id, c, r, att = []], i) => later(wait + i * step, () => {
      const t = original(id), cell = cellAt(c + dc, r + dr);
      if (!t || !cell || tileIn(cell) || onField(t)) return;
      place(t, cell, { magnet: true });
      last = t;
      att.forEach(a => { const o = original(a); if (o && canDock(t, o)) dockOnto(copyOf(o), t, false); });
      count();
    }));
    later(wait + team.tiles.length * step + (still.matches ? 0 : 120), () => { count(); say(`${team.name} (${team.plan}) is on the field. Press TesT to check it.`, 4000); });
  };
  presetBar.addEventListener('click', e => {
    const b = e.target.closest('.preset');
    const team = b && (DATA.presets || []).find(t => t.id === b.dataset.team);
    if (team) placeTeam(team);
  });
  filterBar.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip || chip.dataset.kind === kind) return;
    endFix();   // another filter: the tiles that fit are no longer the question
    setKind(chip.dataset.kind);
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

  // ---- The grid's size, at the field's top left: 7 x 7 to 10 x 10. A new size rebuilds the squares
  // inside the same field, so more squares means smaller tiles; every square and tile glides from
  // where it was to where it now is (instantly with reduced motion). Shrinking never loses a tile:
  // the tiles on the field move inward together, keeping their arrangement; when they cannot fit,
  // the size stays, the control shakes and says which size they need. The size is remembered in
  // this browser. ----
  const sizeBox = document.createElement('div');
  sizeBox.className = 'gridsize';
  sizeBox.innerHTML = '<button class="gridsize-btn" type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="gridsize-list">'
    + '<span class="gridsize-now"></span><svg class="gridsize-caret" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'
    + '<ul class="gridsize-list" id="gridsize-list" role="listbox" tabindex="-1" aria-label="Grid size" hidden></ul>';
  const sizeBtn = sizeBox.querySelector('.gridsize-btn'), sizeList = sizeBox.querySelector('.gridsize-list');
  for (const n of SIZES) {
    const li = document.createElement('li');
    li.id = 'gridsize-' + n;
    li.setAttribute('role', 'option');
    li.dataset.n = n;
    li.textContent = `${n}x${n}`;
    sizeList.append(li);
  }
  (field.querySelector('.field-title') || field.querySelector('.field-head').firstChild).replaceWith(sizeBox);
  const options = [...sizeList.children];
  let hot = 0;
  const showSize = () => {
    sizeBox.querySelector('.gridsize-now').textContent = `${COLS}x${ROWS}`;
    sizeBtn.setAttribute('aria-label', `Grid size: ${COLS} by ${ROWS}`);
    options.forEach(o => o.setAttribute('aria-selected', String(+o.dataset.n === COLS)));
  };
  const point = i => {
    hot = (i + options.length) % options.length;
    options.forEach((o, k) => o.classList.toggle('is-hot', k === hot));
    sizeList.setAttribute('aria-activedescendant', options[hot].id);
  };
  const openSizes = open => {
    if (open === !sizeList.hidden) return;
    sizeBtn.setAttribute('aria-expanded', String(open));
    sizeBox.classList.toggle('is-open', open);
    if (open) {
      sizeList.hidden = false;
      point(SIZES.indexOf(COLS));
      sizeList.focus({ preventScroll: true });
      if (!still.matches) sizeList.animate([{ opacity: 0, transform: 'translateY(-6px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 180, easing: 'cubic-bezier(.2, .8, .2, 1)' });
    } else sizeList.hidden = true;
  };
  const choose = n => { openSizes(false); sizeBtn.focus({ preventScroll: true }); resizeGrid(n); };
  sizeBtn.addEventListener('click', () => openSizes(sizeList.hidden));
  sizeBtn.addEventListener('keydown', e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openSizes(true); } });
  sizeList.addEventListener('click', e => { const o = e.target.closest('[role="option"]'); if (o) choose(+o.dataset.n); });
  sizeList.addEventListener('keydown', e => {
    const k = e.key;
    if (k === 'ArrowDown' || k === 'ArrowUp') { e.preventDefault(); point(hot + (k === 'ArrowDown' ? 1 : -1)); }
    else if (k === 'Home' || k === 'End') { e.preventDefault(); point(k === 'Home' ? 0 : options.length - 1); }
    else if (k === 'Enter' || k === ' ') { e.preventDefault(); choose(+options[hot].dataset.n); }
    else if (k === 'Escape') { e.preventDefault(); openSizes(false); sizeBtn.focus({ preventScroll: true }); }
    else if (k === 'Tab') openSizes(false);
  });
  document.addEventListener('pointerdown', e => { if (!sizeBox.contains(e.target)) openSizes(false); });

  function resizeGrid(n) {
    if (n === COLS && n === ROWS) return true;
    const placed = cells.filter(tileIn).map(cell => [cell, ...posOf(cell)]);
    let dc = 0, dr = 0;
    if (placed.length) {
      const cs = placed.map(p => p[1]), rs = placed.map(p => p[2]);
      const need = Math.max(Math.max(...cs) - Math.min(...cs) + 1, Math.max(...rs) - Math.min(...rs) + 1);
      if (need > n) {   // the tiles cannot fit: keep the size and say which one they need
        if (!still.matches) sizeBtn.animate([0, -6, 6, -4, 4, -2, 0].map(x => ({ transform: `translateX(${x}px)` })), { duration: 420, easing: 'ease-out' });
        say(`The tiles on the field need at least ${need}x${need}: take some off to go to ${n}x${n}.`, 3600);
        return false;
      }
      dc = Math.min(0, n - 1 - Math.max(...cs));   // in by as little as needed, the whole team together
      dr = Math.min(0, n - 1 - Math.max(...rs));
    }
    resetTest();
    endFix();
    const old = cells.slice(), was = new Map(old.map(c => [posOf(c).join(), c.getBoundingClientRect()]));
    const from = new Map();
    COLS = ROWS = n;
    buildCells();
    for (const [cell, c, r] of placed) {   // each tile, with what is docked on it, to its new square
      const to = cellAt(c + dc, r + dr);
      [...cell.children].forEach(ch => to.append(ch));
      from.set(to, cell.getBoundingClientRect());
    }
    old.forEach(c => c.remove());
    fit();
    count();
    showSize();
    try { localStorage.setItem(GRID_KEY, String(n)); } catch (e) { /* fine */ }
    if (still.matches) return true;
    for (const cell of cells) {   // FLIP: from the old square's place and size to the new one's
      const a = from.get(cell) || was.get(posOf(cell).join()), b = cell.getBoundingClientRect();
      cell.style.transformOrigin = '0 0';
      const [c, r] = posOf(cell);
      if (a && a.width) {
        cell.animate([{ transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width})` }, { transform: 'none' }],
                     { duration: 560, easing: 'cubic-bezier(.3, .9, .25, 1)' });
      } else {
        cell.animate([{ opacity: 0, transform: 'scale(.5)' }, { opacity: 1, transform: 'none' }],
                     { duration: 420, delay: 140 + (c + r) * 22, easing: 'cubic-bezier(.2, .8, .2, 1)', fill: 'backwards' });
      }
    }
    grid.querySelectorAll('.joint').forEach(j => j.animate([{ opacity: 0 }, { opacity: getComputedStyle(j).opacity }], { duration: 300, delay: 420, fill: 'backwards' }));
    return true;
  }
  showSize();

  const ro = new ResizeObserver(() => { fit(); meters.forEach(mt => mt.paint(mt.value)); });
  ro.observe(field);
  ro.observe(tray);
  fit();
  count();
})();
