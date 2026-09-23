from pathlib import Path
from bs4 import BeautifulSoup, Comment
import re, json, shutil
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / 'i18n' / 'languages.js'


def load_language_config():
    text = CONFIG.read_text(encoding='utf-8')
    default = re.search(r"defaultLanguage:\s*['\"]([^'\"]+)['\"]", text)
    supported = re.search(r"supportedLanguages:\s*Object\.freeze\(\[([^\]]+)\]\)", text)
    if not default or not supported:
        raise RuntimeError('Cannot parse i18n/languages.js')
    langs = tuple(re.findall(r"['\"]([^'\"]+)['\"]", supported.group(1)))
    if not langs or default.group(1) not in langs:
        raise RuntimeError('Invalid language registry')
    return default.group(1), langs

DEFAULT_LANGUAGE, LANGUAGES = load_language_config()
EXCLUDED_TOP_LEVEL = {'assets', 'i18n', 'scripts'} | set(LANGUAGES[1:])


def load_js_dictionary(path, lang):
    text = path.read_text(encoding='utf-8')
    m = re.search(r'window\.NOCTARIS_I18N\.' + re.escape(lang) + r'\s*=\s*(\{.*\})\s*;', text, re.S)
    if not m:
        raise RuntimeError(f'Cannot parse {path}')
    return json.loads(m.group(1))


def discover_pages():
    pages = {}
    for src in ROOT.rglob('index.html'):
        rel = src.relative_to(ROOT)
        if rel.parts[0] in EXCLUDED_TOP_LEVEL:
            continue
        route = '/' if rel == Path('index.html') else '/' + '/'.join(rel.parent.parts) + '/'
        pages[route] = rel.as_posix()
    if '/' not in pages:
        raise RuntimeError('Master home page index.html not found')
    return dict(sorted(pages.items(), key=lambda item: (item[0] != '/', item[0])))


def referenced_keys(pages):
    attrs = ('data-i18n', 'data-i18n-aria-label', 'data-i18n-title', 'data-i18n-content', 'data-i18n-alt-template')
    keys = set()
    for rel in pages.values():
        soup = BeautifulSoup((ROOT / rel).read_text(encoding='utf-8'), 'html.parser')
        for attr in attrs:
            for el in soup.select(f'[{attr}]'):
                keys.add(el.get(attr))
    return keys


def validate_dictionaries(pages):
    required = referenced_keys(pages)
    dictionaries = {lang: load_js_dictionary(ROOT / 'i18n' / f'{lang}.js', lang) for lang in LANGUAGES}
    baseline = set(dictionaries[DEFAULT_LANGUAGE])
    for lang, dictionary in dictionaries.items():
        missing_required = sorted(required - set(dictionary))
        missing_parity = sorted(baseline - set(dictionary))
        extra_parity = sorted(set(dictionary) - baseline)
        if missing_required:
            raise RuntimeError(f'{lang}: missing referenced translation keys: {", ".join(missing_required)}')
        if missing_parity or extra_parity:
            raise RuntimeError(f'{lang}: dictionary parity mismatch missing={missing_parity} extra={extra_parity}')
    return dictionaries


def sr_date(iso):
    y, m, d = map(int, iso.split('-'))
    months = ['', 'januar', 'februar', 'mart', 'april', 'maj', 'jun', 'jul', 'avgust', 'septembar', 'oktobar', 'novembar', 'decembar']
    return f'{d}. {months[m]} {y}.'


def localized_route(route, lang):
    return route if lang == DEFAULT_LANGUAGE else (f'/{lang}/' if route == '/' else f'/{lang}{route}')


def set_language_selector(soup, route, lang):
    sw = soup.select_one('[data-language-switcher]')
    if not sw:
        return
    btn, menu = sw.select_one('.language-button'), sw.select_one('.language-menu')
    if not btn or not menu:
        return
    btn.string = lang.upper()
    menu.clear()
    for option in LANGUAGES:
        a = soup.new_tag('a', href=localized_route(route, option))
        a.string = option.upper()
        if option == lang:
            a['aria-current'] = 'page'
        menu.append(a)


def set_seo(soup, route, lang):
    for x in soup.head.find_all('link', attrs={'data-noctaris-i18n-seo': True}):
        x.decompose()
    urls = {option: 'https://noctarisone.com' + localized_route(route, option) for option in LANGUAGES}
    entries = [('canonical', None, urls[lang])]
    entries += [('alternate', option, urls[option]) for option in LANGUAGES]
    entries.append(('alternate', 'x-default', urls[DEFAULT_LANGUAGE]))
    for relv, hl, href in entries:
        tag = soup.new_tag('link')
        tag['rel'], tag['href'], tag['data-noctaris-i18n-seo'] = relv, href, 'true'
        if hl:
            tag['hreflang'] = hl
        soup.head.append(tag)


def normalize_output(soup):
    for el in soup.find_all(True):
        for attr in list(el.attrs):
            if attr.startswith('data-data-i18n'):
                del el.attrs[attr]
    for script in soup.find_all('script'):
        if script.has_attr('defer'):
            script['defer'] = None


def build(lang, pages, dictionary):
    if lang == DEFAULT_LANGUAGE:
        raise RuntimeError('Default-language master pages are source files and must not be generated')
    outroot = ROOT / lang
    if outroot.exists():
        shutil.rmtree(outroot)
    route_map = {route: localized_route(route, lang) for route in pages}
    for route, rel in pages.items():
        soup = BeautifulSoup((ROOT / rel).read_text(encoding='utf-8'), 'html.parser')
        soup.insert(0, Comment(' GENERATED FILE — DO NOT EDIT. Source: NOCTARIS core + i18n dictionary. '))
        soup.html['lang'] = lang
        for el in soup.select('[data-i18n]'):
            el.string = dictionary[el.get('data-i18n')]
        for el in soup.select('[data-i18n-aria-label]'):
            el['aria-label'] = dictionary[el.get('data-i18n-aria-label')]
        for el in soup.select('[data-i18n-title]'):
            el['title'] = dictionary[el.get('data-i18n-title')]
        for el in soup.select('[data-i18n-content]'):
            el['content'] = dictionary[el.get('data-i18n-content')]
        for el in soup.select('[data-i18n-alt-template]'):
            value = dictionary[el.get('data-i18n-alt-template')]
            variables = {'name': el.get('data-i18n-name', ''), 'current': el.get('data-i18n-current', ''), 'total': el.get('data-i18n-total', '')}
            for variable, replacement in variables.items():
                value = value.replace('{' + variable + '}', replacement)
            el[el.get('data-i18n-alt-target', 'alt')] = value
        for el in soup.select('[data-i18n-date]'):
            if lang == 'sr':
                el.string = sr_date(el.get('data-i18n-date'))
        for a in soup.find_all('a', href=True):
            if a['href'] in route_map:
                a['href'] = route_map[a['href']]
        set_language_selector(soup, route, lang)
        for script in soup.find_all('script', src=True):
            if script['src'] == f'/i18n/{DEFAULT_LANGUAGE}.js':
                script['src'] = f'/i18n/{lang}.js'
        set_seo(soup, route, lang)
        normalize_output(soup)
        dest = outroot / ('index.html' if route == '/' else rel)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(str(soup), encoding='utf-8')


def write_discovery_files(pages):
    urls = ['https://noctarisone.com' + localized_route(route, lang) for route in pages for lang in LANGUAGES]
    body = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    body += [f'  <url><loc>{escape(url)}</loc></url>' for url in urls]
    body.append('</urlset>')
    (ROOT / 'sitemap.xml').write_text('\n'.join(body) + '\n', encoding='utf-8')
    (ROOT / 'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: https://noctarisone.com/sitemap.xml\n', encoding='utf-8')


def main():
    pages = discover_pages()
    dictionaries = validate_dictionaries(pages)
    for lang in LANGUAGES:
        if lang != DEFAULT_LANGUAGE:
            build(lang, pages, dictionaries[lang])
    write_discovery_files(pages)
    print(f'Generated {len(pages)} page(s) for {len(LANGUAGES)-1} localized language(s): {", ".join(LANGUAGES[1:])}')

if __name__ == '__main__':
    main()
