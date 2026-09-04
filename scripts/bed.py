# -*- coding: utf-8 -*-
"""Generate the music bed: a soft, slightly uneasy chord loop. No dependencies.

    python scripts/bed.py public/music/bed.wav

Why generated: the YouTube Audio Library needs a browser and a login, and a
Short with no bed under the voices reads as cheap. Am – F – C – G at 92 BPM:
a felt-piano-ish pluck on the eighths over a slow pad. Sits at ~12% under the
voices — texture, not a soundtrack. Drop a real track in public/music/ and
point the `bed` field in content/channel.json at it to replace this.
"""
import math
import struct
import sys
import wave

RATE = 22050
BPM = 92
BEAT = 60.0 / BPM
BAR = BEAT * 4
# A minor: Am, F, C, G  (root, third, fifth as midi notes)
CHORDS = [(57, 60, 64), (53, 57, 60), (48, 52, 55), (55, 59, 62)]
LOOPS = 6
SECONDS = BAR * len(CHORDS) * LOOPS  # ≈ 62.6s, an exact number of bars so it loops clean


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def pad(t, chord):
    v = 0.0
    for n in chord:
        f = hz(n - 12)
        v += math.sin(2 * math.pi * f * t) + 0.35 * math.sin(2 * math.pi * f * 2.003 * t)
    return v / len(chord) * (0.8 + 0.2 * math.sin(2 * math.pi * 0.11 * t))


def pluck(t, chord, in_bar):
    # eighth-note arpeggio: root, fifth, third, fifth, root+8, fifth, third, fifth
    order = [0, 2, 1, 2, 0, 2, 1, 2]
    step = BEAT / 2
    k = int(in_bar / step)
    p = in_bar - k * step
    n = chord[order[k % 8]] + (12 if k == 4 else 0)
    f = hz(n)
    env = math.exp(-p * 7.0)
    return (math.sin(2 * math.pi * f * p) + 0.3 * math.sin(2 * math.pi * f * 2 * p) + 0.12 * math.sin(2 * math.pi * f * 3 * p)) * env


def sample(t):
    bar = int(t / BAR)
    chord = CHORDS[bar % len(CHORDS)]
    in_bar = t - bar * BAR
    # soft heartbeat: a low thump on 1 and the "and" of 2
    thump = 0.0
    for at in (0.0, BEAT * 1.5):
        p = in_bar - at
        if 0 <= p < 0.4:
            thump += math.sin(2 * math.pi * 55 * p) * math.exp(-p * 16)
    return 0.30 * pad(t, chord) + 0.34 * pluck(t, chord, in_bar) + 0.28 * thump


def main(path):
    n = int(RATE * SECONDS)
    frames = bytearray()
    for i in range(n):
        v = sample(i / RATE)
        edge = min(1.0, i / (RATE * 0.05), (n - i) / (RATE * 0.05))
        frames += struct.pack("<h", int(max(-1.0, min(1.0, v * edge)) * 32767 * 0.85))
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(bytes(frames))
    print(f"  {path}  {SECONDS:.1f}s @ {RATE}Hz")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(sys.argv[1])
