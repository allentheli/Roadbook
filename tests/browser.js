// Roadbook browser smoke test. Optional: needs Playwright and a Chromium build.
//   npm i playwright   (once; node_modules is gitignored)
//   node tests/browser.js
// Serves the repo on a local port, drives the builder on desktop and phone,
// and exits non-zero on any failure. No network access beyond localhost.
const { spawn } = require('child_process');
const path = require('path');
const root = path.join(__dirname, '..');

let chromium;
try { chromium = require('playwright').chromium; }
catch (e) { console.log('SKIP: playwright not installed (npm i playwright)'); process.exit(0); }

const PORT = 8123;
const BASE = `http://localhost:${PORT}`;

(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: root, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 800));
  const out = [];
  const ok = (name, cond) => { out.push((cond ? 'PASS' : 'FAIL') + ' | ' + name); };
  let b;
  try {
    b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
    const errs = [];
    const hook = (p) => p.on('pageerror', e => errs.push(String(e).slice(0, 160)));

    // ---- agreement gate: shown once for the builder, never for shared plans ----
    const p = await b.newPage({ viewport: { width: 1280, height: 950 } });
    hook(p);
    await p.goto(`${BASE}/app.html`, { waitUntil: 'load' });
    await p.waitForTimeout(300);
    ok('terms gate shows on the first builder visit', await p.evaluate(() => !document.getElementById('gate').hidden && document.body.classList.contains('gated')));
    await p.click('#gate-agree'); await p.waitForTimeout(150);
    ok('agreeing opens the builder', await p.evaluate(() => document.getElementById('gate').hidden && !document.body.classList.contains('gated')));
    await p.goto('about:blank'); await p.goto(`${BASE}/app.html`, { waitUntil: 'load' }); await p.waitForTimeout(200);
    ok('gate does not return in the same browser', await p.evaluate(() => document.getElementById('gate').hidden));
    await p.goto('about:blank'); await p.goto(`${BASE}/app.html#r=kn522&demo=1`, { waitUntil: 'load' }); await p.waitForTimeout(200);
    ok('examples open without the gate', await p.evaluate(() => document.getElementById('gate').hidden));

    // ---- all pathways render, no label overlaps, no orphan "+" ----
    const ids = await p.evaluate(() => LIBRARY.map(r => r.id));
    let renderFails = 0, labelIssues = 0;
    for (const id of ids){
      await p.goto('about:blank');
      await p.goto(`${BASE}/app.html#r=${id}&demo=1`, { waitUntil: 'load' });
      await p.waitForTimeout(100);
      const r = await p.evaluate(() => {
        const svg = document.querySelector('.route svg');
        if (!svg || svg.getBoundingClientRect().height < 40) return { ok: false };
        const bold = [...svg.querySelectorAll('text')].filter(t => +t.getAttribute('font-weight') >= 600);
        let overlaps = 0;
        for (let i = 0; i < bold.length; i++) for (let j = i + 1; j < bold.length; j++){
          const a = bold[i].getBoundingClientRect(), c = bold[j].getBoundingClientRect();
          if (Math.abs(a.top - c.top) < 4 && a.right - 2 > c.left && c.right - 2 > a.left) overlaps++;
        }
        const plus = [...svg.querySelectorAll('text')].filter(t => t.textContent.trim() === '+').length;
        return { ok: true, overlaps, plus };
      });
      if (!r.ok) renderFails++;
      if (r.overlaps || r.plus) labelIssues++;
    }
    ok(`all ${ids.length} pathways render`, renderFails === 0);
    ok('no map label overlaps or orphan fragments', labelIssues === 0);

    // ---- print footer wordmark keeps the footer's geometry, and every pathway still prints on one page ----
    await p.goto('about:blank'); await p.goto(`${BASE}/app.html#r=kn522`, { waitUntil: 'load' }); await p.waitForTimeout(300);
    const geo = await p.evaluate(() => { const f = document.querySelector('.sh-foot').getBoundingClientRect(); const w = document.querySelector('.wm').getBoundingClientRect(); return { foot: f.height, wm: w.width }; });
    // values measured with the "ONCourse" text wordmark before the rename (1280px viewport, kn522)
    ok('print footer height unchanged by the wordmark (128.5px)', Math.abs(geo.foot - 128.5) < 0.6);
    ok('print footer wordmark width matches the text it replaced (52px)', Math.abs(geo.wm - 52.2) < 1.5);
    const fs = require('fs'), os = require('os');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'roadbook-print-'));
    const pages = (f) => { const m = fs.readFileSync(f).toString('latin1').match(/\/Type\s*\/Page[^s]/g); return m ? m.length : 0; };
    let multi = [];
    // Letter comes from the page's own @page rule; A4 is simulated by overriding that rule, as the print harness always has
    const a4 = (on) => p.evaluate((on) => { let st = document.getElementById('a4sim'); if (!st){ st = document.createElement('style'); st.id = 'a4sim'; document.head.appendChild(st); } st.textContent = on ? '@media print{@page{size:A4 landscape;margin:.15in .35in}}' : ''; }, on);
    for (const id of ids){
      await p.goto('about:blank'); await p.goto(`${BASE}/app.html#r=${id}`, { waitUntil: 'load' }); await p.waitForTimeout(80);
      await p.evaluate(() => applyPrintZoom());
      const f = path.join(tmp, `${id}.pdf`);
      await p.pdf({ path: f, preferCSSPageSize: true, landscape: true }); if (pages(f) !== 1) multi.push(`${id} Letter`);
      await a4(true); await p.pdf({ path: f, preferCSSPageSize: true, landscape: true }); await a4(false); if (pages(f) !== 1) multi.push(`${id} A4`);
      fs.unlinkSync(f);
    }
    fs.rmSync(tmp, { recursive: true, force: true });
    ok('every pathway prints on one page, Letter and A4', multi.length === 0);
    if (multi.length) console.log('multi-page:', multi.join(', '));

    // ---- desktop: picker, rename sync, type-toggle label, share link ----
    await p.goto('about:blank');
    await p.goto(`${BASE}/app.html#r=capox`, { waitUntil: 'load' });
    await p.waitForTimeout(300);
    ok('inline confirm sits under the selected row', await p.evaluate(() =>
      document.querySelector('.reg.on')?.nextElementSibling?.querySelector('#picker-confirm') != null));
    await p.evaluate(() => { [...document.querySelectorAll('#editor .node-h')].find(h => h.textContent.includes('CAPOX')).click(); });
    await p.waitForTimeout(150);
    await p.evaluate(() => {
      const inp = document.querySelector('.node.open input[data-k=name]');
      inp.value = 'Renamed QA step'; inp.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await p.waitForTimeout(350);
    ok('renaming a step updates the map label', await p.evaluate(() =>
      document.querySelector('#sheet .route svg').textContent.includes('Renamed QA')));
    await p.evaluate(() => {
      const btn = [...document.querySelector('.node.open').querySelectorAll('button.mod')]
        .find(x => x.textContent.includes('Immunotherapy') && !x.classList.contains('on'));
      if (btn) btn.click();
    });
    await p.waitForTimeout(350);
    ok('adding a type extends the map label', await p.evaluate(() =>
      document.querySelector('#sheet .route svg').textContent.includes('immunotherapy')));
    const link = await p.evaluate(() => document.getElementById('linkout').value);
    ok('share link generated', /#p=/.test(link));
    // the image exports live next to the print fit in app.html; make sure a
    // click still reaches them and produces a file
    for (const [sel, name] of [['#savemap', 'map image export downloads'], ['#saveimg', 'sheet image export downloads']]){
      let file = '';
      try { const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }), p.click(sel)]); file = dl.suggestedFilename(); } catch (e) {}
      ok(name, /\.png$/.test(file));
    }
    // a plan that cannot fit one page legibly prints on two at full size, and
    // the preview bar says so before printing; trimming the note brings it back
    {
      const p3 = await b.newPage(); hook(p3);
      await p3.goto(`${BASE}/app.html#r=kn522`, { waitUntil: 'load' }); await p3.waitForTimeout(300);
      const note = 'Please call the nurse line if you have a fever of 100.4 or higher, uncontrolled nausea or vomiting, or new shortness of breath. Bring this sheet to every visit. ';
      await p3.evaluate((t) => { state.opts.notes = t; renderAll(); }, note.repeat(2));
      await p3.waitForTimeout(700);
      const two = await p3.evaluate(() => { const f = printFit(985, 752, false, 765); return { multi: f.multiPage, pages: f.pages, k: f.k, notice: !document.getElementById('tb-fitnote').hidden }; });
      const f2 = path.join(os.tmpdir(), 'roadbook-twopage.pdf');
      await p3.evaluate(() => applyPrintZoom()); await p3.pdf({ path: f2, preferCSSPageSize: true, landscape: true });
      const n2 = pages(f2);
      ok('a plan past the readability floors prints on two pages at full size', two.multi === true && two.pages === 2 && two.k === 1 && n2 === 2);
      ok('the preview bar says when a plan needs two pages', two.notice);
      await p3.evaluate(() => { state.opts.notes = ''; renderAll(); }); await p3.waitForTimeout(700);
      const one = await p3.evaluate(() => ({ multi: printFit(985, 752, false, 765).multiPage, notice: !document.getElementById('tb-fitnote').hidden }));
      await p3.evaluate(() => applyPrintZoom()); await p3.pdf({ path: f2, preferCSSPageSize: true, landscape: true });
      ok('trimming the note brings the plan back to one page and clears the warning', one.multi === false && !one.notice && pages(f2) === 1);
      fs.unlinkSync(f2); await p3.close();
    }
    if (/#p=/.test(link)){
      const p2 = await b.newPage(); hook(p2);
      await p2.goto(link.replace(/^https?:\/\/[^\/]+/, BASE), { waitUntil: 'load' });
      await p2.waitForTimeout(350);
      ok('share link opens the plan in patient view', await p2.evaluate(() =>
        document.body.classList.contains('patient') && document.body.innerText.includes('Renamed QA step')));
      ok('shared plan is never gated', await p2.evaluate(() => document.getElementById('gate').hidden));
      await p2.close();
    }

    // ---- phone: pick flow, docked sticky map, expander ----
    const m = await b.newPage({ viewport: { width: 390, height: 844 } });
    hook(m);
    await m.goto(`${BASE}/app.html`, { waitUntil: 'load' });
    await m.waitForTimeout(200); await m.click('#gate-agree');
    await m.waitForTimeout(400);
    ok('phone opens in pick mode (editor hidden)', await m.evaluate(() =>
      document.body.classList.contains('mpick') && getComputedStyle(document.querySelector('.main')).display === 'none'));
    ok('preview card nests under the selected row', await m.evaluate(() => {
      const peek = document.getElementById('mpeek');
      return !peek.hidden && peek.previousElementSibling?.classList.contains('on');
    }));
    await m.click('#mpeek [data-mconfirm]');
    await m.waitForTimeout(350);
    ok('confirm docks the collapsed handout', await m.evaluate(() =>
      document.body.classList.contains('msheet') && getComputedStyle(document.querySelector('#sheet .steps')).display === 'none'));
    await m.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await m.waitForTimeout(250);
    ok('docked map stays pinned while scrolling', await m.evaluate(() => {
      const r = document.querySelector('#sheet .route svg').getBoundingClientRect();
      return r.top >= 0 && r.bottom <= innerHeight;
    }));
    await m.click('#mexpand'); await m.waitForTimeout(250);
    ok('expander shows the full handout', await m.evaluate(() =>
      getComputedStyle(document.querySelector('#sheet .steps')).display !== 'none'));
    await m.close();

    ok('no page errors anywhere', errs.length === 0);
    if (errs.length) console.log('page errors:', errs.slice(0, 5));
  } finally {
    if (b) await b.close();
    srv.kill();
  }
  console.log(out.join('\n'));
  const fails = out.filter(l => l.startsWith('FAIL')).length;
  console.log(fails ? `\n${fails} failure(s).` : '\nOK');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e.message); process.exit(1); });
