# Story bible — the chat-drama channel

Every video is a text conversation, voiced, 40-50 seconds. The viewer is a
stranger on the Shorts feed who gives it one second. Everything below exists
to win that second and then the next forty.

## The one rule

Decent. No sexual content, ever — not implied, not joked. Everything else is
open: creepy, dark, revenge, grief, betrayal, karma, scams, ghosts, the
supernatural, crime, family secrets. The linter bans the words; you own the tone.

## The shape (12-16 bubbles, 70-90 spoken words)

| Beat | Bubbles | Job |
|---|---|---|
| Hook | 1 | The first bubble is a claim a stranger would argue with. ≤ 10 words. Never a greeting. |
| Deny / escalate | 2-4 | The other side pushes back or the stakes rise. Short lines, fast. |
| Misdirect | 1-2 | Let the viewer form the wrong theory. This is what makes the twist land. |
| Dread | directive | `[seen]` + `[pause 1.5]`, or `[typing 3]` — the silence before the turn. |
| Turn | 1-2 | The reveal. Put `[boom]` on it. Show it: a `[photo:]`, a `[time]` jump, a name, a number. |
| Land | 1-3 | One beat *after* the twist: the laugh, the tear, or the door. Last line ≤ 8 words. |
| CTA | `cta` | A question the viewer answers in the comments, ≤ 7 words. |

Word budget is real: 100 words rendered at 54s. Cut the middle, never the turn.

## The lineup (series roster)

Rotate so no two consecutive days share a series. Cliffhanger Part 2 is the
exception and lands the next day. Voices are in `content/voices.json`; use
those exact speaker names.

| Series | Cast | What it is | Mix |
|---|---|---|---|
| Texts From Mom | Mom, Me | Overprotective, nosy, always three steps ahead — and always right in the end | funny / tearjerker |
| Dad Jokes Inc | Dad, Me | Deadpan dad, escalating bit, the joke hides a soft landing | funny |
| Grandma Learns Texting | Grandma, Me | Autocorrect, caps lock, Google confusion; she means every word | funny → tearjerker |
| Little Brother Logic | Bro or Kid, Me | Negotiations, blackmail with crayons, kid math | funny |
| Wrong Number | Unknown or Stranger, Me | A text meant for someone else — a kindness, a mystery, or a threat | twist / creepy |
| Group Chat Chaos | Mom, Dad, Sis, Bro (pov Me; contact "Family") | Four voices, one disaster, sender names shown | funny |
| Mr. Reyes, 3rd Period | Teacher, Me | Excuses vs. deadpan; the teacher always knows more | funny / tearjerker |
| Boss Texted at 11 PM | Boss, Me | Dread text, then a turn — the boss is human, or the boss is the problem | twist |
| Dog Sitter Updates | Neighbor or Bestie, Me | Escalating updates about the dog; the dog wins | funny |
| Roommate Notes | Roommate, Me | Fridge wars, passive aggression, a reveal | funny / twist |
| Unknown Number | Unknown, Me | Someone knows something they shouldn't. Creepy, PG, ends on a chill or a reveal | creepy |
| Last Message | any, Me | A conversation that turns out to be the last one, or the first one after a loss | tearjerker |

Target mix per 30 days: ~12 funny, ~10 twist/creepy, ~8 tearjerker. Two-part
cliffhangers: at most 3 per 30 days, always creepy/twist, Part 2 pays off fully.

## Hook formulas (first bubble)

- **The accusation:** "I found a receipt in your jacket." / "Why is there a second phone in your drawer"
- **The impossible fact:** "Your dad is standing in our kitchen." (Dad died in 2019) / "The dog just texted me."
- **The confession:** "I did something and I need you to not be mad."
- **The threat, calm:** "Come home. Don't ask why. Just come."
- **Wrong-number opener:** "The package is under the mat. Burn the note."
- **Kid logic:** "I have a business proposal for you."
- **The countdown:** "You have 10 minutes before Mom sees the kitchen."

Never: "hey", "hi", "you up?", "can we talk?" — those are the setup a viewer
scrolls past. Start in the middle.

## Twist types that work on Shorts

1. **The gift disguised as a crime** — the $400 receipt is a ring for Mom.
2. **The wrong theory** — viewer thinks affair-adjacent; it's a surprise party, a diagnosis, a lost dog.
3. **The identity flip** — the "stranger" is your brother's new phone; the "boss" is your mom's boss.
4. **The time jump** — `[time 6 hours later]` and everything changed.
5. **The receipt** — `[photo:]` of the thing that proves it.
6. **The echo** — the last line repeats the first line with its meaning inverted.
7. **The dread payoff (creepy)** — the person texting is in the house / has your old number / is the one you're describing.
8. **The kid wins** — the negotiation ends with the adult outplayed.

## Voice rules (how each character texts)

- **Mom**: full sentences, capital letters, periods. Occasionally ALL CAPS. Never abbreviations. Says "young lady" / "young man".
- **Dad**: short. Dry. Punctuation optional. One emoji per story, max, and it's wrong.
- **Grandma**: ALL CAPS or autocorrect fails, "Love, Grandma" signed at the end of texts.
- **Me** (teen / young adult): lowercase, no periods, "omg", "wait", "bruh" allowed. Types fast, sends three bubbles in a row when panicking.
- **Bro / Kid**: lowercase, wrong spelling on purpose (one per story), demands.
- **Teacher / Boss**: formal, then one line that breaks the formality.
- **Unknown / Stranger**: correct grammar, no emoji, short sentences. Calm is creepier than caps.
- **Group chat**: each person answers out of order; Dad answers the previous question.

The slang expander reads "u", "ur", "omg", "idk", "rn", "lol" etc. as words —
use them freely in the *Me/Bro* voice. Emoji are silent, so a bubble that is
only emoji is a beat of silence: use it once, on purpose.

## Directives, the way they're meant to be used

```
[typing 3]      only before the turn; default typing is automatic (engine caps at 2.5s)
[seen]          after an OUTGOING bubble — "they read it and said nothing"
[pause 1.5]     dead air; engine caps at 1.8s
[time ...]      "2 hours later", "Next morning", "3 missed calls later"
[react ❤️]      after a bubble that earned it; 😂 🔥 😭 also work
[boom]          the reveal bubble, once per story. The engine plays a 2.2s riser
                into it, then bass + flash + shake — so put 2s of [typing]/[seen]/[pause]
                directly before it; that dead air is what the riser fills.
Name: [photo: three-word search]   the proof; concrete nouns search best
```

**Photo beats are not optional.** Every story gets one, two at most, at the
line where a real object enters: the keys on the counter, the car door left
open, the burnt cake, the dented bumper, the ring box. It is what makes the
conversation read as two people with phones instead of a script. Rules:
- Put it right after the line that mentions the thing (or before, when the
  photo *is* the answer — "rainy" after a photo of rain on a window).
- Search terms are 2-4 concrete words with a place: "keys on kitchen counter",
  "car door left open driveway", "open window at night". No adjectives like
  "beautiful", no moods. The picker scores the top 25 hits and takes the most
  casual, real-world one; it can only do that if the term names a scene.
- Ask for the scene, never the person. "backyard fence at dusk", not "man
  standing in backyard"; "blanket on couch", not "woman asleep on couch".
  Pixabay's people photos are posed models and the picker can't fix that;
  a scene with nobody in it reads as a phone snapshot every time.
- The sender is whoever would have taken it. Mom photographs the mess; the
  stranger photographs the window; Me photographs the proof.
- A photo is silent and holds 1.4s. It is a beat, not a bubble — don't put
  one where the pace needs to run.

## Titles (the yellow headline)

The title is the thumbnail. ≤ 60 characters reads at 62px; ≤ 45 is better.
Formula: **who + what happened + one emoji**. Present tense or "just".
- "Mom found a $400 jewelry receipt in my jacket 💍"
- "Wrong number asked me to hide a package 📦"
- "Grandma texted the family group chat at 3 AM 🍪"
- "My boss texted 'we need to talk' at 11 PM 👔"
- "Dad's been texting my dead grandpa's number 📱"

## Description, hashtags, pinned

- **description**: two sentences, the premise without the twist, then a hook for the comments. No spoilers.
- **hashtags**: 4-6, always `#textstory #chatstory`, plus the series (`#momtexts`, `#dadjokes`, `#wrongnumber`, `#creepy`, `#storytime`).
- **pinned**: the comment question, or "Part 2 is up 👀" for a Part 2.

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

## Refuse your own draft if

- You can guess the twist from the title plus bubble one.
- The first bubble is a greeting or a question about being available.
- Any bubble is over two lines of a phone screen (≈ 90 characters).
- The story ends on the reveal with no landing beat.
- Two stories in the batch share a premise (a hidden ring, a surprise party) — one per 30 days.
