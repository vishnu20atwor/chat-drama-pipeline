# -*- coding: utf-8 -*-
"""Voice every message in its character's voice and write back the timings.

    python scripts/tts.py content/2026-09-06.json

Writes public/vo/<id>/<n>.mp3 (one per message) and content/<id>.audio.json:
{"events": [{"file", "durationMs", "words": [{"w","t","d"}]}, ...], "cta": {...}}

Each message is its own clip, so any engine that can speak a sentence into a
file can play a character. The timings only need the clip length; the
word-level boundaries are a bonus edge-tts gives for free and the renderer
uses them to light up words as they're spoken.

Engines, chosen per voice in content/voices.json:
  edge    (default) Microsoft neural voices via edge-tts. Free, no key, 400+ voices.
  kokoro  local open-weights model, needs `pip install kokoro soundfile`. Voice
          names are Kokoro's (af_heart, am_michael, ...). Word timings are
          spread evenly across the clip.
"""
import asyncio
import json
import os
import re
import sys

import edge_tts

TAIL_MS = 220        # beat of silence after the last word of a clip
NARRATOR = "Narrator"


async def speak_edge(text, cfg, out_path):
    audio = bytearray()
    words = []
    com = edge_tts.Communicate(
        text, cfg["voice"], rate=cfg.get("rate", "+0%"), pitch=cfg.get("pitch", "+0Hz"), boundary="WordBoundary"
    )
    async for chunk in com.stream():
        if chunk["type"] == "audio":
            audio += chunk["data"]
        elif chunk["type"] == "WordBoundary":
            words.append({"w": chunk["text"], "t": chunk["offset"] // 10_000, "d": chunk["duration"] // 10_000})
    with open(out_path, "wb") as f:
        f.write(audio)
    end = words[-1]["t"] + words[-1]["d"] if words else 800
    return {"file": os.path.basename(out_path), "durationMs": end + TAIL_MS, "words": words}


def speak_kokoro(text, cfg, out_path):
    # ponytail: lazy import so the default install stays torch-free.
    import soundfile as sf
    from kokoro import KPipeline

    pipe = speak_kokoro.pipe = getattr(speak_kokoro, "pipe", None) or KPipeline(lang_code="a")
    chunks = [a for _, _, a in pipe(text, voice=cfg["voice"], speed=cfg.get("speed", 1.0))]
    import numpy as np

    wav = np.concatenate(chunks)
    out_path = out_path[:-4] + ".wav"
    sf.write(out_path, wav, 24000)
    ms = int(len(wav) / 24.0)
    toks = text.split()
    step = ms / max(1, len(toks))
    words = [{"w": w, "t": int(i * step), "d": int(step)} for i, w in enumerate(toks)]
    return {"file": os.path.basename(out_path), "durationMs": ms + TAIL_MS, "words": words}


async def speak(text, cfg, out_path):
    if cfg.get("engine", "edge") == "kokoro":
        return speak_kokoro(text, cfg, out_path)
    # edge-tts occasionally returns no audio for a perfectly good line — a
    # network hiccup, not the text. Three tries before an unattended run dies.
    for attempt in range(3):
        try:
            return await speak_edge(text, cfg, out_path)
        except edge_tts.exceptions.NoAudioReceived:
            if attempt == 2:
                raise
            print(f"  retrying ({attempt + 1}/3): {text[:40]}")
            await asyncio.sleep(2)


async def main(content_path):
    with open(content_path, encoding="utf-8") as f:
        content = json.load(f)
    root = os.path.dirname(os.path.dirname(os.path.abspath(content_path)))
    vo_dir = os.path.join(root, "public", "vo", content["id"])
    os.makedirs(vo_dir, exist_ok=True)
    with open(os.path.join(root, "content", "voices.json"), encoding="utf-8") as f:
        voices = json.load(f)
    cast = {**voices, **content.get("cast", {})}

    events = []
    total = 0
    i = 0
    for ev in content["events"]:
        if ev["kind"] != "msg":
            continue
        out = os.path.join(vo_dir, f"{i}.mp3")
        say = ev.get("say", "")  # sheet.mjs already expanded shorthand and dropped emoji
        if not say.strip() or not re.search(r"[A-Za-z0-9]", say):
            # a photo, or an emoji-only bubble: a beat of silence, no clip
            clip = {"file": None, "durationMs": 900, "words": []}
        else:
            clip = await speak(say, cast[ev["who"]], out)
        events.append(clip)
        total += clip["durationMs"]
        print(f'  {i:2} {ev["who"]:<9} {clip["durationMs"] / 1000:4.1f}s  {ev["text"][:56]}')
        i += 1

    cta = await speak(content.get("ctaSay") or "Follow for part two.", cast[NARRATOR], os.path.join(vo_dir, "cta.mp3"))
    total += cta["durationMs"]

    audio_path = os.path.join(root, "content", f'{content["id"]}.audio.json')
    with open(audio_path, "w", encoding="utf-8") as f:
        json.dump({"events": events, "cta": cta}, f, indent=1)
    print(f"\n  {total / 1000:.1f}s of speech -> {audio_path}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    asyncio.run(main(sys.argv[1]))
