#!/usr/bin/env python3
"""List the story lines of one chapter that still need translating.

Usage: python3 tools/story-keys.py --from 6 --to 9 --saves DIR [--seeds 8] [--col 5] [--out keys.json]

It plays each part of the chapter several times with tools/playtest.js (starting from
DIR/save-partN.json, which a long playtest run writes), records every line the game shows, keeps the ones that are
written out in index.html (lines built from numbers or names can't be matched), splits lines
with HTML into the pieces between tags, and drops anything lang/*.js already translates in
column --col (5 = Japanese). The result is a JSON list of [part, english] in the order they
first appear, ready to turn into a lang/story-NN-*.js file.
"""
import argparse, json, pathlib, re, subprocess, tempfile, concurrent.futures as cf

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="frm", type=int, required=True)
    ap.add_argument("--to", type=int, required=True)
    ap.add_argument("--saves", required=True)
    ap.add_argument("--seeds", type=int, default=8)
    ap.add_argument("--col", type=int, default=5)
    ap.add_argument("--out", default="keys.json")
    a = ap.parse_args()
    root = pathlib.Path(__file__).resolve().parent.parent
    src = (root / "index.html").read_text(encoding="utf-8")
    rec = ('<script>window.__lt={};(function(){var f=window.LOR_TR;window.LOR_TR=function(h){try{'
           'var p=window.__g&&window.__g.S?window.__g.S.part:-1;if(typeof h==="string"&&!(h in window.__lt))window.__lt[h]=p;'
           '}catch(e){}return f?f(h):h;};})();</script>\n</body>')
    i = src.rindex("</body>")
    tmp = pathlib.Path(tempfile.mkdtemp())
    (tmp / "game.html").write_text(src[:i] + rec + src[i + 7:], encoding="utf-8")
    # Play each part on its own, from the save at its start, so a long part can't eat the budget.
    def run(job):
        part, seed = job
        save = pathlib.Path(a.saves) / ("save-part%d.json" % part)
        out = tmp / ("run%d-%d" % (part, seed))
        cmd = ["node", str(root / "tools/playtest.js"), "--seed", str(seed), "--stop", str(part + 1),
               "--steps", "3000", "--file", str(tmp / "game.html"), "--out", str(out)]
        if part > 0:
            if not save.exists(): return {}
            cmd += ["--from", str(save)]
        try: subprocess.run(cmd, capture_output=True, timeout=600)
        except subprocess.TimeoutExpired: pass
        try: return json.loads((out / "final.json").read_text()).get("LT") or {}
        except Exception: return {}
    jobs = [(part, seed) for part in range(a.frm, a.to + 1) for seed in range(100, 100 + a.seeds)]
    seen = {}
    with cf.ThreadPoolExecutor(4) as ex:
        for lt in ex.map(run, jobs):
            for k, v in lt.items():
                if a.frm <= v <= a.to and (k not in seen or v < seen[k]): seen[k] = v
    # what lang/*.js already covers
    done = set()
    for f in sorted((root / "lang").glob("*.js")):
        node = 'global.window={};require(%r);for(const r of window.LOR_STORY||[])if(r[%d])console.log(JSON.stringify(r[0]))' % (str(f), a.col)
        done.update(json.loads(l) for l in subprocess.run(["node", "-e", node], capture_output=True, text=True).stdout.splitlines())
    keys, got = [], set()
    def add(seg, v):
        seg = seg.strip()
        if not re.search(r"[A-Za-z]{3}", seg) or seg in done or seg in got: return
        if json.dumps(seg, ensure_ascii=False)[1:-1] not in src: return
        got.add(seg); keys.append((v, seg))
    for k, v in seen.items():
        if "<img" in k or "<svg" in k: continue
        if "<" not in k: add(k, v)
        else:
            for seg in re.split(r"<[^>]+>", k): add(seg, v)
    keys.sort(key=lambda x: (x[0], src.find(json.dumps(x[1], ensure_ascii=False)[1:-1])))
    pathlib.Path(a.out).write_text(json.dumps(keys, ensure_ascii=False, indent=0), encoding="utf-8")
    print("%d lines, %d characters -> %s" % (len(keys), sum(len(k) for _, k in keys), a.out))

if __name__ == "__main__":
    main()
