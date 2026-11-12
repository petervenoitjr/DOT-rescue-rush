// =====================================================================
//  DO-T: LOST AND FOUND  -  headless smoke test
//  Opens dot_hex_page.html in headless Chromium and checks every major system.
//
//  Setup (once, from the project folder):
//      npm install
//      npx playwright install chromium        (skip if a Chromium for Playwright is already installed)
//  Run:
//      npm test            (or: node tools/playtest.js [--shots])
//
//  p5 2.3.4 is served from node_modules (no CDN needed); the Google font request is stubbed (fallback fonts).
//  --shots writes screenshots to playtest-shots/ (git-ignored).
//  --music writes a WAV preview of every music section (and the mood layers) to music-preview/.
//  Exit code 0 = everything passed.
// =====================================================================
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const PAGE = path.join(ROOT, 'dot_hex_page.html');
const P5 = path.join(ROOT, 'node_modules', 'p5', 'lib', 'p5.min.js');   // p5's package exports hide lib/, so use the path directly
const SHOTS = process.argv.includes('--shots') ? path.join(ROOT, 'playtest-shots') : null;

(async () => {
  const browser = await chromium.launch(Object.assign({ args: ['--autoplay-policy=no-user-gesture-required'] }, process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}));
  const page = await browser.newPage({ viewport: { width: 540, height: 960 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/p5.min.js', (r) => r.fulfill({ path: P5, contentType: 'application/javascript' }));
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.goto('file://' + PAGE);
  await page.waitForTimeout(1200);
  if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); }
  const shot = async (n) => { if (SHOTS) { await page.waitForTimeout(300); await page.screenshot({ path: path.join(SHOTS, n + '.png') }); } };
  const results = [];
  const check = (name, ok, info) => { results.push({ name, ok: !!ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + JSON.stringify(info) : '')); };

  await shot('01_title');
  // DEBUG button on the title opens the debug menu
  await page.mouse.click(540 - 76, 960 - 61); await page.waitForTimeout(300);
  check('title DEBUG button opens the menu', (await page.evaluate(() => G.overlay)) === 'debug');
  await shot('02_debug_menu');

  // every debug scenario starts without throwing
  const scen = await page.evaluate(() => DEBUG_SCENARIOS.map((d) => { try { G.scene = 'title'; G.overlay = null; startDebug(d.id); return { id: d.id, ok: true }; } catch (e) { return { id: d.id, ok: false, err: String(e) }; } }));
  await page.waitForTimeout(200);
  check('all ' + scen.length + ' debug scenarios start', scen.every((s) => s.ok), scen.filter((s) => !s.ok));

  // boss rooms are always beatable
  const sweep = await page.evaluate(() => {
    let bad = 0;
    for (let k = 0; k < 200; k++) {
      G.seed = 1000 + k * 7919; G.rooms = {}; const R = genRoom('security', CAVE_UP);
      const blk = new Set([BOSS_AT - 1, BOSS_AT, BOSS_AT + 1]), d = bfs(CAVE_UP, null, (j) => isWalk(R.tiles[j]) && !blk.has(j));
      if (!R.enemies.length || d[BOSS_BABY] < 0 || d[BOSS_AT - 2] < 0 || d[BOSS_AT + 2] < 0) { bad++; }
    }
    return bad;
  });
  check('200 boss-room layouts all beatable', sweep === 0, { unbeatable: sweep });

  // full Crab Worker fight
  const boss = await page.evaluate(() => {
    startDebug('crack'); SETTINGS.debug.invincible = true; const R = G.room, o = {};
    G.busy = 0; playerTap(BOSS_AT - 1); o.left = !R.enemies.some((e) => e.i === BOSS_AT - 1);
    P.i = BOSS_AT + 2; P.bashCd = 0; G.busy = 0; R.acid = []; playerTap(BOSS_AT + 1); o.right = !R.enemies.some((e) => e.i === BOSS_AT + 1);
    o.exposed = !!bossBody() && !isArmored(bossBody());
    let guard = 0;
    while (bossBody() && guard++ < 10) { bossBody().stun = 0; P.i = BOSS_AT - 1; G.busy = 0; R.acid = []; P.mode = null; playerTap(nbrs(BOSS_AT).find((n) => n !== BOSS_AT - 1 && hexDist(n, BOSS_AT - 1) === 1 && isWalk(R.tiles[n]) && !enemyAt(n))); }
    o.killed = !bossBody(); o.reward = G.overlay === 'site'; SETTINGS.debug.invincible = false; return o;
  });
  check('Crab Worker: crack both claws, kill, reward', boss.left && boss.right && boss.exposed && boss.killed && boss.reward, boss);

  // the green / red move preview never calls a hex safe when DO-T would be hit
  const zap = await page.evaluate(() => {
    const st = { moves: 0, zaps: 0, safeButHit: 0 }, rooms = ['nursery', 'garden', 'mess', 'refinery', 'array', 'nest'], keep = SETTINGS.timer.turns;
    for (let run = 0; run < 150; run++) {
      startDebug('practice'); G.debugId = null; SETTINGS.timer.turns = 0; const room = rooms[run % rooms.length]; enterRoom(room, entryFor(room));
      for (let k = 0; k < 6 + (run % 9); k++) { G.busy = 0; const o = nbrs(P.i).filter((j) => canStepTo(j) && !exitSideAt(j)); if (!o.length || G.roomId !== room) { break; } P.hp = 9; playerTap(o[Math.floor(Math.random() * o.length)]); G.overlay = null; }
      if (G.roomId !== room || !G.room.enemies.length) { continue; }
      const opts = nbrs(P.i).filter((j) => canStepTo(j) && !exitSideAt(j)); if (!opts.length) { continue; }
      const to = opts[Math.floor(Math.random() * opts.length)], pv = movePreview(to, dirTo(P.i, to));
      P.hp = 9; G.busy = 0; playerTap(to); G.overlay = null; st.moves++; if (pv.zaps) { st.zaps++; }
      if (!pv.danger && P.hp < 9) { st.safeButHit++; }
    }
    SETTINGS.timer.turns = keep; return st;
  });
  check('move preview honest (safe hexes never get hit)', zap.safeButHit === 0 && zap.moves > 50, zap);

  // late game: every unrepaired sector goes into alarm
  const late = await page.evaluate(() => { startDebug('late'); const a = alarmOn(); startDebug('practice'); return { late: a, early: alarmOn() }; });
  check('late-game alarms on, early off', late.late && !late.early, late);

  // debug runs never touch the best score or the playtest log
  const clean = await page.evaluate(() => { const k1 = SETTINGS.savePrefix + '_log', k2 = SETTINGS.savePrefix + '_best', a = localStorage.getItem(k1), b = localStorage.getItem(k2); startDebug('loseScreen'); saveBest(); const ok = localStorage.getItem(k1) === a && localStorage.getItem(k2) === b; return ok; });
  check('debug runs stay out of best + playtest log', clean);

  // a random bot plays real runs and every screen is drawn
  const bot = await page.evaluate(() => {
    const res = { runs: 0, turns: 0, errors: [] }; newRun(); G.debugId = 'bot';
    for (let n = 0; n < 3000; n++) {
      try {
        G.busy = 0;
        if (G.overlay === 'quiz') { puzzleSolved(); continue; }
        if (G.overlay === 'site') { if (G.siteOpts.length) { takeBlessing(G.siteOpts[0]); } else { takeRest(); } continue; }
        if (G.won || P.hp <= 0 || G.overlay === 'win' || G.overlay === 'lose' || (timerOn() && turnsLeft() <= 0)) { res.runs++; newRun(); G.debugId = 'bot'; continue; }
        if (G.overlay) { G.overlay = null; }
        if (G.path) { travelTick(); continue; }
        const th = threatMap(), o = nbrs(P.i).filter((j) => canStepTo(j) || canBash(j)); if (!o.length) { newRun(); G.debugId = 'bot'; continue; }
        const safe = o.filter((j) => !th[j]); const pool = safe.length ? safe : o;
        playerTap(pool[Math.floor(Math.random() * pool.length)]); res.turns++;
        if (n % 30 === 0) { redraw(); }
      } catch (e) { res.errors.push(String(e).slice(0, 200)); if (res.errors.length > 3) { break; } newRun(); G.debugId = 'bot'; }
    }
    return res;
  });
  check('bot plays ' + bot.turns + ' turns without errors', bot.errors.length === 0, bot);

  // sound: packed files decode, mapped events play the file
  const audio = await page.evaluate(async () => {
    sndInit(); await new Promise((r) => setTimeout(r, 1500));
    const packed = Object.keys(typeof EMBED_ASSETS !== 'undefined' ? EMBED_ASSETS : {}).map((k) => k.replace(/^assets\/sfx\/|\.\w+$/g, ''));
    const decoded = packed.filter((n) => !!SND.buffers[n]);
    let played = 0; const real = playFile; playFile = (n, v) => { const ok = real(n, v); if (ok) { played++; } return ok; };
    let beeps = 0; const rb = rushBeep; rushBeep = (n) => { const ok = rb(n); if (ok) { beeps++; } return ok; };
    sfx('victory'); sfx('zap'); sfx('kill'); sfx('hurt'); playFile = real; rushBeep = rb;
    G.scene = 'title'; G.overlay = null;
    return { ctx: SND.ctx && SND.ctx.state, packed, decoded, victoryFromFile: played >= 1, rushBeeps: beeps };
  });
  check('victory file + DO-T RUSH beeps play (' + audio.decoded.join(', ') + ')', audio.decoded.length === audio.packed.length && audio.victoryFromFile && audio.rushBeeps === 3, audio);

  // live music: every game moment picks the right section, the band plays notes, and mood layers fade in
  const music = await page.evaluate(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms)), seen = {}, keep = SETTINGS.timer.turns;
    const at = async (label, setup) => {   // wait for the band to actually change section (it switches on the next beat), then count its notes
      setup(); for (let k = 0; k < 25 && SND.band.sec !== musicSection(); k++) { musicTick(); await wait(100); }
      const bar = 240000 / MUSIC.sections[musicSection()].bpm; for (let k = 0; k * 100 < bar + 200; k++) { musicTick(); await wait(100); } seen[label] = { sec: SND.band.sec, notes: SND.band.notes - SND.band.secStart };
    };
    await at('intro', () => { G.scene = 'title'; G.overlay = null; });
    await at('comic', () => { G.scene = 'title'; G.overlay = 'help'; });
    await at('chapter', () => { startDebug('practice'); G.debugId = 'm'; enterRoom(WORLD.start, entryFor(WORLD.start)); G.room.enemies = []; });
    await at('explore', () => { startDebug('practice'); G.room.enemies = []; G.musicDanger = 0; });
    await at('stealth', () => { startDebug('boss'); });
    await at('enemy', () => { startDebug('zoo'); const e = G.room.enemies[0]; e.i = nbrs(P.i).find((j) => !enemyAt(j)) || e.i; });
    await at('repair', () => { startDebug('math'); });
    await at('dock', () => { startDebug('lowTime'); G.room.enemies = []; G.musicDanger = 0; G.overlay = null; });
    await at('boss', () => { startDebug('crack'); bossBody().sleep = false; G.musicDanger = 0; });
    await at('drop', () => { startDebug('boss2'); bossBody().sleep = false; });
    await at('ending', () => { startDebug('winScreen'); });
    await at('outro', () => { startDebug('loseScreen'); });
    // mood layers: hurt + carrying + an enemy 3 hexes away in a normal sector
    startDebug('practice'); G.musicDanger = 0; placeFoes('W', 1); const e = G.room.enemies[0];
    const far = G.room.tiles.map((_, j) => j).find((j) => hexDist(j, P.i) === 3 && isWalk(G.room.tiles[j]) && !enemyAt(j)); if (far !== undefined) { e.i = far; }
    G.room.enemies = [e]; P.hp = 1; P.carry = 1; musicTick(); const sec = musicSection(), mood = Object.assign({}, SND.band.mood), lv = Object.assign({}, SND.band.lv);
    SETTINGS.timer.turns = keep; G.scene = 'title'; G.overlay = null; musicTick();
    // offline render works
    const r = await renderMusic('explore', 6, { tension: 1 });
    return { seen, moodSec: sec, mood, lv, render: { peak: Math.round(r.peak * 100) / 100, notes: r.notes, bytes: r.b64.length } };
  });
  const secOk = Object.entries(music.seen).every(([k, v]) => v.sec === k && v.notes > 0);
  check('live music: all 12 sections reached and playing', secOk, music.seen);
  check('mood layers ease in (tension, heartbeat, hope bells)', music.mood.tension > 0 && music.lv.heart === 1 && music.lv.hope > 0.4 && music.lv.tension > 0, { sec: music.moodSec, mood: music.mood });
  check('music renders offline (previews)', music.render.notes > 50 && music.render.peak > 0.05, music.render);

  if (process.argv.includes('--music')) {   // write a listenable preview of every section (+ mood demos) to music-preview/
    const out = path.join(ROOT, 'music-preview'); fs.mkdirSync(out, { recursive: true });
    const list = [['01_intro', 'intro', 40], ['02_comic', 'comic', 32], ['03_chapter', 'chapter', 32], ['04_exploring', 'explore', 45], ['05_stealth', 'stealth', 36],
      ['06_enemy_nearby', 'enemy', 24], ['07_repair_puzzle', 'repair', 30], ['08_dock_mash', 'dock', 24], ['08b_dock_mash_last_seconds', 'dock', 20, {}, 1], ['09_boss_fight', 'boss', 30], ['10_drop', 'drop', 24],
      ['11_ending', 'ending', 36], ['12_outro', 'outro', 16], ['13_layers_explore_enemy_creeping_close', 'explore', 30, { tension: 1 }],
      ['14_layers_explore_last_heart_carrying_babies', 'explore', 30, { heart: 1, hope: 1 }], ['15_layers_explore_cleared_clock_ticking', 'explore', 30, { calm: 1, clock: 1 }]];
    for (const [name, sec, secs, moods, speed] of list) {
      const r = await page.evaluate(([a, b, c, d]) => renderMusic(a, b, c, d), [sec, secs, moods || {}, speed || 0]);
      const pcm = Buffer.from(r.b64, 'base64'), hdr = Buffer.alloc(44);
      hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write('WAVE', 8); hdr.write('fmt ', 12); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(2, 22);
      hdr.writeUInt32LE(r.sr, 24); hdr.writeUInt32LE(r.sr * 4, 28); hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34); hdr.write('data', 36); hdr.writeUInt32LE(pcm.length, 40);
      fs.writeFileSync(path.join(out, name + '.wav'), Buffer.concat([hdr, pcm])); console.log('  wrote music-preview/' + name + '.wav');
    }
  }

  for (const o of ['map', 'pause', 'help', 'launch', 'win', 'lose']) { await page.evaluate((ov) => { G.scene = 'play'; G.overlay = ov; }, o); await page.waitForTimeout(80); await shot('03_' + o); }
  check('no page errors while drawing', errors.length === 0, errors.slice(0, 3));

  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log('\n' + (results.length - failed) + ' / ' + results.length + ' passed');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
