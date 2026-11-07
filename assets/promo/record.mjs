import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'fs';
import { createServer } from 'http';
import { spawnSync } from 'child_process';
import { dirname, join, extname, normalize } from 'path';
import { fileURLToPath } from 'url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.json': 'application/json' };
const server = createServer((req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
  const file = join(ROOT, path);
  if (!file.startsWith(ROOT) || !existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;
process.chdir(HERE);
const COPY = {
  title: { h: "See who's awake.", p: 'A calm world clock for your new tab.' },
  daylight: { k: 'DAYLIGHT', h: 'Real daylight in every city.', p: "Day and night follow each city's sunrise and sunset." },
  scrub: { k: 'SCRUB', h: 'Drag to any time.', p: 'Every clock follows, so finding a meeting time takes one drag.' },
  dst: { k: 'DAYLIGHT SAVING', h: 'Know before the clocks move.', p: 'Each zone shows a notice the week before its clocks change.' },
  themes: { k: 'THEMES', h: 'Light, dark, and your color.', p: 'Follow your system or pick a theme, then choose an accent.' },
  editing: { k: 'EDITING', h: 'Add a city in seconds.', p: 'Cards slide into place as you add, remove, or reorder.' },
  end: { h: 'Free for Chrome.', url: 'solstice.seanoliver.dev', p: 'No account. No tracking.' },
};
rmSync('frames', { recursive: true, force: true }); mkdirSync('frames'); mkdirSync('out', { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, timezoneId: 'America/Los_Angeles', colorScheme: 'dark' });
await ctx.route(/ipwho|ipapi|geojs|bigdatacloud/, q => q.abort());
await ctx.addInitScript(() => { try { if (location.pathname.endsWith('newtab.html') && !sessionStorage.getItem('seeded')) { localStorage.clear(); localStorage.setItem('homeCity', 'San Francisco'); sessionStorage.setItem('seeded', '1'); } } catch {} });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(String(e)));
await page.clock.install({ time: new Date('2026-10-21T10:00:00-07:00') });
await page.goto(`${BASE}/assets/promo/stage.html`); await page.waitForTimeout(1500);
const app = page.frameLocator('#app');
const frames = [];
const cdp = await ctx.newCDPSession(page);
cdp.on('Page.screencastFrame', async (f) => {
  cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  const n = frames.length; frames.push(f.metadata.timestamp);
  writeFileSync(`frames/${String(n).padStart(5, '0')}.jpg`, Buffer.from(f.data, 'base64'));
});
const S = (fn, arg) => page.evaluate(([fn, arg]) => window.stage[fn](arg), [fn, arg]);
const wait = (ms) => page.waitForTimeout(ms);
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, everyNthFrame: 1 });
await wait(300);
await S('title', COPY.title); await wait(3000);
await S('hideTitle'); await S('beat', COPY.daylight); await wait(700);
await page.evaluate(() => stage.zoom(0.85, -70, -40, -9)); await wait(3800);
await S('beat', COPY.scrub); await page.evaluate(() => stage.zoom(0.7222, 0, 0, 0)); await wait(1300);
const strip = app.locator('.tlrow .strip').first();
const bx = await strip.boundingBox();
await page.mouse.move(bx.x + bx.width * (10 / 24), bx.y + bx.height / 2); await page.mouse.down();
await page.mouse.move(bx.x + bx.width * (16.5 / 24), bx.y + bx.height / 2, { steps: 45 }); await page.mouse.up();
await wait(1800);
await app.locator('.scrub-pill').click(); await wait(700);
await S('beat', COPY.dst); const at = await page.evaluate(() => stage.focusCity('London', 1.35)); await wait(1200);
await page.evaluate(({ x, y }) => stage.chipAt('−1h in 4d', x, y), at); await wait(3400);
await page.evaluate(() => stage.chip('', false));
await S('beat', COPY.themes); await page.evaluate(() => stage.zoom(0.7222, 0, 0, 0)); await wait(1200);
await app.locator('.edit-toggle').click(); await wait(900);
await app.locator('.ep-theme [data-theme="light"]').click(); await page.evaluate(() => stage.light(true)); await wait(1300);
await app.locator('.swatch[data-accent="violet"]').click(); await wait(900);
await app.locator('.swatch[data-accent="rose"]').click(); await wait(900);
await app.locator('.swatch[data-accent="teal"]').click(); await wait(700);
await app.locator('.ep-theme [data-theme="system"]').click(); await page.evaluate(() => stage.light(false)); await wait(1200);
await S('beat', COPY.editing); await wait(900);
await app.locator('.ep-search input').pressSequentially('Syd', { delay: 90 }); await wait(900);
await app.locator('.ep-search input').press('Enter'); await wait(1300);
await app.locator('.ep-search input').pressSequentially('Ber', { delay: 90 }); await wait(900);
await app.locator('.ep-search input').press('Enter'); await wait(1300);
await app.locator('.ep-list .zone-row', { hasText: 'London' }).locator('.zone-x').click(); await wait(1400);
await app.locator('.ep-done').click(); await wait(1500);
await S('end', COPY.end); await wait(1200);
// Screencast only sends changed frames; nudge a pixel so the settled end card is captured.
for (let i = 0; i < 4; i++) { await page.evaluate((i) => { document.body.style.outline = `1px solid rgba(10,13,18,${i % 2 ? 0.99 : 1})`; }, i); await wait(250); }
await wait(2000);
const stopAt = Date.now() / 1000; await cdp.send('Page.stopScreencast'); await wait(300);
const cities = await app.locator('.card .city').allTextContents();
await b.close();
server.close();
// Without `option framerate 1000`, ffmpeg snaps each JPEG's timestamp to a 25 fps grid and drops most frames.
const entry = (i) => `file 'frames/${String(i).padStart(5, '0')}.jpg'\noption framerate 1000\n`;
let list = 'ffconcat version 1.0\n';
for (let i = 0; i < frames.length; i++) {
  const d = i + 1 < frames.length ? Math.max(0.001, frames[i + 1] - frames[i]) : Math.min(3.5, Math.max(0.04, stopAt - frames[i]));
  list += `${entry(i)}duration ${d.toFixed(4)}\n`;
}
// ffmpeg's concat demuxer ignores the last entry's duration; repeating the final frame keeps the end card's hold.
const last = entry(frames.length - 1);
list += `${last}duration 0.0167\n${last}`;
writeFileSync('frames.txt', list);
const gaps = frames.slice(1).map((t, i) => t - frames[i]).sort((x, y) => x - y);
console.log('fps', (frames.length / (frames.at(-1) - frames[0])).toFixed(1), 'median gap ms', (gaps[gaps.length >> 1] * 1000).toFixed(1), 'p95 gap ms', (gaps[Math.floor(gaps.length * .95)] * 1000).toFixed(1));
console.log(JSON.stringify({ frames: frames.length, seconds: (frames.at(-1) - frames[0]).toFixed(1), cities, errs }));
const ff = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'frames.txt',
  '-vf', 'fps=60,noise=c0s=5:c0f=u,format=yuv420p', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow',
  '-tune', 'film', '-movflags', '+faststart', 'out/solstice-promo.mp4'], { stdio: 'inherit' });
if (ff.status !== 0) process.exit(ff.status ?? 1);
rmSync('frames', { recursive: true, force: true }); rmSync('frames.txt', { force: true });
console.log('wrote', join(HERE, 'out', 'solstice-promo.mp4'));
