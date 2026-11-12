# Sound effects go here

Drop the DO-T RUSH sound files here (.m4a .mp3 .wav .ogg), named as DO-T RUSH names them, then run
`python3 tools/build.py`. They get packed into the sketch, so the p5 editor needs no uploads.

Which file plays for which game event is `SETTINGS.audio.files` in the sketch:

| File | Game event |
|---|---|
| `zap` | DO-T's light zaps an enemy |
| `kill` | an enemy pops |
| `jump` | thrust |
| `fist` | rocket fist launch |
| `hurt` | DO-T is hit |
| `shoot` | a Beamer fires |
| `byte` | pick up a baby / the fist |
| `ui` | button tap |
| `block` | shield bump |
| `tool` | upgrade chosen |
| `turn` | a step |
| `victory` | boss down / all 8 safe (included) |

Without a file, an event plays **DO-T RUSH's own beep** for that name (`RUSH_BEEPS` in the sketch, copied exactly from DO-T RUSH `src/audio.js`: zap, kill, jump, turn, hurt, shoot, byte, ui). DO-T RUSH itself has only `victory.m4a` as a file, so these beeps ARE its sound effects. `fist`, `block` and `tool` have no DO-T RUSH beep, so they use this game's own synthesized sound.
