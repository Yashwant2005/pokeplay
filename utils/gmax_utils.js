const { toBaseIdentifier } = require('./base_form_pokemon');

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function isGigantamaxName(name) {
  return normalizeName(name).includes('gmax');
}

function getGigantamaxFormName(pokemonName, formsMap) {
  const normalized = normalizeName(pokemonName);
  if (!normalized) return '';
  if (isGigantamaxName(normalized)) return normalized;

  const direct = Array.isArray(formsMap && formsMap[normalized]) ? formsMap[normalized] : [];
  const directHit = direct.find((entry) => isGigantamaxName(entry && entry.identifier));
  if (directHit && directHit.identifier) return normalizeName(directHit.identifier);

  const keys = Object.keys(formsMap || {});
  for (const key of keys) {
    const list = Array.isArray(formsMap[key]) ? formsMap[key] : [];
    if (!list.some((entry) => normalizeName(entry && entry.identifier) === normalized)) continue;

    const regionHints = ['galar', 'hisui', 'alola', 'paldea'];
    const matchingRegion = regionHints.find((hint) => normalized.includes(hint));
    if (matchingRegion) {
      const regionHit = list.find((entry) => {
        const id = normalizeName(entry && entry.identifier);
        return isGigantamaxName(id) && id.includes(matchingRegion);
      });
      if (regionHit && regionHit.identifier) return normalizeName(regionHit.identifier);
    }

    const hit = list.find((entry) => isGigantamaxName(entry && entry.identifier));
    if (hit && hit.identifier) return normalizeName(hit.identifier);
  }

  return '';
}

function getDisplayPokemonSymbol(pokemon) {
  const symbol = String((pokemon && pokemon.symbol) || '');
  if (symbol === '✘' || symbol === 'âœ˜') {
    return '✘';
  }
  if (pokemon && isGigantamaxName(pokemon.name)) {
    return '✘';
  }
  return symbol;
}

function getDisplayPokemonName(pokemon, formsMap) {
  const rawName = String((pokemon && pokemon.name) || '');
  const normalized = normalizeName(rawName);
  if (!normalized) return rawName;

  if (String((pokemon && pokemon.symbol) || '') === '✘' || String((pokemon && pokemon.symbol) || '') === 'âœ˜' || isGigantamaxName(normalized)) {
    return toBaseIdentifier(normalized, formsMap || {});
  }

  return normalized;
}

module.exports = {
  getDisplayPokemonName,
  getDisplayPokemonSymbol,
  getGigantamaxFormName,
  isGigantamaxName,
  normalizeName
};
