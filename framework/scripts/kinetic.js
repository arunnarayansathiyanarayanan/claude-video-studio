// Kinetic typography micro-library: deterministic render(t) for frame-by-frame capture.
// Each item: {t0, t1, anim:'slam'|'rise'|'pop'|'wipe'|'fade', stagger, dur, html, cls, style}
(function () {
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const eOutCubic = x => 1 - Math.pow(1 - x, 3);
  const eOutExpo = x => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
  const eOutBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  window.K = { clamp, eOutCubic, eOutExpo, eOutBack, items: [], hooks: [] };

  function splitWords(el) {
    // wrap every word of text nodes (not inside .nosplit) in .w spans
    const walk = n => {
      if (n.nodeType === 3) {
        const parts = n.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        parts.forEach(p => {
          if (/^\s+$/.test(p) || !p) { frag.appendChild(document.createTextNode(p)); return; }
          const m = document.createElement('span'); m.className = 'wm';
          const w = document.createElement('span'); w.className = 'w'; w.textContent = p;
          m.appendChild(w); frag.appendChild(m);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && !n.classList.contains('nosplit')) [...n.childNodes].forEach(walk);
    };
    [...el.childNodes].forEach(walk);
  }

  K.add = (spec) => {
    const el = document.createElement('div');
    el.className = 'item ' + (spec.cls || '');
    if (spec.style) el.setAttribute('style', spec.style);
    el.innerHTML = spec.html;
    document.getElementById('stage').appendChild(el);
    if (spec.anim !== 'fade' && spec.anim !== 'wipe') splitWords(el);
    spec.el = el; spec.words = [...el.querySelectorAll('.w')];
    // word index restarts inside each [data-d] group so long blocks don't accumulate delay
    const gi = new Map(); spec.words.forEach(w => { const g = w.closest('[data-d]') || el; const k = gi.get(g) || 0; w._k = k; gi.set(g, k + 1); });
    spec.boxes = [...el.querySelectorAll('.hl')];
    spec.stagger = spec.stagger ?? 0.07; spec.dur = spec.dur ?? 0.45;
    K.items.push(spec); return spec;
  };

  K.render = (t) => {
    for (const s of K.items) {
      const vis = t >= s.t0 - 0.001 && t < s.t1;
      s.el.style.display = vis ? 'block' : 'none';
      if (!vis) continue;
      // exit
      const ex = clamp((t - (s.t1 - 0.18)) / 0.18);
      s.el.style.opacity = 1 - ex;
      s.el.style.transform = (s.baseT || '') + ` translateY(${-ex * 24}px)`;
      // highlight boxes wipe in first
      s.boxes.forEach((b, i) => {
        const p = eOutExpo(clamp((t - s.t0 - (b.dataset.d ? +b.dataset.d : i * 0.1)) / 0.3));
        b.style.setProperty('--wipe', p);
      });
      if (s.anim === 'fade') { s.el.style.opacity = Math.min(1 - ex, eOutCubic(clamp((t - s.t0) / s.dur))); continue; }
      if (s.anim === 'wipe') {
        const p = eOutExpo(clamp((t - s.t0) / s.dur));
        s.el.style.clipPath = `inset(0 ${100 - p * 100}% 0 0)`; continue;
      }
      s.words.forEach((w, k) => {
        const d = w.closest('[data-d]') ? +w.closest('[data-d]').dataset.d : 0;
        const p = clamp((t - s.t0 - d - (w._k ?? k) * s.stagger) / s.dur);
        if (s.anim === 'slam') {
          const e = eOutCubic(p);
          w.style.transform = `scale(${1 + 0.9 * (1 - e)})`;
          w.style.opacity = clamp(p * 4);
          w.style.filter = `blur(${(1 - e) * 10}px)`;
        } else if (s.anim === 'rise') {
          const e = eOutExpo(p);
          w.style.transform = `translateY(${(1 - e) * 110}%)`;
          w.style.opacity = clamp(p * 3);
        } else if (s.anim === 'pop') {
          const e = eOutBack(p);
          w.style.transform = `scale(${0.4 + 0.6 * e})`;
          w.style.opacity = clamp(p * 3);
        }
      });
    }
    K.hooks.forEach(h => h(t));
  };
})();
