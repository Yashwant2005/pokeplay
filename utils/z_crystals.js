const Z_CRYSTALS = [
  'normalium-z',
  'firium-z',
  'waterium-z',
  'electrium-z',
  'grassium-z',
  'icium-z',
  'fightinium-z',
  'poisonium-z',
  'groundium-z',
  'flyinium-z',
  'psychium-z',
  'buginium-z',
  'rockium-z',
  'ghostium-z',
  'dragonium-z',
  'darkinium-z',
  'steelium-z',
  'fairium-z',
  'aloraichium-z',
  'decidium-z',
  'eevium-z',
  'incinium-z',
  'kommonium-z',
  'lunalium-z',
  'lycanium-z',
  'marshadium-z',
  'mewnium-z',
  'mewtwonium-z',
  'mewtwonium-z-x',
  'mewtwonium-z-y',
  'mimikium-z',
  'pikanium-z',
  'pikashunium-z',
  'primarium-z',
  'snorlium-z',
  'solganium-z',
  'tapunium-z',
  'ultranecrozium-z'
];

function normalizeZCrystalName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-');
}

const Z_CRYSTAL_ALIASES = Z_CRYSTALS.reduce((acc, entry) => {
  acc[entry] = entry;
  acc[entry.replace(/-/g, '')] = entry;
  return acc;
}, {});

function resolveZCrystalName(value) {
  const normalized = normalizeZCrystalName(value);
  const compact = normalized.replace(/-/g, '');
  return Z_CRYSTAL_ALIASES[normalized] || Z_CRYSTAL_ALIASES[compact] || '';
}

function titleCaseZCrystal(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

module.exports = {
  Z_CRYSTALS,
  normalizeZCrystalName,
  resolveZCrystalName,
  titleCaseZCrystal
};
