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

function getGuildCfg() {
    // getAPICfg reads ?guild= from URL; fallback to localStorage set by guild page
    var cfg = getAPICfg();
    if (!cfg.guild || !cfg.realm) {
        cfg.region = cfg.region || localStorage.getItem('ga_region') || 'us';
        cfg.realm = cfg.realm || localStorage.getItem('ga_realm') || '';
        cfg.guild = cfg.guild || localStorage.getItem('ga_guild') || '';
    }
    return cfg;
}

function goBack() {
    var cfg = getGuildCfg();
    var base = getHomeUrl().replace(/\/+$/, '');
    if (cfg.guild && cfg.realm) {
        window.location.href = base + '/guild.html?guild=' + cfg.region + '/' + cfg.realm + '/' + cfg.guild;
    } else {
        window.location.href = base + '/';
    }
}

function goToGuild(tab) {
    var cfg = getGuildCfg();
    var base = getHomeUrl().replace(/\/+$/, '');
    var url = base + '/guild.html?guild=' + cfg.region + '/' + cfg.realm + '/' + cfg.guild;
    if (tab) url += '#' + tab;
    window.location.href = url;
}

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

    var clsSlug = (c.class || '').toLowerCase().replace(/ /g, '-');
    var renderStyle = c.renderUrl ? ' style="background-image: url(\'' + c.renderUrl + '\')"' : '';
    var renderHtml = '<div class="char-header-wrapper">' +
        '<div class="char-render-wrap"' + renderStyle + '></div>' +
        '</div>';

    return '<div class="char-header-card cls-bg-' + clsSlug + '">' +
        renderHtml +
        '<div class="char-info-overlay">' +
        '<div style="display:flex;gap:12px;align-items:center;margin-bottom:14px">' +
        '<img src="' + icon + '" style="width:56px;height:56px;border-radius:8px;border:2px solid ' + color + '44" onerror="this.style.display=\'none\'" alt="">' +
        '<div><div style="font-family:\'Inter\',sans-serif;font-size:1.4rem;font-weight:800;color:' + color + '">' + esc(c.name) + '</div>' +
        '<div style="font-size:.9rem;color:var(--text-dim);margin-top:2px">' + locSpec(c.spec || '') + ' ' + locClass(c.class || '') + '</div>' +
        '<div style="font-size:.85rem;color:var(--text-dim);margin-top:1px">' + esc(c.realm || '') + ' · ' + armor + '</div></div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px">' + roleSel + '<span class="ilvl ' + ilvlC(c.ilvl) + '">' + fmtIlvl(c.ilvl) + '</span>' + (c.mythicRating ? '<span style="font-weight:700;color:' + ratingCol(c.mythicRating) + '">M+ ' + c.mythicRating + '</span>' : '') + '</div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
        '<a href="https://raider.io/characters/' + (getAPICfg().region || 'us') + '/' + (c.realm || 'azralon') + '/' + c.name.toLowerCase() + '" target="_blank" class="btn btn-secondary btn-sm"><img src="https://raider.io/favicon.ico" style="width:13px;height:13px;vertical-align:middle;margin-right:3px;border-radius:2px">Raider.IO</a>' +
        '<a href="https://www.warcraftlogs.com/character/' + (getAPICfg().region || 'us') + '/' + (c.realm || 'azralon') + '/' + c.name.toLowerCase() + '" target="_blank" class="btn btn-secondary btn-sm"><img src="https://assets.rpglogs.com/img/warcraft/favicon.png" style="width:13px;height:13px;vertical-align:middle;margin-right:3px;border-radius:2px">WCL</a>' +
        '<a href="https://worldofwarcraft.blizzard.com/' + (window._lang === 'pt-BR' ? 'pt-br' : 'en-us') + '/character/' + (getAPICfg().region || 'us') + '/' + (c.realm || 'azralon') + '/' + c.name.toLowerCase() + '" target="_blank" class="btn btn-secondary btn-sm"><img src="https://bnetcmsus-a.akamaihd.net/cms/gallery/D2TTHKAPW9BH1534981363136.png" style="width:13px;height:13px;vertical-align:middle;margin-right:3px;border-radius:2px">Armory</a>' +
        '</div>' +
        '</div>' + // Close char-info-overlay
        '</div>' + // Close char-header-card
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
        if (item.isTierSet) statusBits += '<span class="badge-tier" style="font-size:.7rem">' + T('tier_set') + '</span>';
        if (item.isPvP) statusBits += '<span class="badge-pvp" style="font-size:.7rem">⚔ PvP</span>';
        if (item.isEmbellished) statusBits += '<span class="badge-emb" style="font-size:.7rem">✦ ' + T('embellished') + '</span>';
        html += '<div class="gs">' +
            '<img class="gs-img" src="' + imgSrc + '" onerror="this.src=\'https://wow.zamimg.com/images/wow/icons/medium/inv_misc_questionmark.jpg\'" alt="">' +
            '<div class="gs-info">' +
            '<div class="gs-label">' + label + '</div>' +            
            '<div style="width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' +
            '<a href="' + whHref + '" target="_blank" class="gs-name ' + qc + '"' + whAttr + ' style="display:inline; text-decoration:none; font-weight:600;">' + esc(item.name || '?') + '</a>' +
            '</div>' +

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

    html += '<div id="gear-upgrade-card" class="suggestion-card suggestion-card--meta">';
    html += '<div style="font-size:14px;font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:8px">';
    html += '⬆ ' + T('gear_upgrades');
    // Botões maiores (font-size:12px, padding:5px 12px) e com mais espaçamento
    html += '<div id="gear-upgrade-diff-toggle" style="margin-left:auto;display:flex;gap:6px">';
    html += '<button id="btn-diff-normal" class="btn btn-sm" onclick="setUpgradeDiff(\'normal\')" style="font-size:12px;padding:5px 12px;border-radius:4px;cursor:pointer;transition:all 0.2s">Normal</button>';
    html += '<button id="btn-diff-heroic" class="btn btn-sm" onclick="setUpgradeDiff(\'heroic\')" style="font-size:12px;padding:5px 12px;border-radius:4px;cursor:pointer;transition:all 0.2s">Heroic</button>';
    html += '<button id="btn-diff-mythic" class="btn btn-sm" onclick="setUpgradeDiff(\'mythic\')" style="font-size:12px;padding:5px 12px;border-radius:4px;cursor:pointer;transition:all 0.2s">Mythic</button>';
    html += '</div></div>';
    html += '<div id="gear-upgrade-body"><div style="color:var(--text-dim);font-size:13px">' + T('meta_loading') + '</div></div>';
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

    var cardHtml = '<div style="font-size:14px;font-weight:700;margin-bottom:10px;display:flex;align-items:center;gap:6px">⚡ ' + T('attributes_recommended') + '</div>';
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

// ── Gear Upgrade Suggestions ──────────────────────────────

// Midnight S1 upgrade track max deltas (fixed per season)
var UPGRADE_MAX = { heroic: 20, mythic: 17 };

// Internal slot name → Blizzard API slot names mapping
var SLOT_DISPLAY = {
    head: 'Cabeça', neck: 'Pescoço', shoulder: 'Ombros', back: 'Costas',
    chest: 'Torso', wrist: 'Pulsos', hands: 'Mãos', waist: 'Cintura',
    legs: 'Pernas', feet: 'Pés', finger: 'Anel', trinket: 'Trinket',
    mainhand: 'Mão Principal', offhand: 'Mão Auxiliar', twohand: 'Duas Mãos',
};
var SLOT_DISPLAY_EN = {
    head: 'Head', neck: 'Neck', shoulder: 'Shoulder', back: 'Back',
    chest: 'Chest', wrist: 'Wrist', hands: 'Hands', waist: 'Waist',
    legs: 'Legs', feet: 'Feet', finger: 'Finger', trinket: 'Trinket',
    mainhand: 'Main Hand', offhand: 'Off Hand', twohand: 'Two Hand',
};

// Cache loot data in memory (fetched once per page load)
var _lootCache = null;
var _lootFetching = false;
var _lootCallbacks = [];
var _currentChar = null;
var _upgradeDiff = localStorage.getItem('ga_upgrade_diff') || 'heroic';

function setUpgradeDiff(diff) {
    _upgradeDiff = diff;
    localStorage.setItem('ga_upgrade_diff', diff);
    updateDiffButtons();
    if (_currentChar) renderGearUpgrades(_currentChar);
}

function updateDiffButtons() {
    var btnN = document.getElementById('btn-diff-normal');
    var btnH = document.getElementById('btn-diff-heroic');
    var btnM = document.getElementById('btn-diff-mythic');
    if (!btnH || !btnM) return;
    
    function setBtn(btn, diff) {
        if (!btn) return;
        var isActive = _upgradeDiff === diff;
        // Aplica um fundo translúcido para o botão ativo e melhora o contraste do texto
        btn.style.borderColor = isActive ? 'var(--gold)' : 'var(--border)';
        btn.style.color = isActive ? 'var(--gold)' : 'var(--text)';
        btn.style.backgroundColor = isActive ? 'rgba(212, 175, 55, 0.15)' : 'rgba(0, 0, 0, 0.2)';
        btn.style.fontWeight = isActive ? '700' : '500';
    }
    
    setBtn(btnN, 'normal');
    setBtn(btnH, 'heroic');
    setBtn(btnM, 'mythic');
}

function getLootData(cb) {
    if (_lootCache) { cb(_lootCache); return; }
    _lootCallbacks.push(cb);
    if (_lootFetching) return;
    _lootFetching = true;
    var cfg = getAPICfg();
    fetch(cfg.workerBase + '/api/loot/midnight-s1?t=' + Date.now())
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
            _lootCache = data;
            _lootCallbacks.forEach(function (fn) { fn(data); });
            _lootCallbacks = [];
        })
        .catch(function () {
            _lootCallbacks.forEach(function (fn) { fn(null); });
            _lootCallbacks = [];
        });
}

// Parse archon stat weights for a given char into normalized weights 0..1
function parseStatWeights(c) {
    var cfgData = {};
    try { cfgData = JSON.parse(localStorage.getItem('ga_cfg') || '{}'); } catch (e) { }
    var archonText = cfgData.archon || '';
    if (!archonText || !c.class || !c.spec) return null;

    var classSlug = c.class.toLowerCase().replace(/\s+/g, '-');
    var specSlug = c.spec.toLowerCase().replace(/\s+/g, '-');
    var prefix = classSlug + '-' + specSlug + ':';

    var lines = archonText.split('\n');
    for (var i = 0; i < lines.length; i++) {
        var l = lines[i].trim();
        if (!l.startsWith(prefix)) continue;
        var parts = l.substring(prefix.length).trim().split('>');
        var raw = {};
        parts.forEach(function (p) {
            var stat = p.split('(')[0].trim().toLowerCase();
            var match = p.match(/\((\d+)\)/);
            var val = match ? parseInt(match[1], 10) : 0;
            if (stat === 'vers') stat = 'versatility';
            if (['crit', 'haste', 'mastery', 'versatility'].includes(stat) && val > 0)
                raw[stat] = val;
        });
        // Normalize: highest stat = 1.0
        var maxW = Math.max.apply(null, Object.values(raw));
        if (maxW <= 0) return null;
        var normalized = {};
        Object.keys(raw).forEach(function (k) { normalized[k] = raw[k] / maxW; });
        return normalized;
    }
    return null;
}

// Calculate a weighted score for an item given weights and ilvl
// Formula: ilvl + sum(stat_value * weight) — ilvl dominates but stats tip the balance
function itemScore(ilvl, stats, weights) {
    if (!stats || !weights) return ilvl;
    var bonus = 0;
    // Scale factor: secondaries on gear are typically 100-500 range, ilvl is 250-290
    // We divide stat contributions by 100 so they add ±1-5 to ilvl score
    var scale = 100;
    ['crit', 'haste', 'mastery', 'versatility'].forEach(function (s) {
        if (stats[s] && weights[s]) bonus += (stats[s] * weights[s]) / scale;
    });
    return ilvl + bonus;
}

// Get the equipped item score for a given slot
function equippedScore(c, slot, weights) {
    var gear = c.gear || {};
    // finger and trinket can have 1 and 2
    var slots = slot === 'finger' ? ['finger1', 'finger2'] :
        slot === 'trinket' ? ['trinket1', 'trinket2'] : [slot];
    var best = 0;
    slots.forEach(function (s) {
        var item = gear[s];
        if (!item) return;
        var sc = itemScore(item.ilvl || 0, item.stats || {}, weights);
        if (sc > best) best = sc;
    });
    return best;
}

function renderGearUpgrades(c) {
    _currentChar = c;
    updateDiffButtons();
    var body = document.getElementById('gear-upgrade-body');
    if (!body) return;
    body.innerHTML = '<div style="color:var(--text-dim);font-size:13px">' + T('meta_loading') + '</div>';

    getLootData(function (lootData) {
        if (!lootData || !lootData.items || !lootData.items.length) {
            body.innerHTML = '<div style="color:var(--text-dim);font-size:13px">' + T('loot_no_data') + '</div>';
            return;
        }

        var weights = parseStatWeights(c);
        var diff = _upgradeDiff;
        var isPT = (window._lang === 'pt-BR');
        var slotDisp = isPT ? SLOT_DISPLAY : SLOT_DISPLAY_EN;

        var GEAR_SLOTS = ['head', 'neck', 'shoulder', 'back', 'chest', 'wrist', 'hands',
            'waist', 'legs', 'feet', 'finger', 'trinket', 'mainhand', 'offhand', 'twohand'];

        var bySlot = {};
        var charArmor = getArmorType(c.class);
        var armorSlots = ['head', 'shoulder', 'chest', 'wrist', 'hands', 'waist', 'legs', 'feet'];

        lootData.items.forEach(function (item) {
            var s = item.slot;
            if (armorSlots.includes(s)) {
                var itemArmor = item.armorCat || '';
                var isMatch = false;
                if (charArmor === 'Plate' && (itemArmor === 'Placa' || itemArmor === 'Plate')) isMatch = true;
                else if (charArmor === 'Mail' && (itemArmor === 'Malha' || itemArmor === 'Mail')) isMatch = true;
                else if (charArmor === 'Leather' && (itemArmor === 'Couro' || itemArmor === 'Leather')) isMatch = true;
                else if (charArmor === 'Cloth' && (itemArmor === 'Tecido' || itemArmor === 'Cloth')) isMatch = true;
                else if (itemArmor === 'Diversos' || itemArmor === 'Miscellaneous' || !itemArmor) isMatch = true;
                if (!isMatch) return;
            }
            if (!bySlot[s]) bySlot[s] = [];
            bySlot[s].push(item);
        });

        var upgradeSlots = [];

        GEAR_SLOTS.forEach(function (slot) {
            var itemsInSlot = bySlot[slot];
            if (!itemsInSlot || !itemsInSlot.length) return;

            var equippedSc = equippedScore(c, slot, weights);
            var candidates = [];

            itemsInSlot.forEach(function (item) {
                var baseIlvl = null;
                var recKey = null;

                if (item.source === 'mythicplus') {
                    for (var k = 2; k <= 10; k++) {
                        var possibleIlvl = item.ilvlByKey[k];
                        if (!possibleIlvl) continue;
                        var possibleSc = itemScore(possibleIlvl, item.stats, weights);
                        if (possibleSc > equippedSc) {
                            baseIlvl = possibleIlvl;
                            recKey = k;
                            break;
                        }
                    }
                    if (!baseIlvl) return;
                } else {
                    baseIlvl = item.ilvl && item.ilvl[diff];
                    if (!baseIlvl) return;
                    var baseSc = itemScore(baseIlvl, item.stats, weights);
                    if (baseSc <= equippedSc) return;
                }

                candidates.push({
                    item: item, baseIlvl: baseIlvl, recKey: recKey,
                    baseSc: itemScore(baseIlvl, item.stats, weights)
                });
            });

            if (!candidates.length) return;
            candidates.sort(function (a, b) { return b.baseSc - a.baseSc; });
            upgradeSlots.push({ slot: slot, upgrades: candidates.slice(0, 3), equippedSc: equippedSc });
        });

        if (!upgradeSlots.length) {
            var dl = diff === 'normal' ? 'Normal' : diff === 'heroic' ? (isPT ? 'Heroico' : 'Heroic') : 'Mythic';
            body.innerHTML = '<div style="color:var(--green);font-size:13px">\u2713 ' +
                (isPT ? 'Nenhum upgrade dispon\u00edvel em ' + dl + ' ou M+' : 'No upgrades available in ' + dl + ' or M+') + '</div>';
            return;
        }

        var html = '';
        upgradeSlots.forEach(function (sg) {
            var slotLabel = slotDisp[sg.slot] || sg.slot;
            html += '<div style="margin-bottom:20px">';
            
            html += '<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-dim);margin-bottom:10px">' + slotLabel + '</div>';
            
            // Grelha forçando largura e altura idênticas
            html += '<div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; align-items: stretch;">';

            sg.upgrades.forEach(function (u) {
                var item = u.item;
                var isMplus = item.source === 'mythicplus';
                
                var deltaVal = (u.baseSc - sg.equippedSc).toFixed(1).replace(/\.0$/, '');
                var deltaStr = '+' + deltaVal + ' iLvL';
                
                var sourceLabel = '';
                var badgeBg = '';
                var badgeColor = '';

                // Textos, cores e fundos consoante a dificuldade e idioma
                if (isMplus) {
                    sourceLabel = isPT ? 'Mítica+ ' + u.recKey : 'Mythic+ ' + u.recKey;
                    badgeBg = 'rgba(79, 195, 247, 0.15)';
                    badgeColor = '#4fc3f7';
                } else {
                    if (diff === 'mythic') {
                        sourceLabel = isPT ? 'Raid Mítica' : 'Mythic Raid';
                        badgeBg = 'rgba(255, 128, 0, 0.15)';
                        badgeColor = '#ff8000';
                    } else if (diff === 'heroic') {
                        sourceLabel = isPT ? 'Raid Heroica' : 'Heroic Raid';
                        badgeBg = 'rgba(30, 255, 0, 0.15)';
                        badgeColor = '#1eff00';
                    } else {
                        sourceLabel = isPT ? 'Raid Normal' : 'Normal Raid';
                        badgeBg = 'rgba(170, 170, 170, 0.15)';
                        badgeColor = '#aaaaaa';
                    }
                }
                    
                var qc = 'q-e'; 
                var whData = 'item=' + item.itemId + '&ilvl=' + u.baseIlvl;
                if (c.specId) whData += '&spec=' + c.specId;
                var wowheadUrl = 'https://' + whDomain() + '/item=' + item.itemId;

                // ─── A LÓGICA CORRIGIDA ESTÁ AGORA AQUI DENTRO DO LOOP ───
                var sourceNamePT = isMplus ? (item.dungeonName || item.bossName) : item.bossName;
                var sourceNameEN = isMplus ? (item.dungeonNameEn || item.bossNameEn) : item.bossNameEn;
                
                var sourceName = isPT ? sourceNamePT : (sourceNameEN || sourceNamePT);
                var itemNameDisp = isPT ? item.name : (item.nameEn || item.name);

                html += '<div style="background:rgba(0,0,0,0.2); border:1px solid var(--border); border-radius:8px; padding:10px; display:flex; flex-direction:column; height:100%; box-sizing:border-box; transition: border-color 0.1s;" onmouseover="this.style.borderColor=\'var(--gold)\'" onmouseout="this.style.borderColor=\'var(--border)\'">';
                
                html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">';
                html += '<span style="font-size:11px;font-weight:700;color:' + badgeColor + ';background:' + badgeBg + ';padding:2px 6px;border-radius:4px;">' + sourceLabel + '</span>';
                html += '<span style="font-size:11px;color:var(--green);font-weight:800;background:rgba(30,255,0,0.1);padding:2px 6px;border-radius:4px;" title="Score increase">' + deltaStr + '</span>';
                html += '</div>';

                html += '<div style="display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; flex-grow:1; margin-bottom:8px;">';
                html += '<div style="width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">';
                html += '<a href="' + wowheadUrl + '" target="_blank" class="' + qc + '" ' +
                    'style="display:inline; text-decoration:none;font-weight:600;font-size:13px;" ' +
                    'data-wowhead="' + whData + '" ' +
                    'data-wh-iconize="true" data-wh-icon-size="medium">' + itemNameDisp + '</a>';
                html += '</div>';
                html += '</div>';

                html += '<div style="padding-top:8px; border-top:1px solid rgba(255,255,255,0.05); display:flex; flex-direction:column; align-items:center; gap:2px;">';
                html += '<span style="font-size:14px;color:var(--text);font-weight:700;">' + u.baseIlvl + '</span>';
                html += '<span style="font-size:11px;color:var(--text-dim);text-align:center;line-height:1.2;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;" title="' + sourceName + '">' + sourceName + '</span>';
                html += '</div>';

                html += '</div>'; 
            });

            html += '</div>'; 
            html += '</div>'; 
        });

        if (weights) {
            var topStats = Object.keys(weights).sort(function (a, b) { return weights[b] - weights[a]; }).slice(0, 2);
            html += '<div style="font-size:11px;color:var(--text-dim);margin-top:4px">' +
                (isPT ? 'Score = iLvl Drop + atributos (Archon.gg: ' : 'Score = Drop iLvl + stats (Archon.gg: ') +
                topStats.join(', ') + ').</div>';
        }

        body.innerHTML = html;
        if (typeof WH !== 'undefined' && WH.getLocale) refreshWowheadTooltips();
    });
}
function renderChar(c) {
    if (!c) return;
    var id = cid(c);

    // Create a stable key for comparison (exclude volatile fields like lastUpdated)
    var stableData = { ...c };
    delete stableData.lastUpdated;
    var dataStr = JSON.stringify(stableData);

    if (window._ga_last_render === dataStr) return; // Already rendered this exact data
    window._ga_last_render = dataStr;

    document.getElementById('cp-bc').textContent = c.name + ' · ' + (c.realm || '');
    document.title = c.name + ' — Audit';

    // Backgrounds already handled by buildSidebar mapping
    var sidebar = buildSidebar(c, id);
    var gearResult = buildGearGrid(c);

    // Render immediately, don't wait for preload to show the structure
    document.getElementById('cp-sidebar').innerHTML = sidebar;
    var mainHtml = gearResult.html + buildTalentsSection(c) + buildSuggestionsSection(c);
    document.getElementById('cp-main').innerHTML = mainHtml;

    refreshWowheadTooltips();
    loadStatSuggestions(c);
    renderGearUpgrades(c);

    // Still preload in background for better UX
    preloadImages(gearResult.imgUrls).then(function () {
        // Icons are now in cache, browser will swap them if they weren't already there
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
    if (!hasPerm('officer')) { alert(T('no_perm')); return; }
    var c = roster.find(function (x) { return cid(x) === id; });
    if (!c) return;
    c.note = document.getElementById('cp-note')?.value?.trim() || '';
    localStorage.setItem('ga_data', JSON.stringify(roster));
    if (typeof saveRosterKV === 'function') saveRosterKV();
}

function changeRole(id, newRole) {
    if (!hasPerm('officer')) return;
    var c = roster.find(function (x) { return cid(x) === id; });
    if (!c) return;
    c.role = newRole;
    localStorage.setItem('ga_data', JSON.stringify(roster));
    if (typeof saveRosterKV === 'function') saveRosterKV();
}

function rmMember(id) {
    if (!hasPerm('officer')) return;
    roster = roster.filter(function (x) { return cid(x) !== id; });
    localStorage.setItem('ga_data', JSON.stringify(roster));
    if (typeof saveRosterKV === 'function') saveRosterKV();
}

(function initChar() {
    initAuth();
    applyI18n();
    var langSel = document.getElementById('cfg-dispLang');
    if (langSel) langSel.value = window._lang;

    var sd = localStorage.getItem('ga_data');
    if (sd) try { roster = JSON.parse(sd); } catch (e) { }

    var rdot = document.getElementById('rdot');
    var cfgAR = JSON.parse(localStorage.getItem('ga_cfg') || '{}');
    if (rdot) rdot.classList.toggle('off', !cfgAR.ar);

    function updateHeader() {
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

    var cfg = getGuildCfg();

    // Header — guild title + realm subtitle (same as guild.html)
    var guildTitleEl = document.getElementById('guild-title');
    if (guildTitleEl && cfg.guild) {
        guildTitleEl.textContent = cfg.guild.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    }
    var realmTitleEl = document.getElementById('realm-title');
    if (realmTitleEl && cfg.realm) {
        realmTitleEl.textContent = cfg.realm.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }) + ' — ' + cfg.region.toUpperCase();
    }

    if (cfg.workerBase && cfg.realm && cfg.guild) {
        var gBase = cfg.workerBase + '/api/' + cfg.region + '/' + cfg.realm + '/' + cfg.guild;
        var diff = (JSON.parse(localStorage.getItem('ga_cfg') || '{}').archonDiff) || 'heroic';

        var fetchRoster = fetch(gBase + '/roster?t=' + Date.now()).then(function (r) { return r.json(); }).catch(function () { return null; });
        var fetchCfgData = fetch(gBase + '/cfg?t=' + Date.now()).then(function (r) { return r.json(); }).catch(function () { return null; });
        var fetchArchon = fetch(cfg.workerBase + '/api/archon/' + diff + '?t=' + Date.now()).then(function (r) { return r.text(); }).catch(function () { return null; });

        Promise.all([fetchRoster, fetchCfgData, fetchArchon]).then(function (results) {
            var rosterData = results[0];
            var cfgData = results[1];
            var archonText = results[2];

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

            updateHeader();

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

