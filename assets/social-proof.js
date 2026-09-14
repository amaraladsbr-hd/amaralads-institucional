(function () {
  'use strict';
  var section = document.querySelector('.trust');
  if (!section) return;
  var track = section.querySelector('.trust-track');
  var list = section.querySelector('.trust-list');
  var duplicate = list.cloneNode(true);
  duplicate.setAttribute('aria-hidden', 'true');
  duplicate.querySelectorAll('button').forEach(function (button) { button.tabIndex = -1; });
  track.appendChild(duplicate);
  var buttons = Array.from(section.querySelectorAll('.trust-brand'));
  var panels = Array.from(section.querySelectorAll('.trust-panel'));
  var active = null, pinned = false, closeTimer;
  function position() {
    if (!active) return;
    var panel = document.getElementById('trust-' + active.dataset.client);
    var box = active.getBoundingClientRect();
    var bounds = section.querySelector('.trust-details').getBoundingClientRect();
    var x = Math.max(0, Math.min(bounds.width - panel.offsetWidth, box.left - bounds.left + box.width / 2 - panel.offsetWidth / 2));
    panel.style.setProperty('--trust-x', x + 'px');
  }
  function close() {
    clearTimeout(closeTimer);
    buttons.forEach(function (button) { button.setAttribute('aria-expanded', 'false'); });
    panels.forEach(function (panel) { panel.hidden = true; });
    active = null; pinned = false; section.classList.remove('has-detail');
  }
  function show(button) {
    clearTimeout(closeTimer);
    active = button;
    buttons.forEach(function (item) { item.setAttribute('aria-expanded', String(item === button)); });
    panels.forEach(function (panel) { panel.hidden = panel.id !== 'trust-' + button.dataset.client; });
    section.classList.add('has-detail'); position();
  }
  function scheduleClose() {
    if (!pinned) closeTimer = setTimeout(close, 160);
  }
  buttons.forEach(function (button) {
    button.addEventListener('pointerenter', function (event) {
      if (event.pointerType === 'mouse' && !pinned) show(button);
    });
    button.addEventListener('pointerleave', scheduleClose);
    button.addEventListener('focus', function () { if (button.matches(':focus-visible')) show(button); });
    button.addEventListener('click', function () {
      if (active === button && pinned) close();
      else { show(button); pinned = true; }
    });
  });
  panels.forEach(function (panel) {
    panel.addEventListener('pointerenter', function () { clearTimeout(closeTimer); });
    panel.addEventListener('pointerleave', scheduleClose);
  });
  section.addEventListener('focusout', function (event) {
    if (!section.contains(event.relatedTarget)) close();
  });
  document.addEventListener('pointerdown', function (event) {
    if (!section.contains(event.target)) close();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && active) {
      var button = active;
      close();
      if (section.contains(document.activeElement)) {
        button.focus({ preventScroll: true });
        close();
      }
    }
  });
  window.addEventListener('resize', position);
  section.classList.add('is-ready');
})();
