# CLAUDE.md — Video Studio (read fully before doing anything)

Purpose: turn any footage — event photos/videos, a headshot/talking-head recording, an interview, a product demo, a tutorial, an announcement, behind-the-scenes clips — into a professionally edited **Instagram** and/or **LinkedIn** video, plus cover/thumbnail and post caption, with **zero repeat back-and-forth**.

Three non-negotiables:
1. **Intake first** — never start editing before the intake questions (section 2) are answered.
2. **Reference first** — the look comes from references the creator chooses, analysed before designing.
3. **Platform + use case decide the rules** — Instagram = casual and contemporary; LinkedIn = formal and credible (see `framework/EDITING_RULES.md`).

Read before building, in this order:
1. `creator.config.md` — personal defaults. If missing, copy `creator.config.example.md` and ask for the essentials (name, title, platforms, optional mention) in ONE question, then save it.
2. `framework/EDITING_RULES.md` — platform rules, use-case rules, short vs long, universal rules (approved rulebook).
3. `framework/templates/blueprints/BLUEPRINTS.md` (+ `blueprints.json`) — default timing per use case × platform.
4. `framework/MOTION_STYLE.md` — motion standard + kill list.
5. `framework/LEARNINGS.md` — the reinforcement log: past feedback turned into rules (newest wins when two rules conflict).
6. `framework/references/LIBRARY.md` and `framework/scripts/README.md`.

## 1. Defaults (creator.config.md and the intake answers override)
| Topic | Instagram | LinkedIn |
|---|---|---|
| Format | 9:16 1080×1920, 30 fps | 4:5 1080×1350 · 1:1 talking head · 16:9 screen recording / long form |
| Length (short) | 7–15 s trend/teaser · 30–60 s tips/stories | 30–90 s (15–30 s quick tip) |
| Tone | Casual, contemporary, first person | Formal, insight-led, sourced, first person |
| Captions | Word-by-word, big, centred, accent on the active word | Sentence captions (≤ 42 chars × 2 lines) + SRT upload |
| Pace | New visual every 2–4 s, jump cuts, punch-ins 110–125%, beat-synced | 2–4 s shots, cuts on sentence ends, zooms 105–110% |
| Audio | Original audio/score; trending audio added in-app on the no-music export | Speech first, quiet bed (−20 to −24 dB under voice) or none |
| Ending | Loop to hook or quick CTA (save / send / follow) | Question card + name/title lockup; links in first comment |
| Cover | 9:16 cover readable in 3:4 grid crop (`cover_ig.html`) | Simple editorial thumbnail (`thumb.html`) |
| Post caption | `caption_instagram.md` (hook, 1–3 lines, CTA, 3–5 hashtags) | `caption.md` (hook line, numbered insights, question, 4–5 hashtags, sources comment) |

Always: designed motion per MOTION_STYLE.md (no kill-list effects) · sound on every video (−14 LUFS) · free tools only · facts only from footage, the creator, or cited sources · concise, table-first communication · never move/rename/overwrite originals · one folder per job `projects/<yyyy-mm>-<slug>/` with `source/` (originals, never modified) · `media/` (renamed working copies) · `references/` · `work/` (storyboard, overlay, scores) · `renders/` (deliverables) · `tests/` (style tests). Delete transfer leftovers (.zip/.tgz copies, extracted temp folders) once synced.

## 2. Intake — ALWAYS before editing (AskUserQuestion, 2 rounds, ≤ 4 questions each)
**Round 1 (always):**
1. Platform — Instagram · LinkedIn · Both (two separate cuts, never a resize).
2. Video type — Event recap · Talking head / headshot · Interview / podcast clip · Product demo / screen recording · Tutorial / explainer · Announcement / launch · Behind-the-scenes · Other.
3. Length — Short · Long (2–10 min) · exact length.
4. References — "I'll add 1–3 (files in `references/` or links) + what I like" (recommended) · use my saved library · surprise me within MOTION_STYLE.md.

**Round 2 (only what config/footage doesn't already answer):** goal + audience · content inputs (script/key points, usable speech audio, facts to cite, must-include shots/people) · brand + caption language + on-screen name/title · audio choice · CTA.
Write all answers into `projects/<slug>/brief.md` before step 4.

## 3. Pipeline
1. **Ingest** — originals into `projects/<slug>/source/` (WhatsApp exports: move the single .zip, unzip there). Working copies to `media/img01.jpg…`, `vid1.mp4…`, write `map.txt`.
2. **Review** — contact sheets of photos + 8-frame strips per clip; look at every one → `media_index.md`.
3. **Intake** — section 2 → `brief.md`.
4. **References** — files → `python3 ../../framework/scripts/ref_analyze.py references/_analysis references/*`; open every `*_sheet.jpg`/palette and read `style_dna.md`. Web links: open + screenshot in the browser; YouTube/Instagram block playback → ask for a short screen recording or screenshots, never guess. Write `style_brief.md` (borrow → motion.js technique; measured pace/palette/text density; what NOT to copy). No refs → library + say so.
5. **Use-case prep**
   - *Talking head / interview:* `python3 ../../framework/scripts/transcribe.py media/vid1.mp4 tr [--model small --lang en]` → `edl.txt` (silences > 0.4 s and fillers removed), `shots.json`, `speech_cues.json`, `captions.srt`, `reel_words.json`. Review the EDL with the creator if anything meaningful was cut.
   - *Event / demo / tutorial / announcement:* research before any claim (recaps, agendas, speaker quotes, docs); keep source URLs.
6. **Storyboard** — start from the blueprint for (use case × platform) in `BLUEPRINTS.md`; adjust to the reference's measured pace. Annotation targets located on a 100 px-grid preview frame.
7. **Style gate** — 4–6 style frames + a 5 s motion test **side-by-side with the reference sheet** → creator approves before the full build.
8. **Build** — `storyboard.json` (w/h per platform; `mode: cover | framed | solid`; `zoom_kf` punch-ins), overlay HTML built with `framework/scripts/motion.js` (start from `hook.example.html`, `frames.example.html`, `reel_captions.example.html`), `score.json` (music + SFX; `speech` cues duck the music; `"music": false` for the Instagram no-music export).
9. **Preview** — `overlay_render.py overlay.html ovp 30 <dur> t1,t2,… --size WxH` → `engine.py storyboard.json ovp prev.mp4 --preview t1,t2,…` → fix.
10. **Audio** — `audio_score.py score.json score.wav`; check waveform/spectrogram + `ebur128` (Claude can't listen — the creator judges the mix).
11. **Render** — parallel `overlay_render.py … range:a-b --size WxH` → `engine.py storyboard.json ov renders/<platform>.mp4`.
12. **QC** — `qc_safezone.py renders/<platform>.mp4 instagram|linkedin qc.jpg t1,t2,…`; frames at every cut; spelling; size; loudness; "would a human motion designer ship this?" · "does it feel like the reference?" · "does it follow the platform rules?"
13. **Deliver per platform** — video (+ Instagram no-music version), cover/thumbnail, post caption, SRT (talking head) → `projects/<slug>/renders/`.
14. **Learn** — reinforcement protocol (section 6).

## 4. Content rules
- State only facts visible in the footage, confirmed by the creator, or from cited sources; never invent quotes.
- Check quotes against the creator's work (config: `Quotes to avoid`) and flag conflicts.
- Consent: people on camera; only footage the creator may share; no copyrighted music baked in; references inspire, never copied.
- Text sizes: hero ≥ 110 px (≤ ~12 chars/line) · Reel captions 80–100 px · LinkedIn captions 40–48 px · explainer body ≥ 52 px.
- Keep text inside platform safe zones (EDITING_RULES §1) — verify with `qc_safezone.py`.

## 5. Technical gotchas (handled in scripts — don't regress)
- Canvas `setLineDash` resets per subpath → draw subpaths sequentially (fx.js / wb.js).
- Fully opaque overlay PNGs are RGB → engine treats 3-channel overlays as opaque.
- `round(t * fps)` everywhere for frame indices.
- Some sandboxes block Google Fonts/GitHub/Hugging Face; npm works for fonts. `transcribe.py` needs internet once to download its model — if blocked, ask the creator to run it locally or supply a transcript (`--from-json`).
- `file://` pages can't `fetch()` local JSON → inline data into the overlay HTML.
- crf 21 + maxrate 8M ≈ 20 MB per 60 s; loudnorm runs in the engine.
- Phone/WhatsApp clips are often 480p/60 fps → `framed` mode with mild unsharp.

## 6. Reinforcement protocol (how the framework learns)
After every round of feedback:
1. Append a dated entry to `framework/LEARNINGS.md` using its format (scope: platform / use case / all; signal: the creator's words; rule; status active|superseded).
2. If the rule is standing, promote it into this file, `EDITING_RULES.md`, `MOTION_STYLE.md` or `BLUEPRINTS.md` and mark the log entry `promoted`.
3. Approved references → `framework/references/LIBRARY.md` (links only).
4. Never delete entries; mark superseded ones. Newer rules win conflicts.
5. A style change isn't done until the code that produces it exists and a test has been shown.
