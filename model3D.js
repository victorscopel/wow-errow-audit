import { generateModels } from './lib/model-viewer/index.js';
import { characterPart, findItemsInEquipments } from './lib/model-viewer/character_modeling.js';

export async function initModelViewer(c, containerSelector) {
    var rawcfg = JSON.parse(localStorage.getItem('ga_api') || '{}');
    var proxy = rawcfg.proxy || 'https://midnight.victorscopel.workers.dev';
    var proxyBase = proxy.replace(/\/+$/, '');

    // The viewer fetches all assets relative to CONTENT_PATH.
    // It concatenates: CONTENT_PATH + relativePath (e.g. "character/foo.m2")
    // producing: "https://worker.dev?url=https%3A%2F%2Fwow.zamimg.com%2Fmodelviewer%2Flive%2Fcharacter/foo.m2"
    // The Worker proxy decodes ?url= and streams the response as ArrayBuffer.
    window.CONTENT_PATH = proxyBase + '?url=' + encodeURIComponent('https://wow.zamimg.com/modelviewer/live/');
    window.WOTLK_TO_RETAIL_DISPLAY_ID_API = undefined;

    // ── 1. Build character customizations (FLAT format) ───────────────────────
    //
    // ROOT CAUSE of "choice: undefined" errors:
    //   The lib's getCharacterOptions() downloads Zamimg's customization v2 JSON
    //   and tries to match: Choices.find(ch => ch.id === choiceID)
    //   BUT Zamimg's internal Choice IDs ≠ Blizzard API choice.id values.
    //   This causes undefined for many races (Night Elf, Demon Hunter, etc.).
    //
    // CORRECT FIX — use the FLAT character format:
    //   { race, gender, skin: N, face: N, hairStyle: N, ... }
    //   where N = choice.displayOrder (the 0-based positional index from Blizzard).
    //   This is the sequential index the Zamimg viewer uses natively.
    //
    // characterPart() maps option names → flat property names:
    //   { "Skin Color": "skin", "Face": "face", "Hair Style": "hairStyle", ... }
    //
    var optionsMap = characterPart();
    var genderId = c.genderId != null ? c.genderId : 0;
    var flatCustom = {};

    (c.customizations || []).forEach(function (cust) {
        var optionName = cust.option && cust.option.name;
        var choice = cust.choice;
        if (!optionName || !choice) return;

        // Detect gender from Sex option (already stored in genderId, but keep as safety)
        if (optionName === 'Sex') {
            var rawSex = (choice.name || '').toUpperCase();
            genderId = (rawSex === 'FEMALE' || rawSex === 'FÊMEA') ? 0 : 1;
            return;
        }

        var prop = optionsMap[optionName]; // e.g. "skin", "face", "hairStyle"
        if (!prop) return;

        // choice.displayOrder is the 0-based positional index Blizzard returns
        // for where this choice falls in the option's list — exactly what Zamimg
        // uses as the sequential choice value. Fall back to choice.id if missing.
        var val = (choice.displayOrder != null) ? choice.displayOrder : choice.id;
        if (val != null) {
            flatCustom[prop] = val;
        }
    });

    // ── 2. Build character descriptor ─────────────────────────────────────────
    var character = {
        race:   c.raceId || 1,
        gender: genderId,
        ...flatCustom,
    };

    // ── 3. Map gear slots → rawEquipments ─────────────────────────────────────
    var INVENTORY_SLOT_MAP = {
        head:      1,  neck:     2,  shoulder:  3,  shirt:    4,
        chest:     5,  waist:    6,  legs:      7,  feet:     8,
        wrist:     9,  hands:   10,  finger1:  11,  finger2: 12,
        trinket1: 13,  trinket2:14,  back:     16,  tabard:  19,
        mainHand: 21,  offHand: 22,
    };

    var rawEquipments = [];
    Object.entries(c.gear || {}).forEach(function ([slotName, itemData]) {
        var numSlot = INVENTORY_SLOT_MAP[slotName];
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

    // ── 4. Resolve items and launch viewer ────────────────────────────────────
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