// FX: deterministic canvas motion graphics, all a pure function of t.
// Layers: #fxb (behind text) and #fxf (in front of text). Register effects with FX.back/FX.front.
(function () {
  const W = 1080, H = 1350;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const eOut = x => 1 - Math.pow(1 - clamp(x), 3);
  const eIO = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const eBack = x => { x = clamp(x); const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const COL = { red: '#ED1C3A', mag: '#FF2D87', pur: '#7B2FF7', wht: '#FFFFFF', pink: '#FF8FB6', cyan: '#4FE3FF' };
  const FX = { W, H, clamp, eOut, eIO, eBack, rng, COL, b: [], f: [] };
  FX.back = fn => FX.b.push(fn); FX.front = fn => FX.f.push(fn);
  // window [t0,t1] → local progress helpers
  FX.win = (t, t0, t1, fin = .25, fout = .2) => (t < t0 || t > t1) ? 0 : Math.min(clamp((t - t0) / fin), clamp((t1 - t) / fout));

  // ---------- primitives ----------
  // Neural network / agent constellation
  FX.network = (ctx, t, a, o = {}) => {
    if (a <= 0) return;
    const r = rng(o.seed || 7), n = o.n || 44, md = o.dist || 230;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const bx = r() * W, by = (o.y0 ?? 0) + r() * ((o.y1 ?? H) - (o.y0 ?? 0)), ph = r() * 6.28, sp = .25 + r() * .5;
      pts.push([bx + Math.sin(t * sp + ph) * 40, by + Math.cos(t * sp * .8 + ph) * 34, r()]);
    }
    ctx.save(); ctx.globalAlpha = a;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1], d = Math.hypot(dx, dy);
      if (d < md) {
        ctx.strokeStyle = `rgba(255,143,182,${(1 - d / md) * .55})`; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[j][0], pts[j][1]); ctx.stroke();
        // data pulse travelling along some edges
        if ((i * 7 + j) % 5 === 0) {
          const p = ((t * 1.3 + (i + j) * .137) % 1);
          ctx.fillStyle = `rgba(255,255,255,${(1 - d / md)})`;
          ctx.beginPath(); ctx.arc(pts[i][0] - dx * p, pts[i][1] - dy * p, 3.2, 0, 6.28); ctx.fill();
        }
      }
    }
    for (const [x, y, k] of pts) {
      const pulse = .6 + .4 * Math.sin(t * 4 + k * 20);
      const g = ctx.createRadialGradient(x, y, 0, x, y, 18);
      g.addColorStop(0, `rgba(255,45,135,${.9 * pulse})`); g.addColorStop(1, 'rgba(255,45,135,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 18, 0, 6.28); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 3.5 + k * 2.5, 0, 6.28); ctx.fill();
    }
    ctx.restore();
  };

  // Shockwave ring + spark burst
  FX.shock = (ctx, t, t0, x, y, o = {}) => {
    const p = (t - t0) / (o.dur || .6); if (p < 0 || p > 1) return;
    const e = eOut(p), R = (o.r || 620) * e;
    ctx.save();
    ctx.strokeStyle = o.c || COL.mag; ctx.globalAlpha = (1 - p) * .9; ctx.lineWidth = 16 * (1 - p) + 1;
    ctx.beginPath(); ctx.arc(x, y, R, 0, 6.28); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4 * (1 - p);
    ctx.beginPath(); ctx.arc(x, y, R * .72, 0, 6.28); ctx.stroke();
    const r = rng(Math.floor(t0 * 100)); const n = o.sparks ?? 22;
    for (let i = 0; i < n; i++) {
      const ang = r() * 6.28, sp = .5 + r() * .7, len = 30 + r() * 50;
      const d0 = R * sp * 1.1, d1 = d0 + len * (1 - p);
      ctx.strokeStyle = i % 3 ? '#fff' : COL.red; ctx.lineWidth = 5 * (1 - p);
      ctx.beginPath(); ctx.moveTo(x + Math.cos(ang) * d0, y + Math.sin(ang) * d0);
      ctx.lineTo(x + Math.cos(ang) * d1, y + Math.sin(ang) * d1); ctx.stroke();
    }
    ctx.restore();
  };

  // Diagonal brand-colour wipe, fully covering frame at tc
  FX.wipe = (ctx, t, tc, dir = 1) => {
    const d = .52, p = (t - (tc - d / 2)) / d; if (p < 0 || p > 1) return;
    const cols = [COL.pur, COL.mag, COL.red];
    ctx.save();
    cols.forEach((c, i) => {
      const q = clamp(p * 1.25 - i * .09);
      // band travels from off-left to off-right; wide enough to cover frame at q=.5
      const x = (-2.2 * W + 4.4 * W * eIO(q)) * dir;
      ctx.fillStyle = c; ctx.beginPath();
      const bw = W * (1.25 - i * .12), sk = 420;
      ctx.moveTo(x - bw / 2 + sk, -10); ctx.lineTo(x + bw / 2 + sk, -10);
      ctx.lineTo(x + bw / 2 - sk, H + 10); ctx.lineTo(x - bw / 2 - sk, H + 10); ctx.closePath(); ctx.fill();
    });
    ctx.restore();
  };

  // Path draw-on (SVG path string), with optional arrow head
  const measure = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const msvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); msvg.appendChild(measure);
  msvg.style.position = 'absolute'; msvg.style.visibility = 'hidden'; document.body.appendChild(msvg);
  const lenCache = {};
  FX.plen = d => { if (!(d in lenCache)) { measure.setAttribute('d', d); lenCache[d] = measure.getTotalLength(); } return lenCache[d]; };
  FX.draw = (ctx, d, p, o = {}) => {
    if (p <= 0) return;
    const parts = d.match(/[Mm][^Mm]*/g), lens = parts.map(FX.plen), tot = lens.reduce((a, b) => a + b, 0);
    let rem = tot * clamp(p);
    ctx.save(); if (o.tx) ctx.translate(o.tx[0], o.tx[1]); if (o.s) ctx.scale(o.s, o.s);
    ctx.strokeStyle = o.c || '#fff'; ctx.lineWidth = o.w || 8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.globalAlpha = o.a ?? 1;
    if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = 18; }
    for (let i = 0; i < parts.length && rem > 0; i++) {
      const L = lens[i], q = Math.min(1, rem / Math.max(L, 1e-3)); rem -= L;
      ctx.setLineDash(q >= 1 ? [] : [L * q, L + 10]); ctx.stroke(new Path2D(parts[i]));
    }
    ctx.restore();
  };

  // Viewfinder corner brackets closing in on a box
  FX.brackets = (ctx, t, t0, x, y, w, h, o = {}) => {
    const p = eOut((t - t0) / .45); if (t < t0) return;
    const g = (1 - p) * 90, L = o.L || 60;
    const x0 = x - g, y0 = y - g, x1 = x + w + g, y1 = y + h + g;
    ctx.save(); ctx.strokeStyle = o.c || '#fff'; ctx.lineWidth = o.lw || 7; ctx.globalAlpha = (o.a ?? 1) * clamp(p * 2);
    ctx.lineCap = 'square'; ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 10;
    [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]].forEach(([cx, cy, sx, sy]) => {
      ctx.beginPath(); ctx.moveTo(cx, cy + sy * L); ctx.lineTo(cx, cy); ctx.lineTo(cx + sx * L, cy); ctx.stroke();
    });
    ctx.restore();
  };

  // Mouse cursor with click ripple
  FX.cursor = (ctx, x, y, clickP) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(2.1, 2.1);
    if (clickP >= 0 && clickP <= 1) {
      ctx.strokeStyle = `rgba(255,45,135,${1 - clickP})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 6 + 26 * eOut(clickP), 0, 6.28); ctx.stroke();
    }
    const s = clickP >= 0 && clickP < .3 ? .85 : 1; ctx.scale(s, s);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111'; ctx.lineWidth = 1.6;
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 22); ctx.lineTo(6, 17); ctx.lineTo(10, 26); ctx.lineTo(14, 24);
    ctx.lineTo(10, 15.5); ctx.lineTo(17, 15.5); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  };

  // Confetti burst with gravity
  FX.confetti = (ctx, t, t0, o = {}) => {
    const dt = t - t0; if (dt < 0) return;
    const r = rng(o.seed || 99), n = o.n || 140, cols = [COL.red, COL.mag, COL.pur, '#fff', '#FFC93C'];
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1;
      const x0 = W / 2 + side * (W * .52), y0 = H * .78;
      const ang = -Math.PI / 2 - side * (.25 + r() * .55), sp = 1100 + r() * 900;
      const vx = Math.cos(ang) * sp, vy = Math.sin(ang) * sp;
      const drag = Math.exp(-dt * 1.6);
      const x = x0 + vx * (1 - drag) / 1.6 + Math.sin(dt * 5 + i) * 18;
      const y = y0 + vy * (1 - drag) / 1.6 + 380 * dt * dt;
      const c = cols[i % cols.length], rot = dt * (6 + r() * 8) + i, w = 12 + r() * 10, h = 6 + r() * 6;
      const a = clamp(1 - (dt - 2.4) / 1.2);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, Math.abs(Math.cos(dt * 7 + i)));
      ctx.fillStyle = c; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.restore();
    }
  };

  // 4-point sparkle
  FX.sparkle = (ctx, x, y, s, a, c = '#fff') => {
    if (a <= 0 || s <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = c;
    ctx.shadowColor = c; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.moveTo(0, -24); ctx.quadraticCurveTo(3, -3, 24, 0); ctx.quadraticCurveTo(3, 3, 0, 24);
    ctx.quadraticCurveTo(-3, 3, -24, 0); ctx.quadraticCurveTo(-3, -3, 0, -24); ctx.fill(); ctx.restore();
  };

  // Person icon
  FX.person = (ctx, x, y, s, c) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(0, -16, 10, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-17, 18); ctx.quadraticCurveTo(-17, -2, 0, -2); ctx.quadraticCurveTo(17, -2, 17, 18); ctx.closePath(); ctx.fill();
    ctx.restore();
  };

  // Light streak (anamorphic flare)
  FX.streak = (ctx, t, t0, y, o = {}) => {
    const p = (t - t0) / (o.dur || .7); if (p < 0 || p > 1) return;
    const x = -300 + (W + 600) * eIO(p);
    ctx.save(); ctx.globalAlpha = Math.sin(p * Math.PI) * .9;
    const g = ctx.createLinearGradient(x - 500, 0, x + 500, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,220,240,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 500, y - 3, 1000, 6);
    const r = ctx.createRadialGradient(x, y, 0, x, y, 120);
    r.addColorStop(0, 'rgba(255,255,255,.95)'); r.addColorStop(.3, 'rgba(255,45,135,.4)'); r.addColorStop(1, 'rgba(255,45,135,0)');
    ctx.fillStyle = r; ctx.beginPath(); ctx.arc(x, y, 120, 0, 6.28); ctx.fill(); ctx.restore();
  };

  // Drifting light leaks at frame edges
  FX.leaks = (ctx, t, a) => {
    if (a <= 0) return;
    const blobs = [[.0, .15, COL.mag, .9], [1.0, .8, COL.red, 1.3], [.1, .95, COL.pur, .7]];
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    blobs.forEach(([bx, by, c, sp], i) => {
      const x = bx * W + Math.sin(t * sp + i) * 160, y = by * H + Math.cos(t * sp * .7 + i) * 140;
      const R = 420 + Math.sin(t * 1.3 + i) * 80;
      const g = ctx.createRadialGradient(x, y, 0, x, y, R);
      g.addColorStop(0, c + '55'); g.addColorStop(1, c + '00');
      ctx.globalAlpha = a; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    });
    ctx.restore();
  };

  FX.render = t => {
    const b = document.getElementById('fxb').getContext('2d'), f = document.getElementById('fxf').getContext('2d');
    b.clearRect(0, 0, W, H); f.clearRect(0, 0, W, H);
    FX.b.forEach(fn => fn(b, t)); FX.f.forEach(fn => fn(f, t));
  };
  window.FX = FX;
})();
