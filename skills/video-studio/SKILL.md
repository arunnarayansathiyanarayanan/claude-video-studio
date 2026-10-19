---
name: video-studio
description: Edit any footage (event, talking head, interview, demo, tutorial, announcement, behind-the-scenes) into an Instagram Reel or LinkedIn video matched to the user's references, with designed motion, captions, original score, cover and post caption, using the claude-video-studio framework.
---

# Video Studio

Use when the user shares footage or asks for an Instagram Reel, LinkedIn video, event recap, talking-head edit, interview clip, product demo, explainer, motion graphics, or a cover/caption for one.

## 0. Load the framework first
The framework is a folder (this repo) on the user's computer; ask for it to be connected if it isn't. Read in order:
`creator.config.md` (copy the example if missing and ask for name/title/platforms in ONE question) → `CLAUDE.md` → `framework/EDITING_RULES.md` → `framework/templates/blueprints/BLUEPRINTS.md` → `framework/MOTION_STYLE.md` → `framework/LEARNINGS.md` (newest rule wins) → `framework/references/LIBRARY.md` → `framework/scripts/README.md`.

## 1. Intake — ALWAYS before editing (2 rounds, ≤ 4 questions each)
Round 1: platform (Instagram · LinkedIn · Both = separate cuts) · video type · length · references (add 1–3 + what you like / saved library / surprise me).
Round 2 (only what config/footage doesn't answer): goal + audience · content inputs · brand + caption language + name/title · audio · CTA. Save to `projects/<slug>/brief.md`.

## 2. Platform rules (full detail in EDITING_RULES.md)
| | Instagram | LinkedIn |
|---|---|---|
| Format | 9:16 1080×1920; safe zone: top 270, bottom 670, right rail 230, sides 65 px; cover safe in 3:4 | 4:5 default · 1:1 talking head · 16:9 screen/long; text in centre 1080×1080 |
| Tone / pace | Casual, contemporary; new visual every 2–4 s; jump cuts; punch-ins 110–125%; beat-synced | Formal, credible; 2–4 s shots; cuts on sentence ends; zooms 105–110% |
| Captions | Word-by-word, big, active word in accent | Sentence captions + SRT |
| Audio | Original score; trending audio added in-app on the no-music export | Speech first, quiet bed or none |
| Ending | Loop or quick CTA | Question card + name/title |

## 3. Reference-first
Files → `ref_analyze.py` (look at every sheet) · links → browser screenshots (YouTube/Instagram: ask for a screen recording) → `style_brief.md` → style frames + 5 s test side-by-side with the reference → build only after a yes.

## 4. Pipeline
Ingest → review → intake → references → use-case prep (talking head: `transcribe.py` cuts silences/fillers + captions; events/demos: research and cite) → storyboard from the blueprint → style gate → build with motion.js (`--size` per platform, `zoom_kf`, speech cues, `"music": false` IG export) → preview → audio → render → QC (`qc_safezone.py`, "human designer?", "feels like the reference?", "follows platform rules?") → deliver per platform (video, IG no-music version, cover/thumbnail, post caption, SRT) → reinforcement log.

## 5. Guardrails
Facts only from footage, the user, or cited sources · check quotes against the user's work · consent and rights (no copyrighted music baked in; references inspire, never copied) · never overwrite originals · Claude can't hear audio, so verify visually and say so.

## 6. Learn
After each feedback round: add a scoped, dated row to `framework/LEARNINGS.md`; promote standing rules into CLAUDE.md / EDITING_RULES.md / MOTION_STYLE.md / BLUEPRINTS.md.
