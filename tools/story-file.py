#!/usr/bin/env python3
"""Turn a keys.json from story-keys.py plus numbered translations into a lang/story file.

Usage: python3 tools/story-file.py --keys keys.json --tr ja.txt --col 5 --title "Chapter 2, The Burning Sands" --out lang/story-02-burning-sands.js

ja.txt has one line per translation: the key's number, a tab, then the translated text.
Numbers that aren't listed are left out (in English). A line can also start with = and the
exact English instead of a number, for a line the playtest runs didn't reach. The English is copied from keys.json,
so it always matches the game exactly.
"""
import argparse, json, pathlib

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--keys", required=True); ap.add_argument("--tr", required=True)
    ap.add_argument("--col", type=int, default=5); ap.add_argument("--title", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    keys = json.loads(pathlib.Path(a.keys).read_text(encoding="utf-8"))
    rows = []
    for line in pathlib.Path(a.tr).read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.startswith("#"): continue
        n, t = line.split("\t", 1)
        en = n[1:] if n.startswith("=") else keys[int(n)][1]
        row = [en] + [""] * 5
        row[a.col] = t.strip()
        rows.append(row)
    names = ["English", "Español", "Français", "Deutsch", "Português", "日本語"]
    out = ["// Story translations · " + a.title + " · " + names[a.col],
           "// Columns: English | Español | Français | Deutsch | Português | 日本語. Empty columns stay in English.",
           "// Keep {g:a|b|c} and {he}/{him}/{his} markers as they are: the game fills them in afterwards.",
           "(window.LOR_STORY = window.LOR_STORY || []).push("]
    out += ["  " + json.dumps(r, ensure_ascii=False) + "," for r in rows]
    out.append(");")
    pathlib.Path(a.out).write_text("\n".join(out) + "\n", encoding="utf-8")
    print("%d rows -> %s" % (len(rows), a.out))

if __name__ == "__main__":
    main()
