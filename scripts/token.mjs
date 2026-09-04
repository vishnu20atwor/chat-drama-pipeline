// Get the YouTube refresh token, once, on your own machine.
//
//   node scripts/token.mjs
//
// Asks for the OAuth client id and secret (from Google Cloud Console), opens
// the consent page, catches the redirect on localhost, exchanges the code, and
// prints the refresh token together with the channel it belongs to. Nothing
// is written to disk. Put the three values in GitHub Secrets and close the
// terminal.
import {createServer} from 'node:http';
import {createInterface} from 'node:readline/promises';
import {exec} from 'node:child_process';

const PORT = 8765;
const REDIRECT = `http://localhost:${PORT}`;
const SCOPES = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.force-ssl'];

const rl = createInterface({input: process.stdin, output: process.stdout});
const clientId = (process.env.YT_CLIENT_ID || (await rl.question('OAuth client id: '))).trim();
const clientSecret = (process.env.YT_CLIENT_SECRET || (await rl.question('OAuth client secret: '))).trim();
rl.close();
if (!clientId || !clientSecret) throw new Error('both values are required');

const url =
  'https://accounts.google.com/o/oauth2/v2/auth?' +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent', // forces a refresh token even if you approved before
    scope: SCOPES.join(' '),
  });

const code = await new Promise((resolve, reject) => {
  const server = createServer((req, res) => {
    const q = new URL(req.url, REDIRECT).searchParams;
    if (q.get('error')) {
      res.end('Denied. You can close this tab.');
      server.close();
      reject(new Error(q.get('error')));
      return;
    }
    if (!q.get('code')) {
      res.end('Waiting for Google…');
      return;
    }
    res.end('Done. Go back to the terminal — you can close this tab.');
    server.close();
    resolve(q.get('code'));
  });
  server.listen(PORT, () => {
    console.log(`\nOpening the consent page. Sign in as the CHANNEL's Google account.\nIf the browser does not open, paste this:\n\n${url}\n`);
    exec(`${process.platform === 'win32' ? 'start ""' : 'open'} "${url}"`);
  });
});

const tok = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: {'content-type': 'application/x-www-form-urlencoded'},
  body: new URLSearchParams({client_id: clientId, client_secret: clientSecret, code, grant_type: 'authorization_code', redirect_uri: REDIRECT}),
}).then((r) => r.json());
if (!tok.refresh_token) throw new Error(`no refresh token in the reply: ${JSON.stringify(tok)}`);

// Prove it is the right channel before you put it anywhere.
const who = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
  headers: {authorization: `Bearer ${tok.access_token}`},
}).then((r) => r.json());
const channel = who.items?.[0]?.snippet?.title || '(no channel on this account!)';

console.log(`\nChannel:        ${channel}`);
console.log(`Scopes granted: ${tok.scope}`);
console.log(`\nYT_REFRESH_TOKEN=${tok.refresh_token}\n`);
console.log('Copy the three values into GitHub → Settings → Secrets → Actions. Do not paste them into chat.');
