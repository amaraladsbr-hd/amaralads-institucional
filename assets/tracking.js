/**
 * amaral.ads — tracking (GTM / GA4 / Meta Pixel) + eventos de conversão
 * IDs vêm de AmaralStore.getSettings(). Sem tokens secretos.
 */
(function (global) {
  'use strict';

  var loaded = { gtm: false, ga4: false, meta: false };

  function isLocalHost() {
    var h = location.hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h === '';
  }

  function shouldLoad(settings) {
    if (!settings.trackingEnabled) return false;
    if (isLocalHost() && !settings.trackingForceLocal) return false;
    return true;
  }

  function validGtm(id) {
    return /^GTM-[A-Z0-9]+$/i.test(id || '');
  }
  function validGa4(id) {
    return /^G-[A-Z0-9]+$/i.test(id || '');
  }
  function validPixel(id) {
    return /^\d{5,20}$/.test(String(id || ''));
  }

  function loadGTM(id) {
    if (loaded.gtm || !validGtm(id)) return;
    loaded.gtm = true;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
    // noscript fallback opcional
    var ns = document.createElement('noscript');
    ns.innerHTML = '<iframe src="https://www.googletagmanager.com/ns.html?id=' + id +
      '" height="0" width="0" style="display:none;visibility:hidden"></iframe>';
    document.body.insertBefore(ns, document.body.firstChild);
  }

  function loadGA4(id) {
    if (loaded.ga4 || !validGa4(id)) return;
    loaded.ga4 = true;
    window.dataLayer = window.dataLayer || [];
    function gtag(){ window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', id, { send_page_view: true });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
  }

  function loadMeta(id) {
    if (loaded.meta || !validPixel(id)) return;
    loaded.meta = true;
    !function(f,b,e,v,n,t,s){
      if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s);
    }(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', id);
    window.fbq('track', 'PageView');
  }

  function init() {
    if (!global.AmaralStore) return { status: 'no-store' };
    var settings = AmaralStore.getSettings();
    AmaralStore.captureAttribution();
    var status = {
      local: isLocalHost(),
      enabled: !!settings.trackingEnabled,
      forceLocal: !!settings.trackingForceLocal,
      willLoad: shouldLoad(settings),
      gtm: validGtm(settings.gtmId) ? settings.gtmId : null,
      ga4: validGa4(settings.ga4Id) ? settings.ga4Id : null,
      meta: validPixel(settings.metaPixelId) ? settings.metaPixelId : null,
      loaded: loaded
    };
    if (shouldLoad(settings)) {
      if (status.gtm) loadGTM(settings.gtmId);
      // Se GTM estiver ativo, GA4/Pixel preferencialmente vão pelo container.
      // Ainda assim carregamos GA4/Pixel diretos se configurados e GTM vazio,
      // ou se o usuário quiser dual (útil em teste local forçado).
      if (status.ga4 && !status.gtm) loadGA4(settings.ga4Id);
      if (status.meta && !status.gtm) loadMeta(settings.metaPixelId);
      // Com GTM: ainda permite GA4/Pixel diretos se ambos preenchidos (diagnóstico)
      if (status.gtm && status.ga4 && settings.trackingForceLocal) loadGA4(settings.ga4Id);
      if (status.gtm && status.meta && settings.trackingForceLocal) loadMeta(settings.metaPixelId);
    }
    return status;
  }

  function pushDataLayer(payload) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
  }

  function trackLead(lead) {
    var attr = (lead && lead.attribution) || AmaralStore.getAttribution();
    var last = (attr && (attr.last || attr.first)) || {};
    var eventPayload = {
      event: 'generate_lead',
      lead_id: lead && lead.id,
      empresa: lead && lead.empresa,
      segmento: lead && lead.segmento,
      investimento: lead && lead.investimento,
      utm_source: last.utm_source || '',
      utm_medium: last.utm_medium || '',
      utm_campaign: last.utm_campaign || '',
      utm_content: last.utm_content || '',
      utm_term: last.utm_term || '',
      gclid: last.gclid || '',
      fbclid: last.fbclid || ''
    };
    pushDataLayer(eventPayload);

    if (typeof window.gtag === 'function') {
      window.gtag('event', 'generate_lead', {
        currency: 'BRL',
        value: 0,
        lead_source: last.utm_source || 'direct'
      });
    }
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'Lead', {
        content_name: 'diagnostico_lp',
        status: 'submitted'
      });
    }
    return eventPayload;
  }

  function diagnose() {
    var settings = AmaralStore.getSettings();
    return {
      hostname: location.hostname,
      isLocal: isLocalHost(),
      settings: {
        trackingEnabled: settings.trackingEnabled,
        trackingForceLocal: settings.trackingForceLocal,
        gtmId: settings.gtmId || '(vazio)',
        ga4Id: settings.ga4Id || '(vazio)',
        metaPixelId: settings.metaPixelId || '(vazio)'
      },
      validation: {
        gtm: validGtm(settings.gtmId),
        ga4: validGa4(settings.ga4Id),
        meta: validPixel(settings.metaPixelId)
      },
      loaded: Object.assign({}, loaded),
      dataLayerSize: (window.dataLayer && window.dataLayer.length) || 0,
      attribution: AmaralStore.getAttribution()
    };
  }

  global.AmaralTracking = {
    init: init,
    trackLead: trackLead,
    diagnose: diagnose,
    validGtm: validGtm,
    validGa4: validGa4,
    validPixel: validPixel,
    isLocalHost: isLocalHost
  };
})(window);
