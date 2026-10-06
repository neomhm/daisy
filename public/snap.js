/* The little-scroll glide between two screens of a page, shared by the home page (the board and
   the workbench under it) and the Siren page (the animated squares and the profiles under them).
   akikiSnap(target, next): a short wheel or trackpad scroll down from the top glides the page to
   `target`, and a short one up from the target's top glides it back; scrolls inside scrollable parts
   stay there; the paired CSS snapping is switched off during the glide. `next` is an optional button
   that glides down. A swipe on a tablet does the same at those two edges. On phones the page scrolls
   freely. */
window.akikiSnap = (bench, next) => {

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
    if (dy > 0 && !t.up && t.at >= at - 2 && t.at <= at + 2) glide(0);          // finger down at the workbench's top: back to the first screen
    else if (dy < 0 && !t.down && t.at <= 2) glide(at);                         // finger up on the first screen: to the workbench
  }, { passive: true });

  if (next) next.addEventListener('click', e => { e.preventDefault(); glide(benchAt()); });
};
