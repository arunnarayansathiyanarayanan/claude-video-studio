#!/usr/bin/env python3
"""
Safe-zone QC: overlays platform UI danger zones on frames so text/faces can be checked.

  python3 qc_safezone.py <video|image> <instagram|linkedin|linkedin-1x1|youtube> <out.jpg> [t1,t2,...]

instagram (1080x1920): red = covered by UI (top 270 px, bottom 670 px, right action rail 230 px over the
                      bottom 770 px, 65 px sides); blue lines = 3:4 profile-grid crop (keep cover titles/faces inside).
linkedin (1080x1350): blue box = centre 1080x1080 (survives 1:1 crops), dashed 72 px margins.
Frames are scaled to the platform size before drawing. Prints a warning list of frames whose edges carry text-like detail
inside red zones (heuristic: edge density) so you know where to look first.
"""
import sys, os, subprocess, glob, tempfile
import numpy as np, cv2
from PIL import Image, ImageDraw

SIZES = {"instagram": (1080, 1920), "linkedin": (1080, 1350), "linkedin-1x1": (1080, 1080), "youtube": (1920, 1080)}

def zones(p):
    W, H = SIZES[p]
    if p == "instagram":
        return [(0, 0, W, 270), (0, H - 670, W, H), (W - 230, H - 770, W, H), (0, 0, 65, H), (W - 65, 0, W, H)], [(0, 240, W, H - 240)]
    if p == "linkedin":
        return [(0, 0, W, 72), (0, H - 72, W, H), (0, 0, 72, H), (W - 72, 0, W, H)], [(0, (H - 1080) // 2, W, (H + 1080) // 2)]
    if p == "linkedin-1x1":
        return [(0, 0, W, 72), (0, H - 72, W, H), (0, 0, 72, H), (W - 72, 0, W, H)], []
    return [(0, 0, W, 60), (0, H - 120, W, H)], []

def frames(src, times):
    if os.path.splitext(src)[1].lower() in (".jpg", ".jpeg", ".png", ".webp"): return [("img", cv2.imread(src))]
    out = []; d = tempfile.mkdtemp()
    for t in times:
        f = f"{d}/{t}.jpg"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(t), "-i", src, "-frames:v", "1", f], check=True)
        out.append((f"{t}s", cv2.imread(f)))
    return out

def main():
    src, plat, out = sys.argv[1], sys.argv[2], sys.argv[3]
    times = [float(x) for x in sys.argv[4].split(",")] if len(sys.argv) > 4 else [1, 3, 5]
    W, H = SIZES[plat]; red, blue = zones(plat); tiles = []; warn = []
    for lab, f in frames(src, times):
        f = cv2.resize(f, (W, H)); g = cv2.Canny(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY), 100, 220)
        for (x0, y0, x1, y1) in red:
            if g[y0:y1, x0:x1].mean() > 18: warn.append(f"{lab}: busy detail inside UI zone {x0},{y0}-{x1},{y1}")
        im = Image.fromarray(cv2.cvtColor(f, cv2.COLOR_BGR2RGB)).convert("RGBA"); ov = Image.new("RGBA", im.size); d = ImageDraw.Draw(ov)
        for r in red: d.rectangle(r, fill=(255, 0, 0, 70))
        for b in blue: d.rectangle(b, outline=(0, 120, 255, 255), width=6)
        d.text((20, 20), lab, fill=(255, 255, 0, 255))
        tiles.append(Image.alpha_composite(im, ov).convert("RGB").resize((W // 3, H // 3)))
    S = Image.new("RGB", (sum(t.width for t in tiles), tiles[0].height), "white"); x = 0
    for t in tiles: S.paste(t, (x, 0)); x += t.width
    S.save(out, quality=85); print("\n".join(warn) or "no busy detail inside UI zones"); print("wrote", out)

if __name__ == "__main__":
    main()
