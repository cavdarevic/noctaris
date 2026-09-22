from pathlib import Path
from bs4 import BeautifulSoup, Comment
import re, json, shutil
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_LANGUAGE = 'en'
LANGUAGES = ('en', 'sr')
EXCLUDED_TOP_LEVEL = {'assets', 'i18n', 'scripts'} | set(LANGUAGES[1:])


def load_js_dictionary(path, lang):
    text = path.read_text(encoding='utf-8')
    m = re.search(r'window\.NOCTARIS_I18N\.' + re.escape(lang) + r'\s*=\s*(\{.*\})\s*;', text, re.S)
    if not m:
        raise RuntimeError(f'Cannot parse {path}')
    return json.loads(m.group(1))


def discover_pages():
    """Discover master HTML entry points. Localized output is never a source."""
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
    for lang, dictionary in dictionaries.items():
        missing = sorted(required - set(dictionary))
        if missing:
            raise RuntimeError(f'{lang}: missing translation keys: {", ".join(missing)}')
    return dictionaries


def sr_date(iso):
    y, m, d = map(int, iso.split('-'))
    months = ['', 'januar', 'februar', 'mart', 'april', 'maj', 'jun', 'jul', 'avgust', 'septembar', 'oktobar', 'novembar', 'decembar']
    return f'{d}. {months[m]} {y}.'


def localized_route(route, lang):
    if lang == DEFAULT_LANGUAGE:
        return route
    return f'/{lang}/' if route == '/' else f'/{lang}{route}'


def set_language_selector(soup, route, lang):
    sw = soup.select_one('[data-language-switcher]')
    if not sw:
        return
    btn = sw.select_one('.language-button')
    menu = sw.select_one('.language-menu')
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
        tag['rel'] = relv
        tag['href'] = href
        tag['data-noctaris-i18n-seo'] = 'true'
        if hl:
            tag['hreflang'] = hl
        soup.head.append(tag)


def build(lang, pages, dictionary):
    if lang == DEFAULT_LANGUAGE:
        raise RuntimeError('Default-language master pages are source files and must not be generated')
    outroot = ROOT / lang
    if outroot.exists():
        shutil.rmtree(outroot)
    route_map = {route: localized_route(route, lang) for route in pages}
    for route, rel in pages.items():
        src = ROOT / rel
        soup = BeautifulSoup(src.read_text(encoding='utf-8'), 'html.parser')
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
            variables = {
                'name': el.get('data-i18n-name', ''),
                'current': el.get('data-i18n-current', '')
            }
            for variable, replacement in variables.items():
                value = value.replace('{' + variable + '}', replacement)
            target = el.get('data-i18n-alt-target', 'alt')
            el[target] = value
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

        dest = outroot / ('index.html' if route == '/' else rel)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(str(soup), encoding='utf-8')



def write_discovery_files(pages):
    """Generate crawler discovery files from the same route/language model."""
    urls = []
    for route in pages:
        for lang in LANGUAGES:
            urls.append('https://noctarisone.com' + localized_route(route, lang))
    body = ['<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for url in urls:
        body.append(f'  <url><loc>{escape(url)}</loc></url>')
    body.append('</urlset>')
    (ROOT / 'sitemap.xml').write_text('\n'.join(body) + '\n', encoding='utf-8')
    (ROOT / 'robots.txt').write_text(
        'User-agent: *\nAllow: /\nSitemap: https://noctarisone.com/sitemap.xml\n',
        encoding='utf-8'
    )

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
