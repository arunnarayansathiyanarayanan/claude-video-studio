# LEARNINGS — reinforcement log

Every piece of creator feedback becomes a rule here, so the next edit starts better than the last.
Read the whole log before every edit. **Newer entries win** when two rules conflict.

**How to add an entry** (see CLAUDE.md §6):
`| L## | YYYY-MM-DD | scope | signal (the creator's words or the observed problem) | rule going forward | status |`
- scope: `all` · `instagram` · `linkedin` · a use case (`event`, `talking-head`, `interview`, `demo`, `tutorial`, `announcement`, `bts`) · `tech`
- status: `active` · `promoted → <file>` (rule now lives in CLAUDE.md / EDITING_RULES.md / MOTION_STYLE.md / BLUEPRINTS.md) · `superseded by L##`
- Never delete rows. Keep wording generic (this file is public): no names, companies or private details.

## Creative rules (from feedback)
| ID | Date | Scope | Signal | Rule | Status |
|---|---|---|---|---|---|
| L01 | 2026-10 | all | "add sound" | Every video ships with music/sound design (original score if no track) | promoted → CLAUDE.md |
| L02 | 2026-10 | all | "add real animation, not only text" | A designed motion layer beyond kinetic type on every video | promoted → MOTION_STYLE.md |
| L03 | 2026-10 | event | takeaways felt generic | Takeaways are researched and sourced: Signal → Evidence (+source) → So-what; never infer insights from slide photos alone | promoted → CLAUDE.md |
| L04 | 2026-10 | event | wanted a full animated explainer of the concept | Concept videos get a 4-beat explainer; length 30 → 60 s when needed | promoted → BLUEPRINTS.md |
| L05 | 2026-10 | all | thumbnail "too heavy and cluttered, make it non-AI" | Covers/thumbnails are editorial and minimal: one photo, one headline, one accent | promoted → EDITING_RULES.md |
| L06 | 2026-10 | all | motion "old and simple, not nice" (particles, glows, glitch, confetti) | Follow MOTION_STYLE.md (flat graphic design + craft); kill-list effects banned | promoted → MOTION_STYLE.md |
| L07 | 2026-10 | all | style guide changed but no code produced the look | A style change isn't done until the code exists (motion.js) and a test clip + style frames were shown | promoted → CLAUDE.md §6 |
| L08 | 2026-10 | all | "why don't you ask for a reference and build from it?" | Reference-first: ask for 1–3 references, analyse (ref_analyze.py + look at sheets), style brief, side-by-side style gate | promoted → CLAUDE.md |
| L09 | 2026-10 | all | "not only event footage; Instagram and LinkedIn differ; ask requirements first" | Mandatory 2-round intake (platform, video type, length, references, …); platform + use-case rules from EDITING_RULES.md; IG casual/contemporary, LinkedIn formal | promoted → CLAUDE.md, EDITING_RULES.md |
| L10 | 2026-10 | all | a strong quote contradicted the creator's own field | Check quotes against the creator's positioning; flag conflicts before using | promoted → CLAUDE.md §4 |
| L11 | 2026-10 | all | — | Product/company mentions stay soft (one line) and only if the config sets one | promoted → creator.config |
| L12 | 2026-10 | instagram | trending audio is licensed | Never bake trending/copyrighted music in; deliver a no-music version and add the sound in-app | promoted → EDITING_RULES.md |

## Technical rules
| ID | Date | Scope | Signal | Rule | Status |
|---|---|---|---|---|---|
| T01 | 2026-10 | tech | WhatsApp export = folder + duplicate .zip | Transfer the zip only (one file); unzip in the build environment | active |
| T02 | 2026-10 | tech | crf 18 → 53 MB for 30 s | crf 21 + maxrate 8M (≈ 20 MB / 60 s) | promoted → engine.py |
| T03 | 2026-10 | tech | 118 px hashtag overflowed 1080 px | Hero words ≤ ~12 chars at ≥ 110 px; preview frames before every full render | promoted → CLAUDE.md §4 |
| T04 | 2026-10 | tech | titles collided with a corner label | Top text ≥ 230 px when a label is visible; re-check caption windows after adding motion | active |
| T05 | 2026-10 | tech | busy LED backgrounds hid text | Flat field or scrim behind hook text | active |
| T06 | 2026-10 | tech | 480p phone clips looked soft when cropped | `framed` mode (card over blurred fill) + mild unsharp | promoted → CLAUDE.md §5 |
| T07 | 2026-10 | tech | annotations placed by guessing | Locate targets on a 100 px-grid preview frame | promoted → CLAUDE.md §3 |
| T08 | 2026-10 | tech | multi-stroke icons drew as dots | Draw SVG subpaths sequentially (setLineDash resets per subpath) | promoted → fx.js / wb.js |
| T09 | 2026-10 | tech | opaque overlay frames skipped | Compositor treats 3-channel PNGs as opaque | promoted → engine.py |
| T10 | 2026-10 | tech | preview/render frame mismatch | round(t*fps) everywhere | promoted → scripts |
| T11 | 2026-10 | tech | Google Fonts/GitHub/Hugging Face blocked in sandbox | Fonts via `npm pack @fontsource/<font>`; transcription model downloads on the creator's machine or use `--from-json` | promoted → CLAUDE.md §5 |
| T12 | 2026-10 | tech | 1800 overlay frames ≈ 10 min | Split `overlay_render.py … range:a-b` across parallel workers | promoted → CLAUDE.md §3 |
| T13 | 2026-10 | tech | thumbnail inset showed a half-drawn stroke | Capture insets after the last stroke | active |
| T14 | 2026-10 | tech | Claude can't hear audio | Verify with waveform/spectrogram + ebur128; the creator judges the mix | promoted → CLAUDE.md §3 |
| T15 | 2026-10 | talking-head | filler words were dropped from captions but stayed in the video | transcribe.py splits keep-segments around fillers, not just silences | promoted → transcribe.py |
| T16 | 2026-10 | tech | file:// pages can't fetch() local JSON | Inline caption/word data into the overlay HTML | promoted → CLAUDE.md §5 |
| T17 | 2026-10 | tech | a re-sent file arrived stale on the creator's machine | After syncing, verify size/contents on the destination; re-send under a new name if stale | active |
| T18 | 2026-10 | tech | workspace filled up with transfer zips, bundles and extracted copies | Standard project layout (source/media/references/work/renders/tests); delete transfer leftovers after syncing; keep only the latest release zip | promoted → CLAUDE.md |
