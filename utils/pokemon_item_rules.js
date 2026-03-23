const dmoves = require('../data/moves_info.json');
const { normalizeStoneKey, normalizePokemonName } = require('./stone_alias');

const STONES = (() => {
  try {
    return require('../data/stones.json') || {};
  } catch (error) {
    return {};
  }
})();

function normalizeMoveName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function pokemonKnowsMove(pokemon, moveName) {
  const target = normalizeMoveName(moveName);
  return Array.isArray(pokemon && pokemon.moves) && pokemon.moves.some((move) => {
    if (!move) return false;
    if (typeof move === 'string' || typeof move === 'number') {
      const normalizedRaw = normalizeMoveName(move);
      if (normalizedRaw === target) return true;
      const moveMeta = dmoves[String(move)];
      return normalizeMoveName(moveMeta && moveMeta.name) === target;
    }
    const directName = normalizeMoveName(move.name || move.move || move.id);
    if (directName === target) return true;
    const moveMeta = dmoves[String(move.id || move.move_id || move.moveId || '')];
    return normalizeMoveName(moveMeta && moveMeta.name) === target;
  });
}

function isRayquazaLockedFromHeldItems(pokemon) {
  return false;
}

function normalizeHeldItemKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-');
}

function matchesPokemon(pokemonName, requiredName) {
  const p = normalizePokemonName(pokemonName);
  const r = normalizePokemonName(requiredName);
  if (!p || !r) return false;
  return p === r || p.startsWith(r + '-');
}

function isHeldItemCompatibleWithPokemon(pokemon, heldItem) {
  if (!pokemon || !heldItem) return true;
  const itemKey = normalizeHeldItemKey(heldItem);
  const forced = {
    'rusted-sword': ['zacian'],
    'rusted-shield': ['zamazenta'],
    'red-orb': ['groudon'],
    'blue-orb': ['kyogre'],
    'jade-orb': ['rayquaza']
  };
  if (forced[itemKey]) {
    return forced[itemKey].some((name) => matchesPokemon(pokemon.name, name));
  }
  const stoneKey = normalizeStoneKey(heldItem, STONES);
  const stone = STONES && STONES[stoneKey];
  if (stone && stone.pokemon) {
    return matchesPokemon(pokemon.name, stone.pokemon);
  }
  return true;
}

function getPokemonHeldItemRestrictionMessage(pokemon, heldItem) {
  if (isRayquazaLockedFromHeldItems(pokemon)) {
    return 'Held items are disabled for this Pokemon.';
  }
  if (!heldItem || String(heldItem).toLowerCase() === 'none') {
    return '';
  }
  if (!isHeldItemCompatibleWithPokemon(pokemon, heldItem)) {
    return 'That item does not match this Pokemon.';
  }
  return '';
}

function getSanitizedHeldItemForPokemon(pokemon, fallbackHeldItem) {
  const item = String(fallbackHeldItem || (pokemon && pokemon.held_item) || 'none');
  if (isRayquazaLockedFromHeldItems(pokemon)) {
    return 'none';
  }
  if (item.toLowerCase() === 'none') {
    return 'none';
  }
  if (!isHeldItemCompatibleWithPokemon(pokemon, item)) {
    return 'none';
  }
  return item;
}

module.exports = {
  getPokemonHeldItemRestrictionMessage,
  getSanitizedHeldItemForPokemon,
  isRayquazaLockedFromHeldItems,
  normalizeMoveName,
  pokemonKnowsMove
};
