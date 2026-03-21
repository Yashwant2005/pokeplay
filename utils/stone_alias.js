function normalizeHeldStone(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-');
}

function normalizePokemonName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-');
}

function buildStoneAliasMap(stones) {
  const map = {};
  if (!stones || typeof stones !== 'object') return map;
  for (const [key, info] of Object.entries(stones)) {
    const pokemon = info && info.pokemon ? normalizePokemonName(info.pokemon) : '';
    const mega = info && info.mega ? String(info.mega) : '';
    if (!pokemon || !mega.toLowerCase().includes('mega')) continue;
    const alias = normalizeHeldStone(pokemon + 'ite');
    if (alias && !stones[alias]) {
      map[alias] = key;
    }
  }
  if (stones && stones['blastoisinite']) {
    map['blastoisinite'] = 'blastoisinite';
  }
  return map;
}

function normalizeStoneKey(value, stones) {
  const base = normalizeHeldStone(value);
  if (stones && stones[base]) return base;
  const typoMap = {
    blastoisinite: 'blastoisinite',
    blastoisnite: 'blastoisinite',
    blastoisenite: 'blastoisinite',
    blastoiseinite: 'blastoisinite'
  };
  if (typoMap[base]) return typoMap[base];
  const aliasMap = buildStoneAliasMap(stones);
  if (aliasMap[base]) return aliasMap[base];
  return base;
}

module.exports = {
  normalizeStoneKey,
  normalizePokemonName,
  normalizeHeldStone
};
