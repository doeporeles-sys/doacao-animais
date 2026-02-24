/**
 * Componente: Header (menu e toggle móvel)
 */

(function (global) {
  'use strict';

  function init() {
    var menuToggle = document.getElementById('menu-toggle');
    var nav = document.getElementById('nav');
    if (!menuToggle || !nav) return;

    menuToggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('is-open');
      menuToggle.setAttribute('aria-expanded', isOpen);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.HeaderComponent = { init: init };
})(typeof window !== 'undefined' ? window : this);
