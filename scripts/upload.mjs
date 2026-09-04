// Upload out/<date>.mp4 to YouTube, public, with the sheet's description and
// hashtags, then post the pinned comment.
//
//   node scripts/upload.mjs 2026-09-06
//
// One token refresh and one multipart POST against the REST endpoint — no
// googleapis dependency. Needs YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN.
//
// PRIVACY defaults to public. Until the Google Cloud project passes YouTube's
// API compliance audit, Google silently locks API uploads to private whatever
// this says — see DEPLOY.md. The pipeline asks for public so that the day the
// audit clears, nothing here changes.
import {readFileSync, writeFileSync} from 'node:fs';
import {accessToken, gapi} from './lib/google.mjs';

const date = process.argv[2] || new Date().toISOString().slice(0, 10);
const privacy = process.env.PRIVACY || 'public';

const meta = JSON.parse(readFileSync(`out/${date}.meta.json`, 'utf8'));
const video = readFileSync(`out/${date}.mp4`);
const token = await accessToken();

const metadata = {
  snippet: {
    title: meta.title,
    description: meta.description,
    tags: meta.tags,
    categoryId: '24', // Entertainment
    defaultLanguage: 'en-US',
    defaultAudioLanguage: 'en-US',
  },
  status: {privacyStatus: privacy, selfDeclaredMadeForKids: false},
};

const boundary = 'cdp' + '-'.repeat(8) + Date.now().toString(36);
const body = Buffer.concat([
  Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\nContent-Type: video/mp4\r\n\r\n`
  ),
  video,
  Buffer.from(`\r\n--${boundary}--\r\n`),
]);

const {id, status} = await gapi(token, 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status', {
  method: 'POST',
  headers: {'content-type': `multipart/related; boundary=${boundary}`},
  body,
});

const url = `https://youtube.com/shorts/${id}`;
const landed = status?.privacyStatus || privacy;
console.log(`uploaded ${landed}: ${url}`);
if (privacy === 'public' && landed !== 'public') {
  console.warn('  ⚠ asked for public, landed private — the Google Cloud project has not passed the API audit yet (DEPLOY.md, step 5).');
}
writeFileSync(`out/${date}.upload.json`, JSON.stringify({videoId: id, url, privacy: landed, at: new Date().toISOString()}, null, 2));

if (meta.pinned) {
  try {
    await gapi(token, 'https://www.googleapis.com/youtube/v3/commentThreads?part=snippet', {
      method: 'POST',
      body: JSON.stringify({snippet: {videoId: id, topLevelComment: {snippet: {textOriginal: meta.pinned}}}}),
    });
    console.log('posted the comment (pinning is Studio-only; it still ranks first while the video is new).');
  } catch (e) {
    const scope = e.status === 403 && /insufficient|scope/i.test(e.body || '');
    console.warn(scope ? '  ⚠ comment skipped: the refresh token lacks youtube.force-ssl (DEPLOY.md, step 4).' : `  ⚠ comment failed: ${e.message}`);
  }
}
