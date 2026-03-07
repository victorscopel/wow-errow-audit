// ══════════════════════════════════════════════════════════
//  scrape_loot.js
//  Fetches loot tables for Midnight Season 1 raids from the
//  official Blizzard Game Data API, enriches each item with
//  secondary stats, and POSTs the result to the GuildAudit
//  Worker KV as `loot:midnight-s1`.
//
//  Raids covered:
//    - The Voidspire          (instance 1296)
//    - The Dreamrift           (instance 1302)
//    - March on Quel'Danas     (instance 1309)
//
//  Usage:
//    BNET_CLIENT_ID=xxx BNET_CLIENT_SECRET=yyy \
//    WORKER_URL=https://your-worker.workers.dev \
//    ADMIN_TOKEN=your-secret-token \
//    node scrape_loot.js
//
//  Or via GitHub Actions (secrets set in repo settings).
// ══════════════════════════════════════════════════════════

const fs = require('fs');

const BNET_CLIENT_ID     = process.env.BNET_CLIENT_ID     || '';
const BNET_CLIENT_SECRET = process.env.BNET_CLIENT_SECRET || '';
const WORKER_URL         = process.env.WORKER_URL         || '';
const ADMIN_TOKEN        = process.env.ADMIN_TOKEN        || '';
const REGION             = 'us';
const LOCALE             = 'pt_BR';
const NAMESPACE_STATIC   = `static-${REGION}`;

// ── Midnight Season 1 raid instances ─────────────────────
const RAID_INSTANCES = [
    { id: 1296, name: 'The Voidspire' },
    { id: 1302, name: 'The Dreamrift' },
    { id: 1309, name: 'March on Quel\'Danas' },
];

// ── ilvl per boss per difficulty (fixed for the season) ──
// Boss names must match exactly what the Blizzard API returns
const BOSS_ILVL = {
    heroic: {
        'Imperator Averzian':          259,
        'Vorasius':                    263,
        'Fallen-King Salhadaar':       263,
        'Chimaerus the Undreamt God':  263,
        'Vaelgor & Ezzorak':           266,
        'Lightblinded Vanguard':       266,
        "Belo'ren, Child of Al'ar":    266,
        'Crown of the Cosmos':         269,
        'Midnight Falls':              269,
    },
    mythic: {
        'Imperator Averzian':          272,
        'Vorasius':                    276,
        'Fallen-King Salhadaar':       276,
        'Chimaerus the Undreamt God':  276,
        'Vaelgor & Ezzorak':           279,
        'Lightblinded Vanguard':       279,
        "Belo'ren, Child of Al'ar":    279,
        'Crown of the Cosmos':         282,
        'Midnight Falls':              282,
    },
};

// ── Upgrade track deltas (fixed per season) ──────────────
// Applying all 6 upgrades to the base drop gives the max ilvl
// Hero  1/6 = 259 → 6/6 = 279  (+20, costs Myth Crests)
// Myth  1/6 = 272 → 6/6 = 289  (+17, costs Myth Crests)
const UPGRADE_TRACKS = {
    hero: { perStep: [3, 3, 4, 4, 3, 3], total: 20 },  // +3+3+4+4+3+3 = 20
    myth: { perStep: [3, 3, 3, 3, 3, 2], total: 17 },  // +3+3+3+3+3+2 = 17
};

function maxIlvl(baseIlvl, diff) {
    if (diff === 'mythic') return baseIlvl + UPGRADE_TRACKS.myth.total;
    return baseIlvl + UPGRADE_TRACKS.hero.total;
}

// ── Blizzard API helpers ──────────────────────────────────
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
    const qs = new URLSearchParams({
        namespace: NAMESPACE_STATIC,
        locale: LOCALE,
        ...params,
    });
    const url = `https://${REGION}.api.blizzard.com${path}?${qs}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(`${res.status} ${url}`);
    }
    return res.json();
}

// Polite delay to avoid rate limiting
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Slot normalizer (Blizzard → our internal slots) ───────
const SLOT_MAP = {
    'HEAD':       'head',
    'NECK':       'neck',
    'SHOULDER':   'shoulder',
    'BACK':       'back',
    'CHEST':      'chest',
    'WRIST':      'wrist',
    'HANDS':      'hands',
    'WAIST':      'waist',
    'LEGS':       'legs',
    'FEET':       'feet',
    'FINGER_1':   'finger',
    'FINGER_2':   'finger',
    'TRINKET_1':  'trinket',
    'TRINKET_2':  'trinket',
    'MAIN_HAND':  'mainhand',
    'OFF_HAND':   'offhand',
    'TWO_HAND':   'twohand',
    'RANGED':     'ranged',
};

function normalizeSlot(blizSlot) {
    return SLOT_MAP[blizSlot] || blizSlot?.toLowerCase() || 'unknown';
}

// ── Item stat extractor ───────────────────────────────────
// Returns { stamina, primary, crit, haste, mastery, versatility }
function extractStats(itemData) {
    const stats = {};
    if (!itemData?.preview_item?.stats) return stats;
    for (const s of itemData.preview_item.stats) {
        const type = s.type?.type?.toLowerCase();
        const val  = s.value || 0;
        if (!type) continue;
        if (type === 'stamina')      stats.stamina      = val;
        if (type === 'agility' || type === 'intellect' || type === 'strength') stats.primary = val;
        if (type === 'crit_rating')  stats.crit         = val;
        if (type === 'haste_rating') stats.haste        = val;
        if (type === 'mastery')      stats.mastery      = val;
        if (type === 'versatility')  stats.versatility  = val;
    }
    return stats;
}

// ── Main scrape logic ─────────────────────────────────────
async function scrapeInstance(instance) {
    console.log(`\n  Fetching instance ${instance.id}: ${instance.name}`);
    const instData = await bnetGet(`/data/wow/journal-instance/${instance.id}`);
    if (!instData) {
        console.warn(`    ✗ Instance ${instance.id} not found`);
        return [];
    }

    const encounters = instData.encounters || [];
    console.log(`    ${encounters.length} encounters found`);

    const results = [];

    for (const enc of encounters) {
        await sleep(200);
        const encData = await bnetGet(`/data/wow/journal-encounter/${enc.id}`);
        if (!encData) continue;

        const bossName = encData.name || enc.name || `Boss ${enc.id}`;
        const items    = encData.items || [];
        console.log(`    Boss: ${bossName} (${items.length} items)`);

        for (const itemRef of items) {
            await sleep(100);
            const itemId   = itemRef.item?.id;
            if (!itemId) continue;

            const itemData = await bnetGet(`/data/wow/item/${itemId}`);
            if (!itemData) continue;

            const slotRaw  = itemData.inventory_type?.type;
            const slot     = normalizeSlot(slotRaw);
            const stats    = extractStats(itemData);
            const armorCat = itemData.item_subclass?.name || null;

            results.push({
                itemId,
                name:      itemData.name || `Item ${itemId}`,
                slot,
                bossName,
                raidName:  instance.name,
                armorCat,
                stats,
            });
        }
    }

    return results;
}

async function scrapeAll() {
    console.log('Starting Midnight S1 loot scraper...\n');

    if (!BNET_CLIENT_ID || !BNET_CLIENT_SECRET) {
        throw new Error('BNET_CLIENT_ID and BNET_CLIENT_SECRET are required');
    }

    let allItems = [];

    for (const instance of RAID_INSTANCES) {
        const items = await scrapeInstance(instance);
        allItems = allItems.concat(items);
        await sleep(500);
    }

    // Deduplicate by itemId (same item can drop from multiple bosses — keep all entries)
    console.log(`\n  Total items scraped: ${allItems.length}`);

    // Build the final structure with ilvl per difficulty
    const output = {
        season:    'midnight-s1',
        generated: new Date().toISOString(),
        bossIlvl:  BOSS_ILVL,
        upgradeTracks: UPGRADE_TRACKS,
        items: allItems.map(item => ({
            ...item,
            ilvl: {
                heroic: BOSS_ILVL.heroic[item.bossName] || null,
                mythic: BOSS_ILVL.mythic[item.bossName] || null,
            },
            ilvlMax: {
                heroic: BOSS_ILVL.heroic[item.bossName] ? maxIlvl(BOSS_ILVL.heroic[item.bossName], 'heroic') : null,
                mythic: BOSS_ILVL.mythic[item.bossName] ? maxIlvl(BOSS_ILVL.mythic[item.bossName], 'mythic') : null,
            },
        })),
    };

    const outputStr = JSON.stringify(output, null, 2);

    // Save locally as backup
    fs.writeFileSync('loot_midnight_s1.json', outputStr);
    console.log(`\n✓ Saved loot_midnight_s1.json (${allItems.length} items)`);

    // POST to Worker KV
    if (WORKER_URL && ADMIN_TOKEN) {
        const url = `${WORKER_URL.replace(/\/+$/, '')}/api/loot/midnight-s1`;
        console.log(`\n  → POST ${url}`);
        try {
            const res = await fetch(url, {
                method:  'POST',
                headers: {
                    'Content-Type':  'application/json',
                    'X-Admin-Token': ADMIN_TOKEN,
                },
                body: outputStr,
            });
            const body = await res.text();
            if (res.ok) {
                console.log(`✓ POSTed to Worker KV (HTTP ${res.status})`);
            } else {
                console.error(`✗ Worker rejected: ${res.status} — ${body}`);
            }
        } catch (e) {
            console.error(`✗ Failed to POST: ${e.message}`);
        }
    } else {
        console.warn('\n⚠ Skipping Worker POST — WORKER_URL or ADMIN_TOKEN missing');
    }

    console.log('\nDone!');
}

scrapeAll().catch(err => {
    console.error('\n✗ Fatal:', err.message);
    process.exit(1);
});
