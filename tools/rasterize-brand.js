// Rasterizes the Roadbook brand files that browsers and crawlers need as bitmaps.
//   npm i -D playwright     (dev dependency only; uses the same Chromium as tests/browser.js)
//   node tools/rasterize-brand.js
// Reads the *-outlined.svg and mark files in assets/brand and writes there:
//   favicon.svg (the mark), favicon.ico (16 and 32, PNG-in-ICO), apple-touch-icon.png (180),
//   icon-512.png, og.png (1200 by 630 from roadbook-og-1200x630-outlined.svg).
const fs = require('fs');
const path = require('path');
let chromium;
try { chromium = require('playwright').chromium; }
catch (e) { console.error('Missing dev dependency. Run: npm i -D playwright'); process.exit(1); }
const BRAND = path.join(__dirname, '..', 'assets', 'brand');
const read = (f) => fs.readFileSync(path.join(BRAND, f), 'utf8');

// ICO container holding PNG images (supported by every current browser and Windows 7+)
function ico(pngs){
  const count = pngs.length, header = Buffer.alloc(6 + 16 * count);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(count, 4);
  let offset = header.length;
  pngs.forEach(({ size, buf }, i) => {
    const o = 6 + 16 * i;
    header.writeUInt8(size === 256 ? 0 : size, o); header.writeUInt8(size === 256 ? 0 : size, o + 1);
    header.writeUInt8(0, o + 2); header.writeUInt8(0, o + 3); header.writeUInt16LE(1, o + 4); header.writeUInt16LE(32, o + 6);
    header.writeUInt32LE(buf.length, o + 8); header.writeUInt32LE(offset, o + 12); offset += buf.length;
  });
  return Buffer.concat([header, ...pngs.map(p => p.buf)]);
}

(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const shot = async (svg, w, h, transparent) => {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await p.setContent(`<!doctype html><style>html,body{margin:0;background:${transparent ? 'transparent' : '#fff'}}svg{display:block;width:${w}px;height:${h}px}</style>${svg}`);
    const buf = await p.screenshot({ omitBackground: transparent, clip: { x: 0, y: 0, width: w, height: h } });
    await p.close(); return buf;
  };
  const mark = read('roadbook-mark.svg');
  fs.writeFileSync(path.join(BRAND, 'favicon.svg'), mark);
  const p16 = await shot(mark, 16, 16, true), p32 = await shot(mark, 32, 32, true);
  fs.writeFileSync(path.join(BRAND, 'favicon.ico'), ico([{ size: 16, buf: p16 }, { size: 32, buf: p32 }]));
  // touch icons get a white ground and a little breathing room, as Apple and Android crop them
  const padded = (size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}"><rect width="24" height="24" fill="#fff"/><g transform="translate(2.4 2.4) scale(0.8)">${mark.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')}</g></svg>`;
  fs.writeFileSync(path.join(BRAND, 'apple-touch-icon.png'), await shot(padded(180), 180, 180, false));
  fs.writeFileSync(path.join(BRAND, 'icon-512.png'), await shot(padded(512), 512, 512, false));
  // the og card has a slot for a map crop (x 80, y 400, 230 tall); drop the landing-page route example into it
  let og = read('roadbook-og-1200x630-outlined.svg');
  const route = path.join(__dirname, '..', 'route-kn522.png');
  if (fs.existsSync(route)){
    const b64 = fs.readFileSync(route).toString('base64');
    const h = Math.round(1040 * 394 / 1920);
    og = og.replace('<g id="map-crop-slot">', `<image href="data:image/png;base64,${b64}" x="80" y="${400 + Math.round((230 - h) / 2)}" width="1040" height="${h}"/><g id="map-crop-slot">`);
  }
  fs.writeFileSync(path.join(BRAND, 'og.png'), await shot(og, 1200, 630, false));
  await b.close();
  for (const f of ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'icon-512.png', 'og.png']) console.log(f.padEnd(22), fs.statSync(path.join(BRAND, f)).size, 'bytes');
})().catch(e => { console.error(e); process.exit(1); });
