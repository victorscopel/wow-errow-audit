import { generateModels } from './lib/model-viewer/index.js';

export async function initModelViewer(c, containerSelector) {
    var rawcfg = JSON.parse(localStorage.getItem('ga_api') || '{}');
    var proxy = rawcfg.proxy || 'https://midnight.victorscopel.workers.dev';

    // Configura a lib para usar o proxy CORS para os assets do ZamModelViewer
    window.CONTENT_PATH = proxy.replace(/\/+$/, '') + '?url=' + encodeURIComponent('https://wow.zamimg.com/modelviewer/live/');
    window.WOTLK_TO_RETAIL_DISPLAY_ID_API = undefined;

    const character = {
        race: c.raceId || 1, // Ex: 7=gnome, 1=human, etc.
        gender: c.genderId || 0, // 0=female, 1=male
        skin: 4,
        face: 0,
        hairStyle: 5,
        hairColor: 5,
        facialStyle: 5,
        items: [] // Array vazio. Fase 1: teste cru sem itens
    };

    try {
        const viewer = await generateModels(1.5, containerSelector, character);
        return viewer;
    } catch (e) {
        console.error('[Model3D] Falha ao iniciar visualizador:', e);
        return null;
    }
}
