// ══════════════════════════════════════════════════════════
//  GUILDAUDIT — render.js
// ══════════════════════════════════════════════════════════

function cid(c) { return c.name + '|' + c.realm; }

function ilvlC(v) {
  if (!v) return 'ib';
  if (v >= 284) return 'ie';
  if (v >= 271) return 'io';
  if (v >= 258) return 'iw';
  if (v >= 245) return 'ig';
  if (v >= 232) return 'iv';
  return 'ib';
}

function qClass(q) { return { common: 'q-c', uncommon: 'q-u', rare: 'q-r', epic: 'q-e', legendary: 'q-l' }[q] || 'q-c'; }
function whDomain() { return window._lang === 'pt-BR' ? 'pt.wowhead.com' : 'www.wowhead.com'; }

function ratingCol(r) {
  if (!r) return 'var(--text-dim)';
  if (r >= 2500) return '#ff8800';
  if (r >= 2000) return '#a335ee';
  if (r >= 1500) return '#0070dd';
  if (r >= 1000) return '#4caf50';
  return 'var(--text-dim)';
}
function ratingTier(r) {
  if (!r) return '—';
  if (r >= 2500) return 'Keystone Hero';
  if (r >= 2000) return 'Keystone Master';
  if (r >= 1500) return 'Keystone Conqueror';
  if (r >= 1000) return 'Keystone Challenger';
  return 'Active';
}
function fmtVault(c) { var v = c.vault; if (!v) return '—'; return 'M+:' + (v.mythic || 0) + ' R:' + (v.raid || 0); }
function sth(k, l) { var d = sortC === k ? (sortD === -1 ? 'sd' : 'sa') : ''; return '<th class="' + d + '" onclick="srt(\'' + k + '\')">' + l + '</th>'; }
function ovSth(k, l) { var d = ovSortC === k ? (ovSortD === -1 ? 'sd' : 'sa') : ''; return '<th class="' + d + '" onclick="ovSrt(\'' + k + '\')">' + l + '</th>'; }

function relativeTime(isoStr) {
  if (!isoStr) return '—';
  var diff = Date.now() - new Date(isoStr).getTime();
  var mins = Math.floor(diff / 60000);
  if (mins < 1) return T('now');
  if (mins < 60) return mins + T('ago_min');
  var hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + T('ago_h');
  var days = Math.floor(hrs / 24);
  return days + T('ago_d');
}

function hasPerm(level) {
  var p = window._perm || 'guest';
  if (level === 'admin') return p === 'admin';
  if (level === 'officer') return p === 'admin' || p === 'officer';
  return true;
}

var PT_CLASS = { 'Warrior': 'Guerreiro', 'Paladin': 'Paladino', 'Hunter': 'Caçador', 'Rogue': 'Ladino', 'Priest': 'Sacerdote', 'Death Knight': 'Cavaleiro da Morte', 'Shaman': 'Xamã', 'Mage': 'Mago', 'Warlock': 'Bruxo', 'Monk': 'Monge', 'Druid': 'Druida', 'Demon Hunter': 'Caçador de Demônios', 'Evoker': 'Conjurante', 'Devourer': 'Devorador' };
var PT_SPEC = { 'Blood': 'Sangue', 'Frost DK': 'Gélido (DK)', 'Unholy': 'Profano', 'Havoc': 'Devastação', 'Vengeance': 'Vingança', 'Balance': 'Equilíbrio', 'Feral': 'Feral', 'Guardian': 'Guardião', 'Restoration': 'Restauração', 'Devastation': 'Devastação', 'Preservation': 'Preservação', 'Augmentation': 'Aprimoramento', 'Beast Mastery': 'Domínio das Feras', 'Marksmanship': 'Precisão', 'Survival': 'Sobrevivência', 'Arcane': 'Arcano', 'Fire': 'Fogo', 'Frost': 'Gélido', 'Brewmaster': 'Mestre Cervejeiro', 'Mistweaver': 'Tecelão da Névoa', 'Windwalker': 'Andarilho do Vento', 'Holy': 'Sagrado', 'Protection': 'Proteção', 'Retribution': 'Retribuição', 'Discipline': 'Disciplina', 'Shadow': 'Sombra', 'Assassination': 'Assassinato', 'Outlaw': 'Fora da Lei', 'Subtlety': 'Subterfúgio', 'Elemental': 'Elemental', 'Enhancement': 'Aperfeiçoamento', 'Affliction': 'Suplício', 'Demonology': 'Demonologia', 'Destruction': 'Destruição', 'Arms': 'Armas', 'Fury': 'Fúria', 'Soulrend': 'Dilaceralma', 'Fleshcraft': 'Modelar Carne', 'Devourer': 'Devorador' };

var PT_ARMOR = { 'Cloth': 'Tecido', 'Leather': 'Couro', 'Mail': 'Malha', 'Plate': 'Placa' };

function locClass(c) { return window._lang === 'pt-BR' ? (PT_CLASS[c] || c) : c; }
function locSpec(s) { return window._lang === 'pt-BR' ? (PT_SPEC[s] || s) : s; }
function locArmor(a) { return window._lang === 'pt-BR' ? (PT_ARMOR[a] || a) : a; }

function translateIssue(raw) {
  if (typeof raw === 'string') {
    if (raw === 'embellishment:none') return T('emb_none');
    if (raw === 'embellishment:only_one') return T('emb_one');
    if (raw.startsWith('tierset:')) {
      var tp = raw.split(':');
      var have = tp[1]; var missing = tp[2] || '0';
      return T('tierset_missing').replace('{n}', have).replace('{have}', missing);
    }
    if (raw.includes(':')) {
      var parts = raw.split(':');
      var slot = parts[0]; var key = parts[1];
      var countInfo = parts[2] ? ' (' + parts[2].replace('_', '/') + ')' : '';
      return slotLabel(slot) + ': ' + T(key) + countInfo;
    }
  }
  return raw;
}

// ── Tier piece cell ─────────────────────────────────────
// Shows all 5 tier slots as small pips. Lit = has tier piece (color = quality).
// Empty = dim dot. Tooltip on hover shows slot + quality.
function tierPiecesCell(c) {
  var gear = c.gear || {};
  var isPT = (window._lang === 'pt-BR');
  var QUALITY_COLOR = {
    mythic: 'var(--gold)', legendary: '#ff8000', epic: '#a335ee',
    rare: '#0070dd', uncommon: '#1eff00', common: 'var(--text-dim)',
  };
  var QUALITY_LABEL = isPT
    ? { mythic: 'Mítico', legendary: 'Lendário', epic: 'Heroico', rare: 'Normal', uncommon: 'Comum', common: 'Pobre' }
    : { mythic: 'Mythic', legendary: 'Legendary', epic: 'Heroic', rare: 'Normal', uncommon: 'Uncommon', common: 'Common' };
  var INITIALS_PT = { head: 'C', shoulder: 'O', chest: 'T', hands: 'M', legs: 'P' };
  var INITIALS_EN = { head: 'H', shoulder: 'S', chest: 'C', hands: 'G', legs: 'L' };
  var initials = isPT ? INITIALS_PT : INITIALS_EN;
  var slots = ['head', 'shoulder', 'chest', 'hands', 'legs'];
  var bits = slots.map(function(slot) {
    var item = gear[slot];
    if (item && item.isTierSet) {
      var col = QUALITY_COLOR[item.quality] || QUALITY_COLOR.epic;
      var qualLabel = QUALITY_LABEL[item.quality] || item.quality || '?';
      var tipText = slotLabel(slot) + ' — Tier ' + qualLabel;
      return '<span class="tier-pip" style="--pip-col:' + col + '" data-tip="' + tipText + '">' + initials[slot] + '</span>';
    }
    return '<span class="tier-pip tier-pip--empty">·</span>';
  });
  return '<div class="tier-cell">' + bits.join('') + '</div>';
}

function applyI18n() {
  var map = {
    't-refresh': 'refresh', 't-export': 'export_btn', 't-import': 'import_btn',
    't-overview': 'overview', 't-roster': 'roster', 't-vault': 'great_vault', 't-settings': 'settings',
    't-back': 'back_btn',
    't-show-issues': 'show_issues', 't-show-vault': 'show_vault', 't-show-rating': 'show_rating',
    't-show-notes': 'show_notes', 't-show-tier': 'show_tier', 't-auto-refresh': 'auto_refresh',
    'sl-members': 'members', 'sl-avgilvl': 'avg_ilvl', 'sl-maxilvl': 'max_ilvl',
    'sl-ready': 'ready', 'sl-issues': 'issues', 'sl-missing': 'missing',
    'ss-raiders': 'raiders', 'ss-equipped': 'equipped', 'ss-highest': 'highest',
    'ss-noissues': 'no_issues', 'ss-problems': 'with_problems', 'ss-enchgems': 'enchants_gems',
    'st-ranking': 'ranking_by_ilvl',
    'sc-display': 'display', 'sc-api': 'api_blizzard', 'sc-data': 'data', 'lbl-lang': 'display_language',
    'lbl-ilvl-min': 'ilvl_min',
  };
  for (var cls in map) {
    var els = document.querySelectorAll('.' + cls);
    els.forEach(function (el) { el.textContent = T(map[cls]); });
    var el = document.getElementById(cls);
    if (el) el.textContent = T(map[cls]);
  }
  var srch = document.getElementById('srch');
  if (srch) srch.placeholder = T('search');
}

function cnCell(c) {
  var _cfg  = getAPICfg();
  var _gp   = _cfg.region + '/' + _cfg.realm + '/' + _cfg.guild;
  var href  = 'char.html?name=' + encodeURIComponent(c.name) + '&realm=' + encodeURIComponent(c.realm || 'azralon') + '&guild=' + _gp;
  return '<a class="cn" href="' + href + '"><img src="' + getClassIcon(c.class) + '" onerror="this.style.display=\'none\'" alt="">' +
    '<div><span class="cn-name" style="color:' + getClassColor(c.class) + '">' + esc(c.name) + '</span>' +
    '<span class="cn-realm">' + esc(c.realm || '') + '</span>' +
    '<div class="cn-spec">' + locSpec(c.spec || '') + '</div></div></a>';
}

function roleBadge(r) {
  var cls = { Tank: 'rb-tank', Healer: 'rb-heal', 'DPS Melee': 'rb-mdps', 'DPS Ranged': 'rb-rdps' };
  return '<span class="rb ' + (cls[r] || 'rb-mdps') + '">' + r + '</span>';
}

function updateStats() {
  if (!roster.length) return;
  var ilvls = roster.map(function (c) { return c.ilvl || 0; }).filter(Boolean);
  document.getElementById('st-t').textContent = roster.length;
  document.getElementById('st-a').textContent = ilvls.length ? (ilvls.reduce(function (a, b) { return a + b; }, 0) / ilvls.length).toFixed(1) : '—';
  document.getElementById('st-m').textContent = ilvls.length ? Math.max.apply(null, ilvls) : '—';
  var issCount = roster.filter(function (c) { return c.issues?.length > 0; }).length;
  document.getElementById('st-r').textContent = roster.length - issCount;
  document.getElementById('st-i').textContent = issCount;
  document.getElementById('st-e').textContent = roster.reduce(function (s, c) { return s + (c.issues?.length || 0); }, 0);
}

function renderComp() {
  var el = document.getElementById('compGrid');
  if (!roster.length) { el.innerHTML = ''; return; }
  var groups = {};
  groups[ROLE_TANK] = roster.filter(function (c) { return c.role === ROLE_TANK; });
  groups[ROLE_HEALER] = roster.filter(function (c) { return c.role === ROLE_HEALER; });
  groups[ROLE_DPS_RANGE] = roster.filter(function (c) { return c.role === ROLE_DPS_RANGE; });
  groups[ROLE_DPS_MELEE] = roster.filter(function (c) { return c.role === ROLE_DPS_MELEE; });
  function mkList(arr, titleKey, emoji) {
    var col1 = [], col2 = [];
    arr.forEach(function (c, i) { if (i % 2 === 0) col1.push(c); else col2.push(c); });
    function mkCol(col) { return col.map(function (c) { var _cfg2 = getAPICfg(); var href = 'char.html?name=' + encodeURIComponent(c.name) + '&realm=' + encodeURIComponent(c.realm || 'azralon') + '&guild=' + _cfg2.region + '/' + _cfg2.realm + '/' + _cfg2.guild; return '<a class="comp-name-row" href="' + href + '" title="' + (c.realm || '') + '" style="text-decoration:none"><img src="' + getClassIcon(c.class) + '" style="width:14px;height:14px;border-radius:3px;flex-shrink:0" onerror="this.style.display=\'none\'" alt=""><span style="color:' + getClassColor(c.class) + ';cursor:pointer;font-size:.85rem;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(c.name) + '</span></a>'; }).join(''); }
    return '<div class="comp-card"><div class="comp-title">' + emoji + ' ' + T(titleKey) + ' <span style="color:var(--gold-light)">(' + arr.length + ')</span></div>' + (arr.length ? '<div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 8px">' + mkCol(col1) + mkCol(col2) + '</div>' : '<div style="color:var(--text-dim);font-size:.8rem;padding:4px 0">' + T('none') + '</div>') + '</div>';
  }
  el.innerHTML = mkList(groups[ROLE_TANK], 'tanks', '🛡') + mkList(groups[ROLE_HEALER], 'healers', '💚') + mkList(groups[ROLE_DPS_RANGE], 'ranged', '🏹') + mkList(groups[ROLE_DPS_MELEE], 'melee', '⚔️');
}

function renderRosterComp() {
  var el = document.getElementById('rosterCompGrid');
  if (!el) return;
  var clsCnt = {}; ALL_CLASSES.forEach(function (c) { clsCnt[c] = 0; });
  roster.forEach(function (c) { var n = normalizeClass(c.class); if (clsCnt[n] !== undefined) clsCnt[n]++; });
  var armCnt = { Cloth: 0, Leather: 0, Mail: 0, Plate: 0 };
  roster.forEach(function (c) { var a = getArmorType(c.class); if (armCnt[a] !== undefined) armCnt[a]++; });
  var roles = {};
  roles[ROLE_TANK] = roster.filter(function (c) { return c.role === ROLE_TANK; }).length;
  roles[ROLE_HEALER] = roster.filter(function (c) { return c.role === ROLE_HEALER; }).length;
  roles[ROLE_DPS_RANGE] = roster.filter(function (c) { return c.role === ROLE_DPS_RANGE; }).length;
  roles[ROLE_DPS_MELEE] = roster.filter(function (c) { return c.role === ROLE_DPS_MELEE; }).length;
  var clsCol1 = [], clsCol2 = [];
  ALL_CLASSES.forEach(function (cls, i) { if (i % 2 === 0) clsCol1.push(cls); else clsCol2.push(cls); });
  function mkClsCol(col) {
    return col.map(function (cls) {
      var n = clsCnt[cls];
      return '<div class="comp-row" style="' + (n === 0 ? 'opacity:.35' : '') + '"><img src="' + getClassIcon(cls) + '" style="width:14px;height:14px;border-radius:3px;flex-shrink:0" onerror="this.style.display=\'none\'" alt=""><span class="comp-name" style="color:' + getClassColor(cls) + '">' + locClass(cls) + '</span><span class="comp-val" style="' + (n === 0 ? 'color:var(--text-dim)' : '') + '">' + n + '</span></div>';
    }).join('');
  }
  el.innerHTML =
    '<div class="comp-card"><div class="comp-title">' + T('role') + '</div>' +
    Object.entries(roles).map(function (e) { return '<div class="comp-row"><span class="comp-name">' + e[0] + '</span><span class="comp-val">' + e[1] + '</span></div>'; }).join('') + '</div>' +
    '<div class="comp-card"><div class="comp-title">' + T('armor') + '</div>' +
    Object.entries(armCnt).map(function (e) { return '<div class="comp-row"><span class="comp-name">' + locArmor(e[0]) + '</span><span class="comp-val">' + e[1] + '</span></div>'; }).join('') + '</div>' +
    '<div class="comp-card" style="min-width:300px"><div class="comp-title">' + T('classes') + '</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:0 10px">' + mkClsCol(clsCol1) + mkClsCol(clsCol2) + '</div></div>';
}

function renderOverview() {
  var data = roster.slice();
  data.sort(function (a, b) {
    var av, bv;
    if (ovSortC === 'ilvl' || ovSortC === 'mythicRating') { av = a[ovSortC] || 0; bv = b[ovSortC] || 0; }
    else if (ovSortC === 'issues') { av = a.issues?.length || 0; bv = b.issues?.length || 0; }
    else { av = (a[ovSortC] || '').toString().toLowerCase(); bv = (b[ovSortC] || '').toString().toLowerCase(); }
    return av < bv ? -ovSortD : av > bv ? ovSortD : 0;
  });
  var el = document.getElementById('ovTable');
  if (!data.length) { el.innerHTML = '<div class="empty"><div class="empty-i">⚔️</div><div class="empty-t">' + T('no_data') + '</div><div class="empty-s">' + T('import_or_demo') + '</div></div>'; return; }
  var isTh  = CFG.si ? ovSth('issues', T('issues')) : '';
  var vTh   = CFG.sv ? '<th>' + T('vault') + '</th>' : '';
  var rTh   = CFG.sr ? ovSth('mythicRating', T('m_rating')) : '';
  var nTh   = CFG.sn ? '<th>' + T('note') + '</th>' : '';
  var stTh  = CFG.st ? '<th title="Head · Shoulder · Chest · Gloves · Legs">' + T('tier_pieces') + '</th>' : '';
  var rmTh  = hasPerm('officer') ? '<th></th>' : '';
  var minIlvl = CFG.ilvlMin || 0;
  var rows = data.map(function (c, i) {
    var id = cid(c);
    var isUnder = minIlvl > 0 && (c.ilvl || 0) < minIlvl;
    var isTd  = CFG.si ? '<td>' + (c.issues?.length ? '<span style="color:var(--red);font-weight:600">' + c.issues.length + '</span>' : '<span class="it it-ok">✓</span>') + '</td>' : '';
    var vTd   = CFG.sv ? '<td style="color:var(--text-dim)">' + fmtVault(c) + '</td>' : '';
    var rTd   = CFG.sr ? '<td><span style="font-weight:700;color:' + ratingCol(c.mythicRating) + '">' + (c.mythicRating || '—') + '</span></td>' : '';
    var nTd   = CFG.sn ? '<td><span class="note-c" onclick="editNote(\'' + id + '\')">' + (c.note ? esc(c.note) : '<span style="opacity:.3">+</span>') + '</span></td>' : '';
    var stTd  = CFG.st ? '<td>' + tierPiecesCell(c) + '</td>' : '';
    var rmTd  = hasPerm('officer') ? '<td><button class="btn btn-danger btn-sm" onclick="rmMember(\'' + id + '\')">✕</button></td>' : '';
    return '<tr' + (isUnder ? ' class="row-under-min"' : '') + '><td style="color:var(--text-dim);width:35px">' + (i + 1) + '</td><td>' + cnCell(c) + '</td><td>' + roleBadge(c.role) + '</td><td><span class="ilvl ' + ilvlC(c.ilvl) + '">' + (c.ilvl || '—') + '</span></td>' + isTd + vTd + rTd + stTd + nTd + rmTd + '</tr>';
  }).join('');
  el.innerHTML = '<table><thead><tr><th>#</th>' + ovSth('name', T('character')) + ovSth('role', T('role')) + ovSth('ilvl', T('ilvl')) + isTh + vTh + rTh + stTh + nTh + rmTh + '</tr></thead><tbody>' + rows + '</tbody></table>';
}

function renderRoster() {
  renderRosterComp();
  var q = (document.getElementById('srch')?.value || '').toLowerCase();
  var filtered = roster.filter(function (c) {
    if (q && c.name.toLowerCase().indexOf(q) === -1 && (c.realm || '').toLowerCase().indexOf(q) === -1 && (c.class || '').toLowerCase().indexOf(q) === -1 && (c.spec || '').toLowerCase().indexOf(q) === -1) return false;
    return true;
  });
  filtered.sort(function (a, b) {
    var av, bv;
    if (sortC === 'ilvl' || sortC === 'mythicRating') { av = a[sortC] || 0; bv = b[sortC] || 0; }
    else if (sortC === 'issues') { av = a.issues?.length || 0; bv = b.issues?.length || 0; }
    else { av = (a[sortC] || '').toString().toLowerCase(); bv = (b[sortC] || '').toString().toLowerCase(); }
    return av < bv ? -sortD : av > bv ? sortD : 0;
  });
  var el = document.getElementById('rosterTable');
  if (!filtered.length) { el.innerHTML = '<div class="empty"><div class="empty-i">👥</div><div class="empty-t">' + T('no_data') + '</div></div>'; return; }
  var isTh = CFG.si ? sth('issues', T('issues')) : '';
  var rTh  = CFG.sr ? sth('mythicRating', T('m_rating')) : '';
  var nTh  = CFG.sn ? sth('note', T('note')) : '';
  var stTh = CFG.st ? '<th title="Head · Shoulder · Chest · Gloves · Legs">' + T('tier_pieces') + '</th>' : '';
  var rmTh = hasPerm('officer') ? '<th></th>' : '';
  var canEditRole = hasPerm('officer');
  var minIlvl = CFG.ilvlMin || 0;
  var rows = filtered.map(function (c) {
    var id = cid(c);
    var isUnder = minIlvl > 0 && (c.ilvl || 0) < minIlvl;
    var isTd = CFG.si ? '<td><div style="display:flex;flex-wrap:wrap;gap:3px">' + (c.issues?.length ? c.issues.slice(0, 2).map(function (i) { var t = translateIssue(i); var short = (i.includes(':') && !i.startsWith('embellishment:') && !i.startsWith('tierset:')) ? t.replace(/.*: /, '') : t; return '<span class="it it-e">' + short + '</span>'; }).join('') + (c.issues.length > 2 ? '<span class="it" style="color:var(--text-dim);border:1px solid var(--border)">+' + (c.issues.length - 2) + '</span>' : '') : '<span class="it it-ok">✓</span>') + '</div></td>' : '';
    var rTd  = CFG.sr ? '<td><span style="font-weight:700;color:' + ratingCol(c.mythicRating) + '">' + (c.mythicRating || '—') + '</span></td>' : '';
    var nTd  = CFG.sn ? '<td><span class="note-c" onclick="editNote(\'' + id + '\')">' + (c.note ? esc(c.note) : '<span style="opacity:.3">+</span>') + '</span></td>' : '';
    var stTd = CFG.st ? '<td>' + tierPiecesCell(c) + '</td>' : '';
    var roleCell = canEditRole
      ? '<select class="rs" onchange="changeRole(\'' + id + '\',this.value)"><option ' + (c.role === ROLE_TANK ? 'selected' : '') + '>Tank</option><option ' + (c.role === ROLE_HEALER ? 'selected' : '') + '>Healer</option><option ' + (c.role === ROLE_DPS_MELEE ? 'selected' : '') + '>DPS Melee</option><option ' + (c.role === ROLE_DPS_RANGE ? 'selected' : '') + '>DPS Ranged</option></select>'
      : roleBadge(c.role);
    var rmTd = hasPerm('officer') ? '<td><button class="btn btn-danger btn-sm" onclick="rmMember(\'' + id + '\')">✕</button></td>' : '';
    return '<tr' + (isUnder ? ' class="row-under-min"' : '') + '><td>' + cnCell(c) + '</td><td>' + roleCell + '</td><td><span class="ilvl ' + ilvlC(c.ilvl) + '">' + (c.ilvl || '—') + '</span></td>' + isTd + rTd + stTd + nTd + rmTd + '</tr>';
  }).join('');
  el.innerHTML = '<table><thead><tr>' + sth('name', T('character')) + sth('role', T('role')) + sth('ilvl', T('ilvl')) + isTh + rTh + stTh + nTh + rmTh + '</tr></thead><tbody>' + rows + '</tbody></table>';
}

function renderVault() {
  var el = document.getElementById('vaultTable');
  if (!roster.length) { el.innerHTML = '<div class="empty"><div class="empty-i">🏆</div><div class="empty-t">' + T('no_data') + '</div></div>'; return; }
  var sorted = roster.slice().sort(function (a, b) { return (b.ilvl || 0) - (a.ilvl || 0); });
  var rows = sorted.map(function (c) {
    var v = c.vault || {};
    return '<tr><td>' + cnCell(c) + '</td><td><span class="ilvl ' + ilvlC(c.ilvl) + '">' + (c.ilvl || '—') + '</span></td><td style="color:var(--text-dim)">' + (v.mythic || 0) + '/8</td><td style="color:var(--text-dim)">' + (v.raid || 0) + '/10</td></tr>';
  }).join('');
  el.innerHTML = '<table><thead><tr><th>' + T('character') + '</th><th>' + T('ilvl') + '</th><th>M+ Runs</th><th>Raid Bosses</th></tr></thead><tbody>' + rows + '</tbody></table>';
}

function buildWHData(item, charData) {
  if (!item.itemId) return '';
  var parts = ['item=' + item.itemId];
  if (item.ilvl) parts.push('ilvl=' + item.ilvl);
  if (item.enchantIds?.length) parts.push('ench=' + item.enchantIds[0]);
  if (item.gemIds?.length) parts.push('gems=' + item.gemIds.join(':'));
  if (item.bonusIds?.length) parts.push('bonus=' + item.bonusIds.join(':'));

  if (charData && charData.gear) {
    var pcs = [];
    for (var s in charData.gear) {
      if (charData.gear[s] && charData.gear[s].itemId) {
        pcs.push(charData.gear[s].itemId);
      }
    }
    if (pcs.length > 0) parts.push('pcs=' + pcs.join(':'));
  }

  return parts.join('&');
}

function refreshWowheadTooltips() {
  if (typeof $WowheadPower !== 'undefined' && $WowheadPower.refreshLinks) {
    $WowheadPower.refreshLinks();
  }
  if (!window._whMouseBound) {
    window._whMouseBound = true;
    document.addEventListener('mousemove', function (e) {
      var tts = document.querySelectorAll('.wowhead-tooltip');
      tts.forEach(function (tt) {
        if (!tt || tt.style.display === 'none' || tt.style.visibility === 'hidden') return;
        var x = e.clientX + 18, y = e.clientY + 18;
        var w = tt.offsetWidth, h = tt.offsetHeight;
        if (x + w > window.innerWidth) x = e.clientX - w - 10;
        if (y + h > window.innerHeight) y = e.clientY - h - 10;
        if (x < 0) x = 5;
        if (y < 0) y = 5;
        tt.style.position = 'fixed';
        tt.style.left = x + 'px';
        tt.style.top = y + 'px';
      });
    });
  }
}

function preloadImages(urls) {
  return Promise.all(urls.map(function (u) {
    return new Promise(function (r) { var img = new Image(); img.onload = img.onerror = function () { r(); }; img.src = u; setTimeout(r, 2000); });
  }));
}

function exportCSV() {
  if (!roster.length) { notify(T('no_data')); return; }
  var lines = ['\uFEFF' + [T('character'), 'Realm', T('role'), T('spec'), T('ilvl'), T('m_rating'), T('issues'), T('note')].join(',')];
  roster.forEach(function (c) {
    lines.push(['"' + c.name + '"', '"' + (c.realm || '') + '"', '"' + c.role + '"', '"' + (c.spec || '') + '"', c.ilvl || '', c.mythicRating || '', c.issues?.length || 0, '"' + (c.note || '') + '"'].join(','));
  });
  var b = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'guildaudit.csv'; a.click();
}

var _rosterDebounce = null;
function debouncedRoster() { clearTimeout(_rosterDebounce); _rosterDebounce = setTimeout(renderRoster, 200); }

function renderAll() {
  updateStats(); renderComp(); renderOverview(); renderRoster(); renderVault();
  if (roster.length) {
    var g = roster[0];
    var hmeta = document.getElementById('hmeta');
    var rts   = document.getElementById('rts');
    if (hmeta) hmeta.textContent = roster.length + ' ' + T('members');
    if (rts)   rts.textContent   = relativeTime(g.lastUpdated);
  }
  // Guild title is set by app.js init() from URL params — don't overwrite here
}
