# Music

**The game's music is no longer a file.** Since v4.5 it is composed live in code inside `sketch_dot_hex.js`
(`MUSIC` settings at the top, `makeMusic()` engine), so it works in the p5 editor and on the published page with nothing to upload.

- One shared riff (`MUSIC.riff`) runs through 12 sections: Intro, Comic, Chapter Card, Exploring, Stealth, Enemy Nearby,
  Repair Puzzle, Dock Mash, Boss Fight, Drop, Ending, Outro. `musicSection()` picks one from what is happening.
- Mood layers (`MUSIC.moods`) fade in on top of any section: tension (an enemy creeping closer), heartbeat (last heart),
  hope bells (carrying babies), a ticking clock (self-destruct under 50%), and calm (cleared sector: drums drop back).
- Hear every section without playing: `node tools/playtest.js --music` writes WAVs to `music-preview/` (git-ignored).

The old AHAD / JFobbsTunes MP3s were scrapped (v4.5). `source/AHAD.m4a` (the original AHAD track from Peter's Drive,
`AHAD DOT 21 / AHAD Workshop / AHAD-Audio`) is kept here for reference only; the game does not use it.
