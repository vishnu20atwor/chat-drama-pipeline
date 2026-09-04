---
name: yt-shorts-refill
description: Use when the user asks to refill, top up, or write more content for the YouTube Shorts chat-story sheet — phrasings like "refill the content sheet", "2 months of content", "write more text stories", "the sheet is running out", "add 60 stories" — or when the daily story workflow fails with "no story for <date> in the sheet".
---

# Refilling the chat-story sheet

The channel is a daily text-message drama Short. The pipeline at
`C:\Users\claude space\Marketing\chat-drama-pipeline` renders whatever row in
`sheet/stories.csv` matches today's date; if the row is missing, nothing posts.
A refill is a batch of dated rows that passes the linter and is pushed to `main`.

**The output is stories that a stranger stops scrolling for.** The linter checks
shape. You check whether each one would get screenshotted.

## Process

1. `cd` to the pipeline. `node scripts/lint.mjs` prints the story count and the
   last date. `git log -1 --format=%cd` and the sheet's `series` column tell you
   what has already run — read the last 14 rows so you don't repeat a premise.
2. Plan the lineup before writing a word: for N days, pick series from the
   roster in `references/story-bible.md` so no two consecutive days share a
   series (Part 2 of a cliffhanger is the one exception, and it lands the very
   next day). Aim for the mix in the bible: ~40% funny, ~35% twist/creepy, ~25% tearjerker.
3. Write the batch as a JSON array in the scratchpad. One object per story with
   the sheet's columns; leave `date` blank to continue after the last row.
   Follow the beat structure and the word budget in the bible exactly.
4. `node scripts/refill.mjs <file>`. It rejects the whole batch on any error.
   Fix the story, not the rule. Warnings about `⚠ N spoken words` mean trim.
5. Watch one, if this session can render (Chrome + Python + edge-tts on the
   box): `npm run build -- <date>`, then `node scripts/frames.mjs <date>` and
   Read a dozen frames from `out/frames/<date>/`. Stills lie about timing;
   frames in a row don't. In a cloud session with no renderer, skip this —
   the linter is the gate, and the operator wants nothing run on their machine.
6. Commit `sheet/stories.csv` with a message like `refill: 60 stories through 2026-11-05`
   and push. The `lint the sheet` workflow is the last gate. If step 5 was
   skipped, trigger the `daily story` workflow once by hand (Actions → Run
   workflow → date = the first new row, privacy = `unlisted`) and read its
   log: a green run with `done -> out/<date>.mp4` proves the batch renders.

## Quality bar (apply to every story before step 4)

- First bubble ≤ 10 words and it is a *claim* someone would argue with.
- The twist is not guessable by bubble 6. If you can guess it, move the reveal
  later and add a misdirect.
- The last bubble lands in ≤ 8 words. The CTA is a question the viewer answers
  in the comments.
- At least one `[boom]` or `[seen]` + `[pause]` beat around the reveal.
- Every character sounds like a person, not a script. Mom capitalises. Kids don't.
- Nothing sexual. Everything else — dark, creepy, revenge, grief — is allowed if
  it is decent.

## Grammar quick reference

```
Mom: text           bubble; the `pov` name (default Me) sits on the right
[typing 2]          typing dots for 2s before the next incoming bubble
[seen]  [pause 2]   "Read" receipt · dead air
[time 3 hours later]  separator line
[react ❤️]          tapback on the previous bubble
[boom]              the next bubble hits with bass and a punch-in
Mom: [photo: burnt cake]   image bubble (Pixabay)
```

Voices live in `content/voices.json`; use those names as speakers. An unknown
name gets a fallback voice and a warning — add it to voices.json instead.

## Common mistakes

| Mistake | Fix |
|---|---|
| 110+ words, 20 bubbles | Cut the middle. 70-90 words, 12-16 bubbles renders at 40-50s. |
| Hook is setup ("Hey, you there?") | Open on the accusation, the confession, or the impossible fact. |
| Same series two days running | Interleave. The channel is a lineup of shows. |
| Twist told, not shown | Put it in a photo bubble, a `[time]` jump, or a name change. |
| Story ends on the twist | Add one beat after: the laugh, the tear, or the door opening. |
