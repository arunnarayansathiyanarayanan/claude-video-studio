// EXAMPLE motion-graphics scene, 60 s cut (uses scripts/fx.js). LEGACY look — see framework/MOTION_STYLE.md kill list.
(function () {
  const { win, clamp, eOut, eIO, eBack, rng, COL, W, H } = FX;
  const ICON = {
    wallet: 'M3 7.5h16a1.5 1.5 0 0 1 1.5 1.5v9.5A1.5 1.5 0 0 1 19 20H4.5A1.5 1.5 0 0 1 3 18.5z M3 7.5l12.5-4 1.5 4 M16 13.75h.01',
    layers: 'M12 3l9 5-9 5-9-5z M3 12.5l9 5 9-5 M3 16.5l9 5 9-5',
    code: 'M8 7l-5 5 5 5 M16 7l5 5-5 5 M14 4l-4 16'
  };
  function scribble(cx, cy, rx, ry, turns, seed) {
    const r = rng(seed); let d = '';
    for (let i = 0; i <= 90; i++) {
      const a = -2.2 + (i / 90) * turns * 6.283, k = 1 + (r() - .5) * .05 + i / 90 * .06;
      d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rx * k).toFixed(1) + ' ' + (cy + Math.sin(a) * ry * k).toFixed(1) + ' ';
    }
    return d;
  }
  const CIRCLE = scribble(450, 640, 215, 140, 1.12, 3);
  const ARROW = 'M 400 1120 C 500 1060, 610 930, 735 770', HEAD = 'M 692 783 L 735 770 L 733 815';
  const WBON = t => t >= 14.0 && t < 38.5;

  FX.back((c, t) => {
    if (!WBON(t)) FX.leaks(c, t, (t > 39.5 && t < 53.3) ? .25 : .55);
    FX.network(c, t, win(t, 0, 2.5, .35, .15) * .95, { seed: 7, n: 46 });
    FX.network(c, t, win(t, 38.5, 39.5, .2, .1) * .9, { seed: 21, n: 40 });
    FX.network(c, t, win(t, 39.5, 53.3, .4, .2) * .35, { seed: 22, n: 18, y0: 40, y1: 400, dist: 260 });
    // Packed: crowd icons fill in
    if (t >= 12.5 && t < 14.0) {
      const r = rng(5), out = clamp((13.95 - t) / .15);
      for (let row = 0; row < 3; row++) for (let i = 0; i < 9; i++) {
        const p = eBack((t - 12.55 - r() * .55) / .22); if (p <= 0) continue;
        c.globalAlpha = out; FX.person(c, 140 + i * 100, 1000 + row * 95, 1.7 * p, [COL.wht, COL.pink, COL.red][(row * 9 + i) % 3]); c.globalAlpha = 1;
      }
    }
  });

  FX.front((c, t) => {
    [[.15, 540, 520, COL.mag], [.55, 540, 640, COL.red], [3.55, 540, 640, COL.mag], [7.0, 540, 1030, COL.red],
     [12.55, 540, 500, COL.mag], [12.85, 540, 650, COL.red], [13.15, 540, 800, COL.pur], [38.6, 540, 600, COL.mag],
     [53.75, 540, 960, COL.mag]].forEach(([t0, x, y, col]) => FX.shock(c, t, t0, x, y, { c: col }));
    FX.streak(c, t, .6, 700); FX.streak(c, t, 1.3, 520); FX.streak(c, t, 4.62, 1095, { dur: .6 }); FX.streak(c, t, 54.2, 1060);
    // selfie arrow
    if (t >= 5.6 && t < 6.5) {
      const a = clamp((6.48 - t) / .12);
      FX.draw(c, ARROW, eOut((t - 5.62) / .33), { w: 9, glow: COL.mag, a });
      FX.draw(c, HEAD, eOut((t - 5.92) / .14), { w: 9, glow: COL.mag, a });
      const p = eBack((t - 5.9) / .28);
      if (p > 0) {
        c.save(); c.globalAlpha = a; c.translate(330, 1175); c.rotate(-.08); c.scale(p, p);
        c.font = '700 80px Caveat'; c.textAlign = 'center';
        c.fillStyle = COL.red; c.fillText("that's me", 4, 4); c.fillStyle = '#fff'; c.fillText("that's me", 0, 0); c.restore();
      }
    }
    // theme circle + sparkles
    if (t >= 6.6 && t < 8.0) {
      const a = clamp((7.98 - t) / .15);
      FX.draw(c, CIRCLE, eIO((t - 6.62) / .5), { w: 10, c: COL.mag, glow: COL.mag, a });
      const r = rng(11);
      for (let i = 0; i < 7; i++) {
        const x = 170 + r() * 740, y = 900 + r() * 260, p = clamp((t - (7.05 + r() * .5)) / .5);
        FX.sparkle(c, x, y, Math.sin(p * Math.PI) * (.6 + r() * .6), a, i % 2 ? '#fff' : COL.pink);
      }
    }
    // framed clips
    if (t >= 8.0 && t < 11.0) {
      const t0 = t < 9.5 ? 8.05 : 9.55, a = clamp(((t < 9.5 ? 9.48 : 10.98) - t) / .12);
      FX.brackets(c, t, t0, 26, 390, 1028, 570, { a, L: 70 });
      if (t >= 8.2 && t < 9.4) {
        const y = 395 + 560 * eIO((t - 8.2) / 1.2);
        const g = c.createLinearGradient(0, y - 60, 0, y + 4);
        g.addColorStop(0, 'rgba(79,227,255,0)'); g.addColorStop(1, 'rgba(79,227,255,.35)');
        c.fillStyle = g; c.fillRect(30, y - 60, 1020, 64); c.fillStyle = 'rgba(180,245,255,.9)'; c.fillRect(30, y, 1020, 3);
      }
      if (t >= 9.6) {
        const k1 = eIO((t - 9.62) / .5), k2 = eIO((t - 10.28) / .4);
        const x = 900 + (287 - 900) * k1 + (443 - 287) * k2, y = 1150 + (492 - 1150) * k1 + (788 - 492) * k2;
        c.globalAlpha = a; FX.cursor(c, x, y, t < 10.28 ? (t - 10.15) / .3 : (t - 10.7) / .3); c.globalAlpha = 1;
      }
    }
    if (t >= 11.1 && t < 12.5) FX.brackets(c, t, 11.12, 445, 860, 200, 400, { a: clamp((12.48 - t) / .12), c: COL.red, L: 46, lw: 6 });
    // takeaway icons beside the kicker
    [['wallet', 39.55, 44.1], ['layers', 44.15, 48.7], ['code', 48.75, 53.3]].forEach(([k, t0, t1]) => {
      if (t < t0 || t >= t1) return; const s = 2.6, cx = 975, cy = 390;
      FX.draw(c, ICON[k], eIO((t - t0) / .5), { w: 2.2, s, tx: [cx - 12 * s, cy - 12 * s], c: COL.pink, glow: COL.mag, a: clamp((t1 - .02 - t) / .15) });
    });
    // takeaway timer bars (reading pace)
    [[39.5, 44.1], [44.1, 48.7], [48.7, 53.3]].forEach(([a, b], i) => {
      if (t < a || t >= b) return; c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(70, 1238, 940, 6);
      c.fillStyle = COL.mag; c.fillRect(70, 1238, 940 * clamp((t - a) / (b - a)), 6);
    });
    FX.confetti(c, t, 53.5);
    if (t > 54.5) {
      const r = rng(41);
      for (let i = 0; i < 6; i++) {
        const x = 90 + r() * 900, y = 800 + r() * 120, p = clamp((t - (54.5 + r() * 4.5)) / .6);
        FX.sparkle(c, x, y, Math.sin(p * Math.PI) * (.5 + r() * .5), 1, i % 2 ? '#fff' : COL.pink);
      }
    }
    // section wipes
    FX.wipe(c, t, 2.5, 1); FX.wipe(c, t, 6.5, -1); FX.wipe(c, t, 14.0, 1); FX.wipe(c, t, 38.5, -1); FX.wipe(c, t, 53.3, 1);
  });
})();
