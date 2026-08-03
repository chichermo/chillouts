import fs from 'fs';
import { parseRoosterPdfBytes } from '../lib/roosterPdfImport';

async function main() {
  const data = new Uint8Array(fs.readFileSync('2526 Klassen.pdf'));
  const r = await parseRoosterPdfBytes(data);
  console.log('year', r.year, 'pages', r.pageCount, 'klassen', r.timetables.length);
  for (const t of r.timetables.slice(0, 6)) {
    console.log('\n' + t.klas, Object.keys(t.slots).length);
    console.log(JSON.stringify(t.slots, null, 0));
  }
  console.log('\nwarnings', r.warnings.length);
  console.log(r.warnings.slice(0, 15).join('\n'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
