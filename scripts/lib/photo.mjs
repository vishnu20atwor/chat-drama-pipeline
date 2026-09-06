// Image bubbles. A message written as `Mom: [photo: keys on the counter]`
// becomes a Pixabay search; the pick is cached in public/photos/<id>/<n>.jpg
// and rendered as a photo bubble. Without PIXABAY_KEY the bubble renders as a
// grey 📷 placeholder and the build says so.
//
// The pick is not the first hit. Pixabay's first page is full of studio shots,
// isolated-on-white product photos and renders, and a text conversation needs
// the opposite: something that looks like a person raised their phone and
// pressed the button. So the top 25 hits are scored and the most casual wins.
import {existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {hashOf} from '../../src/theme.js';

// Tags that mean "stock", not "snapshot". Each one costs the hit a point.
const POLISHED = [
  'isolated', 'white background', 'studio', 'render', '3d', 'illustration', 'vector', 'clipart', 'clip art', 'mockup',
  'template', 'abstract', 'logo', 'icon', 'banner', 'design', 'graphic', 'wallpaper', 'macro', 'concept', 'business',
  'corporate', 'art', 'painting', 'drawing', 'cartoon', 'ai generated', 'generated', 'digital', 'texture', 'pattern',
  'symbol', 'sign', 'luxury', 'elegant', 'glamour', 'sexy', 'sunset', 'sunrise', 'landscape', 'nature', 'travel',
];
// Posed people. Pixabay's people photos are overwhelmingly models, so these
// cost a point unless the search term itself asks for a person.
const POSED = ['model', 'fashion', 'beauty', 'portrait', 'woman', 'girl', 'lady', 'couple', 'love', 'romantic', 'wedding', 'bride', 'makeup', 'hair', 'lingerie', 'bikini', 'pose'];
const PERSON_WORDS = ['man', 'woman', 'kid', 'child', 'boy', 'girl', 'person', 'people', 'teenager', 'grandmother', 'grandfather', 'couple', 'crowd', 'family', 'baby'];
// Tags that mean a real place with real things in it. Each one earns a point.
const CASUAL = [
  'home', 'house', 'kitchen', 'living room', 'bedroom', 'room', 'table', 'counter', 'floor', 'couch', 'sofa', 'car',
  'street', 'garden', 'yard', 'backyard', 'porch', 'door', 'window', 'family', 'kid', 'child', 'dog', 'cat', 'pet',
  'food', 'dinner', 'breakfast', 'school', 'office', 'desk', 'phone', 'everyday', 'indoor', 'indoors', 'interior',
  'candid', 'snapshot', 'party', 'messy', 'old', 'vintage',
];
const STOP = new Set(['on', 'at', 'in', 'the', 'a', 'an', 'of', 'with', 'and', 'from', 'to', 'left', 'open']);

// Relevance first: a hit that never mentions the thing we asked for is not a
// candidate however casual it looks. Then the snapshot-vs-stock scoring.
const score = (hit, query) => {
  const tags = String(hit.tags || '').toLowerCase().split(',').map((t) => t.trim());
  const joined = tags.join(',');
  const words = query.toLowerCase().split(/\s+/).filter((w) => w && !STOP.has(w));
  const stem = (w) => w.replace(/(es|s)$/, '');
  const matched = words.filter((w) => tags.some((t) => t.split(' ').some((x) => stem(x) === stem(w) || x.startsWith(stem(w)))));
  if (!matched.length) return -99;
  let s = matched.length * 3;
  for (const t of POLISHED) if (joined.includes(t)) s -= 1;
  for (const t of CASUAL) if (joined.includes(t)) s += 1;
  const wantsPerson = words.some((w) => PERSON_WORDS.includes(w));
  if (!wantsPerson) for (const t of POSED) if (tags.includes(t)) s -= 2;
  // Landscape reads as a phone photo turned sideways, or a screenshot; a
  // tall poster crop does not.
  const ratio = hit.imageWidth / hit.imageHeight;
  if (ratio < 1.1 || ratio > 1.9) s -= 1;
  // The most-downloaded hits are the most recognisable stock images. Mild
  // penalty so the same "keys on table" photo doesn't turn up on every channel.
  if (hit.downloads > 200000) s -= 1;
  return s;
};

// A photo is a garnish. Pixabay rate-limits, its CDN can refuse a datacenter IP,
// and a truncated download is still a file on disk — so every failure below
// degrades to the grey placeholder and the render carries on. Losing the day's
// Short over a stock photo is the worst trade this pipeline could make.
const isJpeg = (b) => b.length > 1024 && b[0] === 0xff && b[1] === 0xd8;

// Node's default UA is "node", which some image CDNs refuse outright. Hedge.
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

export const fetchPhotos = async (content) => {
  const msgs = content.events.filter((e) => e.kind === 'msg');
  const want = msgs.filter((e) => e.photo);
  if (!want.length) return;
  const key = process.env.PIXABAY_KEY;
  if (!key) {
    console.warn(`  ⚠ ${want.length} photo bubble(s) but PIXABAY_KEY is not set — rendering placeholders`);
    return;
  }
  const dir = `public/photos/${content.id}`;
  mkdirSync(dir, {recursive: true});
  for (const ev of want) {
    const i = msgs.indexOf(ev);
    const file = `photos/${content.id}/${i}.jpg`;
    const path = `public/${file}`;
    // A broken file cached by an earlier run would fail the render forever.
    if (existsSync(path) && !isJpeg(readFileSync(path))) rmSync(path);
    if (!existsSync(path)) {
      try {
        const url = `https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(ev.photo)}&image_type=photo&orientation=horizontal&safesearch=true&per_page=25`;
        const res = await fetch(url);
        if (!res.ok) {
          console.warn(`  ⚠ pixabay ${res.status} for "${ev.photo}" — placeholder`);
          continue;
        }
        const hits = (await res.json()).hits || [];
        if (!hits.length) {
          console.warn(`  ⚠ no pixabay result for "${ev.photo}" — placeholder`);
          continue;
        }
        // Best score wins; ties keep Pixabay's relevance order, and the story id
        // picks among the top two so two stories that ask for "keys on the
        // counter" don't ship the same picture.
        const ranked = hits.map((h, k) => ({h, k, s: score(h, ev.photo)})).sort((a, b) => b.s - a.s || a.k - b.k);
        const top = ranked.filter((r) => r.s > -99).slice(0, 2);
        if (!top.length) {
          console.warn(`  ⚠ no relevant pixabay result for "${ev.photo}" — placeholder`);
          continue;
        }
        const hit = top[hashOf(content.id + ev.photo) % top.length].h;
        const img = await fetch(hit.webformatURL, {headers: {'user-agent': UA}});
        if (!img.ok) {
          console.warn(`  ⚠ image ${img.status} for "${ev.photo}" (${hit.webformatURL}) — placeholder`);
          continue;
        }
        const buf = Buffer.from(await img.arrayBuffer());
        // Whatever came back, it has to be a JPEG or Remotion dies loading it.
        if (!isJpeg(buf)) {
          console.warn(`  ⚠ not a JPEG for "${ev.photo}": ${buf.length}B starting ${buf.subarray(0, 12).toString('hex')} — placeholder`);
          continue;
        }
        writeFileSync(path, buf);
        console.log(`  photo ${i}: "${ev.photo}" → pixabay #${hit.id} (score ${ranked[0].s}, ${hits.length} hits, ${buf.length}B)`);
      } catch (e) {
        console.warn(`  ⚠ photo "${ev.photo}" failed: ${e.message} — placeholder`);
        continue;
      }
    }
    ev.photoFile = file;
  }
};
