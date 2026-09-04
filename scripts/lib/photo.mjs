// Image bubbles. A message written as `Mom: [photo: burnt birthday cake]`
// becomes a Pixabay search; the first safe, landscape hit is cached in
// public/photos/<id>/<n>.jpg and rendered as a photo bubble. Without
// PIXABAY_KEY the bubble renders as a grey 📷 placeholder and the build says so.
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';

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
    if (!existsSync(`public/${file}`)) {
      const url = `https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(ev.photo)}&image_type=photo&orientation=horizontal&safesearch=true&per_page=5`;
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`  ⚠ pixabay ${res.status} for "${ev.photo}" — placeholder`);
        continue;
      }
      const hit = (await res.json()).hits?.[0];
      if (!hit) {
        console.warn(`  ⚠ no pixabay result for "${ev.photo}" — placeholder`);
        continue;
      }
      const img = await fetch(hit.webformatURL);
      writeFileSync(`public/${file}`, Buffer.from(await img.arrayBuffer()));
      console.log(`  photo ${i}: "${ev.photo}" → pixabay #${hit.id}`);
    }
    ev.photoFile = file;
  }
};
