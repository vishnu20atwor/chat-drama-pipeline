# -*- coding: utf-8 -*-
"""Generate the three sound effects. No dependencies, no downloads.

    python scripts/sfx.py public/sfx

pop.wav   a message lands: a struck, bell-bright tone. Every bubble uses it.

boom.wav  the twist: a sub-bass hit with a noise transient, for [boom]
"""
import math
import os
import random
import struct
import sys
import wave

RATE = 44100


def write(path, samples):
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1.0, min(1.0, s)) * 32767)) for s in samples))
    print(f"  {path}  {len(samples) / RATE:.2f}s")


def pop():
    """A message landing: a struck, bell-bright tone with a fast decay.

    Synthesised on purpose. The tones the messaging apps ship are their own
    copyrighted audio, and sixty monetised videos is exactly the place that
    would matter. This sits in the same register - high enough to cut through
    the voices, short enough to never step on a line - without being anybody's
    asset.
    """
    out = []
    n = int(RATE * 0.30)
    f0 = 1568.0  # G6
    # Slightly inharmonic partials, each decaying faster than the one below it,
    # which is what makes a struck object sound struck rather than beeped.
    parts = [(1.00, 1.00), (2.01, 0.42), (2.99, 0.17), (4.20, 0.07)]
    for i in range(n):
        t = i / RATE
        v = 0.0
        for mult, amp in parts:
            v += amp * math.sin(2 * math.pi * f0 * mult * t) * math.exp(-t * (9 + mult * 5))
        attack = min(1.0, i / 30)  # a few samples of rise so it does not click
        out.append(0.55 * v * attack * math.exp(-t * 5.5))
    return out


def boom():
    out = []
    n = int(RATE * 0.9)
    ph = 0.0
    rnd = random.Random(7)
    for i in range(n):
        t = i / RATE
        f = 48 + 90 * math.exp(-t * 12)  # pitch drops into the sub
        ph += 2 * math.pi * f / RATE
        sub = math.sin(ph) * math.exp(-t * 3.2)
        click = (rnd.random() * 2 - 1) * math.exp(-t * 60) * 0.5
        out.append(0.9 * sub + click)
    return out


def riser():
    # 2.2s of tension: filtered noise swelling in, plus a tone climbing an
    # octave. Ends exactly where the boom starts.
    out = []
    n = int(RATE * 2.2)
    rnd = random.Random(3)
    ph = 0.0
    lp = 0.0
    for i in range(n):
        t = i / RATE
        p = t / 2.2
        f = 110 * (2 ** p)
        ph += 2 * math.pi * f / RATE
        # one-pole lowpass on noise, opening up as it rises
        lp += (rnd.random() * 2 - 1 - lp) * (0.02 + 0.3 * p)
        env = p ** 2.2
        out.append((0.55 * lp + 0.25 * math.sin(ph)) * env)
    return out


def main(d):
    os.makedirs(d, exist_ok=True)
    write(os.path.join(d, "pop.wav"), pop())
    write(os.path.join(d, "boom.wav"), boom())
    write(os.path.join(d, "riser.wav"), riser())


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "public/sfx")
