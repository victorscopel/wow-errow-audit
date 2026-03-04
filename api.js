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
                    apiFetch(cfg, charUrl(cfg, charRealm, cn, '/statistics'), token),
                    apiFetch(cfg, charUrl(cfg, charRealm, cn, '/specializations'), token),
                ]);
                var eqR = fetches[0], sumR = fetches[1], mpR = fetches[2], statsR = fetches[3], specR = fetches[4];

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

                var charStats = null;
                if (statsR.ok && statsR.json) {
                    var s = statsR.json;
                    charStats = {
                        stamina: s.stamina?.effective || 0,
                        intellect: s.intellect?.effective || 0,
                        strength: s.strength?.effective || 0,
                        agility: s.agility?.effective || 0,
                        crit: s.melee_crit?.value || s.ranged_crit?.value || s.spell_crit?.value || 0,
                        critRating: s.melee_crit?.rating_normalized || s.melee_crit?.rating || s.ranged_crit?.rating_normalized || s.ranged_crit?.rating || s.spell_crit?.rating_normalized || s.spell_crit?.rating || 0,
                        haste: s.melee_haste?.value || s.ranged_haste?.value || s.spell_haste?.value || 0,
                        hasteRating: s.melee_haste?.rating_normalized || s.melee_haste?.rating || s.ranged_haste?.rating_normalized || s.ranged_haste?.rating || s.spell_haste?.rating_normalized || s.spell_haste?.rating || 0,
                        mastery: s.mastery?.value || 0,
                        masteryRating: s.mastery?.rating_normalized || s.mastery?.rating || 0,
                        versatility: s.versatility_damage_done_bonus || 0,
                        versRating: s.versatility || 0,
                        versDR: s.versatility_damage_taken_reduction_bonus || 0,
                    };
                }

                var charTalents = null;
                if (specR.ok && specR.json) {
                    var activeSpec = specR.json.active_specialization;
                    var specs = specR.json.specializations || [];
                    var activeTree = specs.find(function (sp) {
                        return sp.specialization && activeSpec &&
                            sp.specialization.id === activeSpec.id;
                    });
                    if (activeTree && activeTree.loadouts && activeTree.loadouts.length > 0) {
                        var loadout = activeTree.loadouts.find(function (l) { return l.is_active; }) || activeTree.loadouts[0];
                        function mapTalentNodes(arr) {
                            var seen = {};
                            return (arr || []).map(function (n) {
                                return {
                                    id: n.id,
                                    rank: n.rank || 1,
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
                        console.log('[GuildAudit] Loadout keys:', Object.keys(loadout));
                        console.log('[GuildAudit] selected_hero_talent_tree:', JSON.stringify(loadout.selected_hero_talent_tree));
                        var heroTreeName = null;
                        var sht = loadout.selected_hero_talent_tree;
                        if (sht) heroTreeName = sht.hero_talent_tree?.name || sht.name || null;
                        charTalents = {
                            exportString: loadout.talent_loadout_code || '',
                            class: mapTalentNodes(loadout.selected_class_talents),
                            spec: mapTalentNodes(loadout.selected_spec_talents),
                            hero: mapTalentNodes(loadout.selected_hero_talents),
                            heroTree: heroTreeName,
                        };
                    }
                }

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
                    stats: charStats,
                    talents: charTalents,
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

        autoRefreshMetaBuilds();

    } catch (e) {
        if (!silent) lg('❌ ' + e.message, 'err');
        else notify('Erro ao atualizar: ' + e.message);
        sprog(0);
    } finally {
        btn.textContent = '↻ Atualizar';
        btn.disabled = false;
    }
}

async function refreshExisting(force) {
    var cfg = getAPICfg();
    if (!cfg.proxy) return;
    if (window._perm === 'guest') return;

    if (!force && roster.length > 0 && roster[0].lastUpdated) {
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
                    apiFetch(cfg, charUrl(cfg, charRealm, cn, '/statistics'), token),
                    apiFetch(cfg, charUrl(cfg, charRealm, cn, '/specializations'), token),
                ]);
                var eqR = fetches[0], sumR = fetches[1], mpR = fetches[2], statsR = fetches[3], specR = fetches[4];
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
                if (statsR.ok && statsR.json) {
                    var st = statsR.json;
                    c.stats = {
                        stamina: st.stamina?.effective || 0,
                        intellect: st.intellect?.effective || 0,
                        strength: st.strength?.effective || 0,
                        agility: st.agility?.effective || 0,
                        crit: st.melee_crit?.value || st.ranged_crit?.value || st.spell_crit?.value || 0,
                        critRating: st.melee_crit?.rating_normalized || st.melee_crit?.rating || st.ranged_crit?.rating_normalized || st.ranged_crit?.rating || st.spell_crit?.rating_normalized || st.spell_crit?.rating || 0,
                        haste: st.melee_haste?.value || st.ranged_haste?.value || st.spell_haste?.value || 0,
                        hasteRating: st.melee_haste?.rating_normalized || st.melee_haste?.rating || st.ranged_haste?.rating_normalized || st.ranged_haste?.rating || st.spell_haste?.rating_normalized || st.spell_haste?.rating || 0,
                        mastery: st.mastery?.value || 0,
                        masteryRating: st.mastery?.rating_normalized || st.mastery?.rating || 0,
                        versatility: st.versatility_damage_done_bonus || 0,
                        versRating: st.versatility || 0,
                        versDR: st.versatility_damage_taken_reduction_bonus || 0,
                    };
                }
                if (specR.ok && specR.json) {
                    var activeSpecR = specR.json.active_specialization;
                    var specsR = specR.json.specializations || [];
                    var activeTreeR = specsR.find(function (sp) {
                        return sp.specialization && activeSpecR &&
                            sp.specialization.id === activeSpecR.id;
                    });
                    if (activeTreeR && activeTreeR.loadouts && activeTreeR.loadouts.length > 0) {
                        var ldR = activeTreeR.loadouts.find(function (l) { return l.is_active; }) || activeTreeR.loadouts[0];
                        function mapNodesR(arr) {
                            var seen = {};
                            return (arr || []).map(function (n) {
                                return {
                                    id: n.id,
                                    rank: n.rank || 1,
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
                        console.log('[GuildAudit] Loadout keys (refresh):', Object.keys(ldR));
                        console.log('[GuildAudit] selected_hero_talent_tree (refresh):', JSON.stringify(ldR.selected_hero_talent_tree));
                        var heroTreeNameR = null;
                        var shtR = ldR.selected_hero_talent_tree;
                        if (shtR) heroTreeNameR = shtR.hero_talent_tree?.name || shtR.name || null;
                        c.talents = {
                            exportString: ldR.talent_loadout_code || '',
                            class: mapNodesR(ldR.selected_class_talents),
                            spec: mapNodesR(ldR.selected_spec_talents),
                            hero: mapNodesR(ldR.selected_hero_talents),
                            heroTree: heroTreeNameR,
                        };
                    }
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
        autoRefreshMetaBuilds();
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
            apiFetch(cfg, charUrl(cfg, realm, name, '/statistics'), token),
            apiFetch(cfg, charUrl(cfg, realm, name, '/specializations'), token),
        ]);
        var eqR = fetches[0], sumR = fetches[1], mpR = fetches[2], statsR = fetches[3], specR = fetches[4];
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
        var charStats = null;
        if (statsR.ok && statsR.json) {
            var s = statsR.json;
            charStats = {
                stamina: s.stamina?.effective || 0,
                intellect: s.intellect?.effective || 0,
                strength: s.strength?.effective || 0,
                agility: s.agility?.effective || 0,
                crit: s.melee_crit?.value || s.ranged_crit?.value || s.spell_crit?.value || 0,
                critRating: s.melee_crit?.rating || s.ranged_crit?.rating || s.spell_crit?.rating || 0,
                haste: s.melee_haste?.value || s.ranged_haste?.value || s.spell_haste?.value || 0,
                hasteRating: s.melee_haste?.rating || s.ranged_haste?.rating || s.spell_haste?.rating || 0,
                mastery: s.mastery?.value || 0,
                masteryRating: s.mastery?.rating || 0,
                versatility: s.versatility_damage_done_bonus || 0,
                versRating: s.versatility || 0,
                versDR: s.versatility_damage_taken_reduction_bonus || 0,
            };
        }

        var charTalents = null;
        if (specR.ok && specR.json) {
            var activeSpecObj = specR.json.active_specialization;
            var specsList = specR.json.specializations || [];
            var activeTreeObj = specsList.find(function (sp) {
                return sp.specialization && activeSpecObj &&
                    sp.specialization.id === activeSpecObj.id;
            });
            if (activeTreeObj && activeTreeObj.loadouts && activeTreeObj.loadouts.length > 0) {
                var ld = activeTreeObj.loadouts[0];
                function mapNodesT(arr) {
                    return (arr || []).map(function (n) {
                        return {
                            id: n.id,
                            rank: n.rank || 1,
                            name: n.tooltip?.talent?.name || n.tooltip?.spell_tooltip?.spell?.name || '',
                            spellId: n.tooltip?.spell_tooltip?.spell?.id || null,
                        };
                    }).filter(function (t) { return t.name && t.name !== '?'; });
                }
                charTalents = {
                    exportString: ld.talent_loadout_code || '',
                    class: mapNodesT(ld.selected_class_talents),
                    spec: mapNodesT(ld.selected_spec_talents),
                };
            }
        }

        var entry = {
            name: sum.name || name, realm: charRealm, class: charClassEN,
            spec: specName, specId: specId, role: role, note: '', ilvl: sum.equipped_item_level,
            mythicRating: mpR.ok ? (mpR.json?.current_mythic_rating?.rating | 0) || null : null,
            vault: vault, gear: parsed.gear, issues: parsed.issues,
            stats: charStats, talents: charTalents,
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
        var r = await fetch(pbUrl(cfg.proxy) + '/api/roster?t=' + Date.now());
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
        var r = await fetch(pbUrl(cfg.proxy) + '/api/cfg?t=' + Date.now());
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

async function startSyncArchonStats(data) {
    var cfg = getAPICfg();
    var jwt = localStorage.getItem('ga_jwt') || '';
    if (!cfg.proxy || !jwt || window._perm === 'guest') return;
    try {
        fetch(pbUrl(cfg.proxy) + '/api/archon-stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + jwt },
            body: data
        }).catch(function () { });
    } catch (e) { }
}

async function loadArchonStats() {
    var cfg = getAPICfg();
    if (!cfg.proxy) return;
    try {
        var r = await fetch(pbUrl(cfg.proxy) + '/api/archon-stats?t=' + Date.now());
        if (r.ok) {
            var text = await r.text();
            if (text && text.length > 10) {
                var cur = JSON.parse(localStorage.getItem('ga_cfg') || '{}');
                cur.archon = text;
                localStorage.setItem('ga_cfg', JSON.stringify(cur));
                if (typeof CFG !== 'undefined') CFG.archon = text;
                var el = document.getElementById('cfg-archon');
                if (el) el.value = text;
            }
        }
    } catch (e) { }
}

function autoRefreshMetaBuilds() {
    var cfg = getAPICfg();
    if (!cfg.proxy) return;
    var specs = {};
    for (var i = 0; i < roster.length; i++) {
        var c = roster[i];
        if (c.class && c.spec) {
            var key = c.class.replace(/\s+/g, '') + ':' + c.spec.replace(/\s+/g, '');
            specs[key] = { class: c.class.replace(/\s+/g, ''), spec: c.spec.replace(/\s+/g, '') };
        }
    }
    var keys = Object.keys(specs);
    var oneWeek = 7 * 24 * 60 * 60 * 1000;
    keys.forEach(function (k) {
        var s = specs[k];
        fetch(pbUrl(cfg.proxy) + '/api/meta-builds?class=' + encodeURIComponent(s.class) + '&spec=' + encodeURIComponent(s.spec))
            .then(function (r) { return r.json(); })
            .then(function (data) {
                var needsRefresh = !data || !data.talentHeatmap;
                if (data && data.lastUpdated) {
                    var age = Date.now() - new Date(data.lastUpdated).getTime();
                    if (age > oneWeek) needsRefresh = true;
                }
                if (needsRefresh) {
                    fetch(pbUrl(cfg.proxy) + '/api/meta-builds', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ class: s.class, spec: s.spec }),
                    }).catch(function () { });
                }
            })
            .catch(function () { });
    });
}

function forceRefreshAllMeta() {
    var cfg = getAPICfg();
    if (!cfg.proxy) { notify('Proxy não configurado'); return; }
    var specs = {};
    for (var i = 0; i < roster.length; i++) {
        var c = roster[i];
        if (c.class && c.spec) {
            var key = c.class.replace(/\s+/g, '') + ':' + c.spec.replace(/\s+/g, '');
            specs[key] = { class: c.class.replace(/\s+/g, ''), spec: c.spec.replace(/\s+/g, '') };
        }
    }
    var keys = Object.keys(specs);
    if (!keys.length) { notify('Nenhuma spec no roster'); return; }
    var zoneEl = document.getElementById('cfg-wclZone');
    var zoneId = zoneEl ? parseInt(zoneEl.value) || null : null;
    notify('⚡ Atualizando meta builds para ' + keys.length + ' specs...');
    var done = 0;
    keys.forEach(function (k) {
        var s = specs[k];
        var bodyData = { class: s.class, spec: s.spec };
        if (zoneId) bodyData.zoneId = zoneId;
        fetch(pbUrl(cfg.proxy) + '/api/meta-builds', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData),
        }).then(function () {
            done++;
            if (done === keys.length) notify('✅ Meta builds atualizados (' + keys.length + ' specs)');
        }).catch(function () { done++; });
    });
}

function loadRaidZones() {
    var cfg = getAPICfg();
    if (!cfg.proxy) return;
    var sel = document.getElementById('cfg-wclZone');
    if (!sel) return;
    fetch(pbUrl(cfg.proxy) + '/api/wcl-zones')
        .then(function (r) { return r.json(); })
        .then(function (zones) {
            if (!Array.isArray(zones)) return;
            for (var i = 0; i < zones.length; i++) {
                var opt = document.createElement('option');
                opt.value = zones[i].id;
                opt.textContent = zones[i].name + ' (' + zones[i].bosses + ' bosses)';
                sel.appendChild(opt);
            }
        })
        .catch(function () { });
}
