const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');

function context(lang = 'en') {
  const listeners = {};
  const document = {
    documentElement: { lang },
    readyState: 'complete',
    querySelectorAll: () => [],
    addEventListener: (name, fn) => { listeners[name] = fn; }
  };
  const sandbox = { window: {}, document, Intl, Date, Object, Array, String, console };
  vm.createContext(sandbox);
  return sandbox;
}
function run(sandbox, rel) {
  vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), sandbox, { filename: rel });
}
function assert(ok, msg) { if (!ok) throw new Error(msg); }

// Happy path EN: dictionary must bootstrap its own namespace.
let c = context('en');
run(c, 'i18n/languages.js'); run(c, 'i18n/en.js'); run(c, 'i18n/i18n.js');
assert(c.window.NOCTARIS_LANGUAGE.t('nav.home') === 'Home', 'EN nav.home runtime translation failed');
assert(c.window.NOCTARIS_LANGUAGE.t('__missing__') === null, 'Missing key must return null, never expose technical key');

// Happy path SR.
c = context('sr');
run(c, 'i18n/languages.js'); run(c, 'i18n/sr.js'); run(c, 'i18n/i18n.js');
assert(c.window.NOCTARIS_LANGUAGE.t('nav.home') === 'Početna', 'SR nav.home runtime translation failed');

// Failure injection: runtime without any dictionary must not throw and must return null.
c = context('en');
run(c, 'i18n/languages.js'); run(c, 'i18n/i18n.js');
assert(c.window.NOCTARIS_LANGUAGE.t('nav.home') === null, 'Missing dictionary must degrade to null');

// Unknown document language must resolve to default language when EN dictionary exists.
c = context('xx');
run(c, 'i18n/languages.js'); run(c, 'i18n/en.js'); run(c, 'i18n/i18n.js');
assert(c.window.NOCTARIS_LANGUAGE.currentLanguage === 'en', 'Unknown language must resolve to default');
assert(c.window.NOCTARIS_LANGUAGE.t('nav.home') === 'Home', 'Default-language fallback failed');

console.log('NOCTARIS I18N RUNTIME QA: PASS');
