// ══════════════════════════════════════════════════════════
//  GUILDAUDIT — api.js
//  Blizzard API interaction + background fetchers
// ══════════════════════════════════════════════════════════

function getAPICfg() {
    var saved = JSON.parse(localStorage.getItem('ga_api') || '{}');
    return {
        proxy: (document.getElementById('cfg-proxy')?.value?.trim() || saved.proxy || 'https://midnight.victorscopel.workers.dev'),
        reg: (document.getElementById('cfg-reg')?.value || saved.reg || 'us'),
        loc: 'en_US',
        realm: ((document.getElementById('imp-realm')?.value || document.getElementById('cfg-realm')?.value || saved.realm || 'azralon').trim().toLowerCase().replace(/ /g, '-')),
        guild: ((document.getElementById('imp-guild')?.value || document.getElementById('cfg-guild')?.value || saved.guild || 'errow').trim().toLowerCase().replace(/ /g, '-')),
    };
}

function hasAPICfg() {
    var c = getAPICfg();
    return !!(c.proxy && c.realm && c.guild);
}

function pbUrl(proxy) { return proxy.replace(/\/+$/, ''); }

function proxyUrl(proxy, url, token) {
    try { var u = new URL(url); u.searchParams.delete('access_token'); url = u.toString(); } catch (e) { }
    return pbUrl(proxy) + '?url=' + encodeURIComponent(url) + '&token=' + encodeURIComponent(token);
}

async function getToken(cfg) {
    var jwt = localStorage.getItem('ga_jwt') || '';
    var headers = jwt ? { 'Authorization': 'Bearer ' + jwt } : {};
    var r = await fetch(pbUrl(cfg.proxy) + '/api/token', { headers: headers });
    if (!r.ok) throw new Error('Token failed: ' + r.status);
    var d = await r.json();
    if (d.error) throw new Error(d.error);
    if (!d.access_token) throw new Error('No access_token in response');
    return d.access_token;
}

async function apiFetch(cfg, url, token) {
    var r = await fetch(proxyUrl(cfg.proxy, url, token));
    return { ok: r.ok, status: r.status, json: r.ok ? await r.json().catch(function () { return null; }) : null };
}

function charUrl(cfg, realm, name, endpoint) {
    endpoint = endpoint || '';
    return 'https://' + cfg.reg + '.api.blizzard.com/profile/wow/character/' + realm + '/' + name + endpoint + '?namespace=profile-' + cfg.reg + '&locale=en_US';
}
function staticUrl(cfg, path) {
    return 'https://' + cfg.reg + '.api.blizzard.com' + path + '?namespace=static-' + cfg.reg + '&locale=en_US';
}
function profileUrl(cfg, path) {
    return 'https://' + cfg.reg + '.api.blizzard.com' + path + '?namespace=profile-' + cfg.reg + '&locale=en_US';
}

function parseEquipment(equippedItems) {
    var gear = {};
    var issues = [];
    for (var i = 0; i < (equippedItems || []).length; i++) {
        var item = equippedItems[i];
        var slot = SLOT_MAP[item.slot?.type];
        if (!slot) continue;
        var enchanted = (item.enchantments?.length || 0) > 0;
        var hasSockets = (item.sockets?.length || 0) > 0;
        var gemmed = hasSockets && (item.sockets || []).every(function (s) { return s.item; });
        var mediaHref = item.media?.key?.href || null;
        gear[slot] = {
            name: item.name,
            ilvl: item.level?.value,
            quality: item.quality?.type?.toLowerCase(),
            enchanted: enchanted,
            gemmed: gemmed,
            hasSockets: hasSockets,
            itemId: item.item?.id || null,
            iconSlug: null,
            mediaUrl: mediaHref,
            enchantIds: (item.enchantments || []).map(function (e) { return e.enchantment_id; }).filter(Boolean),
            gemIds: (item.sockets || []).filter(function (s) { return s.item; }).map(function (s) { return s.item.id; }),
            bonusIds: item.bonus_list || [],
        };
        if (ENCHANTABLE.includes(slot) && !enchanted)
            issues.push(slot + ':missing_enchant');
        if (hasSockets && !gemmed)
            issues.push(slot + ':missing_gem');
    }
    return { gear: gear, issues: issues };
}

async function fetchItemIcons(cfg, token) {
    var allItems = {};
    roster.forEach(function (c) {
        Object.values(c.gear || {}).forEach(function (item) {
            if (item?.itemId && !item.iconSlug) allItems[item.itemId] = true;
        });
    });

    var ids = Object.keys(allItems);
    if (!ids.length) return;

    var iconMap = {};
    for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        try {
            var res = await apiFetch(cfg, staticUrl(cfg, '/data/wow/media/item/' + id), token);
            if (res.ok && res.json?.assets) {
                var asset = res.json.assets.find(function (a) { return a.key === 'icon'; });
                if (asset) iconMap[id] = asset.value;
            }
        } catch (e) { }
        if (i % 5 === 4) await new Promise(function (r) { setTimeout(r, 100); });
    }

    var changed = false;
    roster.forEach(function (c) {
        Object.values(c.gear || {}).forEach(function (item) {
            if (item?.itemId && iconMap[item.itemId]) {
                item.iconSlug = iconMap[item.itemId];
                changed = true;
            }
        });
    });
    if (changed) {
        saveRoster();
        var cpId = document.getElementById('charPage')?.dataset?.charId;
        if (cpId) renderCharPage(cpId);
    }
}

async function fetchCharMedia(cfg, token, realm, name) {
    try {
        var res = await apiFetch(cfg, charUrl(cfg, realm, name, '/character-media'), token);
        if (res.ok && res.json?.assets) {
            var main = res.json.assets.find(function (a) { return a.key === 'main-raw'; });
            if (!main) main = res.json.assets.find(function (a) { return a.key === 'main'; });
            if (!main) main = res.json.assets.find(function (a) { return a.key === 'inset'; });
            if (main) return main.value;
        }
    } catch (e) { }
    return null;
}

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

async function fetchAPI(silent) {
    if (silent === undefined) silent = false;
    if (!silent) { alog = []; var logEl = document.getElementById('alog'); if (logEl) logEl.innerHTML = ''; }
    var cfg = getAPICfg();
    if (!cfg.proxy || !cfg.realm || !cfg.guild) {
        if (!silent) lg('❌ Configure a API nas Configurações.', 'err');
        return;
    }
    var btn = document.getElementById('btnRefresh');
    btn.textContent = '↻ Atualizando...'; btn.disabled = true;
    if (silent) showImportSkeleton();
    sprog(5);
    try {
        if (!silent) lg('Obtendo token...', 'info');
        var token = await getToken(cfg);
        sprog(12);

        if (!silent) lg('Buscando roster de "' + cfg.guild + '"...', 'info');
        var guildRes = await apiFetch(cfg, profileUrl(cfg, '/data/wow/guild/' + cfg.realm + '/' + cfg.guild + '/roster'), token);
        if (!guildRes.ok) throw new Error('Guilda não encontrada (' + guildRes.status + '). Verifique realm e nome.');

        var members = guildRes.json.members.filter(function (m) { return m.rank <= 2; });
        if (!silent) lg(members.length + ' membros (rank 0–2) encontrados.', 'ok');
        sprog(18);

        var results = [];
        for (var i = 0; i < members.length; i++) {
            var m = members[i];
            var charRealm = (m.character.realm?.slug || cfg.realm).toLowerCase();
            var cn = m.character.name.toLowerCase();
            try {
                var fetches = await Promise.all([
                    apiFetch(cfg, charUrl(cfg, charRealm, cn, '/equipment'), token),
                    apiFetch(cfg, charUrl(cfg, charRealm, cn), token),
                    apiFetch(cfg, charUrl(cfg, charRealm, cn, '/mythic-keystone-profile'), token),
                ]);
                var eqR = fetches[0], sumR = fetches[1], mpR = fetches[2];

                if (!sumR.ok) {
                    if (!silent) lg('⚠ ' + m.character.name + ' (' + charRealm + '): perfil não encontrado', 'warn');
                    continue;
                }

                var sum = sumR.json;
                var parsed = parseEquipment(eqR.json?.equipped_items);

                var charClassEN = normalizeClass(sum.character_class?.name) ||
                    normalizeClass(m.character.playable_class?.name) || '?';
                var specId = sum.active_spec?.id;
                var specName = sum.active_spec?.name || '?';
                var role = inferRoleFromSpecId(specId) || inferRoleFromSpecName(specName);

                var vault = null;
                if (mpR.ok && mpR.json) {
                    vault = {
                        mythic: mpR.json.current_period?.best_runs?.length || 0,
                        raid: 0,
                        world: 0,
                    };
                }

                var existing = roster.find(function (x) {
                    return x.name.toLowerCase() === (sum.name || m.character.name).toLowerCase() &&
                        x.realm === charRealm;
                });

                results.push({
                    name: sum.name || m.character.name,
                    realm: charRealm,
                    guild: guildRes.json.guild?.name || cfg.guild,
                    class: charClassEN,
                    spec: specName,
                    specId: specId,
                    role: existing?.role || role,
                    note: existing?.note || '',
                    ilvl: sum.equipped_item_level || sum.average_item_level,
                    mythicRating: mpR.ok ? (mpR.json?.current_mythic_rating?.rating | 0) || null : null,
                    vault: vault,
                    gear: parsed.gear,
                    issues: parsed.issues,
                    renderUrl: existing?.renderUrl || null,
                    lastUpdated: new Date().toISOString(),
                });

                if (!silent) lg('✓ ' + (sum.name || m.character.name) + ' (' + charRealm + ') — iLvl ' + (sum.equipped_item_level || '?') + ' [' + specName + '→' + role + '] — ' + parsed.issues.length + ' issues', 'ok');
            } catch (e) {
                if (!silent) lg('✗ ' + m.character.name + ': ' + e.message, 'err');
            }
            sprog(18 + Math.round((i + 1) / members.length * 75));
        }

        sprog(95);
        var oldRoster = roster.slice();
        roster = results;

        roster.forEach(function (c) {
            Object.entries(c.gear || {}).forEach(function (entry) {
                var item = entry[1];
                if (!item || item.iconSlug) return;
                for (var oi = 0; oi < (oldRoster || []).length; oi++) {
                    var oldItem = (oldRoster[oi].gear || {})[entry[0]];
                    if (oldItem && oldItem.itemId === item.itemId && oldItem.iconSlug) {
                        item.iconSlug = oldItem.iconSlug;
                        break;
                    }
                }
            });
        });

        if (!silent) lg('Baixando ícones dos itens...', 'info');
        try {
            var itoken = await getToken(cfg);
            await fetchItemIcons(cfg, itoken);
        } catch (e) { }
        sprog(100);
        saveRoster();
        renderAll();
        if (!silent) {
            notify(results.length + ' membros importados!');
            lg('\n✅ Concluído: ' + results.length + ' personagens.', 'ok');
        } else {
            notify('↻ ' + results.length + ' membros atualizados');
        }

        getToken(cfg).then(function (tok) {
            fetchAllCharMedia(cfg, tok);
        }).catch(function () { });

    } catch (e) {
        if (!silent) lg('❌ ' + e.message, 'err');
        else notify('Erro ao atualizar: ' + e.message);
        sprog(0);
    } finally {
        btn.textContent = '↻ Atualizar';
        btn.disabled = false;
    }
}

async function refreshExisting() {
    var cfg = getAPICfg();
    if (!cfg.proxy) return;
    if (window._perm === 'guest') return;

    if (roster.length > 0 && roster[0].lastUpdated) {
        var lu = new Date(roster[0].lastUpdated).getTime();
        var diffMinutes = (Date.now() - lu) / 60000;
        if (diffMinutes < 15) return;
    }

    var btn = document.getElementById('btnRefresh');
    if (btn) { btn.textContent = '↻ ...'; btn.disabled = true; }

    var token = await getToken(cfg).catch(function () { return null; });
    if (!token) {
        if (btn) { btn.textContent = '↻ ' + T('refresh'); btn.disabled = false; }
        return;
    }
    try {
        var updated = 0;
        for (var i = 0; i < roster.length; i++) {
            var c = roster[i];
            var charRealm = (c.realm || cfg.realm).toLowerCase();
            var cn = c.name.toLowerCase();
            try {
                var fetches = await Promise.all([
                    apiFetch(cfg, charUrl(cfg, charRealm, cn, '/equipment'), token),
                    apiFetch(cfg, charUrl(cfg, charRealm, cn), token),
                    apiFetch(cfg, charUrl(cfg, charRealm, cn, '/mythic-keystone-profile'), token),
                ]);
                var eqR = fetches[0], sumR = fetches[1], mpR = fetches[2];
                if (!sumR.ok) continue;
                var sum = sumR.json;
                var parsed = parseEquipment(eqR.json?.equipped_items);
                Object.entries(parsed.gear || {}).forEach(function (entry) {
                    var item = entry[1];
                    if (!item || item.iconSlug) return;
                    var oldItem = (c.gear || {})[entry[0]];
                    if (oldItem && oldItem.itemId === item.itemId && oldItem.iconSlug) {
                        item.iconSlug = oldItem.iconSlug;
                    }
                });
                c.class = normalizeClass(sum.character_class?.name) || c.class;
                c.spec = sum.active_spec?.name || c.spec;
                c.specId = sum.active_spec?.id || c.specId;
                c.ilvl = sum.equipped_item_level || sum.average_item_level || c.ilvl;
                c.gear = parsed.gear;
                c.issues = parsed.issues;
                c.lastUpdated = new Date().toISOString();
                if (mpR.ok && mpR.json) {
                    c.mythicRating = (mpR.json.current_mythic_rating?.rating | 0) || c.mythicRating;
                    c.vault = { mythic: mpR.json.current_period?.best_runs?.length || 0, raid: 0, world: 0 };
                }
                if (!c.renderUrl) {
                    var rUrl = await fetchCharMedia(cfg, token, charRealm, cn);
                    if (rUrl) c.renderUrl = rUrl;
                }
                updated++;
            } catch (e) { }
        }
        try { var itoken = await getToken(cfg); await fetchItemIcons(cfg, itoken); } catch (e) { }
        saveRoster();
        renderAll();
        notify('↻ ' + updated + ' ' + T('updated'));
    } catch (e) {
        notify('Erro: ' + e.message);
    } finally {
        if (btn) { btn.textContent = '↻ ' + T('refresh'); btn.disabled = false; }
    }
}

async function fetchAllCharMedia(cfg, token) {
    var changed = false;
    for (var i = 0; i < roster.length; i++) {
        var c = roster[i];
        if (c.renderUrl) continue;
        var url = await fetchCharMedia(cfg, token, c.realm || 'azralon', c.name.toLowerCase());
        if (url) {
            c.renderUrl = url;
            changed = true;
        }
        if (i % 3 === 2) await new Promise(function (r) { setTimeout(r, 150); });
    }
    if (changed) {
        saveRoster();
        var cpId = document.getElementById('charPage')?.dataset?.charId;
        if (cpId) renderCharPage(cpId);
    }
}

async function trackChar() {
    var name = document.getElementById('add-n').value.trim().toLowerCase();
    var realm = (document.getElementById('add-r').value.trim() ||
        document.getElementById('cfg-realm').value.trim()).toLowerCase().replace(/ /g, '-');
    var cfg = getAPICfg();
    if (!name) { notify('Digite um nome.'); return; }
    if (!cfg.proxy) { notify('Configure a API.'); return; }
    notify('Buscando ' + name + '...');
    try {
        var token = await getToken(cfg);
        var fetches = await Promise.all([
            apiFetch(cfg, charUrl(cfg, realm, name, '/equipment'), token),
            apiFetch(cfg, charUrl(cfg, realm, name), token),
            apiFetch(cfg, charUrl(cfg, realm, name, '/mythic-keystone-profile'), token),
        ]);
        var eqR = fetches[0], sumR = fetches[1], mpR = fetches[2];
        if (!sumR.ok) { notify('"' + name + '" não encontrado em ' + realm + '.'); return; }

        var sum = sumR.json;
        var charRealm = sum.realm?.slug || realm;
        var parsed = parseEquipment(eqR.json?.equipped_items);
        var charClassEN = normalizeClass(sum.character_class?.name) || '?';
        var specId = sum.active_spec?.id;
        var specName = sum.active_spec?.name || '?';
        var role = inferRoleFromSpecId(specId) || inferRoleFromSpecName(specName);
        var vault = mpR.ok && mpR.json
            ? { mythic: mpR.json.current_period?.best_runs?.length || 0, raid: 0, world: 0 }
            : null;

        var renderUrl = await fetchCharMedia(cfg, token, charRealm, name);

        var existingIdx = roster.findIndex(function (x) {
            return x.name.toLowerCase() === (sum.name || name).toLowerCase() && x.realm === charRealm;
        });
        var entry = {
            name: sum.name || name, realm: charRealm, class: charClassEN,
            spec: specName, specId: specId, role: role, note: '', ilvl: sum.equipped_item_level,
            mythicRating: mpR.ok ? (mpR.json?.current_mythic_rating?.rating | 0) || null : null,
            vault: vault, gear: parsed.gear, issues: parsed.issues,
            renderUrl: renderUrl,
            lastUpdated: new Date().toISOString()
        };
        if (existingIdx >= 0) {
            entry.role = roster[existingIdx].role;
            entry.note = roster[existingIdx].note;
            roster[existingIdx] = entry;
            notify(entry.name + ' atualizado! iLvl: ' + entry.ilvl);
        } else {
            roster.push(entry);
            notify(entry.name + ' (' + charRealm + ') adicionado! iLvl: ' + entry.ilvl);
        }
        saveRoster(); renderAll();
        document.getElementById('add-n').value = '';
        getToken(cfg).then(function (tok) { fetchItemIcons(cfg, tok); }).catch(function () { });
    } catch (e) { notify('Erro: ' + e.message); }
}

async function loadBackendRoster() {
    var cfg = getAPICfg();
    if (!cfg.proxy) return;
    try {
        var r = await fetch(pbUrl(cfg.proxy) + '/api/roster');
        if (r.ok) {
            var data = await r.json();
            if (Array.isArray(data) && data.length) {
                roster = data;
                localStorage.setItem('ga_data', JSON.stringify(roster));
                renderAll();
            }
        }
    } catch (e) { }
}

async function startSyncRoster() {
    var cfg = getAPICfg();
    var jwt = localStorage.getItem('ga_jwt') || '';
    if (!cfg.proxy || !jwt || window._perm === 'guest') return;
    try {
        fetch(pbUrl(cfg.proxy) + '/api/roster', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwt },
            body: JSON.stringify(roster)
        }).catch(function () { });
    } catch (e) { }
}

async function loadBackendCfg() {
    var cfg = getAPICfg();
    if (!cfg.proxy) return;
    try {
        var r = await fetch(pbUrl(cfg.proxy) + '/api/cfg');
        if (r.ok) {
            var data = await r.json();
            if (data && typeof data === 'object') {
                CFG = Object.assign({}, CFG, data);
                localStorage.setItem('ga_cfg', JSON.stringify(CFG));

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

async function startSyncCfg() {
    var cfg = getAPICfg();
    var jwt = localStorage.getItem('ga_jwt') || '';
    if (!cfg.proxy || !jwt || window._perm === 'guest') return;
    try {
        fetch(pbUrl(cfg.proxy) + '/api/cfg', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwt },
            body: JSON.stringify(CFG)
        }).catch(function () { });
    } catch (e) { }
}
