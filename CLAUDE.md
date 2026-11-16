# DO-T Rescue Rush

A hex tactics game (Hoplite rules) aboard the space station from **All Humans Are Dead (AHAD)**. DO-T the robot rescues 8 babies before the station self-destructs. One file of plain **p5.js 2.3.4** (global mode) that pastes straight into the p5.js web editor. Owner: **Peter Venoit, Jr.** Version **4.8.1** (2026-11-16). Formerly *DO-T: Lost and Found* (renamed 2026-11-16).

Repo: https://github.com/petervenoitjr/DOT-rescue-rush

Live page (private, Peter's account): https://claude.ai/artifact/Si1ZmXPJCgSx5KqHKbUVPR

## Golden rules
- **`sketch_dot_hex.js` is the source of truth.** The two HTML files are generated from it by `tools/build.py`. Never edit the HTML by hand, and never edit below the `SOUND DATA` marker at the end of the sketch (the build rewrites it).
- **The SETTINGS block at the top is for students.** Every tunable number, list, enemy, upgrade, map room and debug scenario lives there, with plain-English comments. New tunables go there, not deep in the code.
- **p5 web editor safety:** every `for`/`while` body gets `{ }` braces. The only unbraced loops are inside the `DotRig` class, which is the AHAD rig copied **unchanged**; don't edit DotRig.
- **Never name a global after a p5 function** (`floor`, `byte`, `screen`, `pop`, ...). p5 2.x defines many.
- **Style is DOT-UI / AHAD** (the `dot-ui-style` and `ahad-*` skills): thin wide-spaced Exo 2 caps via `txt()`, chamfered outlines, colour = meaning (cyan normal, amber do-this-now, green safe/done, violet secondary, magenta alarm, red danger). Enemy, fist and crab art is copied from DO-T RUSH; keep it in step with that game.
- **Name:** DO-T Rescue Rush. The title screen shows only RESCUE RUSH (`drawTitle()`); the full name is `THEME.title`, the page `<title>`, and the docs.
- **Credit line** "Made by Peter Venoit, Jr. — 2026" stays on the title, pause and end screens (`SETTINGS.credit`).
- **KJV scripture** is part of the game (title, circuits, win/lose). Quote KJV exactly; `DVERSES` holds them.
- **Rocket fist = slingshot (v4.8, from Peter's DOT Blaster / Drag'n'Boom):** a pull that starts on DO-T (or anywhere after tapping FIST) aims; release launches. `fistFlight()` is the single source of truth for where a throw goes (enemy / wall / miss); `launchFist()` → `fistLands()` explodes (`SETTINGS.fist.blast`) and drops the fist for pickup. A pull shorter than `deadzone` is a normal tap. A throw straight into the wall beside DO-T is refused (no free blast at his feet).
- **One source of truth for attacks:** `zapHits()` decides who a move zaps, for BOTH the green preview and the real move. Keep it that way so the preview can never lie.
- Debug runs (`G.debugId`) must never write to the best score or the playtest log.
- Before shipping: set `SETTINGS.debug.showButton = false`.

## Build, run, test
```bash
npm install                      # once: p5 2.3.4 + playwright 1.63.0 (dev only)
npx playwright install chromium  # once, if this machine has no Playwright Chromium
npm test                         # headless smoke test, 23 checks (serves the folder over http), exit 0 = pass
node tools/playtest.js --no-song # same, with the song hidden: tests the composed-music fallback
npm run shots                    # same, plus screenshots in playtest-shots/
npm run mobile                   # emulated phone, no autoplay override: a finger tap must unlock sound
npm run music                    # same, plus music-preview/: the song as the game plays it (tour) + every section
```
Play: open `dot_hex_page.html` in a browser (needs internet for p5 + the font), or paste `sketch_dot_hex.js` into editor.p5js.org (p5 2.3.4).

After editing the sketch or adding sounds, rebuild (packs `assets/sfx/` into the sketch, regenerates both HTML files):
```bash
python3 tools/build.py
```
Publishing to the artifact: send `dot_hex_publish.html` plus `assets/music/AHAD_every_mood.mp3` and `assets/music/AHAD_every_mood2.mp3` as supporting files at those same paths.
`dot_hex_publish.html` is what gets published to the claude.ai artifact (the artifact service adds its own wrapper).

## File map
| File | What it is |
|---|---|
| `sketch_dot_hex.js` | The whole game (v4.8). Sections in order: SETTINGS (+ DEBUG_SCENARIOS, FOES, BLESSINGS, BIOMES, WORLD) → DotRig (AHAD rig, unchanged) → THEME (DO-T look, text, sounds) → DOT-UI kit → AHAD art (Biter, Beamer, Rocket Fist, Crab) → hex engine (maths, world gen, player turn, zap preview, enemy turn, alarms, puzzles, save/log, input, drawing, screens). |
| `dot_hex_page.html` | Standalone page: open it to play. Generated. |
| `dot_hex_publish.html` | Page body for the claude.ai artifact. Generated. |
| `assets/sfx/` | Sound effects (DO-T RUSH names), packed into the sketch by the build. Has `victory.m4a`; README lists the other names. |
| `assets/music/` | `AHAD_every_mood.mp3` + `AHAD_every_mood2.mp3` (the Suno songs A and B, SONG mode) + README (how to remap) + `source/AHAD.m4a` (reference, unused). |
| `tools/remap/` | `analyze.py` (tempo, key, sections) and `plan.py` (clean bar-locked loops) for remapping a song onto the game. |
| `tools/build.py` | Build: packs sounds, regenerates both HTML files. |
| `sketch_dot_hex.v3.js` | v3 as it was before this round of work, kept for reference/diffs. Not used. |
| `tools/playtest.js` | Headless smoke test (Playwright). |
| `package.json` | Dev deps + `npm test`. |
| `HANDOFF.md` | Project story, systems, open questions, next steps. |

## Debug / dev tools
- **DEBUG button** (title screen, bottom right) → 18 scenarios (`DEBUG_SCENARIOS` / `startDebug()`): Crab asleep / exposed / lined up, enemy zoo, Beamers only, alarm sector, the 3 puzzles, all sectors clear (warp test), escape pod, carrying 2, late all-alarms, low time, all upgrades, empty sector, win / lose screens. Plus **GOD MODE** and **REVEAL MAP** toggles.
- `SETTINGS.debug`: `showButton`, `skipTitle`, `invincible`, `revealMap`, `fixedSeed` (0 = random station).
- **Playtest log**: every real finished run is stored in localStorage `dot_hex_log` (last 50); the title shows a summary line. Use it to tune `SETTINGS.timer.turns`.
- **Phone sound (v4.7.1):** never rely on `pointerdown` to start audio: on touch screens only touchend / pointerup / click count as a user gesture. `sndWatch()` unlocks on those page-wide; `sndUnlock()` plays a silent buffer and a looping silent `<audio>` (iPhone silent-switch workaround); the pause menu shows `sndStatus()` (AUDIO state // SONGS loaded // TAPS // IOS FIX ON). Chromium can't reproduce iOS audio rules: confirm on a real iPhone.
- **Sound:** `SETTINGS.audio` (volumes, `files` = which DO-T RUSH sound plays for each event). File first, synthesized `THEME.sfx` beep as fallback. Pause menu has SOUND and MUSIC toggles (saved).
- **Song (v4.6-4.7):** `SONG` settings block: `songs` (file + root key each), `hold` / `settle` / `urgent` / `remember` (cool-down: `musicSettle()`), `vary` (A/B alternation), `loops` ([A, B] per section: start/end seconds, whole bars, `song: 2` for B), `mix` (gain + muffle per section), `speedUp` (Dock Mash), `composed` (sections played by the composed engine instead: the title = Exploring + tension, Peter's pick). `makeSongPlayer()` plays loop passes, switches on the next bar, remembers each section's bar (`S.mem`); `musicTick()` locks the mood layers to each pass. Web Audio is needed for bar-locked loops; `navigator.audioSession.type = 'playback'` keeps it audible with the iPhone silent switch on (Safari 17+).
- **Composed music (fallback when the song is missing or `SONG.on = false`):** `MUSIC` settings block (riff, key, bpm and level per section, mood layers, reverb). Engine `makeMusic()`; `musicSection()` picks the section, `moodsNow()` + `musicMix()` set the layer volumes, which ease over `MUSIC.ease` seconds. Every instrument plays into a named layer (`MUSIC_LAYERS`); add an instrument by giving it a layer. Keep all loops braced (p5 editor).
- Keyboard: W E D X Z A move, 1 thrust, 2 fist, M map, Esc pause.
