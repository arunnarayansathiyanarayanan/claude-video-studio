/* motion.js — v2 motion kit (flat, graphic, Jitter-style; human-craft timing).
 * Everything is a pure function of time t (seconds) so frames render deterministically.
 * Load after the DOM: <script src="motion.js"></script>  (optional: flubber.min.js before it for icon morphs)
 *
 * Core ideas
 *   M.kf(t, frames, opts)   keyframe tween with spring/expo easing between successive frames
 *   M.set(el, v)            apply {x,y,s,sx,sy,r,o,blur,clip} to an element
 *   M.lines(el)             split text into masked lines   →  M.reveal(el, t, t0, t1)
 *   M.ticker(...)           rows of words + arrows scrolling in opposite directions
 *   M.mask(el, t, ...)      rounded-rect clip that grows/shrinks (card → full-bleed)
 *   M.typing / M.counter / M.cursor / M.morph / M.video helpers
 *   M.stretch(...)          squash & stretch from velocity
 */
(function () {
  const M = {};
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, p) => a + (b - a) * p;
  M.clamp = clamp; M.lerp = lerp;

  // ---------- easing ----------
  M.expoOut = x => (x = clamp(x), x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
  M.expoIn = x => (x = clamp(x), x <= 0 ? 0 : Math.pow(2, 10 * x - 10));
  M.expoInOut = x => (x = clamp(x), x === 0 ? 0 : x === 1 ? 1 : x < .5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2);
  M.cubicOut = x => 1 - Math.pow(1 - clamp(x), 3);
  M.backOut = (x, k = 1.4) => (x = clamp(x), 1 + (k + 1) * Math.pow(x - 1, 3) + k * Math.pow(x - 1, 2));
  /* Damped spring normalised to settle by p = 1. bounce 0 = critically damped, 0.3 ≈ 6-8 % overshoot */
  M.spring = (x, bounce = 0.25) => {
    x = clamp(x); if (x >= 1) return 1;
    const zeta = 1 - bounce * 0.9, w = 9.5;
    if (zeta >= 1) return 1 - (1 + w * x) * Math.exp(-w * x);
    const wd = w * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * w * x) * (Math.cos(wd * x) + (zeta * w / wd) * Math.sin(wd * x));
  };
  const EASE = { spring: M.spring, expo: M.expoOut, expoIn: M.expoIn, expoInOut: M.expoInOut, cubic: M.cubicOut, linear: x => clamp(x), back: M.backOut };
  M.ease = (name, x, b) => (EASE[name] || M.spring)(x, b);

  // ---------- keyframes ----------
  /* frames: [{t, x, y, s, r, o, ... , ease?, bounce?}]  — props missing in a frame inherit from the previous one.
     Each segment uses the TARGET frame's ease (default spring) and its own duration (next.t - prev.t). */
  M.kf = (t, frames, opts = {}) => {
    const F = []; let acc = {};
    for (const f of frames) { acc = Object.assign({}, acc, f); F.push(acc); }
    if (t <= F[0].t) return strip(F[0]);
    for (let i = 1; i < F.length; i++) {
      const a = F[i - 1], b = F[i];
      const segEnd = b.t;
      if (t < segEnd || i === F.length - 1) {
        const dur = Math.max(1e-6, b.t - a.t);
        const p = M.ease(b.ease || opts.ease || 'spring', (t - a.t) / dur, b.bounce ?? opts.bounce ?? 0.25);
        const out = {};
        for (const k in b) if (typeof b[k] === 'number' && k !== 't' && k !== 'bounce') out[k] = lerp(a[k] ?? b[k], b[k], p);
        return out;
      }
    }
    return strip(F[F.length - 1]);
  };
  function strip(f) { const o = {}; for (const k in f) if (typeof f[k] === 'number' && k !== 't' && k !== 'bounce') o[k] = f[k]; return o; }

  /* squash & stretch from velocity of a kf track (pixels/frame) */
  M.stretch = (t, frames, axis = 'x', amt = 0.0035, max = 0.14) => {
    const a = M.kf(t - 1 / 30, frames), b = M.kf(t, frames);
    const v = Math.abs((b[axis] || 0) - (a[axis] || 0));
    const k = Math.min(max, v * amt);
    return axis === 'x' ? { sx: 1 + k, sy: 1 - k * .6 } : { sx: 1 - k * .6, sy: 1 + k };
  };

  // ---------- apply ----------
  M.set = (el, v = {}) => {
    if (!el) return;
    const s = v.s ?? 1, sx = (v.sx ?? 1) * s, sy = (v.sy ?? 1) * s;
    el.style.transform = `translate(${v.x || 0}px, ${v.y || 0}px) rotate(${v.r || 0}deg) scale(${sx}, ${sy})`;
    if (v.o !== undefined) el.style.opacity = clamp(v.o);
    if (v.blur !== undefined) el.style.filter = v.blur > .05 ? `blur(${v.blur}px)` : 'none';
    if (v.vis !== undefined) el.style.visibility = v.vis ? 'visible' : 'hidden';
  };
  M.show = (el, on) => { if (el) el.style.display = on ? '' : 'none'; };
  M.win = (t, t0, t1) => t >= t0 && t < t1;

  // ---------- masked line reveal ----------
  /* Splits el's text into lines (by layout), wraps each in an overflow-hidden mask. Call once after fonts load. */
  M.lines = el => {
    if (el._lines) return el._lines;
    const html = el.innerHTML; const words = [];
    // keep inline spans (e.g. <em>) as atomic words
    const tmp = document.createElement('div'); tmp.innerHTML = html;
    tmp.childNodes.forEach(n => {
      if (n.nodeType === 3) n.textContent.split(/(\s+)/).forEach(w => { if (w.trim()) words.push({ h: w }); });
      else if (n.nodeName === 'BR') words.push({ br: true });
      else words.push({ h: n.outerHTML });
    });
    el.innerHTML = words.map(w => w.br ? '<br>' : `<span class="mw" style="display:inline-block">${w.h}</span>`).join(' ');
    const spans = [...el.querySelectorAll('.mw')]; const rows = [];
    spans.forEach(sp => { const y = sp.offsetTop; let r = rows.find(r => Math.abs(r.y - y) < 4); if (!r) rows.push(r = { y, s: [] }); r.s.push(sp); });
    el.innerHTML = rows.map(r => `<span class="ml" style="display:block;overflow:hidden;padding-bottom:.06em;margin-bottom:-.06em"><span class="mi" style="display:inline-block;will-change:transform">${r.s.map(s => s.outerHTML).join(' ')}</span></span>`).join('');
    el._lines = [...el.querySelectorAll('.mi')];
    return el._lines;
  };
  /* reveal: lines rise from their mask (expo), stagger per line; exit slides up and out */
  M.reveal = (el, t, t0, t1 = 1e9, o = {}) => {
    const L = M.lines(el), st = o.stagger ?? 3 / 30, d = o.dur ?? .6, od = o.outDur ?? .3;
    M.show(el, t >= t0 - .001 && t < t1 + od + st * L.length);
    L.forEach((ln, i) => {
      const pin = M.expoOut((t - t0 - i * st) / d);
      const pout = M.expoIn((t - t1 - i * st * .6) / od);
      const y = (1 - pin) * 105 - pout * 105;
      ln.style.transform = `translateY(${y}%)`;
    });
  };

  // ---------- ticker rows ----------
  /* container: absolutely positioned element. rows: [{text:'Agents', sep:'→', dir:1|-1, speed:px/s, y, size, color, sepColor, weight}] */
  M.ticker = (container, rows) => {
    if (container._rows) return container._rows;
    container.style.overflow = 'hidden';
    container._rows = rows.map(r => {
      const row = document.createElement('div');
      row.style.cssText = `position:absolute;left:0;top:${r.y}px;white-space:nowrap;font:${r.weight || 800} ${r.size}px 'Inter Display',Inter,sans-serif;letter-spacing:-.045em;color:${r.color};line-height:1`;
      const unit = (r.items || [r.text]).map(w => `<span>${w}</span><span style="color:${r.sepColor || r.color};margin:0 .28em;font-weight:500">${r.sep ?? '→'}</span>`).join('');
      row.innerHTML = unit.repeat(8); container.appendChild(row);
      return Object.assign({ el: row, unitW: 0 }, r);
    });
    container._rows.forEach(r => r.unitW = r.el.scrollWidth / 8);
    return container._rows;
  };
  M.tickerAt = (container, t) => (container._rows || []).forEach((r, i) => {
    const off = ((t * r.speed) % r.unitW + r.unitW) % r.unitW;
    const x = r.dir > 0 ? -r.unitW + off : -off;
    r.el.style.transform = `translateX(${x + (r.phase || 0)}px)`;
  });

  // ---------- rounded mask (card ↔ full-bleed) ----------
  /* box values in px within parent: {l,t,w,h,r}; animates clip-path inset */
  M.mask = (el, W, H, box) => {
    const l = box.l, tp = box.t, r = W - (box.l + box.w), b = H - (box.t + box.h);
    el.style.clipPath = `inset(${tp}px ${r}px ${b}px ${l}px round ${box.r || 0}px)`;
  };

  // ---------- UI helpers ----------
  M.typing = (el, text, t, t0, cps = 28, caret = true) => {
    const n = Math.max(0, Math.min(text.length, Math.floor((t - t0) * cps)));
    const on = caret && (n < text.length || Math.floor(t * 2) % 2 === 0);
    el.textContent = text.slice(0, n) + (on && t >= t0 ? '▍' : '');
  };
  M.counter = (el, t, t0, dur, from, to, fmt = v => Math.round(v).toLocaleString()) => {
    el.textContent = fmt(lerp(from, to, M.expoOut((t - t0) / dur)));
  };
  /* cursor: an element containing an arrow svg; path = kf frames {t,x,y}; clicks = [times] → scale dip + ripple element (.ripple) */
  M.cursor = (el, t, path, clicks = []) => {
    const p = M.kf(t, path, { ease: 'expoInOut' });
    let s = 1, rp = -1;
    clicks.forEach(c => { const d = t - c; if (d >= 0 && d < .18) s = 1 - .18 * Math.sin(d / .18 * Math.PI); if (d >= 0 && d < .45) rp = d / .45; });
    M.set(el, { x: p.x, y: p.y, s, o: p.o ?? 1 });
    const ring = el.querySelector('.ripple');
    if (ring) { ring.style.opacity = rp >= 0 ? 1 - rp : 0; ring.style.transform = `translate(-50%,-50%) scale(${.3 + 1.7 * M.expoOut(rp)})`; }
  };
  /* video frames: img element + list/pattern of frame urls (pre-extracted at 30fps) */
  M.video = (img, t, t0, urls, loop = false) => {
    let i = Math.floor((t - t0) * 30); if (loop) i = ((i % urls.length) + urls.length) % urls.length; else i = clamp(i, 0, urls.length - 1);
    const u = urls[i]; if (img.getAttribute('src') !== u) img.setAttribute('src', u);
  };

  // ---------- icon morph (needs flubber) ----------
  const MC = {};
  M.morph = (pathEl, t, t0, dur, fromD, toD, ease = 'spring') => {
    const key = fromD + '|' + toD;
    if (!MC[key]) MC[key] = window.flubber ? flubber.interpolate(fromD, toD, { maxSegmentLength: 2 }) : (p => p < .5 ? fromD : toD);
    pathEl.setAttribute('d', MC[key](clamp(M.ease(ease, (t - t0) / dur, .2), 0, 1)));
  };


  // ---------- captions ----------
  /* Instagram "reel" captions: groups from transcribe.py reel_words.json [{s,e,words:[{w,s,e}]}]
     mode 'reel'  → 2–4 big words centred, active word in accent + pop, group springs in
     mode 'line'  → LinkedIn sentence captions: 1–2 clean lines in the lower third (use cues parsed from SRT)
     opts: {accent, size, y, maxW, font, upper}                                                                 */
  M.captions = (el, groups, t, o = {}) => {
    const g = groups.find(x => t >= x.s - .05 && t <= x.e + .15);
    if (!g) { el.innerHTML = ''; el._g = null; return; }
    if (el._g !== g) {
      el._g = g;
      el.innerHTML = g.words.map(w => `<span class="cw" style="display:inline-block;margin:0 .14em">${o.upper ? w.w.toUpperCase() : w.w}</span>`).join('');
    }
    const p = M.spring((t - g.s) / .35, .3);
    el.style.transform = `translateY(${(1 - p) * 30}px) scale(${.92 + .08 * p})`; el.style.opacity = M.clamp(p * 3);
    [...el.children].forEach((sp, i) => {
      const w = g.words[i], on = t >= w.s && t <= w.e + .05;
      const q = M.backOut(M.clamp((t - w.s) / .18));
      sp.style.color = on ? (o.accent || '#FFD400') : (o.color || '#fff');
      sp.style.transform = on ? `scale(${1 + .12 * (1 - Math.abs(1 - q))})` : 'scale(1)';
    });
  };
  /* parse SRT text → [{s,e,text}] for 'line' captions */
  M.parseSRT = srt => srt.trim().split(/\n\s*\n/).map(b => {
    const L = b.split('\n'); const m = (L[1] || '').match(/(\d+):(\d+):(\d+),(\d+) --> (\d+):(\d+):(\d+),(\d+)/);
    if (!m) return null; const T = (h, mi, se, ms) => +h * 3600 + +mi * 60 + +se + +ms / 1000;
    return { s: T(m[1], m[2], m[3], m[4]), e: T(m[5], m[6], m[7], m[8]), text: L.slice(2).join('<br>') };
  }).filter(Boolean);
  M.lineCaption = (el, cues, t) => {
    const c = cues.find(x => t >= x.s && t <= x.e);
    const html = c ? c.text : '';
    if (el._h !== html) { el._h = html; el.innerHTML = html; }
    el.style.opacity = c ? M.clamp(Math.min((t - c.s) / .12, (c.e - t) / .12)) : 0;
  };

  // ---------- helpers for scenes ----------
  /* scene(t, t0, t1, fn): runs fn(localT) only inside window, and toggles a root element */
  M.scene = (root, t, t0, t1, fn) => { const on = t >= t0 && t < t1; M.show(root, on); if (on) fn(t - t0, t1 - t0); };
  window.M = M;
})();
