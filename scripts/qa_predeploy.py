#!/usr/bin/env python3
from pathlib import Path
import re, sys, subprocess
from urllib.parse import urlparse
ROOT=Path(__file__).resolve().parents[1]
errors=[]
langs=['en','sr']
# dictionary parity

def keys(p):
    return set(re.findall(r"['\"]([^'\"]+)['\"]\s*:\s*", p.read_text(encoding='utf-8')))
en=keys(ROOT/'i18n/en.js'); sr=keys(ROOT/'i18n/sr.js')
if en != sr:
    errors.append(f'dictionary mismatch: missing SR={sorted(en-sr)} extra SR={sorted(sr-en)}')
# pages: master discovery mirrors generator rules
skip={'sr','assets','i18n','scripts'}
masters=[ROOT/'index.html']+[p/'index.html' for p in ROOT.iterdir() if p.is_dir() and p.name not in skip and (p/'index.html').exists()]
masters=sorted(masters)
for master in masters:
    rel=master.relative_to(ROOT)
    srp=ROOT/'sr'/rel
    if not srp.exists(): errors.append(f'missing generated SR page: {srp.relative_to(ROOT)}')
for p in masters + [ROOT/'sr'/p.relative_to(ROOT) for p in masters]:
    if not p.exists(): continue
    s=p.read_text(encoding='utf-8')
    expected='sr' if 'sr' in p.relative_to(ROOT).parts[:1] else 'en'
    m=re.search(r'<html[^>]*\blang="([^"]+)"',s,re.I)
    if not m or m.group(1)!=expected: errors.append(f'{p.relative_to(ROOT)} wrong/missing html lang')
    for hreflang in ('en','sr','x-default'):
        if not re.search(rf'<link[^>]+hreflang="{re.escape(hreflang)}"',s,re.I): errors.append(f'{p.relative_to(ROOT)} missing hreflang {hreflang}')
    if not re.search(r'<link[^>]+rel="canonical"',s,re.I): errors.append(f'{p.relative_to(ROOT)} missing canonical')
    ids=re.findall(r'\bid="([^"]+)"',s)
    dup=sorted({x for x in ids if ids.count(x)>1})
    if dup: errors.append(f'{p.relative_to(ROOT)} duplicate ids {dup}')
    # root-relative local href/src existence, ignore directory URLs (handled as pages)
    for attr,url in re.findall(r'\b(href|src)="([^"]+)"',s,re.I):
        if not url.startswith('/') or url.startswith('//'): continue
        clean=url.split('#',1)[0].split('?',1)[0]
        if not clean: continue
        target=ROOT/clean.lstrip('/')
        ok=target.exists() or (target/'index.html').exists()
        if not ok: errors.append(f'{p.relative_to(ROOT)} broken local {attr}: {url}')
# sitemap parity
sm=(ROOT/'sitemap.xml').read_text(encoding='utf-8') if (ROOT/'sitemap.xml').exists() else ''
locs=set(re.findall(r'<loc>([^<]+)</loc>',sm))
expected=set()
for master in masters:
    rel=master.relative_to(ROOT)
    route='/' if str(rel)=='index.html' else '/'+str(rel.parent).replace('\\','/')+'/'
    expected.add('https://noctarisone.com'+route)
    expected.add('https://noctarisone.com/sr'+route)
if locs!=expected: errors.append(f'sitemap mismatch missing={sorted(expected-locs)} extra={sorted(locs-expected)}')
# critical files
for f in ('CNAME','robots.txt','ROLLBACK.md','RELEASE_CHECKLIST.md'):
    if not (ROOT/f).exists(): errors.append(f'missing critical file {f}')
if errors:
    print('NOCTARIS PREDEPLOY QA: FAIL')
    for e in errors: print(' -',e)
    sys.exit(1)
print(f'NOCTARIS PREDEPLOY QA: PASS | {len(masters)} EN + {len(masters)} SR pages | {len(en)} dictionary keys | {len(locs)} sitemap URLs')
