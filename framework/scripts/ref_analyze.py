#!/usr/bin/env python3
"""
Reference analyser — turns reference videos / images into a measurable "style DNA" so an edit can match them.

Usage:
  python3 ref_analyze.py <out_dir> <ref1> [ref2 ...]
    refs: .mp4/.mov/.webm/.gif videos and/or .jpg/.png/.webp images (screenshots of templates, posts, frames)

Outputs in <out_dir>:
  <name>_sheet.jpg     contact sheet of detected shots / keyframes (look at it!)
  <name>_palette.png   dominant colours with hex codes
  style_dna.json       per-reference metrics + a merged summary
  style_dna.md         human-readable summary to paste into style_brief.md

Metrics (videos): duration, cuts, average shot length, cuts/sec, motion energy (mean frame difference),
                  brightness, saturation, text-heavy frames estimate, aspect ratio, dominant palette.
Metrics (images): palette, brightness, saturation, contrast, aspect ratio.
Dependencies: ffmpeg/ffprobe on PATH, numpy, opencv-python(-headless), pillow.
"""
import json, os, subprocess, sys, glob, math
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont

VIDEO = ('.mp4', '.mov', '.webm', '.mkv', '.gif', '.m4v')

def palette(pixels, k=6):
    px = pixels.reshape(-1, 3).astype(np.float32)
    if len(px) > 60000: px = px[np.random.RandomState(0).choice(len(px), 60000, replace=False)]
    _, lab, cen = cv2.kmeans(px, k, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.5), 3, cv2.KMEANS_PP_CENTERS)
    cnt = np.bincount(lab.flatten(), minlength=k); order = np.argsort(-cnt)
    out = []
    for i in order:
        b, g, r = cen[i]; out.append({"hex": '#%02X%02X%02X' % (int(r), int(g), int(b)), "share": round(float(cnt[i] / cnt.sum()), 3)})
    return out

def tone(img_bgr):
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    return float(hsv[..., 2].mean() / 255), float(hsv[..., 1].mean() / 255), float(gray.std() / 128)

def textiness(img_bgr):
    """rough share of the frame covered by high-contrast small strokes (type/UI)"""
    g = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    g = cv2.resize(g, (360, int(360 * g.shape[0] / g.shape[1])))
    edges = cv2.Canny(g, 80, 200)
    k = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, np.ones((3, 9), np.uint8))
    return float((k > 0).mean())

def save_palette(pal, path, title):
    W, H = 900, 160; im = Image.new('RGB', (W, H), 'white'); d = ImageDraw.Draw(im); x = 0
    for p in pal:
        w = max(40, int(W * p['share'])); d.rectangle([x, 0, x + w, 110], fill=p['hex']); d.text((x + 6, 118), p['hex'], fill='black'); x += w
    d.text((6, 140), title, fill='black'); im.save(path)

def sheet(frames, path, cols=6, label=None):
    if not frames: return
    w = 300; h = int(w * frames[0].shape[0] / frames[0].shape[1]); rows = math.ceil(len(frames) / cols)
    S = Image.new('RGB', (cols * w, rows * (h + 22)), 'white'); d = ImageDraw.Draw(S)
    for i, (f, lab) in enumerate(zip(frames, label or [''] * len(frames))):
        im = Image.fromarray(cv2.cvtColor(cv2.resize(f, (w, h)), cv2.COLOR_BGR2RGB))
        x, y = (i % cols) * w, (i // cols) * (h + 22); S.paste(im, (x, y + 22)); d.text((x + 4, y + 4), lab, fill='black')
    S.save(path, quality=85)

def analyse_video(path, out):
    name = os.path.splitext(os.path.basename(path))[0]
    cap = cv2.VideoCapture(path); fps = cap.get(cv2.CAP_PROP_FPS) or 30
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)); W = int(cap.get(3)); H = int(cap.get(4))
    step = max(1, int(round(fps / 10)))            # analyse at ~10 fps
    prev = None; pending = []; diffs = []; cuts = [0.0]; keyframes = []; labels = []; samples = []; i = 0
    while True:
        ok, f = cap.read()
        if not ok: break
        if i % step == 0:
            small = cv2.resize(f, (160, int(160 * H / max(W, 1))))
            hist = cv2.calcHist([cv2.cvtColor(small, cv2.COLOR_BGR2HSV)], [0, 1], None, [32, 16], [0, 180, 0, 256]); cv2.normalize(hist, hist)
            if prev is not None:
                d = float(np.mean(cv2.absdiff(small, prev[0]))) / 255
                hd = cv2.compareHist(prev[1], hist, cv2.HISTCMP_BHATTACHARYYA)
                diffs.append(d)
                t = i / fps
                if (hd > 0.33 or d > 0.2) and t - cuts[-1] > 0.3: cuts.append(t); pending.append(t)
                if pending and t >= pending[0] + 0.35: c = pending.pop(0); keyframes.append(f.copy()); labels.append(f'shot @ {c:.1f}s')
            else:
                keyframes.append(f.copy()); labels.append('0.0s')
            prev = (small, hist)
            if i % (step * 5) == 0: samples.append(f)
        i += 1
    cap.release()
    dur = n / fps if n else (len(diffs) + 1) * step / fps
    # keep at most 24 frames on the sheet: cuts first, then evenly spaced samples
    if len(keyframes) < 12 and samples:
        idx = np.linspace(0, len(samples) - 1, min(12, len(samples))).astype(int)
        keyframes += [samples[j] for j in idx]; labels += [f'sample {j}' for j in idx]
    sheet(keyframes[:24], f'{out}/{name}_sheet.jpg', label=labels[:24])
    allpx = np.concatenate([cv2.resize(s, (120, int(120 * H / max(W, 1)))).reshape(-1, 3) for s in samples]) if samples else np.zeros((1, 3))
    pal = palette(allpx); save_palette(pal, f'{out}/{name}_palette.png', name)
    tones = [tone(s) for s in samples] or [(0, 0, 0)]
    shots = len(cuts)
    return {"ref": os.path.basename(path), "type": "video", "duration_s": round(dur, 2), "size": f"{W}x{H}",
            "aspect": round(W / max(H, 1), 3), "cuts": shots - 1, "avg_shot_s": round(dur / max(shots, 1), 2),
            "cuts_per_s": round((shots - 1) / max(dur, 1e-6), 2),
            "motion_energy": round(float(np.mean(diffs)) if diffs else 0, 4),
            "brightness": round(float(np.mean([t[0] for t in tones])), 3), "saturation": round(float(np.mean([t[1] for t in tones])), 3),
            "contrast": round(float(np.mean([t[2] for t in tones])), 3),
            "text_ui_density": round(float(np.mean([textiness(s) for s in samples])) if samples else 0, 4),
            "cut_times_s": [round(c, 2) for c in cuts[1:60]], "palette": pal}

def analyse_image(path, out):
    name = os.path.splitext(os.path.basename(path))[0]
    im = cv2.imread(path); H, W = im.shape[:2]
    pal = palette(cv2.resize(im, (240, int(240 * H / W)))); save_palette(pal, f'{out}/{name}_palette.png', name)
    b, s, c = tone(im)
    return {"ref": os.path.basename(path), "type": "image", "size": f"{W}x{H}", "aspect": round(W / H, 3),
            "brightness": round(b, 3), "saturation": round(s, 3), "contrast": round(c, 3),
            "text_ui_density": round(textiness(im), 4), "palette": pal}

def describe(r):
    pace = ''
    if r['type'] == 'video':
        a = r['avg_shot_s']
        pace = 'very fast (<0.8 s/shot)' if a < .8 else 'fast (0.8–1.5 s/shot)' if a < 1.5 else 'medium (1.5–3 s/shot)' if a < 3 else 'slow (>3 s/shot)'
    look = ('light' if r['brightness'] > .6 else 'dark' if r['brightness'] < .35 else 'mid-tone') + ', ' + \
           ('vivid' if r['saturation'] > .45 else 'muted' if r['saturation'] < .2 else 'moderate colour')
    flat = 'flat / graphic (few colours dominate)' if sum(p['share'] for p in r['palette'][:3]) > .8 else 'photographic / varied colour'
    return pace, look, flat

def main():
    out = sys.argv[1]; refs = sys.argv[2:]; os.makedirs(out, exist_ok=True); res = []
    for p in refs:
        ext = os.path.splitext(p)[1].lower()
        res.append(analyse_video(p, out) if ext in VIDEO else analyse_image(p, out))
    json.dump({"refs": res}, open(f'{out}/style_dna.json', 'w'), indent=1)
    md = ['# Style DNA (measured)', '', '| Ref | Type | Pace | Look | Colour structure | Motion energy | Text/UI density | Top colours |', '|---|---|---|---|---|---|---|---|']
    for r in res:
        pace, look, flat = describe(r)
        md.append(f"| {r['ref']} | {r['type']} | {pace or '—'} | {look} | {flat} | {r.get('motion_energy', '—')} | {r['text_ui_density']} | {' '.join(p['hex'] for p in r['palette'][:4])} |")
    md += ['', 'Next: look at every *_sheet.jpg, then fill `style_brief.md` (what to borrow, what to avoid, technique mapping to motion.js).']
    open(f'{out}/style_dna.md', 'w').write('\n'.join(md)); print('\n'.join(md))

if __name__ == '__main__':
    main()
