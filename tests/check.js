// Dependency-free sanity check for Roadbook. Run: node tests/check.js
// Exits non-zero if the library is malformed, so it can gate a commit.
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/../regimens.js', 'utf8');
const ctx = {}; new Function('with(this){' + src + '; this.LIBRARY = LIBRARY; this.CHANGELOG = CHANGELOG; this.APP_VERSION = APP_VERSION; this.MODS = MODS; this.COMPARE_EXAMPLE = typeof COMPARE_EXAMPLE !== "undefined" ? COMPARE_EXAMPLE : null; }').call(ctx);
const { LIBRARY, CHANGELOG, APP_VERSION, MODS } = ctx;
const errors = [], warnings = [];
const ids = new Set();
const CATS = ['breast','gi','lung','gu','gyn','hn','skin','other'];
for (const r of LIBRARY){
  const tag = `[${r.id || '?'}]`;
  for (const k of ['id','disease','group','name','plan','title','subtitle','trial','summary','nodes','refs','added','reviewed','reviewedBy']) if (r[k] === undefined || r[k] === '') errors.push(`${tag} missing ${k}`);
  if (ids.has(r.id)) errors.push(`${tag} duplicate id`); ids.add(r.id);
  if (!CATS.includes(r.disease)) errors.push(`${tag} unknown disease category ${r.disease}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.added || '') || !/^\d{4}-\d{2}-\d{2}$/.test(r.reviewed || '')) errors.push(`${tag} dates must be YYYY-MM-DD`);
  if (!Array.isArray(r.refs) || !r.refs.length) warnings.push(`${tag} has no references`);
  let decisions = 0;
  (function walk(ns, depth){
    if (!Array.isArray(ns) || !ns.length) errors.push(`${tag} empty node list`);
    for (const n of ns || []){
      if (!['phase','rest','event','decision'].includes(n.t)) errors.push(`${tag} bad node type ${n.t}`);
      if (n.t === 'phase'){
        if (!n.name || !n.plain) errors.push(`${tag} phase "${n.name || '?'}" needs name and plain text`);
        for (const m of n.mods || []) if (!MODS[m]) errors.push(`${tag} unknown modality ${m}`);
        if ((n.mods || []).includes('watch') && n.mods.length > 1) errors.push(`${tag} surveillance must be the only type on "${n.name}"`);
        if (n.mode === 'cycles' && !(+n.cycles > 0 && +n.cycleDays > 0)) errors.push(`${tag} "${n.name}" cycles/cycleDays must be positive`);
        if (n.mode !== 'cycles' && n.mode !== 'weekdays' && !(+n.weeks > 0)) errors.push(`${tag} "${n.name}" needs weeks`);
        if (n.plain && n.plain.length > 420) warnings.push(`${tag} "${n.name}" plain text is long (${n.plain.length} chars)`);
      }
      if (n.t === 'decision'){
        decisions++;
        if (depth > 0) errors.push(`${tag} decisions must be top-level`);
        if (!n.branches || n.branches.length < 2) errors.push(`${tag} decision "${n.name}" needs 2+ branches`);
        for (const b of n.branches || []){ if (!b.cond) errors.push(`${tag} branch without a condition`); walk(b.nodes, depth + 1); }
      }
    }
  })(r.nodes, 0);
}
// the worked comparison shown by the example link must point at real pathways
if (ctx.COMPARE_EXAMPLE){
  const c = ctx.COMPARE_EXAMPLE;
  for (const k of ['title','diagnosis','options']) if (!c[k]) errors.push(`COMPARE_EXAMPLE missing ${k}`);
  for (const o of c.options || []){
    if (!o.name) errors.push('COMPARE_EXAMPLE option without a name');
    if (o.regimenId && !ids.has(o.regimenId)) errors.push(`COMPARE_EXAMPLE points at unknown pathway ${o.regimenId}`);
  }
  if ((c.options || []).length < 2) errors.push('COMPARE_EXAMPLE needs at least 2 options');
}
if (!/^\d+\.\d+(\.\d+)?$/.test(APP_VERSION)) errors.push('APP_VERSION must look like 0.5.1');
// every page must load the library with a cache-busting stamp matching APP_VERSION,
// so a release always bypasses the CDN/browser cache of the old data
{
  const fs = require('fs'), path = require('path');
  const root = path.join(__dirname, '..');
  for (const f of fs.readdirSync(root).filter(x => x.endsWith('.html'))){
    const html = fs.readFileSync(path.join(root, f), 'utf8');
    const m = html.match(/src="regimens\.js(\?v=([^"]*))?"/);
    if (m && m[2] !== APP_VERSION) errors.push(`${f} loads regimens.js?v=${m[2] || '(none)'} but APP_VERSION is ${APP_VERSION} — update the stamp`);
  }
}
for (const c of CHANGELOG){ if (!c.date || !c.text) errors.push('CHANGELOG entry missing date or text'); }
if (CHANGELOG[0] && LIBRARY.some(r => r.added === CHANGELOG[0].date) === false) warnings.push('Newest changelog date matches no regimen "added" date — fine if the change was not a new regimen');
// privacy guardrail: the site promises that nothing leaves the browser, so no page,
// script, or stylesheet may load or call an external resource. Plain <a href> links are fine.
{
  const fs = require('fs'), path = require('path');
  const root = path.join(__dirname, '..');
  const ALLOW = ['allentheli.github.io', 'www.w3.org'];
  const PATTERNS = [
    [/<(?:script|img|iframe|video|audio|source)\b[^>]*\ssrc\s*=\s*["']?(https?:\/\/[^"'\s>]+)/gi, 'src attribute'],
    [/<link\b[^>]*\shref\s*=\s*["']?(https?:\/\/[^"'\s>]+)/gi, '<link> href'],
    [/url\(\s*["']?(https?:\/\/[^"')\s]+)/gi, 'CSS url()'],
    [/\bfetch\(\s*["'`](https?:\/\/[^"'`]+)/gi, 'fetch()'],
    [/\.open\(\s*["'][A-Z]+["']\s*,\s*["'`](https?:\/\/[^"'`]+)/gi, 'XMLHttpRequest'],
    [/\bimport\b[^;\n]*?\bfrom\s*["'](https?:\/\/[^"']+)/gi, 'ES import'],
    [/\bimport\(\s*["'`](https?:\/\/[^"'`]+)/gi, 'dynamic import'],
  ];
  const files = [];
  (function walk(dir){
    for (const name of fs.readdirSync(dir)){
      if (name === 'node_modules' || name.startsWith('.')) continue;
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (/\.(html|js|css)$/.test(name)) files.push(p);
    }
  })(root);
  for (const f of files){
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const [re, what] of PATTERNS){
        re.lastIndex = 0; let m;
        while ((m = re.exec(line))){
          let host = ''; try { host = new URL(m[1]).hostname; } catch (e) {}
          if (!ALLOW.includes(host)) errors.push(`${path.relative(root, f)}:${i + 1} external ${what} ${m[1]} (nothing may leave the browser)`);
        }
      }
    });
  }
}
// brand and rename checks
{
  const fs = require('fs'), path = require('path');
  const root = path.join(__dirname, '..');
  const OG_IMAGE = 'https://allentheli.github.io/Roadbook/assets/brand/og.png'; // the one absolute URL on the site; live once the repository is renamed
  const ENTRY = ['index.html', 'app.html', 'about.html', 'how-it-works.html', 'updates.html', 'references.html', 'disclaimer.html'];
  // (a) the old name survives only in README.md and the redirect stub
  for (const f of fs.readdirSync(root).filter(n => n.endsWith('.html'))){
    fs.readFileSync(path.join(root, f), 'utf8').split('\n').forEach((line, i) => {
      if (/ONCourse/.test(line)) errors.push(`${f}:${i + 1} old name in user-visible copy`);
    });
  }
  if (!/\(formerly ONCourse\)/.test(fs.readFileSync(path.join(root, 'README.md'), 'utf8'))) errors.push('README.md should say "(formerly ONCourse)" once');
  // (b) head block on every entry point
  for (const f of ENTRY){
    const h = fs.readFileSync(path.join(root, f), 'utf8');
    const title = (h.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
    if (!/^Roadbook( Oncology: .+)?$/.test(title)) errors.push(`${f}: <title> should be "Roadbook" or "Roadbook Oncology: ..." (got "${title}")`);
    if (!h.includes(`<meta property="og:image" content="${OG_IMAGE}">`)) errors.push(`${f}: og:image must be ${OG_IMAGE}`);
    for (const need of ['<link rel="icon" href="assets/brand/favicon.svg" type="image/svg+xml">', '<link rel="icon" href="assets/brand/favicon.ico" sizes="32x32">', '<link rel="apple-touch-icon" href="assets/brand/apple-touch-icon.png">', '<meta property="og:site_name" content="Roadbook Oncology">'])
      if (!h.includes(need)) errors.push(`${f}: missing ${need}`);
  }
  // (c) rasterised brand files exist
  for (const f of ['og.png', 'favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'roadbook-mark.svg', 'roadbook-wordmark-color-outlined.svg', 'roadbook-wordmark-mono-outlined.svg'])
    if (!fs.existsSync(path.join(root, 'assets', 'brand', f))) errors.push(`assets/brand/${f} is missing (run tools/outline-brand.js then tools/rasterize-brand.js)`);
}
console.log(`Roadbook library check: ${LIBRARY.length} pathways, version ${APP_VERSION}, ${CHANGELOG.length} changelog entries`);
warnings.forEach(w => console.log('  warning:', w));
errors.forEach(e => console.log('  ERROR:', e));
if (errors.length){ console.log(`\n${errors.length} error(s). Do not commit.`); process.exit(1); }
console.log('OK');
