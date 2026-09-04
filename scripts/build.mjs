// One command per video:  npm run build -- 2026-09-06
// Sheet → lint → voices → sounds → render → cover → copy. Writes out/<id>.*
import {execSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {fetchPhotos} from './lib/photo.mjs';

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
if (!existsSync('public/music/bed.wav')) {
  mkdirSync('public/music', {recursive: true});
  run('python', ['scripts/bed.py', 'public/music/bed.wav']);
}

console.log(`\nvoicing ${id}`);
run('python', ['scripts/tts.py', `content/${id}.json`]);
const audio = JSON.parse(readFileSync(`content/${id}.audio.json`, 'utf8'));

await fetchPhotos(content); // adds event.photoFile where PIXABAY_KEY allows

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
