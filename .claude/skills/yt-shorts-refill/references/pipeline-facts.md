# Pipeline facts — what the machine will and won't accept

Taste lives in `story-bible.md`. This file is the engine. Every number here was
read out of the code, not remembered. When a draft fails the linter, the answer
is in here.

Source of truth, in order: `scripts/lib/story.mjs` (grammar + linter),
`src/timeline.js` (pacing), `scripts/build.mjs` (length gate),
`scripts/upload.mjs` (what YouTube receives). If a number below disagrees with
the code, the code is right — fix this file in the same commit.

## The chain

```
sheet/stories.csv          one row per day, `date` = the day it posts
  -> scripts/sheet.mjs     finds today's row, parses + lints -> content/<date>.json
  -> scripts/tts.py        one clip per bubble (ElevenLabs, falling back to edge-tts)
  -> src/timeline.js       events -> frames
  -> remotion render       -> out/<date>.mp4  (+ .cover.jpg, .meta.json, .post.txt)
  -> scripts/upload.mjs    YouTube Data API v3
```

A missing row is a hard failure: `no story for <date> in the sheet`, exit 1, red
run, nothing posts. That is the only way this channel goes dark.

## Hard limits (`LIMITS` in story.mjs) — errors, the whole batch is rejected

| Limit | Value | Note |
|---|---|---|
| `minMessages` | 10 | fewer bubbles = "too thin for a story" |
| `maxMessages` | 20 | more = "cut the middle" |
| `bubbleChars` | 120 | per bubble, on the written text |
| `hookWords` | 10 | **first bubble only**, counted on the raw text |
| `wordsFail` | 115 | total spoken words; over this it will not fit in a Short |
| `titleChars` | 100 | build.mjs truncates at 97 + ellipsis before upload |

Also errors: a malformed date, no title, fewer than 2 distinct speakers, a
`[react]` before any message, a script ending on a dangling `[typing]`/`[boom]`,
an unknown `[directive]`, a line that isn't `Name: text`, a duplicate date
already in the sheet.

## Warnings — they don't block, but fix them anyway

| Warning | Meaning |
|---|---|
| 95+ spoken words (`wordsWarn`) | ~50s+; trim the middle |
| speaker not in `content/voices.json` | a deterministic fallback voice is used — add the name to voices.json instead |
| no `[boom]`, `[seen]` or `[pause]` | the twist has no beat around it |
| two consecutive days share a `series` | interleave, unless it's a `part` > 1 |

## How the word count is actually computed

`sum(spoken(bubble.text)) + words(cta)`. Consequences:

- Slang is expanded *before* counting: `idk` becomes "I don't know" — **3 words,
  not 1**. `Me: idk tbh omg` is 8 spoken words. Slang is cheap to read and
  expensive to count.
- Emoji are stripped and cost nothing. A bubble that is only emoji is silent.
- `*sigh*` renders as "sigh" — the asterisks come off.

## Slang the voice expands (`SLANG` in story.mjs)

`u ur r rn idk idc omg omw tbh btw lol lmao wtf wth brb ily ty thx pls plz k ok
nvm fr ngl bc cuz ppl tmrw tmr gn gm smh imo irl jk np yw ikr wyd hbu bff`

Anything not on this list is read letter-by-letter and sounds wrong. `ttyl`,
`istg`, `fyp`, `deadass` are **not** on it — spell those out.

## The banned pattern (`BANNED` in story.mjs)

Matched case-insensitively against the *spoken* text of every bubble. One hit
rejects the batch:

`sleeping with · slept with · hook up / hooked up · nude / nudes · sext /
sexting · one night stand · stripper / stripping · porn · horny · sexy · sex ·
virgin · condom · rape / raped / rapes`

Everything else is open: creepy, dark, revenge, grief, betrayal, crime, ghosts,
karma, scams. The rule is decent, not tame.

Watch the accidents — "sexy", "sexist", a school "sex ed" line, and a "virgin"
olive oil joke all trip it. Rewrite, don't argue with the regex.

## Cast (`content/voices.json`) — use these exact names as speakers

`Me · Mom · Dad · Grandma · Grandpa · Sis · Bro · Kid · Bestie · Teacher ·
Coach · Boss · Neighbor · Unknown · Stranger · Landlord · Uncle · Aunt ·
Roommate · Narrator`

`Me` and `Narrator` are excluded from the fallback pool. Names are case- and
spelling-exact: `Bestie` works; `bestie` and `Best Friend` get a fallback voice
and a warning. A speaker name may be up to 21 characters, matching
`[A-Za-z][\w .'-]*`.

Need a new character? Add it to `content/voices.json` with a real edge-tts voice
in the same commit — never ship a story that relies on a fallback.

## Timing — what the directives really do (`src/timeline.js`, 30fps)

| Directive | Written | Actually renders |
|---|---|---|
| `[typing N]` | N seconds | **capped at 2.5s**, and only before an *incoming* bubble that isn't the first |
| `[pause N]` | N seconds | **capped at 1.8s** |
| `[seen]` | — | 1.1s |
| `[time ...]` | — | 0.8s |
| `[react X]` | — | +0.5s on the bubble it attaches to |
| default typing | — | 0.52s automatically before every incoming bubble |
| per-bubble breath | — | 0.26s after each spoken line |

`[typing 5]` and `[typing 3]` render identically. When you want more dread,
stack `[seen]` + `[pause 1.5]` — don't reach for a bigger number.

**`[boom]` needs runway.** The 2.2s riser starts 2.2s *before* the boom bubble
and plays over whatever sits there. Put at least 2s of `[seen]` / `[pause]` /
`[typing]` immediately before it, or the riser swallows the preceding dialogue.

The hook bubble is drawn at frame 0 with no typing dots — frame 0 is what the
feed shows before anyone taps.

## Length gate (`build.mjs`)

- over **59.0s** → hard fail, "not a Short"
- over **50.0s** → warning, "a stranger may not finish it"
- measured: 100 words across 17 bubbles rendered at 54s. 70–90 words over 12–16
  bubbles lands at 40–50s, which is the target.

## What reaches YouTube (`build.mjs` then `upload.mjs`)

- **title** = the `title` column, truncated to 97 + ellipsis past 100 chars
- **description** = `description` + blank line + `channel.json.descriptionTail` +
  blank line + the hashtags
- **tags** = hashtags minus the `#`, then `channel.json.baseTags`, packed into a
  480-char budget, deduped
- `#Shorts` is appended automatically when the row's hashtags don't have it
- **pinned** posts as a top-level comment (needs the `youtube.force-ssl` scope);
  pinning it is Studio-only
- category 24 (Entertainment), en-US, not made for kids
- `out/<date>.cover.jpg` is generated but **never uploaded** — Shorts use a
  video frame, so the hook bubble at frame 0 is the real thumbnail

## The refill file format (`scripts/refill.mjs`)

A JSON array of objects using the sheet's column names. `date` may be omitted —
blank dates continue the day after the last row in the sheet, in array order.

```json
[
  {
    "series": "Texts From Mom",
    "title": "My mom found the receipt I was hiding",
    "contact": "Mom",
    "script": "Unknown: The package is under the mat.\nMe: i think u have the wrong number\n[typing 3]\nUnknown: 14 Birch Lane. Blue door.",
    "cta": "Would you have told her?",
    "description": "Two sentences of premise, no spoiler.",
    "hashtags": "#textstory #chatstory #momtexts #storytime",
    "pinned": "What would YOU have said?"
  }
]
```

`\n` separates script lines inside the JSON string. One bad row rejects the
whole batch and writes nothing, so the sheet never holds a story that would fail
at 8 PM on a runner nobody is watching.

## Optional columns and their defaults

| Column | Default when blank |
|---|---|
| `pov` | `Me` — the right-hand blue side |
| `contact` | the first incoming speaker's name |
| `skin` | picked deterministically from the date; `dark`, `light`, `green` also valid |
| `part` | none; set it only for multi-part cliffhangers |
| `cta` | "Follow for tomorrow's story" |

## Music and mood

There is no `mood` column. `content/channel.json` maps each **series** to one of
three generated beds — `sad`, `light`, `tense` — and build.mjs renders only the
bed that day needs. A new series must be added to `channel.json.moods` or it
falls back to `defaultMood`.

## Voices

`content/voices.json` carries both engines per character: an edge-tts `voice`
and an ElevenLabs `eleven` name. With `ELEVENLABS_KEY_*` set, ElevenLabs is used
and unresolvable names fall back to edge with a warning. Adding a character
means adding both.

## What no longer exists

`[photo:]`, Pixabay, `PIXABAY_KEY`, the image bubble, word-level karaoke
timings, and the yellow headline band. Do not write photo beats — the grammar
rejects them, and the linter will fail the whole batch.
