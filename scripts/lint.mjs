// Lint every story in the sheet. Runs in CI on every push, so a bad refill
// fails the push, not the 8 PM render.
//
//   node scripts/lint.mjs          every row in sheet/stories.csv
//   node scripts/lint.mjs --self   the parser's own check
import {readFileSync} from 'node:fs';
import {check, parse, parseCsv, spoken, toCsv} from './lib/story.mjs';

if (process.argv.includes('--self')) {
  const assert = (ok, msg) => {
    if (!ok) throw new Error(`self-check failed: ${msg}`);
  };
  const ev = parse('Mom: hi 😊\n[typing 2]\n[boom]\nMe: [photo: a cat]\n[react ❤️]\n[seen]\n[pause 2]\n[time later]\nMom: bye', 'Me');
  assert(ev.length === 6, `expected 6 events, got ${ev.length}`);
  assert(ev[0].side === 'in' && ev[1].side === 'out', 'sides');
  assert(ev[1].typingMs === 2000 && ev[1].boom === true, 'directives attach to the next message');
  assert(ev[1].react === '❤️' && !ev[0].react, 'react attaches to the previous message');
  assert(ev[3].kind === 'pause' && ev[3].ms === 2000, 'pause');
  assert(spoken('omg u r here 😂 rn') === 'oh my god you are here right now', `slang: "${spoken('omg u r here 😂 rn')}"`);
  assert(spoken('ok.') === 'okay.', 'slang keeps punctuation');
  const rt = parseCsv(toCsv([{date: '2026-01-01', title: 'a "b", c', script: 'Mom: x\nMe: y'}]))[0];
  assert(rt.title === 'a "b", c' && rt.script === 'Mom: x\nMe: y', 'csv round trip');
  const bad = check({date: '2026-01-01', title: 't', script: 'Unknown: send me your nudes\nMe: no'});
  assert(bad.errors.some((e) => e.includes('off-brand')), 'banned themes are caught');
  assert(bad.errors.some((e) => e.includes('under 10')), 'thin stories are caught');
  // A dead refresh token is the one failure that stops the channel, so the
  // message has to say what to do about it. Stubbed fetch, no network.
  const {accessToken} = await import('./lib/google.mjs');
  const realFetch = globalThis.fetch;
  const saved = {i: process.env.YT_CLIENT_ID, s: process.env.YT_CLIENT_SECRET, r: process.env.YT_REFRESH_TOKEN};
  process.env.YT_CLIENT_ID = process.env.YT_CLIENT_SECRET = process.env.YT_REFRESH_TOKEN = 'self-check';
  globalThis.fetch = async () => ({ok: false, text: async () => '{"error":"invalid_grant"}'});
  let msg = '';
  await accessToken().catch((e) => (msg = e.message));
  globalThis.fetch = realFetch;
  for (const [k, v] of [['YT_CLIENT_ID', saved.i], ['YT_CLIENT_SECRET', saved.s], ['YT_REFRESH_TOKEN', saved.r]]) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  assert(/oauthplayground/.test(msg) && /YT_REFRESH_TOKEN/.test(msg), `invalid_grant must say how to fix it, got: "${msg}"`);

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
