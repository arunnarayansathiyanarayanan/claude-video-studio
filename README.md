# claude-video-studio

Turn any footage (event photos, a headshot/talking-head recording, an interview, a product demo, a tutorial, an announcement, behind-the-scenes clips) into a professionally edited video for **Instagram** (casual, on-trend Reels) or **LinkedIn** (formal, credible), with designed motion graphics, captions, an original soundtrack, a cover/thumbnail and a ready-to-post caption.

It's a framework for [Claude](https://claude.ai) (Cowork or Claude Code): an approved editing rulebook per platform and use case, instructions, rules learned from real feedback, and free render scripts. You drop your media in, answer a short intake (platform, video type, length, references…), and Claude does the edit.

- **Free tools only** — FFmpeg, Python, Playwright/Chromium. No paid APIs, no stock music, no subscriptions.
- **No re-asking** — your preferences live in one config file; feedback is turned into rules in `framework/LEARNINGS.md`, so every video starts better than the last.
- **Reference-first** — you show it 1–3 videos, posts or templates you love; it measures their pace, palette and text density, maps the look to its motion kit, and shows style frames side-by-side with your reference before rendering.
- **Platform-aware** — Instagram cuts are casual and on-trend (word-by-word captions, jump cuts, punch-ins); LinkedIn cuts are formal and credible (sentence captions, measured pace, sourced claims).
- **Credible content** — claims must be sourced (event recaps, agendas, speaker quotes, docs). Nothing is invented.

## What you get per video
| Deliverable | Instagram | LinkedIn |
|---|---|---|
| Video | 9:16 1080×1920 Reel (+ a no-music version for adding trending audio in-app) | 4:5 / 1:1 / 16:9, formal pacing |
| Captions | Word-by-word kinetic captions | Sentence captions + SRT file |
| Cover | 9:16 cover safe for the 3:4 grid | Simple editorial thumbnail |
| Post caption | Casual hook, CTA, 3–5 hashtags | Insight-led, numbered points, question, sources comment |

| Use case | Built-in blueprint |
|---|---|
| Event recap · talking head / headshot · interview clip · product demo · tutorial · announcement · behind-the-scenes · long form | timings per platform in `framework/templates/blueprints/` |

| Also | Details |
|---|---|
| Motion | Flat, graphic, human-looking design ([MOTION_STYLE.md](framework/MOTION_STYLE.md)) — no particle/glow/glitch clichés |
| Sound | Your track, or an original score + sound effects synthesised from code (no licensing issues) |
| Structure | Timing blueprint per use case × platform, matched to your reference's measured pace |

## Quick start
1. **Clone** this repo somewhere on your computer.
2. **Install** (only needed where the rendering runs — Claude's sandbox already has most of this):
   ```bash
   pip install -r requirements.txt          # faster-whisper downloads its speech model on first use
   python -m playwright install chromium
   # plus FFmpeg on PATH, and the Inter / Inter Display fonts (https://rsms.me/inter/)
   ```
3. **Configure** — copy `creator.config.example.md` to `creator.config.md` and fill in your name, title, platforms and (optionally) one product mention.
4. **Add media + references** (any footage type) — make `projects/2026-10-my-event/`, drop your photos/videos (or a WhatsApp export .zip) in it, and put 1–3 style references (clips, screenshots, or links in a `links.txt`) in `projects/2026-10-my-event/references/`.
5. **Ask Claude** — open the repo folder in Claude Cowork (connect the folder) or Claude Code and say:
   > Make a video from the footage in projects/2026-10-my-event
   
   Claude asks the intake questions (Instagram or LinkedIn or both? event, talking head, demo…? length? references?), reads `CLAUDE.md` and `framework/EDITING_RULES.md`, reviews every clip, analyses your references, shows style frames next to them, renders, QCs safe zones, and saves video + cover + caption to `projects/<slug>/renders/`.
6. **Optional:** install the skill in `skills/video-studio/SKILL.md` into your Claude account so it triggers automatically whenever you share footage.

## How it works
| Step | What happens |
|---|---|
| Intake | 2 short rounds: platform, video type, length, references, then goal / content / brand / audio / CTA |
| Ingest + review | Media is renamed to short IDs (`img01`, `vid1`…, with a `map.txt` back to originals); Claude builds contact sheets and looks at everything |
| References | `ref_analyze.py` measures your references (shot length, cuts/sec, palette, motion energy, text density) → a style brief mapping what to borrow to motion-kit techniques |
| Use-case prep | Talking heads: `transcribe.py` cuts silences/fillers and builds captions. Events/demos: research → sourced claims |
| Storyboard + style gate | A shot table, then 4–6 style frames and a 5 s motion test shown next to your reference, for your approval |
| Render | HTML/CSS/canvas overlays rendered frame-by-frame with Playwright → composited over graded footage with OpenCV → encoded with FFmpeg |
| Sound | `audio_score.py` composes music and SFX from a cue sheet synced to the edit |
| QC | `qc_safezone.py` platform safe zones, frames at every cut, name spelling, file size, loudness |
| Learn | Your feedback → a dated rule in `framework/LEARNINGS.md` |

## Repo layout
```
CLAUDE.md                     instructions Claude follows (intake, defaults, pipeline, reinforcement protocol)
creator.config.example.md     your personal defaults → copy to creator.config.md (git-ignored)
framework/
  EDITING_RULES.md            approved rulebook: Instagram vs LinkedIn × use case × length
  MOTION_STYLE.md             motion design standard + kill list
  LEARNINGS.md                reinforcement log: feedback → rules (scoped, status-tracked)
  references/LIBRARY.md       saved style references (links) reused when none are supplied
  scripts/                    engine.py, overlay_render.py, audio_score.py, motion.js (v2 kit), transcribe.py, qc_safezone.py, ref_analyze.py, kinetic.js, wb.js, fx.js (legacy)
  fonts/                      Caveat, Kalam (SIL OFL 1.1)
  templates/blueprints/       timing per use case × platform (md + json)
  templates/project/          storyboard / overlay / hook / style frames / reel captions / score / brief / style brief / captions
  templates/thumbnail/        LinkedIn thumbnail + Instagram 9:16 cover
skills/video-studio/SKILL.md  optional Claude skill
projects/                     your jobs (git-ignored)
```

## Customising
- **Your defaults:** `creator.config.md` (name, title, format, accent colour, lens label, optional mention, hashtags).
- **Look and feel:** `framework/MOTION_STYLE.md`.
- **Structure / timing:** the 60 s blueprint in `CLAUDE.md` and `framework/templates/project/storyboard.example.json`.

## Motion kit
`framework/scripts/motion.js` is the motion engine: spring easing with overshoot, keyframe tweens, squash & stretch, masked line reveals, kinetic ticker rows, rounded masks that grow a card into full-bleed, video inside cards, UI pieces (typing, counters, cursor clicks) and icon morphs. Start from `framework/templates/project/hook.example.html` (a 5 s opener) and `frames.example.html` (explainer / takeaway / outro style frames).

## Roadmap
- Port the full 60 s example (recap, explainer, takeaways) from the legacy `fx.js`/`wb.js` templates to `motion.js`.
- Example projects for each use case (talking head, demo) using motion.js.

## Notes and limits
- Claude can't listen to audio; it checks the mix visually (waveform, spectrogram, loudness) and you judge the sound.
- Only post media you have the right to share, and get consent from people who appear in your footage.
- Fonts in `framework/fonts` are under the SIL Open Font License 1.1; everything else is MIT.

## License
[MIT](LICENSE)
