# -*- coding: utf-8 -*-
"""Generate the three sound effects. No dependencies, no downloads.

    python scripts/sfx.py public/sfx

pop.wav   an incoming message lands (soft, falling blip)
send.wav  an outgoing message leaves (rising swoosh-blip)
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
    out = []
    n = int(RATE * 0.16)
    ph = 0.0
    for i in range(n):
        t = i / RATE
        f = 1100 * math.exp(-t * 18) + 380  # falls from ~1500Hz to ~400Hz
        ph += 2 * math.pi * f / RATE
        env = math.exp(-t * 26) * min(1.0, i / 40)
        out.append(0.6 * math.sin(ph) * env)
    return out


def send():
    out = []
    n = int(RATE * 0.18)
    ph = 0.0
    for i in range(n):
        t = i / RATE
        f = 500 + 1300 * (1 - math.exp(-t * 22))  # rises 500 → 1800Hz
        ph += 2 * math.pi * f / RATE
        env = math.exp(-t * 18) * min(1.0, i / 60)
        out.append(0.45 * math.sin(ph) * env)
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


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    d = sys.argv[1]
    os.makedirs(d, exist_ok=True)
    write(os.path.join(d, "pop.wav"), pop())
    write(os.path.join(d, "send.wav"), send())
    write(os.path.join(d, "boom.wav"), boom())
