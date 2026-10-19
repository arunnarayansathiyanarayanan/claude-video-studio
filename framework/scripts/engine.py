#!/usr/bin/env python3
"""
Reusable base-layer + compositing engine for short social videos.
Usage: python3 engine.py storyboard.json overlay_frames_dir out.mp4 [--preview N]

storyboard.json:
{
  "w":1080,"h":1350,"fps":30,"duration":30,
  "media_dir":"media",
  "grade":{"contrast":1.08,"saturation":1.15,"warmth":0.0},
  "shots":[
    {"src":"img04.jpg","start":7.0,"dur":2.0,
     "mode":"cover|framed",            # framed = fit width over blurred fill
     "zoom":[1.0,1.08],"pan":[[0,0],[0.02,-0.01]],   # pan as fraction of frame
     "focus":[0.5,0.45],                # crop centre in source (0..1)
     "in":0.0,"speed":1.0,             # videos only
     "zoom_kf":[[0,1.0],[2.4,1.15]],   # optional punch-in keyframes (overrides zoom ramp)
     "cut":"punch|glitch|flash|none"}  # transition INTO this shot
  ]
}
"""
import json, os, sys, subprocess, glob, math
import numpy as np, cv2
from PIL import Image, ImageOps

def ease_out_cubic(x): return 1 - (1 - x) ** 3
def ease_in_out(x): return 0.5 - 0.5 * math.cos(math.pi * min(max(x, 0), 1))

class Engine:
    def __init__(self, sb, root):
        self.sb = sb; self.root = root
        self.W, self.H, self.FPS = sb["w"], sb["h"], sb["fps"]
        self.N = int(round(sb["duration"] * self.FPS))
        g = sb.get("grade", {})
        self.contrast = g.get("contrast", 1.0); self.sat = g.get("saturation", 1.0)
        self.cache = {}
        self.vign = self._vignette(g.get("vignette", 0.35))
        self.tmp = os.path.join(root, "_cache"); os.makedirs(self.tmp, exist_ok=True)

    # ---------- helpers ----------
    def _vignette(self, strength):
        y, x = np.ogrid[:self.H, :self.W]
        cx, cy = self.W / 2, self.H / 2
        d = np.sqrt(((x - cx) / cx) ** 2 + ((y - cy) / cy) ** 2) / math.sqrt(2)
        v = 1 - strength * np.clip(d, 0, 1) ** 2.2
        return v[..., None].astype(np.float32)

    def grade(self, img):
        f = img.astype(np.float32) / 255.0
        f = (f - 0.5) * self.contrast + 0.5
        gray = f.mean(axis=2, keepdims=True)
        f = gray + (f - gray) * self.sat
        return np.clip(f * 255, 0, 255).astype(np.uint8)

    def load_image(self, name):
        if name not in self.cache:
            im = ImageOps.exif_transpose(Image.open(os.path.join(self.root, self.sb["media_dir"], name))).convert("RGB")
            # pre-scale so the long fit is ~1.35x output (keeps zoom crisp, fast)
            a = np.array(im)[:, :, ::-1]
            s = max(self.W * 1.35 / a.shape[1], self.H * 1.35 / a.shape[0])
            if s < 1:
                a = cv2.resize(a, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
            self.cache[name] = self.grade(a)
        return self.cache[name]

    def video_frames(self, shot):
        key = f'{shot["src"]}@{shot.get("in",0)}x{shot.get("speed",1)}d{shot["dur"]}'
        if key in self.cache: return self.cache[key]
        d = os.path.join(self.tmp, key.replace("/", "_"))
        os.makedirs(d, exist_ok=True)
        if not glob.glob(d + "/*.jpg"):
            sp = shot.get("speed", 1.0)
            src_dur = shot["dur"] * sp + 0.2
            vf = f"setpts=PTS/{sp},fps={self.FPS},unsharp=5:5:0.6"
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(shot.get("in", 0)), "-t", str(src_dur),
                            "-i", os.path.join(self.root, self.sb["media_dir"], shot["src"]),
                            "-vf", vf, "-q:v", "2", d + "/f%04d.jpg"], check=True)
        fr = [self.grade(cv2.imread(p)) for p in sorted(glob.glob(d + "/*.jpg"))]
        self.cache[key] = fr
        return fr

    def cover(self, src, zoom, pan, focus):
        """Crop/scale src (BGR) to W x H with zoom and pan using one affine warp."""
        h, w = src.shape[:2]
        base = max(self.W / w, self.H / h)
        s = base * zoom
        fx, fy = focus
        # source point that maps to output centre
        cx = fx * w; cy = fy * h
        # clamp so we never show outside the image
        half_w = self.W / (2 * s); half_h = self.H / (2 * s)
        cx = min(max(cx + pan[0] * w, half_w), w - half_w)
        cy = min(max(cy + pan[1] * h, half_h), h - half_h)
        M = np.float32([[s, 0, self.W / 2 - s * cx], [0, s, self.H / 2 - s * cy]])
        return cv2.warpAffine(src, M, (self.W, self.H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)

    def framed(self, src, zoom, t_local):
        """Landscape media: full-width rounded card over a blurred, darkened fill."""
        bg = self.cover(src, 1.15, (0, 0), (0.5, 0.5))
        bg = cv2.GaussianBlur(cv2.resize(bg, (self.W // 8, self.H // 8)), (0, 0), 3)
        bg = (cv2.resize(bg, (self.W, self.H)).astype(np.float32) * 0.45).astype(np.uint8)
        h, w = src.shape[:2]
        cw = int(self.W * 0.94 * zoom); ch = int(h * cw / w)
        card = cv2.resize(src, (cw, ch), interpolation=cv2.INTER_CUBIC)
        x0 = (self.W - cw) // 2; y0 = int(self.H * 0.50 - ch / 2)
        # shadow
        sh = np.zeros((self.H, self.W), np.float32)
        cv2.rectangle(sh, (x0 + 10, y0 + 24), (x0 + cw + 10, y0 + ch + 24), 1, -1)
        sh = cv2.GaussianBlur(sh, (0, 0), 25)[..., None] * 0.6
        bg = (bg * (1 - sh)).astype(np.uint8)
        # rounded mask
        m = np.zeros((ch, cw), np.uint8); r = 28
        cv2.rectangle(m, (r, 0), (cw - r, ch), 255, -1); cv2.rectangle(m, (0, r), (cw, ch - r), 255, -1)
        for (px, py) in [(r, r), (cw - r, r), (r, ch - r), (cw - r, ch - r)]:
            cv2.circle(m, (px, py), r, 255, -1)
        m = (m.astype(np.float32) / 255)[..., None]
        ys, ye = max(y0, 0), min(y0 + ch, self.H); xs, xe = max(x0, 0), min(x0 + cw, self.W)
        sub = card[ys - y0:ye - y0, xs - x0:xe - x0]; mm = m[ys - y0:ye - y0, xs - x0:xe - x0]
        bg[ys:ye, xs:xe] = (sub * mm + bg[ys:ye, xs:xe] * (1 - mm)).astype(np.uint8)
        return bg

    def shot_at(self, t):
        for i, s in enumerate(self.sb["shots"]):
            if s["start"] <= t < s["start"] + s["dur"]:
                return i, s
        return len(self.sb["shots"]) - 1, self.sb["shots"][-1]

    def base_frame(self, n):
        t = n / self.FPS
        i, s = self.shot_at(t)
        tl = t - s["start"]; p = tl / s["dur"]
        if s.get("mode") == "solid":   # full-frame graphics scene drawn by the overlay
            return np.full((self.H, self.W, 3), s.get("color", [242, 244, 247])[::-1], np.uint8)
        z0, z1 = s.get("zoom", [1.0, 1.06]); e = ease_in_out(p)
        zoom = z0 + (z1 - z0) * e
        if s.get("zoom_kf"):   # punch-ins: [[t_local, zoom], ...] — snaps to each value over 0.15 s (talking-head emphasis)
            kf = sorted(s["zoom_kf"]); zoom = kf[0][1]
            for (ta, za), (tb, zb) in zip(kf, kf[1:] + [[1e9, kf[-1][1]]]):
                if tl >= ta: zoom = za
            for (ta, za), (tb, zb) in zip(kf, kf[1:]):
                if tb <= tl < tb + .15: zoom = za + (zb - za) * ease_out_cubic((tl - tb) / .15)
        pa = s.get("pan", [[0, 0], [0, 0]])
        pan = (pa[0][0] + (pa[1][0] - pa[0][0]) * e, pa[0][1] + (pa[1][1] - pa[0][1]) * e)
        cut = s.get("cut", "punch")
        # punch-in: extra zoom that settles over first 8 frames
        fi = tl * self.FPS
        if cut in ("punch", "glitch", "flash") and fi < 8:
            zoom *= 1 + 0.10 * (1 - ease_out_cubic(fi / 8))
        if s["src"].endswith(".mp4"):
            fr = self.video_frames(s); src = fr[min(int(fi), len(fr) - 1)]
        else:
            src = self.load_image(s["src"])
        if s.get("mode") == "framed":
            img = self.framed(src, zoom / max(z0, 1e-6) if z0 else 1, tl)
        else:
            img = self.cover(src, zoom, pan, s.get("focus", [0.5, 0.5]))
        img = img.astype(np.float32)
        # transitions
        if cut == "flash" and fi < 5:
            a = 1 - fi / 5; img = img * (1 - a) + 255 * a
        if cut == "glitch" and fi < 4:
            k = int(28 * (1 - fi / 4))
            b, g, r = cv2.split(img)
            img = cv2.merge([np.roll(b, -k, 1), g, np.roll(r, k, 1)])
            band = np.random.RandomState(n).randint(0, self.H - 80)
            img[band:band + 60] = np.roll(img[band:band + 60], k * 3, 1)
        img = img * self.vign
        # fine grain
        img += np.random.RandomState(n).normal(0, 3.0, img.shape[:2])[..., None]
        return np.clip(img, 0, 255).astype(np.uint8)

def main():
    sbp, ovd, out = sys.argv[1], sys.argv[2], sys.argv[3]
    preview = None
    if "--preview" in sys.argv: preview = [float(x) for x in sys.argv[sys.argv.index("--preview") + 1].split(",")]
    root = os.path.dirname(os.path.abspath(sbp))
    sb = json.load(open(sbp)); E = Engine(sb, root)
    def comp(n):
        f = E.base_frame(n)
        op = os.path.join(ovd, f"o{n:04d}.png")
        if os.path.exists(op):
            o = cv2.imread(op, cv2.IMREAD_UNCHANGED)
            if o is not None and o.ndim == 3 and o.shape[2] == 4:
                a = o[:, :, 3:4].astype(np.float32) / 255
                f = (o[:, :, :3] * a + f * (1 - a)).astype(np.uint8)
            elif o is not None and o.ndim == 3:   # fully opaque frame saved as RGB (e.g. whiteboard scenes)
                f = o
        return f
    if preview:
        for t in preview:
            cv2.imwrite(out.replace(".mp4", f"_t{t:05.2f}.jpg"), comp(int(round(t * E.FPS))), [cv2.IMWRITE_JPEG_QUALITY, 85])
        return
    audio = sb.get("audio")
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{E.W}x{E.H}",
           "-r", str(E.FPS), "-i", "-"]
    if audio:
        cmd += ["-ss", str(audio.get("offset", 0)), "-i", os.path.join(root, audio["file"]),
                "-af", f"afade=t=in:d=0.3,afade=t=out:st={sb['duration']-1.5}:d=1.5,volume={audio.get('gain',1.0)},loudnorm=I=-14:TP=-1.5:LRA=11"]
    else:
        cmd += ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo"]
    cmd += ["-map", "0:v", "-map", "1:a", "-shortest", "-c:v", "libx264", "-preset", "slow", "-crf", "21", "-maxrate", "8M", "-bufsize", "16M",
            "-pix_fmt", "yuv420p", "-profile:v", "high", "-movflags", "+faststart", "-c:a", "aac", "-b:a", "192k",
            "-t", str(sb["duration"]), out]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for n in range(E.N):
        p.stdin.write(comp(n).tobytes())
        if n % 150 == 0: print(f"frame {n}/{E.N}", flush=True)
    p.stdin.close(); p.wait()
    print("done", out)

if __name__ == "__main__":
    main()
