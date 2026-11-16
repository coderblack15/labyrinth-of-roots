#!/usr/bin/env python3
"""Build the two itch.io zips from index.html, demo.html and the art.

Usage: python3 tools/build-zips.py

itch/labyrinth-of-roots-itch.zip       index.html (the full game) + art/ + music/ + title-film.mp4
itch/labyrinth-of-roots-demo-itch.zip  demo.html as index.html     + art/ + music/ + title-film.mp4

The paintings are separate files now (tools/split-art.py), so both zips carry the art/ folder.
Rebuild the demo first (tools/build-demo.py).
"""
import pathlib
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent

def build(out, page):
    extras = sorted((ROOT / "art").glob("*.webp")) + sorted((ROOT / "music").glob("*.ogg")) + sorted((ROOT / "music").glob("*.m4a")) + [ROOT / "title-film.mp4"]
    with zipfile.ZipFile(ROOT / "itch" / out, "w", zipfile.ZIP_DEFLATED) as z:
        z.write(ROOT / page, "index.html")
        for f in extras:
            # Already compressed (WebP, MP4, Ogg, M4A): store them as they are.
            z.write(f, f.relative_to(ROOT).as_posix(), compress_type=zipfile.ZIP_STORED)
    print(f"Wrote itch/{out}: {(ROOT / 'itch' / out).stat().st_size / 1e6:.1f} MB, {len(extras) + 1} files")

if __name__ == "__main__":
    build("labyrinth-of-roots-itch.zip", "index.html")
    build("labyrinth-of-roots-demo-itch.zip", "demo.html")
