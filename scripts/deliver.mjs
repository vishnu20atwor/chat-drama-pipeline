// Optional: send the finished Short and its link to Telegram.
//
//   node scripts/deliver.mjs 2026-09-06
//
// With no TG_BOT_TOKEN / TG_CHAT_ID it says so and exits 0.
import {existsSync, readFileSync} from 'node:fs';
import {telegram} from './lib/telegram.mjs';

const date = process.argv[2] || new Date().toISOString().slice(0, 10);
const tg = telegram();
if (!tg) {
  console.log('TG_BOT_TOKEN / TG_CHAT_ID not set — skipping phone delivery.');
  process.exit(0);
}
const read = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);
const meta = read(`out/${date}.meta.json`) || {};
const up = read(`out/${date}.upload.json`);
const path = `out/${date}.mp4`;
if (!existsSync(path)) throw new Error(`${path} does not exist — did the render run?`);
const video = readFileSync(path);
if (video.length > 50 * 1024 * 1024) throw new Error(`${path} is over Telegram's 50MB bot limit`);

await tg.text(`${meta.title}\n${up ? `${up.url}  (${up.privacy})` : 'upload failed — file below'}`);
await tg.file(`${date}.mp4`, video, 'video/mp4', `${date} · ${meta.seconds}s`);
console.log(`delivered ${date}.mp4 to Telegram`);
