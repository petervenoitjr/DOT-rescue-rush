#!/usr/bin/env python3
"""Song -> game remap, step 1: analyze one song.
  python3 tools/remap/analyze.py song.mp3 out.json
Finds: tempo over time (per 8 s window), beats, bars (downbeats), loudness/brightness/onset density per bar,
key, and section boundaries (structure changes). Prints a table to read against the Suno prompt's sections.
"""
import json, sys
import numpy as np, librosa

src, out = sys.argv[1], sys.argv[2]
y, sr = librosa.load(src, sr=22050, mono=True)
dur = len(y) / sr
hop = 512
onset = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
tempo, beats = librosa.beat.beat_track(onset_envelope=onset, sr=sr, hop_length=hop, units='time')
# local tempo per 8 s window
win = []
for t0 in np.arange(0, dur - 4, 8.0):
    a, b = int(t0 * sr), int(min(dur, t0 + 8) * sr)
    oe = librosa.onset.onset_strength(y=y[a:b], sr=sr, hop_length=hop)
    tp = librosa.feature.tempo(onset_envelope=oe, sr=sr, hop_length=hop, aggregate=np.median)[0] if oe.size > 20 else 0
    rms = float(np.sqrt(np.mean(y[a:b] ** 2)))
    cent = float(np.mean(librosa.feature.spectral_centroid(y=y[a:b], sr=sr)))
    dens = float(np.mean(oe))
    win.append({'t': round(float(t0), 1), 'bpm': round(float(tp), 1), 'db': round(20 * np.log10(rms + 1e-9), 1), 'bright': int(cent), 'onset': round(dens, 2)})
# key (Krumhansl)
chroma = librosa.feature.chroma_cqt(y=y, sr=sr).mean(axis=1)
maj = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]); mnr = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
best = max(((np.corrcoef(np.roll(p, k), chroma)[0, 1], names[k] + (' major' if p is maj else ' minor'), k, p is maj) for p in (maj, mnr) for k in range(12)))
# structure: agglomerative segmentation on beat-synced chroma + mfcc
mf = librosa.feature.mfcc(y=y, sr=sr, hop_length=hop, n_mfcc=13); ch = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=hop)
bf = librosa.time_to_frames(beats, sr=sr, hop_length=hop)
feat = librosa.util.sync(np.vstack([librosa.util.normalize(mf, axis=1), ch]), bf)
k = 12
bounds = librosa.segment.agglomerative(feat, k)
btimes = [0.0] + [float(beats[min(len(beats) - 1, max(0, b - 1))]) for b in bounds[1:]]
res = {'file': src, 'duration': round(dur, 2), 'tempo': round(float(np.atleast_1d(tempo)[0]), 2), 'beats': [round(float(b), 3) for b in beats],
       'key': best[1], 'keyRootPc': best[2], 'keyMajor': bool(best[3]), 'windows': win, 'segments': [round(t, 2) for t in btimes]}
json.dump(res, open(out, 'w'))
print('duration %.1fs  global tempo %.1f  key %s  beats %d' % (dur, res['tempo'], res['key'], len(beats)))
print(' t     bpm    dB   bright onset')
for w in win:
    print('%5.0f  %6.1f %6.1f %6d %5.2f' % (w['t'], w['bpm'], w['db'], w['bright'], w['onset']))
print('segment starts:', ', '.join('%.1f' % t for t in btimes))
