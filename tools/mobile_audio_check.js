// Mobile audio check: emulated phone (touch), NO autoplay override, real finger taps.
// Passes only if a tap unlocks Web Audio the way a phone browser requires.  node tools/mobile_audio_check.js
const path = require('path'), fs = require('fs'), http = require('http');
const { chromium, devices } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), P5 = path.join(ROOT, 'node_modules', 'p5', 'lib', 'p5.min.js');
const server = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200); fs.createReadStream(f).pipe(r); });
(async () => {
  await new Promise((ok) => server.listen(0, ok));
  const browser = await chromium.launch();   // default autoplay policy: sound needs a real user gesture
  const ctx = await browser.newContext({ ...devices['Pixel 7'] }), page = await ctx.newPage(), errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/p5.min.js', (r) => r.fulfill({ path: P5, contentType: 'application/javascript' }));
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ body: '', contentType: 'text/css' }));
  await page.goto('http://localhost:' + server.address().port + '/dot_hex_page.html'); await page.waitForTimeout(1200);
  const box = await page.locator('canvas').first().boundingBox();
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.3); await page.waitForTimeout(2500);
  const st = await page.evaluate(() => ({ ctx: SND.ctx ? SND.ctx.state : 'none', song: SND.songState || null, playing: !!(SND.song && SND.song.pass), iosFix: !!(SND.keepAwake && !SND.keepAwake.paused), status: sndStatus() }));
  const ok = st.ctx === 'running' && st.iosFix && !errors.length;
  console.log((ok ? 'PASS' : 'FAIL') + ' finger tap unlocks sound on a phone  ' + JSON.stringify(st) + (errors.length ? ' errors: ' + errors[0] : ''));
  await browser.close(); server.close(); process.exit(ok ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
