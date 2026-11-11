# DO-T: Lost and Found

A hex tactics game (Hoplite rules) aboard the space station from **All Humans Are Dead (AHAD)**. DO-T the robot rescues 8 babies before the station self-destructs. One file of plain **p5.js 2.3.4** (global mode) that pastes straight into the p5.js web editor. Owner: **Peter Venoit, Jr.** Version **4.2** (2026-11-10).

Live page (private, Peter's account): https://claude.ai/artifact/Si1ZmXPJCgSx5KqHKbUVPR

## Golden rules
- **`sketch_dot_hex.js` is the source of truth.** The two HTML files are generated from it (see Build). Never edit the HTML by hand.
- **The SETTINGS block at the top is for students.** Every tunable number, list, enemy, upgrade, map room and debug scenario lives there, with plain-English comments. New tunables go there, not deep in the code.
- **p5 web editor safety:** every `for`/`while` body gets `{ }` braces. The only unbraced loops are inside the `DotRig` class, which is the AHAD rig copied **unchanged**; don't edit DotRig.
- **Never name a global after a p5 function** (`floor`, `byte`, `screen`, `pop`, ...). p5 2.x defines many.
- **Style is DOT-UI / AHAD** (the `dot-ui-style` and `ahad-*` skills): thin wide-spaced Exo 2 caps via `txt()`, chamfered outlines, colour = meaning (cyan normal, amber do-this-now, green safe/done, violet secondary, magenta alarm, red danger). Enemy, fist and crab art is copied from DO-T RUSH; keep it in step with that game.
- **Credit line** "Made by Peter Venoit, Jr. — 2026" stays on the title, pause and end screens (`SETTINGS.credit`).
- **KJV scripture** is part of the game (title, circuits, win/lose). Quote KJV exactly; `DVERSES` holds them.
- **One source of truth for attacks:** `zapHits()` decides who a move zaps, for BOTH the green preview and the real move. Keep it that way so the preview can never lie.
- Debug runs (`G.debugId`) must never write to the best score or the playtest log.
- Before shipping: set `SETTINGS.debug.showButton = false`.

## Build, run, test
```bash
npm install                      # once: p5 2.3.4 + playwright 1.63.0 (dev only)
npx playwright install chromium  # once, if this machine has no Playwright Chromium
npm test                         # headless smoke test, 9 checks, exit 0 = pass
npm run shots                    # same, plus screenshots in playtest-shots/
```
Play: open `dot_hex_page.html` in a browser (needs internet for p5 + the font), or paste `sketch_dot_hex.js` into editor.p5js.org (p5 2.3.4).

Rebuild the HTML after editing the sketch (head = lines 1-6 of the page, then the sketch in a `<script>`):
```bash
{ sed -n '1,6p' dot_hex_page.html; echo '<script>'; cat sketch_dot_hex.js; echo '</script></body></html>'; } > /tmp/p.html && mv /tmp/p.html dot_hex_page.html
{ sed -n '1,5p' dot_hex_publish.html; echo '<script>'; cat sketch_dot_hex.js; echo '</script>'; } > /tmp/q.html && mv /tmp/q.html dot_hex_publish.html
```
`dot_hex_publish.html` is what gets published to the claude.ai artifact (the artifact service adds its own wrapper).

## File map
| File | What it is |
|---|---|
| `sketch_dot_hex.js` | The whole game (v4.2). Sections in order: SETTINGS (+ DEBUG_SCENARIOS, FOES, BLESSINGS, BIOMES, WORLD) → DotRig (AHAD rig, unchanged) → THEME (DO-T look, text, sounds) → DOT-UI kit → AHAD art (Biter, Beamer, Rocket Fist, Crab) → hex engine (maths, world gen, player turn, zap preview, enemy turn, alarms, puzzles, save/log, input, drawing, screens). |
| `dot_hex_page.html` | Standalone page: open it to play. Generated. |
| `dot_hex_publish.html` | Page body for the claude.ai artifact. Generated. |
| `sketch_dot_hex.v3.js` | v3 as it was before this round of work, kept for reference/diffs. Not used. |
| `tools/playtest.js` | Headless smoke test (Playwright). |
| `package.json` | Dev deps + `npm test`. |
| `HANDOFF.md` | Project story, systems, open questions, next steps. |

## Debug / dev tools
- **DEBUG button** (title screen, bottom right) → 18 scenarios (`DEBUG_SCENARIOS` / `startDebug()`): Crab asleep / exposed / lined up, enemy zoo, Beamers only, alarm sector, the 3 puzzles, all sectors clear (warp test), escape pod, carrying 2, late all-alarms, low time, all upgrades, empty sector, win / lose screens. Plus **GOD MODE** and **REVEAL MAP** toggles.
- `SETTINGS.debug`: `showButton`, `skipTitle`, `invincible`, `revealMap`, `fixedSeed` (0 = random station).
- **Playtest log**: every real finished run is stored in localStorage `dot_hex_log` (last 50); the title shows a summary line. Use it to tune `SETTINGS.timer.turns`.
- Keyboard: W E D X Z A move, 1 thrust, 2 fist, M map, Esc pause.
