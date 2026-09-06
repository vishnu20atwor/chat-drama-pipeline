// One command per video:  npm run build -- 2026-09-06
// Sheet → lint → voices → sounds → render → cover → copy. Writes out/<id>.*
import {execSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {hashOf} from '../src/theme.js';

if (existsSync('.env')) process.loadEnvFile('.env');

const id = process.argv[2] || new Date().toISOString().slice(0, 10);
const q = (a) => (/^[\w./=:-]+$/.test(a) ? a : `"${String(a).replace(/"/g, '\\"')}"`);
const run = (cmd, args) => execSync([cmd, ...args.map(q)].join(' '), {stdio: 'inherit'});
const fail = (msg) => {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
};

const MAX_S = 59; // Shorts eligibility
const TARGET_S = 50; // past this a stranger stops finishing it

console.log(`\nsheet → content/${id}.json`);
run('node', ['scripts/sheet.mjs', id]);
const content = JSON.parse(readFileSync(`content/${id}.json`, 'utf8'));
const channel = JSON.parse(readFileSync('content/channel.json', 'utf8'));

// Generated once, reused forever (gitignored, so CI makes them on every run — ~10s).
if (!existsSync('public/sfx/riser.wav')) run('python', ['scripts/sfx.py', 'public/sfx']);
// One bed per mood, not one bed for the channel: a dad joke and a mother crying
// at a red light were sharing the same uneasy A-minor loop.
const mood = content.mood || channel.moods?.[content.series] || channel.defaultMood || 'sad';
content.mood = mood;
if (!existsSync(`public/music/${mood}.wav`)) {
  mkdirSync('public/music', {recursive: true});
  run('python', ['scripts/bed.py', `public/music/${mood}.wav`, mood]);
}

console.log(`\nvoicing ${id}`);
run('python', ['scripts/tts.py', `content/${id}.json`]);
const audio = JSON.parse(readFileSync(`content/${id}.audio.json`, 'utf8'));

// Gameplay under the thread. The clip is large and licensed to the operator, so
// it lives outside the repo; CI fetches it once from BG_URL. Each day starts at
// a different second of the loop, so the same scenery never runs twice in a row.
// No clip means no gameplay and a full-frame thread — never a failed render.
const BG = 'public/bg/loop.mp4';
if (!existsSync(BG) && process.env.BG_URL) {
  mkdirSync('public/bg', {recursive: true});
  console.log('fetching the gameplay loop');
  try {
    const res = await fetch(process.env.BG_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    // The publisher ships it zipped. Extract in place rather than mirroring a
    // 167MB file somewhere of our own; `unzip` is on every ubuntu runner.
    if (/\.zip($|\?)/i.test(process.env.BG_URL)) {
      writeFileSync('public/bg/loop.zip', buf);
      execSync(`unzip -p public/bg/loop.zip '*.mp4' > ${BG}`, {stdio: ['ignore', 'ignore', 'inherit'], shell: '/bin/bash'});
      rmSync('public/bg/loop.zip', {force: true});
    } else writeFileSync(BG, buf);
    if (!existsSync(BG) || statSync(BG).size < 1e6) throw new Error('no usable mp4 in the download');
    console.log(`  gameplay loop ready (${(statSync(BG).size / 1e6).toFixed(0)}MB)`);
  } catch (e) {
    console.warn(`  ! BG_URL failed: ${e.message}; rendering without gameplay`);
    rmSync(BG, {force: true});
  }
}
if (existsSync(BG)) {
  const probe = execSync(`npx remotion ffprobe ${BG}`, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']});
  const m = probe.match(/Duration: (\d+):(\d+):(\d+)/);
  const secs = m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0;
  const room = Math.max(1, secs - MAX_S - 5); // never run off the end of the clip
  const startSec = hashOf(id + 'bg') % room;
  content.bg = {file: 'bg/loop.mp4', startFrom: startSec * 30};
  console.log(`gameplay: ${secs}s clip, window from ${startSec}s`);
} else {
  console.log('no gameplay clip (public/bg/loop.mp4) — full-frame thread');
}

const {timeline} = await import('../src/timeline.js');
const tl = timeline(content, audio);
const seconds = tl.total / 30;
if (seconds > MAX_S) fail(`${seconds.toFixed(1)}s — over ${MAX_S}s, not a Short. Cut two bubbles from the middle of the script.`);
if (seconds > TARGET_S) console.warn(`  ⚠ ${seconds.toFixed(1)}s — over the ${TARGET_S}s target; a stranger may not finish it`);

mkdirSync('out', {recursive: true});
writeFileSync(`out/${id}.props.json`, JSON.stringify({content, audio}));

console.log(`\nrendering ${id}  (${seconds.toFixed(1)}s)`);
run('npx', ['remotion', 'render', 'src/index.jsx', 'Chat', `out/${id}.raw.mp4`, `--props=out/${id}.props.json`, '--log=error']);

// Loudness. Every edge-tts voice comes out at its own level, and a Short that
// plays quieter than the one before it gets swiped. Normalise the mix to the
// -14 LUFS platforms target, video stream copied. Remotion ships ffmpeg.
console.log('normalising loudness');
run('npx', ['remotion', 'ffmpeg', '-y', '-i', `out/${id}.raw.mp4`, '-c:v', 'copy', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '192k', `out/${id}.mp4`]);
rmSync(`out/${id}.raw.mp4`);

// Cover: the hook bubble, settled, all words lit.
const hook = tl.items.find((it) => it.kind === 'msg');
const coverFrame = (hook ? hook.from : 0) + 22;
writeFileSync(`out/${id}.cover.props.json`, JSON.stringify({content: {...content, cover: true}, audio}));
run('npx', ['remotion', 'still', 'src/index.jsx', 'Chat', `out/${id}.cover.jpg`, `--frame=${coverFrame}`, `--props=out/${id}.cover.props.json`, '--log=error']);

// The copy. Composed once here; upload.mjs and deliver.mjs only read it.
const hashtags = content.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`));
if (!hashtags.some((h) => /^#shorts$/i.test(h))) hashtags.push('#Shorts');
const tags = [];
let budget = 480;
for (const t of [...hashtags.map((h) => h.slice(1)), ...(channel.baseTags || [])]) {
  const cost = t.length + (t.includes(' ') ? 2 : 0) + 1;
  if (tags.includes(t) || cost > budget) continue;
  tags.push(t);
  budget -= cost;
}
const meta = {
  id,
  title: content.title.length > 100 ? content.title.slice(0, 97) + '…' : content.title,
  description: [content.description, channel.descriptionTail, hashtags.join(' ')].filter(Boolean).join('\n\n'),
  tags,
  pinned: content.pinned || channel.pinnedDefault || '',
  seconds: Number(seconds.toFixed(1)),
  series: content.series,
  part: content.part,
};
writeFileSync(`out/${id}.meta.json`, JSON.stringify(meta, null, 2));
writeFileSync(`out/${id}.post.txt`, [`--- TITLE ---`, meta.title, ``, `--- DESCRIPTION ---`, meta.description, ``, `--- TAGS ---`, meta.tags.join(', '), ``, `--- PINNED COMMENT ---`, meta.pinned, ``].join('\n'));
console.log(`\ndone -> out/${id}.mp4  (${meta.seconds}s)  +  .cover.jpg  +  .meta.json  +  .post.txt`);
