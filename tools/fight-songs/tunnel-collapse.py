#!/usr/bin/env python3
# "The Roof Comes Down" -- a tunnel collapse for The Long Dig (Labyrinth of Roots), written as code
# (numpy only, no samples), like the fight songs beside it. About 9 seconds:
#   0.0-2.0  a timber prop takes the weight: two long creaks (stick-slip friction ringing wooden
#            modes), a little grit trickling off the roof
#   2.0      the prop cracks: a sharp snap, splinters, a low thump
#   2.1-6.0  the fall: a rumble of earth (low brown noise), a pour of soil, stones knocking down
#   6.0-9.0  settling: pebbles, then grit, then dust hissing away to nothing, then silence
# The whole thing sits in a short, close tunnel reverb (it's underground, not in a hall).
#
#   python3 tunnel-collapse.py out.wav
#   ffmpeg -i out.wav -c:a libvorbis -q:a 4 tunnel-collapse.ogg
#   ffmpeg -i out.wav -c:a aac -b:a 128k -f ipod -movflags +faststart tunnel-collapse.mp4
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import rootbreaker as C
from rootbreaker import s, fft_filter, lp, hp, bp, SR, write_wav

rng = np.random.default_rng(3434)
C.rng = rng
DUR = 9.4
N = s(DUR)
t_all = np.arange(N) / SR
out = np.zeros((2, N))
wet_send = np.zeros((2, N))

def put(x, at, pan=0.0, gain=1.0, wet=0.35):
    """Mix mono x into the stereo bus at time `at` (s), with a constant-power pan."""
    i = s(at)
    if i >= N: return
    x = x[: N - i] * gain
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    out[0, i:i + len(x)] += x * l; out[1, i:i + len(x)] += x * r
    wet_send[0, i:i + len(x)] += x * l * wet; wet_send[1, i:i + len(x)] += x * r * wet

def modes(n, parts):
    """A bank of decaying sines: parts = [(freq, amp, decay_s)]."""
    t = np.arange(n) / SR
    y = np.zeros(n)
    for f, a, dec in parts:
        y += a * np.sin(2 * np.pi * f * t + rng.random() * 6) * np.exp(-t / dec)
    return y

def conv(x, ir):
    M = 1 << int(np.ceil(np.log2(len(x) + len(ir))))
    return np.fft.irfft(np.fft.rfft(x, M) * np.fft.rfft(ir, M), M)[: len(x)]

# --- the creak: stick-slip friction. An impulse train whose rate wanders, through wooden modes.
WOOD = [(182, 1.0, .05), (431, .7, .035), (874, .45, .022), (1315, .3, .015), (2210, .15, .009)]
def creak(dur, r0, r1, r2, vel=1.0):
    n = s(dur); t = np.arange(n) / SR
    u = t / dur
    rate = np.where(u < .6, r0 + (r1 - r0) * (u / .6), r1 + (r2 - r1) * ((u - .6) / .4))
    rate *= 1 + .18 * fft_filter(rng.standard_normal(n), lp(6, 1)) / 0.02   # it sticks and slips unevenly
    rate = np.clip(rate, 12, 400)
    ph = np.cumsum(rate / SR)
    imp = np.zeros(n); k = np.nonzero(np.diff(np.floor(ph)) > 0)[0]
    imp[k] = 0.6 + 0.8 * rng.random(len(k))
    body = conv(imp, modes(s(.25), [(f * (0.97 + .06 * rng.random()), a, d) for f, a, d in WOOD]))
    rasp = fft_filter(rng.standard_normal(n), bp(900, 4000)) * .02 * np.minimum(1, rate / 120)
    env = np.sin(np.pi * np.clip(u, 0, 1)) ** 0.7
    return (body + rasp) * env * vel

put(creak(1.15, 38, 95, 60, .8) * .4, 0.12, pan=-.25, wet=.45)
put(creak(0.9, 55, 140, 80, 1.0) * .5, 1.12, pan=.15, wet=.45)

# --- grit trickling off the roof while it creaks, and again after the fall
def grit(at, dur, rate, vel, pan_w=.6):
    t = at
    while t < at + dur:
        n = s(.004 + .006 * rng.random())
        c = fft_filter(rng.standard_normal(n), hp(2500 + 2500 * rng.random())) * np.exp(-np.arange(n) / (n / 4))
        fade = 1 - (t - at) / dur if dur > 1.5 else 1.0
        put(c * vel * (.4 + .6 * rng.random()) * max(fade, .05), t, pan=(rng.random() * 2 - 1) * pan_w, wet=.5)
        t += rng.exponential(1 / rate)

grit(0.4, 1.7, 30, .18)

# --- the crack at 2.0 s: a snap, splinters, a thump
T_CRACK = 2.02
n = s(.6); tt = np.arange(n) / SR
snap = fft_filter(rng.standard_normal(n), hp(700)) * np.exp(-tt / .012) * 1.6
snap += modes(n, [(1180, .8, .03), (2650, .6, .02), (3900, .4, .012), (610, .7, .06)])
thump = modes(n, [(58, 1.4, .18), (96, .8, .12)]) * (1 - np.exp(-tt / .003))
put(snap + thump, T_CRACK, pan=.1, wet=.4)
for k in range(9):   # splinters
    m = s(.05)
    sp = fft_filter(rng.standard_normal(m), bp(1500, 6000)) * np.exp(-np.arange(m) / s(.008))
    put(sp * (.7 - k * .06), T_CRACK + .02 + k * (.012 + .02 * rng.random()), pan=rng.random() - .5, wet=.4)

# --- the fall: rumble (brown noise, low), the pour of soil, and stones
T0 = T_CRACK + 0.08
n = s(5.4); tt = np.arange(n) / SR
brown = np.cumsum(rng.standard_normal(n)); brown -= fft_filter(brown, lp(8, 1))
rumble = fft_filter(brown, lp(140, 3) if False else (lambda f: lp(140, 3)(f) * hp(25, 2)(f)))
rumble /= np.abs(rumble).max()
env = np.minimum(1, tt / .35) * np.exp(-np.maximum(0, tt - 1.6) / 1.1)
rumble *= env * (1 + .35 * fft_filter(rng.standard_normal(n), lp(5, 1)) / .02)
put(rumble * 1.6, T0, wet=.25)
put(rumble * .5, T0 + .013, pan=.6, wet=.25)   # a touch of width

pour = fft_filter(rng.standard_normal(n), bp(220, 2200))
pour /= np.abs(pour).max()
penv = np.minimum(1, tt / .2) * np.exp(-np.maximum(0, tt - 1.2) / .9)
pour *= penv * np.clip(1 + .6 * fft_filter(rng.standard_normal(n), lp(9, 1)) / .02, 0, 2) * .35
put(pour, T0, pan=-.2, wet=.4)

def stone(size):
    """One stone knocking down: a low pitched knock plus a short click."""
    f = 70 + 260 * (1 - size) * rng.random() + 40
    m = s(.35)
    k = modes(m, [(f, 1.0, .05 + .12 * size), (f * 2.3, .5, .03 + .05 * size), (f * 3.9, .25, .02)])
    k += fft_filter(rng.standard_normal(m), bp(400, 3000)) * np.exp(-np.arange(m) / s(.006)) * .6
    return k * (.4 + .9 * size)

t = T0
while t < T0 + 4.2:
    u = (t - T0) / 4.2
    dens = 55 * (1 - u) ** 1.6 + 3   # stones a second: a rush, then fewer
    put(stone(rng.random() * (1 - .6 * u)) * (1 - .7 * u), t, pan=rng.random() * 1.6 - .8, wet=.45)
    t += rng.exponential(1 / dens)
for k, at in enumerate((T0 + .05, T0 + .4, T0 + .95)):   # three big ones
    put(stone(1.0) * 1.8, at, pan=(-.3, .35, -.1)[k], wet=.5)

# --- settling: pebbles, grit, dust hiss, silence
t = T0 + 3.6
while t < T0 + 6.2:
    put(stone(.15 * rng.random()) * .35, t, pan=rng.random() * 1.4 - .7, wet=.5)
    t += rng.exponential(1 / 2.5)
grit(T0 + 3.2, 3.2, 26, .14, pan_w=.8)
n = s(3.4); tt = np.arange(n) / SR
dust = fft_filter(rng.standard_normal(n), bp(1800, 9000)) * .03 * np.exp(-tt / .9) * np.minimum(1, tt / .3)
put(dust, T0 + 3.4, wet=.3)

# --- a close tunnel: short, dark, a few hard early reflections off the walls
def tunnel_ir(sec=0.9):
    m = s(sec); tt = np.arange(m) / SR
    ir = np.zeros((2, m))
    for c in range(2):
        x = fft_filter(rng.standard_normal(m), lp(1400, 2)) * np.exp(-tt / .17)
        x[: s(.006)] = 0
        for k in range(14):
            x[s(.004 + rng.random() * .05)] += (rng.random() - .5) * 2.2
        ir[c] = x / np.sqrt((x ** 2).sum())
    return ir

ir = tunnel_ir()
for c in range(2):
    out[c] += conv(wet_send[c], ir[c]) * .9
for c in range(2):
    out[c] = fft_filter(out[c], lambda f: hp(28, 2)(f) * lp(12000, 1)(f))
out = out / np.abs(out).max() * 1.15
out = np.tanh(out) / np.tanh(1.15) * 0.89
fade = np.ones(N); fade[-s(.4):] = np.linspace(1, 0, s(.4))
out *= fade
write_wav(sys.argv[1] if len(sys.argv) > 1 else "tunnel-collapse.wav", out)
