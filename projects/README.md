One folder per job: `projects/<yyyy-mm>-<slug>/`

| Subfolder | Contents |
|---|---|
| `source/` | Original photos/videos (or the WhatsApp .zip) — never modified |
| `media/` | Renamed working copies (`img01.jpg`, `vid1.mp4`) + `map.txt` back to originals |
| `references/` | Style references + `_analysis/` from ref_analyze.py |
| `work/` | storyboard.json, overlay HTML, scene JS, score.json/wav, transcripts (`tr/`) |
| `renders/` | Deliverables: videos per platform, cover/thumbnail |
| `tests/` | Style frames and motion tests |
| root | brief.md, style_brief.md, edit_log.md, caption files |

Everything in this folder is git-ignored except this README — your media never gets published.
