#!/usr/bin/env python3
# "The Nice Song" -- the Mind's Eye's music for Labyrinth of Roots (Adrian, 17 Nov 2026: "battles need a
# ME music boost"; "make them feel entrenched"). The Seen's own hymn, the one everybody says is nice:
# it goes up where you think it'll go down. Heard two ways, on one theme, in F minor:
#   The Nice Song (cult fights: the Lenses, Clauneck, the Quiet Knives, the Blind Fleet, the Pupil's
#     garrison). 96 bpm. A low drone that never stops, men's voices chanting the hymn in unison on "oo",
#     a slow heartbeat on the frame drum, a small Sighthouse bell, low strings creeping in eighths.
#     Old and heavy rather than fast, so it sits under Rootbreaker and away from the raid music.
#   The Blink (Haggith only). 120 bpm. The same hymn, but the whole congregation: choir in full chords,
#     taiko, brass, the strings driven, the heartbeat doubled, the bell tolling, and a key-lift a half
#     step up for the last third, where the hymn "goes up".
# Borrows the instruments from rootbreaker.py. Numpy only, no samples.
#
#   PK=1.2 python3 the-minds-eye.py song-intro a.wav   # song-loop, blink-intro, blink-loop
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import rootbreaker as C
from rootbreaker import s, mhz, fft_filter, lp, hp, bp, env_adsr, SR, Mix

rng = np.random.default_rng(1117)
C.rng = rng

# The hymn: eight bars in F minor. Each phrase climbs where a hymn would settle (Ab up to Db, C up to F).
HYMN = [(65, 1), (68, 1), (67, .5), (68, .5), (72, 1),  (73, 2), (72, 2),
        (70, 1), (68, 1), (67, 1), (65, 1),             (64, 2), (67, 2),
        (65, 1), (68, 1), (72, 1), (73, 1),             (75, 1.5), (73, .5), (72, 2),
        (70, 1), (73, 1), (72, 1), (77, 1),             (76, 2), (77, 2)]   # 32 beats
ROOTS = [29, 32, 34, 29, 37, 34, 28, 29]   # F Ab Bb F Db Bb E F  (bass, MIDI)
CHORD = {29: (0, 3, 7), 32: (0, 4, 7), 34: (0, 3, 7), 37: (0, 4, 7), 28: (0, 3, 6)}

def bell(dur, vel=1.0, f0=880.0):
    """A small cast bell, the kind that hangs over a Sighthouse door."""
    n = s(dur); t = np.arange(n) / SR
    y = np.zeros(n)
    for ratio, amp, dec in ((1.0, 1.0, 1.6), (2.0, .4, 1.0), (2.41, .5, .9), (3.0, .3, .6), (4.07, .22, .4), (0.5, .3, 2.2)):
        y += amp * np.sin(2 * np.pi * f0 * ratio * t + rng.random() * 6) * np.exp(-t / dec)
    strike = fft_filter(rng.standard_normal(n), bp(2000, 7000)) * np.exp(-t / 0.006) * .4
    return (y * .3 + strike) * vel

def heart(vel=1.0, f0=70):
    """A slow heartbeat on a big frame drum: lub, dub."""
    a = C.frame(vel, f0); b = C.frame(vel * .65, f0 - 6)
    out = np.zeros(max(len(a), s(.2) + len(b)))
    out[:len(a)] += a; out[s(.2): s(.2) + len(b)] += b
    return fft_filter(out, lp(500, 2))

def chant(m, dur, vel=1.0, vowel='oo'):
    """Men's voices in unison, close and breathy: the Seen singing."""
    return C.choir(m, dur, vel, vowel, voices=7)

def song_score(mx, bars, t0=0.0, BPM=96):
    BEAT = 60.0 / BPM; BAR = 4 * BEAT
    T = lambda bar, beat=0.0: t0 + bar * BAR + beat * BEAT + rng.normal(0, 0.003)
    for bar, (name, rel) in bars:
        r = ROOTS[rel % 8]
        # the drone that never stops: root and fifth, very low, a voice on top of it
        if rel % 4 == 0:
            mx.add(T(bar), C.drone(29, BAR * 4 + .6, .8), .16, 0, .4)
            mx.add(T(bar), chant(41, BAR * 4 - .3, .7, 'oo'), .11, -.2, .55)
            mx.add(T(bar), chant(48, BAR * 4 - .3, .55, 'oo'), .08, .25, .55)
        # the heartbeat, on one and three
        mx.add(T(bar, 0), heart(.9), .34, 0, .15)
        mx.add(T(bar, 2), heart(.75), .28, 0, .15)
        if name == 'intro':
            if rel == 0: mx.add(T(bar), bell(3.0, .8), .16, .3, .6)
            continue
        # the bell over the door, every other bar
        if rel % 2 == 0: mx.add(T(bar, 0), bell(2.6, .55 if rel % 8 else .8), .11, .35, .6)
        # a deep taiko on the turn of each four bars
        if rel % 4 == 3: mx.add(T(bar, 3), C.taiko(48, .8, .7), .3, 0, .3)
        if rel >= 8:
            # low strings creeping in eighths on the root, quiet, from the second time round
            for k in range(8):
                m = r + 12 + (0, 0, 7, 0, 1, 0, 7, 0)[k]
                mx.add(T(bar, k * .5), C.strings_spic(m, BEAT * .38, (.9, .5, .7, .55, .8, .5, .7, .55)[k], .7), .16, -.2, .2)
            for st in (1, 3): mx.add(T(bar, st + .5), C.rim(.4), .06, .4, .3)
        # the hymn, chanted in unison: once low, then with a second voice an octave up
        if rel in (0, 16):
            beat = 0
            for m, dd in HYMN:
                mx.add(T(bar, beat), chant(m - 12, dd * BEAT * .96, .9, 'ah'), .2, -.1, .5)
                if rel == 16: mx.add(T(bar, beat), chant(m, dd * BEAT * .96, .55, 'oo'), .1, .2, .6)
                beat += dd
        if rel == 8:
            # the middle: the hymn's first half on low legato strings, under the chant's drone
            beat = 0
            for m, dd in HYMN[:13]:
                mx.add(T(bar, beat), C.strings_legato(m - 12, dd * BEAT * .97, .6), .13, .25, .45)
                beat += dd

def blink_score(mx, bars, t0=0.0, BPM=120):
    BEAT = 60.0 / BPM; BAR = 4 * BEAT
    T = lambda bar, beat=0.0: t0 + bar * BAR + beat * BEAT + rng.normal(0, 0.003)
    for bar, (name, rel) in bars:
        up = 1 if (name == 'A' and rel >= 24) else 0   # the hymn goes up: a half step, for the last eight bars
        r = ROOTS[rel % 8] + up
        if name == 'intro':
            # the bell tolls, the congregation draws breath, the heart starts
            if rel == 0:
                for k in range(2): mx.add(T(bar, k * 2), bell(3.2, 1 - k * .15, 660), .2, .2, .6)
                mx.add(T(bar), chant(41, BAR * 2, .9, 'oo'), .16, 0, .5)
            else:
                for b in (0, 1, 2, 3): mx.add(T(bar, b), heart(.6 + b * .12, 72), .34, 0, .15)
                mx.add(T(bar, 3.5), C.taiko(56, .5, .9), .32, 0, .3)
            continue
        if rel % 4 == 0:
            mx.add(T(bar), C.drone(29 + up, BAR * 4 + .6, .9), .15, 0, .35)
        # the heartbeat doubled, and the taiko under it
        for b in range(4): mx.add(T(bar, b), heart(.85 if b % 2 == 0 else .6), .3, 0, .12)
        for st in (0, 5, 8, 11):
            mx.add(T(bar, st / 4), C.taiko(54 if st == 0 else 64, .45, .9 if st == 0 else .6), .3, 0, .2)
        if rel % 4 == 3:
            for k, st in enumerate(range(12, 16)): mx.add(T(bar, st / 4), C.taiko(66 + k * 4, .25, .5 + k * .12), .25, .3 - k * .2, .2)
        for b in (1, 3): mx.add(T(bar, b), C.frame(.9, 150), .26, -.15, .15)
        for st in range(0, 16, 2): mx.add(T(bar, st / 4 + .25), C.rattle(.4), .05, .5, .1)
        # driven low strings, 3+3+2
        for k in range(8):
            m = r + 12 + (0, 0, 7, 0, 0, 7, 1, 0)[k]
            mx.add(T(bar, k * .5), C.strings_spic(m, BEAT * .4, (1, .55, .75, .9, .55, .75, .9, .6)[k]), .28, -.15, .15)
        # the whole congregation, in chords, two to a bar
        tri = CHORD.get(ROOTS[rel % 8], (0, 3, 7))
        for half in (0, 2):
            for k, iv in enumerate(tri):
                mx.add(T(bar, half), chant(r + 24 + iv, BEAT * 1.9, .6, 'ah'), .07, (-.35, 0, .35)[k], .55)
        if rel % 2 == 0:
            for k, m in enumerate((r + 12, r + 19)): mx.add(T(bar, 0), C.brass(m, BEAT * .9, .7), .13, (-.2, .2)[k], .35)
        if rel % 8 == 0: mx.add(T(bar), bell(2.6, .7, 660), .12, .35, .6)
        # the hymn: on strings and voices, then on brass, then everything a half step up
        if rel in (0, 8, 16, 24):
            beat = 0
            for m, dd in HYMN:
                mm = m + up
                if rel in (0, 24): mx.add(T(bar, beat), C.strings_legato(mm, dd * BEAT * .97, .85), .18, -.3, .3)
                if rel in (8, 24): mx.add(T(bar, beat), chant(mm, dd * BEAT * .95, .8, 'ah'), .16, .2, .45)
                if rel == 16: mx.add(T(bar, beat), C.brass(mm - 12, dd * BEAT * .95, .75), .16, 0, .35)
                beat += dd

def plan(kind):
    secs = [('intro', 2), ('A', 24 if kind == 'song' else 32)]
    bars = []; b = 0
    for name, ln in secs:
        for r in range(ln):
            bars.append((b, (name, r))); b += 1
    return bars

def render(kind, mode, out):
    BPM = 96 if kind == 'song' else 120
    BAR = 4 * 60.0 / BPM
    sc = song_score if kind == 'song' else blink_score
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
    kind, part = mode.split('-')
    render(kind, part, out)
