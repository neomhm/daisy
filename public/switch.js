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
    // On phones the menu is a sheet over a dimmed page (summary::after, so a tap on it closes the
    // sheet like a tap on the summary); a swipe down closes it too.
    const menu = d.querySelector('.switch-menu');
    const phone = window.matchMedia('(max-width: 700px)');
    let y0 = null, dy = 0;
    menu.addEventListener('touchstart', e => {
      if (!phone.matches || menu.scrollTop > 0 || e.target === filter) return;
      y0 = e.touches[0].clientY; dy = 0; menu.classList.add('is-dragging');
    }, { passive: true });
    menu.addEventListener('touchmove', e => {
      if (y0 === null) return;
      dy = Math.max(0, e.touches[0].clientY - y0);
      menu.style.transform = dy ? `translateY(${dy}px)` : '';
    }, { passive: true });
    menu.addEventListener('touchend', () => {
      if (y0 === null) return;
      y0 = null; menu.classList.remove('is-dragging');
      if (dy > 70) {
        menu.classList.add('is-leaving');
        menu.style.transform = 'translateY(100%)';
        setTimeout(() => { close(); menu.classList.remove('is-leaving'); menu.style.transform = ''; }, 250);
      } else if (dy) {
        menu.classList.add('is-leaving'); menu.style.transform = '';
        setTimeout(() => menu.classList.remove('is-leaving'), 250);
      }
    });
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


/* Phones and the section bar ("Phones" in style.css): the chip of the section being read is
   marked and kept in view; the brand row tucks away while reading down and comes back on the way
   up; a button brings the reader back to the top. */
(() => {
  const header = document.querySelector('.appheader');
  const top = header && header.querySelector('.appheader-top');
  const bar = header && header.querySelector('.tabs');
  if (!bar) return;
  const root = document.documentElement;
  const phone = window.matchMedia('(max-width: 700px)');
  const chips = [...bar.querySelectorAll('a[href^="#"]')];
  const targets = chips.map(a => document.getElementById(a.hash.slice(1)));
  const sw = header.querySelector('.switch');

  const measure = () => {
    root.style.setProperty('--head', header.offsetHeight + 'px');
    root.style.setProperty('--tuck', top.offsetHeight + 'px');
  };
  measure();
  window.addEventListener('resize', measure);

  let current = null;
  const mark = chip => {
    if (chip === current) return;
    if (current) current.removeAttribute('aria-current');
    current = chip;
    chip.setAttribute('aria-current', 'true');
    const left = chip.offsetLeft - (bar.clientWidth - chip.offsetWidth) / 2;
    bar.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  };

  const btn = document.createElement('button');
  btn.className = 'to-top';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Back to the top');
  btn.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13V3.5M3.5 8 8 3.5 12.5 8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  document.body.append(btn);

  let lastY = window.scrollY, ticking = false, jumping = 0;
  const update = () => {
    ticking = false;
    const y = window.scrollY;
    const line = Math.max(0, header.getBoundingClientRect().bottom) + 24;
    let at = 0;
    targets.forEach((t, i) => { if (t && t.getBoundingClientRect().top <= line) at = i; });
    if (window.innerHeight + y >= root.scrollHeight - 4) at = targets.length - 1;
    mark(chips[at]);
    btn.classList.toggle('is-shown', y > window.innerHeight * 1.2);
    header.classList.toggle('is-scrolled', y > 4);
    if (phone.matches && !(sw && sw.open)) {
      if (jumping) header.classList.add('is-tucked');
      else if (y < 80) header.classList.remove('is-tucked');
      else if (y > lastY + 6) header.classList.add('is-tucked');
      else if (y < lastY - 6) header.classList.remove('is-tucked');
    }
    lastY = y;
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();

  // A chip scrolls its section to just under the bar, with the brand row tucked away for the trip.
  chips.forEach((a, i) => a.addEventListener('click', e => {
    const t = targets[i];
    if (!t || !phone.matches) return;
    e.preventDefault();
    const y = i === 0 ? 0 : t.getBoundingClientRect().top + window.scrollY - (header.offsetHeight - top.offsetHeight) - 12;
    if (y > 80) { header.classList.add('is-tucked'); jumping++; setTimeout(() => { jumping--; }, 900); }
    window.scrollTo({ top: y, behavior: 'smooth' });
    history.replaceState(null, '', a.hash);
    mark(a);
  }));
})();

/* Model descriptions ("Read more" in style.css): each card shows the first two lines of its
   description, and "Read more" opens the rest. Without this script the full text shows. */
(() => {
  const stop = '.versions, .stats, .version-lead, .version-new, .arch, .scores, details, h4';
  for (const role of document.querySelectorAll('.module .module-role')) {
    const parts = [];
    for (let e = role.nextElementSibling; e && !e.matches(stop); e = e.nextElementSibling) parts.push(e);
    if (!parts.length) continue;
    const desc = document.createElement('div');
    desc.className = 'desc';
    role.after(desc);
    desc.append(...parts);
    const shut = () => parseFloat(getComputedStyle(desc.firstElementChild).lineHeight) * 2;
    if (desc.scrollHeight <= shut() + 24) { desc.className = 'desc is-short'; continue; }
    desc.classList.add('is-shut');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'desc-more';
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span>Read more</span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    desc.after(btn);
    const still = window.matchMedia('(prefers-reduced-motion: reduce)');
    btn.addEventListener('click', () => {
      const open = desc.classList.contains('is-shut');
      const from = desc.offsetHeight;
      desc.classList.toggle('is-shut', !open);
      const to = open ? desc.scrollHeight : shut();
      btn.setAttribute('aria-expanded', String(open));
      btn.firstChild.textContent = open ? 'Read less' : 'Read more';
      if (!still.matches) {
        desc.classList.add('is-moving');
        desc.animate([{ height: from + 'px' }, { height: to + 'px' }], { duration: 380, easing: 'cubic-bezier(.2, .8, .2, 1)' })
          .finished.then(() => desc.classList.remove('is-moving'), () => desc.classList.remove('is-moving'));
      }
      if (!open && btn.getBoundingClientRect().top < 0) btn.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }
})();
