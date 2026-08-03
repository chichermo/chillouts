import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(fs.readFileSync(path.join(__dirname, '..', '2526 Klassen.pdf')));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  console.log('pages', doc.numPages);
  const max = Math.min(doc.numPages, 4);
  for (let p = 1; p <= max; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items = content.items.map((it) => ({
      str: it.str,
      x: Math.round(it.transform[4]),
      y: Math.round(it.transform[5]),
    }));
    console.log('\n===== PAGE', p, 'items', items.length, '=====');
    const rows = new Map();
    for (const it of items) {
      if (!it.str.trim()) continue;
      const key = Math.round(it.y / 4) * 4;
      if (!rows.has(key)) rows.set(key, []);
      rows.get(key).push(it);
    }
    const sortedYs = [...rows.keys()].sort((a, b) => b - a);
    for (const y of sortedYs.slice(0, 50)) {
      const line = rows
        .get(y)
        .sort((a, b) => a.x - b.x)
        .map((i) => i.str)
        .join(' | ');
      console.log(y + ':', line);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
