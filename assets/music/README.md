# Music

**SONG mode (v4.6, v4.7).** `AHAD_every_mood.mp3` (song A, G minor ~112 bpm) and `AHAD_every_mood2.mp3` (song B, the alt version,
G# minor ~144 bpm) are cut into loops at play time, an A and a B loop per game section, by the `SONG` settings block at the top of `sketch_dot_hex.js`. Nothing is pre-cut: the loops are
start/end times (seconds) into this one file, so remapping is editing numbers.

- Sections switch on the next bar line of the playing loop (tested), with a half-beat fade.
- **Cool-down (v4.7):** a section plays at least `SONG.hold` (12 s) and the game must stay in a new mood `SONG.settle` (2 s) before the music follows; `SONG.urgent` (boss, drop, ending, outro) cut in at once. Coming back within `SONG.remember` (90 s) carries on from the same bar instead of restarting.
- **Variety:** every `SONG.vary` (2) times round a loop, the other song's version of that section plays.
- `SONG.mix` brings back the quiet/loud moments Suno flattened (gain + a muffle filter per section).
- The composed mood layers (tension, heartbeat, hope bells, clock) play on top, in the song's key (G minor) and locked to its bars.
- No file, or `SONG.on = false` -> the composed music (`MUSIC`, v4.5) plays instead.
- In the p5 editor: upload both MP3s (Sketch > Upload file) with the same names. One missing = only the other song's loops play.

## Remap / a new song
```bash
python3 tools/remap/analyze.py assets/music/<song>.mp3 work/analysis.json   # tempo, key, sections, a table to read
python3 tools/remap/plan.py assets/music/<song>.mp3 work/analysis.json map.json   # clean loops near your chosen times
```
`map.json` = `{ "intro": {"near": 0.0, "bars": 2}, ..., "outro": {"near": 168.0, "once": true} }`. Paste the printed lines into `SONG.loops`,
add the song to `SONG.songs` (file + root = the key `analyze.py` prints, as MIDI) and give its loops `song: N`, rebuild, then `npm run music` writes `music-preview/00_SONG_TOUR...wav`.

`source/AHAD.m4a` (the original AHAD track from Peter's Drive) is kept for reference only; the game does not use it.
