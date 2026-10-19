// WB: whiteboard / "slateboard" explainer engine. Pure function of time.
// A board = {t0, t1, title, items:[...]}. Items (times local to board):
//  {k:'path', d, t0, dur, c, w, dash}          draw-on stroke (SVG path string)
//  {k:'text', s, x, y, size, t0, dur, c, align, font}   handwritten write-on
//  {k:'fill', d, t0, dur, c}                   fade-in filled shape (tabs, highlights)
//  {k:'label', s, x, y, size, t0, c, bg}       pop-in pill label (Inter)
//  {k:'fn', t0, t1, draw(ctx, lt)}             custom animation (orbits, flashes...)
(function () {
  const W = 1080, H = 1350;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const eIO = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const eOut = x => 1 - Math.pow(1 - clamp(x), 3);
  const eBack = x => { x = clamp(x); const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const INK = { navy: '#1E2A4A', red: '#E0263E', mag: '#E5287D', green: '#16A34A', blue: '#2563EB', gray: '#6B7280' };
  const mp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const ms = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); ms.appendChild(mp);
  ms.style.cssText = 'position:absolute;visibility:hidden'; document.body.appendChild(ms);
  const LC = {};
  const len = d => { if (!(d in LC)) { mp.setAttribute('d', d); LC[d] = mp.getTotalLength(); } return LC[d]; };
  const pt = (d, l) => { mp.setAttribute('d', d); const p = mp.getPointAtLength(l); return [p.x, p.y]; };

  // shape helpers (return SVG path strings)
  const S = {
    rrect: (x, y, w, h, r) => `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`,
    circle: (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`,
    arrow: (x1, y1, cx, cy, x2, y2, hs = 22) => {
      const a = Math.atan2(y2 - cy, x2 - cx);
      const h1 = [x2 - hs * Math.cos(a - .5), y2 - hs * Math.sin(a - .5)], h2 = [x2 - hs * Math.cos(a + .5), y2 - hs * Math.sin(a + .5)];
      return `M${x1} ${y1}Q${cx} ${cy} ${x2} ${y2}M${h1[0].toFixed(1)} ${h1[1].toFixed(1)}L${x2} ${y2}L${h2[0].toFixed(1)} ${h2[1].toFixed(1)}`;
    },
    check: (x, y, s = 1) => `M${x} ${y}l${12 * s} ${12 * s}l${24 * s} ${-28 * s}`,
    cross: (x, y, s = 1) => `M${x - 14 * s} ${y - 14 * s}l${28 * s} ${28 * s}M${x + 14 * s} ${y - 14 * s}l${-28 * s} ${28 * s}`
  };
  const ICON = {
    robot: 'M7 9h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z M12 9V5.5 M10.7 4.4a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0-2.6 0 M9.5 13v1.5 M14.5 13v1.5 M3 12.5v3 M21 12.5v3',
    browser: 'M3 5h18v14H3z M3 9h18 M6 7h.5 M8.5 7h.5',
    terminal: 'M3 5h18v14H3z M7 10l3 2.5-3 2.5 M12 15h5',
    api: 'M8 5c-2 0-2 2-2 4s-1 3-2 3c1 0 2 1 2 3s0 4 2 4 M16 5c2 0 2 2 2 4s1 3 2 3c-1 0-2 1-2 3s0 4-2 4',
    file: 'M6 3h8l5 5v13H6z M14 3v5h5',
    laptop: 'M5 5h14v10H5z M2 18h20l-1.5 2h-17z',
    shield: 'M12 3l8 3v6c0 5-3.5 8-8 9c-4.5-1-8-4-8-9V6z M8.5 12l2.5 2.5 4.5-5',
    plus: 'M12 6v12 M6 12h12',
    play: 'M8 5l11 7-11 7z',
    camera: 'M4 8h4l1.5-2h5L16 8h4v11H4z M9 13.5a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
    pause: 'M8 6v12 M16 6v12',
    trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13 M10 11v6 M14 11v6',
    bulb: 'M9 18h6 M10 21h4 M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
    target: 'M12 3a9 9 0 1 0 .01 0 M12 7a5 5 0 1 0 .01 0 M12 11a1 1 0 1 0 .01 0',
    gear: 'M12 8.5a3.5 3.5 0 1 0 .01 0 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M4.9 4.9l2.1 2.1 M17 17l2.1 2.1 M4.9 19.1L7 17 M17 7l2.1-2.1',
    warn: 'M12 3l10 18H2z M12 10v5 M12 17.5v.5',
    key: 'M7 14a4 4 0 1 1 3.5-6L21 8v4h-3v3h-3l-1.5-2.5A4 4 0 0 1 7 14z',
    money: 'M3 6h18v12H3z M12 9.5a2.5 2.5 0 1 0 .01 0 M6 9v6 M18 9v6'
  };

  const SUB = {};
  const subs = d => SUB[d] || (SUB[d] = d.match(/[Mm][^Mm]*/g).map((x, i, a) => {
    // make relative 'm' absolute-safe: only first subpath may be relative, icons use absolute M
    return x; }));
  function drawPath(ctx, d, p, o) {
    const parts = subs(d), lens = parts.map(len), tot = lens.reduce((a, b) => a + b, 0);
    let rem = tot * p, tip = null;
    ctx.save();
    if (o.tf) { ctx.translate(o.tf[0], o.tf[1]); ctx.scale(o.tf[2], o.tf[2]); }
    ctx.strokeStyle = o.c || INK.navy; ctx.lineWidth = (o.w || 6) / (o.tf ? o.tf[2] : 1);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < parts.length && rem > 0; i++) {
      const L = lens[i], q = Math.min(1, rem / Math.max(L, 1e-3)); rem -= L;
      if (q >= 1) { ctx.setLineDash([]); ctx.stroke(new Path2D(parts[i])); }
      else { ctx.setLineDash([L * q, L + 50]); ctx.stroke(new Path2D(parts[i])); tip = pt(parts[i], L * q); }
    }
    ctx.restore();
    if (tip && p < 1) {
      let [x, y] = tip;
      if (o.tf) { x = o.tf[0] + x * o.tf[2]; y = o.tf[1] + y * o.tf[2]; }
      return [x, y];
    }
    return null;
  }

  function marker(ctx, x, y, c, t) {
    // marker pen whose tip sits at (x,y); gentle wobble
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.62 + Math.sin(t * 18) * .03);
    ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = 18; ctx.shadowOffsetX = 10; ctx.shadowOffsetY = 14;
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(10, -22); ctx.lineTo(-10, -22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#E5E7EB'; ctx.fillRect(-15, -60, 30, 38);
    ctx.fillStyle = '#F9FAFB'; ctx.beginPath(); ctx.roundRect(-17, -230, 34, 172, 8); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(-19, -262, 38, 56, 9); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(6, -228, 8, 168);
    ctx.restore();
  }

  function background(ctx, t) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#FBFBF8'); g.addColorStop(1, '#ECEEF1');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // faint ghosting of old erased marker + grid dots
    ctx.fillStyle = 'rgba(30,42,74,.07)';
    for (let x = 60; x < W; x += 60) for (let y = 60; y < H; y += 60) { ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 6.28); ctx.fill(); }
    // aluminium frame
    ctx.strokeStyle = '#C9CED6'; ctx.lineWidth = 22; ctx.strokeRect(11, 11, W - 22, H - 22);
    ctx.strokeStyle = '#E8EBEF'; ctx.lineWidth = 6; ctx.strokeRect(26, 26, W - 52, H - 52);
  }

  function drawBoard(ctx, b, lt, live) {
    let pen = null, penC = INK.navy, penT = -1;
    for (const it of b.items) {
      const p = it.dur ? clamp((lt - it.t0) / it.dur) : (lt >= it.t0 ? 1 : 0);
      if (lt < it.t0 && it.k !== 'fn') continue;
      if (it.k === 'path') {
        const tip = drawPath(ctx, it.d, eIO(p), it);
        if (tip && it.t0 >= penT) { pen = tip; penC = it.c || INK.navy; penT = it.t0; }
      } else if (it.k === 'text') {
        ctx.save();
        ctx.font = `700 ${it.size}px ${it.font || 'Caveat'}`; ctx.fillStyle = it.c || INK.navy;
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        const w = ctx.measureText(it.s).width; const x0 = it.align === 'center' ? it.x - w / 2 : it.align === 'right' ? it.x - w : it.x;
        const q = p;
        ctx.beginPath(); ctx.rect(x0 - 10, it.y - it.size * 1.1, (w + 20) * q, it.size * 1.5); ctx.clip();
        ctx.fillText(it.s, x0, it.y); ctx.restore();
        if (p > 0 && p < 1 && it.t0 >= penT) { pen = [x0 + w * q, it.y - it.size * .25 + Math.sin(lt * 40) * it.size * .12]; penC = it.c || INK.navy; penT = it.t0; }
      } else if (it.k === 'fill') {
        ctx.save(); ctx.globalAlpha = eOut(p) * (it.a ?? 1); ctx.fillStyle = it.c; ctx.fill(new Path2D(it.d)); ctx.restore();
      } else if (it.k === 'label') {
        const s = eBack(clamp((lt - it.t0) / .3));
        ctx.save(); ctx.font = `800 ${it.size}px Inter`; const w = ctx.measureText(it.s).width;
        ctx.translate(it.x, it.y); ctx.scale(s, s);
        ctx.fillStyle = it.bg || INK.navy; ctx.beginPath(); ctx.roundRect(-w / 2 - 18, -it.size * .85, w + 36, it.size * 1.3, 10); ctx.fill();
        ctx.fillStyle = it.c || '#fff'; ctx.textAlign = 'center'; ctx.fillText(it.s, 0, it.size * .2); ctx.restore();
      } else if (it.k === 'fn') {
        if (lt >= it.t0 && lt < (it.t1 ?? 1e9)) it.draw(ctx, lt);
      }
    }
    if (live && pen) marker(ctx, pen[0], pen[1], penC, lt);
  }

  const WB = { W, H, INK, S, ICON, boards: [], clamp, eIO, eOut, eBack, len };
  WB.icon = (name, cx, cy, s, t0, dur, c, w = 6) => ({ k: 'path', d: ICON[name], t0, dur, c, w, tf: [cx - 12 * s, cy - 12 * s, s] });
  WB.add = b => { WB.boards.push(b); return b; };
  // scribble sound cues (absolute times) for the audio engine
  WB.cues = () => WB.boards.flatMap((b, bi) => b.items.filter(i => (i.k === 'path' || i.k === 'text') && i.dur).map(i => [+(b.t0 + (bi > 0 ? .38 : 0) + i.t0).toFixed(3), i.dur]));
  WB.render = (ctx, t) => {
    ctx.clearRect(0, 0, W, H);
    const i = WB.boards.findIndex(b => t >= b.t0 && t < b.t1);
    if (i < 0) return;
    const b = WB.boards[i], lt = t - b.t0, SL = .38;
    background(ctx, t);
    // slide-in from previous board
    if (i > 0 && lt < SL && WB.boards[i - 1].t1 >= b.t0 - .01) {
      const e = eIO(lt / SL), prev = WB.boards[i - 1];
      ctx.save(); ctx.translate(-W * e, 0); drawBoard(ctx, prev, prev.t1 - prev.t0, false); ctx.restore();
      ctx.save(); ctx.translate(W * (1 - e), 0); drawBoard(ctx, b, 0, false); ctx.restore();
      return;
    }
    drawBoard(ctx, b, lt - (i > 0 ? SL : 0), true);
  };
  window.WB = WB;
})();
