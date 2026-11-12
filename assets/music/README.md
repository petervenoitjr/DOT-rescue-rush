# Music

**v4.6: SONG mode.** `AHAD_every_mood.mp3` (Peter's Suno song, made from the 12-section brief) is cut into loops at play time,
one per game section, by the `SONG` settings block at the top of `sketch_dot_hex.js`. Nothing is pre-cut: the loops are
start/end times (seconds) into this one file, so remapping is editing numbers.

- Sections switch on the next bar line of the playing loop (tested), with a half-beat fade.
- `SONG.mix` brings back the quiet/loud moments Suno flattened (gain + a muffle filter per section).
- The composed mood layers (tension, heartbeat, hope bells, clock) play on top, in the song's key (G minor) and locked to its bars.
- No file, or `SONG.on = false` -> the composed music (`MUSIC`, v4.5) plays instead.
- In the p5 editor: upload `AHAD_every_mood.mp3` (Sketch > Upload file) with the same name.

## Remap / a new song
```bash
python3 tools/remap/analyze.py assets/music/<song>.mp3 work/analysis.json   # tempo, key, sections, a table to read
python3 tools/remap/plan.py assets/music/<song>.mp3 work/analysis.json map.json   # clean loops near your chosen times
```
`map.json` = `{ "intro": {"near": 0.0, "bars": 2}, ..., "outro": {"near": 168.0, "once": true} }`. Paste the printed lines into `SONG.loops`,
set `SONG.file` and `SONG.root` (the key `analyze.py` prints), rebuild, then `npm run music` writes `music-preview/00_SONG_TOUR...wav`.

`source/AHAD.m4a` (the original AHAD track from Peter's Drive) is kept for reference only; the game does not use it.
