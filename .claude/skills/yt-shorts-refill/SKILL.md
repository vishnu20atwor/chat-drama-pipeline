---
name: yt-shorts-refill
description: Write stories for the "Left On Read" YouTube Shorts chat-drama channel and append them to sheet/stories.csv in chat-drama-pipeline. Use for any phrasing that means new content for that channel — "write the scripts and update the excel sheet for Left On Read", "refill the content sheet", "2 months of content", "write more text stories", "the sheet is running out", "add 60 stories", "new stories for the channel" — and when the daily story workflow fails with "no story for <date> in the sheet". Also use when editing or rewriting stories already in the sheet.
---

# Writing for Left On Read

**Channel:** Left On Read — one text-message drama Short a day, rendered and
uploaded unattended.
**Pipeline:** `C:\Users\claude space\Marketing\chat-drama-pipeline`
(GitHub: `vishnu20atwor/chat-drama-pipeline`, private).
**The sheet:** `sheet/stories.csv`, one row per day. The operator calls it "the
Excel sheet"; it is a CSV in the repo, edited only through `scripts/refill.mjs`.

A GitHub Actions cron renders the row matching today's date at 20:00 UTC and
uploads it. **If the row is missing, nothing posts and the run goes red.** That
is the only way this channel goes dark, and preventing it is the job.

The linter checks shape. **You check whether a stranger would stop scrolling.**
Passing the linter is the floor, not the goal.

## Read these first

- `references/pipeline-facts.md` — the engine: every hard limit, the banned-word
  list, the cast, what the directives really render as. Read it before writing a
  single row; most rejected batches are rejected for something on that page.
- `references/story-bible.md` — the craft: the beat shape, the series roster,
  hook formulas, twist types, how each character texts, and the retention
  mechanics that decide whether the video gets views.

## The audience, in one paragraph

A stranger on the Shorts feed, 13–24, mostly US, thumb already moving. They
did not choose this video and owe it nothing. They give it **one second** to
justify the second second. They are watching with sound on (that is why the
voices exist) and they have seen a thousand of these, so a premise they can
finish in their head is a swipe. What they reward: a claim they want to argue
with, a twist they didn't call, and a last line worth typing a reply to. The
channel wins on **rewatches, comments and follows**, not on polish.

## Process

1. **Read the state.** `cd` to the pipeline. `node scripts/lint.mjs` prints the
   story count and the last date. Read the **last 14 rows** of
   `sheet/stories.csv` — series, titles, premises — so nothing repeats. Check
   `content/voices.json` for the current cast.

2. **Plan the lineup before writing a word.** For N days, choose series from the
   roster so no two consecutive days share one (a Part 2 is the exception and
   lands the very next day). Hold the mix from the bible: roughly 40% funny,
   35% twist/creepy, 25% tearjerker. Write the plan out — date, series, twist
   type, one-line premise — and check it for two stories that resolve the same
   way before you write any dialogue.

3. **Write the batch** as a JSON array in the scratchpad, one object per story
   with the sheet's columns. Leave `date` blank to continue after the last row.
   Follow the beat shape and the word budget in the bible exactly. Every story
   gets a photo beat.

4. **Self-reject.** Run the bible's refusal list against every story before the
   linter sees it. Anything you can guess from title + bubble one goes back.

5. **Append.** `node scripts/refill.mjs <file>`. It rejects the whole batch on
   any error. Fix the story, never the rule. A `N spoken words` warning means
   trim the middle, not the turn.

6. **Watch one, if this box can render** (Chrome + Python + edge-tts):
   `npm run build -- <date>`, then `node scripts/frames.mjs <date>` and Read a
   dozen frames from `out/frames/<date>/`. Stills lie about timing; consecutive
   frames don't. In a cloud session with no renderer, skip this — the linter is
   the gate and the operator wants nothing run on their machine.

7. **Commit and push.** `sheet/stories.csv` (plus `content/voices.json` if you
   added a character), message like `refill: 60 stories through 2026-11-05`.
   The `lint the sheet` workflow is the last gate. If step 6 was skipped,
   trigger `daily story` once by hand (Actions → Run workflow → date = the first
   new row, privacy = `unlisted`) and read the log: a green run ending in
   `done -> out/<date>.mp4` proves the batch renders.

8. **Report** the date range now covered and when it runs out.

## Quality bar — apply to every story before step 5

- First bubble ≤ 10 words, and it is a **claim someone would argue with**. Never
  a greeting, never "you up?", never a question about availability.
- The twist is not guessable by bubble 6. If you can guess it, move the reveal
  later and add a misdirect.
- The last bubble lands in ≤ 8 words. The CTA is a question a viewer answers in
  the comments, not "like and subscribe".
- At least one `[boom]`, or `[seen]` + `[pause]`, around the reveal — with 2s of
  dead air in front of a `[boom]` so the riser has runway.
- One photo beat, two at most, at the line where a real object enters.
- Every character sounds like a person. Mom capitalises. Kids don't.
- Nothing sexual, ever. Everything else — dark, creepy, revenge, grief — is in,
  if it is decent.

## Cadence

The operator refills roughly every 2 months, prompted by a recurring calendar
reminder set two weeks before the sheet runs dry. Two things to know:

- **60 days of repository inactivity disables the cron.** GitHub emails first,
  then switches scheduled workflows off. A refill push resets that clock — so
  refilling on time is also what keeps the schedule alive. If a refill slips
  past ~8 weeks, check Actions for a disabled-workflow banner and re-enable it.
- Always leave **at least 3 weeks of runway** after a refill. A sheet that ends
  on the day of the next reminder has no slack for a missed week.
