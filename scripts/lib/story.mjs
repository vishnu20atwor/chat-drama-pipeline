// The story grammar. One `script` cell per story, one line per beat:
//
//   Mom: Why is there a "Tiffany" in your phone      a bubble
//   Me: that's my dentist                             the POV side (right, blue)
//   [typing 2]        the next incoming bubble shows the typing dots for 2s
//   [seen]            "Read" under the last outgoing bubble, then a 1.2s hold
//   [pause 2]         2s of nothing — the dread beat
//   [time 2 hours later]   a centered separator line
//   [react ❤️]        a tapback on the previous bubble
//   [boom]            the next bubble lands with a bass hit and a punch-in
//
// This file turns that text into events, and refuses the ones that would make
// a bad video. sheet.mjs, refill.mjs and lint.mjs all go through here.
import {readFileSync} from 'node:fs';

export const CAST = JSON.parse(readFileSync(new URL('../../content/voices.json', import.meta.url), 'utf8'));

export const LIMITS = {
  minMessages: 10,
  maxMessages: 20,
  bubbleChars: 120,
  hookWords: 10, // the first bubble is the hook; a stranger reads it in one glance
  // Measured: 100 words over 17 bubbles rendered at 54s. Overhead is ~0.8s a
  // bubble plus the directives, so the sweet spot is 70-90 words, 12-16 bubbles.
  wordsWarn: 95, // ≈ 50s
  wordsFail: 115, // ≈ 57s — Shorts cut off at 60
  titleChars: 100,
};

// The operator's one content rule: decent. Creepy, dark, revenge, tearjerker,
// betrayal are all in — sexual content is out. Matched on the spoken text.
const BANNED =
  /\b(sleeping with|slept with|hook(ed)? up|nudes?|sext(ing)?|one night stand|strip(per|ping)|porn|horny|sexy|sex|virgin|condom|rape[ds]?)\b/i;

const num = (v, d) => (v === undefined || v === '' ? d : Number(v));

// script text → events
export const parse = (script, pov = 'Me') => {
  const events = [];
  let pending = {}; // typing/boom directives waiting for the next message
  for (const raw of script.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    const dir = line.match(/^\[(\w+)(?::?\s*(.*?))?\]$/);
    if (dir) {
      const [, k, arg] = dir;
      if (k === 'typing') pending.typingMs = num(arg, 2) * 1000;
      else if (k === 'boom') pending.boom = true;
      else if (k === 'seen') events.push({kind: 'seen'});
      else if (k === 'pause') events.push({kind: 'pause', ms: num(arg, 1.5) * 1000});
      else if (k === 'time') events.push({kind: 'time', text: arg || 'Later'});
      else if (k === 'react') {
        const prev = [...events].reverse().find((e) => e.kind === 'msg');
        if (!prev) throw new Error('[react] before any message');
        prev.react = arg || '❤️';
      } else throw new Error(`unknown directive "${line}"`);
      continue;
    }

    const m = line.match(/^([A-Za-z][\w .'-]{0,20}?):\s*(.+)$/);
    if (!m) throw new Error(`can't read line "${line}" — expected "Name: text" or a [directive]`);
    const [, who, body] = m;
    const ev = {kind: 'msg', who, side: who === pov ? 'out' : 'in', ...pending};
    ev.text = body;
    ev.say = spoken(body); // what the voice reads; tts.py uses this, never `text`
    events.push(ev);
    pending = {};
  }
  if (Object.keys(pending).length) throw new Error('the script ends with a [typing]/[boom] that has no message after it');
  return events;
};

// What the voice says. Emoji are silent; texting shorthand is read as words,
// because "u r" spoken as letters breaks the illusion that a person is talking.
const SLANG = {
  u: 'you', ur: 'your', r: 'are', rn: 'right now', idk: "I don't know", idc: "I don't care", omg: 'oh my god',
  omw: 'on my way', tbh: 'to be honest', btw: 'by the way', lol: 'haha', lmao: 'haha', wtf: 'what the heck',
  wth: 'what the heck', brb: 'be right back', ily: 'I love you', ty: 'thank you', thx: 'thanks', pls: 'please',
  plz: 'please', k: 'okay', ok: 'okay', nvm: 'never mind', fr: 'for real', ngl: 'not gonna lie', bc: 'because',
  cuz: 'because', ppl: 'people', tmrw: 'tomorrow', tmr: 'tomorrow', gn: 'good night', gm: 'good morning',
  smh: 'shaking my head', imo: 'in my opinion', irl: 'in real life', jk: 'just kidding', np: 'no problem',
  yw: "you're welcome", ikr: 'I know right', wyd: 'what are you doing', hbu: 'how about you', bff: 'best friend',
};
export const spoken = (text) =>
  text
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, ' ')
    .replace(/\*([^*]+)\*/g, '$1') // *sigh* → sigh
    .split(/(\s+)/)
    .map((w) => {
      const tail = w.match(/[?!.,]+$/)?.[0] || '';
      const core = w.slice(0, w.length - tail.length).toLowerCase();
      return SLANG[core] ? SLANG[core] + tail : w;
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();

const words = (t) => t.split(/\s+/).filter(Boolean).length;

// Deterministic: the same unknown name always gets the same voice.
const POOL = Object.values(CAST).filter((v) => v.pool !== false);
const fallbackVoice = (name) => {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return {...POOL[h % POOL.length], emoji: '👤'};
};

// A story row (from the sheet or a refill file) → {errors, warnings, content}.
export const check = (row) => {
  const errors = [];
  const warnings = [];
  const pov = row.pov || 'Me';
  let events = [];
  try {
    events = parse(row.script || '', pov);
  } catch (e) {
    errors.push(e.message);
  }
  const msgs = events.filter((e) => e.kind === 'msg');
  const texts = msgs.filter((m) => m.text);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date || '')) errors.push(`bad date "${row.date}"`);
  if (!row.title) errors.push('no title');
  else if (row.title.length > LIMITS.titleChars) errors.push(`title is ${row.title.length} chars (max ${LIMITS.titleChars})`);
  if (msgs.length < LIMITS.minMessages) errors.push(`${msgs.length} messages — under ${LIMITS.minMessages}, too thin for a story`);
  if (msgs.length > LIMITS.maxMessages) errors.push(`${msgs.length} messages — over ${LIMITS.maxMessages}, cut the middle`);
  for (const m of texts) {
    if (m.text.length > LIMITS.bubbleChars) errors.push(`bubble over ${LIMITS.bubbleChars} chars: "${m.text.slice(0, 40)}…"`);
    if (BANNED.test(spoken(m.text))) errors.push(`off-brand theme in "${m.text}"`);
  }
  if (texts[0] && words(texts[0].text) > LIMITS.hookWords) {
    errors.push(`hook is ${words(texts[0].text)} words — the first bubble must land in ${LIMITS.hookWords}`);
  }
  const speakers = new Set(msgs.map((m) => m.who));
  if (speakers.size < 2) errors.push('only one speaker');
  for (const s of speakers) if (!CAST[s]) warnings.push(`"${s}" has no voice in content/voices.json — a fallback voice will be picked`);
  const total = texts.reduce((a, m) => a + words(spoken(m.text)), 0) + words(row.cta || '');
  if (total > LIMITS.wordsFail) errors.push(`${total} spoken words — over ${LIMITS.wordsFail}, it will not fit in a Short`);
  else if (total > LIMITS.wordsWarn) warnings.push(`${total} spoken words — over ${LIMITS.wordsWarn}, a stranger may not finish it`);
  if (!msgs.some((m) => m.boom) && !events.some((e) => e.kind === 'seen' || e.kind === 'pause')) {
    warnings.push('no [boom], [seen] or [pause] — the twist has no beat around it');
  }

  const content = {
    id: row.date,
    title: row.title,
    series: row.series || '',
    part: row.part ? Number(row.part) : undefined,
    pov,
    contact: row.contact || msgs.find((m) => m.side === 'in')?.who || 'Unknown',
    skin: row.skin || '',
    // Optional. Overrides the series' bed in channel.json, so a mostly-funny
    // show can still have its sad episode. Blank means "whatever the series is".
    mood: row.mood || '',
    cta: row.cta || 'Follow for tomorrow’s story 👀',
    ctaSay: spoken(row.cta || 'Follow for tomorrow’s story'),
    description: row.description || '',
    hashtags: (row.hashtags || '').split(/[ ,]+/).filter(Boolean),
    pinned: row.pinned || '',
    events,
    cast: Object.fromEntries([...speakers].map((s) => [s, CAST[s] || fallbackVoice(s)])),
  };
  return {errors, warnings, content, words: total};
};

// Minimal CSV reader and writer — quoted fields with embedded newlines, which
// is what the script column is made of.
export const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (c !== '\r') cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const head = rows.shift().map((h) => h.trim().toLowerCase());
  return rows
    .filter((r) => r.some((v) => v.trim()))
    .map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])));
};

export const COLUMNS = ['date', 'series', 'part', 'title', 'pov', 'contact', 'skin', 'mood', 'script', 'cta', 'description', 'hashtags', 'pinned'];
const cell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCsv = (rows) => [COLUMNS.join(','), ...rows.map((r) => COLUMNS.map((c) => cell(r[c])).join(','))].join('\n') + '\n';
