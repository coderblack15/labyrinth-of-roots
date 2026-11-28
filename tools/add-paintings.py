#!/usr/bin/env python3
"""Put Adrian's numbered paintings into the game.

Usage: python3 tools/add-paintings.py FOLDER [--dry-run]

FOLDER holds the finished pictures, each named by its number on the painting list
(the project's art/paintings-needed-2026-11-28.md): "47.png", "47 crane.jpg", "70.3.png" or
"70-3.png" for the third dagger look. Any format Pillow reads works (png, jpg, webp).

Each picture is shrunk to fit 900 x 600 (a tall 2:3 painting comes out 400 x 600, a square one
600 x 600), saved as art/<key>.webp at quality 80, and the game picks it up by itself: every key
is listed in ART_PENDING in index.html, which looks for the file as the page loads. The small
weapon placeholders (68-71) are inline pictures in PIC_SRC: those lines are switched to the new
file, so index.html gets smaller too. Number 72 is Isak Corrow (art/isak_pic.webp, 300 x 550).
Numbers 40-44 are for the 3D dungeons only and are skipped here.

Afterwards: python3 tools/build-demo.py, then python3 tools/build-zips.py.
"""
import os
import re
import sys

from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
INDEX = os.path.join(ROOT, "index.html")
ART = os.path.join(ROOT, "art")
THREE_D = {"40", "41", "42", "43", "44", "46"}


def keys_by_number(html):
    block = html[html.index("const ART_PENDING = ["):]
    block = block[:block.index("\n  ];")]
    found = dict(re.findall(r'\["([0-9.]+)", "([a-z0-9_]+)"', block))
    found["72"] = "isak_pic"
    return found


def number_of(name):
    m = re.match(r"\s*(\d+)(?:[.\-_](\d+))?", name)
    if not m:
        return None
    return m.group(1) + ("." + m.group(2) if m.group(2) else "")


def fit(im, key):
    im = im.convert("RGB")
    if key == "isak_pic":  # same frame as Ishbel's portrait: crop to 300 x 550 from the middle
        w, h = im.size
        tw = min(w, round(h * 300 / 550))
        th = round(tw * 550 / 300)
        left, top = (w - tw) // 2, max(0, (h - th) // 4)
        return im.crop((left, top, left + tw, top + th)).resize((300, 550), Image.LANCZOS)
    im.thumbnail((900, 600), Image.LANCZOS)
    return im


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry-run" in sys.argv
    if not args:
        sys.exit(__doc__)
    html = open(INDEX, encoding="utf-8").read()
    keys = keys_by_number(html)
    done, changed = [], False
    for name in sorted(os.listdir(args[0])):
        path = os.path.join(args[0], name)
        if not os.path.isfile(path):
            continue
        n = number_of(name)
        if n is None:
            print("skip (no number):", name)
            continue
        if n in THREE_D:
            print("skip (3D dungeons only):", name)
            continue
        if n not in keys and n + ".1" in keys:
            n = n + ".1"  # "70.png" is the first dagger look
        key = keys.get(n)
        if not key:
            print("skip (no slot numbered %s):" % n, name)
            continue
        out = os.path.join(ART, key + ".webp")
        try:
            im = fit(Image.open(path), key)
        except Exception as e:  # not a picture
            print("skip (%s):" % e, name)
            continue
        if not dry:
            im.save(out, "WEBP", quality=80, method=6)
        # an inline placeholder in PIC_SRC gives way to the file
        pat = re.compile(r'(\n\s*%s: )"data:image/[^"]*"' % re.escape(key))
        if pat.search(html):
            html = pat.sub(lambda m: m.group(1) + '"art/%s.webp"' % key, html, count=1)
            changed = True
        done.append("%s -> art/%s.webp (%d x %d)" % (name, key, im.size[0], im.size[1]))
    if changed and not dry:
        open(INDEX, "w", encoding="utf-8").write(html)
    print("\n".join(done) or "nothing added")
    if done and not dry:
        print("\nNow run: python3 tools/build-demo.py && python3 tools/build-zips.py")


if __name__ == "__main__":
    main()
