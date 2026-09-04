export const FPS = 30;
export const W = 1080;
export const H = 1920;

// YouTube overlays its own UI over the bottom of a Short. Nothing that has to
// be read goes below this line.
export const SAFE_BOTTOM = 1640;

// Three phone skins. The default is iMessage dark with a yellow-on-black
// headline — the look the biggest text-story channels converged on: it pops
// in a feed of bright videos and yellow/black is the highest-contrast pair on
// a phone. The others exist for the sheet's `skin` column (or `auto` to
// rotate by date) so a series can have its own look.
export const SKINS = {
  dark: {
    bg: '#000000', header: '#141416', line: '#2A2A2E', inBg: '#26252A', inText: '#FFFFFF',
    outBg: '#0A84FF', outText: '#FFFFFF', text: '#FFFFFF', sub: '#8E8E93', input: '#1C1C1E',
    headline: '#111111', headlineBg: '#FFE14D', typing: '#8E8E93', online: '#30D158',
  },
  light: {
    bg: '#FFFFFF', header: '#F7F7F8', line: '#E3E3E6', inBg: '#E9E9EB', inText: '#111111',
    outBg: '#0B93F6', outText: '#FFFFFF', text: '#111111', sub: '#8E8E93', input: '#F2F2F7',
    headline: '#FFFFFF', headlineBg: '#FF3B30', typing: '#8E8E93', online: '#34C759',
  },
  green: {
    bg: '#0B141A', header: '#1F2C34', line: '#2A3942', inBg: '#202C33', inText: '#E9EDEF',
    outBg: '#005C4B', outText: '#E9EDEF', text: '#E9EDEF', sub: '#8696A0', input: '#1F2C34',
    headline: '#0B141A', headlineBg: '#25D366', typing: '#8696A0', online: '#25D366', pattern: true,
  },
};

export const hashOf = (s) => {
  let h = 2166136261;
  for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
};

export const pickSkin = (id, want) => {
  if (want && SKINS[want]) return want;
  if (want === 'auto') {
    const keys = Object.keys(SKINS);
    return keys[hashOf(id) % keys.length];
  }
  return 'dark';
};

const CLOCKS = ['9:41', '10:07', '11:23', '7:52', '8:15', '12:04', '6:38', '9:58', '10:31'];
export const clockOf = (id) => CLOCKS[hashOf(id + 'clock') % CLOCKS.length];
