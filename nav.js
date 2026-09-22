(function () {
  'use strict';

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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigation);
  } else {
    initNavigation();
  }
}());
