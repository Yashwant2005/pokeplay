const dmoves = require('../data/moves_info.json');

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
  return String((pokemon && pokemon.name) || '').toLowerCase() === 'rayquaza'
    && pokemonKnowsMove(pokemon, 'dragon ascent');
}

function getPokemonHeldItemRestrictionMessage(pokemon) {
  if (isRayquazaLockedFromHeldItems(pokemon)) {
    return 'Rayquaza that knows Dragon Ascent cannot hold held items.';
  }
  return '';
}

function getSanitizedHeldItemForPokemon(pokemon, fallbackHeldItem) {
  if (isRayquazaLockedFromHeldItems(pokemon)) {
    return 'none';
  }
  return String(fallbackHeldItem || (pokemon && pokemon.held_item) || 'none');
}

module.exports = {
  getPokemonHeldItemRestrictionMessage,
  getSanitizedHeldItemForPokemon,
  isRayquazaLockedFromHeldItems,
  normalizeMoveName,
  pokemonKnowsMove
};
