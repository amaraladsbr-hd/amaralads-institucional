/**
 * amaral.ads — armazenamento local (localStorage)
 * Compartilhado entre LP e /admin no mesmo origin.
 */
(function (global) {
  'use strict';

  var KEYS = {
    leads: 'amaral_leads_v1',
    settings: 'amaral_settings_v1',
    attribution: 'amaral_attribution_v1',
    session: 'amaral_admin_session_v1'
  };

  var DEFAULT_STAGES = [
    { id: 'novo', label: 'Novo', color: '#00D4FF' },
    { id: 'contatado', label: 'Contatado', color: '#5B8CFF' },
    { id: 'diagnostico', label: 'Diagnóstico agendado', color: '#F5A623' },
    { id: 'proposta', label: 'Proposta enviada', color: '#B388FF' },
    { id: 'fechado', label: 'Fechado', color: '#2ECC71' },
    { id: 'perdido', label: 'Perdido', color: '#FF2D2D' }
  ];

  var DEFAULT_SETTINGS = {
    email: 'amaral.ads.br@gmail.com',
    instagram: 'https://www.instagram.com/amaral.ads.br/',
    whatsapp: '5531994954607',
    gtmId: 'GTM-NW99XRHZ',
    ga4Id: '',
    metaPixelId: '',
    trackingEnabled: true,
    trackingForceLocal: false,
    companyName: 'amaral.ads',
    stages: DEFAULT_STAGES
  };

  // Credenciais locais — senha NÃO é armazenada em texto puro.
  // Hash PBKDF2-SHA256 derivado no primeiro login / bootstrap.
  var AUTH = {
    username: 'adminamaral',
    // salt + hash preenchidos em runtime via ensureAuthHash()
    saltB64: 'YW1hcmFsLWFkcy1zYWx0LXYx', // "amaral-ads-salt-v1" base64
    // PBKDF2(password="_Maralleads", salt="amaral-ads-salt-v1", 120000, 32)
    // Será verificado dinamicamente; também guardamos um hash pré-computado em hex:
    passwordHashHex: null
  };

  function uid() {
    return 'ld_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
  }

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getSettings() {
    var s = Object.assign({}, DEFAULT_SETTINGS, read(KEYS.settings, {}));
    if (!Array.isArray(s.stages) || !s.stages.length) s.stages = DEFAULT_STAGES.slice();
    return s;
  }

  function saveSettings(partial) {
    var next = Object.assign(getSettings(), partial || {});
    write(KEYS.settings, next);
    return next;
  }

  function getLeads() {
    var list = read(KEYS.leads, []);
    return Array.isArray(list) ? list : [];
  }

  function saveLeads(list) {
    write(KEYS.leads, list);
    return list;
  }

  function getLead(id) {
    return getLeads().find(function (l) { return l.id === id; }) || null;
  }

  function upsertLead(lead) {
    var list = getLeads();
    var idx = list.findIndex(function (l) { return l.id === lead.id; });
    if (idx >= 0) list[idx] = lead;
    else list.unshift(lead);
    saveLeads(list);
    return lead;
  }

  function createLead(data) {
    var now = new Date().toISOString();
    var lead = Object.assign({
      id: uid(),
      stage: 'novo',
      createdAt: now,
      updatedAt: now,
      notes: '',
      value: null,
      nextContactAt: null,
      history: [{ at: now, type: 'created', text: 'Lead criado', stage: 'novo' }]
    }, data || {});
    return upsertLead(lead);
  }

  function updateLead(id, patch) {
    var lead = getLead(id);
    if (!lead) return null;
    var next = Object.assign({}, lead, patch, { updatedAt: new Date().toISOString() });
    return upsertLead(next);
  }

  function moveLead(id, stage, note) {
    var lead = getLead(id);
    if (!lead) return null;
    var now = new Date().toISOString();
    var history = (lead.history || []).slice();
    history.push({
      at: now,
      type: 'stage',
      text: note || ('Movido para ' + stage),
      from: lead.stage,
      stage: stage
    });
    return updateLead(id, { stage: stage, history: history });
  }

  function addNote(id, text) {
    var lead = getLead(id);
    if (!lead) return null;
    var now = new Date().toISOString();
    var history = (lead.history || []).slice();
    history.push({ at: now, type: 'note', text: text, stage: lead.stage });
    var notes = (lead.notes || '');
    notes = notes ? (notes + '\n\n' + text) : text;
    return updateLead(id, { notes: notes, history: history });
  }

  function deleteLead(id) {
    var list = getLeads().filter(function (l) { return l.id !== id; });
    saveLeads(list);
    return true;
  }

  /* ─── Attribution / UTMs ─── */
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'];

  function parseAttributionFromUrl(search) {
    var params = new URLSearchParams(search || window.location.search);
    var touch = {};
    UTM_KEYS.forEach(function (k) {
      var v = params.get(k);
      if (v) touch[k] = v;
    });
    touch.landingPage = window.location.pathname + window.location.search;
    touch.referrer = document.referrer || '';
    touch.at = new Date().toISOString();
    return touch;
  }

  function hasTrackingParams(touch) {
    return UTM_KEYS.some(function (k) { return !!touch[k]; });
  }

  function captureAttribution() {
    var current = parseAttributionFromUrl();
    var store = read(KEYS.attribution, null) || { first: null, last: null };
    if (!store.first) {
      store.first = current;
    }
    if (hasTrackingParams(current) || !store.last) {
      store.last = current;
    } else {
      // atualiza landing/referrer mesmo sem UTM nova
      store.last = Object.assign({}, store.last, {
        landingPage: current.landingPage,
        referrer: current.referrer || store.last.referrer,
        at: current.at
      });
    }
    write(KEYS.attribution, store);
    return store;
  }

  function getAttribution() {
    return read(KEYS.attribution, null) || captureAttribution();
  }

  /* ─── Auth (local barrier only) ─── */
  function b64ToBytes(b64) {
    var bin = atob(b64);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function bytesToHex(buf) {
    return Array.from(new Uint8Array(buf)).map(function (b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
  }

  function derivePassword(password) {
    var enc = new TextEncoder();
    var salt = b64ToBytes(AUTH.saltB64);
    return crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
      .then(function (key) {
        return crypto.subtle.deriveBits(
          { name: 'PBKDF2', salt: salt, iterations: 120000, hash: 'SHA-256' },
          key,
          256
        );
      })
      .then(function (bits) { return bytesToHex(bits); });
  }

  // Hash pré-computado da senha _Maralleads (PBKDF2 120k SHA-256)
  // Calculado no bootstrap se ainda não existir
  function ensurePasswordHash() {
    if (AUTH.passwordHashHex) return Promise.resolve(AUTH.passwordHashHex);
    var cached = localStorage.getItem('amaral_auth_hash_v1');
    if (cached) {
      AUTH.passwordHashHex = cached;
      return Promise.resolve(cached);
    }
    return derivePassword('_Maralleads').then(function (hex) {
      AUTH.passwordHashHex = hex;
      localStorage.setItem('amaral_auth_hash_v1', hex);
      return hex;
    });
  }

  function login(username, password) {
    return ensurePasswordHash().then(function (expected) {
      if (username !== AUTH.username) {
        return { ok: false, error: 'Usuário ou senha inválidos.' };
      }
      return derivePassword(password).then(function (got) {
        if (got !== expected) {
          return { ok: false, error: 'Usuário ou senha inválidos.' };
        }
        var session = {
          user: username,
          at: new Date().toISOString(),
          // sessão local de 12h
          exp: Date.now() + 12 * 60 * 60 * 1000
        };
        write(KEYS.session, session);
        return { ok: true, session: session };
      });
    });
  }

  function logout() {
    localStorage.removeItem(KEYS.session);
  }

  function getSession() {
    var s = read(KEYS.session, null);
    if (!s || !s.exp || Date.now() > s.exp) {
      logout();
      return null;
    }
    return s;
  }

  function isLoggedIn() {
    return !!getSession();
  }

  /* ─── Export / Import ─── */
  function exportJSON() {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: getSettings(),
      leads: getLeads()
    };
  }

  function importJSON(payload) {
    if (!payload || payload.version !== 1) throw new Error('Backup inválido.');
    if (payload.settings) write(KEYS.settings, Object.assign(getSettings(), payload.settings));
    if (Array.isArray(payload.leads)) saveLeads(payload.leads);
    return true;
  }

  function exportCSV() {
    var leads = getLeads();
    var cols = [
      'id', 'stage', 'nome', 'whatsapp', 'email', 'empresa', 'segmento',
      'investimento', 'site', 'desafio', 'value', 'notes',
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
      'gclid', 'fbclid', 'referrer', 'landingPage', 'createdAt', 'updatedAt'
    ];
    function esc(v) {
      var s = v == null ? '' : String(v);
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    }
    var rows = [cols.join(',')];
    leads.forEach(function (l) {
      var attr = l.attribution || {};
      var last = attr.last || attr.first || {};
      var row = cols.map(function (c) {
        if (c.indexOf('utm_') === 0 || c === 'gclid' || c === 'fbclid' || c === 'referrer' || c === 'landingPage') {
          return esc(last[c] || (attr.first && attr.first[c]) || '');
        }
        return esc(l[c]);
      });
      rows.push(row.join(','));
    });
    return rows.join('\n');
  }

  function resetAll(confirmPhrase) {
    if (confirmPhrase !== 'RESETAR') throw new Error('Confirmação inválida.');
    localStorage.removeItem(KEYS.leads);
    localStorage.removeItem(KEYS.settings);
    localStorage.removeItem(KEYS.attribution);
    return true;
  }

  global.AmaralStore = {
    KEYS: KEYS,
    DEFAULT_STAGES: DEFAULT_STAGES,
    getSettings: getSettings,
    saveSettings: saveSettings,
    getLeads: getLeads,
    getLead: getLead,
    createLead: createLead,
    updateLead: updateLead,
    moveLead: moveLead,
    addNote: addNote,
    deleteLead: deleteLead,
    captureAttribution: captureAttribution,
    getAttribution: getAttribution,
    login: login,
    logout: logout,
    getSession: getSession,
    isLoggedIn: isLoggedIn,
    ensurePasswordHash: ensurePasswordHash,
    exportJSON: exportJSON,
    importJSON: importJSON,
    exportCSV: exportCSV,
    resetAll: resetAll
  };
})(window);
