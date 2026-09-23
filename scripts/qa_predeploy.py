#!/usr/bin/env python3
from pathlib import Path
import re, sys, subprocess, json
from urllib.parse import urlparse

ROOT=Path(__file__).resolve().parents[1]
errors=[]

def load_config():
    s=(ROOT/'i18n/languages.js').read_text(encoding='utf-8')
    d=re.search(r"defaultLanguage:\s*['\"]([^'\"]+)['\"]",s)
    a=re.search(r"supportedLanguages:\s*Object\.freeze\(\[([^\]]+)\]\)",s)
    if not d or not a: raise RuntimeError('cannot parse language registry')
    langs=re.findall(r"['\"]([^'\"]+)['\"]",a.group(1))
    return d.group(1), langs

try: default_lang, langs=load_config()
except Exception as e:
    print('NOCTARIS PREDEPLOY QA: FAIL\n - language registry:',e); sys.exit(1)

def keys(p):
    return set(re.findall(r"['\"]([^'\"]+)['\"]\s*:\s*", p.read_text(encoding='utf-8')))

base=keys(ROOT/f'i18n/{default_lang}.js')
for lang in langs:
    p=ROOT/f'i18n/{lang}.js'
    if not p.exists(): errors.append(f'missing dictionary {p.relative_to(ROOT)}'); continue
    k=keys(p)
    if k != base: errors.append(f'dictionary mismatch {lang}: missing={sorted(base-k)} extra={sorted(k-base)}')
    text=p.read_text(encoding='utf-8')
    if 'window.NOCTARIS_I18N = window.NOCTARIS_I18N || {};' not in text:
        errors.append(f'{lang} dictionary lacks safe namespace bootstrap')

skip={'assets','i18n','scripts'} | set(langs[1:])
masters=[]
for p in ROOT.rglob('index.html'):
    rel=p.relative_to(ROOT)
    if rel.parts[0] in skip: continue
    masters.append(p)
masters=sorted(masters)

for master in masters:
    rel=master.relative_to(ROOT)
    for lang in langs[1:]:
        lp=ROOT/lang/rel
        if not lp.exists(): errors.append(f'missing generated {lang} page: {lp.relative_to(ROOT)}')

pages=[]
for master in masters:
    pages.append((default_lang,master))
    rel=master.relative_to(ROOT)
    pages += [(lang,ROOT/lang/rel) for lang in langs[1:]]

for lang,p in pages:
    if not p.exists(): continue
    s=p.read_text(encoding='utf-8')
    m=re.search(r'<html[^>]*\blang="([^"]+)"',s,re.I)
    if not m or m.group(1)!=lang: errors.append(f'{p.relative_to(ROOT)} wrong/missing html lang')
    for hreflang in (*langs,'x-default'):
        if not re.search(rf'<link[^>]+hreflang="{re.escape(hreflang)}"',s,re.I): errors.append(f'{p.relative_to(ROOT)} missing hreflang {hreflang}')
    if not re.search(r'<link[^>]+rel="canonical"',s,re.I): errors.append(f'{p.relative_to(ROOT)} missing canonical')
    if 'data-data-i18n' in s: errors.append(f'{p.relative_to(ROOT)} contains malformed data-data-i18n attribute')
    ids=re.findall(r'\bid="([^"]+)"',s)
    dup=sorted({x for x in ids if ids.count(x)>1})
    if dup: errors.append(f'{p.relative_to(ROOT)} duplicate ids {dup}')
    for attr,url in re.findall(r'\b(href|src)="([^"]+)"',s,re.I):
        if not url.startswith('/') or url.startswith('//'): continue
        clean=url.split('#',1)[0].split('?',1)[0]
        if not clean: continue
        target=ROOT/clean.lstrip('/')
        if not (target.exists() or (target/'index.html').exists()): errors.append(f'{p.relative_to(ROOT)} broken local {attr}: {url}')

# Referenced translation keys must exist in every language.
attrs=('data-i18n','data-i18n-aria-label','data-i18n-title','data-i18n-content','data-i18n-alt-template')
required=set()
for p in masters:
    s=p.read_text(encoding='utf-8')
    for attr in attrs: required.update(re.findall(rf'{attr}="([^"]+)"',s))
for lang in langs:
    missing=required-keys(ROOT/f'i18n/{lang}.js')
    if missing: errors.append(f'{lang} missing referenced keys {sorted(missing)}')

# Sitemap parity.
sm=(ROOT/'sitemap.xml').read_text(encoding='utf-8') if (ROOT/'sitemap.xml').exists() else ''
locs=set(re.findall(r'<loc>([^<]+)</loc>',sm))
expected=set()
for master in masters:
    rel=master.relative_to(ROOT); route='/' if rel==Path('index.html') else '/'+rel.parent.as_posix()+'/'
    for lang in langs:
        localized=route if lang==default_lang else (f'/{lang}/' if route=='/' else f'/{lang}{route}')
        expected.add('https://noctarisone.com'+localized)
if locs!=expected: errors.append(f'sitemap mismatch missing={sorted(expected-locs)} extra={sorted(locs-expected)}')

# Repository/release hygiene.
for p in ROOT.rglob('*'):
    if '__pycache__' in p.parts or (p.is_file() and p.suffix in {'.pyc','.pyo'}): errors.append(f'forbidden cache artifact: {p.relative_to(ROOT)}')
for f in ('CNAME','robots.txt','ROLLBACK.md','RELEASE_CHECKLIST.md','.gitignore','i18n/languages.js'):
    if not (ROOT/f).exists(): errors.append(f'missing critical file {f}')

# Asset namespace guard for dog profile pages.
checks=[('atlas/index.html',('/assets/shelby/','/assets/gallery/')),('shelby/index.html',('/assets/atlas/','/assets/gallery/'))]
for rel,forbidden in checks:
    s=(ROOT/rel).read_text(encoding='utf-8')
    for token in forbidden:
        if token in s: errors.append(f'{rel} violates asset namespace with {token}')

# Runtime execution gate.
try:
    r=subprocess.run(['node',str(ROOT/'scripts/runtime_i18n_test.js')],cwd=ROOT,text=True,capture_output=True,timeout=15)
    if r.returncode: errors.append('i18n runtime QA failed: '+(r.stderr.strip() or r.stdout.strip()))
except Exception as e: errors.append(f'i18n runtime QA unavailable/failed: {e}')

if errors:
    print('NOCTARIS PREDEPLOY QA: FAIL')
    for e in errors: print(' -',e)
    sys.exit(1)
print(f'NOCTARIS PREDEPLOY QA: PASS | {len(masters)} master pages | languages={",".join(langs)} | {len(base)} dictionary keys | {len(locs)} sitemap URLs | runtime PASS')
