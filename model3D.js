import { generateModels } from './lib/model-viewer/index.js';
import { characterPart, findItemsInEquipments } from './lib/model-viewer/character_modeling.js';

// ── Race ID translation: Blizzard API → wow-model-viewer (Zamimg) ─────────────
// The Blizzard profile API returns race.id from ChrRaces.db2.
// The wow-model-viewer lib uses Zamimg's internal race IDs.
// Most match, but Dracthyr diverges:
//   Dracthyr: Blizzard=52 (wowhead.com/race=52/dracthyr), Zamimg=45
var BLIZZARD_TO_ZAMIMG_RACE = {
    52: 45, // Dracthyr
};

// ── Blizzard slot key → wow-model-viewer inventory slot number ────────────────
// Keys come from data.js SLOT_MAP (Blizzard INVTYPE → our slot name):
//   MAIN_HAND → 'mainhand', OFF_HAND → 'offhand'  (all lowercase, no camelCase)
// Slot numbers from character_modeling.js getDisplaySlot():
//   chest=5 (lib remaps→20), mainhand=16 (lib remaps→21), offhand=18 (lib remaps→22)
//   back=15 (confirmed from wowhead viewer output)
var SLOT_MAP = {
    head:     1,  neck:      2,  shoulder:  3,  shirt:    4,
    chest:    5,  waist:     6,  legs:      7,  feet:     8,
    wrist:    9,  hands:    10,  finger1:  11,  finger2: 12,
    trinket1: 13, trinket2: 14,  back:     15,  tabard:  19,
    mainhand: 16, offhand:  18,
};

export async function initModelViewer(c, containerSelector) {
    var rawcfg = JSON.parse(localStorage.getItem('ga_api') || '{}');
    var proxy = rawcfg.proxy || 'https://midnight.victorscopel.workers.dev';
    var proxyBase = proxy.replace(/\/+$/, '');

    // The viewer fetches all assets relative to CONTENT_PATH.
    // CONTENT_PATH is prepended to every relative asset path:
    //   "?url=https%3A%2F%2Fwow.zamimg.com%2Fmodelviewer%2Flive%2F" + "character/foo.m2"
    // The Worker proxy decodes ?url= and streams the response as ArrayBuffer.
    window.CONTENT_PATH = proxyBase + '?url=' + encodeURIComponent('https://wow.zamimg.com/modelviewer/live/');
    window.WOTLK_TO_RETAIL_DISPLAY_ID_API = undefined;

    // ── 1. Translate Blizzard raceId → Zamimg raceId ──────────────────────────
    var blizzRaceId = c.raceId || 1;
    var zamigRaceId = BLIZZARD_TO_ZAMIMG_RACE[blizzRaceId] || blizzRaceId;

    // ── 2. Build character customizations (FLAT format) ───────────────────────
    //
    // WHY FLAT FORMAT:
    //   The lib's getCharacterOptions() downloads a "customization v2" JSON from
    //   Zamimg and tries: Choices.find(ch => ch.id === choiceID)
    //   Zamimg's internal Choice IDs differ from Blizzard's choice.id values,
    //   so the match fails → "choice: undefined" → model renders black.
    //
    // THE FIX:
    //   Use the flat format { skin: N, face: N, hairStyle: N, ... } where
    //   N = choice.displayOrder from Blizzard's /appearance endpoint.
    //   displayOrder is the 0-based positional index of the chosen option —
    //   exactly the sequential index Zamimg uses natively.
    //
    var optionsMap = characterPart(); // { "Skin Color": "skin", "Face": "face", ... }
    var genderId = c.genderId != null ? c.genderId : 0;
    var flatCustom = {};

    (c.customizations || []).forEach(function (cust) {
        var optionName = cust.option && cust.option.name;
        var choice = cust.choice;
        if (!optionName || !choice) return;

        // Detect gender override from the Sex option
        if (optionName === 'Sex') {
            var rawSex = (choice.name || '').toUpperCase();
            genderId = (rawSex === 'FEMALE' || rawSex === 'FÊMEA') ? 0 : 1;
            return;
        }

        // characterPart() covers all races incl. Dracthyr/Evoker special props
        var prop = optionsMap[optionName];

        if (!prop) return;

        // choice.displayOrder = 0-based index in the option's choices list (from Blizzard).
        // This matches Zamimg's sequential choice numbering. Fallback to choice.id.
        var val = (choice.displayOrder != null) ? choice.displayOrder : choice.id;
        if (val != null) {
            flatCustom[prop] = val;
        }
    });

    // ── 3. Build character descriptor ─────────────────────────────────────────
    var character = {
        race:   zamigRaceId,
        gender: genderId,
        ...flatCustom,
    };

    // ── 4. Map gear slots → rawEquipments ─────────────────────────────────────
    var rawEquipments = [];
    Object.entries(c.gear || {}).forEach(function ([slotName, itemData]) {
        var numSlot = SLOT_MAP[slotName];
        if (numSlot && itemData && itemData.displayId) {
            rawEquipments.push({
                slot:    numSlot,
                item:    { entry: itemData.itemId || 0, displayid: itemData.displayId },
                transmog: itemData.transmogDisplayId
                    ? { entry: 0, displayid: itemData.transmogDisplayId }
                    : {},
            });
        }
    });

    // ── 5. Resolve items and launch viewer ────────────────────────────────────
    try {
        var items = await findItemsInEquipments(rawEquipments);
        character.items = items || [];

        var viewer = await generateModels(1.5, containerSelector, character);
        return viewer;
    } catch (e) {
        console.warn('[Model3D] Failed to start viewer:', e.message, e);
        return null;
    }
}