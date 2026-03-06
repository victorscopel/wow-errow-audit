import { generateModels } from './lib/model-viewer/index.js';
import { characterPart, findItemsInEquipments } from './lib/model-viewer/character_modeling.js';

export async function initModelViewer(c, containerSelector) {
    var rawcfg = JSON.parse(localStorage.getItem('ga_api') || '{}');
    var proxy = rawcfg.proxy || 'https://midnight.victorscopel.workers.dev';

    // Configura a lib para usar o proxy CORS para os assets do ZamModelViewer
    window.CONTENT_PATH = proxy.replace(/\/+$/, '') + '?url=' + encodeURIComponent('https://wow.zamimg.com/modelviewer/live/');
    window.WOTLK_TO_RETAIL_DISPLAY_ID_API = undefined;

    var optionsMap = characterPart();
    var mappedCustomizations = {};
    (c.customizations || []).forEach(function (cust) {
        var wowheadProp = optionsMap[cust.option.name];
        if (wowheadProp) {
            mappedCustomizations[wowheadProp] = cust.choice.id;
        }
        if (cust.option.name === 'Sex' && cust.choice.name) {
            var rawSex = cust.choice.name.toUpperCase();
            c.genderId = (rawSex === 'FEMALE' || rawSex === 'FÊMEA') ? 0 : 1;
        }
    });

    const character = {
        race: c.raceId || 1,
        gender: c.genderId || 0,
        ...mappedCustomizations,
    };

    var INVENTORY_SLOT_MAP = {
        'head': 1, 'neck': 2, 'shoulder': 3, 'shirt': 4, 'chest': 5, 'waist': 6,
        'legs': 7, 'feet': 8, 'wrist': 9, 'hands': 10, 'finger1': 11, 'finger2': 12,
        'trinket1': 13, 'trinket2': 14, 'back': 16, 'mainHand': 21, 'offHand': 22, 'tabard': 19
    };

    var rawEquipments = [];
    Object.entries(c.gear || {}).forEach(function (entry) {
        var slotName = entry[0];
        var itemData = entry[1];
        var numSlot = INVENTORY_SLOT_MAP[slotName];
        if (numSlot && itemData && itemData.displayId) {
            rawEquipments.push({
                slot: numSlot,
                item: { entry: itemData.itemId, displayid: itemData.displayId },
                transmog: {}
            });
        }
    });

    try {
        character.items = await findItemsInEquipments(rawEquipments);
        const viewer = await generateModels(1.5, containerSelector, character);
        return viewer;
    } catch (e) {
        console.warn('[Model3D] Falha ao iniciar visualizador. O modelo não será renderizado.', e.message);
        return null;
    }
}
