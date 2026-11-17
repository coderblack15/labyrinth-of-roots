#!/usr/bin/env python3
# "Walls Worth Taking" -- the compound raids' music for Labyrinth of Roots: one piece in two halves.
#   Over the Wall: the sneak. B minor, 84 bpm. Pizzicato low strings, a ticking rim like a guard's
#     boots, a muted heartbeat drum, a long drone, and the theme in fragments on a low whistle.
#   The Bell in the Yard: the raid, when the alarm goes up. Same key and the same theme, 138 bpm:
#     an alarm bell, hand drums and taiko, a cello ostinato, the theme on strings, brass stabs.
# Lighter than Rootbreaker on purpose (no choir, no anvil, no key change), so bosses stay special.
# Borrows the instruments from rootbreaker.py and the bouzouki/whistle from thorn-and-cudgel.py.
#
#   PK=1.5 python3 walls-worth-taking.py sneak-intro a.wav   # sneak-loop, raid-intro, raid-loop, preview
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import rootbreaker as C
from rootbreaker import s, mhz, fft_filter, lp, hp, bp, env_adsr, SR, Mix
import importlib.util
_spec = importlib.util.spec_from_file_location("tc", os.path.join(os.path.dirname(os.path.abspath(__file__)), "thorn-and-cudgel.py"))
TC = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(TC)

rng = np.random.default_rng(1611)
C.rng = rng; TC.rng = rng

# The theme: four bars in B minor, rising to the fifth and falling back through the leading note.
THEME = [(59, .5), (62, .5), (66, 1), (64, .5), (62, .5), (61, 1), (59, 2), (62, .5), (64, .5), (66, 1), (69, 1), (67, .5), (66, .5), (64, 2),
         (66, .5), (67, .5), (69, 1), (71, 1), (69, .5), (67, .5), (66, 1), (64, 1), (62, .5), (61, .5), (59, 2)]   # 28 beats = 7 bars
ROOTS = [35, 35, 31, 33, 35, 38, 31, 30]   # B B G A B D G F#

def bell(dur, vel=1.0, f0=520.0):
    """An iron alarm bell: inharmonic partials, a hard strike, a long ring."""
    n = s(dur); t = np.arange(n) / SR
    y = np.zeros(n)
    for ratio, amp, dec in ((1.0, 1.0, 1.8), (2.32, .6, 1.1), (3.01, .45, .8), (4.17, .3, .5), (5.43, .2, .35), (0.5, .35, 2.4)):
        y += amp * np.sin(2 * np.pi * f0 * ratio * t + rng.random() * 6) * np.exp(-t / dec)
    strike = fft_filter(rng.standard_normal(n), bp(1500, 6000)) * np.exp(-t / 0.01) * .5
    return (y * .35 + strike) * vel

def heart(vel=1.0):
    """A muffled heartbeat on a frame drum: two soft hits."""
    a = C.frame(vel, 95); b = C.frame(vel * .7, 90)
    out = np.zeros(max(len(a), s(.22) + len(b)))
    out[:len(a)] += a; out[s(.22): s(.22) + len(b)] += b
    return fft_filter(out, lp(900, 2))

def sneak_score(mx, bars, t0=0.0, BPM=84):
    BEAT = 60.0 / BPM; BAR = 4 * BEAT
    T = lambda bar, beat=0.0: t0 + bar * BAR + beat * BEAT + rng.normal(0, 0.003)
    for bar, (name, rel) in bars:
        r = ROOTS[rel % 8]
        # pizzicato: root, fifth, octave on the off-beats, very quiet
        for k, (b, iv) in enumerate(((0, 0), (1.5, 7), (2.5, 12), (3.5, 7))):
            mx.add(T(bar, b), TC.pluck(r + 12 + iv, BEAT * .4, (.9, .6, .7, .55)[k], .25), .2, (-.3, .2, .35, -.15)[k], .3)
        # the guard's boots: a rim tick on every beat, a rattle on the offs
        for b in range(4):
            mx.add(T(bar, b), C.rim(.35 + (.15 if b == 0 else 0)), .09, .45, .25)
            if rng.random() < .5: mx.add(T(bar, b + .5), C.rattle(.25), .05, -.5, .2)
        if rel % 2 == 0: mx.add(T(bar, 0), heart(.8), .28, 0, .15)
        if rel % 4 == 0: mx.add(T(bar), C.drone(r + 12, BAR * 4 + .5, .7), .13, 0, .35)
        if name == 'A' and rel in (4, 12):
            # the theme, in fragments: first half on the low whistle, an octave down
            beat = 0
            for m, d in THEME[:7 if rel == 4 else 14]:
                if rng.random() < .8: mx.add(T(bar, beat), TC.whistle(m - 12 + 12, d * BEAT * .9, .55), .1, .15, .5)
                beat += d
        if name == 'A' and rel == 8:
            beat = 0
            for m, d in THEME[14:]:
                mx.add(T(bar, beat), C.strings_legato(m - 12, d * BEAT * .97, .55), .12, -.25, .45)
                beat += d
        if name == 'intro' and rel == 0:
            mx.add(T(bar), C.drone(35, BAR * 2 + 1, .7), .14, 0, .35)

def raid_score(mx, bars, t0=0.0, BPM=138):
    BEAT = 60.0 / BPM; BAR = 4 * BEAT
    T = lambda bar, beat=0.0: t0 + bar * BAR + beat * BEAT + rng.normal(0, 0.003)
    for bar, (name, rel) in bars:
        if name == 'intro':
            # the alarm: the bell three times, then the drums come in under it
            if rel == 0:
                for k in range(3): mx.add(T(bar, k * 1.333), bell(2.4, 1 - k * .1), .3, .15, .45)
                mx.add(T(bar, 3), C.taiko(60, .5, .9), .35, 0, .3)
            else:
                for st in range(0, 16, 2): mx.add(T(bar, st / 4), C.frame(.5 + st / 24, 200 - st * 4), .3, .3 - st / 30, .2)
                mx.add(T(bar, 3.5), C.taiko(70, .3, .8), .3, 0, .2)
            continue
        r = ROOTS[rel % 8]
        # drums
        for st in range(16):
            b = st / 4
            if st in (0, 6, 10): mx.add(T(bar, b), C.taiko(60 if st == 0 else 72, .4, .85 if st == 0 else .6), .3, 0, .2)
            if st in (4, 12): mx.add(T(bar, b), C.frame(1.0, 150), .38, -.1, .18); mx.add(T(bar, b), C.rim(.7), .16, .25, .2)
            elif st % 2 == 0: mx.add(T(bar, b), C.frame(.5, 195), .22, .4, .15)
            mx.add(T(bar, b), C.rattle(.6 if st % 2 == 0 else .35), .08, -.55, .12)
        if rel % 8 == 7:
            for k, st in enumerate(range(12, 16)): mx.add(T(bar, st / 4), C.frame(.6 + k * .1, 220 - k * 18), .32, .3 - k * .2, .2)
        # cello ostinato in eighths, accents 3+3+2
        for k in range(8):
            m = r + (0, 0, 7, 0, 0, 7, 12, 7)[k]
            mx.add(T(bar, k * .5), C.strings_spic(m, BEAT * .42, (1, .55, .75, .9, .55, .75, .9, .6)[k]), .3, -.15, .15)
        if rel % 2 == 0:
            for k, m in enumerate((r + 12, r + 19)): mx.add(T(bar, 0), C.brass(m, BEAT * .9, .6), .12, (-.2, .2)[k], .35)
        if name == 'A' and rel in (0, 8, 16):
            beat = 0
            for m, d in THEME:
                mx.add(T(bar, beat), C.strings_legato(m + (12 if rel == 16 else 0), d * BEAT * .97, .85), .2 if rel < 16 else .15, -.3, .3)
                if rel >= 8 and d >= 1: mx.add(T(bar, beat), TC.whistle(m + 12, d * BEAT * .9, .6), .08, .3, .4)
                beat += d
        if name == 'A' and rel in (4, 20):
            mx.add(T(bar, 2), bell(1.8, .5, 520), .12, .4, .5)
        if name == 'A' and rel in (12, 13, 14, 15):
            # a breath: the drums drop to the frame and the cello alone, then come back
            pass

def plan(kind):
    secs = [('intro', 2), ('A', 16 if kind == 'sneak' else 24)]
    bars = []; b = 0
    for name, ln in secs:
        for r in range(ln):
            bars.append((b, (name, r))); b += 1
    return bars

def render(kind, mode, out):
    BPM = 84 if kind == 'sneak' else 138
    BAR = 4 * 60.0 / BPM
    sc = sneak_score if kind == 'sneak' else raid_score
    bars = plan(kind)
    if mode == 'intro':
        intro = [(b, sec) for b, sec in bars if sec[0] == 'intro']
        mx = Mix(len(intro) * BAR + 6)
        sc(mx, intro)
        y = C.master(mx)
        C.write_wav(out, y[:, : s(len(intro) * BAR)])
    elif mode == 'loop':
        body = [(b - 2, sec) for b, sec in bars if sec[0] != 'intro']
        L = s(len(body) * BAR); pre = s(1.0)
        mx = Mix(len(body) * BAR + 7)
        sc(mx, body, t0=1.0)
        y = C.master(mx)
        seg = y[:, pre: pre + L].copy()
        seg[:, -pre:] += y[:, :pre]
        tail = y[:, pre + L:]
        seg[:, : tail.shape[1]] += tail
        C.write_wav(out, np.clip(seg, -1, 1))

if __name__ == '__main__':
    mode, out = sys.argv[1], sys.argv[2]
    if mode == 'preview':
        # the sneak for a while, then the bell and the raid
        k1, k2 = out + '.a.wav', out + '.b.wav'
        render('sneak', 'loop', k1); render('raid', 'intro', k2)
        import wave
        print("preview parts written:", k1, k2)
    else:
        kind, part = mode.split('-')
        render(kind, part, out)
