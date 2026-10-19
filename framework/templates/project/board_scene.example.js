// EXAMPLE whiteboard explainer (4 boards): What is an AI agent → why acting is risky → the sandbox fix → lifecycle.
// Replace content for your topic. The last board's soft mention is OPTIONAL: delete those items if you don't promote anything.
(function () {
  const { S, INK, icon, clamp, eIO, eOut } = Object.assign({}, WB, { icon: WB.icon });
  const T = (s, x, y, size, t0, dur, c, align = 'center') => ({ k: 'text', s, x, y, size, t0, dur, c, align });
  const P = (d, t0, dur, c, w) => ({ k: 'path', d, t0, dur, c, w });
  const L = (s, x, y, size, t0, bg, c) => ({ k: 'label', s, x, y, size, t0, bg, c });
  const F = (d, t0, dur, c, a) => ({ k: 'fill', d, t0, dur, c, a });

  // ---------- B1: What is an AI agent? ----------
  WB.add({ t0: 14.0, t1: 21.0, items: [
    T('What is an AI agent?', 540, 205, 96, .1, .7, INK.navy),
    P('M250 232 Q540 252 830 228', .85, .22, INK.red, 7),
    L('CHATBOT', 235, 330, 30, 1.05, INK.gray),
    P(S.rrect(75, 390, 320, 190, 28), 1.1, .4, INK.navy, 6),
    P('M140 580 L118 640 L205 580', 1.5, .12, INK.navy, 6),
    T('"Book me a flight"', 235, 470, 52, 1.62, .35, INK.navy),
    T('→ here are 5 options', 235, 535, 44, 1.98, .35, INK.gray),
    T('answers', 235, 745, 74, 2.35, .25, INK.gray),
    T('vs', 505, 520, 66, 2.55, .12, INK.red),
    L('AI AGENT', 775, 330, 30, 2.62, INK.mag),
    P(S.circle(775, 520, 150), 2.68, .55, INK.mag, 7),
    icon('robot', 775, 520, 3.4, 2.95, .45, INK.navy, 6),
    L('Plan', 775, 380, 28, 3.12, INK.navy), L('Act', 925, 530, 28, 3.24, INK.navy),
    L('Check', 775, 682, 28, 3.36, INK.navy), L('Adjust', 625, 530, 28, 3.48, INK.navy),
    { k: 'fn', t0: 3.55, draw(c, lt) {           // the loop runs: a pulse orbits Plan→Act→Check→Adjust
      for (let k = 0; k < 6; k++) {
        const a = -Math.PI / 2 + (lt - 3.55 - k * .035) * 2 * Math.PI / 1.5;
        c.fillStyle = `rgba(229,40,125,${1 - k / 6})`; c.beginPath();
        c.arc(775 + Math.cos(a) * 150, 520 + Math.sin(a) * 150, 13 - k * 1.6, 0, 6.28); c.fill();
      }
    } },
    T('books it', 755, 750, 74, 3.6, .28, INK.navy),
    P(S.check(870, 725, 1.2), 3.9, .14, INK.green, 8),
    T('using tools', 540, 860, 54, 4.05, .25, INK.gray),
    icon('browser', 330, 940, 3.3, 4.25, .2, INK.navy, 5), icon('terminal', 470, 940, 3.3, 4.37, .2, INK.navy, 5),
    icon('api', 610, 940, 3.3, 4.49, .2, INK.navy, 5), icon('file', 750, 940, 3.3, 4.61, .2, INK.navy, 5),
    T("It doesn't just answer. It plans,", 540, 1085, 66, 4.8, .5, INK.navy),
    T('uses tools and takes actions.', 540, 1160, 66, 5.32, .45, INK.mag),
  ] });

  // ---------- B2: Acting = real risk ----------
  const scr = [435, 415, 210, 150];  // laptop screen box for the alarm flash
  WB.add({ t0: 21.0, t1: 27.0, items: [
    T('Acting = real risk', 540, 205, 96, .05, .6, INK.navy),
    P('M270 232 Q540 250 810 228', .7, .2, INK.red, 7),
    icon('laptop', 540, 520, 15, .85, .6, INK.navy, 7),
    T('your systems', 540, 725, 64, 1.4, .3, INK.navy),
    icon('robot', 150, 505, 4.2, 1.55, .35, INK.navy, 6),
    P(S.arrow(212, 470, 300, 405, 410, 462), 1.85, .3, INK.navy, 6),
    T('runs code', 290, 388, 52, 2.0, .25, INK.navy),
    { k: 'fn', t0: 2.25, draw(c, lt) {            // screen alarm flash
      c.fillStyle = `rgba(224,38,62,${.18 + .22 * (.5 + .5 * Math.sin(lt * 14))})`; c.fillRect(...scr);
    } },
    icon('warn', 765, 400, 2.0, 2.3, .18, INK.red, 5), T('rm -rf /', 800, 418, 58, 2.42, .25, INK.red, 'left'),
    icon('key', 765, 490, 2.0, 2.55, .18, INK.red, 5), T('leaked keys', 800, 508, 58, 2.67, .28, INK.red, 'left'),
    icon('money', 110, 840, 2.0, 2.8, .18, INK.red, 5), T('runaway bill', 150, 858, 58, 2.92, .28, INK.red, 'left'),
    icon('warn', 560, 840, 2.0, 3.05, .18, INK.red, 5), T('prompt injection', 598, 858, 58, 3.17, .3, INK.red, 'left'),
    T('Agents run code nobody reviewed.', 540, 1050, 66, 3.5, .45, INK.navy),
    T('On your own infra, one bad step is costly.', 540, 1130, 56, 4.0, .5, INK.red),
  ] });

  // ---------- B3: The fix — a sandbox ----------
  WB.add({ t0: 27.0, t1: 32.5, items: [
    T('The fix: a sandbox', 540, 205, 96, .05, .6, INK.navy),
    P('M260 232 Q540 250 820 228', .7, .2, INK.green, 7),
    P(S.rrect(150, 362, 780, 400, 28), .85, .65, INK.green, 8),
    F(S.rrect(150, 300, 260, 64, 14), 1.4, .15, INK.green),
    L('SANDBOX', 280, 345, 32, 1.42, INK.green),
    icon('robot', 300, 570, 4.5, 1.55, .35, INK.navy, 6),
    icon('terminal', 520, 520, 3, 1.85, .22, INK.navy, 5), icon('browser', 660, 520, 3, 2.0, .22, INK.navy, 5),
    icon('file', 800, 520, 3, 2.15, .22, INK.navy, 5),
    P(S.check(500, 600), 2.35, .12, INK.green, 7), P(S.check(640, 600), 2.45, .12, INK.green, 7), P(S.check(780, 600), 2.55, .12, INK.green, 7),
    { k: 'fn', t0: 2.7, draw(c, lt) {             // something breaks inside… and stays inside
      const p = (lt - 2.7);
      c.save(); c.beginPath(); c.rect(154, 366, 772, 392); c.clip();
      for (let k = 0; k < 3; k++) {
        const q = ((p - k * .35) % 1.05) / 1.05; if (p - k * .35 < 0) continue;
        c.strokeStyle = `rgba(224,38,62,${(1 - q) * .8})`; c.lineWidth = 6;
        c.beginPath(); c.arc(650, 690, 30 + q * 420, 0, 6.28); c.stroke();
      }
      c.restore();
      const s = Math.min(1, p / .15);
      c.save(); c.translate(650, 690); c.scale(s, s); c.strokeStyle = INK.red; c.lineWidth = 6; c.lineCap = 'round';
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.beginPath(); c.moveTo(Math.cos(a) * 18, Math.sin(a) * 18); c.lineTo(Math.cos(a) * 38, Math.sin(a) * 38); c.stroke(); }
      c.restore();
    } },
    T('oops!', 700, 715, 58, 2.8, .2, INK.red, 'left'),
    icon('shield', 190, 870, 3.6, 3.0, .4, INK.green, 6),
    T('your systems stay safe', 260, 892, 64, 3.2, .38, INK.navy, 'left'),
    P(S.check(170, 960), 3.6, .12, INK.green, 7), T('Isolated', 225, 985, 58, 3.65, .2, INK.navy, 'left'),
    P(S.check(560, 960), 3.8, .12, INK.green, 7), T('Disposable', 615, 985, 58, 3.85, .2, INK.navy, 'left'),
    P(S.check(170, 1040), 4.0, .12, INK.green, 7), T('Observable', 225, 1065, 58, 4.05, .2, INK.navy, 'left'),
    P(S.check(170, 1120), 4.2, .12, INK.green, 7), T('Hard limits on spend & network', 225, 1145, 58, 4.25, .3, INK.navy, 'left'),
  ] });

  // ---------- B4: How a sandbox lives (+ soft mention) ----------
  const NX = [140, 345, 540, 735, 940], NI = ['plus', 'play', 'camera', 'pause', 'trash'];
  const NL = ['Create', 'Run', 'Snapshot', 'Pause/Resume', 'Destroy'];
  const b4 = [
    T('How a sandbox lives', 540, 205, 92, .05, .6, INK.navy),
    P('M240 232 Q540 250 840 228', .7, .2, INK.mag, 7),
    P('M120 560 L960 560', .8, .45, INK.navy, 6),
  ];
  NX.forEach((x, i) => {
    const t0 = 1.15 + i * .26, col = i === 4 ? INK.red : INK.navy;
    b4.push(F(S.circle(x, 560, 46), t0, .08, '#FBFBF8'), P(S.circle(x, 560, 46), t0, .2, col, 6),
      icon(NI[i], x, 560, 2.0, t0 + .12, .18, col, 5), T(NL[i], x, 660, i === 3 ? 42 : 52, t0 + .16, .2, col));
  });
  b4.push({ k: 'fn', t0: 2.6, draw(c, lt) {      // an agent session travels the lifecycle
    const seg = Math.min(4, (lt - 2.6) / .38), i = Math.floor(seg), f = eIO(seg - i);
    const x = i >= 4 ? 940 : NX[i] + (NX[i + 1] - NX[i]) * f;
    const g = c.createRadialGradient(x, 560, 0, x, 560, 40); g.addColorStop(0, 'rgba(229,40,125,.9)'); g.addColorStop(1, 'rgba(229,40,125,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, 560, 40, 0, 6.28); c.fill();
    for (let k = 0; k <= Math.min(i, 4); k++) { c.strokeStyle = INK.mag; c.lineWidth = 5; c.beginPath(); c.arc(NX[k], 560, 56, 0, 6.28); c.stroke(); }
  } });
  b4.push(P(S.rrect(100, 790, 880, 270, 30), 3.3, .5, INK.mag, 7),
    T('{{PRODUCT_LINE}}', 540, 875, 58, 3.7, .45, INK.navy),
    T('{{PRODUCT_NAME}}', 540, 1000, 120, 4.2, .55, INK.mag),
    P('M330 1025 Q540 1045 750 1020', 4.8, .2, INK.mag, 6));
  WB.add({ t0: 32.5, t1: 38.5, items: b4 });
})();
