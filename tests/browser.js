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
    // measured under print emulation, which is what the footer is for; the on-screen
    // page view scales the same layout, so screen numbers depend on the window
    await p.evaluate(() => applyPrintZoom()); await p.emulateMedia({ media: 'print' }); await p.waitForTimeout(100);
    const geo = await p.evaluate(() => { const f = document.querySelector('.sh-foot').getBoundingClientRect(); const w = document.querySelector('.wm').getBoundingClientRect(); return { foot: f.height, wm: w.width }; });
    await p.emulateMedia({ media: null });
    // values measured on main before the page view (kn522, Letter landscape fit)
    ok('print footer height unchanged by the wordmark (120.1px)', Math.abs(geo.foot - 120.09) < 0.6);
    ok('print footer wordmark width matches the text it replaced (35px)', Math.abs(geo.wm - 35) < 1.5);
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
      // the same two-page plan on a phone: one short line; and on a landing-page example: no note at all
      const ph3 = await b.newPage({ viewport: { width: 390, height: 844 } }); hook(ph3);
      await ph3.goto(`${BASE}/app.html#r=kn522`, { waitUntil: 'load' }); await ph3.waitForTimeout(300);
      await ph3.evaluate((t) => { state.opts.notes = t; renderAll(); }, note.repeat(2)); await ph3.waitForTimeout(700);
      const phn = await ph3.evaluate(() => { const n = document.getElementById('tb-fitnote'); return { hidden: n.hidden, text: n.textContent }; });
      ok('phone: the page-count note is one short line', !phn.hidden && /^Prints on \d+ pages\.$/.test(phn.text));
      await ph3.goto('about:blank'); await ph3.goto(`${BASE}/app.html#r=kn522&demo=1`, { waitUntil: 'load' }); await ph3.waitForTimeout(300);
      await ph3.evaluate((t) => { state.opts.notes = t; renderAll(); }, note.repeat(2)); await ph3.waitForTimeout(700);
      const dm = await ph3.evaluate(() => ({ demo: document.body.classList.contains('demo'), shown: getComputedStyle(document.getElementById('tb-fitnote')).display !== 'none' }));
      ok('a landing-page example never shows the page-count note', dm.demo && !dm.shown);
      await ph3.close();
    }
    if (/#p=/.test(link)){
      const p2 = await b.newPage(); hook(p2);
      await p2.goto(link.replace(/^https?:\/\/[^\/]+/, BASE), { waitUntil: 'load' });
      await p2.waitForTimeout(350);
      ok('share link opens the plan in patient view', await p2.evaluate(() =>
        document.body.classList.contains('patient') && document.body.innerText.includes('Renamed QA step')));
      ok('shared plan is never gated', await p2.evaluate(() => document.getElementById('gate').hidden));
      ok('shared plan is a dead end: no visible link leads anywhere', await p2.evaluate(() =>
        [...document.querySelectorAll('a[href]')].every(a => { const r = a.getBoundingClientRect(); return r.width === 0 || r.height === 0 || getComputedStyle(a).visibility === 'hidden'; })));
      ok('shared plan hides the builder\'s page-count note', await p2.evaluate(() => getComputedStyle(document.getElementById('tb-fitnote')).display === 'none'));
      await p2.close();
      // the same link on a phone: the map at readable size in a strip that scrolls sideways
      const ph = await b.newPage({ viewport: { width: 390, height: 844 } }); hook(ph);
      await ph.goto(link.replace(/^https?:\/\/[^\/]+/, BASE), { waitUntil: 'load' });
      await ph.waitForTimeout(350);
      const strip = await ph.evaluate(() => {
        const route = document.querySelector('#sheet>.route'), svg = route.querySelector('svg');
        const labels = [...svg.querySelectorAll('text')].map(t => t.getBoundingClientRect().height).filter(h => h > 0);
        return { pageW: document.documentElement.scrollWidth, svgW: svg.getBoundingClientRect().width, scrolls: route.scrollWidth > route.clientWidth + 100, minLabel: Math.min(...labels), hint: getComputedStyle(route, '::after').content };
      });
      ok('phone: shared plan\'s map is a sideways strip with readable labels', strip.pageW === 390 && strip.svgW >= 800 && strip.scrolls && strip.minLabel >= 10 && /Swipe/.test(strip.hint));
      await ph.close();
    }

    // ---- map: an alongside step spanning its anchor joins the anchor's bar ----
    {
      const f = await b.newPage({ viewport: { width: 1280, height: 950 } }); hook(f);
      await f.goto(`${BASE}/app.html#r=flot&demo=1`, { waitUntil: 'load' }); await f.waitForTimeout(400);
      const r = await f.evaluate(() => {
        const svg = document.querySelector('#sheet .route svg');
        const labels = [...svg.querySelectorAll('text')].map(t => t.textContent);
        const bars = [...svg.querySelectorAll('rect')].filter(x => +x.getAttribute('height') === 8).length; // thin lane bars
        const grads = svg.querySelectorAll('linearGradient[id^="g-"]').length;
        const steps = [...document.querySelectorAll('#sheet .also')].map(e => e.textContent).filter(t => /Durvalumab/.test(t)).length;
        // the same drug keeps one shade: the immunotherapy colour inside the combined bar equals the "Durvalumab alone" bar
        const stops = [...svg.querySelectorAll('linearGradient[id^="g-"] stop')].map(x => x.getAttribute('stop-color'));
        const main = [...svg.querySelectorAll('rect')].filter(x => +x.getAttribute('height') === 20 || +x.getAttribute('height') > 12).map(x => x.getAttribute('fill')).filter(f => f && f.startsWith('#'));
        return { two: labels.filter(l => l === 'FLOT + durvalumab').length, lone: labels.filter(l => /^Durvalumab ~/.test(l)).length, bars, grads, steps, sameShade: main.some(c => stops.includes(c)) };
      });
      ok('FLOT + durvalumab draws as one two-colour bar per block, durvalumab still listed under the map', r.two === 2 && r.lone === 0 && r.bars === 0 && r.grads >= 1 && r.steps === 2);
      ok('durvalumab keeps one shade inside the combined bar and on its own', r.sameShade);
      await f.close();
    }

    // ---- public pages: skip link, main landmark, 404 page ----
    {
      const q = await b.newPage({ viewport: { width: 1280, height: 950 } }); hook(q);
      let allOk = true;
      for (const f of ['index.html', 'about.html', 'updates.html', 'references.html', 'disclaimer.html', 'how-it-works.html', '404.html']){
        await q.goto(`${BASE}/${f}`, { waitUntil: 'load' });
        const r = await q.evaluate(() => {
          const skip = document.querySelector('a.skip[href="#content"]'), main = document.getElementById('content');
          const hidden = skip && skip.getBoundingClientRect().right <= 0;
          skip && skip.focus();
          const shown = skip && skip.getBoundingClientRect().left >= 0 && skip.getBoundingClientRect().width > 0;
          return !!(skip && main && main.tagName === 'MAIN' && hidden && shown && document.querySelectorAll('main').length === 1);
        });
        if (!r) allOk = false;
      }
      ok('every public page has a skip link that appears on focus and one main landmark', allOk);
      // the landing page serves its images as WebP (Chromium supports it), at the PNG's full size, and the lazy slides too
      await q.goto(`${BASE}/index.html`, { waitUntil: 'load' }); await q.waitForTimeout(300);
      await q.click('#hstab-2'); await q.waitForTimeout(600);
      const wp = await q.evaluate(() => {
        const a = document.querySelector('#hs-0 img'), c = document.querySelector('#hs-2 img'), m = document.querySelector('#forks img, .imgcard img');
        return { hero: a.currentSrc.endsWith('.webp') && a.naturalWidth === 2112, flot: c.currentSrc.endsWith('.webp') && c.naturalWidth === 2112, map: m && m.currentSrc.endsWith('.webp') };
      });
      ok('landing images load as WebP at full size, including a lazy hero slide', wp.hero && wp.flot && wp.map);
      await q.goto(`${BASE}/some/missing/path/404.html`, { waitUntil: 'load' }).catch(() => {});
      await q.goto(`${BASE}/404.html`, { waitUntil: 'load' });
      const nf = await q.evaluate(() => ({ home: [...document.querySelectorAll('a')].some(a => /home page/i.test(a.textContent) && a.href.endsWith('/index.html')), noLib: !document.querySelector('script[src^="regimens.js"]'), styled: getComputedStyle(document.querySelector('header.top')).position === 'sticky' }));
      ok('404 page links home, loads no library, and is styled', nf.home && nf.noLib && nf.styled);
      await q.close();
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
