/* Motion for the version tabs on the model cards ("Version tabs" in style.css).

   The tabs work without this script. It adds the motion: the coloured line glides to the chosen
   tab and takes its colour, the tab's tulip blooms, and the chosen version opens in a circle that
   grows from that tulip, with a band of rounded pixels in the tab's colour on the circle's edge,
   while the card eases to its new height. Visitors who ask for less motion get a plain switch. */
(() => {
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  let canOpen = true;                       // the circle needs --r to animate (see @property in style.css)
  try {
    CSS.registerProperty({ name: '--r', syntax: '<length>', inherits: true, initialValue: '0px' });
  } catch (e) {
    canOpen = e.name === 'InvalidModificationError';   // already registered by the stylesheet: fine
  }

  for (const box of document.querySelectorAll('.versions')) {
    const picks = [...box.querySelectorAll(':scope > .version-pick')];
    const tabs = box.querySelector('.version-tabs');
    const labels = [...tabs.querySelectorAll('label')];
    const wrap = box.querySelector('.version-panels');
    const panels = [...wrap.querySelectorAll(':scope > .version')];
    let current = picks.findIndex(p => p.checked);
    let height = wrap.offsetHeight;         // the panels' height before a switch
    let finish = null;                      // ends the switch that is running, if any

    const colour = label => getComputedStyle(label).getPropertyValue('--t').trim();

    // Put the coloured line under the chosen tab (it glides there by CSS transition).
    const place = () => {
      const l = labels[current];
      tabs.style.setProperty('--ink-x', l.offsetLeft + 'px');
      tabs.style.setProperty('--ink-y', l.offsetTop + l.offsetHeight - 2 + 'px');
      tabs.style.setProperty('--ink-w', l.offsetWidth + 'px');
      tabs.style.setProperty('--ink-c', colour(l));
    };

    const bloom = label => {
      label.classList.remove('is-blooming');
      void label.offsetWidth;               // restart the animation
      label.classList.add('is-blooming');
      label.addEventListener('animationend', () => label.classList.remove('is-blooming'), { once: true });
    };

    const open = (from, to, label) => {
      if (finish) finish();
      const h0 = height;
      const h1 = wrap.offsetHeight;         // the new version is already the one shown
      height = h1;
      const area = wrap.getBoundingClientRect();
      const icon = label.querySelector('.icon').getBoundingClientRect();
      const ox = icon.left + icon.width / 2 - area.left;
      const oy = icon.top + icon.height / 2 - area.top;
      const h = Math.max(h0, h1);
      const reach = Math.max(...[[0, 0], [area.width, 0], [0, h], [area.width, h]]
        .map(([x, y]) => Math.hypot(x - ox, y - oy))) + 60;
      wrap.style.setProperty('--ox', ox + 'px');
      wrap.style.setProperty('--oy', oy + 'px');
      wrap.style.setProperty('--reach', reach + 'px');
      wrap.style.setProperty('--ring', colour(label));
      wrap.style.height = h0 + 'px';
      from.classList.add('is-leaving');
      to.classList.add('is-entering');
      wrap.classList.add('is-switching');
      void wrap.offsetWidth;                // start the height change from the old height
      wrap.style.height = h1 + 'px';

      const done = () => {
        if (finish !== done) return;
        finish = null;
        wrap.classList.remove('is-switching');
        from.classList.remove('is-leaving');
        to.classList.remove('is-entering');
        wrap.style.height = '';
        wrap.removeEventListener('animationend', ended);
      };
      const ended = e => { if (e.target === wrap && e.animationName === 'bloom-open') done(); };
      finish = done;
      wrap.addEventListener('animationend', ended);
      setTimeout(done, 1600);               // in case the animation never reports its end
    };

    box.classList.add('is-live');
    tabs.classList.add('is-still');         // the line starts in place, without gliding
    place();
    void tabs.offsetWidth;
    tabs.classList.remove('is-still');

    box.addEventListener('change', e => {
      const next = picks.indexOf(e.target);
      if (next < 0 || next === current) return;
      const prev = current;
      current = next;
      place();
      if (still.matches) return;
      bloom(labels[next]);
      if (canOpen) open(panels[prev], panels[next], labels[next]);
    });

    new ResizeObserver(() => {
      if (!finish) height = wrap.offsetHeight;
      place();
    }).observe(wrap);
  }
})();
