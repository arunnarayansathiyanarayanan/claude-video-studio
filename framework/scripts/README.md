# Scripts

Free stack: Python 3 + OpenCV + Pillow + NumPy + SciPy, FFmpeg, Playwright/Chromium.

| File | Role |
|---|---|
| transcribe.py | **Talking-head toolkit**: faster-whisper transcript (free, local) → `words.json`, `captions.srt` (LinkedIn/YouTube), `reel_words.json` (Instagram word-by-word), `cuts.json` + `shots.json` + `speech_cues.json` (silences > 0.4 s and fillers removed), `edl.txt`. `--from-json` to use an existing transcript |
| qc_safezone.py | **Safe-zone QC**: overlays Instagram UI zones + 3:4 grid crop, or LinkedIn centre-square/margins, on frames; flags busy detail inside UI zones |
| ref_analyze.py | **Reference analyser**: videos/images → contact sheet of shots, palette swatches, `style_dna.json/.md` (avg shot length, cuts/sec, motion energy, brightness, saturation, contrast, text/UI density, aspect, top colours) |
| engine.py | Base layer from `storyboard.json` (any size via w/h): cover / framed / solid shots, Ken Burns, `zoom_kf` punch-ins, punch/glitch/flash cuts, grade, vignette, grain; composites overlay PNGs; encodes H.264 (crf 21, maxrate 8M) + audio with loudnorm (track or silent) |
| overlay_render.py | Renders an overlay HTML that exposes `window.render(t)` to PNG frames via Playwright. Preview times `t1,t2,…` or `range:a-b` for parallel workers; `--size 1080x1920` (IG) · `1080x1350` (LinkedIn, default) · `1080x1080` · `1920x1080` |
| audio_score.py | Original music + SFX from `score.json` (sections incl. half-time `mid`, chords, impacts, whooshes, pops, clicks, risers, rolls, scribbles, ambience). `speech` cues mix dialogue and duck the music; `"music": false` → SFX/speech-only Instagram export. No samples, no licences |
| kinetic.js | Kinetic type: slam / rise (masked) / pop / fade / wipe, highlight boxes, lower-thirds, word-group stagger, auto exit |
| wb.js | Whiteboard explainer engine: draw-on paths, handwritten write-on (Caveat), pop labels, custom animations, marker following the stroke tip, board slide transitions; `WB.cues()` exports stroke timings for scribble SFX |
| motion.js | **v2 motion kit** (use this): `M.captions` (Reel word-by-word) and `M.parseSRT`/`M.lineCaption` (LinkedIn sentence captions), spring / expo easing, keyframe tweens (`M.kf`), squash & stretch, masked line reveals, kinetic ticker rows, rounded mask card ↔ full-bleed, video-frame playback in cards, typing, counters, cursor with click ripple, icon morph (flubber), scene helper. Pure f(t), DOM-based for crisp type |
| flubber.min.js | Path-morph library used by `M.morph` (MIT, see flubber.LICENSE.txt) |
| fx.js | LEGACY canvas effects (network, shockwave, wipes, confetti, light leaks…). Banned by MOTION_STYLE.md for new work; kept for reference and for its draw-on / bracket / cursor helpers |

## Talking head (Instagram) quick run
```bash
S=../../framework/scripts
python3 $S/transcribe.py media/vid1.mp4 tr --model small          # cuts + captions
# storyboard.json: w 1080, h 1920, shots from tr/shots.json (+ zoom_kf punch-ins); score.json: speech = tr/speech_cues.json
python3 $S/overlay_render.py reel_captions.html ov 30 <dur> --size 1080x1920
python3 $S/engine.py storyboard.json ov renders/instagram.mp4
python3 $S/qc_safezone.py renders/instagram.mp4 instagram qc.jpg 1,5,10
```

## Typical run (from inside `projects/<slug>/`)
```bash
S=../../framework/scripts
python3 $S/ref_analyze.py references/_analysis references/*        # style DNA of the creator's references
python3 $S/overlay_render.py overlay.html ovp 30 60 1.2,8.3,25          # preview frames
python3 $S/engine.py storyboard.json ovp prev.mp4 --preview 1.2,8.3,25   # composite previews
python3 $S/audio_score.py score.json score.wav                          # music + SFX
for r in 0-450 450-900 900-1350 1350-1800; do python3 $S/overlay_render.py overlay.html ov 30 60 range:$r & done; wait
python3 $S/engine.py storyboard.json ov renders/video.mp4               # final
```
Media: copy sources to `media/img01.jpg…`, `media/vid1.mp4…` (sorted filename order) and keep `map.txt`.
Fonts: `framework/fonts` (Caveat, Kalam — SIL OFL 1.1). Inter / Inter Display must be installed on the system.
