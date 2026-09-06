# -*- coding: utf-8 -*-
"""Generate a music bed for one mood. No dependencies.

    python scripts/bed.py public/music/sad.wav sad

Why generated: the YouTube Audio Library needs a browser and a login, and a
Short with no bed under the voices reads as cheap.

There used to be one bed for every story, so a comedy about a dad joke and a
mother crying at a red light played over the same uneasy A-minor loop. Three
now, picked per story from the series in content/channel.json:

  sad    slow A minor, pad forward, the pluck almost absent. Tearjerkers.
  light  C major at 104, bright arpeggio, barely any low end. Comedy.
  tense  A minor with a flattened neighbour chord and a hard heartbeat. Drama.

All three sit at ~11% under the voices - texture, not a soundtrack.
"""
import math
import struct
import sys
import wave

RATE = 22050

# bpm, chords (root/third/fifth as midi), and the mix between the three layers.
MOODS = {
    "sad": {
        "bpm": 76,
        "chords": [(57, 60, 64), (53, 57, 60), (48, 52, 55), (55, 59, 62)],  # Am F C G
        "mix": (0.40, 0.18, 0.26),
        "decay": 6.0,
    },
    "light": {
        "bpm": 104,
        "chords": [(60, 64, 67), (55, 59, 62), (57, 60, 64), (53, 57, 60)],  # C G Am F
        "mix": (0.20, 0.42, 0.08),
        "decay": 9.0,
    },
    "tense": {
        "bpm": 88,
        "chords": [(57, 60, 64), (56, 59, 63), (57, 60, 64), (52, 56, 59)],  # Am G#dim Am E
        "mix": (0.34, 0.14, 0.40),
        "decay": 7.5,
    },
}
LOOPS = 6


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def pad(t, chord):
    v = 0.0
    for n in chord:
        f = hz(n - 12)
        v += math.sin(2 * math.pi * f * t) + 0.35 * math.sin(2 * math.pi * f * 2.003 * t)
    return v / len(chord) * (0.8 + 0.2 * math.sin(2 * math.pi * 0.11 * t))


def pluck(t, chord, in_bar, beat, decay):
    # eighth-note arpeggio: root, fifth, third, fifth, root+8, fifth, third, fifth
    order = [0, 2, 1, 2, 0, 2, 1, 2]
    step = beat / 2
    k = int(in_bar / step)
    p = in_bar - k * step
    n = chord[order[k % 8]] + (12 if k == 4 else 0)
    f = hz(n)
    env = math.exp(-p * decay)
    return (math.sin(2 * math.pi * f * p) + 0.3 * math.sin(2 * math.pi * f * 2 * p) + 0.12 * math.sin(2 * math.pi * f * 3 * p)) * env


def sample(t, m, beat, bar_len):
    bar = int(t / bar_len)
    chord = m["chords"][bar % len(m["chords"])]
    in_bar = t - bar * bar_len
    # soft heartbeat: a low thump on 1 and the "and" of 2
    thump = 0.0
    for at in (0.0, beat * 1.5):
        p = in_bar - at
        if 0 <= p < 0.4:
            thump += math.sin(2 * math.pi * 55 * p) * math.exp(-p * 16)
    a, b, c = m["mix"]
    return a * pad(t, chord) + b * pluck(t, chord, in_bar, beat, m["decay"]) + c * thump


def main(path, mood):
    m = MOODS.get(mood)
    if not m:
        raise SystemExit(f"unknown mood {mood!r}; expected one of {', '.join(MOODS)}")
    beat = 60.0 / m["bpm"]
    bar_len = beat * 4
    seconds = bar_len * len(m["chords"]) * LOOPS  # an exact number of bars, so it loops clean
    n = int(RATE * seconds)
    frames = bytearray()
    for i in range(n):
        v = sample(i / RATE, m, beat, bar_len)
        edge = min(1.0, i / (RATE * 0.05), (n - i) / (RATE * 0.05))
        frames += struct.pack("<h", int(max(-1.0, min(1.0, v * edge)) * 32767 * 0.85))
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(bytes(frames))
    print(f"  {path}  {mood}  {seconds:.1f}s @ {RATE}Hz")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    main(sys.argv[1], sys.argv[2])
