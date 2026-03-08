// ══════════════════════════════════════════════════════════
//  scrape_loot.js  —  Midnight Season 1 loot scraper
//
//  Scrapes:
//    - 3 raids (Normal / Heroic / Mythic)
//    - 8 M+ dungeons (end-of-dungeon drops, ilvl by key level)
//
//  Discovers instance IDs by NAME from the Blizzard journal
//  index — no hardcoded IDs that go stale between patches.
//
//  Usage:
//    BNET_CLIENT_ID=xxx BNET_CLIENT_SECRET=yyy \
//    WORKER_URL=https://your-worker.workers.dev \
//    ADMIN_TOKEN=your-secret-token \
//    node scrape_loot.js
//
//  Discovery mode (list all instance names/IDs, no scrape):
//    DISCOVER=1 BNET_CLIENT_ID=xxx BNET_CLIENT_SECRET=yyy \
//    node scrape_loot.js
// ══════════════════════════════════════════════════════════

const BNET_CLIENT_ID     = process.env.BNET_CLIENT_ID     || '';
const BNET_CLIENT_SECRET = process.env.BNET_CLIENT_SECRET || '';
const WORKER_URL         = process.env.WORKER_URL         || '';
const ADMIN_TOKEN        = process.env.ADMIN_TOKEN        || '';
const DISCOVER_ONLY      = process.env.DISCOVER === '1';
const REGION             = 'us';
const LOCALE             = 'pt_BR';
const NAMESPACE_STATIC   = `static-${REGION}`;

// ── Target raid names ─────────────────────────────────────
// Names exactly as returned by the Blizzard API in pt_BR locale.
// Discovered via DISCOVER=1 run on 2026-03-07.
// "Midnight" (1312) = The Voidspire (main raid hub)
// "A Fenda Onírica" (1314) = The Dreamrift
// "Marcha em Quel'Danas" (1308) = March on Quel'Danas
const RAID_NAMES = [
    'O Pináculo do Vazio', // The Voidspire (Pode estar como 'Voidspire' ou 'Midnight' na API ainda)
    'A Fenda Onírica',     // The Dreamrift
    "Marcha em Quel'Danas", // March on Quel'Danas
];

// ── Target M+ dungeon names ───────────────────────────────
// Midnight Season 1 dungeon pool in pt_BR locale.
// Only dungeons already in the Blizzard journal are listed.
// Some may not be available yet — the scraper skips missing ones gracefully.
// TWW dungeons returning to the pool:
//   1271 = Ara-Kara, a Cidade dos Ecos
//   1272 = Hidromelaria Cinzagris
//   1267 = Priorado da Chama Sagrada
//   1270 = Alvorada
// New Midnight dungeons (IDs 1299–1307, exact names TBD):
//   1298 = Operação: Comporta  (Operation: Floodgate)
//   1299 = Pico dos Correventos
//   1300 = Terraço dos Magísteres
//   1301 = Abismo Rocha Negra
//   1302 = Manaforja Ômega
//   1303 = Ecodomo Al'dani
//   1304 = Travessa do Assassino
//   1307 = A Torre do Caos
const DUNGEON_NAMES = [
    // Novas Dungeons (Midnight)
    'Terraço dos Magísteres', // Magister's Terrace
    'Cavernas Maisara',       // Maisara Caverns
    'Ponto-Nexo Xenas',       // Nexus-Point Xenas
    'Pináculo Correventos',   // Windrunner Spire
    
    // Dungeons Antigas Retornando
    "Academia Algeth'ar",     // Algeth'ar Academy (Dragonflight)
    'Fosso de Saron',         // Pit of Saron (WotLK)
    'Sede do Triunvirato',    // Seat of the Triumvirate (Legion)
    'Beiracéu',               // Skyreach (WoD)
];

// ── Raid ilvl per boss per difficulty ─────────────────────
// Boss names must match the Blizzard API in pt_BR locale.
// Run once and check the "Bosses with null ilvl" warning for exact names.
// EN reference → PT name (from API)
//   Imperator Averzian       → (likely same or "Imperador Averzian")
//   Vorasius                 → "Vorasius"
//   Fallen-King Salhadaar    → "Salhadaar, o Rei Caído" (?)
//   Chimaerus the Undreamt   → (?)
//   Vaelgor & Ezzorak        → (?)
//   Lightblinded Vanguard    → (?)
//   Belo'ren, Child of Al'ar → (?)
//   Crown of the Cosmos      → (?)
//   Midnight Falls           → (?)
// These will be corrected after first successful scrape.
// ilvl values are correct regardless of name — just update the keys.
const BOSS_ILVL = {
    normal: {
        // ── The Voidspire (Midnight) ──
        'Imperator Averzian':          246,
        'Imperador Averzian':          246,
        'Vorasius':                    249,
        'Salhadaar, o Rei Caído':      249,
        'Fallen-King Salhadaar':       249,
        'Quimaerus, o Deus Insonhado': 249,
        'Chimaerus the Undreamt God':  249,
        'Vaelgor e Ezzorak':           252,
        'Vaelgor & Ezzorak':           252,
        'Vanguarda Cegada pela Luz':   252,
        'Lightblinded Vanguard':       252,
        "Belo'ren, Filho de Al'ar":    252,
        "Belo'ren, Child of Al'ar":    252,
        'Coroa do Cosmos':             255,
        'Crown of the Cosmos':         255,
        'A Meia-noite Chega':          255,
        'Midnight Falls':              255,
    },
    heroic: {
        'Imperator Averzian':          259,
        'Imperador Averzian':          259,
        'Vorasius':                    263,
        'Salhadaar, o Rei Caído':      263,
        'Fallen-King Salhadaar':       263,
        'Quimaerus, o Deus Insonhado': 263,
        'Chimaerus the Undreamt God':  263,
        'Vaelgor e Ezzorak':           266,
        'Vaelgor & Ezzorak':           266,
        'Vanguarda Cegada pela Luz':   266,
        'Lightblinded Vanguard':       266,
        "Belo'ren, Filho de Al'ar":    266,
        "Belo'ren, Child of Al'ar":    266,
        'Coroa do Cosmos':             269,
        'Crown of the Cosmos':         269,
        'A Meia-noite Chega':          269,
        'Midnight Falls':              269,
    },
    mythic: {
        'Imperator Averzian':          272,
        'Imperador Averzian':          272,
        'Vorasius':                    276,
        'Salhadaar, o Rei Caído':      276,
        'Fallen-King Salhadaar':       276,
        'Quimaerus, o Deus Insonhado': 276,
        'Chimaerus the Undreamt God':  276,
        'Vaelgor e Ezzorak':           279,
        'Vaelgor & Ezzorak':           279,
        'Vanguarda Cegada pela Luz':   279,
        'Lightblinded Vanguard':       279,
        "Belo'ren, Filho de Al'ar":    279,
        "Belo'ren, Child of Al'ar":    279,
        'Coroa do Cosmos':             282,
        'Crown of the Cosmos':         282,
        'A Meia-noite Chega':          282,
        'Midnight Falls':              282,
    },
};

// ── M+ end-of-dungeon ilvl by key level ───────────────────
// Midnight S1 — end-of-dungeon chest only (not vault).
// Format: { keyLevel: ilvl }
// Track: Champion 1/6 at +2, scales up to Hero 3/6 at +10.
const MYTHICPLUS_ILVL = {
    2:  250,   // Champion 1/6
    3:  250,
    4:  253,   // Champion 2/6
    5:  253,
    6:  256,   // Champion 3/6
    7:  259,   // Hero 1/6
    8:  263,   // Hero 2/6
    9:  263,
    10: 266,   // Hero 3/6
};
// Max upgrade for M+ end-of-dungeon items: Hero track (+20 with Myth crests)
const MYTHICPLUS_ILVL_MAX_DELTA = 20;

// ── Upgrade tracks ────────────────────────────────────────
const UPGRADE_TRACKS = {
    hero: { perStep: [3, 3, 4, 4, 3, 3], total: 20 },
    myth: { perStep: [3, 3, 3, 3, 3, 2], total: 17 },
};

function maxIlvl(base, diff) {
    if (!base) return null;
    const track = diff === 'mythic' ? UPGRADE_TRACKS.myth : UPGRADE_TRACKS.hero;
    return base + track.total;
}

// ── Auth & API ────────────────────────────────────────────
let _clientToken = null;

async function getClientToken() {
    if (_clientToken) return _clientToken;
    const res = await fetch('https://oauth.battle.net/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: 'Basic ' + Buffer.from(`${BNET_CLIENT_ID}:${BNET_CLIENT_SECRET}`).toString('base64'),
        },
        body: 'grant_type=client_credentials',
    });
    const data = await res.json();
    if (!data.access_token) throw new Error('Failed to get client token: ' + JSON.stringify(data));
    _clientToken = data.access_token;
    return _clientToken;
}

async function bnetGet(path, params = {}) {
    const token = await getClientToken();
    const qs = new URLSearchParams({ namespace: NAMESPACE_STATIC, locale: LOCALE, ...params });
    const url = `https://${REGION}.api.blizzard.com${path}?${qs}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(`${res.status} ${url}`);
    }
    return res.json();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Discover instance IDs by name ────────────────────────
async function discoverInstances(targetNames, label) {
    console.log(`\n🔍 Discovering ${label} IDs from journal index...`);
    const index = await bnetGet('/data/wow/journal-instance/index');
    if (!index?.instances) throw new Error('Could not fetch journal-instance index');

    const all = index.instances;
    console.log(`   ${all.length} total instances in journal.`);

    const found = [];
    const notFound = [];

    for (const target of targetNames) {
        const tl = target.toLowerCase().trim();
        const match = all.find(inst => inst.name?.toLowerCase().trim() === tl);
        if (match) {
            found.push({ id: match.id, name: match.name });
            console.log(`   ✓  id=${match.id}  "${match.name}"`);
        } else {
            notFound.push(target);
            console.log(`   ✗  "${target}" — NOT FOUND`);
        }
    }

    if (notFound.length > 0) {
        console.log(`\n⚠️  ${notFound.length} ${label} not found. Newest 80 instances:`);
        [...all].sort((a, b) => b.id - a.id).slice(0, 80).forEach(inst =>
            console.log(`     id=${inst.id.toString().padEnd(6)}  "${inst.name}"`)
        );
        console.log(`\n   Update ${label === 'raids' ? 'RAID_NAMES' : 'DUNGEON_NAMES'} with exact names above.`);
    }

    return found;
}

// ── Slot normalizer ───────────────────────────────────────
const SLOT_MAP = {
    HEAD: 'head', NECK: 'neck', SHOULDER: 'shoulder', BACK: 'back',
    CHEST: 'chest', WRIST: 'wrist', HANDS: 'hands', WAIST: 'waist',
    LEGS: 'legs', FEET: 'feet',
    FINGER_1: 'finger', FINGER_2: 'finger',
    TRINKET_1: 'trinket', TRINKET_2: 'trinket',
    MAIN_HAND: 'mainhand', OFF_HAND: 'offhand', TWO_HAND: 'twohand',
    RANGED: 'ranged',
    SHIELD: 'offhand',
    HOLDABLE: 'offhand',
};
const EQUIPPABLE_SLOTS = new Set(Object.values(SLOT_MAP));

function normalizeSlot(blizSlot) {
    return SLOT_MAP[blizSlot] || blizSlot?.toLowerCase() || 'unknown';
}

// ── Stat extractor ────────────────────────────────────────
function extractStats(itemData) {
    const stats = {};
    if (!itemData?.preview_item?.stats) return stats;
    for (const s of itemData.preview_item.stats) {
        const type = s.type?.type?.toLowerCase();
        const val  = s.value || 0;
        if (!type) continue;
        if (type === 'stamina')       stats.stamina      = val;
        if (['agility','intellect','strength'].includes(type)) stats.primary = val;
        if (type === 'crit_rating')   stats.crit         = val;
        if (type === 'haste_rating')  stats.haste        = val;
        if (type === 'mastery')       stats.mastery      = val;
        if (type === 'versatility')   stats.versatility  = val;
    }
    return stats;
}

// ── Sanity check ──────────────────────────────────────────
// Returns true if item looks like current-season gear.
// Items from wrong eras have very low secondary stats.
function isCurrentEraStat(stats) {
    const totalSec = (stats.crit || 0) + (stats.haste || 0) + (stats.mastery || 0) + (stats.versatility || 0);
    // Allow 0 secondaries (trinkets/rings with only primary/stamina)
    // but reject low but non-zero (< 20 = level 10-30 item)
    if (totalSec > 0 && totalSec < 20) return false;
    // Also check primary — current gear should have primary > 10 (or 0 for some trinkets)
    const primary = stats.primary || 0;
    if (primary > 0 && primary < 8) return false;
    return true;
}

// ── Scrape one instance (raid or dungeon) ─────────────────
async function scrapeInstance(instance, source) {
    console.log(`\n  → [${instance.id}] ${instance.name}  (${source})`);
    const instData = await bnetGet(`/data/wow/journal-instance/${instance.id}`);
    if (!instData?.encounters) {
        console.log(`     ⚠️  No encounters data`);
        return [];
    }

    const items = [];

    for (const enc of instData.encounters) {
        console.log(`     Boss: "${enc.name}" (enc ${enc.id})`);
        await sleep(120);

        const encData = await bnetGet(`/data/wow/journal-encounter/${enc.id}`);
        if (!encData?.items) { console.log('       (no items)'); continue; }

        const seenIds = new Set();
        let count = 0;

        for (const encItem of encData.items) {
            const itemId = encItem.item?.id;
            if (!itemId || seenIds.has(itemId)) continue;
            seenIds.add(itemId);

            await sleep(80);
            const itemData = await bnetGet(`/data/wow/item/${itemId}`);
            if (!itemData) continue;

            const slot = normalizeSlot(itemData.inventory_type?.type);
            if (!EQUIPPABLE_SLOTS.has(slot)) continue;

            const stats    = extractStats(itemData);
            const armorCat = itemData.item_subclass?.name || '';
            const name     = itemData.name || `Item ${itemId}`;

            if (!isCurrentEraStat(stats)) {
                console.log(`       ⚠️  Skip "${name}" (id=${itemId}) — stats look wrong-era`);
                continue;
            }

            const bossName = enc.name;

            if (source === 'raid') {
                items.push({
                    itemId, name, slot,
                    source:   'raid',
                    bossName,
                    raidName: instance.name,
                    armorCat,
                    stats,
                    ilvl: {
                        normal: BOSS_ILVL.normal[bossName] || null,
                        heroic: BOSS_ILVL.heroic[bossName] || null,
                        mythic: BOSS_ILVL.mythic[bossName] || null,
                    },
                    ilvlMax: {
                        normal: BOSS_ILVL.normal[bossName] ? maxIlvl(BOSS_ILVL.normal[bossName], 'normal') : null,
                        heroic: BOSS_ILVL.heroic[bossName] ? maxIlvl(BOSS_ILVL.heroic[bossName], 'heroic') : null,
                        mythic: BOSS_ILVL.mythic[bossName] ? maxIlvl(BOSS_ILVL.mythic[bossName], 'mythic') : null,
                    },
                });
            } else {
                // M+ dungeon — ilvl by key level, not by boss
                items.push({
                    itemId, name, slot,
                    source:      'mythicplus',
                    bossName,                       // e.g. "Rixxa Fluxflame"
                    dungeonName: instance.name,     // e.g. "The MOTHERLODE!!"
                    armorCat,
                    stats,
                    // ilvl at end-of-dungeon chest per key level
                    ilvlByKey:   { ...MYTHICPLUS_ILVL },
                    // max upgrade (Hero track, Myth crests)
                    ilvlMaxDelta: MYTHICPLUS_ILVL_MAX_DELTA,
                });
            }
            count++;
        }
        console.log(`       ${count} items collected`);
    }

    return items;
}

// ── Main ──────────────────────────────────────────────────
async function scrapeAll() {
    if (!BNET_CLIENT_ID || !BNET_CLIENT_SECRET) throw new Error('Missing BNET_CLIENT_ID or BNET_CLIENT_SECRET');

    // Discover both raids and dungeons (shares the same journal index)
    const raids    = await discoverInstances(RAID_NAMES,    'raids');
    const dungeons = await discoverInstances(DUNGEON_NAMES, 'dungeons');

    if (raids.length === 0 && dungeons.length === 0) {
        console.log('\n❌ Nothing found. Update RAID_NAMES / DUNGEON_NAMES and try again.');
        process.exit(1);
    }

    if (raids.length === 0) {
        console.log('\n❌ No raids found. Update RAID_NAMES and try again.');
        process.exit(1);
    }

    if (DISCOVER_ONLY) {
        console.log('\n✅ Discovery complete. Run without DISCOVER=1 to scrape loot.');
        process.exit(0);
    }

    console.log('\n⚙️  Scraping raid loot...');
    let allItems = [];
    for (const raid of raids) {
        const items = await scrapeInstance(raid, 'raid');
        allItems = allItems.concat(items);
    }

    console.log('\n⚙️  Scraping M+ dungeon loot...');
    for (const dungeon of dungeons) {
        const items = await scrapeInstance(dungeon, 'mythicplus');
        allItems = allItems.concat(items);
    }

    // Warn: raid bosses with null ilvl = name mismatch
    const nullBosses = [...new Set(
        allItems.filter(i => i.source === 'raid' && i.ilvl.heroic === null).map(i => i.bossName)
    )];
    if (nullBosses.length > 0) {
        console.log('\n⚠️  Raid bosses with null ilvl (update BOSS_ILVL with these exact names):');
        nullBosses.forEach(b => console.log(`   "${b}"`));
    }

    const raidCount = allItems.filter(i => i.source === 'raid').length;
    const mplusCount = allItems.filter(i => i.source === 'mythicplus').length;
    console.log(`\n✅ Total: ${allItems.length} items (${raidCount} raid, ${mplusCount} M+)`);

    const payload = {
        season:        'midnight-s1',
        generated:     new Date().toISOString(),
        bossIlvl:      BOSS_ILVL,
        mythicplusIlvl: MYTHICPLUS_ILVL,
        upgradeTracks: UPGRADE_TRACKS,
        items:         allItems,
    };

    const fs = require('fs');
    const filename = 'loot_midnight_s1.json';
    fs.writeFileSync(filename, JSON.stringify(payload, null, 2));
    console.log(`💾 Saved: ${filename}`);

    if (WORKER_URL && ADMIN_TOKEN) {
        console.log(`📤 Posting to ${WORKER_URL}/api/loot/midnight-s1 ...`);
        const res = await fetch(`${WORKER_URL}/api/loot/midnight-s1`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Admin-Token': ADMIN_TOKEN },
            body: JSON.stringify(payload),
        });
        if (res.ok) {
            console.log('✅ KV updated.');
        } else {
            const text = await res.text();
            console.error(`❌ POST failed: ${res.status} — ${text}`);
        }
    } else {
        console.log('\n⚠️  WORKER_URL/ADMIN_TOKEN not set — skipping KV upload.');
    }
}

scrapeAll().catch(err => { console.error('\n💥 Fatal:', err.message); process.exit(1); });