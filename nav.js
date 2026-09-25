(function () {
  'use strict';

  var PROFILE_SECTION_STATE_KEY = 'noctaris.languageProfileSection';
  var PROFILE_SECTION_STATE_MAX_AGE = 15000;

  function safeSessionGet(key) {
    try {
      return window.sessionStorage ? window.sessionStorage.getItem(key) : null;
    } catch (error) {
      return null;
    }
  }

  function safeSessionSet(key, value) {
    try {
      if (!window.sessionStorage) return false;
      window.sessionStorage.setItem(key, value);
      return true;
    } catch (error) {
      return false;
    }
  }

  function safeSessionRemove(key) {
    try {
      if (window.sessionStorage) window.sessionStorage.removeItem(key);
    } catch (error) {
      // Storage is optional. Navigation must keep working without it.
    }
  }

  function profileScrollOffset() {
    var globalNav = document.querySelector('.top-nav');
    var profileNav = document.querySelector('.atlas-editorial-nav');
    return (globalNav ? globalNav.getBoundingClientRect().height : 0) +
      (profileNav ? profileNav.getBoundingClientRect().height : 0) + 18;
  }

  function visibleHeight(element, viewportTop, viewportBottom) {
    var rect = element.getBoundingClientRect();
    return Math.max(0, Math.min(rect.bottom, viewportBottom) - Math.max(rect.top, viewportTop));
  }

  function activeProfileSection() {
    var activeLink = document.querySelector('[data-section-link].is-active');
    if (activeLink && activeLink.getAttribute('data-section-link')) {
      return activeLink.getAttribute('data-section-link');
    }

    var sections = Array.prototype.slice.call(document.querySelectorAll('[data-profile-section]'));
    if (!sections.length) return null;

    var viewportTop = profileScrollOffset();
    var viewportBottom = window.innerHeight;
    var winner = null;
    var winnerVisible = 0;

    sections.forEach(function (section) {
      var visible = visibleHeight(section, viewportTop, viewportBottom);
      if (visible > winnerVisible) {
        winner = section;
        winnerVisible = visible;
      }
    });

    if (!winner || winnerVisible <= 0) return null;

    var hero = document.querySelector('.atlas-identity');
    if (hero && visibleHeight(hero, viewportTop, viewportBottom) > winnerVisible) return null;

    return winner.getAttribute('data-profile-section') || winner.id || null;
  }

  function rememberProfileSectionForLanguageSwitch(anchor) {
    if (!document.querySelector('[data-profile-section]')) {
      safeSessionRemove(PROFILE_SECTION_STATE_KEY);
      return;
    }

    var section = activeProfileSection();
    if (!section) {
      safeSessionRemove(PROFILE_SECTION_STATE_KEY);
      return;
    }

    var target;
    try {
      target = new URL(anchor.href, window.location.href);
    } catch (error) {
      return;
    }

    var state = JSON.stringify({
      targetPath: target.pathname,
      section: section,
      createdAt: Date.now()
    });

    safeSessionSet(PROFILE_SECTION_STATE_KEY, state);
  }

  function restoreProfileSectionAfterLanguageSwitch() {
    var raw = safeSessionGet(PROFILE_SECTION_STATE_KEY);
    if (!raw) return;

    // One-shot state: consume it before validation so refresh/back cannot replay it.
    safeSessionRemove(PROFILE_SECTION_STATE_KEY);

    var state;
    try {
      state = JSON.parse(raw);
    } catch (error) {
      return;
    }

    if (!state || state.targetPath !== window.location.pathname || !state.section) return;
    if (!state.createdAt || Date.now() - state.createdAt > PROFILE_SECTION_STATE_MAX_AGE) return;

    var target = null;
    var sections = document.querySelectorAll('[data-profile-section]');
    Array.prototype.some.call(sections, function (section) {
      if (section.getAttribute('data-profile-section') !== state.section) return false;
      target = section;
      return true;
    });
    if (!target) return;

    var root = document.documentElement;
    var previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';

    window.scrollTo(0, Math.max(0, target.getBoundingClientRect().top + window.scrollY - profileScrollOffset()));

    var links = document.querySelectorAll('[data-section-link]');
    Array.prototype.forEach.call(links, function (link) {
      var active = link.getAttribute('data-section-link') === state.section;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });

    root.classList.remove('noctaris-section-restore');
    window.requestAnimationFrame(function () {
      root.style.scrollBehavior = previousScrollBehavior;
    });
  }

  function initLanguageSectionPreservation() {
    var switchers = document.querySelectorAll('[data-language-switcher]');

    Array.prototype.forEach.call(switchers, function (switcher) {
      var links = switcher.querySelectorAll('a[href]');
      Array.prototype.forEach.call(links, function (link) {
        link.addEventListener('click', function (event) {
          if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          if (link.getAttribute('aria-current') === 'page') return;
          rememberProfileSectionForLanguageSwitch(link);
        });
      });
    });

    restoreProfileSectionAfterLanguageSwitch();
  }

  function initNavigation() {
    var groups = Array.prototype.slice.call(document.querySelectorAll('.nav-group'));

    groups.forEach(function (group) {
      var button = group.querySelector('.nav-button');
      var menu = group.querySelector('.nav-menu');
      if (!button || !menu) return;

      button.setAttribute('aria-expanded', 'false');

      function setOpen(open) {
        group.classList.toggle('is-open', open);
        button.setAttribute('aria-expanded', open ? 'true' : 'false');
      }

      button.addEventListener('click', function (event) {
        event.preventDefault();
        var nextState = !group.classList.contains('is-open');
        groups.forEach(function (other) {
          if (other !== group) {
            other.classList.remove('is-open');
            var otherButton = other.querySelector('.nav-button');
            if (otherButton) otherButton.setAttribute('aria-expanded', 'false');
          }
        });
        setOpen(nextState);
      });

      group.addEventListener('mouseleave', function () {
        if (window.matchMedia('(hover:hover) and (pointer:fine)').matches) setOpen(false);
      });

      group.addEventListener('focusout', function (event) {
        if (!group.contains(event.relatedTarget)) setOpen(false);
      });
    });

    document.addEventListener('click', function (event) {
      groups.forEach(function (group) {
        if (!group.contains(event.target)) {
          group.classList.remove('is-open');
          var button = group.querySelector('.nav-button');
          if (button) button.setAttribute('aria-expanded', 'false');
        }
      });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      groups.forEach(function (group) {
        if (!group.classList.contains('is-open')) return;
        group.classList.remove('is-open');
        var button = group.querySelector('.nav-button');
        if (button) {
          button.setAttribute('aria-expanded', 'false');
          button.focus();
        }
      });
    });

    initLanguageSectionPreservation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigation);
  } else {
    initNavigation();
  }
}());
