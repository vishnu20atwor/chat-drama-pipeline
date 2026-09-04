// Append a batch of stories to the content sheet.
//
//   node scripts/refill.mjs stories.json
//
// stories.json is an array of rows with the sheet's columns (date optional —
// blank dates continue the day after the last row). Every row is linted; one
// bad row rejects the whole batch, so the sheet never holds a story that
// would fail at 8 PM on a runner nobody is watching.
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {check, parseCsv, toCsv} from './lib/story.mjs';

const file = process.argv[2];
if (!file) throw new Error('usage: node scripts/refill.mjs stories.json');

const SHEET = 'sheet/stories.csv';
const existing = existsSync(SHEET) ? parseCsv(readFileSync(SHEET, 'utf8')) : [];
const incoming = JSON.parse(readFileSync(file, 'utf8'));

const nextDay = (d) => {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 10);
};
let last = existing.map((r) => r.date).sort().at(-1) || new Date().toISOString().slice(0, 10);

const taken = new Set(existing.map((r) => r.date));
let bad = 0;
const rows = [];
for (const raw of incoming) {
  const row = {...raw};
  if (!row.date) row.date = last = nextDay(last);
  else last = row.date > last ? row.date : last;
  const {errors, warnings, words} = check(row);
  if (taken.has(row.date)) errors.push(`date ${row.date} is already in the sheet`);
  taken.add(row.date);
  const tag = `${row.date}  ${(row.series || '').padEnd(14)} ${row.title}`;
  if (errors.length) {
    bad++;
    console.error(`✗ ${tag}\n${errors.map((e) => `    ${e}`).join('\n')}`);
  } else console.log(`✓ ${tag}  (${words}w)${warnings.length ? '\n' + warnings.map((w) => `    ⚠ ${w}`).join('\n') : ''}`);
  rows.push(row);
}

// Two of the same series back to back reads as a template; the channel should
// read as a lineup of shows.
const all = [...existing, ...rows].sort((a, b) => a.date.localeCompare(b.date));
for (let i = 1; i < all.length; i++) {
  if (all[i].series && all[i].series === all[i - 1].series && !(Number(all[i].part) > 1)) {
    console.warn(`  ⚠ ${all[i].date} and ${all[i - 1].date} are both "${all[i].series}" — interleave series unless it's a Part 2`);
  }
}

if (bad) {
  console.error(`\n${bad} of ${incoming.length} stories rejected — nothing written. Fix them and rerun.`);
  process.exit(1);
}
writeFileSync(SHEET, toCsv(all));
console.log(`\n${SHEET}: ${existing.length} → ${all.length} stories, through ${all.at(-1).date}`);
