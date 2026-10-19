#!/usr/bin/env python3
"""
Talking-head toolkit: transcript → captions → clean cut list.

  python3 transcribe.py <video> <out_dir> [--model small] [--lang en] [--from-json words.json]
                        [--min-silence 0.4] [--pad 0.08] [--fillers "um,uh,erm,ah,hmm"]

Uses faster-whisper (free, runs locally; downloads the model on first run, needs internet once).
--from-json skips speech recognition and reads an existing word list: [{"w":"Hello","s":0.12,"e":0.40}, ...]

Outputs in <out_dir>:
  words.json        every word with start/end (seconds, source timeline) and confidence
  captions.srt      sentence captions (≤ 42 chars/line, ≤ 2 lines) — LinkedIn/YouTube upload + burn-in
  reel_words.json   2–4 word groups with per-word timing — Instagram word-by-word captions (motion.js M.captions)
  cuts.json         keep-segments after removing silences > --min-silence and filler words
  shots.json        storyboard "shots" for engine.py built from cuts.json (paste into storyboard.json)
  speech_cues.json  score.json "speech" entries (the kept dialogue, in cut order) — music auto-ducks under it
  edl.txt           human-readable edit list (what was removed and why)
Timings in srt/reel_words are remapped to the CUT timeline so captions stay in sync after cuts.
"""
import argparse, json, os, re, subprocess

FILLERS = {"um", "uh", "erm", "er", "ah", "hmm", "mm", "uhm"}

def asr(video, model, lang):
    from faster_whisper import WhisperModel
    m = WhisperModel(model, device="auto", compute_type="int8")
    segs, info = m.transcribe(video, language=lang, word_timestamps=True, vad_filter=True)
    words = []
    for sg in segs:
        for w in sg.words or []:
            words.append({"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3), "p": round(getattr(w, "probability", 1.0), 3)})
    return words

def duration(video):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video], capture_output=True, text=True)
    try: return float(r.stdout.strip())
    except ValueError: return None

def norm(w): return re.sub(r"[^\w']", "", w.lower())

def build_cuts(words, total, min_sil, pad, fillers):
    """keep segments = speech regions; split out filler words and silences longer than min_sil"""
    keep, removed = [], []
    a = b = None
    for w in words:
        if norm(w["w"]) in fillers:
            removed.append({"from": w["s"], "to": w["e"], "why": f'filler "{w["w"]}"'})
            if a is not None: keep.append([round(a, 3), round(min(b, w["s"]), 3)]); a = None
            continue
        if a is None:
            a, b = max(0, w["s"] - pad), w["e"] + pad
            if keep and a < keep[-1][1]: a = keep[-1][1]
            continue
        gap = w["s"] - b
        if gap > min_sil:
            keep.append([round(a, 3), round(b, 3)]); removed.append({"from": round(b, 3), "to": round(w["s"] - pad, 3), "why": f"silence {gap + pad:.2f}s"})
            a = w["s"] - pad
        b = w["e"] + pad
    if a is not None: keep.append([round(a, 3), round(min(b, total or b), 3)])
    keep = [k for k in keep if k[1] - k[0] > 0.05]
    return keep, removed

def remap(t, keep):
    """source time → cut-timeline time (None if inside a removed part)"""
    acc = 0.0
    for a, b in keep:
        if a <= t <= b: return round(acc + (t - a), 3)
        acc += b - a
    return None

def srt_time(x):
    h, r = divmod(max(0, x), 3600); m, s = divmod(r, 60)
    return f"{int(h):02}:{int(m):02}:{int(s):02},{int(round((s - int(s)) * 1000)):03}"

def make_srt(words, keep, maxc=42):
    cues, cur = [], []
    def flush():
        if not cur: return
        txt = " ".join(w["w"] for w in cur)
        lines, line = [], ""
        for tok in txt.split():
            if len(line) + len(tok) + 1 > maxc and line: lines.append(line); line = tok
            else: line = (line + " " + tok).strip()
        lines.append(line)
        s, e = remap(cur[0]["s"], keep), remap(cur[-1]["e"], keep)
        if s is not None and e is not None: cues.append((s, max(e, s + .6), "\n".join(lines[:2]) if len(lines) <= 2 else "\n".join([" ".join(lines[:len(lines)//2]), " ".join(lines[len(lines)//2:])])))
        cur.clear()
    for w in words:
        cur.append(w)
        n = len(" ".join(x["w"] for x in cur))
        if re.search(r"[.!?]$", w["w"]) or n > maxc * 2 - 6: flush()
    flush()
    return "\n".join(f"{i}\n{srt_time(s)} --> {srt_time(e)}\n{t}\n" for i, (s, e, t) in enumerate(cues, 1))

def reel_groups(words, keep, size=3):
    out, grp = [], []
    for w in words:
        s, e = remap(w["s"], keep), remap(w["e"], keep)
        if s is None: continue
        grp.append({"w": w["w"], "s": s, "e": e})
        if len(grp) >= size or re.search(r"[.!?,]$", w["w"]): out.append({"s": grp[0]["s"], "e": grp[-1]["e"], "words": grp}); grp = []
    if grp: out.append({"s": grp[0]["s"], "e": grp[-1]["e"], "words": grp})
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video"); ap.add_argument("out")
    ap.add_argument("--model", default="small"); ap.add_argument("--lang", default=None)
    ap.add_argument("--from-json", dest="fj"); ap.add_argument("--min-silence", type=float, default=0.4)
    ap.add_argument("--pad", type=float, default=0.08); ap.add_argument("--fillers", default=",".join(sorted(FILLERS)))
    ap.add_argument("--group", type=int, default=3)
    a = ap.parse_args(); os.makedirs(a.out, exist_ok=True)
    words = json.load(open(a.fj)) if a.fj else asr(a.video, a.model, a.lang)
    total = duration(a.video) if os.path.exists(a.video) else None
    fillers = {f.strip().lower() for f in a.fillers.split(",") if f.strip()}
    keep, removed = build_cuts(words, total, a.min_silence, a.pad, fillers)
    clean = [w for w in words if norm(w["w"]) not in fillers]
    json.dump(words, open(f"{a.out}/words.json", "w"), indent=1)
    json.dump({"keep": keep, "removed": removed, "source": os.path.basename(a.video)}, open(f"{a.out}/cuts.json", "w"), indent=1)
    open(f"{a.out}/captions.srt", "w").write(make_srt(clean, keep))
    json.dump(reel_groups(clean, keep, a.group), open(f"{a.out}/reel_words.json", "w"), indent=1)
    t, shots = 0.0, []
    for i, (s, e) in enumerate(keep):
        shots.append({"src": os.path.basename(a.video), "start": round(t, 3), "dur": round(e - s, 3), "in": s, "zoom": [1.0, 1.0],
                      "cut": "none", "note": "punch-in every other cut: add zoom_kf"}); t += e - s
    json.dump(shots, open(f"{a.out}/shots.json", "w"), indent=1)
    t, speech = 0.0, []
    for s_, e_ in keep:
        speech.append({"file": a.video, "in": s_, "t0": round(t, 3), "dur": round(e_ - s_, 3), "gain": 1.0}); t += e_ - s_
    json.dump(speech, open(f"{a.out}/speech_cues.json", "w"), indent=1)
    kept = sum(e - s for s, e in keep)
    open(f"{a.out}/edl.txt", "w").write(f"source {total or '?'} s → cut {kept:.2f} s ({len(keep)} segments)\n" + "\n".join(f"- cut {r['from']:.2f}–{r['to']:.2f}s: {r['why']}" for r in removed) + "\n")
    print(f"{len(words)} words · {len(keep)} keep-segments · {kept:.2f}s kept · {len(removed)} removals → {a.out}")

if __name__ == "__main__":
    main()
