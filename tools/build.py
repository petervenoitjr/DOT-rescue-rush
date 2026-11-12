#!/usr/bin/env python3
"""DO-T: Lost and Found - build.

  python3 tools/build.py

1. Packs every sound in assets/sfx/ (.m4a .mp3 .wav .ogg) into sketch_dot_hex.js as EMBED_ASSETS
   (data URIs), so the one file still pastes straight into the p5 editor with its sounds.
   The file name is the sound's name: assets/sfx/zap.m4a plays for SETTINGS.audio.files entries that say 'zap'.
2. Lists assets/music/ (not packed: too big). The page plays assets/music/<name>.mp3 next to it;
   in the p5 editor upload the .mp3 files with the same names.
3. Rebuilds dot_hex_page.html and dot_hex_publish.html from the sketch.
Only the block below the SOUND DATA marker in the sketch is rewritten.
"""
import base64, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKETCH = os.path.join(ROOT, 'sketch_dot_hex.js')
MARK = '// SOUND DATA (written by tools/build.py'
TYPES = {'.m4a': 'audio/mp4', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg'}


def main():
    src = open(SKETCH, encoding='utf8').read()
    i = src.find(MARK)
    if i < 0:
        sys.exit('SOUND DATA marker not found in sketch_dot_hex.js')
    head = src[:src.rfind('// ====', 0, i)].rstrip('\n')

    sfx_dir = os.path.join(ROOT, 'assets', 'sfx')
    embed = {}
    for name in sorted(os.listdir(sfx_dir)) if os.path.isdir(sfx_dir) else []:
        ext = os.path.splitext(name)[1].lower()
        if ext not in TYPES:
            continue
        data = open(os.path.join(sfx_dir, name), 'rb').read()
        embed['assets/sfx/' + name] = 'data:%s;base64,%s' % (TYPES[ext], base64.b64encode(data).decode('ascii'))
        print('  sfx   %-22s %7d bytes' % (name, len(data)))
    music_dir = os.path.join(ROOT, 'assets', 'music')
    music = sorted(n for n in os.listdir(music_dir) if os.path.splitext(n)[1].lower() in TYPES) if os.path.isdir(music_dir) else []
    for n in music:
        print('  music %-22s (not packed: keep it next to the page / upload it to the p5 editor)' % n)

    block = ('\n\n// =====================================================================\n'
             '// SOUND DATA (written by tools/build.py from assets/sfx/: don\'t edit below this line)\n'
             '// =====================================================================\n'
             'const EMBED_ASSETS = ' + json.dumps(embed, separators=(',', ':')) + ';\n')
    out = head + block
    open(SKETCH, 'w', encoding='utf8').write(out)

    page = os.path.join(ROOT, 'dot_hex_page.html')
    pub = os.path.join(ROOT, 'dot_hex_publish.html')
    page_head = open(page, encoding='utf8').read().split('\n')[:6]
    pub_head = open(pub, encoding='utf8').read().split('\n')[:5]
    open(page, 'w', encoding='utf8').write('\n'.join(page_head) + '\n<script>\n' + out + '</script></body></html>\n')
    open(pub, 'w', encoding='utf8').write('\n'.join(pub_head) + '\n<script>\n' + out + '</script>\n')
    print('built: sketch %d bytes, %d sound file(s) packed, %d music file(s) found' % (len(out.encode('utf8')), len(embed), len(music)))


if __name__ == '__main__':
    main()
