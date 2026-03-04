// ══════════════════════════════════════════════════════════
//  GUILDAUDIT — char.js
//  Standalone character page logic
// ══════════════════════════════════════════════════════════

var roster = [];
window._lang = localStorage.getItem('ga_lang') || 'pt-BR';

function T(k) {
    var l = window._lang === 'pt-BR' ? 'pt_BR' : 'en';
    if (I18N[k]) return I18N[k][l] || I18N[k]['en'] || k;
    return k;
}

function saveLang() {
    var sel = document.getElementById('cfg-dispLang');
    if (sel) { window._lang = sel.value; localStorage.setItem('ga_lang', window._lang); }
}

function goBack() { window.location.href = 'index.html'; }

function notify(msg) {
    var el = document.getElementById('notif');
    if (!el) return;
    el.textContent = msg; el.classList.add('show');
    setTimeout(function () { el.classList.remove('show'); }, 3000);
}

function buildSidebar(c, id) {
    var color = getClassColor(c.class);
    var icon = getClassIcon(c.class);
    var armor = locArmor(getArmorType(c.class));
    var canEdit = hasPerm('officer');
    var roleSel = canEdit
        ? '<select class="rs" style="font-size:.85rem;padding:5px 10px" onchange="changeRole(\'' + id + '\',this.value);rerenderChar(\'' + id + '\')"><option ' + (c.role === ROLE_TANK ? 'selected' : '') + '>Tank</option><option ' + (c.role === ROLE_HEALER ? 'selected' : '') + '>Healer</option><option ' + (c.role === ROLE_DPS_MELEE ? 'selected' : '') + '>DPS Melee</option><option ' + (c.role === ROLE_DPS_RANGE ? 'selected' : '') + '>DPS Ranged</option></select>'
        : roleBadge(c.role);

    var renderImg = '';
    if (c.renderUrl) {
        renderImg = '<div class="char-render-wrap"><img class="char-render-img" src="' + c.renderUrl + '" onerror="this.parentNode.style.display=\'none\'" alt=""></div>';
    }

    return '<div class="char-header-card">' +
        renderImg +
        '<div style="display:flex;gap:12px;align-items:center;margin-bottom:14px">' +
        '<img src="' + icon + '" style="width:56px;height:56px;border-radius:8px;border:2px solid ' + color + '44" onerror="this.style.display=\'none\'" alt="">' +
        '<div><div style="font-family:\'Inter\',sans-serif;font-size:1.4rem;font-weight:800;color:' + color + '">' + esc(c.name) + '</div>' +
        '<div style="font-size:.9rem;color:var(--text-dim);margin-top:2px">' + locSpec(c.spec || '') + ' ' + locClass(c.class || '') + '</div>' +
        '<div style="font-size:.85rem;color:var(--text-dim);margin-top:1px">' + esc(c.realm || '') + ' · ' + armor + '</div></div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px">' + roleSel + '<span class="ilvl ' + ilvlC(c.ilvl) + '">' + (c.ilvl || '—') + '</span>' + (c.mythicRating ? '<span style="font-weight:700;color:' + ratingCol(c.mythicRating) + '">M+ ' + c.mythicRating + '</span>' : '') + '</div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
        '<a href="https://raider.io/characters/us/' + (c.realm || 'azralon') + '/' + c.name.toLowerCase() + '" target="_blank" class="btn btn-secondary btn-sm">Raider.IO</a>' +
        '<a href="https://www.warcraftlogs.com/character/us/' + (c.realm || 'azralon') + '/' + c.name.toLowerCase() + '" target="_blank" class="btn btn-secondary btn-sm">WCL</a>' +
        '<a href="https://worldofwarcraft.blizzard.com/' + (window._lang === 'pt-BR' ? 'pt-br' : 'en-us') + '/character/us/' + (c.realm || 'azralon') + '/' + c.name.toLowerCase() + '" target="_blank" class="btn btn-secondary btn-sm">Armory</a>' +
        '</div></div>' +
        buildStatsCard(c) +
        (c.mythicRating ? '<div class="info-card"><div class="info-card-title">Mythic+</div><div style="font-family:\'Inter\',sans-serif;font-size:1.5rem;font-weight:800;color:' + ratingCol(c.mythicRating) + '">' + c.mythicRating + '</div><div style="font-size:.85rem;color:var(--text-dim);margin-top:3px">' + ratingTier(c.mythicRating) + '</div></div>' : '') +
        '<div class="info-card"><div class="info-card-title">' + T('note') + '</div>' +
        (canEdit
            ? '<input type="text" id="cp-note" value="' + esc(c.note || '') + '" placeholder="' + T('add_note') + '" class="form-input" style="margin-bottom:8px"><button class="btn btn-secondary" style="width:100%" onclick="saveNote(\'' + id + '\')">' + T('save') + '</button>'
            : '<div style="font-size:.9rem;color:var(--text);white-space:pre-wrap">' + (c.note ? esc(c.note) : '<span style="color:var(--text-dim)">' + T('no_data') + '</span>') + '</div>') +
        '</div>' +
        (c.issues?.length ? '<div class="info-card"><div class="info-card-title">' + T('problems') + ' (' + c.issues.length + ')</div>' + c.issues.map(function (i) { return '<div class="issue-row"><span style="color:var(--red)">⚠</span><span style="font-size:.9rem">' + esc(translateIssue(i)) + '</span></div>'; }).join('') + '</div>' : '') +
        (canEdit ? '<button class="btn btn-danger" style="width:100%;margin-top:4px" onclick="rmMember(\'' + id + '\');goBack()">' + T('remove') + '</button>' : '');
}

function buildStatsCard(c) {
    if (!c.stats) return '';
    var s = c.stats;
    var primaries = [
        { key: 'intellect', value: s.intellect || 0 },
        { key: 'strength', value: s.strength || 0 },
        { key: 'agility', value: s.agility || 0 },
    ];
    primaries.sort(function (a, b) { return b.value - a.value; });
    var primary = primaries[0].value;
    var primaryKey = primaries[0].key;
    var ratingKeys = { crit: 'critRating', haste: 'hasteRating', mastery: 'masteryRating', versatility: 'versRating' };
    var secondaries = [
        { key: 'crit', value: s.crit, color: '#e74c3c' },
        { key: 'haste', value: s.haste, color: '#f1c40f' },
        { key: 'mastery', value: s.mastery, color: '#3498db' },
        { key: 'versatility', value: s.versatility, color: '#2ecc71' },
    ];
    var maxSec = Math.max.apply(null, secondaries.map(function (x) { return x.value; }));
    if (maxSec < 1) maxSec = 1;
    var html = '<div class="info-card"><div class="info-card-title" style="margin-bottom:18px">' + T('attributes') + '</div>';
    html += '<div class="stat-row"><span class="stat-label">' + T(primaryKey) + '</span>';
    html += '<span class="stat-val" style="color:var(--gold)">' + primary + '</span></div>';
    html += '<div class="stat-row" style="margin-bottom:10px"><span class="stat-label">' + T('stamina') + '</span>';
    html += '<span class="stat-val">' + s.stamina + '</span></div>';
    for (var i = 0; i < secondaries.length; i++) {
        var sec = secondaries[i];
        var rawVal = s[ratingKeys[sec.key]] || 0;
        var pct = Math.min((sec.value / maxSec) * 100, 100);
        html += '<div style="margin-bottom:6px">';
        html += '<div class="stat-row" style="border:none;padding-bottom:2px">';
        html += '<span class="stat-label">' + T(sec.key) + '</span>';
        html += '<span class="stat-val" style="color:' + sec.color + '">' + sec.value.toFixed(2) + '% <span style="color:var(--text-dim);font-size:.75rem">(' + rawVal + ')</span></span>';
        html += '</div>';
        html += '<div class="stat-bar-bg"><div class="stat-bar-fill" style="width:' + pct.toFixed(1) + '%;background:' + sec.color + '"></div></div>';
        html += '</div>';
    }
    html += '</div>';
    return html;
}

function buildTalentIcons(talents) {
    if (!talents || !talents.length) return '';
    var html = '<div class="talent-grid">';
    for (var i = 0; i < talents.length; i++) {
        var t = talents[i];
        var href = t.spellId ? 'https://' + whDomain() + '/spell=' + t.spellId : '#';
        var whAttr = t.spellId ? ' data-wowhead="spell=' + t.spellId + '" data-wh-icon-size="large" data-wh-rename-link="false"' : '';
        html += '<a href="' + href + '" target="_blank" class="talent-icon-link"' + whAttr + '>';
        if (t.rank > 1) html += '<span class="talent-rank-badge">' + t.rank + '</span>';
        html += '</a>';
    }
    html += '</div>';
    return html;
}

function buildTalentsSection(c) {
    if (!c.talents) return '';
    var classTalents = c.talents.class || [];
    var specTalents = c.talents.spec || [];
    var heroTalents = c.talents.hero || [];
    if (!classTalents.length && !specTalents.length && !heroTalents.length) {
        if (Array.isArray(c.talents)) {
            var arr = c.talents.filter(function (t) { return t.name && t.name !== '?'; });
            if (!arr.length) return '';
            classTalents = arr;
        } else return '';
    }
    var total = classTalents.length + specTalents.length + heroTalents.length;
    var html = '<div class="talent-section">';
    html += '<div class="info-card-title" style="margin-bottom:10px">' + T('talents') + ' (' + total + ')</div>';
    html += '<div class="talent-columns">';
    html += '<div class="talent-col"><div class="talent-col-label">' + T('class_talents') + '</div>' + buildTalentIcons(classTalents) + '</div>';

    var heroHeader = '<div class="talent-col-label">' + T('hero_talents') + '</div>';
    if (c.talents.heroTree) {
        var heroTreeDisplay = c.talents.heroTree;
        if (window._lang === 'pt-BR' && typeof HERO_TREE_PT !== 'undefined' && HERO_TREE_PT[c.talents.heroTree]) {
            heroTreeDisplay = HERO_TREE_PT[c.talents.heroTree];
        }
        heroHeader += '<div style="text-align:center; color:var(--gold); font-size:0.75rem; margin-bottom:8px; font-weight:700;">' + esc(heroTreeDisplay) + '</div>';
    }
    console.log('[GuildAudit] Hero talents count:', heroTalents.length, 'Tree:', c.talents.heroTree);
    console.log('[GuildAudit] Hero talent names:', heroTalents.map(function (t) { return t.name + ' (' + t.spellId + ')'; }));
    html += '<div class="talent-col talent-col--hero">' + heroHeader + buildTalentIcons(heroTalents) + '</div>';
    html += '<div class="talent-col"><div class="talent-col-label">' + T('spec_talents') + '</div>' + buildTalentIcons(specTalents) + '</div>';
    html += '</div></div>';
    return html;
}

function buildGearGrid(c) {
    var imgUrls = [];
    var html = '<div class="gear-grid">';
    for (var i = 0; i < SLOT_ORDER.length; i++) {
        var slot = SLOT_ORDER[i];
        var label = slotLabel(slot);
        var item = c.gear?.[slot];
        if (!item) {
            html += '<div class="gs gs-empty"><img class="gs-img" src="https://wow.zamimg.com/images/wow/icons/medium/inv_misc_questionmark.jpg" alt=""><div class="gs-info"><div class="gs-label">' + label + '</div><div class="gs-name" style="color:var(--text-dim)">' + T('empty_slot') + '</div></div></div>';
            continue;
        }
        var qc = qClass(item.quality);
        var issRows = [];
        if (ENCHANTABLE.includes(slot) && !item.enchanted) issRows.push('<span class="it it-e">' + T('missing_enchant') + '</span>');
        if (item.hasSockets && !item.gemmed) issRows.push('<span class="it it-g">' + T('missing_gem') + '</span>');
        var imgSrc = item.iconSlug ? (item.iconSlug.startsWith('http') ? item.iconSlug : 'https://wow.zamimg.com/images/wow/icons/medium/' + item.iconSlug + '.jpg') : 'https://wow.zamimg.com/images/wow/icons/medium/inv_misc_questionmark.jpg';
        imgUrls.push(imgSrc);
        var whHref = item.itemId ? 'https://' + whDomain() + '/item=' + item.itemId : '#';
        var whData = buildWHData(item, c);
        var whAttr = whData ? ' data-wowhead="' + whData + '"' : '';
        var statusBits = '';
        if (item.enchanted) statusBits += '<span style="color:var(--green);font-size:.75rem">✦ ' + T('enchant') + '</span>';
        if (item.gemmed) statusBits += '<span style="color:var(--blue);font-size:.75rem">◆ ' + T('gem') + '</span>';
        html += '<div class="gs">' +
            '<img class="gs-img" src="' + imgSrc + '" onerror="this.src=\'https://wow.zamimg.com/images/wow/icons/medium/inv_misc_questionmark.jpg\'" alt="">' +
            '<div class="gs-info">' +
            '<div class="gs-label">' + label + '</div>' +
            '<a href="' + whHref + '" target="_blank" class="gs-name ' + qc + '"' + whAttr + '>' + esc(item.name || '?') + '</a>' +
            '<div class="gs-ilvl ' + qc + '" style="display:flex;align-items:center;gap:6px"><span>iLvl ' + (item.ilvl || '?') + '</span>' + statusBits + '</div>' +
            (issRows.length ? '<div class="gs-issues">' + issRows.join('') + '</div>' : '') +
            '</div></div>';
    }
    html += '</div>';
    return { html: html, imgUrls: imgUrls };
}

function buildSuggestionsSection(c) {
    var html = '<div class="suggestions-section">';
    html += '<div class="info-card-title" style="margin-bottom:10px">' + T('suggestions') + '</div>';

    var readyItems = [];
    var cfgData = null;
    try { cfgData = JSON.parse(localStorage.getItem('ga_cfg') || '{}'); } catch (e) { }
    var ilvlMin = cfgData?.ilvlMin || 0;
    if (ilvlMin && c.ilvl && c.ilvl < ilvlMin) {
        readyItems.push('<div class="suggestion-item"><span class="s-icon">▼</span>' + T('ilvl_below_min') + ' (' + c.ilvl + ' / ' + ilvlMin + ')</div>');
    }
    if (!c.mythicRating) {
        readyItems.push('<div class="suggestion-item"><span class="s-icon">—</span>' + T('no_mythic_score') + '</div>');
    }
    var totalTalents = 0;
    if (c.talents && !Array.isArray(c.talents)) {
        totalTalents = (c.talents.class?.length || 0) + (c.talents.spec?.length || 0) + (c.talents.hero?.length || 0);
    }
    if (totalTalents > 0 && totalTalents < 65) {
        readyItems.push('<div class="suggestion-item"><span class="s-icon">△</span>' + T('talents_missing') + ' (' + totalTalents + '/71)</div>');
    }
    if (readyItems.length) {
        html += '<div class="suggestion-card suggestion-card--ready">';
        html += '<div class="suggestion-card-title">ℹ ' + T('readiness') + '</div>';
        html += readyItems.join('');
        html += '</div>';
    }

    html += '<div id="meta-build-card" class="suggestion-card suggestion-card--meta">';
    html += '<div class="suggestion-card-title">⚡ ' + T('meta_build') + '</div>';
    html += '<div class="suggestion-item" style="color:var(--text-dim)">' + T('meta_loading') + '</div>';
    html += '</div>';

    if (!readyItems.length) {
        html += '<div class="suggestion-card suggestion-card--ok">';
        html += '<div class="suggestion-card-title">✓ ' + T('readiness') + '</div>';
        html += '<div class="suggestion-item" style="color:var(--green)">' + T('all_good') + '</div>';
        html += '</div>';
    }

    html += '</div>';
    return html;
}

function loadMetaBuild(c) {
    var cfg = getAPICfg();
    if (!cfg.proxy || !c.class || !c.spec) {
        var el = document.getElementById('meta-build-card');
        if (el) el.innerHTML = '<div class="suggestion-card-title">⚡ ' + T('meta_build') + '</div><div class="suggestion-item" style="color:var(--text-dim)">' + T('meta_no_data') + '</div>';
        return;
    }
    var specClean = (c.spec || '').replace(/\s+/g, '');
    var classClean = (c.class || '').replace(/\s+/g, '');
    fetch(cfg.proxy.replace(/\/+$/, '') + '/api/meta-builds?class=' + encodeURIComponent(classClean) + '&spec=' + encodeURIComponent(specClean) + '&t=' + Date.now())
        .then(function (r) { return r.json(); })
        .then(function (meta) {
            var el = document.getElementById('meta-build-card');
            if (!el) return;
            if (!meta || !meta.talentHeatmap || meta.data === null) {
                el.innerHTML = '<div class="suggestion-card-title">⚡ ' + T('meta_build') + '</div><div class="suggestion-item" style="color:var(--text-dim)">' + T('meta_no_data') + '</div>';
                return;
            }
            var cardHtml = '<div class="suggestion-card-title">⚡ ' + T('meta_build') + '</div>';

            var recPriority = STAT_PRIORITY[specClean];
            if (recPriority && c.stats) {
                var sv = {};
                sv.crit = c.stats.crit || 0;
                sv.haste = c.stats.haste || 0;
                sv.mastery = c.stats.mastery || 0;
                sv.versatility = c.stats.versatility || 0;

                var recLabels = recPriority.map(function (s) { return T(s); }).join(' > ');
                var issues = [];
                for (var si = 0; si < recPriority.length - 1; si++) {
                    var higher = recPriority[si];
                    var lower = recPriority[si + 1];
                    if (sv[lower] > sv[higher]) {
                        var msg = T(higher) + ' ' + T('stat_under');
                        if (issues.indexOf(msg) === -1) issues.push(msg);
                    }
                }

                cardHtml += '<div style="margin-bottom:8px">';
                cardHtml += '<div class="suggestion-item" style="font-weight:600;margin-bottom:2px">' + T('attributes') + '</div>';
                cardHtml += '<div class="suggestion-item" style="font-size:.78rem;color:var(--text-dim)">' + T('stat_rec') + ': ' + recLabels + '</div>';
                if (issues.length === 0) {
                    cardHtml += '<div class="suggestion-item" style="color:var(--green)">✓ ' + T('stat_ok') + '</div>';
                } else {
                    for (var si2 = 0; si2 < issues.length; si2++) {
                        cardHtml += '<div class="suggestion-item" style="color:var(--gold)">△ ' + issues[si2] + '</div>';
                    }
                }
                cardHtml += '</div>';
            }

            var playerSpells = {};
            if (c.talents && !Array.isArray(c.talents)) {
                var all = [].concat(c.talents.class || [], c.talents.spec || [], c.talents.hero || []);
                for (var i = 0; i < all.length; i++) {
                    if (all[i].spellId) playerSpells[all[i].spellId] = true;
                }
            }
            var metaKeys = Object.keys(meta.talentHeatmap);
            var missing = [];
            for (var j = 0; j < metaKeys.length; j++) {
                var sid = metaKeys[j];
                var pct = meta.talentHeatmap[sid];
                if (pct >= 70 && !playerSpells[sid]) {
                    missing.push({ id: sid, pct: pct });
                }
            }
            missing.sort(function (a, b) { return b.pct - a.pct; });

            cardHtml += '<div style="margin-bottom:8px">';
            cardHtml += '<div class="suggestion-item" style="font-weight:600;margin-bottom:2px">' + T('talents') + '</div>';
            if (missing.length === 0) {
                cardHtml += '<div class="suggestion-item" style="color:var(--green)">✓ ' + T('meta_match') + '</div>';
                el.className = 'suggestion-card suggestion-card--ok';
            } else {
                cardHtml += '<div class="suggestion-item" style="color:var(--gold)">' + missing.length + ' ' + T('meta_diff') + '</div>';
                var calcSlug = TALENT_CALC_SLUG[c.class] || '';
                var specSlug = (c.spec || '').toLowerCase().replace(/\s+/g, '-');
                if (calcSlug) {
                    var calcUrl = 'https://' + whDomain() + '/talent-calc/' + calcSlug + '/' + specSlug;
                    cardHtml += '<div class="suggestion-item"><a href="' + calcUrl + '" target="_blank" style="color:var(--gold);text-decoration:underline">🔗 ' + T('talents') + ' — Wowhead Calculator</a></div>';
                }
            }
            cardHtml += '</div>';

            var footer = (meta.raidName || '') + ' · ' + meta.totalLogs + ' logs';
            if (meta.avgDps) footer += ' · ~' + Math.round(meta.avgDps).toLocaleString() + ' DPS';
            footer += ' · ' + relativeTime(meta.lastUpdated);
            cardHtml += '<div style="font-size:.7rem;color:var(--text-dim);margin-top:6px">' + footer + '</div>';
            el.innerHTML = cardHtml;
            refreshWowheadTooltips();
        })
        .catch(function () {
            var el = document.getElementById('meta-build-card');
            if (el) el.innerHTML = '<div class="suggestion-card-title">⚡ ' + T('meta_build') + '</div><div class="suggestion-item" style="color:var(--text-dim)">' + T('meta_no_data') + '</div>';
        });
}

function renderChar(c) {
    var id = cid(c);
    document.getElementById('cp-bc').textContent = c.name + ' · ' + (c.realm || '');
    document.title = c.name + ' — Audit';
    var sidebar = buildSidebar(c, id);
    var gearResult = buildGearGrid(c);
    preloadImages(gearResult.imgUrls).then(function () {
        document.getElementById('cp-sidebar').innerHTML = sidebar;
        var mainHtml = gearResult.html + buildTalentsSection(c) + buildSuggestionsSection(c);
        document.getElementById('cp-main').innerHTML = mainHtml;
        refreshWowheadTooltips();
        loadMetaBuild(c);
    });
}

function rerenderChar() {
    var params = new URLSearchParams(window.location.search);
    var name = params.get('name');
    var realm = params.get('realm') || 'azralon';
    var c = roster.find(function (x) {
        return x.name.toLowerCase() === name.toLowerCase() && x.realm === realm;
    });
    if (c) renderChar(c);
}

function saveNote(id) {
    var c = roster.find(function (x) { return cid(x) === id; });
    if (!c) return;
    c.note = document.getElementById('cp-note')?.value?.trim() || '';
    localStorage.setItem('ga_data', JSON.stringify(roster));
    if (typeof startSyncRoster !== 'undefined') startSyncRoster();
}

function changeRole(id, newRole) {
    var c = roster.find(function (x) { return cid(x) === id; });
    if (!c) return;
    c.role = newRole;
    localStorage.setItem('ga_data', JSON.stringify(roster));
    if (typeof startSyncRoster !== 'undefined') startSyncRoster();
}

function rmMember(id) {
    roster = roster.filter(function (x) { return cid(x) !== id; });
    localStorage.setItem('ga_data', JSON.stringify(roster));
    if (typeof startSyncRoster !== 'undefined') startSyncRoster();
}

(function initChar() {
    initAuth();
    applyI18n();
    var langSel = document.getElementById('cfg-dispLang');
    if (langSel) langSel.value = window._lang;

    var sd = localStorage.getItem('ga_data');
    if (sd) try { roster = JSON.parse(sd); } catch (e) { }

    var rdot = document.getElementById('rdot');
    if (rdot) rdot.className = 'off';

    var guildName = null;
    try { var a = JSON.parse(localStorage.getItem('ga_api') || '{}'); guildName = a.guild; } catch (e) { }
    if (roster.length && roster[0].guild) guildName = roster[0].guild;
    if (guildName) {
        var ht = document.getElementById('hdr-title');
        if (ht) ht.textContent = guildName.charAt(0).toUpperCase() + guildName.slice(1);
    }
    if (roster.length) {
        var hm = document.getElementById('hmeta');
        if (hm) hm.textContent = roster.length + ' ' + T('members');
        var rts = document.getElementById('rts');
        if (rts) rts.textContent = relativeTime(roster[0].lastUpdated);
    }

    var params = new URLSearchParams(window.location.search);
    var name = params.get('name');
    var realm = params.get('realm') || 'azralon';

    if (!name) { goBack(); return; }

    function findChar(list) {
        return list.find(function (x) {
            return x.name.toLowerCase() === name.toLowerCase() && x.realm === realm;
        });
    }

    var cfg = getAPICfg();
    if (cfg.proxy) {
        fetch(cfg.proxy.replace(/\/+$/, '') + '/api/roster?t=' + Date.now())
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (Array.isArray(data) && data.length) {
                    roster = data;
                    localStorage.setItem('ga_data', JSON.stringify(roster));
                }
                var found = findChar(roster);
                if (found) renderChar(found);
                else { notify('Personagem não encontrado.'); setTimeout(goBack, 1500); }
            })
            .catch(function () {
                var cached = findChar(roster);
                if (cached) renderChar(cached);
                else { notify('Erro ao buscar roster.'); setTimeout(goBack, 1500); }
            });
    } else {
        var cached = findChar(roster);
        if (cached) renderChar(cached);
        else { notify('Personagem não encontrado.'); setTimeout(goBack, 1500); }
    }
})();
