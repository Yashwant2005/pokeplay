const ARCEUS_PLATES = [
  { item: 'draco-plate', type: 'dragon', title: 'Draco Plate' },
  { item: 'dread-plate', type: 'dark', title: 'Dread Plate' },
  { item: 'earth-plate', type: 'ground', title: 'Earth Plate' },
  { item: 'fist-plate', type: 'fighting', title: 'Fist Plate' },
  { item: 'flame-plate', type: 'fire', title: 'Flame Plate' },
  { item: 'icicle-plate', type: 'ice', title: 'Icicle Plate' },
  { item: 'insect-plate', type: 'bug', title: 'Insect Plate' },
  { item: 'iron-plate', type: 'steel', title: 'Iron Plate' },
  { item: 'meadow-plate', type: 'grass', title: 'Meadow Plate' },
  { item: 'mind-plate', type: 'psychic', title: 'Mind Plate' },
  { item: 'pixie-plate', type: 'fairy', title: 'Pixie Plate' },
  { item: 'sky-plate', type: 'flying', title: 'Sky Plate' },
  { item: 'splash-plate', type: 'water', title: 'Splash Plate' },
  { item: 'spooky-plate', type: 'ghost', title: 'Spooky Plate' },
  { item: 'stone-plate', type: 'rock', title: 'Stone Plate' },
  { item: 'toxic-plate', type: 'poison', title: 'Toxic Plate' },
  { item: 'zap-plate', type: 'electric', title: 'Zap Plate' }
];

const ARCEUS_PLATE_MAP = ARCEUS_PLATES.reduce((acc, entry) => {
  acc[entry.item] = entry.type;
  return acc;
}, {});

const HELD_ITEM_PC_TIERS = [
  {
    pc: 30000,
    lp: 1500,
    items: [
      'heat-rock',
      'damp-rock',
      'rocky-helmet',
      'big-root',
      'choice-band',
      'choice-scarf',
      'choice-specs',
      'life-orb',
      'leftovers',
      'eviolite'
    ]
  },
  {
    pc: 50000,
    lp: 2500,
    items: [
      'blunder-policy',
      'assault-vest',
      'air-balloon',
      'power-herb'
    ]
  },
  {
    pc: 60000,
    lp: 3000,
    items: [
      'focus-sash',
      'weakness-policy',
      'tatsugiri-lunchbox',
      'clear-amulet'
    ]
  },
  {
    pc: 100000,
    lp: 3000,
    items: [
      'booster-energy'
    ]
  }
];

const HELD_ITEM_POOL = HELD_ITEM_PC_TIERS.flatMap((tier) => tier.items);

const HELD_ITEM_ALIASES = {
  airballoon: 'air-balloon',
  'air-balloon': 'air-balloon',
  assaultvest: 'assault-vest',
  'assault-vest': 'assault-vest',
  bigroot: 'big-root',
  'big-root': 'big-root',
  clearamulet: 'clear-amulet',
  'clear-amulet': 'clear-amulet',
  rockyhelmet: 'rocky-helmet',
  'rocky-helmet': 'rocky-helmet',
  tatsugirilunchbox: 'tatsugiri-lunchbox',
  'tatsugiri-lunchbox': 'tatsugiri-lunchbox',
  choiceband: 'choice-band',
  'choice-band': 'choice-band',
  choicescarf: 'choice-scarf',
  'choice-scarf': 'choice-scarf',
  choicespecs: 'choice-specs',
  'choice-specs': 'choice-specs',
  eviolite: 'eviolite',
  evolite: 'eviolite',
  focussash: 'focus-sash',
  'focus-sash': 'focus-sash',
  lifeorb: 'life-orb',
  'life-orb': 'life-orb',
  lightball: 'light-ball',
  'light-ball': 'light-ball',
  blunderpolicy: 'blunder-policy',
  'blunder-policy': 'blunder-policy',
  leftovers: 'leftovers',
  leftoverss: 'leftovers',
  weaknesspolicy: 'weakness-policy',
  'weakness-policy': 'weakness-policy',
  powerherb: 'power-herb',
  'power-herb': 'power-herb',
  heatrock: 'heat-rock',
  'heat-rock': 'heat-rock',
  damprock: 'damp-rock',
  'damp-rock': 'damp-rock',
  boosterenergy: 'booster-energy',
  'booster-energy': 'booster-energy'
};

for (const entry of ARCEUS_PLATES) {
  HELD_ITEM_ALIASES[entry.item] = entry.item;
  HELD_ITEM_ALIASES[entry.item.replace(/-/g, '')] = entry.item;
}

function normalizeHeldItemShopName(value) {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-');
  const compact = raw.replace(/-/g, '');
  return HELD_ITEM_ALIASES[raw] || HELD_ITEM_ALIASES[compact] || raw;
}

function titleCaseHeldItem(value) {
  return String(value || 'none')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'None';
}

function getArceusPlateType(itemName) {
  const normalized = normalizeHeldItemShopName(itemName);
  return ARCEUS_PLATE_MAP[normalized] || '';
}

function getHeldItemDescription(itemName) {
  const normalized = normalizeHeldItemShopName(itemName);
  const plateType = getArceusPlateType(normalized);
  if (plateType) {
    return 'Boosts ' + titleCaseHeldItem(plateType) + '-type moves by 20%. If Arceus holds it, Arceus becomes ' + titleCaseHeldItem(plateType) + '-type and Judgment becomes ' + titleCaseHeldItem(plateType) + '-type.';
  }

  const descriptions = {
    'air-balloon': 'Grants Ground immunity until the holder is hit by a damaging move.',
    'assault-vest': 'Raises Special Defense by 50%, but the holder cannot use status moves.',
    'big-root': 'Boosts HP recovered from draining and healing-drain effects.',
    'blunder-policy': 'If a move misses, the holder sharply raises its Speed once.',
    'booster-energy': 'Consumable future item. Battle effect not added yet.',
    'choice-band': 'Raises Attack by 50%, but the holder is locked into its first selected move.',
    'choice-scarf': 'Raises Speed by 50%, but the holder is locked into its first selected move.',
    'choice-specs': 'Raises Special Attack by 50%, but the holder is locked into its first selected move.',
    'clear-amulet': 'Prevents opponents from lowering the holder\'s stats.',
    eviolite: 'Raises Defense and Special Defense by 50% if the holder can still evolve.',
    'focus-sash': 'At full HP, surviving a knockout hit leaves the holder at 1 HP once.',
    'heat-rock': 'Extends Harsh Sunlight from Sunny Day or Max Flare from 5 turns to 8 turns.',
    'life-orb': 'Boosts damage by about 30%, but the holder loses HP after attacking.',
    leftovers: 'Restores a small amount of HP at the end of each turn.',
    'damp-rock': 'Extends Rain from Rain Dance or Max Geyser from 5 turns to 8 turns.',
    'power-herb': 'Skips the charge turn of a two-turn move once.',
    'rocky-helmet': 'Damages foes that make contact with the holder.',
    'tatsugiri-lunchbox': 'Special Dondozo item. Grants a strong temporary stat burst on entry.',
    'weakness-policy': 'After taking a super-effective hit, sharply raises Attack and Special Attack.',
    'light-ball': 'Doubles Pikachu\'s Attack and Special Attack.'
  };

  return descriptions[normalized] || 'Held battle item.';
}

function getHeldItemCatalog() {
  return HELD_ITEM_PC_TIERS.map((tier) => ({
    ...tier,
    items: [...tier.items]
  }));
}

function getHeldItemPrice(itemName, currency) {
  const name = normalizeHeldItemShopName(itemName);
  const tier = HELD_ITEM_PC_TIERS.find((entry) => entry.items.includes(name));
  if (!tier) return null;
  if (currency === 'lp') return tier.lp;
  return tier.pc;
}

module.exports = {
  ARCEUS_PLATES,
  HELD_ITEM_POOL,
  getArceusPlateType,
  getHeldItemCatalog,
  getHeldItemDescription,
  getHeldItemPrice,
  normalizeHeldItemShopName,
  titleCaseHeldItem
};
