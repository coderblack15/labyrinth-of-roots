#!/usr/bin/env python3
"""Build the free demo from index.html.

Usage: python3 tools/build-demo.py [--parts 10] [--full-url URL] [--out demo.html]

The demo is the full game with DEMO_END set, so it stops after the given
number of parts and shows an end card pointing to the full game. Re-run this
whenever index.html changes so the demo stays in sync.
"""
import argparse
import pathlib
import re

ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII",
         "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"]

def swap(src, old, new):
    if src.count(old) != 1:
        raise SystemExit(f"build-demo: expected exactly one match for {old!r}")
    return src.replace(old, new, 1)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--parts", type=int, default=10)
    ap.add_argument("--full-url", default=None)
    ap.add_argument("--out", default="demo.html")
    a = ap.parse_args()
    root = pathlib.Path(__file__).resolve().parent.parent
    s = (root / "index.html").read_text(encoding="utf-8")
    label = f"Parts I–{ROMAN[a.parts]}" if a.parts < len(ROMAN) else f"the first {a.parts} parts"

    s = swap(s, "const DEMO_END = 0;", f"const DEMO_END = {a.parts};")
    if a.full_url:
        s = re.sub(r'const FULL_URL = "[^"]*";', f'const FULL_URL = "{a.full_url}";', s, count=1)
    s = re.sub(r"<title>([^<]*)</title>", r"<title>\1 (Free Demo)</title>", s, count=1)
    s = swap(s, '<p class="eyebrow">A Dark Fantasy Horror Adventure</p>',
             f'<p class="demo-badge">FREE DEMO · {label.upper()}</p>\n      <p class="eyebrow">A Dark Fantasy Horror Adventure</p>')
    s = re.sub(r'<p class="eyebrow">An adventure in [a-z-]+ parts · d20</p>',
               f'<p class="eyebrow">Free demo · {label} · d20</p>', s, count=1)
    (root / a.out).write_text(s, encoding="utf-8")
    print(f"Wrote {a.out}: demo ends after part {a.parts}")

if __name__ == "__main__":
    main()
