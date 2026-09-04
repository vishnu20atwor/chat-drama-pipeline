import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont} from '@remotion/google-fonts/Inter';
import {measureText} from '@remotion/layout-utils';
import {FPS, H, SAFE_BOTTOM, SKINS, W, clockOf, hashOf, pickSkin} from './theme.js';
import {RISER_MS, TAIL, f, timeline} from './timeline.js';

const {fontFamily} = loadFont('normal', {weights: ['400', '500', '600', '700', '800'], subsets: ['latin']});
// Emoji fall through to the platform colour font: Segoe on Windows, Noto on
// the Linux runner (installed by the workflow).
const FONT = `${fontFamily}, "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;

// --- layout (y positions on a 1080x1920 canvas) ------------------------------
const STATUS_H = 64;
const HEADER_Y = STATUS_H;
const HEADER_H = 128;
const HEADLINE_Y = HEADER_Y + HEADER_H;
const HEADLINE_H = 200;
const PROGRESS_H = 8;
const CHAT_Y = HEADLINE_Y + HEADLINE_H + PROGRESS_H + 6;
const INPUT_H = 84;
const INPUT_Y = SAFE_BOTTOM - INPUT_H;
const CHAT_H = INPUT_Y - CHAT_Y - 12;

const PAD_X = 32;
const BUBBLE_MAX = 830; // px, ≈77% of the width — a touch wider than a real phone, for legibility at Shorts size
const BUBBLE_PAD_X = 30;
const BUBBLE_PAD_Y = 20;
const TEXT_PX = 47;
const LINE_H = 60;
const RADIUS = 38;
const GAP = 12; // between bubbles of the same sender
const RUN_GAP = 26; // when the sender changes
const NAME_H = 40; // sender name above a bubble, group chats only
const PHOTO_W = 600;
const PHOTO_H = 440;
const TYPING_H = 76;
const TIME_H = 64;
const SEEN_H = 36;
const OPENING_FRAME = 24; // the settled hook: what the loop-back returns to, and the cover

// One colour per sender, like WhatsApp groups: the joke in a group chat is
// who said it, and grey names at 30px don't carry that on a phone.
const NAME_COLORS = ['#FF7A7A', '#5AC8FA', '#FFD60A', '#BF5AF2', '#30D158', '#FF9F0A', '#64D2FF', '#FF6482'];
const nameColor = (name, order) => NAME_COLORS[(order.indexOf(name) + (hashOf(order[0] || '') % 3)) % NAME_COLORS.length];

export const calcMeta = ({props}) => ({durationInFrames: timeline(props.content, props.audio).total});

// --- text measuring ----------------------------------------------------------
// Bubble heights have to be known up front so the list can scroll smoothly.
// Greedy word-wrap with real glyph widths; off by a line once in a blue moon,
// never by more, and nothing accumulates because every frame recomputes.
const textWidth = (text, weight = '500') => {
  try {
    return measureText({text, fontFamily, fontSize: TEXT_PX, fontWeight: weight}).width;
  } catch {
    return text.length * TEXT_PX * 0.52;
  }
};
const linesOf = (text) => {
  const max = BUBBLE_MAX - BUBBLE_PAD_X * 2;
  const space = textWidth(' ');
  let lines = 1;
  let cur = 0;
  for (const w of text.split(' ')) {
    const ww = Math.min(textWidth(w), max);
    if (cur > 0 && cur + space + ww > max) {
      lines++;
      cur = ww;
    } else cur += (cur ? space : 0) + ww;
  }
  return lines;
};

const ease = (n, from, len) => interpolate(n, [from, from + len], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

// --- pieces ------------------------------------------------------------------
const StatusBar = ({skin, clock}) => (
  <div style={{position: 'absolute', top: 0, left: 0, width: W, height: STATUS_H, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${PAD_X + 12}px`, color: skin.text, fontFamily: FONT, fontSize: 30, fontWeight: 700}}>
    <span>{clock}</span>
    <span style={{display: 'flex', gap: 14, alignItems: 'center', fontSize: 26}}>
      <span>●●●●</span>
      <span style={{fontWeight: 600}}>5G</span>
      <span style={{display: 'inline-block', width: 54, height: 26, border: `3px solid ${skin.text}`, borderRadius: 8, position: 'relative'}}>
        <span style={{position: 'absolute', left: 3, top: 3, bottom: 3, width: '68%', background: skin.text, borderRadius: 3}} />
      </span>
    </span>
  </div>
);

const Header = ({skin, content, group}) => {
  const who = content.cast[content.contact] || {emoji: group ? '👥' : '👤'};
  const sub = group ? `${Object.keys(content.cast).filter((n) => n !== content.pov).join(', ')}` : 'Active now';
  return (
    <div style={{position: 'absolute', top: HEADER_Y, left: 0, width: W, height: HEADER_H, background: skin.header, borderBottom: `2px solid ${skin.line}`, display: 'flex', alignItems: 'center', padding: `0 ${PAD_X}px`, fontFamily: FONT}}>
      <span style={{color: skin.outBg, fontSize: 44, fontWeight: 600, marginRight: 22}}>‹</span>
      <div style={{width: 88, height: 88, borderRadius: 44, background: skin.inBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 50, marginRight: 22, position: 'relative'}}>
        <span>{who.emoji || '👤'}</span>
        {!group && <span style={{position: 'absolute', right: 2, bottom: 2, width: 22, height: 22, borderRadius: 11, background: skin.online, border: `4px solid ${skin.header}`}} />}
      </div>
      <div style={{flex: 1, minWidth: 0}}>
        <div style={{color: skin.text, fontSize: 38, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{content.contact}</div>
        <div style={{color: skin.sub, fontSize: 26, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{sub}</div>
      </div>
      {content.part ? (
        <div style={{background: skin.headlineBg, color: skin.headline, fontSize: 26, fontWeight: 800, padding: '8px 18px', borderRadius: 999, marginLeft: 12}}>PART {content.part}</div>
      ) : null}
    </div>
  );
};

// The thumbnail text: the title, big, in a bright block. Fully readable at
// frame 0 — the feed's first frame is the thumbnail, and a fade-in would
// hand YouTube a black card.
const Headline = ({skin, title, frame}) => {
  const {fps} = useVideoConfig();
  const s = spring({frame, fps, config: {damping: 14, stiffness: 170, mass: 0.7}});
  const px = title.length > 60 ? 48 : title.length > 40 ? 54 : 62;
  return (
    <div style={{position: 'absolute', top: HEADLINE_Y, left: 0, width: W, height: HEADLINE_H, display: 'flex', alignItems: 'center', padding: `0 ${PAD_X}px`}}>
      <div style={{background: skin.headlineBg, color: skin.headline, fontFamily: FONT, fontWeight: 800, fontSize: px, lineHeight: 1.12, padding: '18px 26px', borderRadius: 22, transform: `scale(${1.07 - 0.07 * s}) rotate(-1deg)`, maxWidth: W - PAD_X * 2, boxShadow: '0 12px 40px rgba(0,0,0,0.25)'}}>
        {title}
      </div>
    </div>
  );
};

// A thin bar under the headline that fills over the video. "It's short, stay"
// — the cheapest completion-rate lever there is.
const Progress = ({skin, frame, total}) => (
  <div style={{position: 'absolute', top: HEADLINE_Y + HEADLINE_H, left: PAD_X, width: W - PAD_X * 2, height: PROGRESS_H, borderRadius: 4, background: skin.line}}>
    <div style={{width: `${Math.min(100, (100 * frame) / total)}%`, height: '100%', borderRadius: 4, background: skin.headlineBg}} />
  </div>
);

const Typing = ({skin, frame}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 10, background: skin.inBg, borderRadius: RADIUS, height: TYPING_H, padding: `0 ${BUBBLE_PAD_X}px`, width: 130}}>
    {[0, 1, 2].map((k) => {
      const y = Math.sin((frame / 5 + k * 1.1) % (Math.PI * 2)) * 6;
      return <span key={k} style={{width: 18, height: 18, borderRadius: 9, background: skin.typing, transform: `translateY(${y}px)`, opacity: 0.55 + 0.45 * Math.max(0, Math.sin(frame / 5 + k * 1.1))}} />;
    })}
  </div>
);

const Words = ({text, item, frame, color, cover}) => {
  const parts = text.split(' ');
  let lit = parts.length;
  if (!cover && frame < item.from + item.speak) {
    const ms = ((frame - item.from) / FPS) * 1000;
    if (item.words.length === parts.length) lit = item.words.filter((w) => w.t <= ms + 40).length;
    else lit = Math.floor((parts.length * ms) / Math.max(1, item.durationMs));
  }
  return parts.map((w, k) => (
    <span key={k} style={{color, opacity: k < lit ? 1 : 0.5, transition: 'none'}}>
      {w}
      {k < parts.length - 1 ? ' ' : ''}
    </span>
  ));
};

const Bubble = ({item, skin, frame, showName, cover, photoFile, names}) => {
  const {fps} = useVideoConfig();
  const out = item.side === 'out';
  // The hook bubble is pre-rolled so it is already on screen at frame 0 —
  // that frame is the feed thumbnail.
  const s = spring({frame: frame - item.from + (item.i === 0 ? 6 : 0), fps, config: {damping: 15, stiffness: 190, mass: 0.7}});
  const reactAt = item.until - Math.round(0.65 * fps);
  const rs = item.react ? spring({frame: frame - reactAt, fps, config: {damping: 10, stiffness: 220}}) : 0;
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: out ? 'flex-end' : 'flex-start', transformOrigin: out ? 'right bottom' : 'left bottom', transform: `scale(${0.7 + 0.3 * s}) translateY(${(1 - s) * 26}px)`, opacity: Math.min(1, s * 1.4)}}>
      {showName && <div style={{color: nameColor(item.who, names), fontFamily: FONT, fontSize: 30, fontWeight: 700, height: NAME_H, lineHeight: `${NAME_H}px`, paddingLeft: 18}}>{item.who}</div>}
      <div style={{position: 'relative'}}>
        {item.photo ? (
          <div style={{width: PHOTO_W, height: PHOTO_H, borderRadius: RADIUS, overflow: 'hidden', background: skin.inBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 90}}>
            {photoFile ? <Img src={staticFile(photoFile)} style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : <span>📷</span>}
          </div>
        ) : (
          <div style={{background: out ? skin.outBg : skin.inBg, borderRadius: RADIUS, padding: `${BUBBLE_PAD_Y}px ${BUBBLE_PAD_X}px`, maxWidth: BUBBLE_MAX, fontFamily: FONT, fontSize: TEXT_PX, lineHeight: `${LINE_H}px`, fontWeight: 500, whiteSpace: 'pre-wrap', wordBreak: 'break-word', [out ? 'borderBottomRightRadius' : 'borderBottomLeftRadius']: 10}}>
            <Words text={item.text} item={item} frame={frame} color={out ? skin.outText : skin.inText} cover={cover} />
          </div>
        )}
        {item.react && rs > 0 ? (
          <div style={{position: 'absolute', top: -34, [out ? 'left' : 'right']: -18, background: skin.header, border: `3px solid ${skin.line}`, borderRadius: 999, padding: '6px 16px', fontSize: 46, lineHeight: 1.1, transform: `scale(${rs})`, fontFamily: FONT, boxShadow: '0 6px 18px rgba(0,0,0,0.25)'}}>
            {item.react}
          </div>
        ) : null}
      </div>
    </div>
  );
};

// --- the picture at one frame ------------------------------------------------
// Everything visible, as a function of `frame`. Rendered twice at the end:
// once for the real frame and once at OPENING_FRAME, crossfaded, so the
// video loops back onto its own hook and a replay feels seamless.
const Screen = ({content, tl, heights, group, inSpeakers, skin, frame}) => {
  const {fps} = useVideoConfig();
  const clock = clockOf(content.id);
  const rows = [{kind: 'time', item: {text: `Today ${clock}`}, h: TIME_H, gap: 0}];
  let total = TIME_H;
  let prevWho = null;
  let prevSide = null;
  const ENTER = 9;
  for (let k = 0; k < tl.items.length; k++) {
    const it = tl.items[k];
    // "Read" is a receipt on *your* message. After an incoming bubble the
    // beat still holds, but nothing is drawn.
    if (it.kind === 'seen' && prevSide !== 'out') continue;
    if (it.kind === 'msg' && it.typing && frame >= it.typingFrom && frame < it.from) {
      const p = ease(frame, it.typingFrom, 6);
      const gap = prevWho === it.who ? GAP : RUN_GAP;
      rows.push({kind: 'typing', h: TYPING_H * p, gap});
      total += (TYPING_H + gap) * p;
      break;
    }
    if (frame < it.from) break;
    if (it.kind === 'pause') continue;
    // The slot grows with the entrance and clips the bubble while it does, so
    // the scroll offset and the drawn bubble agree on every frame. The hook
    // bubble is pre-rolled: frame 0 is the feed thumbnail.
    const p = ease(frame + (it.kind === 'msg' && it.i === 0 ? 6 : 0), it.from, ENTER);
    let h = heights[k];
    let gap = 0;
    let showName = false;
    if (it.kind === 'msg') {
      gap = prevWho === it.who ? GAP : RUN_GAP;
      showName = group && it.side === 'in' && prevWho !== it.who;
      if (showName) h += NAME_H;
      prevWho = it.who;
      prevSide = it.side;
    } else gap = RUN_GAP;
    rows.push({kind: it.kind, item: it, h, gap, showName, p});
    total += (h + gap) * p;
  }
  const offset = Math.max(0, total - CHAT_H);

  // The twist beat: punch-in, a flash, and a shake on a [boom] bubble.
  const boom = tl.items.find((it) => it.boom && frame >= it.from && frame < it.from + 10);
  const bp = boom ? 1 - ease(frame, boom.from, 10) : 0;
  const punch = 1 + 0.05 * bp;
  const flash = boom ? 0.16 * (1 - ease(frame, boom.from, 4)) : 0;
  const shakeX = boom ? Math.sin(frame * 7.3) * 9 * bp : 0;
  const shakeY = boom ? Math.cos(frame * 5.1) * 6 * bp : 0;

  const cta = frame >= tl.ctaFrom;
  const ctaS = cta ? spring({frame: frame - tl.ctaFrom, fps, config: {damping: 14, stiffness: 150}}) : 0;

  return (
    <AbsoluteFill style={{background: skin.bg, fontFamily: FONT}}>
      {skin.pattern && (
        <AbsoluteFill style={{opacity: 0.06, backgroundImage: 'radial-gradient(circle at 20px 20px, #fff 2px, transparent 3px)', backgroundSize: '80px 80px'}} />
      )}
      <AbsoluteFill style={{transform: `translate(${shakeX}px, ${shakeY}px) scale(${punch})`, transformOrigin: '50% 45%'}}>
        <StatusBar skin={skin} clock={clock} />
        <Header skin={skin} content={content} group={group} />
        <Headline skin={skin} title={content.title} frame={frame} />
        <Progress skin={skin} frame={frame} total={tl.ctaFrom} />

        <div style={{position: 'absolute', top: CHAT_Y, left: 0, width: W, height: CHAT_H, overflow: 'hidden'}}>
          <div style={{position: 'absolute', left: PAD_X, right: PAD_X, top: 0, transform: `translateY(${-offset}px)`}}>
            {rows.map((r, k) => (
              <div key={k} style={{marginTop: r.gap * (r.p ?? 1), height: r.kind === 'typing' ? r.h : r.p !== undefined && r.p < 1 ? r.h * r.p : undefined, overflow: r.kind === 'typing' || (r.p !== undefined && r.p < 1) ? 'hidden' : 'visible'}}>
                {r.kind === 'typing' && <Typing skin={skin} frame={frame} />}
                {r.kind === 'msg' && <Bubble item={r.item} skin={skin} frame={frame} showName={r.showName} cover={content.cover} photoFile={r.item.photoFile} names={[...inSpeakers]} />}
                {r.kind === 'time' && <div style={{height: TIME_H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: skin.sub, fontSize: 26, fontWeight: 600}}>{r.item.text}</div>}
                {r.kind === 'seen' && <div style={{height: SEEN_H, textAlign: 'right', color: skin.sub, fontSize: 24, fontWeight: 600, paddingRight: 8}}>Read</div>}
              </div>
            ))}
          </div>
          {/* older bubbles fade out under the headline instead of being guillotined */}
          <div style={{position: 'absolute', top: 0, left: 0, right: 0, height: 90, background: `linear-gradient(${skin.bg}, ${skin.bg}00)`}} />
        </div>

        <div style={{position: 'absolute', top: INPUT_Y, left: 0, width: W, height: INPUT_H, display: 'flex', alignItems: 'center', padding: `0 ${PAD_X}px`, gap: 18}}>
          <span style={{color: skin.sub, fontSize: 40}}>＋</span>
          <div style={{flex: 1, height: 64, borderRadius: 32, background: skin.input, border: `2px solid ${skin.line}`, display: 'flex', alignItems: 'center', padding: '0 26px', color: skin.sub, fontSize: 30}}>
            {skin.pattern ? 'Message' : 'iMessage'}
          </div>
          <span style={{color: skin.sub, fontSize: 36}}>🎤</span>
        </div>

        {content.series ? (
          <div style={{position: 'absolute', top: SAFE_BOTTOM + 30, width: W, textAlign: 'center', color: skin.sub, fontSize: 28, fontWeight: 600, opacity: 0.8}}>
            {content.series}
            {content.part ? ` · Part ${content.part}` : ''}
          </div>
        ) : null}
      </AbsoluteFill>

      {flash > 0 && <AbsoluteFill style={{background: '#fff', opacity: flash}} />}

      {cta && !content.cover && (
        <AbsoluteFill style={{background: `rgba(0,0,0,${0.78 * Math.min(1, ctaS * 1.5)})`, backdropFilter: `blur(${16 * Math.min(1, ctaS * 1.5)}px)`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div style={{transform: `scale(${0.8 + 0.2 * ctaS})`, opacity: ctaS, textAlign: 'center', padding: '0 80px', marginBottom: 300}}>
            <div style={{color: '#fff', fontSize: 72, fontWeight: 800, lineHeight: 1.15, textShadow: '0 8px 30px rgba(0,0,0,0.6)'}}>{content.cta}</div>
            <div style={{color: '#fff', opacity: 0.8, fontSize: 32, fontWeight: 600, marginTop: 28}}>👇 comment · new story every day</div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// --- the composition ---------------------------------------------------------
export const Chat = ({content, audio}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const skin = SKINS[pickSkin(content.id, content.skin)];
  const tl = useMemo(() => timeline(content, audio), [content, audio]);
  const inSpeakers = new Set(content.events.filter((e) => e.kind === 'msg' && e.side === 'in').map((e) => e.who));
  const group = inSpeakers.size > 1;

  // Heights, once.
  const heights = useMemo(
    () =>
      tl.items.map((it) => {
        if (it.kind === 'msg') return it.photo ? PHOTO_H : linesOf(it.text) * LINE_H + BUBBLE_PAD_Y * 2;
        if (it.kind === 'time') return TIME_H;
        if (it.kind === 'seen') return SEEN_H;
        return 0; // pause: nothing on screen
      }),
    [tl]
  );

  const screen = {content, tl, heights, group, inSpeakers, skin};
  const loopFrom = tl.total - TAIL;
  const loop = !content.cover && frame >= loopFrom ? ease(frame, loopFrom, TAIL - 2) : 0;

  return (
    <AbsoluteFill style={{background: skin.bg}}>
      <Screen {...screen} frame={frame} />
      {loop > 0 && (
        <AbsoluteFill style={{opacity: loop}}>
          <Screen {...screen} frame={OPENING_FRAME} />
        </AbsoluteFill>
      )}

      {/* --- audio --- */}
      {!content.cover && (
        <>
          <Audio src={staticFile('music/bed.wav')} volume={0.11} loop />
          {tl.items
            .filter((it) => it.kind === 'msg')
            .map((it) => (
              <React.Fragment key={it.i}>
                <Sequence from={it.from} durationInFrames={20}>
                  <Audio src={staticFile(`sfx/${it.side === 'in' ? 'pop' : 'send'}.wav`)} volume={0.7} />
                </Sequence>
                {it.boom && (
                  <>
                    {/* the riser's loud end must land on the boom, so an early boom trims its start, not its end */}
                    <Sequence from={it.riserFrom} durationInFrames={it.from - it.riserFrom + 2}>
                      <Audio src={staticFile('sfx/riser.wav')} volume={0.8} startFrom={Math.max(0, f(RISER_MS) - (it.from - it.riserFrom))} />
                    </Sequence>
                    <Sequence from={it.from} durationInFrames={30}>
                      <Audio src={staticFile('sfx/boom.wav')} volume={0.9} />
                    </Sequence>
                  </>
                )}
                {it.file && (
                  <Sequence from={it.from} durationInFrames={Math.ceil((it.durationMs / 1000) * fps) + 6}>
                    <Audio src={staticFile(`vo/${content.id}/${it.file}`)} />
                  </Sequence>
                )}
              </React.Fragment>
            ))}
          {audio.cta?.file && (
            <Sequence from={tl.ctaFrom} durationInFrames={tl.ctaFrames}>
              <Audio src={staticFile(`vo/${content.id}/${audio.cta.file}`)} />
            </Sequence>
          )}
        </>
      )}
    </AbsoluteFill>
  );
};
