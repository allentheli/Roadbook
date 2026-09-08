// Brand asset preparation for Roadbook.
//   npm i -D opentype.js wawoff2      (dev dependencies only; node_modules is gitignored)
//   node tools/outline-brand.js
// For every SVG in assets/brand that is not already an *-outlined.svg:
//   1. strips the <metadata> provenance block and the xmlns:c2pa attribute in place, and corrects
//      the x positions of the split wordmark runs to the real font metrics (see fixMetrics);
//   2. writes a sibling *-outlined.svg in which every <text> element is replaced by the
//      glyph outlines from the self-hosted fonts in /fonts, so the file renders identically
//      without the web font (crawlers, mail clients, PDF tools).
// It also writes roadbook-mark.svg and roadbook-mark-mono.svg (the 24 by 24 unit mark taken
// from the lockup) and prints the wordmark's ink bounds for sizing in CSS.
// Stops with a message if a font weight a file needs is missing from /fonts.
const fs = require('fs');
const path = require('path');
let opentype, wawoff2;
try { opentype = require('opentype.js'); wawoff2 = require('wawoff2'); }
catch (e) { console.error('Missing dev dependencies. Run: npm i -D opentype.js wawoff2'); process.exit(1); }

const root = path.join(__dirname, '..');
const BRAND = path.join(root, 'assets', 'brand');
const FONTS = path.join(root, 'fonts');
// font-family (as written in the SVGs) + weight -> woff2 file
const FONT_FILES = {
  "Source Serif 4|500": 'source-serif-4-latin-500-normal.woff2',
  "Source Serif 4|600": 'source-serif-4-latin-600-normal.woff2',
  "Atkinson Hyperlegible|400": 'atkinson-hyperlegible-latin-400-normal.woff2',
  "Atkinson Hyperlegible|700": 'atkinson-hyperlegible-latin-700-normal.woff2',
  "Source Sans 3|400": 'source-sans-3-latin-400-normal.woff2',
  "Source Sans 3|600": 'source-sans-3-latin-600-normal.woff2',
  "Source Sans 3|700": 'source-sans-3-latin-700-normal.woff2',
};
const fontCache = new Map();
async function font(family, weight){
  const key = `${family}|${weight}`;
  if (fontCache.has(key)) return fontCache.get(key);
  const file = FONT_FILES[key];
  if (!file || !fs.existsSync(path.join(FONTS, file))){
    console.error(`Font weight not available in /fonts: ${family} ${weight}. Add the woff2 file and map it in tools/outline-brand.js.`);
    process.exit(1);
  }
  const ttf = await wawoff2.decompress(fs.readFileSync(path.join(FONTS, file)));
  const f = opentype.parse(ttf.buffer.slice(ttf.byteOffset, ttf.byteOffset + ttf.byteLength));
  fontCache.set(key, f);
  return f;
}

const attrs = (tag) => { const o = {}; tag.replace(/([\w:-]+)\s*=\s*"([^"]*)"/g, (m, k, v) => { o[k] = v; }); return o; };
const unq = (s) => String(s || '').replace(/^['"]|['"]$/g, '').split(',')[0].trim().replace(/^['"]|['"]$/g, '');
// Serialise a glyph path ourselves: opentype's toPathData() produced a NaN for one glyph at
// some sizes, and a single NaN stops the browser drawing the rest of the path.
const num = (v) => { const r = Math.round(v * 100) / 100; return Number.isFinite(r) ? String(r) : '0'; };
const pathData = (p) => p.commands.map(c => c.type === 'M' || c.type === 'L' ? `${c.type}${num(c.x)} ${num(c.y)}`
  : c.type === 'Q' ? `Q${num(c.x1)} ${num(c.y1)} ${num(c.x)} ${num(c.y)}`
  : c.type === 'C' ? `C${num(c.x1)} ${num(c.y1)} ${num(c.x2)} ${num(c.y2)} ${num(c.x)} ${num(c.y)}` : 'Z').join('');
const clean = (svg) => svg.replace(/<metadata>[\s\S]*?<\/metadata>/g, '').replace(/\s+xmlns:c2pa="[^"]*"/g, '');

// The delivered files split "Roadbook" into four <text> runs ("Roadb", "o", "o", "k") so the
// route-and-fork device can sit over the first "o", and place the runs (and the "Oncology"
// suffix) at x positions estimated before the real font was available. Measured against
// Source Serif 4 Medium the estimates are about 14 percent too narrow, so the "b" and the
// first "o" overlap. This step recomputes those x positions from the font's advances, moves
// the device by the same amount so it stays centred on the first "o", and widens the canvas
// when the corrected text would otherwise run past its right edge. Shapes are untouched.
async function fixMetrics(svg){
  const serif = await font('Source Serif 4', '500');
  const adv = (t) => serif.getAdvanceWidth(t, 1000);
  const runs = ['Roadb', 'o', 'o', 'k'];
  const oldX = [0, 2642.5, 3149.5, 3656.5];
  const newX = [0, adv('Roadb'), adv('Roadbo'), adv('Roadboo')];
  let changed = false;
  runs.forEach((r, i) => {
    const re = new RegExp(`<text x="${oldX[i]}" y="850.0">${r}</text>`);
    if (re.test(svg)){ svg = svg.replace(re, `<text x="${newX[i]}" y="850.0">${r}</text>`); changed = true; }
  });
  if (!changed) return svg;
  // the device was drawn for an "o" spanning 2642.5..3149.5; centre it on the real first "o"
  const shift = (newX[1] + adv('o') / 2) - (oldX[1] + (oldX[2] - oldX[1]) / 2);
  svg = svg.replace(/<path d="M2855\.7 778\.0 Q2855\.7 635\.0 2943\.1 515\.2 M2855\.7 665\.0 L2809\.7 581\.1"/, (m) =>
    m.replace(/(\d+(?:\.\d+)?) (\d+(?:\.\d+)?)/g, (mm, x, y) => `${num(+x + shift)} ${y}`));
  svg = svg.replace(/<circle cx="2943\.1" cy="515\.2"/, `<circle cx="${num(2943.1 + shift)}" cy="515.2"`);
  // "Oncology" follows the wordmark after one word space
  svg = svg.replace(/<text x="4451\.5" y="850\.0"/, `<text x="${num(adv('Roadbook') + adv(' '))}" y="850.0"`);
  // widen a canvas the corrected text no longer fits in (the og card keeps its fixed 1200 by 630)
  const g = svg.match(/<g transform="translate\((\d+(?:\.\d+)?) (\d+(?:\.\d+)?)\) scale\((\d+(?:\.\d+)?)\)"><g font-family/);
  const wm = svg.match(/<svg[^>]* width="(\d+)" height="(\d+)" viewBox="0 0 (\d+) (\d+)"/);
  if (g && wm && !/id="map-crop-slot"/.test(svg)){
    const text = /Oncology<\/text>/.test(svg) ? 'Roadbook Oncology' : 'Roadbook';
    let need = Math.ceil(+g[1] + +g[3] * adv(text) + 40);
    const desc = svg.match(/<text x="(\d+)" y="\d+" font-family="'Atkinson Hyperlegible'" font-size="(\d+)"[^>]*>([^<]*)<\/text>/);
    if (desc){ const atk = await font('Atkinson Hyperlegible', '400'); need = Math.max(need, Math.ceil(+desc[1] + atk.getAdvanceWidth(desc[3], +desc[2]) + 40)); }
    if (need > +wm[1]) svg = svg.replace(/<svg([^>]*) width="\d+" height="(\d+)" viewBox="0 0 \d+ (\d+)"/, `<svg$1 width="${need}" height="$2" viewBox="0 0 ${need} $3"`);
  }
  return svg;
}
async function outline(svg){
  // Walk the tags in order, keeping a stack of open <g> attributes so text elements
  // inherit font-family, font-weight, font-size and fill from their ancestors.
  const re = /<(\/?)(\w+)([^>]*?)(\/?)>/g;
  const stack = [];
  let out = '', last = 0, m;
  const inherited = (own, k) => own[k] !== undefined ? own[k] : [...stack].reverse().map(a => a[k]).find(v => v !== undefined);
  while ((m = re.exec(svg))){
    const [tag, close, name, rest, selfClose] = m;
    if (name === 'text' && !close){
      const end = svg.indexOf('</text>', re.lastIndex);
      const content = svg.slice(re.lastIndex, end).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      const own = attrs(rest);
      const family = unq(inherited(own, 'font-family')), weight = inherited(own, 'font-weight') || '400';
      const size = parseFloat(inherited(own, 'font-size') || '16'), fill = inherited(own, 'fill') || '#000';
      const f = await font(family, weight);
      const p = f.getPath(content, parseFloat(own.x || 0), parseFloat(own.y || 0), size);
      out += svg.slice(last, m.index) + `<path d="${pathData(p)}" fill="${fill}"/>`;
      re.lastIndex = end + '</text>'.length; last = re.lastIndex;
      continue;
    }
    if (name === 'g'){ if (close) stack.pop(); else if (!selfClose) stack.push(attrs(rest)); }
  }
  out += svg.slice(last);
  // font attributes on wrapper groups no longer do anything; drop them for tidiness
  return out.replace(/<g((?:\s+[\w:-]+="[^"]*")*)>/g, (m, a) => '<g' + a.replace(/\s+font-(?:family|weight|size)="[^"]*"/g, '') + '>').replace(/<g>/g, '<g>');
}

(async () => {
  const files = fs.readdirSync(BRAND).filter(f => f.endsWith('.svg') && !f.endsWith('-outlined.svg') && !/^roadbook-mark(-mono)?\.svg$/.test(f));
  for (const f of files){
    const p = path.join(BRAND, f);
    const src = await fixMetrics(clean(fs.readFileSync(p, 'utf8')));
    fs.writeFileSync(p, src);
    if (/<text\b/.test(src)) fs.writeFileSync(p.replace(/\.svg$/, '-outlined.svg'), await outline(src));
  }
  // standalone mark: the first group of the lockup is the 24 by 24 unit mark
  const lockup = fs.readFileSync(path.join(BRAND, 'roadbook-lockup-color.svg'), 'utf8');
  const g = lockup.match(/<g transform="translate\(40 50\) scale\(7\.5\)">([\s\S]*?)<\/g>/);
  if (!g){ console.error('Could not find the mark group in roadbook-lockup-color.svg'); process.exit(1); }
  const mark = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">${inner}</svg>\n`;
  fs.writeFileSync(path.join(BRAND, 'roadbook-mark.svg'), mark(g[1]));
  fs.writeFileSync(path.join(BRAND, 'roadbook-mark-mono.svg'), mark(g[1].replace(/#2F55D4/gi, '#172033')));
  // sizing reference for CSS: ink bounds of the wordmark text and the serif cap height
  const serif = await font('Source Serif 4', '500');
  const bb = serif.getPath('Roadbook', 0, 850, 1000).getBoundingBox();
  console.log(`Wordmark ink bounds at font-size 1000 (before the 0.2 scale): x ${bb.x1.toFixed(1)}..${bb.x2.toFixed(1)}, y ${bb.y1.toFixed(1)}..${bb.y2.toFixed(1)}`);
  console.log(`Source Serif 4 500: unitsPerEm ${serif.unitsPerEm}, capHeight ${serif.tables.os2.sCapHeight}, xHeight ${serif.tables.os2.sxHeight}, ascender ${serif.ascender}, descender ${serif.descender}`);
  console.log(`Done: ${files.length} files cleaned, outlines written for those with text, mark files written.`);
})().catch(e => { console.error(e); process.exit(1); });
