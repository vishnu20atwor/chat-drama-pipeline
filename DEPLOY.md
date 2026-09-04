# Deploy — one-time setup, then never touch it

Six steps, all yours (they involve secrets, and secrets never go through chat).
After this the cron posts a story every day at 20:00 UTC (4 PM ET) until the
sheet runs out; the refill skill tops it up two months at a time.

## 1. Repo

Create a **private** repo on the channel's pseudonymous GitHub account, then:

```bash
cd "C:\Users\claude space\Marketing\chat-drama-pipeline"
git remote add origin https://<account>@github.com/<account>/chat-drama-pipeline.git
git config credential.useHttpPath true
git push -u origin main
```

Sign out of github.com in the browser first, or the credential manager will
silently push as whichever account is logged in.

## 2. YouTube API credentials

[Google Cloud Console](https://console.cloud.google.com): new project → enable
**YouTube Data API v3** → OAuth consent screen (External, add your channel's
Google account as a test user) → **Credentials → OAuth client ID → Desktop app**.

Scopes to add on the consent screen — both:

```
https://www.googleapis.com/auth/youtube.upload      uploads the video
https://www.googleapis.com/auth/youtube.force-ssl   posts the comment
```

**Publish the consent screen** (OAuth consent screen → *Publish app* → confirm).
While it sits in "Testing", Google expires every refresh token after 7 days,
and the cron would die silently in week two. "In production" with an
unverified app just shows you a warning page once; the token then lasts.

Then get the refresh token **in the browser, nothing installed**, with
Google's OAuth Playground:

1. Credentials → Create credentials → OAuth client ID → type **Web application**.
   Under *Authorized redirect URIs* add exactly
   `https://developers.google.com/oauthplayground`. Create; keep the id and secret.
2. Open [developers.google.com/oauthplayground](https://developers.google.com/oauthplayground).
   Gear icon (top right) → tick **Use your own OAuth credentials** → paste the
   client id and secret → Close.
3. Step 1 box on the left: paste both scopes into the "Input your own scopes"
   field, space-separated, then **Authorize APIs**. Sign in as the channel's
   account, click *Advanced → Go to … (unsafe)* on the warning, allow both.
4. Step 2 box: **Exchange authorization code for tokens**. The right pane
   shows a JSON with `refresh_token`. That, plus the client id and secret,
   are the three YouTube secrets. Copy them straight into GitHub Secrets.

(`node scripts/token.mjs` does the same from a terminal, if you'd rather.)

## 3. Secrets

Repo → Settings → Secrets and variables → Actions → **New repository secret**:

| Secret | Required | From |
|---|---|---|
| `YT_CLIENT_ID` | yes | step 2 |
| `YT_CLIENT_SECRET` | yes | step 2 |
| `YT_REFRESH_TOKEN` | yes | step 2 |
| `PIXABAY_KEY` | no | pixabay.com/api/docs — image bubbles render as placeholders without it |
| `TG_BOT_TOKEN`, `TG_CHAT_ID` | no | a Telegram bot, if you want the mp4 on your phone each day |
| `SHEET_ID` | no | only if you move the sheet to a published Google Sheet |

## 4. The audit (this is the one that decides "public")

An unaudited Google Cloud project can only upload **private** videos through
the API, whatever the code asks for. The pipeline asks for public every time;
until the audit clears, YouTube quietly locks each upload to private and the
run log prints a warning.

Apply once: [YouTube API Services compliance audit](https://support.google.com/youtube/contact/yt_api_form).
Describe the app honestly: a personal tool that uploads your own original
videos to your own channel on a schedule. It is free and usually takes a few
days to a few weeks. Until then, either flip each video to public in Studio
(20 seconds) or let them queue as private and flip them in a batch.

## 5. First run

Actions → **daily story** → Run workflow → leave the date blank, privacy
`public`. Watch it once. Green run → the channel is live.

To hold uploads (say, while the audit is pending and you'd rather batch): set a
repository **variable** `PRIVACY=private`. Delete it when you're ready.
No code changes either way.

## 6. Refill

When the sheet is within two weeks of its last date (`node scripts/lint.mjs`
prints it), tell Claude: *"refill the content sheet with 2 months of content"*.
The skill writes, lints, renders one, and pushes.

---

**Quota:** one upload is ~1,650 of the 10,000 daily units. Three a day fits.
**Runner time:** ~6-9 minutes per video on the free tier; ~250 minutes a month
of the 2,000 you get on a private repo.
