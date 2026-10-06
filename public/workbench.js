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
   the kinds of data it accepts and hands on, and what it needs. A lettered badge on each tile says its role
   (I an input, Fn a function, O an output). Tiles
   side by side pass their work left to right; tiles stacked in a column form a team that a brain
   coordinates: functions do the work it gives them, inputs all feed it, and it decides which outputs
   get the answer; a tile
   touching Siren is a specialist she calls, whose answer comes back to her. The TesT key checks, in
   this order: a start and an end; every chain going from a start to an end, in one piece; every
   two touching tiles fitting; every tile having what it needs. When a check fails, the tile at
   fault is marked, the reason is said in one sentence, and the panel shows only the tiles that
   would fit in its place. */
(() => {
  // One workbench. workbench.html has two, under tabs (see "The tabs" at the end): MODELS, with every
  // tile in tiles.js, and ROBOTS, the same bench with nothing in its panel yet. The home page has one.
  const initBench = (bench, DATA) => {
  if (!bench || !DATA) return;
  const EMPTY = !DATA.tiles.length;   // ROBOTS: no tiles yet
  const SIZES = [7, 8, 9, 10], GRID_KEY = 'akiki-workbench-grid' + (bench.dataset.board && bench.dataset.board !== 'models' ? '-' + bench.dataset.board : '');
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

  // ---- The panel's tiles, built from tiles.js. Each is its own icon, in its own colour; a badge at
  // its top right says its role (style.css, "Roles"). ----
  const NS = 'http://www.w3.org/2000/svg';
  const sprite = (document.querySelector('svg > symbol') || {}).parentNode || document.body.appendChild(document.createElementNS(NS, 'svg'));
  // A code tile shows "</>", drawn in the logo's pixels in the tile's own colour (currentColor), on no square.
  const CODE_PX = [[2, 0], [1, 1], [0, 2], [1, 3], [2, 4], [7, 0], [6, 1], [5, 2], [4, 3], [3, 4], [9, 0], [10, 1], [11, 2], [10, 3], [9, 4]];
  // The Chat window, a code tile too, shows chat lines instead: a speech bubble holding three lines of text.
  const CHAT_PX = [
    '.XXXXXXXXXXX.',
    'X...........X',
    'X.XXXXXXXX..X',
    'X...........X',
    'X.XXXXXXXXX.X',
    'X...........X',
    'X.XXXXX.....X',
    'X...........X',
    '.XXXXXXXXXXX.',
    '..XX.........',
    '..X..........',
  ].flatMap((row, r) => [...row].map((ch, c) => (ch === 'X' ? [c, r] : null)).filter(Boolean));
  const codeSymbol = (id, x0, y0, p, size, PX = CODE_PX) => {
    if (document.getElementById(id)) return id;
    const sym = document.createElementNS(NS, 'symbol');
    sym.id = id;
    sym.setAttribute('viewBox', '0 0 40 40');
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('fill', 'currentColor');
    for (const [c, r] of PX) {
      const px = document.createElementNS(NS, 'rect');
      [['x', x0 + c * p], ['y', y0 + r * p], ['width', size], ['height', size], ['rx', size * 0.25]].forEach(([k, v]) => px.setAttribute(k, v.toFixed(2)));
      g.append(px);
    }
    sym.append(g);
    sprite.append(sym);
    return id;
  };
  const drawing = d => {   // the page's own icon; for a tile with none, one drawn from its glyph; for code, "</>"
    if (d.kind === 'code' && d.chat) return codeSymbol('px-chat', 3.3, 5.9, 2.6, 2.2, CHAT_PX);
    if (d.kind === 'code' && d.pixels) {   // a way in or out: its own pixel drawing, in the code look (tiles.js "pixels")
      const P = 3.2, Z = 2.7, w = Math.max(...d.pixels.map(r => r.length)), h = d.pixels.length;
      const px = d.pixels.flatMap((row, r) => [...row].map((ch, c) => (ch === 'X' ? [c, r] : null)).filter(Boolean));
      return codeSymbol('px-code-' + d.id, (40 - (w - 1) * P - Z) / 2, (40 - (h - 1) * P - Z) / 2, P, Z, px);
    }
    if (d.kind === 'code') return codeSymbol('px-code', 4.6, 13.6, 2.6, 2.2);
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
  // The role badge at a tile's top right (style.css, "Roles"): S a starter, Fn a function, O an output.
  // A tile that can be either says both in the panel; on the field it says the one it plays (roleBadges).
  const BADGE = { start: 'I', middle: 'Fn', end: 'O', reader: 'I/Fn', both: 'I/O' };   // I an input (Laurent, 2026-10-07: was S, a starter)
  const BADGE_SAY = { I: 'input', Fn: 'function', O: 'output' };
  const DNAME = id => (DEF.get(id) || { name: id }).name;
  // A tile's profile, in its tooltip and in what it says: what it needs, and the lenses it works best with.
  const profile = d => {
    const parts = [];
    const needs = [...(d.needs || []).map(n => DATA.needs[n]), ...((d.lenses || {}).needs || []).map(x => `${DNAME(x.lens)}${x.why ? ' ' + x.why : ''}`)];
    if (needs.length) parts.push('needs: ' + needs.join(', '));
    if ((d.lenses || {}).best) parts.push('works best with: ' + d.lenses.best.map(DNAME).join(', '));
    const andList = w => (w.length < 3 ? w.join(' and ') : w.slice(0, -1).join(', ') + ' and ' + w[w.length - 1]);   // `list` is defined further down
    if (d.serves) parts.push('the lens for ' + andList(d.serves.map(DNAME)) + (d.adapts ? '; ' + d.adapts : ''));
    if (d.heads) parts.push('her roles: ' + d.heads.map(h => `${h.does} (${h.status})`).join(', '));
    return parts.join('; ');
  };
  const sectionOf = d => (d.role === 'start' || d.role === 'both' || d.role === 'reader' ? 'starters' : d.role === 'middle' ? 'functions' : d.role === 'end' ? 'outputs'
    : d.role === 'lens' || d.gives === 'memory' ? 'lenses' : d.role === 'skill' || d.gives === 'skill' ? 'skills' : d.gives === 'brain' ? 'brains' : 'data');
  const fillCap = (cap, d) => {
    cap.innerHTML = '<span></span>';   // the panel shows what a tile does; its name is in its tooltip and label
    cap.firstChild.textContent = d.words;   // no PLAN tag under the tile (Laurent, 2026-10-07: "no need")
  };
  const makeTile = d => {
    const b = document.createElement('button');
    b.className = 'wtile';
    b.type = 'button';
    Object.assign(b.dataset, { id: d.id, name: d.name, words: d.words, role: d.role, status: d.status,
      params: d.params, ms: d.ms, mb: d.mb, tags: d.tags || '', note: d.note || '' });
    b.style.setProperty('--tc', d.colour);
    b.dataset.kind = d.kind || 'ai';
    if (BADGE[d.role]) b.dataset.badge = BADGE[d.role];
    const prof = profile(d);
    b.setAttribute('aria-label', `${d.name}: ${d.words[0].toLowerCase() + d.words.slice(1)}. ${roleSay(d)[0].toUpperCase() + roleSay(d).slice(1)}. ${d.note}.${prof ? ' ' + prof[0].toUpperCase() + prof.slice(1) + '.' : ''}`);
    const kindSay = { code: 'code: no brain, always does the same', hybrid: 'an AI model with code checks', data: 'your own data' }[d.kind] || 'an AI model';
    b.title = `${d.name}: ${d.words}${prof ? '\n' + prof[0].toUpperCase() + prof.slice(1) : ''}\n${d.note}\n${kindSay[0].toUpperCase() + kindSay.slice(1)}`;
    b.innerHTML = `<svg viewBox="0 0 40 40" aria-hidden="true"><use href="#${drawing(d)}"/></svg>`
      + (d.kind === 'hybrid' ? `<svg class="hy-mark" viewBox="0 0 40 40" aria-hidden="true"><use href="#${codeSymbol('px-code-mark', 2.8, 10.6, 3, 2.6)}"/></svg>` : '');
    return b;
  };
  {
    const scroll = tray.querySelector('.tray-scroll');
    const level = scroll.dataset.head || '2';
    scroll.querySelectorAll('.tray-cols, .tray-head, .tray-grid').forEach(x => x.remove());
    // Inputs, Functions and Outputs stand side by side as three columns, each two tiles wide; the
    // other sections follow under them as before. ROBOTS has the same columns, empty for now.
    const COLUMNS = ['starters', 'functions', 'outputs'];
    const cols = document.createElement('div');
    cols.className = 'tray-cols';
    scroll.append(cols);
    for (const g of DATA.sections) {
      const mine = DATA.tiles.filter(d => sectionOf(d) === g.id);
      if (!mine.length) continue;
      const head = document.createElement('h' + level);
      head.className = 'tray-head';
      head.dataset.section = g.id;
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
      if (COLUMNS.includes(g.id)) {
        const col = document.createElement('div');
        col.className = 'tray-col';
        col.dataset.section = g.id;
        col.append(head, box);
        cols.append(col);
      } else scroll.append(head, box);
    }
    // The colours' key, on the field.
    const legend = document.createElement('div');
    legend.className = 'field-legend';   // the key is for the eye (each item aria-hidden), but for the team's help
    for (const [role, r] of Object.entries(DATA.roles)) {
      const item = document.createElement('span');
      item.setAttribute('aria-hidden', 'true');
      item.dataset.role = role;
      item.innerHTML = '<i></i>';
      item.append(r.label);
      legend.append(item);
    }
    {   // stacked functions (Laurent, 2026-10-07): a team the brain coordinates; a press says how such a team works
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'lg-team';
      item.innerHTML = '<i aria-hidden="true"></i>';
      item.append('functions stacked: a team the brain coordinates');
      item.dataset.help = 'Functions stacked in one column form a team; the brain decides from its blueprint which of them work, in what order, and merges their results into one answer.\n'
        + 'With a Checker after the team: the brain first writes a contract (the tables, endpoints, names and formats, and who does what); each function builds its part to it; '
        + 'the Checker runs every part against the contract; if they fit, the brain puts them together into one answer, each part labelled; '
        + 'if not, it tells the one at fault exactly what to fix, at most three times, then says plainly that it failed.';
      item.title = item.dataset.help;
      item.setAttribute('aria-label', 'How a team of stacked functions works');
      item.addEventListener('click', () => say(item.dataset.help.replace('\n', ' '), 14000));
      legend.append(item);
    }
    for (const [k, label] of [['ai', 'AI model'], ['code', 'code'], ['data', 'data']]) {   // and the three looks
      const item = document.createElement('span');
      item.setAttribute('aria-hidden', 'true');
      item.dataset.kind = k;
      item.className = 'lg-kind';
      item.innerHTML = '<i></i>';
      item.append(label);
      legend.append(item);
    }
    field.append(legend);
  }
  const tiles = [...tray.querySelectorAll('.wtile')];
  let test = null;   // the test running, if any (see "The keys" below)
  const home = new Map(tiles.map(t => [t, t.parentElement]));
  const squares = [...tray.querySelectorAll('.tray-slot .sq')];
  // The Chat window is both where a conversation starts and where a result can be shown, so it is
  // offered in the Outputs too: a mirror of the one tile, which stands in for it (press or drag).
  const mirrors = [];
  for (const d of DATA.tiles.filter(x => x.chat)) {
    const t = tiles.find(x => x.dataset.id === d.id), grid = tray.querySelector('.tray-head[data-section="outputs"]');
    if (!t || !grid) continue;
    const slot = document.createElement('div');
    slot.className = 'tray-slot is-mirror-slot';
    slot.dataset.home = d.id + '-out';
    const sq = document.createElement('div');
    sq.className = 'sq';
    const m = t.cloneNode(true);
    m.classList.add('is-mirror');
    m.dataset.mirror = d.id;
    m.dataset.badge = 'O';   // here it stands for the Chat window as an output
    m.dataset.plays = 'end';
    m.setAttribute('aria-label', `${d.name}, as an output: the result is shown in a chat box. Press to place the ${d.name}.`);
    sq.append(m);
    const cap = document.createElement('p');
    cap.className = 'cap';
    cap.innerHTML = '<span></span>';
    cap.firstChild.textContent = 'The result, shown in a chat box';
    slot.append(sq, cap);
    grid.nextElementSibling.prepend(slot);
    mirrors.push([m, t]);
  }
  const syncMirrors = () => mirrors.forEach(([m, t]) => m.closest('.tray-slot').classList.toggle('is-empty', !home.get(t).contains(t)));

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
      return (o.role === 'start' || o.role === 'reader' || fitsKinds(h.out, o.in)) && (o.role === 'end' || fitsKinds(o.out, h.in));
    }
    if (across) return x.role !== 'end' && y.role !== 'start' && fitsKinds(x.out, y.in);
    const fn = r => r === 'middle' || r === 'reader';
    if (fn(x.role) && fn(y.role) && (x.role === 'middle' || y.role === 'middle')) return true;   // two functions: one team
    return x.role === y.role && (x.role === 'start' || x.role === 'reader' || x.in.some(k => y.in.includes(k)));   // a team of the same role (inputs, outputs)
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

  // On the field, a tile that can play two roles wears the letter of the one it plays now: a reader fed
  // by the tile before it, or called by Siren, is a function (Fn), else an input (I); the Chat window
  // after a chain is an output (O), before one an input (I), and beside Siren both (I/O). In the panel
  // it says both again.
  const roleBadges = () => {
    const res = check(board());
    for (const t of tiles) {
      const d = defOf(t);
      if (d.role !== 'reader' && d.role !== 'both') continue;
      const p = onField(t) ? res.board.find(x => x.tile === t) : null;
      const st = p && res.stageOf.get(p);
      let plays = null;
      if (st && d.role === 'reader') plays = st.preds.size || st.hubs.size ? 'middle' : 'start';
      else if (st && !st.hubs.size) plays = st.preds.size ? 'end' : st.succs.size ? 'start' : null;
      t.dataset.badge = plays ? BADGE[plays] : BADGE[d.role];
      if (plays) t.dataset.plays = plays; else delete t.dataset.plays;
    }
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
    roleBadges();
    joints(group);
    writeCode(group, all.length - (group.length ? 1 : 0));
    lensHints();
    syncMirrors();
    teamBrains(all);
    liveGuide();
    refilter();
  };
  // ---- The live guide. Whenever a tile is placed, the square under it says at once whether it joins
  // its neighbours rightly, by TesT's own rules: a soft green glow and a tick, or a soft red one and
  // a cross whose title (or a press) gives the reason; a tile alone, or a chain still being built,
  // says nothing. Only what is wrong NOW counts: an order the wrong way round, kinds that do not
  // fit, a lens beside the wrong model. Then, beside a rightly placed tile, the free square to its
  // right (and, on a wide screen, the one below it: for a function, another function to work with it
  // as a team; for an input or an output, another of its role for the brain to coordinate) shows faint "ghosts" of
  // every tile that would fit there, each with one word; a press on a ghost places that tile. ----
  const LIVE = new Set(['no fit', 'wrong order', 'misplaced lens']);
  const WORD = { facts: 'facts', table: 'table', document: 'documents', image: 'image', design: 'design', plan: 'plan',
    code: 'code', findings: 'checks', ranking: 'search', request: 'task', question: 'ask', text: 'chat', message: 'help', spec: 'answer', reading: 'reading' };
  const wordOf = d => d.word || (d.role === 'lens' ? 'lens' : WORD[(d.out || [])[0]] || 'result');
  const faultsAt = (b, at) => check(b).all.filter(e => LIVE.has(e.big) && (e.p === at || (e.other || []).includes(at)));
  const markCell = (cell, faults) => {
    cell.classList.remove('is-ok', 'is-bad');
    cell.querySelectorAll(':scope > .fit-mark').forEach(x => x.remove());
    if (!faults) return;
    cell.classList.add(faults.length ? 'is-bad' : 'is-ok');
    const m = document.createElement('button');
    m.type = 'button';
    m.className = 'fit-mark';
    m.textContent = faults.length ? '\u2715' : '\u2713';
    m.title = faults.length ? faults[0].sentence : 'This tile joins its neighbours rightly.';
    m.setAttribute('aria-label', m.title);
    m.addEventListener('click', e => { e.stopPropagation(); say(m.title, 4200); });
    cell.append(m);
  };
  const liveVerdict = (b, at) => {   // null: nothing to say (alone); else the faults that involve it now
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, dr]) => b.some(p => p.c === at.c + dc && p.r === at.r + dr));
    return near ? faultsAt(b, at) : null;
  };
  const ghostsFor = (b, at, cell) => {   // every panel tile that may stand in this free square, rightly
    const [c, r] = posOf(cell);
    return tiles.filter(t => !isAtt(t) && !onField(t) && !t.classList.contains('is-dragging')).filter(t => {
      const q = { id: t.dataset.id, c, r, att: new Set(), attIds: new Set() };
      const bb = [...b, q];
      return !faultsAt(bb, q).length && !faultsAt(bb, bb.find(p => p.c === at.c && p.r === at.r)).length;
    }).sort((x, y) => (defOf(x).in || []).includes('*') - (defOf(y).in || []).includes('*'));
  };
  const showGhosts = (cell, list, join = false) => {
    if (!list.length) return;
    let i = 0;
    const g = document.createElement('div');
    g.className = 'ghost';
    g.dataset.all = list.map(t => t.dataset.id).join(' ');
    const face = document.createElement('button');
    face.type = 'button';
    face.className = 'ghost-face';
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'ghost-more';
    const draw = () => {
      const t = list[i], d = defOf(t);
      g.dataset.id = t.dataset.id;
      g.style.setProperty('--tc', d.colour);
      face.dataset.kind = d.kind || 'ai';
      face.innerHTML = `<svg viewBox="0 0 40 40" aria-hidden="true"><use href="#${drawing(d)}"/></svg><span class="ghost-word"></span>`;
      face.querySelector('.ghost-word').textContent = wordOf(d);
      face.setAttribute('aria-label', join ? `Add ${d.name} to the team here (${wordOf(d)})` : `Place ${d.name} here (${wordOf(d)})`);
      g.dataset.join = String(join);
      face.title = `${d.name}: ${d.words}`;
      more.textContent = `+${list.length - 1}`;
      more.setAttribute('aria-label', `Show the next of ${list.length} tiles that fit here`);
    };
    face.addEventListener('click', e => {
      e.stopPropagation();
      const t = list[i];
      if (!t || onField(t) || tileIn(cell)) return;
      resetTest();
      place(t, cell, { magnet: true });
      last = t;
      defaults(t);
      count();
    });
    more.addEventListener('click', e => { e.stopPropagation(); i = (i + 1) % list.length; draw(); });
    g.append(face);
    if (list.length > 1) g.append(more);
    draw();
    cell.append(g);
    if (!still.matches) g.animate([{ opacity: 0, transform: 'scale(.85)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'ease-out' });
  };
  // ---- A complete team (a chain from a Starter to an Output, rightly ordered and fitting; what is
  // still to attach does not matter here) gets a small "start" mark on its starter(s) and "end" on
  // its output(s); FLOW then plays an arrow through it, in working order. ----
  const COMPLETE_BLOCKERS = new Set(['ends', 'orphan', 'order', 'kinds']);
  const chainOf = () => {
    const b = board();
    if (!b.length) return null;
    const res = check(b);
    if (res.all.some(e => COMPLETE_BLOCKERS.has(e.cat))) return null;
    const st = p => res.stageOf.get(p);
    const steps = res.board.filter(p => st(p));
    const starts = steps.filter(p => !st(p).preds.size && isStart(D(p.id)) && (!res.hub || !st(p).hubs.size || D(p.id).chat || !st(p).succs.size === false));
    const ends = steps.filter(p => !st(p).succs.size && isEnd(D(p.id)));
    return { res, starts: starts.filter(p => !st(p).hubs.size || D(p.id).chat || st(p).succs.size), ends };
  };
  // The arrow's journey, as levels of hops [from tile, to tile] played one level after another.
  const flowLevels = chain => {
    const { res } = chain, st = p => res.stageOf.get(p), h = res.hub, levels = [];
    // The brain of a team of stacked functions, as a stop of its own: the work goes into it, it sends each
    // tile of the team its orders (a short stagger), their results come back to it, and it hands on one answer.
    const S = parseFloat(grid.style.getPropertyValue('--cell')) || 96, G = parseFloat(grid.style.getPropertyValue('--gap')) || 12;
    const gr = grid.getBoundingClientRect();
    const chip = res.board.flatMap(p => docked(p.tile)).find(c => givesOf(c) === 'brain');
    const viaBrain = new Set();   // stages whose work the brain hands on (a Checker after a team)
    const brainAt = chip ? (() => { const r = chip.getBoundingClientRect();
      return { id: chip.dataset.id, tile: chip, c: (r.left + r.width / 2 - gr.left - S / 2) / (S + G), r: (r.top + r.height / 2 - gr.top - S / 2) / (S + G) }; })() : null;
    const allStages = [...new Set([...res.stageOf.values()])];
    const seen = new Set();
    const pipeOn = frontier => {   // from these stages along the pipes, one level per step
      while (frontier.length) {
        const next = [...new Set(frontier.flatMap(x => [...x.succs].map(st)))].filter(x => !seen.has(x));
        const hops = frontier.flatMap(x => [...x.succs].map(st).filter(y => next.includes(y)).flatMap(y => x.members.flatMap(g => y.members.map(m => [g, m]))));
        // a team's work leaves through the brain, and comes into a team through the brain; a team with a
        // Checker after it hands its parts to the Checker, which reports to the brain (one fix round shown)
        const inTeam = p => !!brainAt && p !== brainAt && !!st(p) && st(p).team;
        const isChk = p => p !== brainAt && !!DEF.get(p.id) && !!DEF.get(p.id).checker;
        const checkerOf = x => [...x.succs].find(isChk);
        const seenHop = new Set(), step = [], checked = [];
        for (const [g0, m] of hops) {
          const toChecker = inTeam(g0) && isChk(m) && checkerOf(st(g0)) === m;
          const g = toChecker ? g0 : (inTeam(g0) || viaBrain.has(st(g0))) ? brainAt : g0, to = inTeam(m) ? brainAt : m;
          if (toChecker && !checked.some(([c]) => c === m)) checked.push([m, st(g0).members]);
          if (g === to || seenHop.has(g.id + '>' + to.id)) continue;
          seenHop.add(g.id + '>' + to.id);
          step.push([g, to]);
        }
        if (step.length) levels.push(step);
        for (const [c, members] of checked) {   // the Checker reports to the brain; a fix order to one function; checked again; back to the brain
          levels.push([[c, brainAt]], [[brainAt, members[0], 0, 'fix']], [[members[0], c, 0, 'fix']], [[c, brainAt]]);
          viaBrain.add(st(c));
        }
        const team = [...new Set(hops.map(([, m]) => m).filter(inTeam))];
        if (team.length) {   // the brain sends each its orders, one after another
          levels.push(team.map((m, i) => [brainAt, m, i * 120]));
          if (!checkerOf(st(team[0])) && st(team[0]).succs.size) levels.push(team.map((m, i) => [m, brainAt, i * 120]));   // and their results come back to it (not from outputs)
        }
        next.forEach(x => seen.add(x));
        frontier = next;
      }
    };
    const chats = allStages.filter(x => x.members.some(p => D(p.id).chat) && x.hubs.size);
    const sources = allStages.filter(x => !x.preds.size && !x.hubs.size);
    sources.forEach(x => seen.add(x));
    const fed = sources.filter(x => x.team && brainAt).flatMap(x => x.members);   // stacked inputs all feed the brain
    if (fed.length) levels.push(fed.map((m, i) => [m, brainAt, i * 120]));
    if (sources.length) pipeOn(sources);
    if (h) {
      chats.forEach(x => seen.add(x));
      levels.push(chats.flatMap(x => x.members.filter(p => D(p.id).chat).map(p => [p, h])));
      const called = allStages.filter(x => x.hubs.size && !chats.includes(x));
      called.forEach(x => seen.add(x));
      const calls = called.flatMap(x => x.members.map(m => [h, m]));
      if (calls.length) levels.push(calls);
      pipeOn(called.filter(x => x.succs.size));
      const back = called.filter(x => !x.succs.size).flatMap(x => x.members.map(m => [m, h]));
      if (back.length) levels.push(back);
      levels.push(chats.flatMap(x => x.members.filter(p => D(p.id).chat).map(p => [h, p])));
    }
    return levels.filter(l => l.length);
  };
  const chainMarks = chain => {
    grid.querySelectorAll('.chain-mark').forEach(x => x.remove());
    keyFlow.classList.toggle('is-off', !chain);
    keyFlow.setAttribute('aria-disabled', String(!chain));
    if (!chain) return;
    const put = (p, word) => {
      const cell = p.tile.parentElement;
      let m = cell.querySelector(':scope > .chain-mark');
      if (!m) { m = document.createElement('i'); m.className = 'chain-mark'; cell.append(m); }
      m.textContent = m.textContent ? m.textContent + ' \u00b7 ' + word : word;
      m.dataset.mark = m.textContent;
    };
    chain.starts.forEach(p => put(p, 'start'));
    chain.ends.forEach(p => put(p, 'end'));
  };
  const liveGuide = () => {
    chainMarks(drag ? null : chainOf());
    cells.forEach(cell => { markCell(cell, null); cell.querySelectorAll(':scope > .ghost').forEach(x => x.remove()); });
    if (drag || !last || !onField(last)) return;
    const b = board(), at = b.find(p => p.tile === last);
    const verdict = liveVerdict(b, at);
    markCell(last.parentElement, verdict);
    if (verdict && verdict.length) return;   // ghosts only beside a tile that stands rightly
    const [c, r] = posOf(last.parentElement);
    const spots = [cellAt(c + 1, r), ...(phone.matches ? [] : [cellAt(c, r + 1)])].filter(x => x && !tileIn(x));
    // below: under a function, the functions that can join its team; under an input or an output, another of its role, for the same pool
    const role = last.dataset.role, res0 = check(b), st0 = res0.stageOf.get(at);
    const isFn = role === 'middle' || (role === 'reader' && !!st0 && st0.preds.size > 0);
    for (const cell of spots) {
      const below = !(cell === spots[0] && posOf(cell)[1] === posOf(last.parentElement)[1]);
      let list = ghostsFor(b, at, cell).filter(t => !below || (isFn ? t.dataset.role === 'middle' || t.dataset.role === 'reader' : t.dataset.role === role));
      // to the right of a team that writes code in several languages, with no Checker yet: the Checker first
      if (!below && st0 && st0.team && st0.members.filter(p => defOf(p.tile).writesCode).length > 1 && ![...st0.succs].some(q => defOf(q.tile).checker)) {
        list = [...list.filter(t => defOf(t).checker), ...list.filter(t => !defOf(t).checker)];
      }
      showGhosts(cell, list, below && isFn);
    }
  };
  // While a tile is dragged over a square, that square already says green or red.
  const hoverVerdict = (tile, cell) => {
    if (isAtt(tile)) return null;
    const [c, r] = posOf(cell);
    const q = { id: tile.dataset.id, c, r, att: new Set(docked(tile).map(givesOf)), attIds: new Set(docked(tile).map(x => x.dataset.id)) };
    return liveVerdict([...board().filter(p => p.tile !== tile), q], q);
  };

  // The team's brain: a tile that needs a brain and has none of its own gets a small faded copy of the
  // brain its team shares, at its corner, saying so; with no brain in the team, nothing is drawn.
  const teamBrains = all => {
    grid.querySelectorAll('.team-brain').forEach(x => x.remove());
    for (const g of all) {
      const brains = g.flatMap(docked).filter(c => givesOf(c) === 'brain');
      if (!brains.length) continue;
      const b = brains[0], d = defOf(b), where = d.where || 'local';
      for (const t of g) {
        if (!(defOf(t).needs || []).includes('brain') || docked(t).some(c => givesOf(c) === 'brain')) continue;
        const m = document.createElement('i');
        m.className = 'team-brain';
        m.dataset.brain = b.dataset.id;
        m.title = `${t.dataset.name} uses the team\u2019s brain (${d.name.replace(/ remote$/, '')} \u00b7 ${where})`;
        m.setAttribute('aria-label', m.title);
        m.innerHTML = `<svg viewBox="0 0 40 40" aria-hidden="true"><use href="#px-${b.dataset.id}"/></svg>`;
        t.parentElement.append(m);
      }
    }
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
      say(`${host.dataset.name} ${p.replace(/^needs: /, 'needs ').replace(/; works best with: /, '; works best with ')}. The lens is marked in the panel.`, 4200);
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
  const wants = host => { const d = defOf(host); return [...(d.needs || []), ...(d.startNeeds || []), ...(d.takes || [])]; };
  const canDock = (host, att) => !!host && !isAtt(host) && onField(host)
    && (wants(host).includes(givesOf(att)) || (givesOf(att) === 'brain' && ['ai', 'hybrid'].includes(host.dataset.kind) && !isLensT(host))
      || (givesOf(att) === 'skill' && (defOf(att).serves || []).includes(host.dataset.id)))
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
    if (!sq.classList.contains('cell')) delete tile.dataset.auto;
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
  // ---- Defaults (Laurent, 2026-10-07: "put 27B with it by default"; "by default add lenses and skills on
  // compatible models"). A tile put on the field FROM THE PANEL arrives with what it is best with, exactly
  // as if each had been picked by hand: the brain named by tiles.js "defaultBrain" when it needs a brain
  // and its team has none yet; the skill, when the skill serves it; and MAGNOLIA, above or below it, when
  // she serves it and is still in the panel (there is one lens). Each happens once, on arrival: taken off
  // afterwards, nothing puts it back for that tile. A tile moved on the field gets nothing. ----
  const autoLensSpot = host => {
    const [c, r] = posOf(host.parentElement);
    const free = [cellAt(c, r - 1), cellAt(c, r + 1)].filter(x => x && !tileIn(x));
    return free.find(x => !neighbours(x).some(n => n !== host.parentElement && tileIn(n))) || free[0] || null;   // touching nothing else first
  };
  const defaults = (t, { brain = true, lens = true, skill = true } = {}) => {
    if (!t || !onField(t) || isAtt(t) || isLensT(t)) return;
    const d = defOf(t);
    const o = DATA.defaultBrain && original(DATA.defaultBrain);
    // the brain goes to a tile that needs one, or, when this tile has just made (or joined) a team of
    // stacked functions, to the first tile of that team that can take it
    let brainHost = (d.needs || []).includes('brain') && o && canDock(t, o) ? t : null;
    if (brain && o && !brainHost) {
      const b = board(), res = check(b), st = res.stageOf.get(b.find(p => p.tile === t));
      if (st && st.team) brainHost = [t, ...st.members.map(p => p.tile), ...(groups().find(g => g.includes(t)) || [])].find(x => canDock(x, o)) || null;   // a stack of code tiles: any tile of the team that thinks
    }
    if (brain && o && brainHost
        && !(groups().find(g => g.includes(t)) || [t]).flatMap(docked).some(c => givesOf(c) === 'brain')) {
      const c = copyOf(o);
      dockOnto(c, brainHost, false);
      c.dataset.auto = 'brain';
    }
    if (skill) for (const k of tiles.filter(x => isAtt(x) && givesOf(x) === 'skill' && (defOf(x).serves || []).includes(d.id))) {
      if (!canDock(t, k)) continue;
      const c = copyOf(k);
      dockOnto(c, t, false);
      c.dataset.auto = 'skill';
    }
    if (lens) for (const L of tiles.filter(x => isLensT(x) && !onField(x) && (defOf(x).serves || []).includes(d.id))) {
      const cell = autoLensSpot(t);
      if (!cell) continue;
      place(L, cell, { magnet: true });
      L.dataset.auto = 'lens';
    }
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
    target.el.classList.remove('is-target', 'is-magnet', 'is-host', 'is-ok', 'is-bad');
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
    const r = (drag.rectFrom || tile).getBoundingClientRect();
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
      if (t.sq && t.sq.classList.contains('cell') && !t.host) {   // the live guide, before the drop
        const v = hoverVerdict(tile, t.sq);
        t.el.classList.toggle('is-ok', !!v && !v.length);
        t.el.classList.toggle('is-bad', !!v && !!v.length);
      }
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
      if (t.sq.classList.contains('cell')) {
        last = tile;
        if (from && from.classList.contains('sq')) defaults(tile);   // from the panel, not moved on the field
      }
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
      } else if (mend && mend.mode === 'beside' && onField(mend.host)) {   // beside it: on its left first
        const [c, r] = posOf(mend.host.parentElement);
        const cell = [cellAt(c - 1, r), cellAt(c, r - 1), cellAt(c, r + 1), cellAt(c + 1, r)].find(x => x && !tileIn(x));
        if (!cell) { say(`There is no free square beside ${mend.host.dataset.name}.`); return; }
        place(tile, cell, { magnet: true });
        last = tile;
        defaults(tile);
        endFix();
      } else if (mend && mend.mode === 'replace' && (tileIn(mend.cell) === mend.host || !tileIn(mend.cell))) {
        if (tileIn(mend.cell)) place(mend.host, backToPanel(mend.host));
        place(tile, mend.cell, { magnet: true });
        last = tile;
        defaults(tile);
        endFix();
      } else {
        const cell = nextCell();
        if (!cell) return;
        const magnet = neighbours(cell).some(tileIn);
        place(tile, cell, { magnet });
        last = tile;
        defaults(tile);
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
  for (const [m, t] of mirrors) {   // the mirror hands every press and drag to the tile it stands for
    m.addEventListener('pointerdown', e => {
      if (e.button !== 0 || drag || !home.get(t).contains(t)) return;
      drag = { tile: t, id: e.pointerId, x0: e.clientX, y0: e.clientY, moving: false, rectFrom: m };
      window.addEventListener('pointermove', onMove, { passive: false });
      window.addEventListener('pointerup', onEnd);
      window.addEventListener('pointercancel', onEnd);
    });
    m.addEventListener('dragstart', e => e.preventDefault());
    m.addEventListener('click', () => { if (!swallowClick && !drag && home.get(t).contains(t)) t.click(); });
  }

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
  // PIPE); tiles stacked in one column make a STAGE, and a stage of two or more is a TEAM the brain
  // coordinates (it needs one): stacked functions do what its blueprint gives each, stacked inputs all
  // feed it, and it sends the answer to one, several or all of stacked outputs; a tile
  // touching Siren (a hub) is a specialist she CALLS, and its answer comes back to her. The checks
  // run in order and the first that fails is the answer: (1) a start and an end; (2) one piece, and
  // every start reaching an end, with nothing before a start, nothing after an end, and no middle
  // tile cut off on either side; (3) every two touching tiles fitting, in the direction the work
  // goes; (4) every tile having the attachments it needs. Each fault names the tile at fault (p),
  // and the tile it could not follow (other) when there is one. ----
  const D = id => DEF.get(id);
  const isStart = d => d.role === 'start' || d.role === 'both' || d.role === 'reader';   // a reader may start
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
    const lone = p => !!p && D(p.id).chat;   // a Chat window stacks with nothing: it is never in a pool
    for (const p of board) {
      if (stageOf.has(p) || hub(p)) continue;
      const st = { members: [], preds: new Set(), succs: new Set(), hubs: new Set() };
      if (lone(p)) { st.members.push(p); stageOf.set(p, st); continue; }
      let r0 = p.r;
      while (get(p.c, r0 - 1) && !hub(get(p.c, r0 - 1)) && !lone(get(p.c, r0 - 1))) r0--;
      for (let r = r0; get(p.c, r) && !hub(get(p.c, r)) && !lone(get(p.c, r)); r++) { st.members.push(get(p.c, r)); stageOf.set(get(p.c, r), st); }
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
    // Functions stacked in one column form a TEAM (Laurent, 2026-10-07: "when function are placed one above
    // the other (vertically) it means they work equally in team"; "it will be depending on the blueprint
    // received by the BRAIN. It will alternate them and synchronise them to give one unified response"):
    // the brain decides from its blueprint which of them work, in what order, and merges their results
    // into one answer.
    // Then the same for stacked inputs and stacked outputs (Laurent, 2026-10-07): stacked inputs all feed the
    // brain, which handles whatever arrives from any of them; for stacked outputs the brain decides, per
    // request, to which one, several or all the answer goes. Every stack is a pool the brain coordinates.
    for (const st of new Set(stageOf.values())) {
      st.team = st.members.length > 1;
      st.pool = !st.team ? null : !st.preds.size && !st.hubs.size && st.members.every(p => isStart(D(p.id))) ? 'inputs'
        : !st.succs.size && !st.hubs.size && st.members.every(p => isEnd(D(p.id))) ? 'outputs' : 'functions';
    }
    const outsOf = ps => [...new Set(ps.flatMap(q => D(q.id).out))];
    const errs = [];
    const add = (cat, p, sentence, big, more = {}) => errs.push({ cat, p, sentence, big, mode: 'replace', ...more });
    // (1) a start and an end
    const sources = board.filter(p => !hub(p) && !stageOf.get(p).preds.size && !stageOf.get(p).hubs.size);
    const sinks = board.filter(p => !hub(p) && !stageOf.get(p).succs.size && !stageOf.get(p).hubs.size);
    // Siren talks only inside a Chat window: the conversation starts and ends there
    const chatless = board.filter(p => hub(p) && !around(p).some(q => D(q.id).chat));
    for (const p of chatless) add('ends', p, `${nm(p)} talks only inside a Chat window: a conversation starts and ends there, so put a Chat window beside ${nm(p)}.`, 'no chat window', { mode: 'beside', ids: DATA.tiles.filter(d => d.chat).map(d => d.id) });
    if (!board.length) for (const p of full) add('ends', p, `${nm(p)} is a lens: it is not a model by itself; put it beside ${list((D(p.id).serves || []).map(DNAME))}.`, 'no model', { mode: 'none' });
    if (!chatless.length && board.length && !board.some(p => isStart(D(p.id)))) {
      for (const p of (sources.length ? sources : board)) {
        const d = D(p.id);
        add('ends', p, `Nothing starts this chain: ${d.name} ${d.in.length ? `needs ${kinds(d.in)}, and ` : ''}only an Input can begin a chain.`, 'no start');
      }
    }
    if (!chatless.length && board.length && !board.some(p => isEnd(D(p.id)))) {
      for (const p of (sinks.length ? sinks : board)) {
        const d = D(p.id);
        add('ends', p, `Nothing ends this chain: ${d.name} hands on ${kinds(d.out)}, and only an Output can give the result.`, 'no end');
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
      if (hub(p) || D(p.id).role === 'both') continue;   // a start and an end at once may stand anywhere
      const d = D(p.id), st = stageOf.get(p);
      const before = st.preds.size > 0, after = st.succs.size > 0, called = st.hubs.size > 0;
      if (d.role === 'start' && before) add('order', p, `${d.name} cannot follow ${names([...st.preds])}: ${d.name} starts a chain, so nothing can come before ${d.name}.`, 'wrong order', { other: [...st.preds] });
      else if (d.role === 'end' && after) add('order', p, `Nothing can follow ${d.name}: ${d.name} ends a chain, and ${names([...st.succs])} ${st.succs.size > 1 ? 'are' : 'is'} after ${d.name}.`, 'wrong order', { other: [...st.succs] });
      else if (d.role !== 'start' && d.role !== 'reader' && !before && !called) add('order', p, `Nothing comes before ${d.name}: ${d.name} needs ${kinds(d.in)}, from a start tile on the left or from Siren beside it.`, 'no start');
      else if (d.role !== 'end' && !after && !called) add('order', p, `What ${d.name} gives goes nowhere: ${d.name} hands on ${kinds(d.out)}, and a chain must end in a tile that gives the result.`, 'dead end');
    }
    // An Input straight into an Output (Laurent, 2026-10-07: input -> function -> output): an input only
    // brings the data in, an output gives the result of the work, so a Function goes between them. A pure
    // input is a starter, the Chat window where a conversation starts, or a code reader (the Feeder) with
    // nothing before it; a model that reads (Orchid, Tulip, Cricket) does work of its own and counts as a function.
    const pureIn = p => { const d = D(p.id), st = stageOf.get(p);
      return !!st && !st.preds.size && !st.hubs.size && (d.role === 'start' || d.role === 'both' || (d.role === 'reader' && (d.kind || 'ai') === 'code')); };
    const playsOut = p => { const d = D(p.id), st = stageOf.get(p); return !!st && !st.hubs.size && (d.role === 'end' || (d.role === 'both' && st.preds.size > 0)); };
    for (const e of edges.filter(x => x.type === 'pipe')) {
      const L = stageOf.get(e.from), R = stageOf.get(e.to);
      if (!L.members.every(pureIn)) continue;
      for (const m of R.members.filter(playsOut)) {
        if (errs.some(x => x.cat === 'order' && x.p === m && x.big2 === 'no function')) continue;
        add('order', m, `${nm(m)} cannot come straight after ${names(L.members)}: ${names(L.members)} only ${L.members.length > 1 ? 'bring' : 'brings'} the data in, and ${nm(m)} gives the result of the work, so put a Function between them.`, 'wrong order', { other: L.members, big2: 'no function' });
      }
    }
    // (3) every two touching tiles fit
    const piped = new Map();
    for (const e of edges) {
      if (e.type === 'pipe' && (stageOf.get(e.from).team || stageOf.get(e.to).team)) {
        // a team: what the tiles of a team hand on is joined, and the brain hands each of a team its
        // orders, so a team takes the work when one of its tiles can
        const L = stageOf.get(e.from), R = stageOf.get(e.to);
        if (piped.has(L) && piped.get(L).has(R)) continue;
        if (!piped.has(L)) piped.set(L, new Set());
        piped.get(L).add(R);
        const givers = L.team ? [{ ps: L.members, name: list(L.members.map(nm)), out: outsOf(L.members) }]
          : L.members.map(g => ({ ps: [g], name: nm(g), out: D(g.id).out }));
        for (const g of givers) {
          if (!g.out.length) continue;
          if (R.team) {
            if (!R.members.some(m => fitsKinds(g.out, D(m.id).in))) add('kinds', R.members[0], `${list(R.members.map(nm))} cannot follow ${g.name}: ${g.name} ${g.ps.length > 1 ? 'give' : 'gives'} ${kinds(g.out)}, and none of them takes it.`, 'no fit', { other: g.ps });
          } else for (const m of R.members) {
            const b = D(m.id);
            if (b.role === 'start') continue;
            if (!fitsKinds(g.out, b.in)) add('kinds', m, `${b.name} cannot follow ${g.name}: ${g.name} ${g.ps.length > 1 ? 'give' : 'gives'} ${kinds(g.out)}, ${b.name} needs ${kinds(b.in)}.`, 'no fit', { other: g.ps });
          }
        }
      } else if (e.type === 'pipe') {   // one tile to one tile
        for (const g of stageOf.get(e.from).members) for (const m of stageOf.get(e.to).members) {
          if (piped.has(g.id + '|' + m.id)) continue;
          piped.set(g.id + '|' + m.id, true);
          const a = D(g.id), b = D(m.id);
          if (b.role === 'start' || !a.out.length) continue;   // the order check names these
          if (!fitsKinds(a.out, b.in)) add('kinds', m, `${b.name} cannot follow ${a.name}: ${a.name} gives ${kinds(a.out)}, ${b.name} needs ${kinds(b.in)}.`, 'no fit', { other: [g] });
        }
      } else {
        for (const m of stageOf.get(e.to).members) {
          const h = D(e.from.id), x = D(m.id);
          if (x.role !== 'start' && !(x.role === 'reader' && !stageOf.get(m).preds.size) && !fitsKinds(h.out, x.in)) add('kinds', m, `${h.name} cannot call ${x.name}: ${h.name} gives ${kinds(h.out)}, ${x.name} needs ${kinds(x.in)}.`, 'no fit', { other: [e.from] });
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
    const fedWith = p => new Set([...(stageOf.get(p) || { preds: [] }).preds].flatMap(q => D(q.id).out));
    // a brain is the team's: one brain anywhere in a connected team serves every tile there that needs one
    const brainOf = p => [...(p.attIds || [])].find(id => (DEF.get(id) || {}).gives === 'brain');
    const POOL_SAY = { functions: 'it makes a blueprint from the input, decides which of them work and in what order, and merges their results into one answer.',
      inputs: 'all of them feed it, and it handles whatever arrives from any of them.', outputs: 'it decides, for each request, to which one, several or all of them the answer goes.' };
    const POOL_DOES = { functions: 'decides from its blueprint which of them work, in what order, and merges their results into one answer.',
      inputs: 'takes in whatever arrives from any of them.', outputs: 'decides, for each request, to which one, several or all of them the answer goes.' };
    const brainSay = id => `${DNAME(id).replace(/ remote$/, '')} (${(DEF.get(id) || {}).where || 'local'})`;
    for (const piece of pieces) {
      const thinkers = piece.filter(p => (D(p.id).needs || []).includes('brain'));
      // a team of stacked functions needs the brain too: it turns the input into a blueprint and gives each its orders
      const teams = [...new Set(piece.map(p => stageOf.get(p)).filter(st => st && st.team))];
      if (!thinkers.length && !teams.length) continue;
      const own = thinkers.filter(brainOf), shared = piece.map(brainOf).find(Boolean);
      if (!shared) {
        const t = teams[0], canThink = p => ['ai', 'hybrid'].includes(D(p.id).kind || 'ai') && !isLensD(p);
        const host = thinkers[0] || t.members.find(canThink) || piece.find(canThink) || t.members[0];
        add('needs', host, thinkers.length
          ? 'This team needs a brain: attach one (Qwen or Glimmer, local or remote) to any tile \u2014 every tile that needs a brain will share it.'
          : `${list(t.members.map(nm))} are stacked, so they form a team, and a team needs a brain: ${POOL_SAY[t.pool]} Attach one (Qwen or Glimmer, local or remote) to any tile.`,
          'needs a brain', { mode: 'attach', need: 'brain', team: thinkers.length ? null : t.members.map(nm) });
        continue;
      }
      for (const t of teams) {
        notes.push(`${list(t.members.map(nm))} form a team: the brain, ${brainSay(shared)}, ${POOL_DOES[t.pool]}`);
        const coders = t.members.filter(p => D(p.id).writesCode), checker = [...t.succs].find(q => D(q.id).checker);
        if (checker) notes.push(`The brain writes a contract (tables, endpoints, names, formats, who does what); ${list(t.members.map(nm))} build their parts to it; the ${nm(checker)} runs every part against it. On a pass the brain assembles one answer${coders.length ? `, each part labelled (${list([...new Set(coders.map(p => D(p.id).writesCode))])})` : ''}; on a fail it sends a fix order to the one at fault, at most three rounds, then says plainly that it failed.`);
        else if (coders.length > 1) notes.unshift('This team writes code in several languages with nothing to check that the parts fit. Add a Checker.');   // a warning, not a fault
      }
      if (!thinkers.length) continue;
      if (thinkers.every(brainOf)) {   // each has its own: say each one's
        for (const p of thinkers) notes.push(`${nm(p)} uses ${p.id === 'siren' ? 'her' : 'its'} own brain, ${brainSay(brainOf(p))}.`);
        continue;
      }
      const sharers = thinkers.filter(p => !brainOf(p) || brainOf(p) === shared);
      if (sharers.length > 1 || sharers.some(p => !brainOf(p))) notes.push(`${names(sharers)} ${sharers.length > 1 ? 'share' : 'uses'} the team\u2019s brain, ${brainSay(shared)}.`);
      for (const p of own.filter(p => brainOf(p) !== shared)) notes.push(`${nm(p)} uses ${p.id === 'siren' ? 'her' : 'its'} own brain, ${brainSay(brainOf(p))}.`);
    }
    for (const p of board) for (const need of D(p.id).needs || []) {
      if (need === 'brain') continue;   // the team's, above
      const waive = (D(p.id).unlessFed || {})[need];
      if (waive && fedWith(p).has(waive)) continue;
      if (!p.att.has(need)) add('needs', p, `${nm(p)} needs ${DATA.needs[need]}: attach one onto ${nm(p)}.`, `needs ${DATA.needs[need].replace(/^an? /, '')}`, { mode: 'attach', need });
    }
    // a Chat window at the end of a chain, with no Siren: the result is shown in a chat box
    for (const p of board.filter(q => D(q.id).chat && stageOf.get(q).preds.size && !stageOf.get(q).hubs.size)) {
      const got = [...new Set([...stageOf.get(p).preds].flatMap(q => D(q.id).out))];
      notes.push(`The ${kinds(got).replace(/^an? /, '')} ${got.length > 1 || /s$/.test(got[0]) ? 'are' : 'is'} shown in the Chat window, a chat box.`);
    }
    // a reader with nothing before it starts the chain from its own attachment; fed, it needs none
    for (const p of board) {
      const d = D(p.id);
      if (d.role !== 'reader' || hub(p)) continue;
      const fed = [...stageOf.get(p).preds];
      if (fed.length) {
        const a = D(fed[0].id), got = a.out.filter(k => d.in.includes(k));
        if (fed.length === 1 && got.length && stageOf.get(p).succs.size) notes.push(`${d.name} reads the ${kinds(got).replace(/^an? /, '')} ${a.name} brings and hands ${kinds(d.out).replace(/^an? /, '')} to ${names([...stageOf.get(p).succs])}.`);
        continue;
      }
      for (const need of d.startNeeds || []) {
        if (!p.att.has(need)) add('needs', p, `${d.name} has nothing to read: attach ${DATA.needs[need]} onto ${d.name}, or put a tile that brings ${kinds(d.in)} before ${d.name}.`, `needs ${DATA.needs[need].replace(/^an? /, '')}`, { mode: 'attach', need });
      }
    }
    for (const p of board) {
      const L = D(p.id).lenses;
      if (!L) continue;
      const has = new Set(around(p).filter(isLensD).map(q => q.id));
      for (const x of L.needs || []) {
        if (has.has(x.lens)) continue;
        if (x.unless && (p.attIds || new Set()).has(x.unless)) { notes.push(`${DNAME(x.lens)} is optional for ${nm(p)} on ${DNAME(x.unless)}.`); continue; }
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
    // from its start ("Orchid or Tulip → Bouquet → Jasmine → Iris, Thistle or Lily"; stacked functions
    // read "Tulip and Daisy, coordinated by the brain"), then whom Siren calls
    const stages = [...new Set(stageOf.values())].sort((a, b) => Math.min(...a.members.map(p => p.c)) - Math.min(...b.members.map(p => p.c)) || Math.min(...a.members.map(p => p.r)) - Math.min(...b.members.map(p => p.r)));
    const says = st => (st.team ? list(st.members.map(nm)) + ', coordinated by the brain' : orList(st.members.map(nm)));
    const h = board.find(hub);
    const called = stages.filter(st => st.hubs.size);
    let path;
    const chatSt = stages.filter(st => st.members.some(p => D(p.id).chat) && st.hubs.size && !st.succs.size);
    const chatSay = chatSt.length ? chatSt.map(says).join(', ') : '';
    if (h && stages.every(st => st.hubs.size && !st.preds.size && !st.succs.size)) {
      const others = stages.filter(st => !chatSt.includes(st)).map(says);
      path = [chatSay, nm(h), ...others, ...(others.length ? [nm(h)] : []), chatSay].filter(Boolean).join(' \u2192 ');
    }
    else {
      const seenSt = new Set(), chains = [];
      for (const st of stages.filter(x => !x.preds.size && (x.succs.size || !x.hubs.size) && !chatSt.includes(x))) {   // a tile Siren only calls is said with her
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
      const calledOthers = called.filter(st => !chatSt.includes(st));
      if (h && called.length) chains.push(`${chatSay ? chatSay + ' \u21c4 ' : ''}${nm(h)}${calledOthers.length ? ', who calls ' + list(calledOthers.map(says)) : ''}`);
      path = chains.filter(Boolean).join('; ');
    }
    return { ok: !cat, cat, faults, all: errs, edges, path, notes: [...new Set(notes)], stageOf, hub: h || null, board };
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
    if (fault.mode === 'beside') return fault.ids;
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
    else if (fault.mode === 'beside') what.textContent = `Below: what goes beside ${host.dataset.name}. Press it to put it there.`;
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

  // ---- The brain chooser (Laurent, 2026-10-07: "when testing a function, and no AI brain model was
  // selected, ask the user which one he wants and list them on the screen"). When TesT finds a team
  // whose chain is right but that has no brain for a tile that needs one, it asks instead of failing:
  // a dialog lists every brain in tiles.js (local and remote), each with its figures as the screens
  // show them. A pick attaches that brain exactly as pressing it in the panel would, then TesT runs
  // again; Cancel, Esc or a press outside leave the team as it was and TesT says what is missing.
  // The look: a pulse leaves the tile that needs a brain, the panel unfolds in pixel steps, the cards
  // arrive one by one; the chosen brain flies onto the tile with a small burst of pixels. With reduced
  // motion everything simply appears. ----
  const BRAINS = DATA.tiles.filter(d => d.gives === 'brain');
  const brainFault = res => !res.all.some(e => COMPLETE_BLOCKERS.has(e.cat)) && res.all.find(e => e.cat === 'needs' && e.need === 'brain');
  const brainFigures = d => {
    const z = sizeMeter.format(+d.params), w = mbMeter.format(+d.mb), v = msMeter.format(+d.ms);
    return [d.params === '' ? 'size not measured yet' : `${z.text} ${z.unit} parameters`,
      d.mb === '' ? 'weights not measured yet' : +d.mb === 0 ? 'no weights on this PC' : `${w.text} ${w.unit} on disk`,
      d.ms === '' ? 'speed not measured yet' : `${v.text} ${v.unit}`];
  };
  let asking = null;   // the open chooser, if any
  const askBrain = (host, team) => {
    const wrap = document.createElement('div');
    wrap.className = 'brainpick-wrap';
    wrap.innerHTML = '<div class="brainpick-shade"></div>'
      + '<div class="brainpick" role="dialog" aria-modal="true" aria-labelledby="brainpick-title" aria-describedby="brainpick-say">'
      + '<div class="brainpick-head"><h3 class="brainpick-title" id="brainpick-title">Which brain should this team use?</h3>'
      + '<button class="brainpick-cancel" type="button">Cancel</button></div>'
      + '<p class="brainpick-say" id="brainpick-say"></p><div class="brainpick-list" role="group" aria-label="The brains"></div></div>';
    const dlg = wrap.querySelector('.brainpick'), listEl = wrap.querySelector('.brainpick-list');
    const thinkers = (groups().find(g => g.includes(host)) || [host]).filter(t => (defOf(t).needs || []).includes('brain')).map(t => t.dataset.name);
    wrap.querySelector('.brainpick-say').textContent = team
      ? `${list(team)} are stacked: a team the brain coordinates, so the team needs a brain. The one you pick serves the whole team.`
      : `${thinkers.length > 1 ? `${list(thinkers)} need` : `${host.dataset.name} needs`} a brain, and the team has none. The one you pick is shared by every tile that needs a brain.`;
    for (const d of BRAINS) {
      const t = original(d.id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'brainpick-card';
      b.dataset.brain = d.id;
      b.style.setProperty('--tc', d.colour);
      const fig = brainFigures(d), where = d.where === 'remote' ? 'remote' : 'local';
      b.innerHTML = '<span class="bp-icon"></span><span class="bp-text"><b class="bp-name"></b><i class="bp-where"></i><span class="bp-fig"></span></span>';
      b.querySelector('.bp-icon').append(t ? t.querySelector('svg').cloneNode(true) : '');
      b.querySelector('.bp-name').textContent = d.name.replace(/ remote$/, '');
      b.querySelector('.bp-where').textContent = where;
      b.querySelector('.bp-where').dataset.where = where;
      b.querySelector('.bp-fig').textContent = fig.join(' \u00b7 ');
      b.title = d.words;
      b.setAttribute('aria-label', `${d.name.replace(/ remote$/, '')}, ${where}: ${fig.join(', ')}. ${d.words}.`);
      listEl.append(b);
    }
    document.body.append(wrap);
    const phoneSheet = phone.matches;
    if (!phoneSheet) {   // over the field, under its title
      const f = field.getBoundingClientRect();
      const w = Math.min(560, f.width - 32);
      Object.assign(dlg.style, { left: f.left + (f.width - w) / 2 + 'px', width: w + 'px', top: Math.max(8, f.top + 56) + 'px', maxHeight: Math.max(160, Math.min(innerHeight, f.bottom) - Math.max(8, f.top + 56) - 16) + 'px' });
    }
    const cards = [...listEl.children];
    asking = { wrap, host, done: false };
    const motion = !still.matches;
    if (motion) {
      const h = host.getBoundingClientRect(), d0 = dlg.getBoundingClientRect();
      const to = [d0.left + d0.width / 2, phoneSheet ? d0.top : d0.top + 8], from = [h.left + h.width / 2, h.top + h.height / 2];
      [0, 1, 2].forEach(i => {   // the pulse from the tile that needs a brain
        const pz = document.createElement('i');
        pz.className = 'brainpick-pulse' + (i ? ' is-trail' : '');
        wrap.append(pz);
        pz.animate([{ transform: `translate(${from[0]}px, ${from[1]}px) scale(1.4)`, opacity: 1 },
                    { transform: `translate(${(from[0] + to[0]) / 2}px, ${Math.min(from[1], to[1]) - 30}px)`, opacity: 1, offset: 0.5 },
                    { transform: `translate(${to[0]}px, ${to[1]}px) scale(.6)`, opacity: 0 }],
                   { duration: 520, delay: i * 40, easing: 'cubic-bezier(.45, 0, .55, 1)', fill: 'both' }).finished.then(() => pz.remove(), () => pz.remove());
      });
      host.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(1.8)', offset: 0.25 }, { filter: 'brightness(1)' }], { duration: 600 });
      wrap.querySelector('.brainpick-shade').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: 'both' });
      dlg.animate(phoneSheet
        ? [{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0 0 0 0)' }]
        : [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }],
        { duration: 420, delay: 360, easing: 'steps(8, end)', fill: 'both' });
      cards.forEach((c, i) => c.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
        { duration: 260, delay: 640 + i * 110, easing: 'steps(4, end)', fill: 'both' }));
    }
    (cards[0] || dlg.querySelector('.brainpick-cancel')).focus({ preventScroll: true });
    const close = (then, fast) => {
      if (asking !== null && asking.wrap === wrap) asking = null;
      document.removeEventListener('keydown', keys, true);
      const gone = () => { wrap.remove(); then(); };
      if (!motion || fast) { gone(); return; }
      dlg.getAnimations().forEach(a => a.cancel());
      cards.forEach(c => c.getAnimations().forEach(a => a.finish()));
      wrap.querySelector('.brainpick-shade').animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'both' });
      dlg.animate(phoneSheet ? [{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(100% 0 0 0)' }] : [{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 100% 0)' }],
        { duration: 260, easing: 'steps(6, end)', fill: 'both' }).finished.then(gone, gone);
    };
    const cancel = () => {
      if (!asking || asking.wrap !== wrap) return;
      close(() => { runTest({ ask: false }); keyTest.focus({ preventScroll: true }); }, true);
    };
    const pick = id => {
      if (!asking || asking.wrap !== wrap) return;
      const o = original(id);
      if (o && onField(host) && !canDock(host, o)) host = (groups().find(g => g.includes(host)) || []).find(x => canDock(x, o)) || host;   // a stack of code tiles: a tile of the team that thinks
      if (!o || !onField(host) || !canDock(host, o)) { cancel(); return; }
      const card = listEl.querySelector(`[data-brain="${id}"]`), icon = card.querySelector('.bp-icon').getBoundingClientRect();
      const chip = copyOf(o);
      dockOnto(chip, host);   // exactly as a press on the brain in the panel (attachByClick)
      count();
      if (!motion) { close(() => { runTest({ ask: false }); keyTest.focus({ preventScroll: true }); }); return; }
      card.classList.add('is-picked');
      const r = chip.getBoundingClientRect();
      const ghost = card.querySelector('.bp-icon svg').cloneNode(true);
      ghost.setAttribute('class', 'brainpick-fly');
      Object.assign(ghost.style, { width: icon.width + 'px', height: icon.height + 'px' });
      document.body.append(ghost);
      chip.style.visibility = 'hidden';
      const land = () => {
        ghost.remove();
        chip.style.visibility = '';
        for (let i = 0; i < 8; i++) {   // a burst of pixels where it lands
          const sp = document.createElement('i');
          sp.className = 'brainpick-spark';
          document.body.append(sp);
          const a = i * Math.PI / 4, cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          sp.animate([{ transform: `translate(${cx}px, ${cy}px)`, opacity: 1 }, { transform: `translate(${cx + Math.cos(a) * 26}px, ${cy + Math.sin(a) * 26}px) scale(.4)`, opacity: 0 }],
                     { duration: 420, easing: 'steps(5, end)', fill: 'both' }).finished.then(() => sp.remove(), () => sp.remove());
        }
        runTest({ ask: false });
        keyTest.focus({ preventScroll: true });
      };
      close(() => {}, false);
      ghost.animate([{ transform: `translate(${icon.left}px, ${icon.top}px)` },
                     { transform: `translate(${(icon.left + r.left) / 2}px, ${Math.min(icon.top, r.top) - 40}px) scale(${(1 + r.width / icon.width) / 2})`, offset: 0.55 },
                     { transform: `translate(${r.left}px, ${r.top}px) scale(${r.width / icon.width})` }],
                    { duration: 560, easing: 'cubic-bezier(.3, .1, .3, 1)', fill: 'both' }).finished.then(land, land);
    };
    const keys = e => {
      if (!wrap.isConnected) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(); return; }
      const focusables = [...cards, dlg.querySelector('.brainpick-cancel')];
      const i = focusables.indexOf(document.activeElement);
      if (e.key === 'Tab') {   // the focus stays in the dialog
        e.preventDefault();
        focusables[(i + (e.shiftKey ? -1 : 1) + focusables.length) % focusables.length].focus();
      } else if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(e.key) && cards.includes(document.activeElement)) {
        e.preventDefault();
        const j = cards.indexOf(document.activeElement) + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1);
        cards[(j + cards.length) % cards.length].focus();
      }
    };
    document.addEventListener('keydown', keys, true);
    listEl.addEventListener('click', e => { const c = e.target.closest('.brainpick-card'); if (c) pick(c.dataset.brain); });
    dlg.querySelector('.brainpick-cancel').addEventListener('click', cancel);
    wrap.querySelector('.brainpick-shade').addEventListener('click', cancel);
  };

  const runTest = ({ ask = true } = {}) => {
    if (EMPTY) { say('Nothing to test yet: robot tiles are coming.', 3200); return; }
    if (asking) return;
    if (ask && BRAINS.length) {
      const f = brainFault(check(board()));
      if (f && f.p.tile) { resetTest(); askBrain(f.p.tile, f.team); return; }
    }
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
  keyTest.addEventListener('click', () => runTest());

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
  // ---- FLOW, the fourth key: an arrow travels through the complete team in its working order,
  // stacked inputs feed the brain; a team of stacked functions or outputs is reached through its brain, which
  // sends each its orders in turn and takes their results back before handing on one answer; lenses are
  // passed by (they are not steps); with
  // reduced motion the path is drawn for a moment instead. Without a complete chain it says why. ----
  const flowArrow = () => {
    const chain = chainOf();
    if (EMPTY) { say('Nothing to run yet: robot tiles are coming.', 3200); return; }
    if (!chain) { say('FLOW needs a complete chain: an Input, joined rightly, through to an Output.'); return; }
    resetTest();
    const levels = flowLevels(chain);
    const S = parseFloat(grid.style.getPropertyValue('--cell')) || 96, G = parseFloat(grid.style.getPropertyValue('--gap')) || 12;
    const ctr = p => [p.c * (S + G) + S / 2, p.r * (S + G) + S / 2];
    const layer = document.createElement('div');
    layer.className = 'flow-layer';
    layer.dataset.levels = JSON.stringify(levels.map(l => l.map(([a, b]) => a.id + '>' + b.id)));
    grid.append(layer);
    keyFlow.classList.add('is-running');
    const HOP = 520, done = () => { layer.remove(); keyFlow.classList.remove('is-running'); };
    if (still.matches) {   // the path, drawn still for a moment
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'flow-path');
      for (const [a, b, , fix] of levels.flat()) {
        const l = document.createElementNS(NS, 'line');
        if (fix) l.setAttribute('class', 'is-fix');   // the fix round: a return arrow, dashed
        const [x1, y1] = ctr(a), [x2, y2] = ctr(b);
        [['x1', x1], ['y1', y1], ['x2', x2], ['y2', y2]].forEach(([k, v]) => l.setAttribute(k, v));
        svg.append(l);
      }
      layer.append(svg);
      setTimeout(done, 1800);
      return;
    }
    levels.forEach((hops, k) => hops.forEach(([a, b, lag = 0, fix]) => {
      const [x1, y1] = ctr(a), [x2, y2] = ctr(b), ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
      const arrow = document.createElement('i');
      arrow.className = 'flow-arrow' + (fix ? ' is-fix' : '');
      layer.append(arrow);
      arrow.animate([
        { transform: `translate(${x1}px, ${y1}px) rotate(${ang}deg) scale(.6)`, opacity: 0 },
        { transform: `translate(${x1 + (x2 - x1) * 0.15}px, ${y1 + (y2 - y1) * 0.15}px) rotate(${ang}deg)`, opacity: 1, offset: 0.15 },
        { transform: `translate(${x1 + (x2 - x1) * 0.85}px, ${y1 + (y2 - y1) * 0.85}px) rotate(${ang}deg)`, opacity: 1, offset: 0.85 },
        { transform: `translate(${x2}px, ${y2}px) rotate(${ang}deg) scale(.6)`, opacity: 0 },
      ], { duration: HOP, delay: k * HOP + lag, easing: 'ease-in-out', fill: 'both' });
      setTimeout(() => { glow(b.id); b.tile.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(1.5)', offset: 0.4 }, { filter: 'brightness(1)' }], { duration: 380 }); }, (k + 1) * HOP - 60 + lag);
    }));
    setTimeout(done, levels.length * HOP + 400 + Math.max(0, ...levels.flat().map(h => h[2] || 0)));
  };
  const keyFlow = (() => {
    const k = document.createElement('button');
    k.className = 'key key-flow is-off';
    k.type = 'button';
    k.setAttribute('aria-label', 'Flow: show the work travelling through the team');
    k.setAttribute('aria-disabled', 'true');
    k.innerHTML = '<span class="key-face"><svg class="key-icon is-wide" viewBox="0 0 31 19" aria-hidden="true">'
      + [[0, 8], [4, 8], [8, 8], [12, 8], [16, 8], [20, 8], [16, 4], [20, 4], [24, 8], [16, 12], [20, 12], [12, 0], [12, 16], [28, 8]].filter(([x, y]) => !(x === 12 && (y === 0 || y === 16)))
        .map(([x, y]) => `<rect x="${x}" y="${y}" width="3" height="3" rx=".8"/>`).join('')
      + '</svg><span class="key-word">FLOW</span></span>';
    bench.querySelector('.field-keys').append(k);
    k.addEventListener('click', flowArrow);
    return k;
  })();
  const keyCode = bench.querySelector('.key-code');
  const codeWrap = bench.querySelector('.code-wrap');
  const view = codeWrap.querySelector('.code-view');
  const codeBox = view.querySelector('code');
  const codeStatus = codeWrap.querySelector('.code-status');
  const codePos = codeWrap.querySelector('.code-pos');
  const codeCount = codeWrap.querySelector('.code-count');
  // For each model: what it is given when a team starts with it, what it hands on, and how early
  // in the work it comes, from its role and its kinds in tiles.js.
  const RANK = { start: 0, both: 0, reader: 0, middle: 1, end: 2 };
  const role = t => {
    const d = defOf(t);
    const given = d.role === 'both' ? 'message' : d.role === 'start' ? (d.needs || [])[0] || 'source' : d.role === 'reader' ? (d.startNeeds || d.in || [])[0] || 'source' : (d.in || [])[0] || 'data';
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
  filterBar.hidden = EMPTY;
  if (EMPTY) filterNone.textContent = DATA.empty || 'Nothing to place yet.';
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
  if ((DATA.presets || []).length) filterBar.before(presetBar);
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
    // the defaults a team does not bring itself: a team with its own lens or brain keeps its own
    const brought = team.tiles.flatMap(([id, , , att = []]) => [id, ...att]).map(id => DEF.get(id) || {});
    const own = { brain: !brought.some(d => d.gives === 'brain'), lens: !brought.some(d => d.role === 'lens'), skill: !brought.some(d => d.gives === 'skill') };
    later(wait + team.tiles.length * step + (still.matches ? 0 : 60), () => team.tiles.forEach(([id]) => { const t = original(id); if (t && onField(t)) defaults(t, own); }));
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
  // A quarter of the page, but never less than the three columns of tiles need (400 px): on a
  // 1024 px screen that is 39%. A width the viewer chose by dragging is kept as it was.
  let panel = Math.min(0.6, Math.max(0.25, 400 / (bench.clientWidth || innerWidth)));
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
  };

  // ---- The tabs (workbench.html only: <main data-tabs>). MODELS is the workbench as it has always
  // been; ROBOTS is the same bench, built from a copy of the page's own markup taken before anything
  // was drawn, with an empty panel until robot tiles exist. Each keeps its own field while the other is
  // shown. The tab is remembered per viewer (localStorage, when there is one), and #models / #robots in
  // the address opens that tab. ----
  const ROBOTS = { roles: {}, kinds: {}, needs: {}, sections: [], plans: {}, tiles: [], presets: [],
    empty: 'Robot tiles are coming. Nothing to place yet.' };
  const models = document.querySelector('.bench');
  if (!models || !models.matches('[data-tabs]')) { initBench(models, window.AKIKI_TILES); return; }
  const TAB_KEY = 'akiki-workbench-tab';
  const pristine = models.cloneNode(true);   // ROBOTS is drawn from this, the first time its tab opens
  const robots = document.createElement('section');
  for (const k of ['class', 'aria-label']) if (models.hasAttribute(k)) robots.setAttribute(k, models.getAttribute(k));
  let robotsBuilt = false;
  const buildRobots = () => {
    if (robotsBuilt) return;
    robotsBuilt = true;
    robots.append(...[...pristine.childNodes]);
    robots.querySelectorAll('h1').forEach(h => h.remove());   // the page has one heading
    robots.querySelectorAll('[id]').forEach(e => { e.id += '-robots'; });
    robots.querySelectorAll('[aria-controls]').forEach(e => e.setAttribute('aria-controls', e.getAttribute('aria-controls') + '-robots'));
    const robotTray = robots.querySelector('.tray');
    if (robotTray) robotTray.setAttribute('aria-label', 'The robots');
    initBench(robots, ROBOTS);
  };
  models.dataset.board = 'models';
  robots.dataset.board = 'robots';
  models.after(robots);
  const bar = document.createElement('div');
  bar.className = 'bench-tabs';
  bar.setAttribute('role', 'tablist');
  bar.setAttribute('aria-label', 'Workbenches');
  const tabs = [['models', 'MODELS', models], ['robots', 'ROBOTS', robots]].map(([id, word, panel]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'bench-tab';
    b.id = 'tab-' + id;
    b.dataset.tab = id;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-controls', 'panel-' + id);
    b.textContent = word;
    panel.id = 'panel-' + id;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', b.id);
    bar.append(b);
    return { id, b, panel };
  });
  models.before(bar);
  document.body.classList.add('has-bench-tabs');
  const show = (id, { focus = false, keep = true } = {}) => {
    if (id === 'robots') buildRobots();
    for (const t of tabs) {
      const on = t.id === id;
      t.b.setAttribute('aria-selected', String(on));
      t.b.tabIndex = on ? 0 : -1;
      t.panel.hidden = !on;
      if (on && focus) t.b.focus();
    }
    if (!keep) return;
    try { localStorage.setItem(TAB_KEY, id); } catch (e) { /* no storage: the tab is not remembered */ }
    if (location.hash.slice(1) !== id) try { history.replaceState(null, '', '#' + id); } catch (e) { /* fine */ }
  };
  const asked = () => {
    const h = location.hash.slice(1).toLowerCase();
    if (tabs.some(t => t.id === h)) return h;
    try { const saved = localStorage.getItem(TAB_KEY); if (tabs.some(t => t.id === saved)) return saved; } catch (e) { /* no storage */ }
    return 'models';
  };
  bar.addEventListener('click', e => { const b = e.target.closest('.bench-tab'); if (b) show(b.dataset.tab); });
  bar.addEventListener('keydown', e => {
    const i = tabs.findIndex(t => t.b === document.activeElement);
    if (i < 0) return;
    const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    show(tabs[(to + tabs.length) % tabs.length].id, { focus: true });
  });
  window.addEventListener('hashchange', () => { const h = location.hash.slice(1).toLowerCase(); if (tabs.some(t => t.id === h)) show(h); });
  initBench(models, window.AKIKI_TILES);
  show(asked(), { keep: false });
})();
