// ══════════════════════════════════════════════════════════
//  scrape_loot.js  —  Midnight Season 1 loot scraper
// ══════════════════════════════════════════════════════════

const BNET_CLIENT_ID = process.env.BNET_CLIENT_ID || '';
const BNET_CLIENT_SECRET = process.env.BNET_CLIENT_SECRET || '';
const WORKER_URL = process.env.WORKER_URL || '';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const DISCOVER_ONLY = process.env.DISCOVER === '1';
const REGION = 'us';
const LOCALE = 'pt_BR';
const NAMESPACE_STATIC = `static-${REGION}`;

// As 3 Raides de Midnight S1
const RAID_NAMES = [
    'Midnight', // Na API pt-BR, Voidspire está como Midnight
    'A Fenda Onírica',     
    "Marcha em Quel'Danas", 
];

// As 8 Dungeons M+ de Midnight S1
const DUNGEON_NAMES = [
    'Terraço dos Magísteres',
    'Cavernas de Maisara',       
    'Ponto de Nexus Xenas',       
    'Pico dos Correventos',   
    "Academia Algeth'ar",     
    'Fosso de Saron',         
    'Sede do Triunvirato',    
    'Beira-céu',               
];

const BOSS_ILVL = {
    normal: {
        'Imperador Averzian': 246,
        'Vorasius': 249,
        'Salhadaar, o Rei Caído': 249,
        'Quimerus, a Divindade Insonhada': 249,
        'Vaelgor e Ezzorak': 252,
        'Vanguarda Cegada pela Luz': 252,
        "Belo'ren, Filho de Al'ar": 252,
        'Coroa do Cosmos': 255,
        'Queda da Meia-noite': 255,
    },
    heroic: {
        'Imperador Averzian': 259,
        'Vorasius': 263,
        'Salhadaar, o Rei Caído': 263,
        'Quimerus, a Divindade Insonhada': 263,
        'Vaelgor e Ezzorak': 266,
        'Vanguarda Cegada pela Luz': 266,
        "Belo'ren, Filho de Al'ar": 266,
        'Coroa do Cosmos': 269,
        'Queda da Meia-noite': 269,
    },
    mythic: {
        'Imperador Averzian': 272,
        'Vorasius': 276,
        'Salhadaar, o Rei Caído': 276,
        'Quimerus, a Divindade Insonhada': 276,
        'Vaelgor e Ezzorak': 279,
        'Vanguarda Cegada pela Luz': 279,
        "Belo'ren, Filho de Al'ar": 279,
        'Coroa do Cosmos': 282,
        'Queda da Meia-noite': 282,
    },
};

const MYTHICPLUS_ILVL = {
    2: 250, 3: 250, 4: 253, 5: 253, 6: 256, 7: 259, 8: 263, 9: 263, 10: 266,
};
const MYTHICPLUS_ILVL_MAX_DELTA = 20;

const UPGRADE_TRACKS = {
    hero: { perStep: [3, 3, 4, 4, 3, 3], total: 20 },
    myth: { perStep: [3, 3, 3, 3, 3, 2], total: 17 },
};

function maxIlvl(base, diff) {
    if (!base) return null;
    const track = diff === 'mythic' ? UPGRADE_TRACKS.myth : UPGRADE_TRACKS.hero;
    return base + track.total;
}

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

async function discoverInstances(targetNames, label) {
    console.log(`\n🔍 Discovering ${label} IDs from journal index...`);
    const index = await bnetGet('/data/wow/journal-instance/index');
    if (!index?.instances) throw new Error('Could not fetch journal-instance index');

    const all = index.instances;
    const allSorted = [...all].sort((a, b) => b.id - a.id);
    const found = [];
    const notFound = [];

    for (const target of targetNames) {
        const tl = target.toLowerCase().trim();
        const match = allSorted.find(inst => inst.name?.toLowerCase().trim() === tl);
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
    }
    return found;
}

const SLOT_MAP = {
    HEAD: 'head', NECK: 'neck', SHOULDER: 'shoulder', BACK: 'back',
    CHEST: 'chest', WRIST: 'wrist', HANDS: 'hands', WAIST: 'waist',
    LEGS: 'legs', FEET: 'feet',
    FINGER_1: 'finger', FINGER_2: 'finger',
    TRINKET_1: 'trinket', TRINKET_2: 'trinket',
    MAIN_HAND: 'mainhand', OFF_HAND: 'offhand', TWO_HAND: 'twohand',
    RANGED: 'ranged', SHIELD: 'offhand', HOLDABLE: 'offhand',
};
const EQUIPPABLE_SLOTS = new Set(Object.values(SLOT_MAP));

function normalizeSlot(blizSlot) {
    return SLOT_MAP[blizSlot] || blizSlot?.toLowerCase() || 'unknown';
}

function extractStats(itemData) {
    const stats = {};
    if (!itemData?.preview_item?.stats) return stats;
    for (const s of itemData.preview_item.stats) {
        const type = s.type?.type?.toLowerCase();
        const val = s.value || 0;
        if (!type) continue;
        if (type === 'stamina') stats.stamina = val;
        if (['agility', 'intellect', 'strength'].includes(type)) stats.primary = val;
        if (type === 'crit_rating') stats.crit = val;
        if (type === 'haste_rating') stats.haste = val;
        if (type === 'mastery') stats.mastery = val;
        if (type === 'versatility') stats.versatility = val;
    }
    return stats;
}

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

            const stats = extractStats(itemData);
            const armorCat = itemData.item_subclass?.name || '';
            const name = itemData.name || `Item ${itemId}`;
            const bossName = enc.name;

            if (source === 'raid') {
                items.push({
                    itemId, name, slot,
                    source: 'raid', bossName, raidName: instance.name,
                    armorCat, stats,
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
                items.push({
                    itemId, name, slot,
                    source: 'mythicplus', bossName, dungeonName: instance.name,
                    armorCat, stats,
                    ilvlByKey: { ...MYTHICPLUS_ILVL },
                    ilvlMaxDelta: MYTHICPLUS_ILVL_MAX_DELTA,
                });
            }
            count++;
        }
        console.log(`       ${count} items collected`);
    }

    return items;
}

async function scrapeAll() {
    if (!BNET_CLIENT_ID || !BNET_CLIENT_SECRET) throw new Error('Missing BNET_CLIENT_ID or BNET_CLIENT_SECRET');

    const raids = await discoverInstances(RAID_NAMES, 'raids');
    const dungeons = await discoverInstances(DUNGEON_NAMES, 'dungeons');

    if (raids.length === 0 && dungeons.length === 0) {
        console.log('\n❌ Nothing found. Update RAID_NAMES / DUNGEON_NAMES and try again.');
        process.exit(1);
    }

    if (DISCOVER_ONLY) {
        console.log('\n✅ Discovery complete. Run sem DISCOVER=1 para raspar o loot.');
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

    const nullBosses = [...new Set(
        allItems.filter(i => i.source === 'raid' && i.ilvl.heroic === null).map(i => i.bossName)
    )];
    if (nullBosses.length > 0) {
        console.log('\n⚠️  Raid bosses com ilvl nulo (atualize o BOSS_ILVL com esses nomes exatos):');
        nullBosses.forEach(b => console.log(`   "${b}"`));
    }

    const payload = {
        season: 'midnight-s1',
        generated: new Date().toISOString(),
        bossIlvl: BOSS_ILVL,
        mythicplusIlvl: MYTHICPLUS_ILVL,
        upgradeTracks: UPGRADE_TRACKS,
        items: allItems,
    };

    const fs = require('fs');
    const filename = 'loot_midnight_s1.json';
    fs.writeFileSync(filename, JSON.stringify(payload, null, 2));
    console.log(`\n💾 Saved: ${filename}`);

    if (WORKER_URL && ADMIN_TOKEN) {
        console.log(`📤 Posting to ${WORKER_URL}/api/loot/midnight-s1 ...`);
        const res = await fetch(`${WORKER_URL}/api/loot/midnight-s1`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Admin-Token': ADMIN_TOKEN },
            body: JSON.stringify(payload),
        });
        if (res.ok) console.log('✅ KV updated.');
        else console.error(`❌ POST failed: ${res.status} — ${await res.text()}`);
    }
}

scrapeAll().catch(err => { console.error('\n💥 Fatal:', err.message); process.exit(1); });