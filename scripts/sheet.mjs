// Pull one day's story out of the content sheet and write content/<date>.json.
//
//   node scripts/sheet.mjs 2026-09-06
//
// The sheet is sheet/stories.csv in this repo — the refill skill appends to it
// and pushes, and the cron reads it from disk. Set SHEET_ID to read a Google
// Sheet published to the web instead (same columns, tab named "stories").
import {readFileSync, writeFileSync} from 'node:fs';
import {check, parseCsv} from './lib/story.mjs';

const date = process.argv[2] || new Date().toISOString().slice(0, 10);

const rows = async () => {
  const {SHEET_ID} = process.env;
  if (!SHEET_ID) return parseCsv(readFileSync('sheet/stories.csv', 'utf8'));
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=stories`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`sheet -> HTTP ${res.status}. Is it published to the web?`);
  return parseCsv(await res.text());
};

const row = (await rows()).find((r) => r.date === date);
if (!row) {
  console.error(`no story for ${date} in the sheet — run the refill skill.`);
  process.exit(1);
}

const {errors, warnings, content, words} = check(row);
for (const w of warnings) console.warn(`  ⚠ ${w}`);
if (errors.length) {
  console.error(errors.map((e) => `  ✗ ${e}`).join('\n'));
  process.exit(1);
}

writeFileSync(`content/${date}.json`, JSON.stringify(content, null, 2));
const n = content.events.filter((e) => e.kind === 'msg').length;
console.log(`content/${date}.json  "${content.title}"  (${n} messages, ${words} spoken words)`);
