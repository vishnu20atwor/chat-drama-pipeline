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
  eleven  ElevenLabs, used automatically whenever an ELEVENLABS_KEY_* is set and
          the character has an "eleven" voice name. Two keys on the $5 plan give
          60,000 characters a month against ~350 a video, so rotation is really
          insurance rather than arithmetic.
  edge    (default) Microsoft neural voices via edge-tts. Free, no key, 400+ voices.
  kokoro  local open-weights model, needs `pip install kokoro soundfile`. Voice
          names are Kokoro's (af_heart, am_michael, ...). Word timings are
          spread evenly across the clip.
"""
import asyncio
import base64
import json
import os
import re
import sys
import urllib.error
import urllib.request

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


# --- ElevenLabs ---------------------------------------------------------------
# Keys are ELEVENLABS_KEY_1, _2, ... A key that is rate limited or out of quota
# (429, or 401 with a quota message) is retired for the rest of the run and the
# next one takes over. When they are all spent we fall back to edge-tts rather
# than fail: a day of flatter voices beats a day with no video.
API = "https://api.elevenlabs.io/v1"
MODEL = "eleven_multilingual_v2"


def eleven_keys():
    keys = [v for k, v in sorted(os.environ.items()) if k.startswith("ELEVENLABS_KEY_") and v.strip()]
    return keys


def _get(path, key):
    req = urllib.request.Request(f"{API}{path}", headers={"xi-api-key": key})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def eleven_voice_ids(key):
    """name -> voice_id for whatever this account can actually see."""
    if not hasattr(eleven_voice_ids, "cache"):
        eleven_voice_ids.cache = {}
    if key not in eleven_voice_ids.cache:
        try:
            data = _get("/voices", key)
            # ElevenLabs labels its stock voices "Alice - Clear, Engaging
            # Educator", not "Alice". Exact matching missed every single one
            # and silently fell back to edge, so nothing ever used ElevenLabs.
            # Key on both the bare name and the full label.
            ids = {}
            for v in data.get("voices", []):
                full = v["name"]
                ids[full] = v["voice_id"]
                ids.setdefault(full.split(" - ")[0].strip(), v["voice_id"])
            eleven_voice_ids.cache[key] = ids
            print(f"  elevenlabs voices resolved: {len(eleven_voice_ids.cache[key])} names")
        except Exception as e:
            print(f"  ! could not list elevenlabs voices: {e}")
            eleven_voice_ids.cache[key] = {}
    return eleven_voice_ids.cache[key]


def speak_eleven(text, cfg, out_path, keys):
    """Returns a clip dict, or None if every key is spent or the voice is unknown."""
    while keys:
        key = keys[0]
        vid = eleven_voice_ids(key).get(cfg["eleven"])
        if not vid:
            print(f'  ! no elevenlabs voice named "{cfg["eleven"]}" - falling back to edge')
            return None
        body = json.dumps({
            "text": text,
            "model_id": cfg.get("model", MODEL),
            # with-timestamps hands back the exact clip length, so we never have
            # to shell out to ffprobe to find out how long a line took.
            "voice_settings": {"stability": cfg.get("stability", 0.4), "similarity_boost": cfg.get("similarity", 0.75), "style": cfg.get("style", 0.35), "use_speaker_boost": True},
        }).encode()
        req = urllib.request.Request(
            f"{API}/text-to-speech/{vid}/with-timestamps",
            data=body,
            headers={"xi-api-key": key, "content-type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                data = json.load(r)
        except urllib.error.HTTPError as e:
            spent = e.code == 429 or (e.code == 401 and b"quota" in (e.read() or b"").lower())
            if spent:
                print(f"  key {len(keys)} spent (HTTP {e.code}) - rotating")
                keys.pop(0)
                continue
            print(f"  ! elevenlabs HTTP {e.code} - falling back to edge")
            return None
        except Exception as e:
            print(f"  ! elevenlabs failed ({e}) - falling back to edge")
            return None
        with open(out_path, "wb") as f:
            f.write(base64.b64decode(data["audio_base64"]))
        ends = data.get("alignment", {}).get("character_end_times_seconds") or [0.8]
        return {"file": os.path.basename(out_path), "durationMs": int(ends[-1] * 1000) + TAIL_MS, "words": []}
    return None


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


async def speak(text, cfg, out_path, keys=None):
    if keys and cfg.get("eleven"):
        clip = speak_eleven(text, cfg, out_path, keys)
        if clip:
            return clip
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
    keys = eleven_keys()
    print(f"  voices: elevenlabs ({len(keys)} key{'s' if len(keys) != 1 else ''})" if keys else "  voices: edge-tts (no ELEVENLABS_KEY_* set)")

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
            clip = await speak(say, cast[ev["who"]], out, keys)
        events.append(clip)
        total += clip["durationMs"]
        print(f'  {i:2} {ev["who"]:<9} {clip["durationMs"] / 1000:4.1f}s  {ev["text"][:56]}')
        i += 1

    cta = await speak(content.get("ctaSay") or "Follow for part two.", cast[NARRATOR], os.path.join(vo_dir, "cta.mp3"), keys)
    total += cta["durationMs"]

    audio_path = os.path.join(root, "content", f'{content["id"]}.audio.json')
    with open(audio_path, "w", encoding="utf-8") as f:
        json.dump({"events": events, "cta": cta}, f, indent=1)
    print(f"\n  {total / 1000:.1f}s of speech -> {audio_path}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    asyncio.run(main(sys.argv[1]))
