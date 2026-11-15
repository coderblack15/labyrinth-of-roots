#!/usr/bin/env python3
"""Copy languages.js into index.html.

Usage: python3 tools/build-languages.py

The game ships as one file, so languages.js is pasted into index.html just
before </body>, between two marker comments. Running this again replaces the
old copy, so edit languages.js and re-run. Then rebuild the demo with
tools/build-demo.py so it picks up the change too.
"""
import pathlib
import re

START = "<!-- languages.js: start (edit languages.js, then run tools/build-languages.py) -->"
END = "<!-- languages.js: end -->"

def main():
    root = pathlib.Path(__file__).resolve().parent.parent
    src = (root / "languages.js").read_text(encoding="utf-8")
    if "</script" in src.lower():
        raise SystemExit("build-languages: languages.js must not contain '</script'")
    page_path = root / "index.html"
    page = page_path.read_text(encoding="utf-8")
    block = START + "\n<script>\n" + src.rstrip() + "\n</script>\n" + END + "\n"
    if START in page:
        page, n = re.subn(re.escape(START) + r".*?" + re.escape(END) + r"\n?", lambda m: block, page, count=1, flags=re.S)
        if n != 1:
            raise SystemExit("build-languages: found the start marker but not the end marker")
    else:
        if page.count("</body>") != 1:
            raise SystemExit("build-languages: expected exactly one </body> in index.html")
        page = page.replace("</body>", block + "</body>", 1)
    page_path.write_text(page, encoding="utf-8")
    print("build-languages: index.html updated")

if __name__ == "__main__":
    main()
