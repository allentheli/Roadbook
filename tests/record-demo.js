// Re-records the silent builder demo shown on the landing page (demo-builder.webm / .mp4 / -poster.jpg).
// Run it after builder changes that alter what the clip shows. Needs Playwright (npm i playwright) and an
// ffmpeg with libx264 and libvpx-vp9 (set FFMPEG to its path; defaults to `ffmpeg` on PATH).
//   node tests/record-demo.js
// Serves the repo locally, drives the builder at 1280x800 with a drawn cursor (search for NATALEE, include the
// optional TC chemotherapy, set six cycles, print the handout), then encodes:
// WebM (VP9, listed first for Chromium builds without H.264), MP4 (H.264, Safari), JPEG poster.
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
let chromium;
try { chromium = require('playwright').chromium; }
catch (e) { console.log('SKIP: playwright not installed (npm i playwright)'); process.exit(0); }
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const PORT = 8124, BASE = `http://localhost:${PORT}`, W = 1280, H = 800;
const CURSOR = `(() => {
  const css = document.createElement('style');
  css.textContent = '#__cur{position:fixed;left:0;top:0;width:22px;height:30px;pointer-events:none;z-index:2147483647;transform:translate(-3px,-2px);filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))}#__cur.down{transform:translate(-3px,-2px) scale(.9)}#__rip{position:fixed;width:34px;height:34px;border-radius:50%;background:rgba(47,85,212,.28);pointer-events:none;z-index:2147483646;transform:translate(-50%,-50%) scale(0);opacity:0}#__rip.go{transition:transform .35s ease-out,opacity .45s ease-out;transform:translate(-50%,-50%) scale(1);opacity:0}';
  const add = () => {
    document.head.appendChild(css);
    const c = document.createElement('div'); c.id = '__cur';
    c.innerHTML = '<svg viewBox="0 0 22 30" width="22" height="30"><path d="M3 2 L3 23 L8.5 18.5 L12 27 L15.5 25.5 L12 17 L19 17 Z" fill="#fff" stroke="#172033" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    const r = document.createElement('div'); r.id = '__rip';
    document.body.appendChild(c); document.body.appendChild(r);
    document.addEventListener('mousemove', e => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true);
    document.addEventListener('mousedown', e => { c.classList.add('down'); r.classList.remove('go'); r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px'; void r.offsetWidth; r.classList.add('go'); }, true);
    document.addEventListener('mouseup', () => c.classList.remove('down'), true);
  };
  if (document.body) add(); else document.addEventListener('DOMContentLoaded', add);
})();`;

(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: root, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 800));
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'roadbook-demo-'));
  let b;
  try {
    b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
    const ctx = await b.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: tmp, size: { width: W, height: H } } });
    const p = await ctx.newPage();
    await p.addInitScript(CURSOR);
    let cx = 900, cy = 620;
    const sleep = ms => p.waitForTimeout(ms);
    const glide = async (x, y, ms = 800) => {
      const n = Math.max(8, Math.round(ms / 16)); const sx = cx, sy = cy;
      for (let i = 1; i <= n; i++){ const t = i / n, e = t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t; await p.mouse.move(sx + (x - sx) * e, sy + (y - sy) * e); await sleep(12); }
      cx = x; cy = y;
    };
    const box = sel => p.locator(sel).first().boundingBox();
    const click = async () => { await p.mouse.down(); await sleep(90); await p.mouse.up(); };

    const shots = process.env.DEMO_SHOTS; let sn = 0;
    const shot = async () => { if (shots) await p.screenshot({ path: path.join(shots, `k${++sn}.png`) }); };
    await p.addInitScript(() => { window.print = () => setTimeout(() => window.dispatchEvent(new Event('afterprint')), 400); try { localStorage.setItem('roadmap.terms', '2026-09-05'); } catch (e) {} });
    await p.goto(`${BASE}/app.html`, { waitUntil: 'load' });
    await p.mouse.move(cx, cy); await sleep(300);
    // the share box should show the public address, not the local server
    await p.evaluate(() => { const orig = window.updateShare; const fix = () => { const lk = document.getElementById('linkout'); if (lk) lk.value = lk.value.replace(/^https?:\/\/[^\/]+\//, 'https://allentheli.github.io/ONCourse/'); };
      window.updateShare = async function(){ await orig.apply(this, arguments); fix(); }; fix(); });
    await sleep(900);
    // 1. search for the pathway, choose it, confirm it
    let bb = await box('#regsearch'); await glide(bb.x + 120, bb.y + bb.height / 2, 800); await click(); await sleep(300);
    await p.keyboard.type('NATALEE', { delay: 110 }); await sleep(900); await shot();
    bb = await box('.reg[data-reg="natalee"]'); await glide(bb.x + bb.width / 2 - 60, bb.y + bb.height / 2 - 10, 700); await click(); await sleep(1100);
    bb = await box('#picker-confirm'); await glide(bb.x + bb.width / 2 - 30, bb.y + bb.height / 2, 600); await click(); await sleep(900);
    await p.evaluate(() => { const h = document.querySelector('#editor .node-h'); const sb = document.querySelector('.sidebar'); sb.scrollTo({ top: h.getBoundingClientRect().top + sb.scrollTop - 72, behavior: 'smooth' }); });
    await sleep(900); await shot();
    // 2. open the optional TC step and include it: a chemotherapy phase appears on the map
    bb = await p.locator('#editor .node-h', { hasText: 'docetaxel + cyclophosphamide' }).first().boundingBox(); await glide(bb.x + 120, bb.y + bb.height / 2, 800); await click(); await sleep(700);
    await p.evaluate(() => { const el = document.querySelector('.node.open input[data-k="on"]'); const sb = document.querySelector('.sidebar'); sb.scrollTo({ top: el.getBoundingClientRect().top + sb.scrollTop - 560, behavior: 'smooth' }); });
    await sleep(700);
    bb = await box('.node.open input[data-k="on"]'); await glide(bb.x + bb.width / 2, bb.y + bb.height / 2, 700); await click(); await sleep(1500); await shot();
    // 3. six cycles instead of four: the bar lengthens and the Overall line updates
    bb = await box('.node.open input[data-k="cycles"]'); await glide(bb.x + bb.width - 24, bb.y + bb.height / 2, 900); await click(); await sleep(250);
    await p.keyboard.press('Control+A'); await sleep(120); await p.keyboard.type('6', { delay: 90 }); await sleep(1500); await shot();
    // 4. scroll to the print step and print the handout
    await p.evaluate(() => { const el = document.getElementById('print'); const sb = document.querySelector('.sidebar'); sb.scrollTo({ top: el.getBoundingClientRect().top + sb.scrollTop - 260, behavior: 'smooth' }); });
    await sleep(1100);
    bb = await box('#print'); await glide(bb.x + bb.width / 2 - 20, bb.y + bb.height / 2, 900); await click(); await sleep(1300); await shot();
    const vid = p.video(); await ctx.close();
    const raw = await vid.path();
    const run = args => execFileSync(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' });
    // clip length, so the fade-out lands at the end whatever the take's exact timing was
    let dur = 0;
    try { execFileSync(FFMPEG, ['-hide_banner', '-i', raw], { stdio: 'pipe' }); }
    catch (e){ const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(String(e.stderr)); if (m) dur = +m[1] * 3600 + +m[2] * 60 + +m[3]; }
    if (!dur) throw new Error('could not read the recording length from ffmpeg');
    const fade = `fps=24,fade=t=in:st=0:d=0.35,fade=t=out:st=${(dur - 0.5 - 0.45).toFixed(2)}:d=0.45`;
    run(['-ss', '0.5', '-i', raw, '-vf', fade, '-c:v', 'libvpx-vp9', '-crf', '40', '-b:v', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', '-an', path.join(root, 'demo-builder.webm')]);
    run(['-ss', '0.5', '-i', raw, '-vf', fade + ',format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '30', '-tune', 'animation', '-movflags', '+faststart', '-an', path.join(root, 'demo-builder.mp4')]);
    run(['-ss', '0.6', '-i', raw, '-frames:v', '1', '-q:v', '4', path.join(root, 'demo-builder-poster.jpg')]);
    console.log('Wrote demo-builder.webm, demo-builder.mp4, demo-builder-poster.jpg');
  } finally {
    if (b) await b.close();
    srv.kill();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
})().catch(e => { console.error('RECORD ERROR:', e.message); process.exit(1); });
