/* Interações visuais independentes de CRM, tracking e envio de dados. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var pointer = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 901px)');
  var paused = false;
  var scene = document.querySelector('.hero-visual');
  var hero = document.querySelector('.hero');
  var dash = document.querySelector('.dash');
  var toggle = document.querySelector('.motion-toggle');
  var visible = true;
  var frame = 0;
  var currentX = 2.5, currentY = -8, targetX = 2.5, targetY = -8;

  function motionAllowed() { return !paused && !reduce.matches && !document.hidden; }
  function resetTilt() {
    cancelAnimationFrame(frame); frame = 0;
    currentX = targetX = 2.5; currentY = targetY = -8;
    if (dash) {
      dash.classList.remove('is-tilting');
      dash.style.removeProperty('--tilt-x');
      dash.style.removeProperty('--tilt-y');
    }
  }
  function updateMotion() {
    root.dataset.motion = reduce.matches ? 'reduced' : paused ? 'paused' : 'active';
    root.classList.toggle('page-away', document.hidden);
    if (!motionAllowed()) resetTilt();
    if (reduce.matches) {
      document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
      if (scene) scene.classList.add('scene-in');
    }
    if (toggle) {
      toggle.disabled = reduce.matches;
      var label = reduce.matches ? 'Movimento reduzido' : paused ? 'Retomar animações' : 'Pausar animações';
      toggle.querySelector('span').textContent = label;
      toggle.setAttribute('aria-label', label);
      toggle.setAttribute('aria-pressed', String(paused || reduce.matches));
      toggle.querySelector('path').setAttribute('d', paused ? 'M5 3l7 5-7 5Z' : 'M5 3v10M11 3v10');
    }
  }
  if (toggle) toggle.addEventListener('click', function () { paused = !paused; updateMotion(); });
  reduce.addEventListener('change', updateMotion);
  pointer.addEventListener('change', resetTilt);
  document.addEventListener('visibilitychange', updateMotion);
  updateMotion();

  // Entrada: 800 ms, deslocamento de 20 px, uma única vez por elemento.
  var reveals = Array.from(document.querySelectorAll('.reveal'));
  if ('IntersectionObserver' in window && !reduce.matches) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in'); observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
    reveals.forEach(function (el) {
      var siblings = Array.from(el.parentElement.children).filter(function (item) { return item.classList.contains('reveal'); });
      el.style.setProperty('--reveal-delay', Math.min(siblings.indexOf(el) * 90, 270) + 'ms');
      observer.observe(el);
    });
    root.classList.add('motion-ready');
  } else reveals.forEach(function (el) { el.classList.add('in'); });

  if (scene && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        visible = entry.isIntersecting;
        if (visible) scene.classList.add('scene-in');
        if (hero) hero.classList.toggle('scene-out', !visible);
        if (!visible) resetTilt();
      });
    }, { threshold: 0.12 }).observe(scene);
  } else if (scene) scene.classList.add('scene-in');

  function tiltFrame() {
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;
    dash.style.setProperty('--tilt-x', currentX.toFixed(2) + 'deg');
    dash.style.setProperty('--tilt-y', currentY.toFixed(2) + 'deg');
    if (Math.abs(targetX - currentX) > 0.01 || Math.abs(targetY - currentY) > 0.01) {
      frame = requestAnimationFrame(tiltFrame);
    } else { frame = 0; dash.classList.remove('is-tilting'); }
  }
  if (hero && scene && dash) {
    hero.addEventListener('pointermove', function (event) {
      if (!motionAllowed() || !pointer.matches || !visible || event.pointerType === 'touch') return;
      var rect = scene.getBoundingClientRect();
      var x = Math.max(-0.5, Math.min(0.5, (event.clientX - rect.left) / rect.width - 0.5));
      var y = Math.max(-0.5, Math.min(0.5, (event.clientY - rect.top) / rect.height - 0.5));
      targetX = 2.5 - y * 7;
      targetY = -8 + x * 14;
      dash.classList.add('is-tilting');
      if (!frame) frame = requestAnimationFrame(tiltFrame);
    }, { passive: true });
    hero.addEventListener('pointerleave', resetTilt);
  }

  var tabs = Array.from(document.querySelectorAll('.diagnostic-tabs [role="tab"]'));
  function select(tab) {
    tabs.forEach(function (item) {
      var active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
      var panel = document.getElementById(item.getAttribute('aria-controls'));
      panel.hidden = !active;
      panel.classList.toggle('panel-enter', active && motionAllowed());
    });
  }
  tabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () { select(tab); });
    tab.addEventListener('keydown', function (event) {
      var next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault(); select(tabs[next]); tabs[next].focus();
    });
  });
})();
