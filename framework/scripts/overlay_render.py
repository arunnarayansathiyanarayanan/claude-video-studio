#!/usr/bin/env python3
"""Render an overlay HTML (exposing window.render(t)) to transparent PNG frames.
Usage: python3 overlay_render.py overlay.html out_dir fps duration [t1,t2,… | range:a-b] [--size 1080x1920]
  --size: 1080x1350 (LinkedIn 4:5, default) · 1080x1920 (Instagram 9:16) · 1080x1080 (1:1) · 1920x1080 (16:9)"""
import sys, os
SIZE = (1080, 1350)
if "--size" in sys.argv:
    i = sys.argv.index("--size"); SIZE = tuple(int(v) for v in sys.argv[i + 1].lower().split("x")); del sys.argv[i:i + 2]
from playwright.sync_api import sync_playwright
html, out, fps, dur = sys.argv[1], sys.argv[2], int(sys.argv[3]), float(sys.argv[4])
arg = sys.argv[5] if len(sys.argv) > 5 else None
rng_ = tuple(int(x) for x in arg[6:].split("-")) if arg and arg.startswith("range:") else None   # range:startFrame-endFrame
times = [float(x) for x in arg.split(",")] if arg and not rng_ else None
os.makedirs(out, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": SIZE[0], "height": SIZE[1]})
    pg.goto("file://" + os.path.abspath(html)); pg.wait_for_timeout(400)
    pg.evaluate("Promise.all([...document.fonts].map(f => f.load())).then(() => document.fonts.ready)")
    pg.evaluate("document.fonts.load('700 40px Caveat')")
    frames = [int(round(t * fps)) for t in times] if times else range(*rng_) if rng_ else range(int(round(dur * fps)))
    for n in frames:
        pg.evaluate(f"render({n / fps})")
        pg.screenshot(path=f"{out}/o{n:04d}.png", omit_background=True)
        if n % 150 == 0: print("overlay", n, flush=True)
    b.close()
