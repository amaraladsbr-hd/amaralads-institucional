/**
 * amaral.ads — lógica da landing page
 * Depende de: storage.js, tracking.js
 */
(function () {
  'use strict';

  AmaralStore.ensurePasswordHash();
  AmaralStore.captureAttribution();
  AmaralTracking.init();

  var settings = AmaralStore.getSettings();

  // ─── Envio pra planilha Google (Apps Script Web App) ───
  // Isso garante que o lead chega num lugar central, mesmo que o visitante
  // feche a aba sem enviar o WhatsApp, ou preencha de um celular que a
  // agencia nunca vai abrir o /admin local.
  // TODO: cole aqui a URL do Web App depois de implantar o Apps Script
  // (veja instrucoes em ../docs/apps-script-lp-leads.gs)
  var GOOGLE_SCRIPT_URL = 'COLE_AQUI_A_URL_DO_APPS_SCRIPT';

  function sendLeadToSheet(data, attribution) {
    if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.indexOf('COLE_AQUI') !== -1) return;
    var last = (attribution && (attribution.last || attribution.first)) || {};
    var payload = Object.assign({}, data, {
      utm_source: last.utm_source || '', utm_medium: last.utm_medium || '',
      utm_campaign: last.utm_campaign || '', utm_content: last.utm_content || '',
      utm_term: last.utm_term || '', gclid: last.gclid || '', fbclid: last.fbclid || '',
      referrer: last.referrer || '', landingPage: last.landingPage || ''
    });
    try {
      fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
    } catch (err) { /* falha silenciosa: WhatsApp continua sendo o fallback */ }
  }

  function wppUrl(text) {
    var num = (settings.whatsapp || '5531994954607').replace(/\D/g, '');
    return 'https://wa.me/' + num + '?text=' + encodeURIComponent(text);
  }

  var DEFAULT_MSG = 'Oi! Vim pela landing page da amaral.ads e quero um diagnóstico da minha operação de tráfego.';
  Array.prototype.forEach.call(document.querySelectorAll('.js-wpp'), function (el) {
    el.setAttribute('href', wppUrl(DEFAULT_MSG));
    el.setAttribute('target', '_blank');
    el.setAttribute('rel', 'noopener');
  });

  // Atualiza e-mail / Instagram do rodapé se settings mudarem
  var mailLink = document.querySelector('a[href^="mailto:"]');
  if (mailLink && settings.email) mailLink.setAttribute('href', 'mailto:' + settings.email);
  var igLink = document.querySelector('a[href*="instagram.com"]');
  if (igLink && settings.instagram) igLink.setAttribute('href', settings.instagram);

  document.getElementById('ano').textContent = new Date().getFullYear();

  /* ─── Header progress ─── */
  var header = document.getElementById('header');
  var progress = document.getElementById('progress');
  function onScroll() {
    var y = window.scrollY;
    header.classList.toggle('scrolled', y > 24);
    var max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ─── Reveal ─── */
  var revealables = document.querySelectorAll('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(revealables, function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, i) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.style.transitionDelay = (i * 90) + 'ms';
        el.classList.add('in');
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    Array.prototype.forEach.call(revealables, function (el) { io.observe(el); });
  }

  /* ─── Stepper rotation ─── */
  var cards = document.querySelectorAll('.stepper .step-card');
  if (cards.length && !reduced) {
    var idx = 2;
    setInterval(function () {
      cards[idx].classList.remove('active');
      idx = (idx + 1) % cards.length;
      cards[idx].classList.add('active');
    }, 2600);
  }

  /* ─── Lead form → CRM + WhatsApp + tracking ─── */
  var form = document.getElementById('leadForm');
  var phoneInput = form && form.querySelector('[name="whatsapp"]');

  function onlyDigits(v) { return String(v || '').replace(/\D/g, ''); }
  function maskPhone(v) {
    var d = onlyDigits(v).slice(0, 11);
    if (d.length <= 2) return d.length ? '(' + d : '';
    if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  }
  if (phoneInput) {
    phoneInput.addEventListener('input', function () {
      var pos = phoneInput.selectionStart;
      var before = phoneInput.value.length;
      phoneInput.value = maskPhone(phoneInput.value);
      var after = phoneInput.value.length;
      try { phoneInput.setSelectionRange(pos + (after - before), pos + (after - before)); } catch (e) {}
    });
  }

  function buildLeadMessage(data) {
    var lines = [
      'Olá! Vim pela landing page da amaral.ads e quero um diagnóstico.',
      '',
      '*Nome:* ' + data.nome,
      '*WhatsApp:* ' + data.whatsapp,
      '*E-mail:* ' + data.email,
      '*Empresa:* ' + data.empresa,
      '*Segmento:* ' + data.segmento,
      '*Investimento em mídia:* ' + data.investimento
    ];
    if (data.site) lines.push('*Site/Instagram:* ' + data.site);
    if (data.desafio) lines.push('*Desafio:* ' + data.desafio);
    var attr = AmaralStore.getAttribution();
    var last = (attr && (attr.last || attr.first)) || {};
    if (last.utm_source || last.utm_campaign || last.gclid || last.fbclid) {
      lines.push('');
      lines.push('_Origem:_');
      if (last.utm_source) lines.push('utm_source: ' + last.utm_source);
      if (last.utm_medium) lines.push('utm_medium: ' + last.utm_medium);
      if (last.utm_campaign) lines.push('utm_campaign: ' + last.utm_campaign);
      if (last.gclid) lines.push('gclid: ' + last.gclid);
      if (last.fbclid) lines.push('fbclid: ' + last.fbclid);
    }
    return lines.join('\n');
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var fields = form.querySelectorAll('[required]');
      var ok = true;
      Array.prototype.forEach.call(fields, function (el) {
        var empty = !String(el.value || '').trim();
        el.classList.toggle('invalid', empty);
        if (empty) ok = false;
      });
      var email = form.querySelector('[name="email"]');
      if (email && email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
        email.classList.add('invalid'); ok = false;
      }
      var phoneDigits = onlyDigits(phoneInput && phoneInput.value);
      if (phoneDigits.length < 10) {
        if (phoneInput) phoneInput.classList.add('invalid');
        ok = false;
      }
      if (!ok) {
        var first = form.querySelector('.invalid');
        if (first) first.focus();
        return;
      }

      var data = {
        nome: form.nome.value.trim(),
        whatsapp: form.whatsapp.value.trim(),
        email: form.email.value.trim(),
        empresa: form.empresa.value.trim(),
        segmento: form.segmento.value,
        investimento: form.investimento.value,
        site: form.site.value.trim(),
        desafio: form.desafio.value.trim()
      };

      var attribution = AmaralStore.getAttribution();
      var lead = AmaralStore.createLead({
        nome: data.nome,
        whatsapp: data.whatsapp,
        email: data.email,
        empresa: data.empresa,
        segmento: data.segmento,
        investimento: data.investimento,
        site: data.site,
        desafio: data.desafio,
        source: 'lp_form',
        attribution: attribution
      });

      try { AmaralTracking.trackLead(lead); } catch (err) {}
      sendLeadToSheet(data, attribution);

      var msg = buildLeadMessage(data);
      var url = wppUrl(msg);
      var fallback = document.getElementById('formWppFallback');
      if (fallback) {
        fallback.setAttribute('href', url);
        fallback.setAttribute('target', '_blank');
        fallback.setAttribute('rel', 'noopener');
      }
      form.classList.add('is-sent');
      window.open(url, '_blank', 'noopener');
    });

    form.addEventListener('input', function (e) {
      if (e.target && e.target.classList) e.target.classList.remove('invalid');
    });
    form.addEventListener('change', function (e) {
      if (e.target && e.target.classList) e.target.classList.remove('invalid');
    });
  }

  /* ─── Constelação ─── */
  function constellation(canvasId, opts) {
    var canvas = document.getElementById(canvasId);
    if (!canvas || reduced) return;
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var pts = [], mouse = { x: -9999, y: -9999 };
    var LINK = opts.link, COUNT = opts.count;

    function resize() {
      var r = canvas.getBoundingClientRect();
      canvas.width = r.width * dpr;
      canvas.height = r.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build(r.width, r.height);
    }
    function build(w, h) {
      pts = [];
      var n = Math.min(COUNT, Math.floor(w / 22));
      for (var i = 0; i < n; i++) {
        pts.push({
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.28, vy: (Math.random() - 0.5) * 0.28,
          r: Math.random() * 1.4 + 1
        });
      }
    }
    canvas.parentElement.addEventListener('mousemove', function (e) {
      var r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    canvas.parentElement.addEventListener('mouseleave', function () {
      mouse.x = -9999; mouse.y = -9999;
    });

    function tick() {
      var w = canvas.width / dpr, h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      }
      for (var a = 0; a < pts.length; a++) {
        for (var b = a + 1; b < pts.length; b++) {
          var dx = pts[a].x - pts[b].x, dy = pts[a].y - pts[b].y;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK) {
            ctx.strokeStyle = 'rgba(0,212,255,' + (0.16 * (1 - d / LINK)).toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(pts[a].x, pts[a].y); ctx.lineTo(pts[b].x, pts[b].y); ctx.stroke();
          }
        }
      }
      for (var k = 0; k < pts.length; k++) {
        var q = pts[k];
        var md = Math.sqrt(Math.pow(q.x - mouse.x, 2) + Math.pow(q.y - mouse.y, 2));
        var near = md < 170;
        if (near) {
          ctx.strokeStyle = 'rgba(0,212,255,' + (0.3 * (1 - md / 170)).toFixed(3) + ')';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
        ctx.fillStyle = near ? 'rgba(0,212,255,.95)' : 'rgba(0,212,255,.5)';
        ctx.beginPath(); ctx.arc(q.x, q.y, q.r + (near ? 0.8 : 0), 0, Math.PI * 2); ctx.fill();
      }
      requestAnimationFrame(tick);
    }
    window.addEventListener('resize', resize);
    resize();
    tick();
  }

  constellation('netBg', { count: 64, link: 165 });
  constellation('netBg2', { count: 34, link: 150 });
})();
