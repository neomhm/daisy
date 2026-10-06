/* The little-scroll glide between two screens of a page, shared by the home page (the board and
   the workbench under it) and the Siren page (the animated squares and the profiles under them).
   akikiSnap(target, next): a short wheel or trackpad scroll down from the top glides the page to
   `target`, and a short one up from the target's top glides it back; scrolls inside scrollable parts
   stay there; the paired CSS snapping is switched off during the glide. `next` is an optional button
   that glides down. A swipe on a tablet does the same at those two edges. On phones the page scrolls
   freely.
   akikiSnap(target, next, { lock, up }): with `lock` (the home page's workbench), the way down is the
   same, but once the page has reached the target nothing scrolls it back up: not the wheel, a swipe,
   PageUp, Home, the arrow keys or the scrollbar, on any width. What is above it is made inert, so the
   keyboard cannot land there unseen either. `up` is the one way back: a button (the pull tab at the
   target's top edge) shown only while the page is held, which glides it to the very top. */
window.akikiSnap = (bench, next, { lock = false, up = null, above = null } = {}) => {

  const html = document.documentElement;
  const wide = window.matchMedia('(min-width: 701px)');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  const benchAt = () => Math.min(html.scrollHeight - innerHeight,
    Math.round(bench.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(html).scrollPaddingTop) || 0)));
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  let held = false;   // lock only: the page is held at the target (below)
  let gliding = false, settled = () => {};
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
      settled();
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
    if (lock && held && !down) return;                           // held: see "Held at the workbench" below
    if (down ? y >= at - 1 : (y <= 0 || y > at + 1)) return;   // already there, or further down the page
    if (!gliding && inner(e.target, e.deltaY)) return;
    e.preventDefault();
    if (!gliding) glide(down ? at : 0);
  }, { passive: false });

  // Touch on a wide screen (a tablet): a swipe that starts where nothing inside can scroll that way
  // (the tiles panel already at its top, say) glides between the two screens too. Without this the
  // page's snapping pulled it straight back to the workbench, and the board could not be reached.
  let touch = null;
  window.addEventListener('touchstart', e => {
    if (!wide.matches || e.touches.length !== 1) { touch = null; return; }
    touch = { y: e.touches[0].clientY, target: e.target, at: scrollY, up: inner(e.target, -1), down: inner(e.target, 1) };
  }, { passive: true });
  window.addEventListener('touchend', e => {
    if (!touch || gliding) { touch = null; return; }
    const dy = (e.changedTouches[0] || {}).clientY - touch.y, at = benchAt(), t = touch;
    touch = null;
    if (!(Math.abs(dy) > 40)) return;
    if (dy > 0 && !lock && !t.up && t.at >= at - 2 && t.at <= at + 2) glide(0);   // finger down at the workbench's top: back to the first screen
    else if (dy < 0 && !t.down && t.at <= 2) glide(at);                         // finger up on the first screen: to the workbench
  }, { passive: true });

  if (next) next.addEventListener('click', e => { e.preventDefault(); glide(benchAt()); });
  if (!lock) return;

  // ---- Held at the workbench. Once the page has come down to it, it stays: every way of scrolling up
  // stops at its top edge (scrolls inside the tiles panel or an open menu still go up there), and the
  // first screen is inert, so Shift+Tab goes from the workbench to the sticky header without pulling
  // the page up to a tile nobody can see. The pull tab is the one way back. ----
  let leaving = false;
  const hold = on => {
    if (held === on) return;
    held = on;
    if (above) above.inert = on;
    if (up) up.hidden = !on;
    bench.classList.toggle('is-held', on);
  };
  const editable = el => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  const toEdge = () => window.scrollTo({ top: benchAt(), behavior: 'instant' });
  const check = () => {
    const at = benchAt();
    if (!held) { if (!leaving && !gliding && scrollY >= at - 1 && at > 0) hold(true); else if (leaving && scrollY <= 1) leaving = false; return; }
    if (scrollY < at - 1) toEdge();   // the scrollbar, a find on the page, anything else: back to the edge
  };
  settled = check;
  window.addEventListener('scroll', check, { passive: true });
  window.addEventListener('wheel', e => {
    if (!held || e.ctrlKey || e.deltaY >= 0 || Math.abs(e.deltaY) <= Math.abs(e.deltaX) || inner(e.target, e.deltaY)) return;
    const at = benchAt();
    if (scrollY + e.deltaY * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? innerHeight : 1) < at - 1) {
      e.preventDefault();
      if (scrollY > at + 1) toEdge();
    }
  }, { passive: false });
  let lastY = null;
  window.addEventListener('touchstart', e => { lastY = e.touches.length === 1 ? e.touches[0].clientY : null; }, { passive: true });
  window.addEventListener('touchmove', e => {
    if (!held || lastY === null || e.touches.length !== 1 || !e.cancelable) return;
    const y = e.touches[0].clientY, dy = y - lastY;
    lastY = y;
    if (dy > 0 && scrollY <= benchAt() + 1 && !inner(e.target, -1)) e.preventDefault();   // a finger pulling down at the top edge
  }, { passive: false });
  window.addEventListener('keydown', e => {
    if (!held || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || editable(e.target)) return;
    const k = e.key, at = benchAt();
    const by = k === 'Home' ? Infinity : k === 'PageUp' || (k === ' ' && e.shiftKey) ? innerHeight * 0.9 : k === 'ArrowUp' ? 40 : 0;
    if (!by) return;
    for (let el = e.target; el && el !== document.body && el !== html; el = el.parentElement) {   // a list or a panel scrolls itself
      if (/(auto|scroll)/.test(getComputedStyle(el).overflowY) && el.scrollTop > 0 && el.scrollHeight > el.clientHeight + 1) return;
    }
    if (scrollY - by < at - 1) {
      e.preventDefault();
      if (scrollY > at + 1) window.scrollTo({ top: at, behavior: still.matches ? 'instant' : 'smooth' });
    }
  });
  if (up) up.addEventListener('click', () => {
    leaving = true;
    hold(false);
    if (next) next.focus({ preventScroll: true });   // the way back down is where the keyboard lands
    if (still.matches) window.scrollTo({ top: 0, behavior: 'instant' }); else glide(0);
    if (scrollY <= 1) leaving = false;
  });
  if (scrollY >= benchAt() - 1 && benchAt() > 0) hold(true);
};
