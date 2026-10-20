"""Pull the game script out of index.html into tools/x.js so harness.js and `node --check` can run it.
Usage (from the repo root): python3 tools/extract.py && node --check tools/x.js && node tools/harness.js"""
import re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
s = (root / 'index.html').read_text(encoding='utf-8')
(root / 'tools' / 'x.js').write_text(re.search(r'<script>(.*)</script>', s, re.S).group(1), encoding='utf-8')
print('wrote tools/x.js')
