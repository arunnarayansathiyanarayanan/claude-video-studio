#!/usr/bin/env python3
"""
Original music + sound design generator (pure numpy/scipy, no samples, no licences).
Usage: python3 audio_score.py score.json out.wav

score.json keys:
  bpm, duration, chords (list of [root_midi, 'min'|'maj'] per bar),
  sections: [{t0,t1,type: intro|build|drop|break|outro}],
  impacts:[[t, size]], whooshes:[t], glitches:[t], pops:[t], clicks:[t],
  risers:[[t0,t1]], rolls:[[t0,t1]], confetti:[t], swish:[t],
  ambience:[{file,in,t0,dur,gain}]   (clip audio, e.g. crowd)
  speech:[{file,in,t0,dur,gain}]     (dialogue — transcribe.py writes these; music ducks under it)
  music: true|false                   (false = SFX/speech only, e.g. Instagram version for in-app trending audio)
  music_bed, sfx_gain, speech_gain   (levels; LinkedIn talking head: music_bed 0.25)
"""
import json, sys, subprocess, os
import numpy as np
from scipy import signal

SR = 48000
R = np.random.RandomState(1)

def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def env_exp(n, tau): return np.exp(-np.arange(n) / (tau * SR))
def noise(n): return R.uniform(-1, 1, n)
def bp(x, lo, hi, order=2): b, a = signal.butter(order, [lo / (SR / 2), hi / (SR / 2)], 'band'); return signal.lfilter(b, a, x)
def lp(x, f, order=2): b, a = signal.butter(order, min(f, SR / 2 - 100) / (SR / 2), 'low'); return signal.lfilter(b, a, x)
def hp(x, f, order=2): b, a = signal.butter(order, f / (SR / 2), 'high'); return signal.lfilter(b, a, x)
def saw(f, n, ph=0.0): t = np.arange(n) / SR; return 2 * ((t * f + ph) % 1) - 1

def add(buf, x, t, g=1.0):
    i = int(t * SR)
    if i >= len(buf): return
    x = x[:len(buf) - i]
    if i < 0: x = x[-i:]; i = 0
    buf[i:i + len(x)] += g * x

# ---------- instruments ----------
def kick():
    n = int(.45 * SR); t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t / .035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * env_exp(n, .16)
    x[:200] += noise(200) * np.linspace(.6, 0, 200)
    return np.tanh(x * 1.6)

def clap():
    n = int(.35 * SR); x = np.zeros(n)
    for k, d in enumerate([0, .011, .022, .034]):
        i = int(d * SR); m = n - i
        x[i:] += noise(m) * env_exp(m, .012 if k < 3 else .12)
    x = bp(x, 900, 3200)
    body = np.sin(2 * np.pi * 190 * np.arange(n) / SR) * env_exp(n, .05) * .4
    return (x * 1.4 + body) * .9

def hat(open_=False):
    n = int((.22 if open_ else .05) * SR)
    return hp(noise(n), 7500) * env_exp(n, .07 if open_ else .012)

def bass_note(m, dur):
    n = int(dur * SR)
    f = mtof(m)
    x = saw(f, n) * .6 + saw(f * 1.005, n) * .4 + np.sin(2 * np.pi * f / 2 * np.arange(n) / SR) * .8
    e = np.minimum(1, np.arange(n) / 200) * env_exp(n, dur * .9)
    return lp(x, 380) * e

def pad_chord(notes, dur, cutoff):
    n = int(dur * SR); x = np.zeros(n)
    for m in notes:
        f = mtof(m)
        for d in (-0.12, -0.05, 0, 0.05, 0.12):
            x += saw(f * 2 ** (d / 12), n, R.rand())
    x /= len(notes) * 5
    a = np.minimum(1, np.arange(n) / (0.08 * SR)); r = np.minimum(1, (n - np.arange(n)) / (0.15 * SR))
    return lp(x, cutoff, 2) * a * r

def pluck(m, dur=.22):
    n = int(dur * SR); f = mtof(m)
    x = np.sign(np.sin(2 * np.pi * f * np.arange(n) / SR)) * .5 + saw(f * 1.003, n) * .5
    return lp(x, 2600) * env_exp(n, .07)

def impact(size=1.0):
    n = int(1.6 * SR); t = np.arange(n) / SR
    f = 30 + 60 * np.exp(-t / .12)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, .45)
    crash = lp(noise(n), 5000) * env_exp(n, .35) * .35
    return np.tanh((sub * 1.2 + crash) * size * 1.4) * .9

def sweep_noise(n, f0, f1, curve=1.0, bands=10):
    """Noise whose band centre glides f0->f1 (crossfaded filter bank, click-free)."""
    x = noise(n); p = (np.arange(n) / n) ** curve
    fc = f0 * (f1 / f0) ** p
    centers = np.geomspace(min(f0, f1), max(f0, f1), bands); out = np.zeros(n)
    for c in centers:
        g = np.exp(-(np.log(fc / c) / .35) ** 2)
        out += bp(x, c / 1.4, min(c * 1.4, 22000), 1) * g
    return out

def whoosh(dur=.5, up=True):
    n = int(dur * SR)
    out = sweep_noise(n, 400, 6000) if up else sweep_noise(n, 6000, 400)
    return out * np.sin(np.linspace(0, np.pi, n)) ** 2 * 1.4

def riser(dur):
    n = int(dur * SR); t = np.arange(n) / SR; p = t / dur
    f = 200 * 2 ** (p * 3)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * .25
    return (sweep_noise(n, 300, 9000, 2.0) * .8 + tone) * p ** 2

def glitch():
    n = int(.16 * SR); x = np.zeros(n); seg = int(.02 * SR)
    for i in range(0, n, seg):
        f = R.choice([220, 440, 880, 1760, 110])
        s = np.sign(np.sin(2 * np.pi * f * np.arange(seg) / SR))
        x[i:i + seg] = s[:len(x[i:i + seg])] * (R.rand() > .25)
    x = np.round(x * 4) / 4
    return x * .35

def pop():
    n = int(.12 * SR); t = np.arange(n) / SR
    f = 900 * np.exp(-t / .02) + 500
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, .025) * .7

def click():
    n = int(.03 * SR); return hp(noise(n), 3000) * env_exp(n, .004) * .9

def chime(m):
    n = int(.9 * SR); f = mtof(m); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) + .4 * np.sin(2 * np.pi * f * 2.76 * t)) * env_exp(n, .25) * .25

def swish():
    n = int(.25 * SR); return bp(noise(n), 2000, 8000) * np.sin(np.linspace(0, np.pi, n)) ** 3 * .8

def scribble(dur):
    n = int(dur * SR); t = np.arange(n) / SR
    x = bp(noise(n), 1800, 6500, 2)
    flutter = .55 + .45 * np.sin(2 * np.pi * (14 + 6 * np.sin(2 * np.pi * 1.3 * t)) * t) ** 2
    strokes = .6 + .4 * np.abs(np.sin(2 * np.pi * 3.2 * t + R.rand() * 6))
    e = np.minimum(1, np.minimum(np.arange(n), n - np.arange(n)) / (.02 * SR))
    return x * flutter * strokes * e * .5

def reverb(x, secs=1.8, wet=.25):
    n = int(secs * SR); ir = noise(n) * env_exp(n, secs / 5)
    ir = lp(ir, 6000); ir /= np.sqrt(np.sum(ir ** 2))
    return x + signal.fftconvolve(x, ir)[:len(x)] * wet

# ---------- arrangement ----------
def main():
    sc = json.load(open(sys.argv[1])); out = sys.argv[2]
    root = os.path.dirname(os.path.abspath(sys.argv[1]))
    D = sc["duration"]; N = int((D + 2.5) * SR)
    beat = 60 / sc["bpm"]; bar = 4 * beat
    drums, bass, pad, arp, fx, amb = (np.zeros(N) for _ in range(6))
    sec = lambda t: next((s["type"] for s in sc["sections"] if s["t0"] <= t < s["t1"]), "outro")
    chords = sc["chords"]
    def chord_at(t):
        r, q = chords[int(t // bar) % len(chords)]
        return r, [r, r + (3 if q == "min" else 4), r + 7]
    K, CL = kick(), clap()
    kicks = []
    nb = int(D / beat) + 1
    for b in range(nb):
        t = b * beat; s = sec(t)
        if s in ("build", "drop", "outro") and t < D - 1.2:
            add(drums, K, t, .95); kicks.append(t)
            if b % 2 == 1: add(drums, CL, t, .55)
            add(drums, hat(True), t + beat / 2, .16)
            if s == "drop":
                for k in (1, 3): add(drums, hat(), t + k * beat / 4, .12)
        if s == "mid" and t < D - 1.2:
            if b % 4 in (0, 3) and not (b % 8 == 3): add(drums, K, t, .75); kicks.append(t)
            if b % 4 == 2: add(drums, CL, t, .42)
            add(drums, hat(), t + beat / 2, .1)
        if s == "break":
            if b % 2 == 1: add(drums, hat(), t, .1)
            if b % 4 == 0 and t < 24.4: add(drums, K, t, .5); kicks.append(t)
    # snare rolls
    for t0, t1 in sc.get("rolls", []):
        t = t0; k = 0
        while t < t1:
            p = (t - t0) / (t1 - t0); step = beat / 2 if p < .5 else beat / 4 if p < .8 else beat / 8
            add(drums, CL, t, .2 + .4 * p); t += step
    # bass: 8th notes, octave jumps on drop
    for b in range(int(D / (beat / 2))):
        t = b * beat / 2; s = sec(t)
        if s in ("build", "drop", "outro", "mid") and t < D - 1.0 and not (s == "mid" and b % 2):
            r, _ = chord_at(t); m = r - 24 + (12 if (s == "drop" and b % 4 == 3) else 0)
            add(bass, bass_note(m, beat / 2 * .95), t, .55)
    # pads per bar, filter opens through build
    for i in range(int(D / bar) + 1):
        t = i * bar; s = sec(t + .01)
        _, notes = chord_at(t)
        cutoff = {"intro": 900, "build": 900 + 2500 * min(1, max(0, (t - 2.5) / 4.5)), "drop": 4200, "break": 1600, "outro": 4200, "mid": 2400}[s]
        add(pad, pad_chord([n + 12 for n in notes] + [notes[0]], bar, max(cutoff, 600)), t, .32)
    # arp 16ths on drop/break
    for b in range(int(D / (beat / 4))):
        t = b * beat / 4; s = sec(t)
        if s in ("drop", "break", "mid") or (s == "outro" and t < D - 2):
            _, notes = chord_at(t); seq = [0, 1, 2, 1, 2, 0, 2, 1]
            m = notes[seq[b % 8]] + 24 + (12 if b % 16 == 14 else 0)
            add(arp, pluck(m), t, {"break": .19, "mid": .13}.get(s, .22))
    # FX
    for t, s in sc.get("impacts", []): add(fx, impact(s), t, .9 * s)
    for t in sc.get("whooshes", []): add(fx, whoosh(.5), t - .3, .5)
    for t in sc.get("glitches", []): add(fx, glitch(), t, .6)
    for t in sc.get("pops", []): add(fx, pop(), t, .55)
    for t in sc.get("clicks", []): add(fx, click(), t, .7)
    for t in sc.get("swish", []): add(fx, swish(), t, .6)
    for t0, t1 in sc.get("risers", []): add(fx, riser(t1 - t0), t0, .55)
    for t in sc.get("confetti", []):
        add(fx, hp(noise(int(.08 * SR)), 1500) * env_exp(int(.08 * SR), .015), t, .9)
        for k, m in enumerate([93, 96, 100, 105, 98, 101]): add(fx, chime(m), t + .05 + k * .07, .5)
    for t, d in sc.get("scribbles", []): add(fx, scribble(d), t, .55)
    for t in sc.get("sparkles", []): add(fx, chime(100 + int(t * 7) % 9), t, .3)
    # dialogue (talking head / interview): full level, music ducks under it
    speech = np.zeros(N)
    for a in sc.get("speech", []):
        tmp = "/tmp/_sp.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(a["in"]), "-t", str(a["dur"]), "-i",
                        os.path.join(root, a["file"]), "-ac", "1", "-ar", str(SR), tmp], check=True)
        from scipy.io import wavfile
        _, x = wavfile.read(tmp); x = x.astype(np.float32) / 32768
        f = np.minimum(1, np.minimum(np.arange(len(x)), len(x) - np.arange(len(x))) / (.01 * SR))
        add(speech, x * f, a["t0"], a.get("gain", 1.0))
    # ambience from clips
    for a in sc.get("ambience", []):
        tmp = "/tmp/_amb.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(a["in"]), "-t", str(a["dur"]), "-i",
                        os.path.join(root, a["file"]), "-ac", "1", "-ar", str(SR), tmp], check=True)
        from scipy.io import wavfile
        _, x = wavfile.read(tmp); x = x.astype(np.float32) / 32768
        f = np.minimum(1, np.minimum(np.arange(len(x)), len(x) - np.arange(len(x))) / (.25 * SR))
        add(amb, x * f, a["t0"], a["gain"])
    # sidechain from kicks
    sc_env = np.ones(N)
    for t in kicks:
        i = int(t * SR); n = int(.3 * SR); seg = sc_env[i:i + n]
        seg *= 1 - .65 * env_exp(len(seg), .09)
    music = reverb(pad, 2.2, .35) * sc_env + bass * sc_env + reverb(arp, 1.2, .25) * sc_env + drums
    if not sc.get("music", True): music = music * 0          # e.g. Instagram export where trending audio is added in-app
    if np.any(speech):                                          # duck music ~-14 dB under dialogue
        env = np.convolve(np.abs(speech), np.ones(int(.25 * SR)) / int(.25 * SR), "same")
        duck = 1 - .8 * np.clip(env / (env.max() * .15 + 1e-9), 0, 1)
        music = music * duck * sc.get("music_bed", 0.45)
    mix = music * .8 + reverb(fx, 1.4, .18) * sc.get("sfx_gain", 1.0) + amb + speech * sc.get("speech_gain", 1.4)
    mix = mix[:int(D * SR)]
    # stereo widen: short delay on pad/arp side
    side = np.roll(reverb(pad + arp, 1.0, .5)[:len(mix)] * sc_env[:len(mix)], int(.012 * SR)) * .18
    L, Rr = mix + side, mix - side
    st = np.stack([L, Rr], 1)
    st = np.tanh(st / (np.max(np.abs(st)) + 1e-9) * 1.6) * .9
    from scipy.io import wavfile
    wavfile.write(out, SR, (st * 32767).astype(np.int16))
    print("wrote", out)

if __name__ == "__main__":
    main()
