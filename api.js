// ══════════════════════════════════════════════════════════
//  GUILDAUDIT — api.js
//  Blizzard API interaction + backend sync (multi-guild)
// ══════════════════════════════════════════════════════════

// ── Config — derived from URL ─────────────────────────────
// guild.html is served at /{region}/{realm}/{guild}
// GitHub Pages uses hash routing or path — we read from pathname
function getAPICfg() {
    // Supports two URL formats:
    // 1. ?guild=us/azralon/errow  (GitHub Pages)
    // 2. /us/azralon/errow        (custom domain with proper routing)
    var params     = new URLSearchParams(window.location.search);
    var guildParam = params.get('guild') || '';
    var region, realm, guild;

    if (guildParam) {
        var gp = guildParam.split('/').map(function(s){ return s.trim().toLowerCase(); });
        region = gp[0] || 'us';
        realm  = gp[1] || '';
        guild  = gp[2] || '';
    } else {
        // Fallback: try to read from pathname (custom domain with proper routing)
        var parts       = window.location.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
        var regionCodes = ['us','eu','kr','tw'];
        var ri          = parts.findIndex(function(p){ return regionCodes.includes(p.toLowerCase()); });
        if (ri >= 0) {
            region = parts[ri];
            realm  = parts[ri+1] || '';
            guild  = parts[ri+2] || '';
        }
        // No localStorage fallback — if no guild in URL, caller should redirect to landing
    }

    // Base path = repo subfolder (e.g. /wow-errow-audit)
    var pathParts = window.location.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
    var basePath  = pathParts.length >= 1 ? '/' + pathParts[0] : '';
    window._basePath = basePath;

    var workerBase = (localStorage.getItem('ga_worker') || 'https://midnight.victorscopel.workers.dev').replace(/\/+$/, '');

    return {
        workerBase: workerBase,
        basePath:   basePath,
        region:     (region || 'us').toLowerCase(),
        realm:      (realm  || '').toLowerCase().replace(/ /g, '-'),
        guild:      (guild  || '').toLowerCase().replace(/ /g, '-'),
        loc:        'en_US',
    };
}

function hasAPICfg() {
    var c = getAPICfg();
    return !!(c.workerBase && c.realm && c.guild);
}

// ── URL builders ──────────────────────────────────────────
function pbUrl(cfg) { return cfg.workerBase; }

function proxyUrl(cfg, url, token) {
    try { var u = new URL(url); u.searchParams.delete('access_token'); url = u.toString(); } catch (e) { }
    return pbUrl(cfg) + '?url=' + encodeURIComponent(url) + (token ? '&token=' + encodeURIComponent(token) : '');
}

function guildApiBase(cfg) {
    return pbUrl(cfg) + '/api/' + cfg.region + '/' + cfg.realm + '/' + cfg.guild;
}

function charUrl(cfg, realm, name, endpoint) {
    endpoint = endpoint || '';
    return 'https://' + cfg.region + '.api.blizzard.com/profile/wow/character/' +
        realm + '/' + name + endpoint + '?namespace=profile-' + cfg.region + '&locale=en_US';
}
function staticUrl(cfg, path) {
    return 'https://' + cfg.region + '.api.blizzard.com' + path + '?namespace=static-' + cfg.region + '&locale=en_US';
}
function profileUrl(cfg, path) {
    return 'https://' + cfg.region + '.api.blizzard.com' + path + '?namespace=profile-' + cfg.region + '&locale=en_US';
}

// ── Fetch helpers ─────────────────────────────────────────
async function getToken(cfg) {
    var r = await fetch(pbUrl(cfg) + '/api/token');
    if (!r.ok) throw new Error('Token failed: ' + r.status);
    var d = await r.json();
    if (!d.access_token) throw new Error('No access_token');
    return d.access_token;
}

async function apiFetch(cfg, url, token) {
    var r = await fetch(proxyUrl(cfg, url, token));
    return { ok: r.ok, status: r.status, json: r.ok ? await r.json().catch(function () { return null; }) : null };
}

function authHeaders() {
    var jwt = localStorage.getItem('ga_jwt') || '';
    return jwt ? { 'Authorization': 'Bearer ' + jwt } : {};
}

// ── Equipment parser ──────────────────────────────────────
function parseEquipment(equippedItems) {
    var gear = {};
    var issues = [];
    var tierSets = {};

    for (var i = 0; i < (equippedItems || []).length; i++) {
        var item = equippedItems[i];
        var slot = SLOT_MAP[item.slot?.type];
        if (!slot) continue;

        var enchanted     = (item.enchantments?.length || 0) > 0;
        var hasSockets    = (item.sockets?.length || 0) > 0;
        var socketsTotal  = hasSockets ? item.sockets.length : 0;
        var socketsFilled = hasSockets ? item.sockets.filter(function (s) { return s.item; }).length : 0;
        var gemmed        = hasSockets && (socketsFilled === socketsTotal);
        var limitCat      = item.limit_category || null;
        var isEmbellished = !!(limitCat && limitCat.toLowerCase().includes('embellish'));
        var isTierSet     = !!(item.set && item.set.item_set && item.set.item_set.id);

        // ── PvP tier set detection ────────────────────────────────────
        // Only applies to set items. Two signals are checked:
        // 1. The set has an "upgrades item level in Arenas and Battlegrounds" spell (most reliable)
        // 2. The set name contains known PvP set keywords (fallback)
        var isPvP = false;
        if (isTierSet && item.set) {
            // Signal 1: spells that specifically mention "Arenas e Campos de Batalha" / "Arenas and Battlegrounds"
            // This is the exact text from the tooltip: "Equipar: aumenta o nível do item para um mínimo de X em Arenas e Campos de Batalha"
            var spellText = (item.spells || []).map(function(s) {
                return ((s.description || '')).toLowerCase();
            }).join(' ');
            var hasPvPUpgradeSpell = spellText.includes('arenas') && (
                spellText.includes('campos de batalha') || spellText.includes('battlegrounds') || spellText.includes('battleground')
            );

            // Signal 2: set name keywords for PvP sets across all regions/languages
            var setName = (item.set.item_set.name || '').toLowerCase();
            var hasPvPSetName = (
                setName.includes('gladiator') || setName.includes('combatant') ||
                setName.includes('aspirant')  || setName.includes('rival') ||
                setName.includes('challenger')|| setName.includes('warmonger') ||
                setName.includes('fomentador')|| setName.includes('gladiador') ||
                setName.includes('combatente')|| setName.includes('desafiante') ||
                setName.includes('contendor')
            );

            isPvP = hasPvPUpgradeSpell || hasPvPSetName;
            // PvP sets must NOT count as PvE raid tier sets
            if (isPvP) isTierSet = false;
        }

        if (isTierSet && item.set) {
            var setId = item.set.item_set.id;
            if (!tierSets[setId]) {
                tierSets[setId] = {
                    name: item.set.item_set.name || '',
                    effects: (item.set.effects || []).map(function (e) { return { required: e.required_count || 0 }; }),
                };
            }
        }

        gear[slot] = {
            name: item.name,
            ilvl: item.level?.value,
            quality: item.quality?.type?.toLowerCase(),
            enchanted: enchanted,
            gemmed: gemmed,
            hasSockets: hasSockets,
            socketsTotal: socketsTotal,
            socketsFilled: socketsFilled,
            itemId: item.item?.id || null,
            iconSlug: null,
            mediaUrl: item.media?.key?.href || null,
            enchantIds: (item.enchantments || []).map(function (e) { return e.enchantment_id; }).filter(Boolean),
            gemIds: (item.sockets || []).filter(function (s) { return s.item; }).map(function (s) { return s.item.id; }),
            bonusIds: item.bonus_list || [],
            limitCategory: limitCat,
            isEmbellished: isEmbellished,
            isTierSet: isTierSet,
            isPvP: isPvP,
            pvpSetName: isPvP && item.set ? (item.set.item_set.name || '') : '',
        };

        if (ENCHANTABLE.includes(slot) && !enchanted)
            issues.push(slot + ':missing_enchant');
        if (hasSockets && !gemmed)
            issues.push(slot + ':missing_gem:' + socketsFilled + '_' + socketsTotal);
    }

    var embCount = Object.values(gear).filter(function (g) { return g && g.isEmbellished; }).length;
    if (embCount === 0)      issues.push('embellishment:none');
    else if (embCount === 1) issues.push('embellishment:only_one');

    var ARMOR_TIER_SLOTS = ['head', 'shoulder', 'chest', 'hands', 'legs'];
    var equipped = ARMOR_TIER_SLOTS.filter(function (s) { return gear[s] && gear[s].isTierSet; }).length;
    if (equipped > 0) {
        var missing = Math.max(0, 4 - equipped);
        if (missing > 0) issues.push('tierset:' + equipped + ':' + missing);
    }

    return { gear: gear, issues: issues };
}

// ── Item icons ────────────────────────────────────────────
async function fetchItemIcons(cfg, token) {
    var allItems = {};
    roster.forEach(function (c) {
        Object.values(c.gear || {}).forEach(function (item) {
            if (item?.itemId && !item.iconSlug) allItems[item.itemId] = true;
        });
    });
    var ids = Object.keys(allItems);
    if (!ids.length) return;
    if (!window.iconMap) window.iconMap = {};
    var batchSize = 8;
    for (var i = 0; i < ids.length; i += batchSize) {
        var batch = ids.slice(i, i + batchSize);
        await Promise.all(batch.map(async function (id) {
            if (window.iconMap[id]) return;
            try {
                var res = await apiFetch(cfg, staticUrl(cfg, '/data/wow/media/item/' + id), token);
                if (res.ok && res.json?.assets) {
                    var asset = res.json.assets.find(function (a) { return a.key === 'icon'; });
                    if (asset) window.iconMap[id] = asset.value;
                }
            } catch (e) { }
        }));
        if (i + batchSize < ids.length) await new Promise(function (r) { setTimeout(r, 100); });
    }
    var changed = false;
    roster.forEach(function (c) {
        Object.values(c.gear || {}).forEach(function (item) {
            if (item?.itemId && window.iconMap[item.itemId] && item.iconSlug !== window.iconMap[item.itemId]) {
                item.iconSlug = window.iconMap[item.itemId];
                changed = true;
            }
        });
    });
    if (changed) {
        saveRoster();
        if (typeof renderAll === 'function') renderAll();
    }
}

async function fetchCharMedia(cfg, token, realm, name) {
    var endpoints = ['/character-media', '/media'];
    for (var i = 0; i < endpoints.length; i++) {
        try {
            var res = await apiFetch(cfg, charUrl(cfg, realm, name, endpoints[i]), token);
            if (res.ok && res.json?.assets) {
                var main = res.json.assets.find(function (a) { return a.key === 'main-raw'; }) ||
                           res.json.assets.find(function (a) { return a.key === 'main'; }) ||
                           res.json.assets.find(function (a) { return a.key === 'inset'; });
                if (main) return main.value;
            }
        } catch (e) { }
    }
    return null;
}

async function fetchAllCharMedia(cfg, token) {
    var changed = false;
    for (var i = 0; i < roster.length; i++) {
        var c = roster[i];
        if (c.renderUrl) continue;
        var url = await fetchCharMedia(cfg, token, c.realm || cfg.realm, c.name.toLowerCase());
        if (url) { c.renderUrl = url; changed = true; }
        if (i % 3 === 2) await new Promise(function (r) { setTimeout(r, 150); });
    }
    if (changed) { saveRoster(); if (typeof renderAll === 'function') renderAll(); }
}

// ── Talent parser (shared) ────────────────────────────────
function parseTalents(specJson) {
    if (!specJson) return null;
    var activeSpec = specJson.active_specialization;
    var specs      = specJson.specializations || [];
    var activeTree = specs.find(function (sp) {
        return sp.specialization && activeSpec && sp.specialization.id === activeSpec.id;
    });
    if (!activeTree || !activeTree.loadouts || !activeTree.loadouts.length) return null;
    var loadout = activeTree.loadouts.find(function (l) { return l.is_active; }) || activeTree.loadouts[0];
    function mapNodes(arr) {
        var seen = {};
        return (arr || []).map(function (n) {
            return {
                id: n.id, rank: n.rank || 1,
                name: n.tooltip?.talent?.name || n.tooltip?.spell_tooltip?.spell?.name || '',
                spellId: n.tooltip?.spell_tooltip?.spell?.id || null,
            };
        }).filter(function (t) {
            if (!t.name || t.name === '?' || !t.spellId) return false;
            if (seen[t.id]) return false;
            seen[t.id] = true;
            return true;
        });
    }
    var sht          = loadout.selected_hero_talent_tree;
    var heroTreeName = sht ? (sht.hero_talent_tree?.name || sht.name || null) : null;
    return {
        exportString: loadout.talent_loadout_code || '',
        class:    mapNodes(loadout.selected_class_talents),
        spec:     mapNodes(loadout.selected_spec_talents),
        hero:     mapNodes(loadout.selected_hero_talents),
        heroTree: heroTreeName,
    };
}

function parseStats(s) {
    if (!s) return null;
    return {
        stamina:      s.stamina?.effective || 0,
        intellect:    s.intellect?.effective || 0,
        strength:     s.strength?.effective || 0,
        agility:      s.agility?.effective || 0,
        crit:         s.melee_crit?.value || s.ranged_crit?.value || s.spell_crit?.value || 0,
        critRating:   s.melee_crit?.rating_normalized || s.melee_crit?.rating || s.ranged_crit?.rating_normalized || s.ranged_crit?.rating || s.spell_crit?.rating_normalized || s.spell_crit?.rating || 0,
        haste:        s.melee_haste?.value || s.ranged_haste?.value || s.spell_haste?.value || 0,
        hasteRating:  s.melee_haste?.rating_normalized || s.melee_haste?.rating || s.ranged_haste?.rating_normalized || s.ranged_haste?.rating || s.spell_haste?.rating_normalized || s.spell_haste?.rating || 0,
        mastery:      s.mastery?.value || 0,
        masteryRating:s.mastery?.rating_normalized || s.mastery?.rating || 0,
        versatility:  s.versatility_damage_done_bonus || 0,
        versRating:   s.versatility || 0,
        versDR:       s.versatility_damage_taken_reduction_bonus || 0,
    };
}

// ── Skeleton loader ───────────────────────────────────────
function showImportSkeleton() {
    var el = document.getElementById('rosterTable');
    if (!el) return;
    var rows = '';
    for (var i = 0; i < 8; i++) {
        rows += '<div class="skeleton-row">' +
            '<div class="skeleton-block" style="width:16px;height:16px;border-radius:2px"></div>' +
            '<div class="skeleton-block" style="width:' + (80 + Math.random() * 60) + 'px;height:12px"></div>' +
            '<div style="flex:1"></div>' +
            '<div class="skeleton-block" style="width:40px;height:12px"></div>' +
            '</div>';
    }
    el.innerHTML = rows;
}

// ── Full guild fetch (import) ─────────────────────────────
async function fetchAPI(silent) {
    if (silent === undefined) silent = false;
    if (!silent) { alog = []; var logEl = document.getElementById('alog'); if (logEl) logEl.innerHTML = ''; }
    var cfg = getAPICfg();
    if (!cfg.workerBase || !cfg.realm || !cfg.guild) {
        if (!silent) lg('❌ Guild não encontrada na URL.', 'err');
        return;
    }
    var btn = document.getElementById('btnRefresh');
    if (btn) { btn.textContent = '↻ Atualizando...'; btn.disabled = true; }
    if (silent) showImportSkeleton();
    sprog(5);
    try {
        if (!silent) lg('Obtendo token...', 'info');
        var token = await getToken(cfg);
        sprog(12);

        if (!silent) lg('Buscando roster de "' + cfg.guild + '"...', 'info');
        var guildRes = await apiFetch(cfg, profileUrl(cfg, '/data/wow/guild/' + cfg.realm + '/' + cfg.guild + '/roster'), token);
        if (!guildRes.ok) throw new Error('Guilda não encontrada (' + guildRes.status + '). Verifique realm e nome.');

        var members = (guildRes.json.members || []).filter(function (m) { return m.rank <= 2; });
        if (!silent) lg(members.length + ' membros (rank 0–2) encontrados.', 'ok');
        sprog(18);

        var results = [];
        for (var i = 0; i < members.length; i++) {
            var m        = members[i];
            var charRealm = (m.character.realm?.slug || cfg.realm).toLowerCase();
            var cn        = m.character.name.toLowerCase();
            try {
                var fetches = await Promise.all([
                    apiFetch(cfg, charUrl(cfg, charRealm, cn, '/equipment'), token),
                    apiFetch(cfg, charUrl(cfg, charRealm, cn), token),
                    apiFetch(cfg, charUrl(cfg, charRealm, cn, '/mythic-keystone-profile'), token),
                    apiFetch(cfg, charUrl(cfg, charRealm, cn, '/statistics'), token),
                    apiFetch(cfg, charUrl(cfg, charRealm, cn, '/specializations'), token),
                ]);
                var eqR = fetches[0], sumR = fetches[1], mpR = fetches[2], statsR = fetches[3], specR = fetches[4];
                if (!sumR.ok) {
                    if (!silent) lg('⚠ ' + m.character.name + ': perfil não encontrado', 'warn');
                    continue;
                }
                var sum      = sumR.json;
                var parsed   = parseEquipment(eqR.json?.equipped_items);
                var charClass = normalizeClass(sum.character_class?.name) || normalizeClass(m.character.playable_class?.name) || '?';
                var specId   = sum.active_spec?.id;
                var specName = sum.active_spec?.name || '?';
                var role     = inferRoleFromSpecId(specId) || inferRoleFromSpecName(specName);
                var existing = roster.find(function (x) {
                    return x.name.toLowerCase() === (sum.name || m.character.name).toLowerCase() && x.realm === charRealm;
                });

                results.push({
                    name:         sum.name || m.character.name,
                    realm:        charRealm,
                    guild:        guildRes.json.guild?.name || cfg.guild,
                    class:        charClass,
                    spec:         specName,
                    specId:       specId,
                    role:         existing?.role || role,
                    note:         existing?.note || '',
                    ilvl:         sum.equipped_item_level || sum.average_item_level,
                    mythicRating: mpR.ok ? (mpR.json?.current_mythic_rating?.rating | 0) || null : null,
                    vault:        mpR.ok && mpR.json ? { mythic: mpR.json.current_period?.best_runs?.length || 0, raid: 0, world: 0 } : null,
                    gear:         parsed.gear,
                    issues:       parsed.issues,
                    stats:        parseStats(statsR.ok ? statsR.json : null),
                    talents:      parseTalents(specR.ok ? specR.json : null),
                    renderUrl:    existing?.renderUrl || null,
                    lastUpdated:  new Date().toISOString(),
                    customizations: [],
                });
                if (!silent) lg('✓ ' + (sum.name || m.character.name) + ' — iLvl ' + (sum.equipped_item_level || '?') + ' [' + specName + '] — ' + parsed.issues.length + ' issues', 'ok');
            } catch (e) {
                if (!silent) lg('✗ ' + m.character.name + ': ' + e.message, 'err');
            }
            sprog(18 + Math.round((i + 1) / members.length * 75));
        }

        sprog(95);
        // Preserve existing icon slugs
        var oldRoster = roster.slice();
        roster = results;
        roster.forEach(function (c) {
            Object.entries(c.gear || {}).forEach(function (entry) {
                var item = entry[1];
                if (!item) return;
                for (var oi = 0; oi < oldRoster.length; oi++) {
                    var oldItem = (oldRoster[oi].gear || {})[entry[0]];
                    if (oldItem && oldItem.itemId === item.itemId && oldItem.iconSlug)
                        item.iconSlug = oldItem.iconSlug;
                }
            });
        });

        if (!silent) lg('Baixando ícones...', 'info');
        try { await fetchItemIcons(cfg, await getToken(cfg)); } catch (e) { }

        sprog(100);
        saveRoster();
        renderAll();
        if (!silent) { notify(results.length + ' membros importados!'); lg('✅ Concluído: ' + results.length, 'ok'); }
        else          notify('↻ ' + results.length + ' membros atualizados');

        getToken(cfg).then(function (tok) { fetchAllCharMedia(cfg, tok); }).catch(function () { });

    } catch (e) {
        if (!silent) lg('❌ ' + e.message, 'err');
        else notify('Erro ao atualizar: ' + e.message);
        sprog(0);
    } finally {
        if (btn) { btn.textContent = '↻ ' + T('refresh'); btn.disabled = false; }
    }
}

// ── Incremental refresh (existing roster) ────────────────
async function refreshExisting(force) {
    var cfg = getAPICfg();
    if (!cfg.workerBase || window._perm === 'guest') return;
    if (!force && roster.length > 0 && roster[0].lastUpdated) {
        var diffMin = (Date.now() - new Date(roster[0].lastUpdated).getTime()) / 60000;
        if (diffMin < 15) return;
    }
    var btn = document.getElementById('btnRefresh');
    if (btn) { btn.textContent = '↻ ...'; btn.disabled = true; }
    var token = await getToken(cfg).catch(function () { return null; });
    if (!token) { if (btn) { btn.textContent = '↻ ' + T('refresh'); btn.disabled = false; } return; }
    try {
        var updated = 0;
        for (var i = 0; i < roster.length; i++) {
            var c         = roster[i];
            var charRealm = (c.realm || cfg.realm).toLowerCase();
            var cn        = c.name.toLowerCase();
            try {
                var fetches = await Promise.all([
                    apiFetch(cfg, charUrl(cfg, charRealm, cn, '/equipment'), token),
                    apiFetch(cfg, charUrl(cfg, charRealm, cn), token),
                    apiFetch(cfg, charUrl(cfg, charRealm, cn, '/mythic-keystone-profile'), token),
                    apiFetch(cfg, charUrl(cfg, charRealm, cn, '/statistics'), token),
                    apiFetch(cfg, charUrl(cfg, charRealm, cn, '/specializations'), token),
                ]);
                var eqR = fetches[0], sumR = fetches[1], mpR = fetches[2], statsR = fetches[3], specR = fetches[4];
                if (!sumR.ok) continue;
                var sum    = sumR.json;
                var parsed = parseEquipment(eqR.json?.equipped_items);
                // Preserve icon slugs
                Object.entries(parsed.gear || {}).forEach(function (entry) {
                    var item    = entry[1];
                    var oldItem = (c.gear || {})[entry[0]];
                    if (item && !item.iconSlug && oldItem && oldItem.itemId === item.itemId && oldItem.iconSlug)
                        item.iconSlug = oldItem.iconSlug;
                });
                c.class       = normalizeClass(sum.character_class?.name) || c.class;
                c.spec        = sum.active_spec?.name || c.spec;
                c.specId      = sum.active_spec?.id   || c.specId;
                c.ilvl        = sum.equipped_item_level || sum.average_item_level || c.ilvl;
                c.gear        = parsed.gear;
                c.issues      = parsed.issues;
                c.lastUpdated = new Date().toISOString();
                c.customizations = [];
                if (mpR.ok && mpR.json) {
                    c.mythicRating = (mpR.json.current_mythic_rating?.rating | 0) || c.mythicRating;
                    c.vault        = { mythic: mpR.json.current_period?.best_runs?.length || 0, raid: 0, world: 0 };
                }
                c.stats   = parseStats(statsR.ok ? statsR.json : null) || c.stats;
                c.talents = parseTalents(specR.ok ? specR.json : null) || c.talents;
                if (!c.renderUrl) {
                    var rUrl = await fetchCharMedia(cfg, token, charRealm, cn);
                    if (rUrl) c.renderUrl = rUrl;
                }
                updated++;
            } catch (e) { }
        }
        try { await fetchItemIcons(cfg, await getToken(cfg)); } catch (e) { }
        saveRoster();
        renderAll();
        notify('↻ ' + updated + ' ' + T('updated'));
    } catch (e) {
        notify('Erro: ' + e.message);
    } finally {
        if (btn) { btn.textContent = '↻ ' + T('refresh'); btn.disabled = false; }
    }
}

// ── Add single character ──────────────────────────────────
async function trackChar() {
    var name  = document.getElementById('add-n').value.trim().toLowerCase();
    var realm = (document.getElementById('add-r').value.trim() || '').toLowerCase().replace(/ /g, '-');
    var cfg   = getAPICfg();
    realm     = realm || cfg.realm;
    if (!name) { notify('Digite um nome.'); return; }
    if (!cfg.workerBase) { notify('Worker não configurado.'); return; }
    try {
        var token   = await getToken(cfg);
        var fetches = await Promise.all([
            apiFetch(cfg, charUrl(cfg, realm, name, '/equipment'), token),
            apiFetch(cfg, charUrl(cfg, realm, name), token),
            apiFetch(cfg, charUrl(cfg, realm, name, '/mythic-keystone-profile'), token),
            apiFetch(cfg, charUrl(cfg, realm, name, '/statistics'), token),
            apiFetch(cfg, charUrl(cfg, realm, name, '/specializations'), token),
        ]);
        var eqR = fetches[0], sumR = fetches[1], mpR = fetches[2], statsR = fetches[3], specR = fetches[4];
        if (!sumR.ok) { notify('"' + name + '" não encontrado.'); return; }
        var sum       = sumR.json;
        var charRealm = sum.realm?.slug || realm;
        var parsed    = parseEquipment(eqR.json?.equipped_items);
        var specId    = sum.active_spec?.id;
        var specName  = sum.active_spec?.name || '?';
        var role      = inferRoleFromSpecId(specId) || inferRoleFromSpecName(specName);
        var renderUrl = await fetchCharMedia(cfg, token, charRealm, name);
        var existingIdx = roster.findIndex(function (x) {
            return x.name.toLowerCase() === (sum.name || name).toLowerCase() && x.realm === charRealm;
        });
        var entry = {
            name: sum.name || name, realm: charRealm, guild: cfg.guild,
            class: normalizeClass(sum.character_class?.name) || '?',
            spec: specName, specId: specId, role: role, note: '',
            ilvl: sum.equipped_item_level,
            mythicRating: mpR.ok ? (mpR.json?.current_mythic_rating?.rating | 0) || null : null,
            vault:    mpR.ok && mpR.json ? { mythic: mpR.json.current_period?.best_runs?.length || 0, raid: 0, world: 0 } : null,
            gear:     parsed.gear, issues: parsed.issues,
            stats:    parseStats(statsR.ok ? statsR.json : null),
            talents:  parseTalents(specR.ok ? specR.json : null),
            renderUrl: renderUrl, customizations: [], lastUpdated: new Date().toISOString(),
        };
        if (existingIdx >= 0) {
            entry.role = roster[existingIdx].role;
            entry.note = roster[existingIdx].note;
            roster[existingIdx] = entry;
            notify(entry.name + ' atualizado!');
        } else {
            roster.push(entry);
            notify(entry.name + ' adicionado!');
        }
        saveRoster(); renderAll();
        document.getElementById('add-n').value = '';
    } catch (e) { notify('Erro: ' + e.message); }
}

// ── Backend KV sync ───────────────────────────────────────
async function loadBackendRoster() {
    var cfg = getAPICfg();
    if (!cfg.workerBase || !cfg.realm || !cfg.guild) return;
    try {
        var r = await fetch(guildApiBase(cfg) + '/roster?t=' + Date.now());
        if (r.ok) {
            var data = await r.json();
            if (Array.isArray(data) && data.length) {
                roster = data;
                lss('ga_data', JSON.stringify(roster));
                renderAll();
                getToken(cfg).then(function (tok) {
                    fetchItemIcons(cfg, tok);
                    fetchAllCharMedia(cfg, tok);
                }).catch(function () { });
            }
        }
    } catch (e) { }
}

async function saveRosterKV() {
    var cfg = getAPICfg();
    var jwt = localStorage.getItem('ga_jwt') || '';
    if (!cfg.workerBase || !jwt || !hasPerm('officer')) return;
    fetch(guildApiBase(cfg) + '/roster', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
        body: JSON.stringify(roster),
    }).catch(function () { });
}

async function loadBackendCfg() {
    var cfg = getAPICfg();
    if (!cfg.workerBase || !cfg.realm || !cfg.guild) return;
    try {
        var r = await fetch(guildApiBase(cfg) + '/cfg?t=' + Date.now());
        if (r.ok) {
            var data = await r.json();
            if (data && typeof data === 'object') {
                CFG = Object.assign({}, CFG, data);
                lss('ga_cfg', JSON.stringify(CFG));
                ['si', 'sv', 'sr', 'sn', 'ar'].forEach(function (k) {
                    var el = document.getElementById('cfg-' + k);
                    if (el) el.checked = !!CFG[k];
                });
                var imEl = document.getElementById('cfg-ilvlMin');
                if (imEl) imEl.value = CFG.ilvlMin || 0;
                renderAll();
                setupAR();
            }
        }
    } catch (e) { }
}

async function saveCfgKV() {
    var cfg = getAPICfg();
    var jwt = localStorage.getItem('ga_jwt') || '';
    if (!cfg.workerBase || !jwt || !hasPerm('officer')) return;
    fetch(guildApiBase(cfg) + '/cfg', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
        body: JSON.stringify(CFG),
    }).catch(function () { });
}

// Archon: loaded globally, no guild prefix
async function loadArchonStats() {
    var cfg  = getAPICfg();
    var diff = (CFG.archonDiff || 'heroic');
    try {
        var r = await fetch(pbUrl(cfg) + '/api/archon/' + diff + '?t=' + Date.now());
        if (r.ok) {
            var text = await r.text();
            CFG.archon = text || '';
            lss('ga_cfg', JSON.stringify(CFG));
            var el = document.getElementById('cfg-archon');
            if (el) el.value = text || '';
            if (typeof updateArchonStatus === 'function') updateArchonStatus(text);
        }
    } catch (e) { }
}
