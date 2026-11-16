#!/usr/bin/env python3
# "Thorn and Cudgel" -- the everyday fight song for Labyrinth of Roots.
# Lighter sibling of Rootbreaker: D minor (Aeolian), 132 bpm, hand drums, bouzouki,
# low whistle, fiddles, a cello pulse. No anvil, no war choir, no key change.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import rootbreaker as C
from rootbreaker import s, mhz, fft_filter, lp, hp, bp, saw, env_adsr, SR, Mix

BPM = 132
BEAT = 60.0 / BPM
BAR = 4 * BEAT
rng = np.random.default_rng(4242)
C.rng = rng

def pluck(m, dur, vel=1.0, bright=0.5):
    """Karplus-Strong bouzouki course (two strings, slightly apart)."""
    n = s(dur + 0.6)
    out = np.zeros(n)
    for det in (-3, 3):
        f = mhz(m) * 2 ** (det / 1200)
        P = max(2, int(round(SR / f)))
        buf = fft_filter(rng.standard_normal(P), lp(SR * bright * 0.25 + 800, 1))
        y = np.zeros(n + P + 1)
        y[:P] = buf
        k = P
        decay = 0.996
        while k < n:
            j = min(n, k + P)
            seg = y[k - P: j - P]
            nxt = y[k - P + 1: j - P + 1]
            y[k:j] = decay * 0.5 * (seg + nxt)
            k = j
        out += y[:n]
    t = np.arange(n) / SR
    e = np.clip((dur + 0.08 - t) / 0.08, 0, 1) ** 2   # damp after dur
    out = fft_filter(out * np.maximum(e, 0), hp(90))
    return out / 2 * vel

def whistle(m, dur, vel=1.0, grace=None):
    n = s(dur + 0.4)
    t = np.arange(n) / SR
    f = np.full(n, mhz(m))
    if grace is not None:
        g = s(0.045)
        f[:g] = mhz(grace)
    vib = 1 + 0.005 * np.sin(2 * np.pi * 5.6 * t) * np.clip((t - 0.18) / 0.3, 0, 1)
    ph = 2 * np.pi * np.cumsum(f * vib) / SR
    y = np.sin(ph) + 0.22 * np.sin(2 * ph) + 0.08 * np.sin(3 * ph)
    br = fft_filter(rng.standard_normal(n), bp(mhz(m) * 0.9, mhz(m) * 3.5, 2)) * 0.12
    e = env_adsr(n, 0.025, 0.25, 0.8, dur, 0.07)
    chiff = fft_filter(rng.standard_normal(n), bp(2000, 7000)) * np.exp(-t / 0.015) * 0.15
    return (y + br) * e * vel + chiff * vel

# ---------------------------------------------------------------- material
SCALE_D = [2, 4, 5, 7, 9, 10, 0]   # D aeolian pcs (for neighbour notes)
THEME = [
    (62, .5), (65, .5), (69, 1), (67, .5), (65, .5), (64, 1),
    (62, 1.5), (60, .5), (62, 2),
    (65, .5), (67, .5), (69, 1), (72, 1), (70, .5), (69, .5),
    (67, 1), (65, 1), (64, 2),
    (69, .5), (72, .5), (74, 1), (72, .5), (69, .5), (67, 1),
    (65, 1), (67, .5), (65, .5), (64, 2),
    (62, .5), (64, .5), (65, 1), (64, .5), (60, .5), (61, 1),
    (62, 4),
]
ROOTS = [38, 36, 41, 36, 33, 34, 33, 38]
GROOVE_ROOTS = [38, 38, 36, 38, 38, 41, 36, 33]
PLK = [0, 7, 12, 7, 0, 7, 10, 7]           # bouzouki 8ths
def triad(r):
    if r % 12 == 9:                        # A major (C#) for the turn home
        return [r, r + 4, r + 7]
    third = 4 if r % 12 in (0, 5, 10) else 3
    return [r, r + third, r + 7]

def score(mx, bars, t0=0.0, ending=False):
    def T(bar, beat=0.0):
        return t0 + bar * BAR + beat * BEAT + rng.normal(0, 0.004)

    def strum(bar, root, vel=1.0):
        for k in range(8):
            m = root + 12 + PLK[k]
            if root % 12 == 9 and PLK[k] == 10:
                m = root + 12 + 7   # A major turn: no G
            v = (1, .6, .8, .6, .9, .6, .8, .65)[k] * vel * (0.9 + rng.random() * .2)
            mx.add(T(bar, k * .5), pluck(m, BEAT * .48, v, .55), .32, (-.35, .35)[k % 2], .22)

    def cello(bar, root, vel=1.0):
        for k, b in enumerate((0, 1.5, 3)):
            mx.add(T(bar, b), C.strings_spic(root, BEAT * .55, (1, .7, .85)[k] * vel, .8), .38, -.15, .15)

    def drums(bar, kind='groove', fill=False):
        for st in range(16):
            b = st / 4
            if kind in ('groove', 'lift'):
                if st == 0:
                    mx.add(T(bar, b), C.taiko(62, .45, .9), .3, 0, .2)
                if st in (6, 10) and kind == 'lift':
                    mx.add(T(bar, b), C.taiko(88, .3, .6), .22, .3, .2)
                if st in (4, 12):
                    mx.add(T(bar, b), C.frame(1.0, 150), .4, -.1, .18)
                    mx.add(T(bar, b), C.rim(.7), .18, .25, .2)
                elif st % 2 == 0:
                    mx.add(T(bar, b), C.frame(.55, 190 + rng.random() * 12), .26, .4, .15)
                elif rng.random() < .45:
                    mx.add(T(bar, b), C.frame(.25, 210), .2, .5, .15)
                mx.add(T(bar, b), C.rattle(.7 if st % 2 == 0 else .4), .1, -.55, .12)
            elif kind == 'light':
                if st in (0, 10):
                    mx.add(T(bar, b), C.frame(.8, 150), .35, 0, .2)
                if st % 2 == 0:
                    mx.add(T(bar, b), C.rattle(.5), .09, -.5, .15)
        if fill:
            for k, st in enumerate(range(12, 16)):
                mx.add(T(bar, st / 4), C.frame(.6 + k * .1, 220 - k * 18), .35, .3 - k * .2, .2)
                mx.add(T(bar, st / 4 + .125), C.frame(.4, 230 - k * 15), .25, -.3, .2)

    def lead(bar, inst='whistle', oct=0, vel=1.0, gain=.3, pan=0.0, send=.3):
        beat = 0.0; prev = None
        for m, d in THEME:
            mm = m + oct
            dur = d * BEAT * (.92 if inst == 'whistle' else .97)
            if inst == 'whistle':
                g = mm + 2 if (d >= 1 and rng.random() < .35) else None
                mx.add(T(bar, beat), whistle(mm, dur, vel, g), gain, pan, send)
            else:
                mx.add(T(bar, beat), C.strings_legato(mm, dur, vel), gain, pan, send)
            beat += d

    def pads(bar, roots, every=2, vel=.7, gain=.16):
        for i in range(0, len(roots), every):
            r = roots[i] + 12
            while r < 45: r += 12
            while r > 57: r -= 12
            for k, m in enumerate(triad(r)):
                mx.add(T(bar + i), C.choir(m, every * BAR * .98, vel * (1, .8, .75)[k], 'oo', 4), gain, (-.4, .4, 0)[k], .45)

    for bar, (name, rel) in bars:
        if name == 'intro':
            if rel == 0:
                mx.add(T(bar), C.drone(38, BAR * 4 + 1, .9), .26, 0, .3)
            drums(bar, 'light', fill=(rel == 3))
            strum(bar, 38, .5 + rel * .15)
        elif name == 'A':
            r = GROOVE_ROOTS[rel]
            strum(bar, r)
            cello(bar, r)
            drums(bar, 'groove', fill=(rel % 4 == 3))
            if rel == 0:
                mx.add(T(bar), C.drone(38, BAR * 8, .8), .16, 0, .3)
        elif name == 'B':
            r = ROOTS[rel]
            strum(bar, r)
            cello(bar, r)
            drums(bar, 'groove', fill=(rel == 7))
            if rel == 0:
                lead(bar, 'whistle', 0, .9, .16, .1)
        elif name == 'C':
            r = ROOTS[rel]
            strum(bar, r, .9)
            cello(bar, r, 1.05)
            drums(bar, 'lift', fill=(rel % 4 == 3))
            if rel == 0:
                lead(bar, 'whistle', 12, .75, .09, .25, .35)
                lead(bar, 'strings', 0, .9, .22, -.3, .3)
                pads(bar, ROOTS, 2, .7, .16)
                mx.add(T(bar), C.drone(38, BAR * 8, .8), .14, 0, .3)
        elif name == 'D':
            r = GROOVE_ROOTS[rel]
            strum(bar, r, .8)
            drums(bar, 'light' if rel < 6 else 'groove', fill=(rel == 7))
            if rel == 0:
                beat = 0
                for m, d in THEME[:15]:
                    mx.add(T(bar, beat), C.strings_legato(m - 24, d * BEAT * .97, .9), .26, -.2, .35)
                    beat += d
            if rel in (2, 6):
                mx.add(T(bar), C.brass(50, BAR * 1.8, .6), .16, .2, .4)
                mx.add(T(bar), C.brass(45, BAR * 1.8, .55), .12, -.2, .4)
    if ending:
        te = t0 + (bars[-1][0] + 1) * BAR
        mx.add(te, C.taiko(58, 1.0, 1.0), .45, 0, .5)
        mx.add(te, C.frame(1.0, 150), .4, 0, .4)
        for m in (50, 57, 62):
            mx.add(te, pluck(m, BAR, .9, .6), .3, rng.uniform(-.4, .4), .4)
        mx.add(te, C.strings_spic(38, BAR, 1.0), .35, 0, .4)
        mx.add(te, whistle(74, BAR * 1.2, .7), .2, .2, .5)

def plan():
    secs = [('intro', 4), ('A', 8), ('B', 8), ('C', 8), ('D', 8), ('B', 8)]
    bars = []; b = 0
    for name, ln in secs:
        for r in range(ln):
            bars.append((b, (name, r))); b += 1
    return bars

if __name__ == '__main__':
    mode, out = sys.argv[1], sys.argv[2]
    bars = plan()
    if mode == 'full':
        mx = Mix((len(bars) + 1) * BAR + 6)
        score(mx, bars, ending=True)
        y = C.master(mx)
        y = y[:, : s((len(bars) + 1) * BAR + 4.5)]
        fade = np.clip((y.shape[1] - np.arange(y.shape[1])) / s(1.0), 0, 1)
        C.write_wav(out, y * fade)
    elif mode == 'loop':
        body = [(b - 4, sec) for b, sec in bars if sec[0] != 'intro']
        L = s(len(body) * BAR)
        pre = s(1.0)
        mx = Mix(len(body) * BAR + 7)
        score(mx, body, t0=1.0)
        y = C.master(mx)
        seg = y[:, pre: pre + L].copy()
        seg[:, -pre:] += y[:, :pre]
        tail = y[:, pre + L:]
        seg[:, : tail.shape[1]] += tail
        y = seg
        C.write_wav(out, np.clip(y, -1, 1))
    elif mode == 'intro':
        intro = [(b, sec) for b, sec in bars if sec[0] == 'intro']
        mx = Mix(len(intro) * BAR + 6)
        score(mx, intro)
        y = C.master(mx)
        C.write_wav(out, y[:, : s(len(intro) * BAR)])
