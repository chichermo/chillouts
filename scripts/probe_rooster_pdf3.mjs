import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(fs.readFileSync(path.join(__dirname, '..', '2526 Klassen.pdf')));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  const page = await doc.getPage(1);
  const content = await page.getTextContent();
  const items = content.items
    .filter((it) => it.str && String(it.str).trim())
    .map((it) => ({
      str: String(it.str).trim(),
      x: Math.round(it.transform[4] * 10) / 10,
      y: Math.round(it.transform[5] * 10) / 10,
    }));

  const digits = items.filter((i) => /^[1-9]$/.test(i.str));
  console.log('digit items', digits);

  // Also look at items that look like teacher names (contain letter and maybe .)
  const teachersish = items.filter((i) => /^[A-ZÀ-Ÿ*][a-zà-ÿ]/.test(i.str) || /\.$/.test(i.str));
  console.log('sample teachers', teachersish.slice(0, 40));
}

main().catch(console.error);
