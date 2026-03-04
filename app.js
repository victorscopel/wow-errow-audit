// ══════════════════════════════════════════════════════════
//  GUILDAUDIT — app.js
//  State, initialization, navigation, user actions
// ══════════════════════════════════════════════════════════

// ── State ─────────────────────────────────────────────────
var roster = [];
var CFG = { si: true, sv: true, sr: true, sn: true, ar: true, ilvlMin: 0, archon: "" };
window._lang = localStorage.getItem('ga_lang') || 'pt-BR';
var sortC = 'ilvl', sortD = -1;
var ovSortC = 'ilvl', ovSortD = -1;
var arTimer = null;
var prevPage = 'overview';

// ── Storage helpers ───────────────────────────────────────
function ls(k) { return localStorage.getItem(k); }
function lss(k, v) { localStorage.setItem(k, v); }
function saveRoster() {
    var o = ls('ga_data') || '[]';
    var n = JSON.stringify(roster);
    if (o !== n) {
        lss('ga_data', n);
        if (typeof startSyncRoster !== 'undefined') startSyncRoster();
    }
}

// ── API logger ────────────────────────────────────────────
var alog = [];
function lg(msg, type) {
    type = type || 'info';
    alog.push({ msg: msg, type: type });
    var el = document.getElementById('alog');
    if (el) {
        el.innerHTML = alog.slice(-40).map(function (l) { return '<div class="l' + l.type + '">' + l.msg + '</div>'; }).join('');
        el.scrollTop = el.scrollHeight;
    }
}
function sprog(p) { var el = document.getElementById('aprog'); if (el) el.style.width = p + '%'; }

// ── Locales ───────────────────────────────────────────────
function saveLang() {
    var dlEl = document.getElementById('cfg-dispLang');
    if (dlEl) {
        window._lang = dlEl.value;
        localStorage.setItem('ga_lang', window._lang);
    }
}

function T(k) {
    var l = window._lang === 'pt-BR' ? 'pt_BR' : 'en';
    if (I18N[k]) return I18N[k][l] || I18N[k]['en'] || k;
    return k;
}

// ── Init ──────────────────────────────────────────────────
function init() {
    initAuth();

    var sd = ls('ga_data');
    if (sd) try { roster = JSON.parse(sd); } catch (e) { }

    var sc = ls('ga_cfg');
    if (sc) try { CFG = Object.assign({}, CFG, JSON.parse(sc)); } catch (e) { }
    ['si', 'sv', 'sr', 'sn', 'ar'].forEach(function (k) {
        var el = document.getElementById('cfg-' + k);
        if (el) el.checked = CFG[k];
    });
    var imEl = document.getElementById('cfg-ilvlMin');
    if (imEl) imEl.value = CFG.ilvlMin || 0;
    var archonEl = document.getElementById('cfg-archon');
    if (archonEl) archonEl.value = CFG.archon || '';
    var dlEl = document.getElementById('cfg-dispLang');
    if (dlEl) dlEl.value = window._lang;

    var sa = ls('ga_api');
    if (sa) {
        try {
            var a = JSON.parse(sa);
            ['proxy', 'reg', 'realm', 'guild'].forEach(function (k) {
                var el = document.getElementById('cfg-' + k);
                if (el && a[k]) el.value = a[k];
            });
            if (a.realm) document.getElementById('imp-realm').value = a.realm;
            if (a.guild) document.getElementById('imp-guild').value = a.guild;
        } catch (e) { }
    }

    applyI18n();
    renderAll();
    setupAR();
    refreshWowheadTooltips();

    if (hasAPICfg()) {
        if (typeof loadBackendRoster !== 'undefined') loadBackendRoster();
        if (typeof loadBackendCfg !== 'undefined') loadBackendCfg();
        if (typeof loadRaidZones !== 'undefined') loadRaidZones();
    }

    if (CFG.ar && hasAPICfg() && roster.length && hasPerm('officer')) {
        setTimeout(function () { refreshExisting(); }, 2000);
    }
}

function saveCfg() {
    var oc = JSON.stringify(CFG);
    ['si', 'sv', 'sr', 'sn', 'ar'].forEach(function (k) { CFG[k] = document.getElementById('cfg-' + k)?.checked || false; });
    CFG.ilvlMin = parseInt(document.getElementById('cfg-ilvlMin')?.value) || 0;
    var archonEl = document.getElementById('cfg-archon');
    if (archonEl) CFG.archon = archonEl.value.trim();
    var nc = JSON.stringify(CFG);
    lss('ga_cfg', nc);
    if (oc !== nc && typeof startSyncCfg !== 'undefined') startSyncCfg();
    setupAR();
}

function saveAPI() {
    var a = {};
    ['proxy', 'reg', 'realm', 'guild'].forEach(function (k) {
        a[k] = document.getElementById('cfg-' + k)?.value?.trim() || '';
    });
    a.loc = 'en_US';
    lss('ga_api', JSON.stringify(a));
    notify(T('save') + '!');
}

// ── Auto refresh ──────────────────────────────────────────
function setupAR() {
    clearInterval(arTimer);
    document.getElementById('rdot').classList.toggle('off', !CFG.ar);
    if (CFG.ar && hasPerm('officer')) {
        arTimer = setInterval(function () {
            if (hasAPICfg() && roster.length) refreshExisting();
        }, 15 * 60 * 1000);
    }
}

function forceRefresh() {
    if (!hasPerm('officer')) { notify(T('Sem permissão. Faça Login.')); return; }
    if (!hasAPICfg()) { openImport(); return; }
    if (!roster.length) { notify(T('no_data')); return; }
    refreshExisting(true);
}

// ── Navigation ────────────────────────────────────────────
function showPage(id, btn) {
    document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
    document.querySelectorAll('.nav-tab').forEach(function (t) { t.classList.remove('active'); });
    document.getElementById('page-' + id).classList.add('active');
    if (btn) btn.classList.add('active');
    prevPage = id;
}

function openChar(id) {
    var parts = id.split('|');
    var name = parts[0] || '';
    var realm = parts[1] || 'azralon';
    if (!name) return;
    window.location.href = 'char.html?name=' + encodeURIComponent(name) + '&realm=' + encodeURIComponent(realm);
}

// ── Member actions ────────────────────────────────────────
function srt(col) {
    if (sortC === col) sortD *= -1; else { sortC = col; sortD = -1; }
    renderRoster();
}

function ovSrt(col) {
    if (ovSortC === col) ovSortD *= -1; else { ovSortC = col; ovSortD = -1; }
    renderOverview();
}

function changeRole(id, role) {
    var c = roster.find(function (x) { return cid(x) === id; });
    if (c) { c.role = role; saveRoster(); updateStats(); renderComp(); renderOverview(); renderRoster(); }
}

function rmMember(id) {
    roster = roster.filter(function (x) { return cid(x) !== id; });
    saveRoster(); renderAll();
    notify('Membro removido.');
}

function editNote(id) {
    var c = roster.find(function (x) { return cid(x) === id; });
    if (!c) return;
    var n = prompt('Nota para ' + c.name + ':', c.note || '');
    if (n === null) return;
    c.note = n.trim();
    saveRoster(); renderAll();
}

// ── Manual add ────────────────────────────────────────────
function addManual() {
    var name = document.getElementById('m-n').value.trim();
    if (!name) { notify('Digite um nome.'); return; }
    var cls = document.getElementById('m-c').value;
    roster.push({
        name: name, realm: document.getElementById('m-r').value.trim(),
        class: cls,
        role: document.getElementById('m-ro').value,
        spec: document.getElementById('m-sp').value.trim(),
        ilvl: parseInt(document.getElementById('m-il').value) || null,
        note: document.getElementById('m-no').value.trim(),
        issues: [], gear: {},
        renderUrl: null,
        lastUpdated: new Date().toISOString(),
    });
    saveRoster(); renderAll(); notify(name + ' adicionado!');
    ['m-n', 'm-r', 'm-sp', 'm-il', 'm-no'].forEach(function (id) { document.getElementById(id).value = ''; });
}

// ── JSON export/import ────────────────────────────────────
function exportJSON() {
    if (!roster.length) { notify('Sem dados.'); return; }
    var b = new Blob([JSON.stringify(roster, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = 'guildaudit.json';
    a.click();
}

function importJSON() {
    try {
        var p = JSON.parse(document.getElementById('json-in').value);
        if (!Array.isArray(p)) { notify('Inválido.'); return; }
        roster = p; saveRoster(); renderAll();
        notify(p.length + ' membros importados.');
    } catch (e) { notify('JSON inválido.'); }
}

function clearAll() {
    if (!confirm('Limpar todos os dados?')) return;
    roster = []; saveRoster(); renderAll(); notify('Dados limpos.');
}

// ── Import modal ──────────────────────────────────────────
function openImport() {
    alog = [];
    var el = document.getElementById('alog');
    if (el) el.innerHTML = '';
    sprog(0);
    var a = JSON.parse(ls('ga_api') || '{}');
    if (a.realm) document.getElementById('imp-realm').value = a.realm;
    if (a.guild) document.getElementById('imp-guild').value = a.guild;
    document.getElementById('importMo').classList.add('open');
}
function closeMo(id) { document.getElementById(id).classList.remove('open'); }

// ── Notification ──────────────────────────────────────────
function notify(msg) {
    var el = document.getElementById('notif');
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(function () { el.classList.remove('show'); }, 3000);
}

// ── Demo data ─────────────────────────────────────────────
function loadDemo() {
    roster = [
        { name: 'Redtalon', realm: 'azralon', guild: 'Errow', class: 'Death Knight', spec: 'Blood', role: ROLE_TANK, specId: 250, ilvl: 648, mythicRating: 2840, issues: [], note: 'Main tank', gear: {}, vault: { mythic: 8, raid: 7, world: 3 }, renderUrl: null, lastUpdated: new Date().toISOString() },
        { name: 'Solarheal', realm: 'azralon', guild: 'Errow', class: 'Druid', spec: 'Restoration', role: ROLE_HEALER, specId: 105, ilvl: 645, mythicRating: 2210, issues: [], note: '', gear: {}, vault: { mythic: 6, raid: 10, world: 1 }, renderUrl: null, lastUpdated: new Date().toISOString() },
        { name: 'Aeerys', realm: 'azralon', guild: 'Errow', class: 'Mage', spec: 'Frost', role: ROLE_DPS_RANGE, specId: 64, ilvl: 641, mythicRating: 1980, issues: [], note: '', gear: {}, vault: { mythic: 4, raid: 7, world: 2 }, renderUrl: null, lastUpdated: new Date().toISOString() },
        { name: 'Doppel', realm: 'illidan', guild: 'Errow', class: 'Rogue', spec: 'Assassination', role: ROLE_DPS_MELEE, specId: 259, ilvl: 638, mythicRating: 1750, issues: [], note: 'Cross-realm', gear: {}, vault: { mythic: 3, raid: 5, world: 0 }, renderUrl: null, lastUpdated: new Date().toISOString() },
        { name: 'Zaag', realm: 'azralon', guild: 'Errow', class: 'Warrior', spec: 'Arms', role: ROLE_DPS_MELEE, specId: 71, ilvl: 635, mythicRating: 1600, issues: [], note: '', gear: {}, vault: { mythic: 2, raid: 3, world: 1 }, renderUrl: null, lastUpdated: new Date().toISOString() },
        { name: 'Ironshield', realm: 'azralon', guild: 'Errow', class: 'Paladin', spec: 'Protection', role: ROLE_TANK, specId: 66, ilvl: 633, mythicRating: 1500, issues: [], note: 'Off tank', gear: {}, vault: { mythic: 5, raid: 6, world: 2 }, renderUrl: null, lastUpdated: new Date().toISOString() },
        { name: 'Windrunner', realm: 'azralon', guild: 'Errow', class: 'Hunter', spec: 'Marksmanship', role: ROLE_DPS_RANGE, specId: 254, ilvl: 628, mythicRating: 1200, issues: [], note: '', gear: {}, vault: { mythic: 1, raid: 2, world: 0 }, renderUrl: null, lastUpdated: new Date().toISOString() },
        { name: 'Saturno', realm: 'azralon', guild: 'Errow', class: 'Shaman', spec: 'Restoration', role: ROLE_HEALER, specId: 264, ilvl: 624, mythicRating: 980, issues: [], note: '', gear: {}, vault: { mythic: 2, raid: 4, world: 1 }, renderUrl: null, lastUpdated: new Date().toISOString() },
        { name: 'Darkbrew', realm: 'silvermoon', guild: 'Errow', class: 'Monk', spec: 'Windwalker', role: ROLE_DPS_MELEE, specId: 269, ilvl: 631, mythicRating: 1100, issues: [], note: 'Cross-realm', gear: {}, vault: { mythic: 3, raid: 4, world: 1 }, renderUrl: null, lastUpdated: new Date().toISOString() },
        { name: 'Níghtwólf', realm: 'azralon', guild: 'Errow', class: 'Demon Hunter', spec: 'Havoc', role: ROLE_DPS_MELEE, specId: 577, ilvl: 615, mythicRating: 620, issues: [], note: 'Trial', gear: {}, vault: { mythic: 0, raid: 1, world: 0 }, renderUrl: null, lastUpdated: new Date().toISOString() },
        { name: 'Archontus', realm: 'nemesis', guild: 'Errow', class: 'Paladin', spec: 'Holy', role: ROLE_HEALER, specId: 65, ilvl: 619, mythicRating: 890, issues: [], note: 'Cross-realm', gear: {}, vault: { mythic: 1, raid: 3, world: 0 }, renderUrl: null, lastUpdated: new Date().toISOString() },
    ];
    saveRoster(); renderAll(); notify('Demo carregado!');
}

// ── Modal click outside ───────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.mo').forEach(function (el) {
        el.addEventListener('click', function (e) { if (e.target === el) el.classList.remove('open'); });
    });
    document.querySelectorAll('.nav-tab').forEach(function (btn, i) {
        var pages = ['overview', 'roster', 'vault', 'settings'];
        btn.dataset.page = pages[i] || '';
    });
    init();
});
