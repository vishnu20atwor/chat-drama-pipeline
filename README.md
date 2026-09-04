# chat-drama-pipeline

Daily text-message drama Shorts, rendered and uploaded unattended.

A story is a text conversation. Each character has its own free neural voice
(edge-tts), bubbles land in an iMessage-style phone, words light up as they're
spoken, and a twist beat hits with a bass drop. One row in the sheet = one
video. A GitHub Actions cron renders today's row at 20:00 UTC and uploads it
public with the row's title, description and hashtags.

```
sheet/stories.csv ──sheet.mjs──▶ content/<date>.json ──tts.py──▶ public/vo/<date>/*.mp3
                                        │                              │
                                        └──────── remotion render ◀────┘ ──▶ out/<date>.mp4 ──upload.mjs──▶ YouTube
```

## Run one locally

```bash
npm install
pip install edge-tts
npm run build -- 2026-09-05      # sheet → voices → render → out/2026-09-05.mp4
node scripts/frames.mjs 2026-09-05   # 2fps frames in out/frames/ for review
npm run studio                   # Remotion Studio with content/sample.json
```

Optional `.env` with `PIXABAY_KEY=...` turns `[photo: ...]` bubbles into real images.

## The sheet

`sheet/stories.csv`, one row per day. Columns:

| column | what |
|---|---|
| `date` | YYYY-MM-DD, the day it posts |
| `series`, `part` | the show name (shown under the phone) and episode number for multi-part cliffhangers |
| `title` | the yellow headline — it is the thumbnail |
| `pov` | the character on the right side (default `Me`) |
| `contact` | the name in the chat header (default: first incoming speaker) |
| `skin` | `dark` (default), `light`, `green`, or `auto` |
| `script` | the conversation, one line per beat — grammar below |
| `cta` | the end-card question, narrated |
| `description`, `hashtags`, `pinned` | YouTube copy; `#Shorts` is appended |

### Script grammar

```
Mom: I found a receipt in your jacket.     bubble; speaker names come from content/voices.json
Me: which jacket                           the pov side, right-aligned, blue
[typing 3]        typing dots for 3s before the next incoming bubble (default 0.5s)
[seen]            "Read" under your last bubble, hold 1.1s
[pause 2]         dead air
[time 2 hours later]   separator line
[react ❤️]        tapback on the previous bubble
[boom]            the next bubble hits with bass + punch-in
Mom: [photo: gold ring in a box]    image bubble from Pixabay
```

`node scripts/lint.mjs` checks every row; `node scripts/refill.mjs batch.json`
appends a batch (and refuses the whole batch if any row fails). The
`yt-shorts-refill` Claude skill writes batches.

## Layout

```
scripts/
  sheet.mjs      row → content/<date>.json (parse + lint)
  tts.py         one clip per bubble, per-character voice, word timings
  sfx.py bed.py  generated sounds and music (no downloads)
  build.mjs      the whole thing; writes out/<date>.{mp4,cover.jpg,meta.json,post.txt}
  upload.mjs     YouTube Data API v3, public, raw REST
  deliver.mjs    optional Telegram delivery
  frames.mjs     review frames
  refill.mjs     append a batch of stories
  lint.mjs       lint the sheet (`--self` runs the parser's own check)
  lib/story.mjs  the grammar, the linter, the CSV
src/
  Chat.jsx       the composition
  timeline.js    events → frames (shared with build.mjs)
  theme.js       skins, sizes
content/
  voices.json    character → edge-tts voice
  channel.json   base tags, description tail, default pinned comment
```

Deployment: see DEPLOY.md.
