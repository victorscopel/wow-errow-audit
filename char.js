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

    var renderImg = '<div class="char-render-wrap" id="model-3d" style="width:100%; min-height:400px; position:relative; border-radius:12px; overflow:hidden;">';
    if (c.renderUrl) {
        renderImg += '<img id="model-3d-fallback" class="char-render-img" src="' + c.renderUrl + '" onerror="this.style.display=\'none\'" alt="">';
    }
    renderImg += '</div>';

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
        '<a href="https://raider.io/characters/us/' + (c.realm || 'azralon') + '/' + c.name.toLowerCase() + '" target="_blank" class="btn btn-secondary btn-sm"><img src="https://raider.io/favicon.ico" style="width:13px;height:13px;vertical-align:middle;margin-right:3px;border-radius:2px">Raider.IO</a>' +
        '<a href="https://www.warcraftlogs.com/character/us/' + (c.realm || 'azralon') + '/' + c.name.toLowerCase() + '" target="_blank" class="btn btn-secondary btn-sm"><img src="https://assets.rpglogs.com/img/warcraft/favicon.png" style="width:13px;height:13px;vertical-align:middle;margin-right:3px;border-radius:2px">WCL</a>' +
        '<a href="https://worldofwarcraft.blizzard.com/' + (window._lang === 'pt-BR' ? 'pt-br' : 'en-us') + '/character/us/' + (c.realm || 'azralon') + '/' + c.name.toLowerCase() + '" target="_blank" class="btn btn-secondary btn-sm"><img src="https://bnetcmsus-a.akamaihd.net/cms/gallery/D2TTHKAPW9BH1534981363136.png" style="width:13px;height:13px;vertical-align:middle;margin-right:3px;border-radius:2px">Armory</a>' +
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
    // Talent missing check removed
    if (readyItems.length) {
        html += '<div class="suggestion-card suggestion-card--ready">';
        html += '<div class="suggestion-card-title">ℹ ' + T('readiness') + '</div>';
        html += readyItems.join('');
        html += '</div>';
    }

    html += '<div id="meta-build-card" class="suggestion-card suggestion-card--meta">';
    html += '<div class="suggestion-card-title">⚡ ' + T('attributes') + '</div>';
    html += '<div class="suggestion-item" style="color:var(--text-dim)">' + T('meta_loading') + '</div>';
    html += '</div>';



    html += '</div>';
    return html;
}

function loadStatSuggestions(c) {
    var el = document.getElementById('meta-build-card');
    if (!el || !c.class || !c.spec) return;

    var specClean = (c.spec || '').replace(/\s+/g, '');
    var cfgData = {};
    try { cfgData = JSON.parse(localStorage.getItem('ga_cfg') || '{}'); } catch (e) { }
    var archonText = cfgData.archon || '';

    if (!archonText) {
        el.innerHTML = '<div class="suggestion-card-title">⚡ ' + T('attributes') + '</div><div class="suggestion-item" style="color:var(--text-dim)">' + T('meta_no_data') + '</div>';
        return;
    }

    var cardHtml = '<div style="font-size:14px;font-weight:700;margin-bottom:10px;display:flex;align-items:center;gap:6px">⚡ ' + T('attributes') + '</div>';
    var archonDate = null;
    var classSlug = (c.class || '').toLowerCase().replace(/\s+/g, '-');
    var specSlug = (c.spec || '').toLowerCase().replace(/\s+/g, '-');
    var archonPrefix = classSlug + '-' + specSlug + ':';
    var recPriority = null;

    var lines = archonText.split('\n');
    for (var li = 0; li < lines.length; li++) {
        var l = lines[li].trim();
        if (l.startsWith(archonPrefix)) {
            var valStr = l.substring(archonPrefix.length).trim();
            var parts = valStr.split('>');
            recPriority = parts.map(function (p) {
                var statRaw = p.split('(')[0].trim().toLowerCase();
                var matchW = p.match(/\((\d+)\)/);
                var weightRaw = matchW ? parseInt(matchW[1], 10) : null;
                if (statRaw === 'vers') statRaw = 'versatility';
                return { stat: statRaw, weight: weightRaw };
            }).filter(function (x) { return !!x.stat; });
        } else if (l.startsWith('last_updated:')) {
            archonDate = l.substring('last_updated:'.length).trim();
        }
    }

    if (recPriority && c.stats) {
        var svRaw = {
            crit: c.stats.critRating || 0,
            haste: c.stats.hasteRating || 0,
            mastery: c.stats.masteryRating || 0,
            versatility: c.stats.versRating || 0
        };

        var statColors = { crit: '#e05252', haste: '#f4a623', mastery: '#5ba0f0', versatility: '#8bc48b' };
        var recBadges = recPriority.map(function (o, idx) {
            var col = statColors[o.stat] || '#a0a0a0';
            var badge = '<span style="display:inline-flex;align-items:center;gap:3px;background:' + col + '22;border:1px solid ' + col + '55;border-radius:4px;padding:2px 7px;font-size:13px;font-weight:600;color:' + col + '">' + T(o.stat);
            if (o.weight) badge += ' <span style="font-size:11px;opacity:0.85">(' + o.weight + ')</span>';
            badge += '</span>';
            if (idx < recPriority.length - 1) badge += '<span style="color:var(--text-dim);margin:0 3px">›</span>';
            return badge;
        }).join('');

        var recRow = '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:4px;margin:6px 0 8px">' + recBadges + '</div>';
        if (archonDate) {
            recRow += '<div style="font-size:11px;color:var(--text-dim);margin-bottom:4px">Archon.gg · ' + T('archon_source') + ' · ' + relativeTime(archonDate) + '</div>';
        } else {
            recRow += '<div style="font-size:11px;color:var(--text-dim);margin-bottom:4px">' + T('archon_source') + '</div>';
        }

        var issues = [];
        for (var si = 0; si < recPriority.length; si++) {
            var sObj = recPriority[si];
            var sName = sObj.stat;
            var sTarget = sObj.weight;
            var sPlayer = svRaw[sName];
            if (sTarget && sPlayer !== undefined && sPlayer < sTarget) {
                var diff = sTarget - sPlayer;
                var col2 = statColors[sName] || '#a0a0a0';
                var msg = '<span style="color:' + col2 + ';font-weight:600">' + T(sName) + '</span> ' + T('stat_below') + ': <span style="font-weight:600">' + sPlayer + '</span> <span style="color:var(--red)">(-' + diff + ')</span> <span style="color:var(--text-dim);font-size:11px">(rec. ' + sTarget + ')</span>';
                if (issues.indexOf(msg) === -1) issues.push(msg);
            }
        }

        cardHtml += '<div style="margin-bottom:10px;font-size:14px">';
        cardHtml += '<div style="font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:0.04em;color:var(--text-dim);margin-bottom:4px">' + T('attributes') + '</div>';
        cardHtml += recRow;
        if (issues.length === 0) {
            cardHtml += '<div style="color:var(--green);font-size:13px">✓ ' + T('stat_ok') + '</div>';
        } else {
            for (var si2 = 0; si2 < issues.length; si2++) {
                cardHtml += '<div style="color:var(--gold);font-size:13px;margin-top:2px">△ ' + issues[si2] + '</div>';
            }
        }
        cardHtml += '</div>';
        el.innerHTML = cardHtml;
        el.className = 'suggestion-card suggestion-card--ok';
    } else {
        el.innerHTML = '<div class="suggestion-card-title">⚡ ' + T('attributes') + '</div><div class="suggestion-item" style="color:var(--text-dim)">' + T('meta_no_data') + '</div>';
    }
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
        loadStatSuggestions(c);

        try {
            import('./model3D.js').then(function (m3d) {
                m3d.initModelViewer(c, '#model-3d').then(function (viewer) {
                    if (viewer) {
                        var fb = document.getElementById('model-3d-fallback');
                        if (fb) fb.style.display = 'none'; // hide 2D fallback
                    }
                }).catch(function (err) {
                    console.error('[Model3D] Init failed:', err);
                });
            }).catch(function (err) {
                console.error('[Model3D] Import failed:', err);
            });
        } catch (e) {
            console.error('[Model3D] Render sync error:', e);
        }
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

    function updateHeader(guildInfo) {
        var guildName = null;
        try { var a = JSON.parse(localStorage.getItem('ga_api') || '{}'); guildName = a.guild; } catch (e) { }
        if (roster.length && roster[0].guild) guildName = roster[0].guild;
        if (!guildName && guildInfo && guildInfo.guild) guildName = guildInfo.guild;
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
    }
    updateHeader();

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
        var proxyBase = cfg.proxy.replace(/\/+$/, '');

        var fetchRoster = fetch(proxyBase + '/api/roster?t=' + Date.now())
            .then(function (r) { return r.json(); })
            .catch(function () { return null; });

        var fetchCfgData = fetch(proxyBase + '/api/cfg?t=' + Date.now())
            .then(function (r) { return r.json(); })
            .catch(function () { return null; });

        var fetchArchon = fetch(proxyBase + '/api/archon-stats?t=' + Date.now())
            .then(function (r) { return r.text(); })
            .catch(function () { return null; });

        var fetchGuildInfo = fetch(proxyBase + '/api/guild-info')
            .then(function (r) { return r.json(); })
            .catch(function () { return null; });

        Promise.all([fetchRoster, fetchCfgData, fetchArchon, fetchGuildInfo]).then(function (results) {
            var rosterData = results[0];
            var cfgData = results[1];
            var archonText = results[2];
            var guildInfo = results[3];

            if (Array.isArray(rosterData) && rosterData.length) {
                roster = rosterData;
                localStorage.setItem('ga_data', JSON.stringify(roster));
                getToken(cfg).then(function (tok) {
                    fetchItemIcons(cfg, tok);
                    fetchAllCharMedia(cfg, tok);
                }).catch(function () { });
            }

            if (cfgData && typeof cfgData === 'object') {
                var cur = JSON.parse(localStorage.getItem('ga_cfg') || '{}');
                var merged = Object.assign({}, cur, cfgData);
                localStorage.setItem('ga_cfg', JSON.stringify(merged));
            }

            if (archonText && archonText.length > 10) {
                var cur2 = JSON.parse(localStorage.getItem('ga_cfg') || '{}');
                cur2.archon = archonText;
                localStorage.setItem('ga_cfg', JSON.stringify(cur2));
            }

            updateHeader(guildInfo);

            var found = findChar(roster);
            if (found) renderChar(found);
            else { notify('Personagem não encontrado.'); setTimeout(goBack, 1500); }
        });
    } else {
        var cached = findChar(roster);
        if (cached) renderChar(cached);
        else { notify('Personagem não encontrado.'); setTimeout(goBack, 1500); }
    }
})();

