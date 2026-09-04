# Story bible — Left On Read

Every video is a text conversation, voiced, 40–50 seconds. The viewer is a
stranger on the Shorts feed who gives it one second. Everything below exists to
win that second and then the next forty.

Hard numbers, the cast list and what the directives actually render as live in
`pipeline-facts.md`. This file is taste.

## The one rule

Decent. No sexual content, ever — not implied, not joked. Everything else is
open: creepy, dark, revenge, grief, betrayal, karma, scams, ghosts, the
supernatural, crime, family secrets. The linter bans the words; you own the tone.

---

# Part 1 — How this channel actually gets views

Craft that ignores the mechanics below produces stories that read well and get
400 views. Six things move the number.

## 1. Frame 0 is the thumbnail

There is no custom thumbnail. The Short is judged on its first drawn frame, and
that frame is: the yellow title, plus the hook bubble, already on screen — no
typing dots, no fade. So:

- **The title and the hook must not say the same thing.** If the title is "Mom
  found a $400 receipt in my jacket" and bubble one is "I found a receipt in
  your jacket", the frame carries one idea and reads as filler. Make the title
  the *situation* and the hook the *voice* — or the title the accusation and the
  hook the reply.
- Both are readable in one glance or neither is. Title ≤ 45 characters is the
  real target; the linter allows 100 but 100 renders small.
- The frame should raise a question the viewer cannot answer from it. "Mom found
  a receipt" is a question. "Mom found a ring I bought her" is an answer, and
  answers get swiped.

## 2. The loop is a real mechanic — write for it

The last half second crossfades back into the opening frame (`TAIL` in
timeline.js). A viewer who doesn't swipe sees bubble one again *immediately
after the twist*. That is a free rewatch, and rewatches are the cheapest
retention this format has — but only if bubble one **means something different**
the second time.

Build it deliberately: the reveal should re-colour the opening line. "I found a
receipt in your jacket" is an accusation on pass one and a mother about to cry
on pass two. When you finish a draft, re-read bubble one as if you already know
the twist. If nothing changed, the loop is wasted — rewrite the hook, not the
twist.

## 3. The swipe happens around bubble 5–7

Bubbles 1–4 ride the hook's momentum. The reveal is bubble 11–14. In between is
the only place a stranger leaves, and it is exactly where lazy drafts put
filler: "what do you mean", "are you serious", "I don't understand".

Never spend the middle on reaction. Spend it on the **misdirect** — the beat
that lets the viewer build a confident wrong theory. A viewer with a theory does
not swipe; they stay to be proven right, and the twist is the moment they are
proven wrong. That is the whole engine.

## 4. Comments come from a question with two defensible answers

The CTA is the comment engine. A question with one obvious answer gets nothing.
A question that splits the audience fills the comment section, and comment
volume is distribution.

- Dead: "Wasn't that sweet?" · "Isn't that creepy?" · "Would you be scared?"
- Alive: "Would you have opened it?" · "Was she wrong to check his phone?" ·
  "Whose side are you on?" · "Would you have told your mom?"

The pinned comment should take one side, so viewers have something to disagree
with rather than a blank.

## 5. Don't spend the twist in the description

The description is indexed and read by exactly the people deciding whether to
watch. Two sentences of premise, the wrong theory implied, no reveal. A
description that spoils the turn kills the only thing the video is selling.

## 6. Series and Part 2 are the follow mechanic

A stranger follows a *show*, not a video. The `series` column is why the channel
reads as a lineup instead of a content mill. Two rules:

- Never two consecutive days of the same series (the linter warns). The
  exception is a Part 2, which lands **the next day** while the first is still
  circulating.
- At most 3 two-part cliffhangers per 30 days, always twist/creepy, and Part 2
  pays off completely — no third part, ever. A cliffhanger that doesn't resolve
  the next day costs more follows than it earns.

---

# Part 2 — The shape

## Beats (12–16 bubbles, 70–90 spoken words)

| Beat | Bubbles | Job |
|---|---|---|
| Hook | 1 | A claim a stranger would argue with. ≤ 10 words. Never a greeting. |
| Deny / escalate | 2–4 | The other side pushes back, or the stakes rise. Short lines, fast. |
| Misdirect | 1–2 | Let the viewer form the wrong theory. This is what makes the twist land. |
| Dread | directive | `[seen]` + `[pause 1.5]`, or `[typing 3]` — the silence before the turn. |
| Turn | 1–2 | The reveal, on `[boom]`. **Show** it: a `[photo:]`, a `[time]` jump, a name, a number. |
| Land | 1–3 | One beat *after* the twist — the laugh, the tear, or the door. Last line ≤ 8 words. |
| CTA | `cta` | A question with two defensible answers, ≤ 7 words. |

The word budget is real: 100 words rendered at 54s and Shorts cut off at 60.
Cut the middle, never the turn.

## The lineup (series roster)

| Series | Cast | What it is | Mix |
|---|---|---|---|
| Texts From Mom | Mom, Me | Overprotective, nosy, three steps ahead — and right in the end | funny / tearjerker |
| Dad Jokes Inc | Dad, Me | Deadpan dad, escalating bit, the joke hides a soft landing | funny |
| Grandma Learns Texting | Grandma, Me | Autocorrect, caps lock, Google confusion; she means every word | funny → tearjerker |
| Little Brother Logic | Bro or Kid, Me | Negotiations, blackmail with crayons, kid math | funny |
| Wrong Number | Unknown or Stranger, Me | A text meant for someone else — a kindness, a mystery, or a threat | twist / creepy |
| Group Chat Chaos | Mom, Dad, Sis, Bro (pov Me, contact "Family") | Four voices, one disaster, sender names shown | funny |
| Mr. Reyes, 3rd Period | Teacher, Me | Excuses vs. deadpan; the teacher always knows more | funny / tearjerker |
| Boss Texted at 11 PM | Boss, Me | Dread text, then a turn — the boss is human, or the boss is the problem | twist |
| Dog Sitter Updates | Neighbor or Bestie, Me | Escalating updates about the dog; the dog wins | funny |
| Roommate Notes | Roommate, Me | Fridge wars, passive aggression, a reveal | funny / twist |
| Unknown Number | Unknown, Me | Someone knows something they shouldn't. Creepy, PG, ends on a chill | creepy |
| Last Message | any, Me | A conversation that turns out to be the last one — or the first after a loss | tearjerker |

Target mix per 30 days: ~12 funny, ~10 twist/creepy, ~8 tearjerker.

## Hook formulas (first bubble)

- **The accusation:** "I found a receipt in your jacket." / "Why is there a second phone in your drawer"
- **The impossible fact:** "Your dad is standing in our kitchen." (Dad died in 2019) / "The dog just texted me."
- **The confession:** "I did something and I need you to not be mad."
- **The threat, calm:** "Come home. Don't ask why. Just come."
- **Wrong-number opener:** "The package is under the mat. Burn the note."
- **Kid logic:** "I have a business proposal for you."
- **The countdown:** "You have 10 minutes before Mom sees the kitchen."

Never: "hey", "hi", "you up?", "can we talk?" — that is the setup a viewer
scrolls past. Start in the middle.

## Twist types that work on Shorts

1. **The gift disguised as a crime** — the $400 receipt is a ring for Mom.
2. **The wrong theory** — the viewer thinks betrayal; it's a surprise party, a diagnosis, a lost dog.
3. **The identity flip** — the "stranger" is your brother's new phone; the "boss" is your mom's boss.
4. **The time jump** — `[time 6 hours later]` and everything has changed.
5. **The receipt** — a `[photo:]` of the thing that proves it.
6. **The echo** — the last line repeats the first with its meaning inverted. Best loop payoff in the list.
7. **The dread payoff (creepy)** — the texter is in the house / has your old number / is the person being described.
8. **The kid wins** — the negotiation ends with the adult outplayed.

Rotate them. Two stories in a batch that resolve the same way is the most common
failure of a large refill, and it is invisible until you list the twist types in
a column and look down it.

## Voice rules (how each character texts)

- **Mom**: full sentences, capitals, periods. Occasionally ALL CAPS. No abbreviations. "young lady" / "young man".
- **Dad**: short. Dry. Punctuation optional. One emoji per story, max, and it's the wrong one.
- **Grandma**: ALL CAPS or autocorrect wreckage; signs off "Love, Grandma" inside the text.
- **Me** (teen / young adult): lowercase, no periods, "omg", "wait", "bruh". Types fast; sends three bubbles in a row when panicking.
- **Bro / Kid**: lowercase, one deliberate misspelling per story, demands.
- **Teacher / Boss**: formal, then one line that breaks the formality.
- **Unknown / Stranger**: correct grammar, no emoji, short sentences. Calm is creepier than caps.
- **Group chat**: people answer out of order; Dad answers the question from two bubbles ago.

Emoji are silent, so a bubble that is only emoji is a beat of silence — use it
once, on purpose. Slang is read as full words and counts as full words
(`pipeline-facts.md`), so `idk` costs three.

## Directives, the way they're meant to be used

Caps and exact durations are in `pipeline-facts.md`. Intent:

```
[typing 3]      only before the turn — routine typing is automatic
[seen]          after an OUTGOING bubble: "they read it and said nothing"
[pause 1.5]     dead air, the dread beat
[time ...]      "2 hours later", "Next morning", "3 missed calls later"
[react ❤️]      after a bubble that earned it; 😂 🔥 😭 also work
[boom]          the reveal bubble, once per story — needs 2s of dead air before it
Name: [photo: three-word scene]   the proof
```

**Photo beats are not optional.** Every story gets one, two at most, at the line
where a real object enters: keys on the counter, the car door left open, the
burnt cake, the dented bumper, the ring box. It is what makes the conversation
read as two people with phones instead of a script.

- Put it right after the line that names the thing — or *before*, when the photo
  **is** the answer.
- The sender is whoever would have taken it. Mom photographs the mess; the
  stranger photographs the window; Me photographs the proof.
- A photo is silent and holds 1.4s. It is a beat, not a bubble — don't put one
  where the pace needs to run.
- Search-term rules (scenes not people, no mood adjectives) are in
  `pipeline-facts.md`. Getting them wrong is the most common reason a finished
  video looks like a stock-photo ad.
- **Loop bonus:** a photo that contains a detail which only makes sense after
  the twist is the strongest rewatch trigger this format has.

## Titles (the yellow headline)

The title *is* the thumbnail. ≤ 60 characters reads at 62px; ≤ 45 is better.
Formula: **who + what happened + one emoji**. Present tense, or "just".

- "Mom found a $400 jewelry receipt in my jacket 💍"
- "Wrong number asked me to hide a package 📦"
- "Grandma texted the family group chat at 3 AM 🍪"
- "My boss texted 'we need to talk' at 11 PM 👔"
- "Dad's been texting my dead grandpa's number 📱"

Never put the twist in the title, and never let the title duplicate bubble one.

## Description, hashtags, pinned

- **description**: two sentences — the premise and the wrong theory. No spoilers.
- **hashtags**: 4–6. Always `#textstory #chatstory`, plus the series
  (`#momtexts`, `#dadjokes`, `#wrongnumber`, `#creepy`, `#storytime`).
  `#Shorts` is appended automatically; don't waste a slot on it.
- **pinned**: take a side in the CTA debate, or "Part 2 is up 👀" for a Part 2.

## A model story (68 words, 14 bubbles, renders ≈ 44s)

```
Unknown: The package is under the mat. Burn the note.
Me: i think u have the wrong number
Unknown: 14 Birch Lane. Blue door.
Me: that's my house
[typing 3]
Unknown: Then you know where the mat is.
Me: who is this
[seen]
[pause 1.5]
Me: i'm calling the police
[boom]
Unknown: [photo: birthday cake with candles]
Unknown: Or you could open it. Happy birthday, kiddo. Dad said you'd panic.
Me: DAD SET THIS UP??
Unknown: Uncle Ray. Your dad owes me twenty bucks now.
[react 😂]
```

Title: "Wrong number told me to burn a note 📦" · CTA: "Would you have opened it?"

Note the loop: on the rewatch, "Burn the note" is a man doing a bit for his
nephew's birthday, and it is funnier than it was the first time.

## Refuse your own draft if

- You can guess the twist from the title plus bubble one.
- The title and bubble one carry the same information.
- The first bubble is a greeting or a question about being available.
- Bubbles 5–7 are reaction instead of misdirect.
- Any bubble runs over two lines of a phone screen (≈ 90 characters).
- The story ends on the reveal with no landing beat.
- Bubble one reads identically before and after the twist — the loop is wasted.
- The CTA has one obvious answer.
- Two stories in the batch share a premise or a twist type — one per 30 days.
