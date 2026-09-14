/**
 * amaral.ads — link da bio
 * Depende de: storage.js, tracking.js (carregados antes deste script)
 */
(function () {
  'use strict';

  AmaralStore.ensurePasswordHash();
  AmaralStore.captureAttribution();
  AmaralTracking.init();

  var settings = AmaralStore.getSettings();

  function wppUrl(text) {
    var num = (settings.whatsapp || '5531991985605').replace(/\D/g, '');
    return 'https://wa.me/' + num + '?text=' + encodeURIComponent(text);
  }

  var SITUACAO_LABEL = {
    comecar: 'Ainda não invisto em tráfego',
    acelerar: 'Já invisto, mas não tenho retorno claro'
  };

  /* ─── vídeo: autoplay tentando com som, cai pra mudo se o navegador bloquear ─── */
  var video = document.getElementById('bioVideo');
  var videoFrame = document.getElementById('bioVideoFrame');
  var soundBtn = document.getElementById('bioSound');
  if (video) {
    var tryUnmutedPlay = function () {
      video.muted = false;
      var attempt = video.play();
      if (attempt && attempt.catch) {
        attempt.catch(function () {
          video.muted = true;
          var fallback = video.play();
          if (fallback && fallback.catch) fallback.catch(function () {});
          if (videoFrame) videoFrame.classList.add('is-muted');
        });
      }
    };
    if (video.readyState >= 2) tryUnmutedPlay();
    else video.addEventListener('loadeddata', tryUnmutedPlay, { once: true });

    if (soundBtn) {
      soundBtn.addEventListener('click', function () {
        video.muted = false;
        video.play();
        if (videoFrame) videoFrame.classList.remove('is-muted');
      });
    }
    video.addEventListener('volumechange', function () {
      if (!video.muted && videoFrame) videoFrame.classList.remove('is-muted');
    });
  }

  var openForm = document.getElementById('openForm');
  var form = document.getElementById('bioForm');
  if (!form) return;

  var phoneInput = form.querySelector('[name="whatsapp"]');

  if (openForm) {
    openForm.addEventListener('click', function () {
      setTimeout(function () {
        var first = form.querySelector('[name="nome"]');
        if (first) first.focus({ preventScroll: true });
      }, 420);
    });
  }

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

  function buildMessage(data) {
    return [
      'Olá! Vim pelo link da bio da Amaral Ads e quero solicitar o diagnóstico comercial gratuito.',
      '',
      '*Nome:* ' + data.nome,
      '*WhatsApp:* ' + data.whatsapp,
      '*Empresa:* ' + data.empresa,
      '*Situação:* ' + (SITUACAO_LABEL[data.situacao] || data.situacao)
    ].join('\n');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var ok = true;
    Array.prototype.forEach.call(form.querySelectorAll('[required]'), function (el) {
      var empty = !String(el.value || '').trim();
      el.classList.toggle('invalid', empty);
      if (empty) ok = false;
    });
    if (onlyDigits(phoneInput && phoneInput.value).length < 10) {
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
      empresa: form.empresa.value.trim(),
      situacao: form.situacao.value
    };

    var attribution = AmaralStore.getAttribution();
    var lead = AmaralStore.createLead({
      nome: data.nome,
      whatsapp: data.whatsapp,
      empresa: data.empresa,
      segmento: SITUACAO_LABEL[data.situacao] || data.situacao,
      situacao: data.situacao,
      source: 'bio_form',
      attribution: attribution
    });
    try { AmaralTracking.trackLead(lead); } catch (err) {}

    var url = wppUrl(buildMessage(data));
    var fallback = document.getElementById('bioWppFallback');
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
})();
