# Motion style v2 — the standard for every edit

References:
- Jitter templates — https://jitter.video/templates/ (flat, graphic product motion: text, social, UI elements, charts, icons, transitions)
- Ben Marriott, "The Best Motion Design & Animation of 2026 (So Far…)" — https://youtu.be/ylXeuDp_8XM (human-made craft: 2D/3D, hand-drawn, clay)

Goal: motion that looks designed by a human studio, not generated. Craft over effects.

## 1. Kill list (never use)
| Retired effect | Why |
|---|---|
| Particle / neural-network constellations | AI cliché, visual noise |
| Glows, blur halos, light leaks, lens streaks, decorative vignettes | dated "tech promo" look |
| RGB-split glitch cuts, decorative film grain | cheap |
| Shockwave rings + spark bursts on every hit | repetitive |
| Confetti | cliché |
| Diagonal multi-colour wipes | heavy; use masked shape transitions |
| Blur-in "slam" on every word | overused; max one moment per video |
| Text on skewed highlight boxes as a system | fine once as an accent |

## 2. Visual language
| Element | Rule |
|---|---|
| Colour | 2 neutrals + 1 accent per video (see creator.config.md). Flat solid fields; at most one slow gradient loop |
| Type | One bold grotesk (e.g. Inter Display 800–900), tight tracking (-3% to -5%), sentence case for statements; very large type used as layout |
| Layout | Grid-based, 72 px margins, one idea per frame, generous negative space |
| Shapes | Rounded rects/cards, circles, pills, arrows. Flat fills, 0–2 px strokes; if depth is needed, one soft offset shadow |
| Photos / video | Inside rounded cards or masks that move as design objects (stack, slide, flip, scale to full-bleed) |
| Icons | Flat line/solid icons that morph or draw on with intent |
| Craft touches | Optional subtle paper grain on flat fills; hand-drawn accents (underline, circle, arrow) — max 1–2 per segment |

## 3. Motion principles
| Principle | Spec |
|---|---|
| Easing | Never linear. In: cubic-bezier(0.16,1,0.3,1); out: cubic-bezier(0.7,0,0.84,0); springs for objects (stiffness ~180–260, damping ~18–22 → 4–8% overshoot) |
| Timing @30 fps | Enter 10–16 frames, exit 6–10 frames, hold ≥ 1 s for anything to read, stagger siblings 2–4 frames |
| Anticipation & follow-through | Dip/scale to 0.96 before a move; settle with overshoot; secondary elements lag 2–3 frames |
| Squash & stretch | Fast moves stretch 5–12% along the direction; squash on landing |
| Choreography | One hero motion at a time; consistent travel direction per segment |
| Continuity | Match cuts / morphs: a shape in scene A becomes the container of scene B (card → frame, circle → button, word → icon) |
| Rhythm | Cuts and key poses on the beat; text accents on off-beats |

## 3b. Platform energy (from EDITING_RULES.md)
| | Instagram | LinkedIn |
|---|---|---|
| Springs | Snappier (bounce 0.3–0.4), whip/stretch transitions, kinetic captions on the beat, stickers/arrows | Calmer (bounce 0.1–0.2), masked reveals, card moves, data callouts, lower thirds, max one signature moment |
| Type | Expressive scale changes, handwritten accents OK | One grotesk, two weights |
| Colour | Vivid, warm, punchy | Natural, slightly muted, brand-consistent |

## 4. Technique menu
| Technique (Jitter analogue) | Use for |
|---|---|
| Masked line reveal | Headlines, takeaways |
| Kinetic ticker rows ("The Route") — word rows + arrows scrolling in opposite directions | Hook / theme |
| Stretched / inflating type, type repeater | One hero-word moment |
| Card stack ("The Stack") — photos shuffle, fan out, fly to front | Event recap |
| Orbit: cards | Recap montage around a title |
| Split reveal / nested images ("The Edit") | Photo-to-photo transitions |
| Image stretch transition | Fast cut between clips |
| Card flip | Before/after, A vs B |
| UI-element animation (buttons, cursor, toggles, terminal typing, progress) | Product / concept explainers |
| Animated charts and counters | Sourced stats |
| Icon morph | Concept transitions |
| Ripple / blend-mode double exposure | Max one signature moment |

## 5. Segment recipes (60 s)
| Segment | Recipe |
|---|---|
| Hook 0–3 s | Flat accent field + ticker rows of theme words; event clip revealed inside a growing rounded mask |
| Recap | Photos as card stack / orbit, each card snaps to full-bleed and back; masked line captions; one hand-drawn "that's me" |
| Explainer | Flat vector UI scenes: cards, cursor actions in a mock app, icon morphs between beats (whiteboard only if configured) |
| Takeaways | Big "01" + masked headline on a flat neutral; proof slides in as a quote card; so-what as a pill/tag; accent progress bar |
| Outro | Photo card → full-bleed, name lockup, question in a speech-bubble card |

## 6. Build notes
- Build with `framework/scripts/motion.js` (v2 kit). Starting points: `templates/project/hook.example.html` (5 s hook: ticker rows → card → full-bleed clip → masked headline on ink panel → photo-card fan → hand-drawn note) and `templates/project/frames.example.html` (style frames: explainer as flat UI, takeaway, outro).
- `fx.js` holds the legacy effects above; don't use them for new work.
- Before a full render, show 4–6 style frames + a 5 s motion test of the hook and get a yes.
- QC every scene with one question: "would a human motion designer ship this?"
