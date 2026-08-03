import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseRoosterPdfData } from '../lib/roosterPdfImport.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const data = new Uint8Array(fs.readFileSync(path.join(__dirname, '..', '2526 Klassen.pdf')));
  // dynamic import of parser via tsx
  const mod = await import('../lib/roosterPdfImport.ts');
  const result = await mod.parseRoosterPdfBytes(data);
  console.log('year', result.year);
  console.log('klassen', result.timetables.length);
  for (const t of result.timetables.slice(0, 5)) {
    console.log('\n', t.klas, Object.keys(t.slots).length, 'slots');
    console.log(t.slots);
  }
  console.log('\nwarnings', result.warnings.slice(0, 10));
}

main().catch(console.error);
