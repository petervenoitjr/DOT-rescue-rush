# DO-T: Lost and Found — handoff

**Status (v4.4, 2026-11-12):** fully playable start to finish; 11/11 headless checks pass. Not yet played by a child or on a real phone. Pouncer and Brute art are placeholders.

## The game
DO-T wakes on The Dock of an AHAD station that is about to self-destruct (650 turns). Eight babies in glowing pods have drifted across a 4x4 grid of sectors plus three ducts. Every tap is one turn, then every enemy acts (Hoplite rules): moving IS attacking. DO-T carries up to 2 babies home; bringing all 8 back wins, or he can launch the escape pod early with fewer. Repairing a sector's circuit (a puzzle) turns its lights on, stops its alarm and gives an upgrade.

## Content, and where it lives (all in `sketch_dot_hex.js`)
- **Map:** `WORLD` (grid, walls, rooms: name, biome, foes, sheep = babies, site = circuit, cave = duct, alarm, boss). 17 places: 14 sectors + Lift Pit, Core Ducts, Security Bay (boss).
- **Enemies:** `FOES`. W **Biter** (melee, AHAD art), B **Beamer** (shoots straight lines range 2-4, never point-blank, AHAD art), L **Pouncer** (moves 2, 2 hp, placeholder: Biter + thorn crown), R **Brute** (3 hp, placeholder: big armoured Biter), K **Crab Worker** boss + 2 C claws.
- **Upgrades:** `BLESSINGS` (8; some cost a hull plate).
- **Sector looks:** `BIOMES` → `DLOOK` palettes.
- **Words:** `THEME.text`, `THEME.help`; verses in `DVERSES` (KJV).
- **Sounds:** the DO-T RUSH setup. Files in `assets/sfx/` are packed into the sketch (`EMBED_ASSETS`) by `tools/build.py`; `SETTINGS.audio.files` maps game events to file names; anything without a file uses the synthesized `THEME.sfx` sound. DO-T RUSH's sound is fully applied: its only sound file, `victory.m4a` (Peter's GREAT JOB! sound; plays on a boss kill and when all 8 are safe), and its beeps (`RUSH_BEEPS`, copied exactly from DO-T RUSH `src/audio.js`) for zap, kill, thrust (jump), step (turn), hurt, Beamer shot, pickups (byte) and button taps (ui). Events DO-T RUSH has no sound for (fist, shield bump, upgrade, vent fall, warp, Crab roar, acid, alarm siren...) keep this game's synthesized sounds.
- **Music:** the AHAD tracks from Peter's Google Drive (`AHAD DOT 21 / AHAD Workshop / AHAD-Audio`), in `assets/music/`. `musicTick()` picks one per moment from `SETTINGS.audio.music`: title = `AHAD.mp3` (MP3 of the original `source/AHAD.m4a`), sector = JFobbsTunes 1_1, alarm + Crab fight = 1_2, ducts = 1_4. The choice was made from loudness/energy measurements, not by ear. Missing tracks stay quiet.

## Key systems
- **Moves:** `playerTap()` → step / thrust (`canLeapTo`, 50 energy) / fist throw (`throwTarget`) / shield bump (`doBash`, 3-turn cooldown, shove into vents or coolant kills).
- **Zap (the flashlight):** `zapHits(from, to, lunge)`: stab = start and end next to an enemy; ram = step straight at one 2 away. `resolveStabs()` applies it and fires the light cone (`drawZapLight`).
- **Green / red preview:** `movePreview()` simulates the zap, drops enemies it would kill, and re-runs `threatMap(skip)` so a hex is red only if a SURVIVOR can hit it. Green hex = zap; green + red X = zap but still hit. Validated: 0 "safe but hit" in hundreds of random moves.
- **Telegraph:** `threatMap()` (melee = adjacent, archer = straight lines, acid).
- **Enemy turn:** `enemyPhase()`.
- **Rocket fist:** one fist; it lands on the target hex and must be walked over. On an armored target it bounces back one hex.
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
0. **Listen to the music choices** and swap any in `SETTINGS.audio.music`. Two AHAD tracks are still in Drive only: `AHAD-JFobbsTunes1_3_01.mp3` (6.6 MB) and `1_5_01.mp3` (8.7 MB) were too big for the Drive connector; download them into `assets/music/` (one may suit the boss better).
1. Child playtest on a real phone; tune `SETTINGS.timer.turns` from the log.
2. AHAD art for Pouncer and Brute.
3. Optional WAIT action (DO-T has no way to pass a turn; a boxed-in DO-T with the shield cooling and no energy or fist can't act. Never seen in 60+ test runs, but possible).
4. Bring the same fixes / debug menu / green preview to the David version (`sketch_david_hex.js`, not in this folder).
5. `SETTINGS.debug.showButton = false` before sharing.

## Known rough edges
- Music mapping chosen by measurement, not by ear; boss and alarm share one 21-second track. Sound effects are DO-T RUSH's beeps + victory.m4a, the same as DO-T RUSH itself.
- Fonts and sound never verified by eye/ear (headless tests run offline, fallback fonts).
- The random bot never wins (it isn't smart), so its turn numbers say nothing about difficulty.
- `dot_hex_page.html` loads p5 and Exo 2 from the internet; offline it won't run (the test serves p5 from node_modules).
- The danger preview is occasionally over-cautious (a Beamer shot blocked by another enemy moving first) — never under-cautious.
