(() => {
  'use strict';

  const config = window.NOCTARIS_LANGUAGE_CONFIG || {};
  const DEFAULT_LANGUAGE = config.defaultLanguage || 'en';
  const SUPPORTED_LANGUAGES = Array.isArray(config.supportedLanguages)
    ? [...config.supportedLanguages]
    : [DEFAULT_LANGUAGE];

  function dictionaries() {
    return window.NOCTARIS_I18N || {};
  }

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
    const all = dictionaries();
    const primary = all[language] || {};
    const fallback = all[DEFAULT_LANGUAGE] || {};
    const value = Object.prototype.hasOwnProperty.call(primary, key) ? primary[key] : fallback[key];
    return value == null ? null : interpolate(value, variables);
  }

  function formatDate(iso, language = getLanguage()) {
    const [year, month, day] = String(iso).split('-').map(Number);
    if (!year || !month || !day) return null;
    const locale = language === 'en' ? 'en-GB' : (language === 'sr' ? 'sr-Latn-RS' : language);
    try {
      return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
        .format(new Date(Date.UTC(year, month - 1, day)));
    } catch (_) {
      return null;
    }
  }

  function variablesFor(element) {
    return {
      name: element.dataset.i18nName || '',
      current: element.dataset.i18nCurrent || '',
      total: element.dataset.i18nTotal || ''
    };
  }

  function setTranslated(element, key, apply, variables = {}) {
    const value = t(key, variables);
    if (value != null) apply(value);
  }

  function translate(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((element) => {
      setTranslated(element, element.dataset.i18n, (value) => { element.textContent = value; });
    });
    root.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
      setTranslated(element, element.dataset.i18nAriaLabel, (value) => { element.setAttribute('aria-label', value); }, variablesFor(element));
    });
    root.querySelectorAll('[data-i18n-title]').forEach((element) => {
      setTranslated(element, element.dataset.i18nTitle, (value) => { element.setAttribute('title', value); }, variablesFor(element));
    });
    root.querySelectorAll('[data-i18n-content]').forEach((element) => {
      setTranslated(element, element.dataset.i18nContent, (value) => { element.setAttribute('content', value); }, variablesFor(element));
    });
    root.querySelectorAll('[data-i18n-alt-template]').forEach((element) => {
      const target = element.dataset.i18nAltTarget || 'alt';
      setTranslated(element, element.dataset.i18nAltTemplate, (value) => { element.setAttribute(target, value); }, variablesFor(element));
    });
    root.querySelectorAll('[data-i18n-date]').forEach((element) => {
      const value = formatDate(element.dataset.i18nDate);
      if (value != null) element.textContent = value;
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
