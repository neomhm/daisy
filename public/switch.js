/* The page switcher in the header ("Two pages" in style.css). It works without this script, as a
   plain <details>. This adds: closing on Escape or a click elsewhere, the filter, and the arrow
   keys to move between pages. */
(() => {
  for (const d of document.querySelectorAll('.switch')) {
    const filter = d.querySelector('.switch-filter');
    const items = [...d.querySelectorAll('.switch-item')];
    const none = d.querySelector('.switch-none');
    const shown = () => items.filter(a => !a.hidden);
    const close = () => { d.open = false; };

    d.addEventListener('toggle', () => {
      if (!d.open) return;
      filter.value = '';
      items.forEach(a => { a.hidden = false; });
      none.hidden = true;
      if (window.matchMedia('(hover: hover)').matches) filter.focus();
    });
    document.addEventListener('click', e => { if (d.open && !d.contains(e.target)) close(); });
    d.addEventListener('keydown', e => {
      if (e.key === 'Escape') { close(); d.querySelector('summary').focus(); return; }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter') return;
      const list = shown();
      if (!list.length) return;
      const at = list.indexOf(document.activeElement);
      if (e.key === 'Enter') {
        if (document.activeElement === filter) { e.preventDefault(); list[0].click(); }
        return;
      }
      e.preventDefault();
      const next = e.key === 'ArrowDown' ? (at + 1) % list.length : (at <= 0 ? list.length - 1 : at - 1);
      list[next].focus();
    });
    filter.addEventListener('input', () => {
      const q = filter.value.trim().toLowerCase();
      items.forEach(a => { a.hidden = q !== '' && !a.textContent.toLowerCase().includes(q); });
      none.hidden = shown().length > 0;
    });
  }
})();
