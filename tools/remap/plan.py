#!/usr/bin/env python3
"""Song -> game remap, step 2: pick a clean loop for each game section.
  python3 tools/remap/plan.py song.mp3 analysis.json map.json
map.json: { "intro": {"near": 0.0, "bars": 2}, ..., "outro": {"near": 168.0, "once": true} }
For each section it looks at downbeat candidates within +-3 s of 'near' (beats from the analysis, bars of 4 beats),
and picks the start whose loop seam is smoothest (the bar after the loop end sounds most like the loop's first bar:
chroma + MFCC + loudness). Prints a JS block to paste into SONG.loops in the sketch.
"""
import json, sys
import numpy as np, librosa
song, ana, mp = sys.argv[1:4]
A = json.load(open(ana)); M = json.load(open(mp))
y, sr = librosa.load(song, sr=22050, mono=True); hop = 256
beats = np.array(A['beats'])
F = np.vstack([librosa.util.normalize(librosa.feature.mfcc(y=y, sr=sr, hop_length=hop, n_mfcc=13), axis=1), librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=hop)])
R = librosa.feature.rms(y=y, hop_length=hop)[0]
fr = lambda t: int(t * sr / hop)
def win(t, d):   # feature summary of [t, t+d]
    a, b = fr(t), max(fr(t) + 1, fr(t + d)); return F[:, a:b].mean(1), 20 * np.log10(R[a:b].mean() + 1e-9)
out = {}
for name, c in M.items():
    if c.get('once'):
        i = int(np.argmin(abs(beats - c['near']))); out[name] = {'start': round(float(beats[i]), 3), 'end': round(float(A['duration']), 3), 'bars': 0, 'once': True}; continue
    nb = 4 * c['bars']; best = None
    for i in range(len(beats) - nb - 4):
        if abs(beats[i] - c['near']) > 3.0: continue
        s, e = beats[i], beats[i + nb]; local = np.diff(beats[i:i + nb + 1])
        if local.std() > 0.03: continue                      # beats inside the loop must be steady
        fa, la = win(s, local.mean() * 4); fb, lb = win(e, local.mean() * 4)
        seam = np.linalg.norm(fa - fb) + abs(la - lb) * 0.15 + abs(beats[i] - c['near']) * 0.05
        if best is None or seam < best[0]: best = (seam, s, e, local.mean())
    if best is None: sys.exit('no steady loop near %s for %s' % (c['near'], name))
    out[name] = {'start': round(float(best[1]), 3), 'end': round(float(best[2]), 3), 'bars': c['bars'], 'seam': round(float(best[0]), 2), 'bpm': round(60 / best[3], 2)}
w = max(len(k) for k in out)
for k, v in out.items():
    print('    %s { start: %7.3f, end: %7.3f, bars: %d%s },   // seam %s, %s bpm' % ((k + ':').ljust(w + 1), v['start'], v['end'], v['bars'], ', once: true' if v.get('once') else '', v.get('seam', '-'), v.get('bpm', '-')))
json.dump(out, open('loops.json', 'w'), indent=1)
