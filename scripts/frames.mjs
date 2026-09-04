// Review a render the only way that catches timing bugs: watch it, not stills.
//
//   node scripts/frames.mjs 2026-09-06 [fps=2]
//
// Renders the whole composition as a small JPEG sequence into
// out/frames/<id>/ and keeps every Nth frame, so a 50s video becomes ~100
// thumbnails you can read in a row. Uses out/<id>.props.json from the build.
import {execSync} from 'node:child_process';
import {existsSync, readdirSync, rmSync} from 'node:fs';

const id = process.argv[2];
const fps = Number(process.argv[3] || 2);
if (!id || !existsSync(`out/${id}.props.json`)) throw new Error('usage: node scripts/frames.mjs <id> [fps]  (run the build first)');

const dir = `out/frames/${id}`;
rmSync(dir, {recursive: true, force: true});
execSync(`npx remotion render src/index.jsx Chat ${dir} --sequence --image-format=jpeg --jpeg-quality=70 --scale=0.3 --props=out/${id}.props.json --log=error`, {stdio: 'inherit'});

const every = Math.round(30 / fps);
const files = readdirSync(dir).filter((f) => f.endsWith('.jpeg')).sort();
files.forEach((f, i) => {
  if (i % every) rmSync(`${dir}/${f}`);
});
console.log(`${dir}: ${Math.ceil(files.length / every)} frames at ${fps}fps`);
