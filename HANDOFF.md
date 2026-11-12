# DO-T: Lost and Found — handoff

**Status (v4.8, 2026-11-12):** fully playable start to finish; 23/23 headless checks pass (15/15 with `--no-song`). Not yet played by a child or on a real phone. Pouncer and Brute art are placeholders.

## The game
DO-T wakes on The Dock of an AHAD station that is about to self-destruct (650 turns). Eight babies in glowing pods have drifted across a 4x4 grid of sectors plus three ducts. Every tap is one turn, then every enemy acts (Hoplite rules): moving IS attacking. DO-T carries up to 2 babies home; bringing all 8 back wins, or he can launch the escape pod early with fewer. Repairing a sector's circuit (a puzzle) turns its lights on, stops its alarm and gives an upgrade.

## Content, and where it lives (all in `sketch_dot_hex.js`)
- **Map:** `WORLD` (grid, walls, rooms: name, biome, foes, sheep = babies, site = circuit, cave = duct, alarm, boss). 17 places: 14 sectors + Lift Pit, Core Ducts, Security Bay (boss).
- **Enemies:** `FOES`. W **Biter** (melee, AHAD art), B **Beamer** (shoots straight lines range 2-4, never point-blank, AHAD art), L **Pouncer** (moves 2, 2 hp, placeholder: Biter + thorn crown), R **Brute** (3 hp, placeholder: big armoured Biter), K **Crab Worker** boss + 2 C claws.
- **Upgrades:** `BLESSINGS` (8; some cost a hull plate).
- **Sector looks:** `BIOMES` → `DLOOK` palettes.
- **Words:** `THEME.text`, `THEME.help`; verses in `DVERSES` (KJV).
- **Sounds:** the DO-T RUSH setup. Files in `assets/sfx/` are packed into the sketch (`EMBED_ASSETS`) by `tools/build.py`; `SETTINGS.audio.files` maps game events to file names; anything without a file uses the synthesized `THEME.sfx` sound. DO-T RUSH's sound is fully applied: its only sound file, `victory.m4a` (Peter's GREAT JOB! sound; plays on a boss kill and when all 8 are safe), and its beeps (`RUSH_BEEPS`, copied exactly from DO-T RUSH `src/audio.js`) for zap, kill, thrust (jump), step (turn), hurt, Beamer shot, pickups (byte) and button taps (ui). Events DO-T RUSH has no sound for (fist, shield bump, upgrade, vent fall, warp, Crab roar, acid, alarm siren...) keep this game's synthesized sounds.
- **v4.7.2 (Peter: use "13_layers_explore_enemy_creeping_close" for the title):** that preview was the composed engine's Exploring section with the tension layer full, so the title now plays exactly that live (`SONG.composed.intro = { as: 'explore', moods: { tension: 1 } }`); the song rests (`songPlayer.stop()`, spot remembered) until play starts.
- **v4.7.1 (Peter: "Sound not coming through on mobile"):** audio was unlocked only in the canvas `pointerdown` handler, which is not a user gesture for touch (HTML spec: touchend / pointerup / click are). Now unlocked page-wide on those, with a silent buffer + a looping silent `<audio>` (keeps iPhone Web Audio playing with the ring/silent switch on), `audioSession.type = 'playback'` set before the context exists, resume on visibility change. Verified only in emulated Chromium (`npm run mobile`), which never showed the bug; NOT yet confirmed on a real iPhone. If still silent, read the AUDIO line in the pause menu. Risk: both songs decoded = ~150 MB of RAM on a phone; if decoding fails the composed music plays instead.
- **v4.7 (Peter: "the rapid changing and restarting is really annoying"):** cool-down via `musicSettle()` (`SONG.hold` 12 s minimum per section, `SONG.settle` 2 s before following a new mood, `SONG.urgent` = boss/drop/ending/outro cut in at once); sections resume from the remembered bar within `SONG.remember` 90 s; alt song B (`AHAD_every_mood2.mp3`, G# minor ~144 bpm, 3:33, decode offset 0) gives every section a second loop, alternating every `SONG.vary` = 2 rounds. Mood layers retune per pass (`pass.root`).
- **Song mode (v4.6, the default):** Peter's Suno song `assets/music/AHAD_every_mood.mp3` (prompted with the 12-section brief). Measured: 2:54, one tempo (~112 bpm, local 110.5-113.6), G minor, loudness flat within ~5 dB: Suno ignored the per-section tempos and most dynamics. So: `SONG.loops` = one bar-locked loop per section (picked by `tools/remap/plan.py` for the smoothest seam; browser decode offset measured = 0 samples), `SONG.mix` restores quiet/loud per section, Dock Mash speeds up to +6%, mood layers ride on top in G. Mapping follows the song's order (Suno roughly kept the prompt order) checked against measurements; it was NOT chosen by ear.
- **Music: our own soundtrack, composed live in code** (v4.5; the AHAD/JFobbsTunes files were scrapped at Peter's request). Brief: instrumental, atmospheric, spacious, lots of reverb like a creepy empty warehouse (`warehouseIR`, 4.8 s). One riff (`MUSIC.riff`, D minor) through 12 sections, each picked by `musicSection()`:
  intro = title · comic = how-to-play / pause · chapter = The Dock · explore = a sector (builds over 16 bars) · stealth = ducts and the sleeping Crab · enemy = an enemy within 2 hexes or able to hit DO-T (held 4 s) · repair = circuit puzzle / upgrade (major) · dock = self-destruct under 35% (120 → 150 bpm as time runs out) · boss = Crab awake with claws · drop = both claws cracked · ending = win (major) · outro = lose.
  **Mood layers** ease in on top of any section (`moodsNow()` → `musicMix()`, `MUSIC.ease` = 2.5 s): tension drone + shaker as an enemy closes in (5 hexes → adjacent), DO-T's heartbeat on his last heart, high bells while carrying babies, a ticking clock under 50% time, and calm (cleared sector: drums to 35%, pads open).

## Key systems
- **Moves:** `playerTap()` → step / thrust (`canLeapTo`, 50 energy) / fist throw (`throwTarget`) / shield bump (`doBash`, 3-turn cooldown, shove into vents or coolant kills).
- **Zap (the flashlight):** `zapHits(from, to, lunge)`: stab = start and end next to an enemy; ram = step straight at one 2 away. `resolveStabs()` applies it and fires the light cone (`drawZapLight`).
- **Green / red preview:** `movePreview()` simulates the zap, drops enemies it would kill, and re-runs `threatMap(skip)` so a hex is red only if a SURVIVOR can hit it. Green hex = zap; green + red X = zap but still hit. Validated: 0 "safe but hit" in hundreds of random moves.
- **Telegraph:** `threatMap()` (melee = adjacent, archer = straight lines, acid).
- **Enemy turn:** `enemyPhase()`.
- **Rocket fist (v4.8):** the DOT Blaster slingshot (Peter's `dot-blaster-1.0.0`, Drag'n'Boom from DO-T: Spire Boost), adapted to turns: put a finger on DO-T, pull back, let go. Pull length = distance (`minReach` 1.2 → `throwRange` 3 hexes, +1 with RANGE). The big fist flies free (not on hex lines) and explodes on the first enemy (hit size 0.42 hex) or wall: blast radius 1, 1 damage each, armor CLANKs, Crab wakes. Nothing hit = a miss, the fist lands on the floor. The aim line shows only half the flight (`aimPreview`), so judging distance is the skill. Not taken from the Blaster: slow motion / focus meter (meaningless in a turn-based game), combos.
- **Crab Worker** (Security Bay inside Hydro Labs): asleep until DO-T is within 3 hexes or throws; claws and shell armored (CLANK); shield-bump a claw INTO the shell from the hex beyond it = CRACK; both gone = eye opens, 3 hp; claws pinch adjacent hexes; every 2 turns it lobs 3 acid bubbles (green rings) that land next turn. Reward: a free upgrade. `genRoom` guarantees the baby and both crack hexes are reachable.
- **Self-destruct + alarms:** `SETTINGS.timer` (650 turns; warps cost 6). `alarmOn()`: sectors with `alarm: true` are dark from the start; below 35% time EVERY sector whose circuit isn't repaired (`R.lit`) goes into alarm. Alarm = red vignette, siren, a Biter every 7 turns (max 3), telegraphed a turn ahead.
- **Circuits:** `openSite()` → `makePuzzle()`: wire (connect dots 1-6), power (math incl. Ohm's law), cables (colour match). Wrong = sparks, no penalty.
- **Travel:** auto-walk in cleared sectors (`travelPath`), map warp to cleared sectors (`tryWarp`).
- **Saving:** best result `dot_hex_best`; playtest log `dot_hex_log` (`logRun`, `logSummary`). Timers use `later()` so an old run's end screen can't hit a new run.

## Look
DOT-UI (AHAD Prototype 11 HUD) on a tron grid; DO-T is the AHAD `DotRig`; Biter, Beamer, Rocket Fist and the Crab are copied from **DO-T RUSH** (Peter's sources: the AHAD enemy sheet, Peter's Crab sheet). Skills: `dot-ui-style`, `ahad-style`, `ahad-enemies`, `ahad-characters`.

## Open questions for Peter
1. **Countdown length (650)** — needs 2-3 children playtesting; read the playtest log line on the title.
2. **Late-game alarms** now hit every unrepaired sector, including sectors with no circuit (they can never be turned off). Keep, or soften?
3. **Real AHAD names and art for the Pouncer and Brute.**
4. **Crab Worker: "eye" or "eyes"?** Text follows the one-eyed Crab sheet; the AHAD design doc says eyes.
5. **Is the red X on green hexes big enough** for children to notice?

## Suggested next steps
0. **Listen to the song tour** (`npm run music` → `music-preview/00_SONG_TOUR...`) and remap any section in `SONG.loops` by ear. The composed fallback is tuned in `MUSIC`: the riff, each section's bpm/level, the mood layers. It was balanced by loudness measurement only; nobody has heard it yet.
1. Child playtest on a real phone; tune `SETTINGS.timer.turns` from the log.
2. AHAD art for Pouncer and Brute.
3. Optional WAIT action (DO-T has no way to pass a turn; a boxed-in DO-T with the shield cooling and no energy or fist can't act. Never seen in 60+ test runs, but possible).
4. Bring the same fixes / debug menu / green preview to the David version (`sketch_david_hex.js`, not in this folder).
5. `SETTINGS.debug.showButton = false` before sharing.

## Known rough edges
- Music balanced by measurement, not by ear (Comic/Outro about −40 dB average, Boss/Drop about −22 dB). Sections change on the next beat, so at 60 bpm a change can take up to 1 s. Sound effects are DO-T RUSH's beeps + victory.m4a, the same as DO-T RUSH itself.
- Fonts and sound never verified by eye/ear (headless tests run offline, fallback fonts).
- The random bot never wins (it isn't smart), so its turn numbers say nothing about difficulty.
- `dot_hex_page.html` loads p5 and Exo 2 from the internet; offline it won't run (the test serves p5 from node_modules).
- The danger preview is occasionally over-cautious (a Beamer shot blocked by another enemy moving first) — never under-cautious.
