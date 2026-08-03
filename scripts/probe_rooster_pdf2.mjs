import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function extractPage(page) {
  const content = await page.getTextContent();
  return content.items
    .filter((it) => it.str && String(it.str).trim())
    .map((it) => ({
      str: String(it.str).trim(),
      x: it.transform[4],
      y: it.transform[5],
      w: it.width || 0,
    }));
}

function clusterY(items, tol = 3) {
  const rows = [];
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  for (const it of sorted) {
    const row = rows.find((r) => Math.abs(r.y - it.y) <= tol);
    if (row) {
      row.items.push(it);
      row.y = (row.y * (row.items.length - 1) + it.y) / row.items.length;
    } else {
      rows.push({ y: it.y, items: [it] });
    }
  }
  return rows.map((r) => ({
    y: r.y,
    items: r.items.sort((a, b) => a.x - b.x),
    text: r.items
      .sort((a, b) => a.x - b.x)
      .map((i) => i.str)
      .join(' '),
  }));
}

async function main() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(fs.readFileSync(path.join(__dirname, '..', '2526 Klassen.pdf')));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

  for (let p = 1; p <= 2; p++) {
    const page = await doc.getPage(p);
    const items = await extractPage(page);
    const dayHeaders = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag'];
    const dayItems = dayHeaders.map((d) => items.find((i) => i.str === d)).filter(Boolean);
    console.log('\nPAGE', p, 'days', dayItems.map((d) => `${d.str}@${Math.round(d.x)}`));

    // klas candidates near top
    const top = items.filter((i) => i.y > 500);
    console.log(
      'top texts',
      top
        .sort((a, b) => b.y - a.y || a.x - b.x)
        .map((i) => i.str)
        .join(' | ')
    );

    const dayXs = dayItems.map((d) => d.x);
    const bounds = dayXs.map((x, i) => {
      const left = i === 0 ? x - 20 : (dayXs[i - 1] + x) / 2;
      const right = i === dayXs.length - 1 ? x + 120 : (x + dayXs[i + 1]) / 2;
      return { left, right, day: dayHeaders[i] };
    });

    // Find hour markers: single digit 1-9 on left
    const hourMarks = items.filter(
      (i) => /^[1-9]$/.test(i.str) && i.x < 60
    );
    console.log(
      'hours',
      hourMarks.map((h) => `${h.str}@y${Math.round(h.y)}x${Math.round(h.x)}`).join(', ')
    );

    for (const h of hourMarks.filter((x) => Number(x.str) <= 7)) {
      const hour = Number(h.str);
      // band around hour y
      const band = items.filter((i) => Math.abs(i.y - h.y) < 28 && i.x > 50);
      const byDay = bounds.map((b) => {
        const cell = band
          .filter((i) => i.x >= b.left && i.x < b.right)
          .sort((a, b2) => a.x - b2.x || b2.y - a.y);
        return { day: b.day, cell: cell.map((c) => c.str).join(' ') };
      });
      console.log('H' + hour, byDay.map((d) => `${d.day}:${d.cell}`).join(' || '));
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
