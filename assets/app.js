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
  var GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz3YBOMWANgE-PCosDZo-bnaKzzrhl-1FJKg3DKrQBaW95-hf9fKa8ALWkum5kyUB1f/exec';

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
    var num = (settings.whatsapp || '5531991985605').replace(/\D/g, '');
    return 'https://wa.me/' + num + '?text=' + encodeURIComponent(text);
  }

  var DEFAULT_MSG = 'Oi! Vim pela landing page da amaral.ads e quero agendar o diagnóstico comercial gratuito (25 min — anúncios + funil).';
  Array.prototype.forEach.call(document.querySelectorAll('.js-wpp'), function (el) {
    el.setAttribute('href', wppUrl(DEFAULT_MSG));
    el.setAttribute('target', '_blank');
    el.setAttribute('rel', 'noopener');
  });

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var PATH_LABEL = {
    comecar: 'Quero começar (ainda não invisto em tráfego)',
    acelerar: 'Quero acelerar (já invisto, sem resultado)',
    diagnostico: 'Diagnóstico comercial'
  };
  var PATH_CHIP = {
    comecar: 'Caminho A · ainda não invisto — começar do zero',
    acelerar: 'Caminho B · já invisto — auditar anúncios',
    diagnostico: 'Diagnóstico comercial'
  };

  function applyPath(path) {
    path = path || 'diagnostico';
    var hidden = document.getElementById('campoCaminho');
    var situacao = document.getElementById('campoSituacao');
    var invest = document.getElementById('campoInvestimento');
    var chip = document.getElementById('pathChip');
    var stepPath = document.getElementById('stepPath');
    var stepDados = document.getElementById('stepDados');
    if (hidden) hidden.value = path;
    if (situacao && (path === 'comecar' || path === 'acelerar')) {
      situacao.value = path;
      situacao.classList.remove('invalid');
    }
    if (invest) invest.value = path === 'comecar' ? 'Não invisto ainda' : '';
    if (chip) {
      chip.hidden = false;
      chip.textContent = PATH_CHIP[path] || PATH_CHIP.diagnostico;
      chip.classList.toggle('is-b', path === 'acelerar');
    }
    if (stepPath && stepDados) {
      var picked = path === 'comecar' || path === 'acelerar';
      stepPath.classList.toggle('is-done', picked);
      stepPath.classList.toggle('is-on', !picked);
      stepDados.classList.toggle('is-on', picked);
    }
    Array.prototype.forEach.call(document.querySelectorAll('.path[data-path]'), function (card) {
      card.classList.toggle('is-picked', card.getAttribute('data-path') === path);
    });
  }

  function goToForm(path) {
    applyPath(path);
    var dest = document.getElementById('contato');
    var form = document.getElementById('leadForm');
    if (form) form.classList.add('is-armed');
    if (dest) {
      var y = dest.getBoundingClientRect().top + window.pageYOffset - 84;
      window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
    }
    var first = form && form.querySelector('input[name="nome"]');
    if (first) setTimeout(function () { first.focus(); }, 350);
  }

  Array.prototype.forEach.call(document.querySelectorAll('.js-path'), function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      goToForm(el.getAttribute('data-path') || 'diagnostico');
    });
  });

  var situacaoSelect = document.getElementById('campoSituacao');
  if (situacaoSelect) {
    situacaoSelect.addEventListener('change', function () {
      applyPath(situacaoSelect.value || 'diagnostico');
    });
  }

  if (location.hash === '#contato') {
    setTimeout(function () { goToForm('diagnostico'); }, 50);
  }

  // Atualiza e-mail / Instagram do rodapé se settings mudarem
  var mailLink = document.querySelector('a[href^="mailto:"]');
  if (mailLink && settings.email) mailLink.setAttribute('href', 'mailto:' + settings.email);
  var igLink = document.querySelector('a[href*="instagram.com"]');
  if (igLink && settings.instagram) igLink.setAttribute('href', settings.instagram);

  document.getElementById('ano').textContent = new Date().getFullYear();

  var siteVideo = document.getElementById('siteVideo');
  var siteWrap = document.getElementById('siteVideoWrap');
  var playSite = document.getElementById('playSite');
  if (siteVideo && siteWrap && playSite) {
    function setSitePlaying(on) {
      siteWrap.classList.toggle('is-playing', on);
      if (on) siteVideo.setAttribute('controls', '');
      else siteVideo.removeAttribute('controls');
    }
    playSite.addEventListener('click', function () {
      siteVideo.play();
      setSitePlaying(true);
    });
    siteVideo.addEventListener('play', function () { setSitePlaying(true); });
    siteVideo.addEventListener('ended', function () {
      setSitePlaying(false);
      siteVideo.currentTime = 0;
    });
  }

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
      'Olá! Vim pela landing page da amaral.ads e quero agendar o diagnóstico comercial gratuito.',
      '',
      '*Nome:* ' + data.nome,
      '*WhatsApp:* ' + data.whatsapp,
      '*E-mail:* ' + data.email,
      '*Empresa:* ' + data.empresa,
      '*Caminho:* ' + (PATH_LABEL[data.situacao] || PATH_LABEL[data.caminho] || data.situacao || data.caminho || 'Diagnóstico'),
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
        situacao: (form.situacao && form.situacao.value) || '',
        caminho: (form.caminho && form.caminho.value) || '',
        investimento: form.investimento.value,
        site: (form.site && form.site.value.trim()) || '',
        desafio: (form.desafio && form.desafio.value.trim()) || ''
      };

      var attribution = AmaralStore.getAttribution();
      var lead = AmaralStore.createLead({
        nome: data.nome,
        whatsapp: data.whatsapp,
        email: data.email,
        empresa: data.empresa,
        segmento: PATH_LABEL[data.situacao] || data.situacao,
        investimento: data.investimento,
        site: data.site,
        desafio: data.desafio,
        caminho: data.caminho,
        situacao: data.situacao,
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
      var stepWpp = document.getElementById('stepWpp');
      if (stepWpp) { stepWpp.classList.add('is-on'); }
      window.open(url, '_blank', 'noopener');
    });

    form.addEventListener('input', function (e) {
      if (e.target && e.target.classList) e.target.classList.remove('invalid');
    });
    form.addEventListener('change', function (e) {
      if (e.target && e.target.classList) e.target.classList.remove('invalid');
    });
  }

  /* ─── Reveal cinematico do H1, palavra por palavra ─── */
  var heroH1 = document.querySelector('.hero h1');
  if (heroH1 && !reduced) {
    var words = heroH1.textContent.trim().split(/\s+/);
    heroH1.innerHTML = words.map(function (w, i) {
      return '<span class="wmask"><span class="wi" style="transition-delay:' + (i * 65 + 100) + 'ms">' + w + '</span></span>';
    }).join(' ');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { heroH1.classList.add('in'); });
    });
  }

  /* ─── Cursor customizado + botoes magneticos + spotlight nos cards ───
     So em dispositivos com mouse de verdade (pointer:fine + hover:hover).
     Em touch/reduced-motion nada disso roda — fica so o cursor nativo. */
  var hasFinePointer = window.matchMedia('(pointer: fine)').matches && window.matchMedia('(hover: hover)').matches;
  if (hasFinePointer && !reduced) {
    var cxDot = document.createElement('div');
    cxDot.className = 'cx-dot';
    cxDot.setAttribute('aria-hidden', 'true');
    var cxRing = document.createElement('div');
    cxRing.className = 'cx-ring';
    cxRing.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cxRing);
    document.body.appendChild(cxDot);

    var mx = -100, my = -100, rx = -100, ry = -100;
    window.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      cxDot.style.transform = 'translate(' + mx + 'px,' + my + 'px)';
      document.body.classList.add('cx-active');
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', function () {
      document.body.classList.remove('cx-active');
    });

    (function ringLoop() {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      cxRing.style.transform = 'translate(' + rx + 'px,' + ry + 'px)';
      requestAnimationFrame(ringLoop);
    })();

    var hoverables = document.querySelectorAll('a, button, .pillar, .path, summary');
    Array.prototype.forEach.call(hoverables, function (el) {
      el.addEventListener('mouseenter', function () { document.body.classList.add('cx-hover'); });
      el.addEventListener('mouseleave', function () { document.body.classList.remove('cx-hover'); });
    });

    Array.prototype.forEach.call(document.querySelectorAll('.btn'), function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        var bx = e.clientX - r.left - r.width / 2;
        var by = e.clientY - r.top - r.height / 2;
        btn.style.transform = 'translate(' + (bx * 0.26) + 'px,' + (by * 0.3) + 'px)';
      });
      btn.addEventListener('mouseleave', function () { btn.style.transform = ''; });
    });

    Array.prototype.forEach.call(document.querySelectorAll('.pillar, .path'), function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
        card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
      });
    });
  }

})();
