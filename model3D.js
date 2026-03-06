import { generateModels } from './lib/model-viewer/index.js';
import { findItemsInEquipments, findRaceGenderOptions } from './lib/model-viewer/character_modeling.js';

// ── Race ID translation: Blizzard API → wow-model-viewer (Zamimg) ─────────────
// Most Blizzard ChrRaces.db2 IDs match Zamimg's internal IDs, but Dracthyr diverges.
var BLIZZARD_TO_ZAMIMG_RACE = {
    52: 45, // Dracthyr: Blizzard=52, Zamimg=45
};

// ── Blizzard slot key → wow-model-viewer inventory slot number ────────────────
// Keys come from data.js SLOT_MAP (Blizzard INVTYPE → our slot name, all lowercase):
//   MAIN_HAND → 'mainhand', OFF_HAND → 'offhand'
// Slot numbers from character_modeling.js getDisplaySlot() internal remap table:
//   chest=5 (→20), mainhand=16 (→21), offhand=18 (→22)
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

    window.CONTENT_PATH = proxyBase + '?url=' + encodeURIComponent('https://wow.zamimg.com/modelviewer/live/');
    window.WOTLK_TO_RETAIL_DISPLAY_ID_API = undefined;

    // ── 1. Translate Blizzard raceId → Zamimg raceId ──────────────────────────
    var blizzRaceId = c.raceId || 1;
    var zamigRaceId = BLIZZARD_TO_ZAMIMG_RACE[blizzRaceId] || blizzRaceId;
    var genderId = c.genderId != null ? c.genderId : 0;

    // Detect gender override from the Sex customization option
    (c.customizations || []).forEach(function (cust) {
        if (cust.option && cust.option.name === 'Sex') {
            var rawSex = (cust.choice && cust.choice.name || '').toUpperCase();
            genderId = (rawSex === 'FEMALE' || rawSex === 'FEMEA' || rawSex === 'FÊMEA') ? 0 : 1;
        }
    });

    // ── 2. Build charCustomization.options using the Zamimg v2 JSON ───────────
    //
    // WHY THIS APPROACH:
    //   Blizzard /appearance returns choice.id (ChrCustomizationChoice.db2 record IDs).
    //   Blizzard does NOT return displayOrder.
    //   The lib's flat format uses character[prop] as a positional INDEX into Choices[]:
    //   passing choice.id (e.g. 58355) as an index → Choices[58355] = undefined → black.
    //
    // THE FIX:
    //   Fetch Zamimg's customization v2 JSON via findRaceGenderOptions().
    //   Format: { Options: [{Id, Name, Choices: [{Id, ...}]}] }
    //   For each Blizzard customization, find the Option by name, then find
    //   the matching Choice by Id. Pass {optionId, choiceId} with real Zamimg IDs.
    //   Zamimg and Blizzard share the same ChrCustomizationChoice.db2 IDs,
    //   so ch.Id === blizzard choice.id is a direct match.
    //
    var charCustomization = { race: zamigRaceId, gender: genderId, options: [] };

    try {
        var fullOptions = await findRaceGenderOptions(zamigRaceId, genderId);
        var zamigOptions = fullOptions.Options || fullOptions;

        // Build a lookup: option name → Zamimg Option object
        var optionByName = {};
        zamigOptions.forEach(function (opt) {
            optionByName[opt.Name] = opt;
        });

        (c.customizations || []).forEach(function (cust) {
            var optionName = cust.option && cust.option.name;
            var blizzChoiceId = cust.choice && cust.choice.id;
            if (!optionName || blizzChoiceId == null) return;
            if (optionName === 'Sex') return;

            var zamigOpt = optionByName[optionName];
            if (!zamigOpt) return;

            // Zamimg and Blizzard both source IDs from ChrCustomizationChoice.db2
            var zamigChoice = zamigOpt.Choices.find(function (ch) {
                return ch.Id === blizzChoiceId;
            });
            if (!zamigChoice) return;

            charCustomization.options.push({
                optionId: zamigOpt.Id,
                choiceId: zamigChoice.Id,
            });
        });

    } catch (e) {
        console.warn('[Model3D] Could not fetch Zamimg customization data:', e.message);
        // Fallback: model renders with default appearance
    }

    // ── 3. Build character descriptor ─────────────────────────────────────────
    var character = {
        race:               zamigRaceId,
        gender:             genderId,
        charCustomization:  charCustomization,
        noCharCustomization: false,
    };

    // ── 4. Map gear slots → rawEquipments ─────────────────────────────────────
    var rawEquipments = [];
    Object.entries(c.gear || {}).forEach(function ([slotName, itemData]) {
        var numSlot = SLOT_MAP[slotName];
        if (numSlot && itemData && itemData.displayId) {
            rawEquipments.push({
                slot:     numSlot,
                item:     { entry: itemData.itemId || 0, displayid: itemData.displayId },
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