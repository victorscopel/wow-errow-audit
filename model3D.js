import { generateModels } from './lib/model-viewer/index.js';
import { characterPart, findItemsInEquipments, getCharacterOptions } from './lib/model-viewer/character_modeling.js';

export async function initModelViewer(c, containerSelector) {
    var rawcfg = JSON.parse(localStorage.getItem('ga_api') || '{}');
    var proxy = rawcfg.proxy || 'https://midnight.victorscopel.workers.dev';
    var proxyBase = proxy.replace(/\/+$/, '');

    // The ZamModelViewer fetches binary assets (.m2, .blp, .anim) via XHR.
    // The Worker proxy must forward these as raw bytes (no JSON encoding).
    // We set CONTENT_PATH so the viewer prepends it to every asset request.
    // The ZamModelViewer builds asset URLs as: CONTENT_PATH + relativePath
    // e.g. "https://worker.dev?url=https%3A%2F%2Fwow.zamimg.com%2Fmodelviewer%2Flive%2F" + "character/foo.m2"
    // The Worker's handleProxy() decodes ?url= and streams the response as ArrayBuffer.
    window.CONTENT_PATH = proxyBase + '?url=' + encodeURIComponent('https://wow.zamimg.com/modelviewer/live/');
    window.WOTLK_TO_RETAIL_DISPLAY_ID_API = undefined;

    // ── 1. Map Blizzard customizations → { optionID, choiceID } array ──────────
    //
    // character_modeling.js internally calls getCharacterOptions() which builds
    // charCustomization: { options: [ { optionID, choiceID }, ... ] }
    // We must pass the raw Blizzard option/choice IDs, NOT the string-property
    // spread that was used before (which produced options:[]).
    //
    var customizationOptions = [];
    var genderId = c.genderId != null ? c.genderId : 0;

    (c.customizations || []).forEach(function (cust) {
        // Blizzard returns: { option: { id, name }, choice: { id, name } }
        if (cust.option && cust.option.id != null && cust.choice && cust.choice.id != null) {
            customizationOptions.push({
                optionID: cust.option.id,
                choiceID: cust.choice.id,
            });
        }
        // Also detect gender from the Sex customization
        if (cust.option && cust.option.name === 'Sex' && cust.choice && cust.choice.name) {
            var rawSex = cust.choice.name.toUpperCase();
            genderId = (rawSex === 'FEMALE' || rawSex === 'FÊMEA') ? 0 : 1;
        }
    });

    // ── 2. Build character descriptor ──────────────────────────────────────────
    var character = {
        race:   c.raceId  || 1,
        gender: genderId,
        // charCustomization uses the options array format expected by the lib
        charCustomization: { options: customizationOptions },
    };

    // ── 3. Map gear slots → rawEquipments ──────────────────────────────────────
    //
    // findItemsInEquipments expects:
    //   [ { slot: <inventorySlotNumber>, item: { entry: itemId, displayid: displayId }, transmog: {} } ]
    //
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
        // We need at minimum the displayId for the 3-D model.
        // itemId (entry) is optional but improves accuracy.
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

    // ── 4. Resolve items then launch viewer ────────────────────────────────────
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