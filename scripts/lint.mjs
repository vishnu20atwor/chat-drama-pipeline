// Lint every story in the sheet. Runs in CI on every push, so a bad refill
// fails the push, not the 8 PM render.
//
//   node scripts/lint.mjs          every row in sheet/stories.csv
//   node scripts/lint.mjs --self   the parser's own check
import {readFileSync, rmSync} from 'node:fs';
import {check, parse, parseCsv, spoken, toCsv} from './lib/story.mjs';

if (process.argv.includes('--self')) {
  const assert = (ok, msg) => {
    if (!ok) throw new Error(`self-check failed: ${msg}`);
  };
  const ev = parse('Mom: hi 😊\n[typing 2]\n[boom]\nMe: [photo: a cat]\n[react ❤️]\n[seen]\n[pause 2]\n[time later]\nMom: bye', 'Me');
  assert(ev.length === 6, `expected 6 events, got ${ev.length}`);
  assert(ev[0].side === 'in' && ev[1].side === 'out', 'sides');
  assert(ev[1].typingMs === 2000 && ev[1].boom === true && ev[1].photo === 'a cat', 'directives attach to the next message');
  assert(ev[1].react === '❤️' && !ev[0].react, 'react attaches to the previous message');
  assert(ev[3].kind === 'pause' && ev[3].ms === 2000, 'pause');
  assert(spoken('omg u r here 😂 rn') === 'oh my god you are here right now', `slang: "${spoken('omg u r here 😂 rn')}"`);
  assert(spoken('ok.') === 'okay.', 'slang keeps punctuation');
  const rt = parseCsv(toCsv([{date: '2026-01-01', title: 'a "b", c', script: 'Mom: x\nMe: y'}]))[0];
  assert(rt.title === 'a "b", c' && rt.script === 'Mom: x\nMe: y', 'csv round trip');
  const bad = check({date: '2026-01-01', title: 't', script: 'Unknown: send me your nudes\nMe: no'});
  assert(bad.errors.some((e) => e.includes('off-brand')), 'banned themes are caught');
  assert(bad.errors.some((e) => e.includes('under 10')), 'thin stories are caught');
  // A photo that comes back broken must cost the bubble, never the video.
  // Stubbed fetch: the API answers, the CDN hands back an HTML error page.
  const {fetchPhotos} = await import('./lib/photo.mjs');
  const realFetch = globalThis.fetch;
  const realKey = process.env.PIXABAY_KEY;
  process.env.PIXABAY_KEY = 'self-check';
  globalThis.fetch = async (u) =>
    String(u).includes('pixabay.com/api')
      ? {ok: true, json: async () => ({hits: [{id: 1, tags: 'cat, pet, home', webformatURL: 'https://cdn.test/y.jpg', imageWidth: 800, imageHeight: 600, downloads: 10}]})}
      : {ok: true, arrayBuffer: async () => new TextEncoder().encode('<html>429 Too Many Requests</html>').buffer};
  const story = {id: '__selfcheck', events: [{kind: 'msg', who: 'Me', photo: 'a cat'}]};
  await fetchPhotos(story); // must not throw
  globalThis.fetch = realFetch;
  if (realKey === undefined) delete process.env.PIXABAY_KEY;
  else process.env.PIXABAY_KEY = realKey;
  rmSync('public/photos/__selfcheck', {recursive: true, force: true});
  assert(!story.events[0].photoFile, 'a non-JPEG download must degrade to a placeholder, not a photo bubble');

  console.log('self-check ok');
  process.exit(0);
}

const rows = parseCsv(readFileSync('sheet/stories.csv', 'utf8'));
let bad = 0;
const seen = new Set();
for (const r of rows) {
  const {errors, warnings, words} = check(r);
  if (seen.has(r.date)) errors.push('duplicate date');
  seen.add(r.date);
  if (errors.length) {
    bad++;
    console.error(`✗ ${r.date}  ${r.title}\n${errors.map((e) => `    ${e}`).join('\n')}`);
  } else if (warnings.length) console.warn(`⚠ ${r.date}  ${r.title}  (${words}w)\n${warnings.map((w) => `    ${w}`).join('\n')}`);
}
console.log(`${rows.length} stories, ${bad} rejected, last date ${rows.map((r) => r.date).sort().at(-1)}`);
if (bad) process.exit(1);
