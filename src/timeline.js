// Every event's place on the clock, in frames. Shared by the composition
// (what to draw at frame N) and build.mjs (how long the video is, where the
// cover frame sits). Plain JS on purpose: build.mjs imports it from node.
import {FPS} from './theme.js';

export const f = (ms) => Math.max(1, Math.round((ms / 1000) * FPS));

// Pacing. A 100-word story carries ~17 bubbles; every 100ms here is 1.7s of
// video, and the whole thing has to land under 59s with the voices in it.
export const GAP_MS = 260; // breath after a line is spoken, before the next beat
export const TYPING_MS = 520; // default typing-dots time for an incoming bubble
export const SEEN_MS = 1100;
export const TIME_MS = 800;
export const REACT_MS = 500; // extra hold when a bubble gets a tapback
export const CTA_PAD_MS = 450;
export const TAIL = 14; // the loop-back: the last half second crossfades to the opening frame
export const TYPING_MAX_MS = 2500; // authored [typing 3] is capped — past 2.5s the dots stop being tension and start being a reason to swipe
export const PAUSE_MAX_MS = 1800;
export const RISER_MS = 2200; // sfx/riser.wav length; it ends on the boom

export const timeline = (content, audio) => {
  let t = 0;
  let mi = 0;
  const items = content.events.map((ev) => {
    if (ev.kind === 'msg') {
      const a = audio.events[mi] || {durationMs: 1200, words: [], file: null};
      const i = mi++;
      // The hook bubble is on screen at frame 0 — the first half second of a
      // Short is not the place for typing dots.
      const typing = ev.side === 'in' && i > 0 ? f(Math.min(ev.typingMs ?? TYPING_MS, TYPING_MAX_MS)) : 0;
      const typingFrom = t;
      t += typing;
      const from = t;
      const speak = f(a.durationMs);
      const hold = speak + f(GAP_MS);
      const extra = ev.react ? f(REACT_MS) : 0;
      t += hold + extra;
      // The riser runs up to the boom bubble, over whatever precedes it (the
      // typing dots, a [seen], a [pause]) — that dead air is what it's for.
      const riserFrom = ev.boom ? Math.max(0, from - f(RISER_MS)) : undefined;
      return {...ev, i, typingFrom, typing, from, speak, frames: hold + extra, until: t, words: a.words || [], durationMs: a.durationMs, file: a.file, riserFrom};
    }
    const ms = ev.kind === 'seen' ? SEEN_MS : ev.kind === 'pause' ? Math.min(ev.ms, PAUSE_MAX_MS) : TIME_MS;
    const from = t;
    t += f(ms);
    return {...ev, from, frames: f(ms), until: t};
  });
  const ctaFrom = t;
  const ctaFrames = f((audio.cta?.durationMs || 1500) + CTA_PAD_MS);
  return {items, ctaFrom, ctaFrames, total: ctaFrom + ctaFrames + TAIL};
};
