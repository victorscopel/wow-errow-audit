
import "./setup.js"

const NOT_DISPLAYED_SLOTS = [
    2, // neck
    11, // finger1
    12, // finger1
    13, // trinket1
    14, // trinket2
]

const modelingType = {
    ARMOR: 128,
    CHARACTER: 16,
    COLLECTION: 1024,
    HELM: 2,
    HUMANOIDNPC: 32,
    ITEM: 1,
    ITEMVISUAL: 512,
    NPC: 8,
    OBJECT: 64,
    PATH: 256,
    SHOULDER: 4
}

const characterPart = () => {
    const ret = {
        Face: `face`,
        "Skin Color": `skin`,
        "Hair Style": `hairStyle`,
        "Hair Color": `hairColor`,
        "Facial Hair": `facialStyle`,
        Mustache: `facialStyle`,
        Beard: `facialStyle`,
        Sideburns: `facialStyle`,
        "Face Shape": `facialStyle`,
        Eyebrow: `facialStyle`,
        "Jaw Features": undefined,
        "Face Features": undefined,
        "Skin Type": undefined,
        Ears: (window.WOTLK_TO_RETAIL_DISPLAY_ID_API) ? undefined : `ears`,
        "Fur Color": (window.WOTLK_TO_RETAIL_DISPLAY_ID_API) ? undefined : `furColor`,
        Snout: `snout`,
        Blindfold: undefined,
        Tattoo: undefined,
        "Eye Color": undefined,
        "Tattoo Color": undefined,
        Armbands: undefined,
        "Jewelry Color": undefined,
        Bracelets: undefined,
        Necklace: undefined,
        Earring: undefined,
        "Primary Color": (window.WOTLK_TO_RETAIL_DISPLAY_ID_API) ? undefined : `primaryColor`,
        "Secondary Color Strength": (window.WOTLK_TO_RETAIL_DISPLAY_ID_API) ? undefined : `secondaryColorStrength`,
        "Secondary Color": (window.WOTLK_TO_RETAIL_DISPLAY_ID_API) ? undefined : `secondaryColor`,
        "Horn Color": (window.WOTLK_TO_RETAIL_DISPLAY_ID_API) ? undefined : `hornColor`,
        Horns: (window.WOTLK_TO_RETAIL_DISPLAY_ID_API) ? undefined : `horns`,
        "Body Size": (window.WOTLK_TO_RETAIL_DISPLAY_ID_API) ? undefined : `bodySize`
    }
    return ret
}



function optionalChaining(choice) {
    //todo replace by `part.Choices[character[CHARACTER_PART[prop]]]?.Id` when it works on almost all frameworks
    return choice ? choice.Id : undefined
}



/**
 *
 * @param {Object} character - The character object.
 * @param {number} character.face - Description for face.
 * @param {number} character.facialStyle - Description for facialStyle.
 * @param {number} character.gender - Description for gender.
 * @param {number} character.hairColor - Description for hairColor.
 * @param {number} character.hairStyle - Description for hairStyle.
 * @param {Array<Array<number>>} character.items - Description for items. (Optional)
 * @param {number} character.race - Description for race.
 * @param {number} character.skin - Description for skin.
 * @param {Object} fullOptions - Zaming API character options payload.
 * @return {[]}
 */
function getWowheadRaceId(race, gender) {
    if (race === 52 || race === 70) {
        return gender === 0 ? 189 : 190; // Dracthyr
    }
    return race * 2 - 1 + gender;
}

function getCharacterOptions(character, fullOptions) {
    const options = fullOptions.Options || [];
    const missingChoice = [];
    const ret = [];

    for (const part of options) {
        const propMappings = characterPart();
        const propName = Object.keys(propMappings).find(k => propMappings[k] !== undefined && (part.Name === k || part.Name.toLowerCase() === k.toLowerCase()));
        let mappedVar = propName ? propMappings[propName] : undefined;
        let choiceId = undefined;

        if (mappedVar && character[mappedVar] !== undefined) {
            const userChoice = character[mappedVar];
            const targetName = (typeof userChoice === 'object' ? userChoice.name : null);
            const targetId = (typeof userChoice === 'object' ? userChoice.id : userChoice);

            // Try to match by Name first (Blizzard Name -> Wowhead Name)
            let choice = null;
            if (targetName) {
                choice = (part.Choices || []).find(c => c.Name && c.Name.toLowerCase() === targetName.toLowerCase());
            }

            // Fallback to ID match
            if (!choice) {
                choice = (part.Choices || []).find(c => c.Id == targetId);
            }

            if (choice) {
                choiceId = choice.Id;
            } else {
                // Last ditch effort: if targetId is a small index, maybe it works?
                // But for now, just use targetId and hope for the best if it's not in the list
                choiceId = targetId;
            }
        }

        // Default to first choice if not found
        if (choiceId === undefined) {
            choiceId = part.Choices && part.Choices.length > 0 ? part.Choices[0].Id : 0;
            if (mappedVar) missingChoice.push(mappedVar);
        }

        ret.push({
            optionId: part.Id,
            choiceId: choiceId
        });
    }

    if (missingChoice.length > 0) {
        console.warn(`[ModelViewer] Some options fell back to default:`, missingChoice);
    }
    return ret;
}

/**
 * This function return the design choices for a character this does not work for NPC / Creature / Items
 * @param {Object} model - The model object to generate options from.
 * @param {{}} fullOptions - The type of the model.
 * @returns {{models: {id: string, type: number}, charCustomization: {options: []}, items: (*|*[])}|{models: {id, type}}
 */
function optionsFromModel(model, fullOptions) {
    const { race, gender } = model

    // slot ids on model viewer
    const characterItems = (model.items) ? model.items.filter(e => !NOT_DISPLAYED_SLOTS.includes(e[0])) : []
    const options = getCharacterOptions(model, fullOptions)
    let charCustomization = {
        options: options,
        race: race,
        gender: gender
    }
    const ret = {
        items: characterItems,
        models: {
            id: String(getWowheadRaceId(race, gender)),
            type: modelingType.CHARACTER
        },
    }
    if (!model.noCharCustomization) {
        ret.charCustomization = charCustomization
    }
    return ret
}



/**
 *
 * @param item{number}: Item id
 * @param slot{number}: Item slot number
 * @param displayId{number}: DisplayId of the item
 * @param env {('classic'|'live')}: select game env
 * @return {Promise<boolean|*>}
 */
async function getDisplaySlot(item, slot, displayId, env = `live`) {
    if (typeof item !== `number`) {
        throw new Error(`item must be a number`)
    }

    if (typeof slot !== `number`) {
        throw new Error(`slot must be a number`)
    }

    if (typeof displayId !== `number`) {
        throw new Error(`displayId must be a number`)
    }

    try {
        const jsonPath = (env === `classic` && [21, 22].includes(slot)) ?
            `${window.CONTENT_PATH}meta/item/${displayId}.json` :
            `${window.CONTENT_PATH}meta/armor/${slot}/${displayId}.json`
        const response = await fetch(jsonPath);
        if (response.ok) {
            await response.json(); // Just verify it's valid JSON
            return {
                displaySlot: slot,
                displayId: displayId
            }
        }
    } catch (e) {
        console.warn(`[ModelViewer] Metadata fetch failed for item ${item} slot ${slot} display ${displayId}`, e);
    }

    if (window.WOTLK_TO_RETAIL_DISPLAY_ID_API) {
        try {
            const resp = await fetch(`${window.WOTLK_TO_RETAIL_DISPLAY_ID_API}/${item}/${displayId}`)
                .then((response) => response.json())
            const res = resp.data || resp
            if (res.newDisplayId && res.newDisplayId !== displayId) {
                return {
                    displaySlot: slot,
                    displayId: res.newDisplayId
                }
            }
        } catch (e) {
            console.warn(`[ModelViewer] WOTLK fallback failed for item ${item}`, e);
        }
    }

    // old slots to new slots
    const retSlot = {
        5: 20, // chest
        16: 21, // main hand
        18: 22 // off hand
    }[slot]

    if (!retSlot) {
        console.warn(`Item: ${item} display: ${displayId} or slot: ${slot} not found for `)

        return {
            displaySlot: slot,
            displayId: displayId
        }
    }

    return {
        displaySlot: slot,
        displayId: displayId
    }
}



/**
 * Returns a 2-dimensional list the inner list contains on first position the item slot, the second the item
 * display-id ex: [[1,1170],[3,4925]]
 * @param {*[{item: {entry: number, displayid: number}, transmog: {entry: number, displayid: number}, slot: number}]} equipments
 * @param env {('classic'|'live')}: select game enve
 * @returns {Promise<number[]>}
 */
async function findItemsInEquipments(equipments, env = `live`) {
    for (const equipment of equipments) {
        if (NOT_DISPLAYED_SLOTS.includes(equipment.slot)) {
            continue
        }

        try {
            const displayedItem = (Object.keys(equipment.transmog).length !== 0) ? equipment.transmog : equipment.item
            const displaySlot = await getDisplaySlot(
                displayedItem.entry,
                equipment.slot,
                displayedItem.displayid,
                env
            )
            if (displaySlot) {
                equipment.displaySlot = displaySlot.displaySlot
                equipment.displayId = displaySlot.displayId
                Object.assign(displaySlot, equipment)
            }
        } catch (e) {
            console.warn(`[ModelViewer] Error processing equipment slot ${equipment.slot}`, e);
        }
    }
    return equipments
        .filter(e => e.displaySlot)
        .map(e => [
            e.displaySlot,
            e.displayId
        ]
        )
}


/**
 *
 * @param {number} race
 * @param {number} gender
 * @returns {Promise<Object>}
 */
async function findRaceGenderOptions(race, gender) {
    const raceGender = getWowheadRaceId(race, gender)
    try {
        const response = await fetch(`${window.CONTENT_PATH}meta/charactercustomization/${raceGender}.json`);
        if (!response.ok) {
            console.warn(`[ModelViewer] Metadata not found for race/gender ${raceGender} (Race: ${race}, Gender: ${gender})`);
            return { Options: [] };
        }
        const options = await response.json();
        return options.data || options;
    } catch (e) {
        console.warn(`[ModelViewer] Failed to parse metadata for race/gender ${raceGender}`, e);
        return { Options: [] };
    }
}

export {
    optionsFromModel,
    findRaceGenderOptions,
    findItemsInEquipments,
    getDisplaySlot,
    getCharacterOptions,
    characterPart,
    modelingType
}
