(() => {
  'use strict';
  const DEFAULT_LANGUAGE = 'en';
  const SUPPORTED_LANGUAGES = ['en', 'sr'];
  const dictionaries = window.NOCTARIS_I18N || {};

  function getLanguage() {
    const lang = document.documentElement.lang || DEFAULT_LANGUAGE;
    return SUPPORTED_LANGUAGES.includes(lang) ? lang : DEFAULT_LANGUAGE;
  }

  function interpolate(value, variables = {}) {
    return String(value).replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) =>
      Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] : match
    );
  }

  function t(key, variables = {}, language = getLanguage()) {
    const primary = dictionaries[language] || {};
    const fallback = dictionaries[DEFAULT_LANGUAGE] || {};
    const value = Object.prototype.hasOwnProperty.call(primary, key) ? primary[key] : fallback[key];
    return value == null ? key : interpolate(value, variables);
  }

  function formatDate(iso, language = getLanguage()) {
    const [year, month, day] = String(iso).split('-').map(Number);
    if (!year || !month || !day) return iso;
    const locale = language === 'en' ? 'en-GB' : (language === 'sr' ? 'sr-Latn-RS' : language);
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(Date.UTC(year, month - 1, day)));
  }

  function translate(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((element) => {
      element.textContent = t(element.dataset.i18n);
    });
    root.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
      element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel));
    });
    root.querySelectorAll('[data-i18n-title]').forEach((element) => {
      element.setAttribute('title', t(element.dataset.i18nTitle));
    });
    root.querySelectorAll('[data-i18n-date]').forEach((element) => {
      element.textContent = formatDate(element.dataset.i18nDate);
    });
  }

  const currentLanguage = getLanguage();
  window.NOCTARIS_LANGUAGE = Object.freeze({
    defaultLanguage: DEFAULT_LANGUAGE,
    supportedLanguages: Object.freeze([...SUPPORTED_LANGUAGES]),
    currentLanguage,
    t,
    formatDate,
    translate
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => translate(), { once: true });
  } else {
    translate();
  }
})();
