#!/usr/bin/env python3
# "Rootbreaker" -- an original fight song for Labyrinth of Roots.
# C Phrygian, 144 bpm, 4/4 with a 3+3+2 war-drum pulse.
# Everything is synthesised here with numpy: taiko + frame drums, bone rattle,
# smithy anvil, spiccato low strings, low brass, male choir, bowed drone.
import numpy as np, sys, wave

SR = 44100
BPM = 144
BEAT = 60.0 / BPM
BAR = 4 * BEAT
rng = np.random.default_rng(1337)

def s(t):                      # seconds -> samples
    return int(round(t * SR))
def mhz(m):
    return 440.0 * 2 ** ((m - 69) / 12.0)

# ---------------------------------------------------------------- DSP helpers
def fft_filter(x, gain_fn):
    n = len(x)
    N = 1 << int(np.ceil(np.log2(n + 16)))
    X = np.fft.rfft(x, N)
    f = np.fft.rfftfreq(N, 1 / SR)
    X *= gain_fn(f)
    return np.fft.irfft(X, N)[:n]

def lp(fc, order=2):
    return lambda f: 1 / np.sqrt(1 + (f / fc) ** (2 * order))
def hp(fc, order=2):
    return lambda f: 1 / np.sqrt(1 + (fc / np.maximum(f, 1e-3)) ** (2 * order))
def bp(lo, hi, order=2):
    a, b = lp(hi, order), hp(lo, order)
    return lambda f: a(f) * b(f)

def saw(freq, n, phase0=None):
    """PolyBLEP saw; freq may be scalar or per-sample array."""
    fr = np.broadcast_to(np.asarray(freq, float), (n,))
    dt = fr / SR
    ph = (np.cumsum(dt) + (rng.random() if phase0 is None else phase0)) % 1.0
    y = 2 * ph - 1
    m = ph < dt
    x = ph[m] / dt[m]; y[m] -= x + x - x * x - 1
    m = ph > 1 - dt
    x = (ph[m] - 1) / dt[m]; y[m] -= x * x + x + x + 1
    return y

def env_adsr(n, a, d, sl, r_start, r):
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-4), sl + (1 - sl) * np.exp(-(t - a) / max(d, 1e-4)))
    rel = t >= r_start
    e[rel] *= np.exp(-(t[rel] - r_start) / max(r, 1e-4))
    return e

# ---------------------------------------------------------------- mix buses
class Mix:
    def __init__(self, seconds):
        self.n = s(seconds)
        self.dry = np.zeros((2, self.n))
        self.wet = np.zeros((2, self.n))
    def add(self, t, sig, gain=1.0, pan=0.0, send=0.2):
        i = s(t)
        if i >= self.n or len(sig) == 0:
            return
        if sig.ndim == 1:
            th = (pan + 1) * np.pi / 4
            sig = np.vstack([sig * np.cos(th), sig * np.sin(th)]) * np.sqrt(2)
        j = min(self.n, i + sig.shape[1])
        if i < 0:
            sig = sig[:, -i:]; i = 0
        seg = sig[:, : j - i] * gain
        k = min(s(0.03), seg.shape[1])
        if k > 1 and seg.shape[1] == sig.shape[1]:
            seg = seg.copy(); seg[:, -k:] *= np.linspace(1, 0, k)
        self.dry[:, i:j] += seg
        self.wet[:, i:j] += seg * send

# ---------------------------------------------------------------- instruments
def taiko(f0=52, dec=0.9, vel=1.0):
    n = s(dec * 3)
    t = np.arange(n) / SR
    f = f0 * (1 + 1.4 * np.exp(-t / 0.018))
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / dec) + 0.35 * np.sin(1.58 * ph) * np.exp(-t / (dec * 0.45))
    hit = fft_filter(rng.standard_normal(n), bp(80, 900)) * np.exp(-t / 0.025) * 0.6
    skin = fft_filter(rng.standard_normal(n), bp(900, 4000)) * np.exp(-t / 0.008) * 0.25
    y = body + hit + skin
    y = np.tanh(1.6 * y) / np.tanh(1.6)
    return y * vel

def frame(vel=1.0, f0=170):
    n = s(0.35)
    t = np.arange(n) / SR
    f = f0 * (1 + 0.5 * np.exp(-t / 0.01))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.09)
    slap = fft_filter(rng.standard_normal(n), bp(400, 3500)) * np.exp(-t / 0.03)
    return (0.8 * body + 0.5 * slap) * vel

def rim(vel=1.0):
    n = s(0.12)
    t = np.arange(n) / SR
    y = fft_filter(rng.standard_normal(n), bp(1800, 7000)) * np.exp(-t / 0.018)
    y += 0.4 * np.sin(2 * np.pi * 820 * t) * np.exp(-t / 0.02)
    return y * vel

def rattle(vel=1.0):
    n = s(0.09)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for k, off in enumerate((0.0, 0.009 + rng.random() * 0.004, 0.02 + rng.random() * 0.006)):
        i = s(off)
        m = n - i
        tt = t[:m]
        y[i:] += rng.standard_normal(m) * np.exp(-tt / 0.006) * (1, 0.6, 0.35)[k]
    return fft_filter(y, bp(2500, 9000)) * vel

def anvil(vel=1.0, f=620):
    n = s(1.6)
    t = np.arange(n) / SR
    parts = [(1.0, 1.0, 0.6), (2.76, 0.5, 0.35), (5.40, 0.35, 0.18), (8.93, 0.2, 0.08), (1.51, 0.25, 0.4)]
    y = sum(a * np.sin(2 * np.pi * f * r * t + rng.random() * 6) * np.exp(-t / d) for r, a, d in parts)
    y += fft_filter(rng.standard_normal(n), bp(2000, 8000)) * np.exp(-t / 0.004) * 0.5
    return y * vel

def strings_spic(m, dur, vel=1.0, bright=1.0):
    """Short, biting low-string note (cellos + basses)."""
    n = s(dur + 0.25)
    f = mhz(m)
    y = sum(saw(f * 2 ** (c / 1200), n) for c in (-7, 0, 6))
    y = fft_filter(y, lp(min(f * 7 * bright + 300, 6000), 2))
    e = env_adsr(n, 0.006, 0.09, 0.35, dur, 0.06)
    # bow scrape on attack
    sc = fft_filter(rng.standard_normal(n), bp(1500, 5000)) * np.exp(-np.arange(n) / SR / 0.012) * 0.25
    return (y / 3 * e + sc) * vel

def strings_legato(m, dur, vel=1.0):
    n = s(dur + 1.0)
    t = np.arange(n) / SR
    f = mhz(m)
    out = np.zeros(n)
    for c in (-9, -3, 3, 9):
        vib = 1 + 0.0035 * np.sin(2 * np.pi * (5.2 + rng.random() * 0.6) * t + rng.random() * 6) * np.clip((t - 0.2) / 0.4, 0, 1)
        out += saw(f * 2 ** (c / 1200) * vib, n)
    out = fft_filter(out, lambda fr: lp(3200, 2)(fr) * (1 + 0.8 * np.exp(-((fr - 2500) / 900) ** 2)) * hp(120)(fr))
    e = env_adsr(n, 0.12, 0.5, 0.85, dur, 0.25)
    return out / 4 * e * vel

def brass(m, dur, vel=1.0):
    """Low horns / trombones."""
    n = s(dur + 0.7)
    t = np.arange(n) / SR
    f = mhz(m)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.0 * t) * np.clip((t - 0.35) / 0.5, 0, 1)
    scoop = 1 - 0.012 * np.exp(-t / 0.04)
    src = sum(saw(f * 2 ** (c / 1200) * vib * scoop, n) for c in (-5, 0, 4)) / 3
    dark = fft_filter(src, lp(f * 2.5 + 200, 2))
    bright = fft_filter(src, lp(f * 9 + 600, 2))
    a = min(0.07, dur * 0.4)
    swell = np.clip(t / a, 0, 1) * np.exp(-np.maximum(t - a, 0) / 0.35) * 0.8 + 0.2 * np.clip(t / 0.3, 0, 1)
    swell = np.clip(swell * vel, 0, 1)
    y = dark * (1 - swell) + bright * swell
    y = np.tanh(2.2 * y) / np.tanh(2.2)
    e = env_adsr(n, a, 0.4, 0.8, dur, 0.12)
    breath = fft_filter(rng.standard_normal(n), bp(600, 3000)) * np.exp(-t / 0.05) * 0.05
    return (y * e + breath) * vel

VOWELS = {
    'ah': [(700, 90, 1.0), (1150, 100, 0.5), (2600, 140, 0.25), (3300, 200, 0.1)],
    'oh': [(450, 80, 1.0), (800, 90, 0.45), (2830, 150, 0.12), (3500, 200, 0.06)],
    'oo': [(320, 70, 1.0), (700, 90, 0.25), (2500, 150, 0.06)],
}
def choir(m, dur, vel=1.0, vowel='ah', voices=5):
    n = s(dur + 1.6)
    t = np.arange(n) / SR
    f = mhz(m)
    src = np.zeros(n)
    for v in range(voices):
        drift = 1 + 0.003 * np.sin(2 * np.pi * (0.2 + rng.random() * 0.3) * t + rng.random() * 6)
        vib = 1 + 0.006 * np.sin(2 * np.pi * (4.8 + rng.random() * 1.2) * t + rng.random() * 6)
        src += saw(f * 2 ** ((rng.random() - 0.5) * 22 / 1200) * drift * vib, n)
    src += rng.standard_normal(n) * 0.25 * voices
    fm = VOWELS[vowel]
    def g(fr):
        out = 0.02 + sum(a * np.exp(-0.5 * ((fr - fc) / bw) ** 2) for fc, bw, a in fm)
        return out * hp(90)(fr)
    y = fft_filter(src, g) / voices
    e = env_adsr(n, 0.35, 1.0, 0.9, dur, 0.45)
    return y * e * vel

def drone(m, dur, vel=1.0):
    n = s(dur)
    t = np.arange(n) / SR
    f = mhz(m)
    y = np.zeros(n)
    for c in (-6, 0, 5):
        y += saw(f * 2 ** (c / 1200) * (1 + 0.002 * np.sin(2 * np.pi * 0.13 * t)), n)
    y += 0.6 * saw(f * 1.5 * (1 + 0.0015 * np.sin(2 * np.pi * 0.09 * t)), n)
    # slow filter "breathing" via two filtered copies crossfaded
    a = fft_filter(y, lp(f * 2 + 80, 3)); b = fft_filter(y, lp(f * 6 + 200, 3))
    w = 0.5 + 0.5 * np.sin(2 * np.pi * t / (BAR * 4) - np.pi / 2)
    fade = np.clip(t / 3.0, 0, 1) * np.clip((dur - t) / 2.0, 0, 1)
    return (a * (1 - w) + b * w) * fade * vel / 3

def root_groan(dur, vel=1.0):
    """Creaking-root texture: low filtered noise with a slow pitch groan."""
    n = s(dur)
    t = np.arange(n) / SR
    y = fft_filter(rng.standard_normal(n), bp(60, 260, 3))
    f = 38 + 6 * np.sin(2 * np.pi * t / dur * 1.5)
    y += 0.5 * fft_filter(saw(f, n), lp(300, 3)) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.7 * t) ** 2)
    fade = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    return y * fade * vel

# ---------------------------------------------------------------- harmony
SCALE = [0, 1, 3, 5, 7, 8, 10]           # C phrygian
def snap_step(m, steps):
    """Move m by `steps` scale degrees (m must be in scale; falls back gracefully)."""
    pc = m % 12
    if pc not in SCALE:
        return m + steps
    i = SCALE.index(pc); octv = m // 12
    j = i + steps
    return (octv + j // 7) * 12 + SCALE[j % 7]
def triad(root):
    if root % 12 == 7:                  # G: grim dominant with b9 colour (G B D Ab)
        return [root, root + 4, root + 7, root + 13]
    return [root, snap_step(root, 2), snap_step(root, 4)]

THEME = [  # (midi, beats) -- 8 bars
    (55, 1.5), (56, .5), (55, 1), (53, .5), (51, .5),
    (49, 2), (48, 2),
    (51, 1), (53, 1), (55, 1.5), (58, .5),
    (56, 3), (55, 1),
    (60, 1.5), (58, .5), (56, 1), (55, 1),
    (53, 1), (51, 1), (49, 2),
    (51, 1), (49, .5), (48, .5), (47, 1), (49, 1),
    (48, 4),
]
THEME_ROOTS = [36, 37, 39, 32, 32, 29, 31, 36]
A_ROOTS = [36, 36, 37, 36, 36, 36, 32, 34]
D_ROOTS = [36, 34, 32, 31, 29, 39, 37, 31]
OST = [0, 0, 0, 12, 0, 0, 's1', 0]        # 8ths, 3+3+2 accents
OST_ACC = [1, .55, .6, 1, .55, .6, .95, .7]

# ---------------------------------------------------------------- the score
def score(mx, bars, t0=0.0, ending=False):
    """bars: list of section names per bar index range."""
    def T(bar, beat=0.0):
        return t0 + bar * BAR + beat * BEAT + rng.normal(0, 0.004)

    def ostinato(bar, root, vel=1.0, bright=1.0, tr=0):
        root += tr
        for k in range(8):
            o = OST[k]
            m = snap_step(root, 1) if o == 's1' else root + o
            v = OST_ACC[k] * vel * (0.92 + rng.random() * 0.16)
            mx.add(T(bar, k * .5), strings_spic(m, BEAT * .42, v, bright), .5, -.25, .15)
            mx.add(T(bar, k * .5), strings_spic(m + 12, BEAT * .42, v * .7, bright), .32, .3, .18)

    def drums(bar, kind='full', fill=False):
        for st in range(16):
            b = st / 4
            if kind in ('full', 'climax'):
                if st == 0:
                    mx.add(T(bar, b), taiko(48, 0.9, 1.0), .42, 0, .25)
                if kind == 'climax' and st == 8:
                    mx.add(T(bar, b), taiko(50, 0.8, .85), .36, -.1, .25)
                if st in (6, 12):
                    mx.add(T(bar, b), taiko(78, 0.35, .8), .3, (-.35, .35)[st == 12], .2)
                if st in (4, 12):
                    mx.add(T(bar, b), rim(.9), .25, .2, .2)
                if st % 2 == 0 and st not in (0, 6, 12):
                    mx.add(T(bar, b), frame(.7, 165 + rng.random() * 10), .28, .45, .15)
                elif st % 2 == 1 and rng.random() < .35:
                    mx.add(T(bar, b), frame(.3, 180), .2, .5, .15)
                if kind == 'climax':
                    mx.add(T(bar, b), rattle(.9 if st % 4 == 0 else .5), .2, -.6, .15)
                    if st in (4, 12):
                        mx.add(T(bar, b), anvil(.8), .05, .55, .35)
            elif kind == 'sparse':
                if st == 0:
                    mx.add(T(bar, b), taiko(46, 1.1, 1.0), .5, 0, .35)
                if st in (6, 12):
                    mx.add(T(bar, b), taiko(80, 0.3, .45), .3, (-.3, .3)[st == 12], .3)
                mx.add(T(bar, b), rattle(.6 if st % 4 == 0 else .3), .16, .6, .2)
            elif kind == 'heart':
                if st in (0, 2):
                    mx.add(T(bar, b), taiko(42, 0.7, (1.0, .6)[st == 2]), .4, 0, .3)
        if fill:
            for k, st in enumerate(range(12, 16)):
                mx.add(T(bar, st / 4), taiko(110 - k * 12, 0.25, .7 + k * .1), .3, .4 - k * .25, .2)
                mx.add(T(bar, st / 4 + .125), frame(.6, 200 - k * 15), .25, -.3, .2)

    def roll(bar, nbars=1, lo=.15, hi=1.0):
        steps = 16 * nbars
        for st in range(steps):
            v = lo + (hi - lo) * (st / steps) ** 1.5
            mx.add(T(bar, st / 4), frame(v, 175 + st), .35, (-.4, .4)[st % 2], .2)
            if st % 4 == 0 or st > steps - 8:
                mx.add(T(bar, st / 4), taiko(70 + st * 1.5, .3, v), .25, 0, .2)

    def theme(bar, inst, oct=0, vel=1.0, tr=0, pan=0.0, gain=.3, send=.3, vowel='ah'):
        beat = 0.0
        for m, d in THEME:
            mm = m + oct + tr
            dur = d * BEAT * .97
            if inst == 'brass':
                mx.add(T(bar, beat), brass(mm, dur, vel), gain, pan, send)
            elif inst == 'strings':
                mx.add(T(bar, beat), strings_legato(mm, dur, vel), gain, pan, send)
            elif inst == 'choir':
                mx.add(T(bar, beat), choir(mm, dur, vel, vowel, 4), gain, pan, send)
            beat += d

    def chords(bar, roots, every=1, vowel='ah', vel=1.0, gain=.2, tr=0, oct=12):
        for i in range(0, len(roots), every):
            r = roots[i] + tr + oct
            while r < 43: r += 12
            while r > 55: r -= 12
            for k, m in enumerate(triad(r)):
                mx.add(T(bar + i), choir(m, every * BAR * .98, vel * (1, .8, .75, .6)[k], vowel),
                       gain, (-.5, .5, -.15, .2)[k], .45)

    for bar, sec in bars:
        rel = sec[1]
        name = sec[0]
        if name == 'intro':
            if rel == 0:
                mx.add(T(bar), drone(36, BAR * 8 + 1.0, 1.0), .34, 0, .3)
                mx.add(T(bar), root_groan(BAR * 8, 1.0), .45, -.2, .3)
            drums(bar, 'heart')
            if rel in (2, 6):
                mx.add(T(bar), brass(48, BAR * 1.6, .9), .32, -.15, .45)
                mx.add(T(bar), brass(43, BAR * 1.6, .8), .26, .15, .45)
                mx.add(T(bar), taiko(44, 1.4, 1.0), .5, 0, .4)
            if rel == 7:
                roll(bar, 1, .1, 1.0)
            if rel in (3, 7):
                mx.add(T(bar, 2), brass(49 if rel == 3 else 47, BEAT * 1.9, .7), .25, -.1, .45)
        elif name == 'A':
            r = A_ROOTS[rel]
            ostinato(bar, r)
            drums(bar, 'full', fill=(rel % 4 == 3))
            if rel == 0:
                mx.add(T(bar), drone(36, BAR * 8, .7), .14, 0, .3)
            if rel in (0, 4):
                chords(bar, [r, r, r, r], 4, 'oo', .6, .25)
        elif name == 'B':
            r = THEME_ROOTS[rel % 8]
            ostinato(bar, r)
            drums(bar, 'full', fill=(rel % 4 == 3))
            if rel % 8 == 0:
                theme(bar, 'brass', 0, .9, gain=.34, pan=-.1)
                if rel == 8:
                    theme(bar, 'strings', 12, .8, gain=.16, pan=.35, send=.35)
                    chords(bar, THEME_ROOTS, 2, 'oh', .7, .26)
        elif name == 'break':
            drums(bar, 'sparse')
            if rel == 0:
                chords(bar, [36, 36, 37, 37, 32, 32, 31, 31], 2, 'ah', .9, .4)
                mx.add(T(bar), drone(36, BAR * 8, 1.0), .16, 0, .3)
                beat = 0
                for m, d in THEME[:13]:
                    mx.add(T(bar, beat), strings_legato(m - 12, d * BEAT * .97, .9), .2, -.3, .4)
                    beat += d
            if rel == 6:
                roll(bar, 2, .1, 1.0)
        elif name == 'C':
            tr = 0 if rel < 8 else 1
            r = THEME_ROOTS[rel % 8] + tr
            ostinato(bar, r, 1.05, 1.3)
            drums(bar, 'climax', fill=(rel % 4 == 3))
            if rel % 8 == 0:
                theme(bar, 'brass', 0, 1.0, tr, -.15, .36)
                theme(bar, 'brass', 12, .8, tr, .2, .2)
                theme(bar, 'strings', 12, .9, tr, .4, .16, .35)
                theme(bar, 'choir', 12, .9, tr, -.4, .3, .4, 'ah')
                chords(bar, THEME_ROOTS, 2, 'ah', .85, .3, tr)
                mx.add(T(bar), drone(36 + tr, BAR * 8, .9), .14, 0, .3)
        elif name == 'D':
            r = D_ROOTS[rel]
            ostinato(bar, r, .95)
            drums(bar, 'full', fill=(rel % 2 == 1))
            if rel % 2 == 0:
                mx.add(T(bar), brass(r + 12, BAR * 1.9, .75), .19, -.2, .4)
                mx.add(T(bar), brass(r + 19, BAR * 1.9, .6), .13, .2, .4)
            if rel == 7:
                for k in range(4):
                    mx.add(T(bar, k), anvil(.9), .1, .5, .4)
    if ending:
        endbar = bars[-1][0] + 1
        te = t0 + endbar * BAR
        mx.add(te, taiko(44, 1.6, 1.0), 1.0, 0, .5)
        mx.add(te + .01, taiko(56, 1.2, .9), .7, .2, .5)
        mx.add(te, anvil(1.0, 560), .14, .4, .6)
        for m, g, p in ((24, .25, 0), (36, .22, -.2), (48, .3, -.1), (55, .22, .1), (60, .2, .2)):
            mx.add(te, brass(m + 12 if m < 36 else m, BAR * 1.5, .9), g, p, .5)
        for m in (48, 55, 60, 63):
            mx.add(te, choir(m, BAR * 1.6, .9, 'ah'), .16, rng.uniform(-.5, .5), .6)
        mx.add(te, strings_spic(24, BAR * 1.2, 1.0), .3, 0, .4)

# ---------------------------------------------------------------- reverb + master
def reverb_ir(seconds=3.2):
    n = s(seconds)
    t = np.arange(n) / SR
    ir = np.zeros((2, n))
    for c in range(2):
        nz = rng.standard_normal(n)
        lo = fft_filter(nz, lp(900, 2)) * np.exp(-t * 6.9 / 2.8)
        hi = fft_filter(nz, hp(900, 2)) * np.exp(-t * 6.9 / 1.3)
        x = lo + .6 * hi
        x[: s(0.022)] = 0
        # sparse early reflections
        for k in range(10):
            i = s(0.008 + rng.random() * 0.07)
            x[i] += (rng.random() - .5) * 1.5
        ir[c] = x
    return ir / np.sqrt((ir ** 2).sum(axis=1, keepdims=True))

def convolve(x, ir):
    out = np.zeros((2, x.shape[1]))
    N = 1 << int(np.ceil(np.log2(x.shape[1] + ir.shape[1])))
    for c in range(2):
        out[c] = np.fft.irfft(np.fft.rfft(x[c], N) * np.fft.rfft(ir[c], N), N)[: x.shape[1]]
    return out

def master(mx):
    wet = convolve(mx.wet, reverb_ir()) * 0.9
    y = mx.dry + wet
    # gentle tilt: tame mud below 30 Hz and fizz above 12k
    for c in range(2):
        y[c] = fft_filter(y[c], lambda f: hp(32, 2)(f) * lp(13000, 1)(f) * (0.5 + 0.5 / (1 + (70 / np.maximum(f, 1)) ** 2) ** -0 * (1 - 1 / (1 + (f / 90) ** 2)) ) * (1 + 0.9 * np.exp(-0.5 * (np.log2(np.maximum(f, 1) / 2600) / 0.9) ** 2)) * (1 + 0.4 / (1 + (6000 / np.maximum(f, 1)) ** 2)))
    pk = float(__import__('os').environ.get('PK', 0)) or np.abs(y).max()
    print('PK', np.abs(y).max(), file=sys.stderr)
    y = y / pk * 1.25
    y = np.tanh(y) / np.tanh(1.25) * 0.93   # glue/soft clip
    return y

def write_wav(path, y):
    d = (np.clip(y.T, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(d.tobytes())

def plan():
    secs = [('intro', 8), ('A', 8), ('B', 16), ('break', 8), ('C', 16), ('D', 8)]
    bars = []; b = 0
    for name, ln in secs:
        for r in range(ln):
            bars.append((b, (name, r))); b += 1
    return bars

if __name__ == '__main__':
    mode = sys.argv[1]
    out = sys.argv[2]
    bars = plan()
    if mode == 'full':
        total = (len(bars) + 1) * BAR + 6
        mx = Mix(total)
        score(mx, bars, ending=True)
        y = master(mx)
        y = y[:, : s((len(bars) + 1) * BAR + 5.5)]
        fade = np.clip((y.shape[1] - np.arange(y.shape[1])) / s(1.0), 0, 1)
        write_wav(out, y * fade)
    elif mode == 'loop':
        body = [(b - 8, sec) for b, sec in bars if sec[0] != 'intro']
        L = s(len(body) * BAR)
        pre = s(1.0)
        mx = Mix(len(body) * BAR + 7)
        score(mx, body, t0=1.0)
        y = master(mx)
        seg = y[:, pre: pre + L].copy()
        seg[:, -pre:] += y[:, :pre]
        tail = y[:, pre + L:]
        seg[:, : tail.shape[1]] += tail
        y = seg
        write_wav(out, np.clip(y, -1, 1))
    elif mode == 'intro':
        intro = [(b, sec) for b, sec in bars if sec[0] == 'intro']
        mx = Mix(len(intro) * BAR + 6)
        score(mx, intro)
        y = master(mx)
        write_wav(out, y[:, : s(len(intro) * BAR)])
