/**
 * amaral.ads — Admin CRM (Kanban + settings + dashboard)
 */
(function () {
  'use strict';

  var TITLES = {
    dashboard: ['Dashboard', 'Visão geral dos leads capturados neste navegador'],
    kanban: ['Kanban CRM', 'Arraste os cards entre as etapas do funil'],
    leads: ['Lista de leads', 'Busca, filtros e edição completa'],
    settings: ['Configurações', 'Contato, tracking GTM/GA4/Pixel e backup']
  };

  var loginView = document.getElementById('loginView');
  var appView = document.getElementById('appView');
  var currentView = 'dashboard';
  var dragLeadId = null;

  AmaralStore.ensurePasswordHash();

  function fmtDate(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    } catch (e) { return iso; }
  }

  function attrTouch(lead) {
    var a = lead.attribution || {};
    return a.last || a.first || {};
  }

  function sourceOf(lead) {
    var t = attrTouch(lead);
    return t.utm_source || (lead.source === 'manual' ? 'manual' : 'direct');
  }

  function wppLink(phone, text) {
    var settings = AmaralStore.getSettings();
    var digits = String(phone || '').replace(/\D/g, '');
    if (digits.length <= 11 && !digits.startsWith('55')) digits = '55' + digits;
    // Se for o número do admin (outbound), usa settings; aqui é contato do lead
    return 'https://wa.me/' + digits + (text ? ('?text=' + encodeURIComponent(text)) : '');
  }

  /* ─── Auth gate ─── */
  function showApp() {
    loginView.hidden = true;
    appView.hidden = false;
    renderAll();
  }
  function showLogin() {
    appView.hidden = true;
    loginView.hidden = false;
  }

  if (AmaralStore.isLoggedIn()) showApp();
  else showLogin();

  document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = document.getElementById('loginBtn');
    var err = document.getElementById('loginError');
    err.hidden = true;
    btn.disabled = true;
    btn.textContent = 'Entrando…';
    var u = e.target.username.value.trim();
    var p = e.target.password.value;
    AmaralStore.login(u, p).then(function (res) {
      btn.disabled = false;
      btn.textContent = 'Acessar portal';
      if (!res.ok) {
        err.textContent = res.error || 'Falha no login';
        err.hidden = false;
        return;
      }
      showApp();
    }).catch(function () {
      btn.disabled = false;
      btn.textContent = 'Acessar portal';
      err.textContent = 'Erro ao validar credenciais neste navegador.';
      err.hidden = false;
    });
  });

  document.getElementById('logoutBtn').addEventListener('click', function () {
    AmaralStore.logout();
    showLogin();
  });

  /* ─── Navigation ─── */
  Array.prototype.forEach.call(document.querySelectorAll('.nav-item'), function (btn) {
    btn.addEventListener('click', function () {
      currentView = btn.getAttribute('data-view');
      Array.prototype.forEach.call(document.querySelectorAll('.nav-item'), function (b) {
        b.classList.toggle('active', b === btn);
      });
      Array.prototype.forEach.call(document.querySelectorAll('.view'), function (v) {
        v.hidden = v.id !== ('view-' + currentView);
      });
      document.getElementById('viewTitle').textContent = TITLES[currentView][0];
      document.getElementById('viewSub').textContent = TITLES[currentView][1];
      renderAll();
    });
  });

  /* ─── Render helpers ─── */
  function stages() {
    return AmaralStore.getSettings().stages || AmaralStore.DEFAULT_STAGES;
  }

  function fillStageSelects() {
    var html = stages().map(function (s) {
      return '<option value="' + s.id + '">' + s.label + '</option>';
    }).join('');
    var listStage = document.getElementById('listStage');
    var cur = listStage.value;
    listStage.innerHTML = '<option value="">Todas as etapas</option>' + html;
    listStage.value = cur;
    document.getElementById('drawerStage').innerHTML = html;
  }

  function fillSourceFilters() {
    var sources = {};
    AmaralStore.getLeads().forEach(function (l) {
      sources[sourceOf(l)] = true;
    });
    var opts = Object.keys(sources).sort().map(function (s) {
      return '<option value="' + s + '">' + s + '</option>';
    }).join('');
    ['kanbanSource', 'listSource'].forEach(function (id) {
      var el = document.getElementById(id);
      var cur = el.value;
      el.innerHTML = '<option value="">Todas as origens</option>' + opts;
      el.value = cur;
    });
  }

  function renderDashboard() {
    var leads = AmaralStore.getLeads();
    var st = stages();
    var byStage = {};
    st.forEach(function (s) { byStage[s.id] = 0; });
    var bySource = {};
    var closed = 0;
    leads.forEach(function (l) {
      byStage[l.stage] = (byStage[l.stage] || 0) + 1;
      if (l.stage === 'fechado') closed++;
      var src = sourceOf(l);
      bySource[src] = (bySource[src] || 0) + 1;
    });
    var weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
    var week = leads.filter(function (l) { return new Date(l.createdAt).getTime() >= weekAgo; }).length;

    document.getElementById('statGrid').innerHTML = [
      { lbl: 'Total de leads', num: leads.length },
      { lbl: 'Novos', num: byStage.novo || 0 },
      { lbl: 'Últimos 7 dias', num: week },
      { lbl: 'Fechados', num: closed }
    ].map(function (s) {
      return '<div class="stat"><div class="lbl">' + s.lbl + '</div><div class="num">' + s.num + '</div></div>';
    }).join('');

    var max = Math.max.apply(null, Object.keys(byStage).map(function (k) { return byStage[k]; }).concat([1]));
    document.getElementById('stageBars').innerHTML = st.map(function (s) {
      var n = byStage[s.id] || 0;
      var pct = Math.round((n / max) * 100);
      return '<div class="bar-row"><span>' + s.label + '</span><div class="bar-track"><div class="bar-fill" style="width:' + pct + '%;background:' + s.color + '"></div></div><span>' + n + '</span></div>';
    }).join('');

    var srcKeys = Object.keys(bySource).sort(function (a, b) { return bySource[b] - bySource[a]; });
    document.getElementById('sourceList').innerHTML = srcKeys.length
      ? srcKeys.map(function (k) {
          return '<div class="source-row"><span>' + k + '</span><strong>' + bySource[k] + '</strong></div>';
        }).join('')
      : '<p class="empty">Nenhuma origem ainda.</p>';

    var recent = leads.slice().sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }).slice(0, 8);
    document.getElementById('recentTable').innerHTML = tableHtml(recent);
  }

  function tableHtml(list) {
    if (!list.length) return '<p class="empty">Nenhum lead.</p>';
    var stageMap = {};
    stages().forEach(function (s) { stageMap[s.id] = s.label; });
    var rows = list.map(function (l) {
      var t = attrTouch(l);
      return '<tr data-id="' + l.id + '">' +
        '<td><strong>' + esc(l.nome || '—') + '</strong><br><span style="color:var(--silver)">' + esc(l.empresa || '') + '</span></td>' +
        '<td>' + esc(stageMap[l.stage] || l.stage) + '</td>' +
        '<td>' + esc(sourceOf(l)) + '</td>' +
        '<td>' + esc(t.utm_campaign || '—') + '</td>' +
        '<td>' + fmtDate(l.createdAt) + '</td>' +
        '</tr>';
    }).join('');
    return '<table><thead><tr><th>Lead</th><th>Etapa</th><th>Origem</th><th>Campanha</th><th>Criado</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function filteredLeads(searchId, stageId, sourceId) {
    var q = (document.getElementById(searchId).value || '').toLowerCase().trim();
    var stage = stageId ? document.getElementById(stageId).value : '';
    var source = sourceId ? document.getElementById(sourceId).value : '';
    return AmaralStore.getLeads().filter(function (l) {
      if (stage && l.stage !== stage) return false;
      if (source && sourceOf(l) !== source) return false;
      if (!q) return true;
      var blob = [l.nome, l.empresa, l.email, l.whatsapp, l.segmento, l.desafio].join(' ').toLowerCase();
      return blob.indexOf(q) !== -1;
    });
  }

  function renderKanban() {
    var list = filteredLeads('kanbanSearch', null, 'kanbanSource');
    var board = document.getElementById('kanbanBoard');
    board.innerHTML = stages().map(function (s) {
      var cards = list.filter(function (l) { return l.stage === s.id; });
      var cardsHtml = cards.map(function (l) {
        var t = attrTouch(l);
        var tags = '';
        if (t.utm_source) tags += '<span class="tag">' + esc(t.utm_source) + '</span>';
        if (t.utm_campaign) tags += '<span class="tag">' + esc(t.utm_campaign) + '</span>';
        return '<article class="card" draggable="true" data-id="' + l.id + '">' +
          '<h4>' + esc(l.nome || 'Sem nome') + '</h4>' +
          '<div class="meta">' + esc(l.empresa || '—') + '<br>' + esc(l.whatsapp || '') + '</div>' +
          (tags ? '<div class="tags">' + tags + '</div>' : '') +
          '</article>';
      }).join('');
      return '<div class="col" data-stage="' + s.id + '">' +
        '<div class="col-head"><span><span class="dot" style="background:' + s.color + '"></span>' + esc(s.label) + '</span><span class="col-count">' + cards.length + '</span></div>' +
        '<div class="col-body" data-stage="' + s.id + '">' + (cardsHtml || '') + '</div></div>';
    }).join('');

    Array.prototype.forEach.call(board.querySelectorAll('.card'), function (card) {
      card.addEventListener('dragstart', function (e) {
        dragLeadId = card.getAttribute('data-id');
        card.classList.add('dragging');
        e.dataTransfer.setData('text/plain', dragLeadId);
        e.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', function () {
        card.classList.remove('dragging');
        dragLeadId = null;
        Array.prototype.forEach.call(board.querySelectorAll('.col-body'), function (b) {
          b.classList.remove('drag-over');
        });
      });
      card.addEventListener('click', function () {
        openDrawer(card.getAttribute('data-id'));
      });
    });

    Array.prototype.forEach.call(board.querySelectorAll('.col-body'), function (body) {
      body.addEventListener('dragover', function (e) {
        e.preventDefault();
        body.classList.add('drag-over');
      });
      body.addEventListener('dragleave', function () {
        body.classList.remove('drag-over');
      });
      body.addEventListener('drop', function (e) {
        e.preventDefault();
        body.classList.remove('drag-over');
        var id = e.dataTransfer.getData('text/plain') || dragLeadId;
        var stage = body.getAttribute('data-stage');
        if (!id || !stage) return;
        var lead = AmaralStore.getLead(id);
        if (!lead || lead.stage === stage) return;
        AmaralStore.moveLead(id, stage);
        renderAll();
      });
    });
  }

  function renderList() {
    var list = filteredLeads('listSearch', 'listStage', 'listSource');
    document.getElementById('leadsTable').innerHTML = tableHtml(list);
  }

  function bindTableClicks(rootId) {
    var root = document.getElementById(rootId);
    root.onclick = function (e) {
      var tr = e.target.closest('tr[data-id]');
      if (tr) openDrawer(tr.getAttribute('data-id'));
    };
  }

  function renderSettings() {
    var s = AmaralStore.getSettings();
    var form = document.getElementById('settingsForm');
    form.email.value = s.email || '';
    form.whatsapp.value = s.whatsapp || '';
    form.instagram.value = s.instagram || '';
    form.gtmId.value = s.gtmId || '';
    form.ga4Id.value = s.ga4Id || '';
    form.metaPixelId.value = s.metaPixelId || '';
    form.trackingEnabled.checked = !!s.trackingEnabled;
    form.trackingForceLocal.checked = !!s.trackingForceLocal;
  }

  function renderAll() {
    fillStageSelects();
    fillSourceFilters();
    renderDashboard();
    renderKanban();
    renderList();
    renderSettings();
    bindTableClicks('recentTable');
    bindTableClicks('leadsTable');
  }

  ['kanbanSearch', 'kanbanSource'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', renderKanban);
    document.getElementById(id).addEventListener('change', renderKanban);
  });
  ['listSearch', 'listStage', 'listSource'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', renderList);
    document.getElementById(id).addEventListener('change', renderList);
  });

  /* ─── Drawer ─── */
  var drawer = document.getElementById('leadDrawer');
  var leadForm = document.getElementById('leadFormAdmin');

  function openDrawer(id) {
    var lead = id ? AmaralStore.getLead(id) : null;
    fillStageSelects();
    if (!lead) {
      lead = {
        id: '',
        nome: '', whatsapp: '', email: '', empresa: '', segmento: '',
        investimento: '', site: '', desafio: '', notes: '', value: '',
        nextContactAt: '', stage: 'novo', attribution: null, history: []
      };
      document.getElementById('drawerTitle').textContent = 'Novo lead';
      document.getElementById('drawerSub').textContent = 'Cadastro manual';
    } else {
      document.getElementById('drawerTitle').textContent = lead.nome || 'Lead';
      document.getElementById('drawerSub').textContent = (lead.empresa || '—') + ' · ' + fmtDate(lead.createdAt);
    }
    leadForm.id.value = lead.id || '';
    leadForm.nome.value = lead.nome || '';
    leadForm.whatsapp.value = lead.whatsapp || '';
    leadForm.email.value = lead.email || '';
    leadForm.empresa.value = lead.empresa || '';
    leadForm.segmento.value = lead.segmento || '';
    leadForm.investimento.value = lead.investimento || '';
    leadForm.site.value = lead.site || '';
    leadForm.desafio.value = lead.desafio || '';
    leadForm.notes.value = lead.notes || '';
    leadForm.value.value = lead.value != null ? lead.value : '';
    leadForm.nextContactAt.value = lead.nextContactAt ? String(lead.nextContactAt).slice(0, 10) : '';
    leadForm.stage.value = lead.stage || 'novo';

    var t = attrTouch(lead);
    var first = (lead.attribution && lead.attribution.first) || {};
    var lines = [
      'Last touch:',
      '  utm_source: ' + (t.utm_source || '—'),
      '  utm_medium: ' + (t.utm_medium || '—'),
      '  utm_campaign: ' + (t.utm_campaign || '—'),
      '  utm_content: ' + (t.utm_content || '—'),
      '  utm_term: ' + (t.utm_term || '—'),
      '  gclid: ' + (t.gclid || '—'),
      '  fbclid: ' + (t.fbclid || '—'),
      '  referrer: ' + (t.referrer || '—'),
      '  landing: ' + (t.landingPage || '—'),
      '',
      'First touch source: ' + (first.utm_source || '—') + ' / ' + (first.utm_campaign || '—')
    ];
    document.getElementById('drawerAttr').textContent = lines.join('\n');

    var hist = (lead.history || []).slice().reverse();
    document.getElementById('drawerHistory').innerHTML = hist.length
      ? hist.map(function (h) {
          return '<div class="history-item"><time>' + fmtDate(h.at) + '</time>' + esc(h.text || h.type) + '</div>';
        }).join('')
      : '<div class="history-item">Sem histórico.</div>';

    var wpp = document.getElementById('drawerWpp');
    if (lead.whatsapp) {
      wpp.href = wppLink(lead.whatsapp, 'Olá ' + (lead.nome || '') + ', aqui é a amaral.ads.');
      wpp.removeAttribute('aria-disabled');
    } else {
      wpp.href = '#';
    }
    var mail = document.getElementById('drawerMail');
    mail.href = lead.email ? ('mailto:' + lead.email) : '#';

    drawer.hidden = false;
  }

  function closeDrawer() { drawer.hidden = true; }

  Array.prototype.forEach.call(drawer.querySelectorAll('[data-close]'), function (el) {
    el.addEventListener('click', closeDrawer);
  });

  document.getElementById('btnNewLead').addEventListener('click', function () {
    openDrawer(null);
  });

  leadForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var id = leadForm.id.value;
    var patch = {
      nome: leadForm.nome.value.trim(),
      whatsapp: leadForm.whatsapp.value.trim(),
      email: leadForm.email.value.trim(),
      empresa: leadForm.empresa.value.trim(),
      segmento: leadForm.segmento.value.trim(),
      investimento: leadForm.investimento.value.trim(),
      site: leadForm.site.value.trim(),
      desafio: leadForm.desafio.value.trim(),
      notes: leadForm.notes.value.trim(),
      value: leadForm.value.value ? Number(leadForm.value.value) : null,
      nextContactAt: leadForm.nextContactAt.value || null,
      stage: leadForm.stage.value
    };
    if (!id) {
      AmaralStore.createLead(Object.assign({ source: 'manual', attribution: AmaralStore.getAttribution() }, patch));
    } else {
      var prev = AmaralStore.getLead(id);
      if (prev && prev.stage !== patch.stage) {
        AmaralStore.moveLead(id, patch.stage, 'Etapa alterada no drawer');
      }
      AmaralStore.updateLead(id, patch);
    }
    closeDrawer();
    renderAll();
  });

  document.getElementById('drawerDelete').addEventListener('click', function () {
    var id = leadForm.id.value;
    if (!id) { closeDrawer(); return; }
    if (!confirm('Excluir este lead permanentemente?')) return;
    AmaralStore.deleteLead(id);
    closeDrawer();
    renderAll();
  });

  /* ─── Settings ─── */
  document.getElementById('settingsForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target;
    var gtm = f.gtmId.value.trim();
    var ga4 = f.ga4Id.value.trim();
    var pixel = f.metaPixelId.value.trim();
    if (gtm && !AmaralTracking.validGtm(gtm)) { alert('GTM inválido. Use o formato GTM-XXXXXXX.'); return; }
    if (ga4 && !AmaralTracking.validGa4(ga4)) { alert('GA4 inválido. Use o formato G-XXXXXXXX.'); return; }
    if (pixel && !AmaralTracking.validPixel(pixel)) { alert('Pixel inválido. Use apenas números.'); return; }
    AmaralStore.saveSettings({
      email: f.email.value.trim(),
      whatsapp: f.whatsapp.value.trim().replace(/\D/g, ''),
      instagram: f.instagram.value.trim(),
      gtmId: gtm,
      ga4Id: ga4,
      metaPixelId: pixel,
      trackingEnabled: f.trackingEnabled.checked,
      trackingForceLocal: f.trackingForceLocal.checked
    });
    var msg = document.getElementById('settingsSaved');
    msg.hidden = false;
    setTimeout(function () { msg.hidden = true; }, 1800);
    AmaralTracking.init();
  });

  document.getElementById('btnDiagnose').addEventListener('click', function () {
    AmaralTracking.init();
    document.getElementById('trackingDiag').textContent = JSON.stringify(AmaralTracking.diagnose(), null, 2);
  });

  /* ─── Export / Import / Reset ─── */
  function download(filename, content, type) {
    var blob = new Blob([content], { type: type || 'text/plain' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  document.getElementById('btnExportJson').addEventListener('click', function () {
    download('amaral-leads-backup.json', JSON.stringify(AmaralStore.exportJSON(), null, 2), 'application/json');
  });
  document.getElementById('btnExportCsv').addEventListener('click', function () {
    download('amaral-leads.csv', AmaralStore.exportCSV(), 'text/csv');
  });

  document.getElementById('btnImportJson').addEventListener('click', function () {
    document.getElementById('importFile').click();
  });
  document.getElementById('importFile').addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (!confirm('Importar backup? Isso substitui leads/configurações locais.')) return;
        AmaralStore.importJSON(data);
        renderAll();
        alert('Backup importado.');
      } catch (err) {
        alert('Arquivo inválido: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  document.getElementById('btnReset').addEventListener('click', function () {
    var phrase = prompt('Digite RESETAR para apagar todos os leads e configurações locais:');
    if (phrase == null) return;
    try {
      AmaralStore.resetAll(phrase);
      renderAll();
      alert('Dados locais apagados.');
    } catch (err) {
      alert(err.message);
    }
  });
})();
