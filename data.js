// ══════════════════════════════════════════════════════════
//  GUILDAUDIT — data.js
//  Static constants, role inference, helpers, i18n
// ══════════════════════════════════════════════════════════

var ROLE_TANK = 'Tank';
var ROLE_HEALER = 'Healer';
var ROLE_DPS_MELEE = 'DPS Melee';
var ROLE_DPS_RANGE = 'DPS Ranged';

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Storage helpers ───────────────────────────────────────
function ls(k) { return localStorage.getItem(k); }
function lss(k, v) { localStorage.setItem(k, v); }
function saveRoster() {
  if (typeof roster === 'undefined') return;
  var o = ls('ga_data') || '[]';
  var n = JSON.stringify(roster);
  if (o !== n) {
    lss('ga_data', n);
    if (typeof startSyncRoster !== 'undefined') startSyncRoster();
  }
}

// ── i18n ──────────────────────────────────────────────────
var I18N = {
  members: { en: 'Members', pt_BR: 'Membros' },
  raiders: { en: 'raiders', pt_BR: 'raiders' },
  avg_ilvl: { en: 'Avg iLvl', pt_BR: 'iLvl Médio' },
  equipped: { en: 'equipped', pt_BR: 'equipado' },
  max_ilvl: { en: 'Max iLvl', pt_BR: 'iLvl Máx' },
  highest: { en: 'highest', pt_BR: 'melhor' },
  ready: { en: 'Ready', pt_BR: 'Prontos' },
  no_issues: { en: 'no issues', pt_BR: 'sem problemas' },
  issues: { en: 'Issues', pt_BR: 'Problemas' },
  with_problems: { en: 'with problems', pt_BR: 'com problema' },
  missing: { en: 'Missing', pt_BR: 'Faltando' },
  enchants_gems: { en: 'enchants/gems', pt_BR: 'encantamentos/gemas' },
  overview: { en: 'Overview', pt_BR: 'Visão Geral' },
  roster: { en: 'Roster', pt_BR: 'Roster' },
  great_vault: { en: 'Great Vault', pt_BR: 'Grande Cofre' },
  settings: { en: 'Settings', pt_BR: 'Configurações' },
  character: { en: 'Character', pt_BR: 'Personagem' },
  role: { en: 'Role', pt_BR: 'Função' },
  ilvl: { en: 'iLvl', pt_BR: 'iLvl' },
  spec: { en: 'Spec', pt_BR: 'Especialização' },
  m_rating: { en: 'M+ Rating', pt_BR: 'Mítico+' },
  note: { en: 'Note', pt_BR: 'Nota' },
  vault: { en: 'Vault', pt_BR: 'Cofre' },
  search: { en: 'Search...', pt_BR: 'Buscar...' },
  refresh: { en: 'Refresh', pt_BR: 'Atualizar' },
  export_btn: { en: 'Export', pt_BR: 'Exportar' },
  import_btn: { en: 'Import', pt_BR: 'Importar' },
  no_data: { en: 'No data', pt_BR: 'Nenhum dado' },
  import_or_demo: { en: 'Import or load demo.', pt_BR: 'Importe ou carregue demo.' },
  tanks: { en: 'Tanks', pt_BR: 'Tanks' },
  healers: { en: 'Healers', pt_BR: 'Healers' },
  ranged: { en: 'Ranged', pt_BR: 'Ranged' },
  melee: { en: 'Melee', pt_BR: 'Melee' },
  armor: { en: 'Armor', pt_BR: 'Armadura' },
  classes: { en: 'Classes', pt_BR: 'Classes' },
  back_btn: { en: '← Back', pt_BR: '← Voltar' },
  remove: { en: 'Remove', pt_BR: 'Remover' },
  save: { en: 'Save', pt_BR: 'Salvar' },
  add_note: { en: 'Add note...', pt_BR: 'Adicionar nota...' },
  no_problems: { en: '✓ No problems detected', pt_BR: '✓ Sem problemas detectados' },
  problems: { en: 'Problems', pt_BR: 'Problemas' },
  ranking_by_ilvl: { en: 'Ranking by iLvl', pt_BR: 'Ranking por iLvl' },
  csv: { en: 'CSV', pt_BR: 'CSV' },
  demo: { en: 'Demo', pt_BR: 'Demo' },
  clear: { en: 'Clear', pt_BR: 'Limpar' },
  now: { en: 'Now', pt_BR: 'Agora' },
  ago_min: { en: 'min ago', pt_BR: 'min atrás' },
  ago_h: { en: 'h ago', pt_BR: 'h atrás' },
  ago_d: { en: 'd ago', pt_BR: 'd atrás' },
  empty_slot: { en: 'Empty', pt_BR: 'Vazio' },
  no_enchant: { en: 'No enchant', pt_BR: 'Sem enchant' },
  no_gem: { en: 'No gem', pt_BR: 'Sem gema' },
  enchant: { en: 'Enchant', pt_BR: 'Enchant' },
  gem: { en: 'Gem', pt_BR: 'Gema' },
  none: { en: 'None', pt_BR: 'Nenhum' },
  api_blizzard: { en: 'Blizzard API', pt_BR: 'API Blizzard' },
  display: { en: 'Display', pt_BR: 'Exibição' },
  show_issues: { en: 'Show Issues', pt_BR: 'Exibir Issues' },
  show_vault: { en: 'Show Vault', pt_BR: 'Exibir Vault' },
  show_rating: { en: 'Show M+ Rating', pt_BR: 'Exibir M+ Rating' },
  show_notes: { en: 'Show Notes', pt_BR: 'Exibir Notas' },
  auto_refresh: { en: 'Auto-refresh (15min)', pt_BR: 'Refresh automático (15min)' },
  display_language: { en: 'Display Language', pt_BR: 'Idioma de Exibição' },
  data: { en: 'Data', pt_BR: 'Dados' },
  export_json: { en: 'Export JSON', pt_BR: 'Exportar JSON' },
  import_json: { en: 'Import JSON', pt_BR: 'Importar JSON' },
  paste_json: { en: 'Paste JSON here...', pt_BR: 'Cole o JSON aqui...' },
  clear_all: { en: 'Clear All Data', pt_BR: 'Limpar Todos os Dados' },
  import_ranks: { en: 'Import (ranks 0–2)', pt_BR: 'Importar (ranks 0–2)' },
  getting_token: { en: 'Getting token...', pt_BR: 'Obtendo token...' },
  fetching_roster: { en: 'Fetching roster', pt_BR: 'Buscando roster' },
  downloading_icons: { en: 'Downloading item icons...', pt_BR: 'Baixando ícones dos itens...' },
  done: { en: 'Done', pt_BR: 'Concluído' },
  imported: { en: 'members imported!', pt_BR: 'membros importados!' },
  updated: { en: 'members updated', pt_BR: 'membros atualizados' },
  no_enchantment: { en: 'No enchantment', pt_BR: 'Sem encantamento' },
  no_gem_full: { en: 'No gem', pt_BR: 'Sem gema' },
  added: { en: 'added!', pt_BR: 'adicionado!' },
  ilvl_min: { en: 'Minimum iLvl', pt_BR: 'iLvl Mínimo' },
  ilvl_min_desc: { en: 'Highlight players below this iLvl', pt_BR: 'Destacar jogadores abaixo deste iLvl' },
  missing_enchant: { en: 'Missing enchant', pt_BR: 'Sem encantamento' },
  missing_gem: { en: 'Missing gem', pt_BR: 'Sem gema' },
  refreshing: { en: 'Refreshing existing members...', pt_BR: 'Atualizando membros existentes...' },
  refresh_done: { en: 'Refresh complete!', pt_BR: 'Atualização concluída!' },
  attributes: { en: 'Attributes', pt_BR: 'Atributos' },
  stamina: { en: 'Stamina', pt_BR: 'Vigor' },
  intellect: { en: 'Intellect', pt_BR: 'Intelecto' },
  strength: { en: 'Strength', pt_BR: 'Força' },
  agility: { en: 'Agility', pt_BR: 'Agilidade' },
  crit: { en: 'Critical Strike', pt_BR: 'Crítico' },
  haste: { en: 'Haste', pt_BR: 'Aceleração' },
  mastery: { en: 'Mastery', pt_BR: 'Maestria' },
  versatility: { en: 'Versatility', pt_BR: 'Versatilidade' },
  talents: { en: 'Talents', pt_BR: 'Talentos' },
  class_talents: { en: 'CLASS TALENTS', pt_BR: 'TALENTOS DE CLASSE' },
  hero_talents: { en: 'HERO TALENTS', pt_BR: 'TALENTOS HEROICOS' },
  spec_talents: { en: 'SPEC TALENTS', pt_BR: 'TALENTOS DE SPEC' },
  suggestions: { en: 'Suggestions', pt_BR: 'Sugestões' },
  gear_check: { en: 'Gear Check', pt_BR: 'Verificação de Gear' },
  readiness: { en: 'Raid Readiness', pt_BR: 'Prontidão para Raid' },
  meta_build: { en: 'Build Suggestion', pt_BR: 'Sugestão de Build' },
  missing_enchant_on: { en: 'Missing enchant on', pt_BR: 'Falta encantamento em' },
  missing_gem_on: { en: 'Missing gem on', pt_BR: 'Falta gema em' },
  ilvl_below_min: { en: 'Item level below minimum', pt_BR: 'Nível de item abaixo do mínimo' },
  low_ilvl_slot: { en: 'Low ilvl on', pt_BR: 'ilvl baixo em' },
  no_mythic_score: { en: 'No Mythic+ score', pt_BR: 'Sem pontuação de Mítica+' },
  talents_missing: { en: 'Unspent talent points', pt_BR: 'Pontos de talento não gastos' },
  vault_incomplete: { en: 'Great Vault incomplete', pt_BR: 'Grande Cofre incompleto' },
  archon_source: { en: 'Recommended stats based on Archon.gg / top Heroic logs', pt_BR: 'Atributos recomendados baseados no Archon.gg / top logs Heroico' },
  archon_date: { en: 'Last Updated', pt_BR: 'Atualizado em' },
  stat_ok: { en: 'Stat priority matches recommendation', pt_BR: 'Atributos de acordo com o recomendado' },
  stat_below: { en: 'is below recommended', pt_BR: 'abaixo do recomendado' },
  embellished: { en: 'Embellished', pt_BR: 'Embelezado' },
  tier_set: { en: 'Tier Set', pt_BR: 'Set Tier' },
  emb_none: { en: 'No embellished items (ideal: 2)', pt_BR: 'Nenhum item embelezado (ideal: 2)' },
  emb_one: { en: 'Only 1 embellished item (ideal: 2)', pt_BR: 'Apenas 1 item embelezado (ideal: 2)' },
  tierset_missing: { en: 'Missing {n}pc bonus (have {have})', pt_BR: 'Falta bônus de {n} peças (tem {have})' },
  show_tier: { en: 'Show Tier Pieces', pt_BR: 'Exibir Peças de Tier' },
  tier_pieces: { en: 'Tier', pt_BR: 'Tier' },
};

// Slots that can be tier set pieces (consistent across all WoW expansions)
var TIER_SLOTS = ['head', 'shoulder', 'chest', 'hands', 'legs'];
// Short labels for the tier piece column (order matches TIER_SLOTS)
var TIER_SLOT_INITIALS = { head: 'H', shoulder: 'S', chest: 'C', hands: 'G', legs: 'L' };

var HERO_TREE_PT = {
  "Rider of the Apocalypse": "Cavalgante do Apocalipse",
  "San'layn": "San'layn",
  "Deathbringer": "Mortífero",
  "Aldrachi Reaver": "Aniquilador Aldrachi",
  "Fel-Scarred": "Cicatriza-Fel",
  "Druid of the Claw": "Druida da Garra",
  "Elune's Chosen": "Escolhido de Eluna",
  "Keeper of the Grove": "Guardião do Bosque",
  "Wildstalker": "Espreitador Selvagem",
  "Chronowarden": "Guardião do Tempo",
  "Flameshaper": "Moldachamas",
  "Scalecommander": "Comandante Dracônico",
  "Dark Ranger": "Ranger Sombrio",
  "Pack Leader": "Líder da Alcateia",
  "Sentinel": "Sentinela",
  "Frostfire": "Mago Fogogélido",
  "Spellslinger": "Lançafeitiços",
  "Sunfury": "Fúria Solar",
  "Conduit of the Celestials": "Conduíte dos Celestiais",
  "Master of Harmony": "Mestre da Harmonia",
  "Shado-Pan": "Shado-Pan",
  "Herald of the Sun": "Arauto do Sol",
  "Lightsmith": "Artífice da Luz",
  "Templar": "Templário",
  "Archon": "Arconte",
  "Oracle": "Oráculo",
  "Voidweaver": "Tecedor do Vazio",
  "Deathstalker": "Espreitador da Morte",
  "Fatebound": "Amarrado ao Destino",
  "Trickster": "Trapaceiro",
  "Farseer": "Clarividente",
  "Stormbringer": "Evocador de Tempestades",
  "Totemic": "Totêmico",
  "Diabolist": "Diabolista",
  "Hellcaller": "Infernarauto",
  "Soul Harvester": "Ceifador de Almas",
  "Colossus": "Colosso",
  "Mountain Thane": "Thane Montanhês",
  "Slayer": "Exterminador",
};

var STAT_PRIORITY = {
  "BeastMastery": ["haste", "crit", "mastery", "versatility"],
  "Marksmanship": ["crit", "mastery", "haste", "versatility"],
  "Survival": ["haste", "crit", "versatility", "mastery"],
  "Assassination": ["mastery", "haste", "crit", "versatility"],
  "Outlaw": ["haste", "versatility", "crit", "mastery"],
  "Subtlety": ["crit", "mastery", "versatility", "haste"],
  "Balance": ["mastery", "haste", "crit", "versatility"],
  "Feral": ["mastery", "haste", "crit", "versatility"],
  "Guardian": ["versatility", "haste", "mastery", "crit"],
  "Restoration": ["haste", "mastery", "crit", "versatility"],
  "Holy": ["haste", "crit", "mastery", "versatility"],
  "Protection": ["haste", "mastery", "versatility", "crit"],
  "Retribution": ["haste", "mastery", "crit", "versatility"],
  "Discipline": ["haste", "crit", "mastery", "versatility"],
  "Shadow": ["haste", "mastery", "crit", "versatility"],
  "Elemental": ["haste", "crit", "mastery", "versatility"],
  "Enhancement": ["haste", "mastery", "crit", "versatility"],
  "Affliction": ["mastery", "haste", "crit", "versatility"],
  "Demonology": ["haste", "mastery", "crit", "versatility"],
  "Destruction": ["haste", "crit", "mastery", "versatility"],
  "Arms": ["crit", "haste", "mastery", "versatility"],
  "Fury": ["haste", "mastery", "crit", "versatility"],
  "Frost": ["crit", "haste", "versatility", "mastery"],
  "Fire": ["haste", "mastery", "crit", "versatility"],
  "Arcane": ["haste", "crit", "mastery", "versatility"],
  "Blood": ["haste", "versatility", "mastery", "crit"],
  "Unholy": ["mastery", "haste", "crit", "versatility"],
  "Havoc": ["crit", "haste", "mastery", "versatility"],
  "Vengeance": ["haste", "versatility", "crit", "mastery"],
  "Brewmaster": ["versatility", "crit", "mastery", "haste"],
  "Mistweaver": ["haste", "crit", "versatility", "mastery"],
  "Windwalker": ["mastery", "versatility", "crit", "haste"],
  "Devastation": ["crit", "haste", "mastery", "versatility"],
  "Preservation": ["haste", "crit", "versatility", "mastery"],
  "Augmentation": ["haste", "crit", "mastery", "versatility"],
};

var TALENT_CALC_SLUG = {
  "Warrior": "warrior",
  "Paladin": "paladin",
  "Hunter": "hunter",
  "Rogue": "rogue",
  "Priest": "priest",
  "Death Knight": "death-knight",
  "Shaman": "shaman",
  "Mage": "mage",
  "Warlock": "warlock",
  "Monk": "monk",
  "Druid": "druid",
  "Demon Hunter": "demon-hunter",
  "Evoker": "evoker",
};

var SLOT_LABELS_EN = {
  head: 'Head', neck: 'Neck', shoulder: 'Shoulders', back: 'Back', chest: 'Chest',
  wrist: 'Wrists', hands: 'Hands', waist: 'Waist', legs: 'Legs', feet: 'Feet',
  finger1: 'Ring 1', finger2: 'Ring 2', trinket1: 'Trinket 1', trinket2: 'Trinket 2',
  mainhand: 'Main Hand', offhand: 'Off Hand'
};
var SLOT_LABELS_PT = {
  head: 'Cabeça', neck: 'Pescoço', shoulder: 'Ombros', back: 'Costas', chest: 'Torso',
  wrist: 'Pulsos', hands: 'Mãos', waist: 'Cintura', legs: 'Pernas', feet: 'Pés',
  finger1: 'Anel 1', finger2: 'Anel 2', trinket1: 'Trinket 1', trinket2: 'Trinket 2',
  mainhand: 'Mão Principal', offhand: 'Mão Secundária'
};

function slotLabel(slot) {
  var lang = window._lang || 'en';
  return lang === 'pt-BR' ? (SLOT_LABELS_PT[slot] || slot) : (SLOT_LABELS_EN[slot] || slot);
}

// ── Class/Spec data ──────────────────────────────────────
const CLS_COLOR = {
  'Warrior': '#C69B3A', 'Paladin': '#F48CBA', 'Hunter': '#AAD372', 'Rogue': '#FFF468',
  'Priest': '#d0d0d0', 'Death Knight': '#C41E3A', 'Shaman': '#0070DD', 'Mage': '#3FC7EB',
  'Warlock': '#9d80ee', 'Monk': '#00FF98', 'Druid': '#FF7C0A', 'Demon Hunter': '#A330C9', 'Evoker': '#33C79A'
};

const CLS_EN = {
  'Guerreiro': 'Warrior', 'Paladino': 'Paladin', 'Caçador': 'Hunter', 'Ladino': 'Rogue',
  'Sacerdote': 'Priest', 'Cavaleiro da Morte': 'Death Knight', 'Xamã': 'Shaman', 'Mago': 'Mage',
  'Bruxo': 'Warlock', 'Monge': 'Monk', 'Druida': 'Druid', 'Caçador de Demônios': 'Demon Hunter', 'Conjurante': 'Evoker'
};

const CLS_ICON = {
  'Warrior': 'https://render.worldofwarcraft.com/us/icons/56/classicon_warrior.jpg',
  'Paladin': 'https://render.worldofwarcraft.com/us/icons/56/classicon_paladin.jpg',
  'Hunter': 'https://render.worldofwarcraft.com/us/icons/56/classicon_hunter.jpg',
  'Rogue': 'https://render.worldofwarcraft.com/us/icons/56/classicon_rogue.jpg',
  'Priest': 'https://render.worldofwarcraft.com/us/icons/56/classicon_priest.jpg',
  'Death Knight': 'https://render.worldofwarcraft.com/us/icons/56/classicon_deathknight.jpg',
  'Shaman': 'https://render.worldofwarcraft.com/us/icons/56/classicon_shaman.jpg',
  'Mage': 'https://render.worldofwarcraft.com/us/icons/56/classicon_mage.jpg',
  'Warlock': 'https://render.worldofwarcraft.com/us/icons/56/classicon_warlock.jpg',
  'Monk': 'https://render.worldofwarcraft.com/us/icons/56/classicon_monk.jpg',
  'Druid': 'https://render.worldofwarcraft.com/us/icons/56/classicon_druid.jpg',
  'Demon Hunter': 'https://render.worldofwarcraft.com/us/icons/56/classicon_demonhunter.jpg',
  'Evoker': 'https://render.worldofwarcraft.com/us/icons/56/classicon_evoker.jpg'
};

const ARMOR_TYPE = {
  'Warrior': 'Plate', 'Paladin': 'Plate', 'Death Knight': 'Plate',
  'Hunter': 'Mail', 'Shaman': 'Mail', 'Evoker': 'Mail',
  'Druid': 'Leather', 'Monk': 'Leather', 'Rogue': 'Leather', 'Demon Hunter': 'Leather',
  'Mage': 'Cloth', 'Priest': 'Cloth', 'Warlock': 'Cloth'
};

const SPEC_ID_ROLE = {
  250: ROLE_TANK, 251: ROLE_DPS_MELEE, 252: ROLE_DPS_MELEE,
  577: ROLE_DPS_MELEE, 581: ROLE_TANK,
  102: ROLE_DPS_RANGE, 103: ROLE_DPS_MELEE, 104: ROLE_TANK, 105: ROLE_HEALER,
  1467: ROLE_DPS_RANGE, 1468: ROLE_HEALER, 1473: ROLE_DPS_RANGE,
  253: ROLE_DPS_RANGE, 254: ROLE_DPS_RANGE, 255: ROLE_DPS_MELEE,
  62: ROLE_DPS_RANGE, 63: ROLE_DPS_RANGE, 64: ROLE_DPS_RANGE,
  268: ROLE_TANK, 269: ROLE_DPS_MELEE, 270: ROLE_HEALER,
  65: ROLE_HEALER, 66: ROLE_TANK, 70: ROLE_DPS_MELEE,
  256: ROLE_HEALER, 257: ROLE_HEALER, 258: ROLE_DPS_RANGE,
  259: ROLE_DPS_MELEE, 260: ROLE_DPS_MELEE, 261: ROLE_DPS_MELEE,
  262: ROLE_DPS_RANGE, 263: ROLE_DPS_MELEE, 264: ROLE_HEALER,
  265: ROLE_DPS_RANGE, 266: ROLE_DPS_RANGE, 267: ROLE_DPS_RANGE,
  71: ROLE_DPS_MELEE, 72: ROLE_DPS_MELEE, 73: ROLE_TANK,
};

const SPEC_NAME_ROLE = {
  'Blood': ROLE_TANK, 'Brewmaster': ROLE_TANK, 'Vengeance': ROLE_TANK, 'Guardian': ROLE_TANK, 'Protection': ROLE_TANK,
  'Holy Paladin': ROLE_HEALER, 'Holy Priest': ROLE_HEALER, 'Discipline': ROLE_HEALER,
  'Restoration': ROLE_HEALER, 'Mistweaver': ROLE_HEALER, 'Preservation': ROLE_HEALER,
  'Beast Mastery': ROLE_DPS_RANGE, 'Marksmanship': ROLE_DPS_RANGE, 'Balance': ROLE_DPS_RANGE, 'Elemental': ROLE_DPS_RANGE,
  'Arcane': ROLE_DPS_RANGE, 'Fire': ROLE_DPS_RANGE, 'Affliction': ROLE_DPS_RANGE, 'Demonology': ROLE_DPS_RANGE, 'Destruction': ROLE_DPS_RANGE,
  'Shadow': ROLE_DPS_RANGE, 'Devastation': ROLE_DPS_RANGE, 'Augmentation': ROLE_DPS_RANGE,
  'Arms': 'DPS Melee', 'Fury': 'DPS Melee', 'Havoc': 'DPS Melee', 'Feral': 'DPS Melee',
  'Survival': 'DPS Melee', 'Enhancement': 'DPS Melee', 'Assassination': 'DPS Melee', 'Outlaw': 'DPS Melee',
  'Subtlety': 'DPS Melee', 'Retribution': 'DPS Melee', 'Windwalker': 'DPS Melee', 'Unholy': 'DPS Melee',
  'Soulrend': 'DPS Ranged', 'Fleshcraft': 'DPS Ranged', 'Devourer': 'DPS Ranged',
};

function inferRoleFromSpecId(specId) { return SPEC_ID_ROLE[specId] || null; }
function inferRoleFromSpecName(specName) {
  if (!specName) return ROLE_DPS_MELEE;
  if (SPEC_NAME_ROLE[specName]) return SPEC_NAME_ROLE[specName];
  for (var k in SPEC_NAME_ROLE) { if (specName.toLowerCase().includes(k.toLowerCase())) return SPEC_NAME_ROLE[k]; }
  return ROLE_DPS_MELEE;
}

function normalizeClass(cls) { return CLS_EN[cls] || cls; }
function getClassColor(cls) { return CLS_COLOR[cls] || CLS_COLOR[normalizeClass(cls)] || '#c8bfa0'; }
function getClassIcon(cls) { return CLS_ICON[cls] || CLS_ICON[normalizeClass(cls)] || ''; }
function getArmorType(cls) { return ARMOR_TYPE[cls] || ARMOR_TYPE[normalizeClass(cls)] || '—'; }

var SLOT_LABELS = SLOT_LABELS_PT;
var SLOT_ORDER = Object.keys(SLOT_LABELS_PT);
var ENCHANTABLE = ['back', 'chest', 'wrist', 'legs', 'feet', 'finger1', 'finger2', 'mainhand'];
var GEMMABLE = ['head', 'neck', 'back', 'chest', 'wrist', 'hands', 'waist', 'legs', 'feet', 'finger1', 'finger2'];
var SLOT_MAP = {
  HEAD: 'head', NECK: 'neck', SHOULDER: 'shoulder', BACK: 'back', CHEST: 'chest',
  WRIST: 'wrist', HANDS: 'hands', WAIST: 'waist', LEGS: 'legs', FEET: 'feet',
  FINGER_1: 'finger1', FINGER_2: 'finger2', TRINKET_1: 'trinket1', TRINKET_2: 'trinket2',
  MAIN_HAND: 'mainhand', OFF_HAND: 'offhand'
};

var ALL_CLASSES = ['Warrior', 'Paladin', 'Hunter', 'Rogue', 'Priest', 'Death Knight', 'Shaman', 'Mage', 'Warlock', 'Monk', 'Druid', 'Demon Hunter', 'Evoker'];

