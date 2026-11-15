#!/usr/bin/env python3
"""Add another language to a story file that already exists.

  List the rows (index and English) to translate:
    python3 tools/story-fill.py lang/story-02-burning-sands.js --col 1 --list > es.txt
  Fill the column from a file of "index<TAB>text" lines:
    python3 tools/story-fill.py lang/story-02-burning-sands.js --col 1 --tr es.txt

Columns: 0 English, 1 Español, 2 Français, 3 Deutsch, 4 Português, 5 日本語.
Rows already filled in that column are left alone; --list skips them too.
"""
import argparse, json, re, sys

NAMES = ["English", "Español", "Français", "Deutsch", "Português", "日本語"]

ap = argparse.ArgumentParser()
ap.add_argument("file")
ap.add_argument("--col", type=int, required=True)
ap.add_argument("--list", action="store_true")
ap.add_argument("--tr")
a = ap.parse_args()

src = open(a.file, encoding="utf-8").read()
head, body = src.split("push(", 1)
rows = json.loads("[" + re.sub(r",\s*$", "", body[: body.rindex(")")]) + "]")

if a.list:
    for i, r in enumerate(rows):
        if not r[a.col]:
            print(f"{i}\t{r[0]}")
    sys.exit()

n = 0
for line in open(a.tr, encoding="utf-8"):
    line = line.rstrip("\n")
    if not line.strip() or "\t" not in line:
        continue
    i, t = line.split("\t", 1)
    i = int(i)
    if not rows[i][a.col] and t.strip():
        rows[i][a.col] = t
        n += 1

# Name every filled language in the title line.
langs = [NAMES[c] for c in range(1, 6) if any(r[c] for r in rows)]
first, rest = head.split("\n", 1)
first = re.sub(r" · [^·]*$", " · " + ", ".join(langs), first)
out = first + "\n" + rest + "push(\n" + "".join(
    "  " + json.dumps(r, ensure_ascii=False) + ",\n" for r in rows) + ");\n"
open(a.file, "w", encoding="utf-8").write(out)
left = sum(1 for r in rows if not r[a.col])
print(f"{a.file}: {n} filled, {left} still empty in column {a.col}")
