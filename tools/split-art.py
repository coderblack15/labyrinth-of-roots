#!/usr/bin/env python3
"""Move embedded paintings out of index.html into the art/ folder.

Usage: python3 tools/split-art.py [--min-kb 4] [--dry-run]

The game used to carry every painting inside index.html as a data: URL, which pushed the file
toward the 16 MB limit of the private Claude link. Paintings now live as files in art/ and the
game points at them by a relative path ("art/sc_glade.webp"), so the same file works on the
private link (published with the art/ files beside it), on GitHub Pages and in the itch.io zips.

The tool finds every `key: "data:image/webp;base64,..."` (or `const NAME = "data:..."`) of at
least --min-kb, writes the bytes to art/<key>.webp and puts the path in its place. The title film
(data:video/mp4 on #gateVideo) goes to title-film.mp4. Small icons stay inline. Run it after
adding a painting the old way, or after a merge brings embedded ones back; it's safe to re-run.
"""
import argparse
import base64
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
ART = "art"

PIC = re.compile(r'(?P<key>\b[A-Za-z_$][\w$]*|"[\w-]+")(?P<sep>\s*[:=]\s*)"data:image/webp;base64,(?P<b64>[A-Za-z0-9+/=]+)"')
FILM = re.compile(r'(<video id="gateVideo"[^>]*?src=")data:video/mp4;base64,([A-Za-z0-9+/=]+)(")')

def name_for(key):
    k = key.strip('"')
    return re.sub(r"[^a-z0-9_-]", "", k.lower().replace("$", "")) or "pic"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--min-kb", type=float, default=4)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    path = ROOT / "index.html"
    s = path.read_text(encoding="utf-8")
    before = len(s.encode("utf-8"))
    (ROOT / ART).mkdir(exist_ok=True)
    used, moved = {}, 0

    def pic(m):
        nonlocal moved
        b64 = m.group("b64")
        if len(b64) < a.min_kb * 1024:
            return m.group(0)
        data = base64.b64decode(b64)
        base = name_for(m.group("key"))
        name, n = base, 2
        # Two keys with the same name but different pictures get -2, -3 ...
        while name in used and used[name] != data:
            name, n = f"{base}-{n}", n + 1
        used[name] = data
        out = ROOT / ART / f"{name}.webp"
        if not a.dry_run:
            out.write_bytes(data)
        moved += 1
        return f'{m.group("key")}{m.group("sep")}"{ART}/{name}.webp"'

    s = PIC.sub(pic, s)

    def film(m):
        nonlocal moved
        if not a.dry_run:
            (ROOT / "title-film.mp4").write_bytes(base64.b64decode(m.group(2)))
        moved += 1
        return m.group(1) + "title-film.mp4" + m.group(3)

    s = FILM.sub(film, s)
    after = len(s.encode("utf-8"))
    if not a.dry_run:
        path.write_text(s, encoding="utf-8")
    print(f"split-art: moved {moved} files out; index.html {before / 1e6:.2f} MB -> {after / 1e6:.2f} MB")

if __name__ == "__main__":
    main()
