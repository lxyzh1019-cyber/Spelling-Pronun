import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'node:fs';
const [, , src, out] = process.argv;
const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(src)), useSystemFonts: true }).promise;
const pages = [];
for (let p = 1; p <= doc.numPages; p++) {
  const page = await doc.getPage(p);
  const vp = page.getViewport({ scale: 1 });
  const content = await page.getTextContent();
  const items = content.items.filter(i => i.str && i.str.trim()).map(i => ({
    x: Math.round(i.transform[4]), y: Math.round(i.transform[5]), w: Math.round(i.width), s: i.str,
  }));
  pages.push({ page: p, width: Math.round(vp.width), height: Math.round(vp.height), items });
}
fs.writeFileSync(out, JSON.stringify(pages));
console.log('pages', pages.length);
