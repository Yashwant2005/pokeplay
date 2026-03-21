const INSTANT_HAPPINESS_EVOLUTION_SPECIES = new Set([
  'azurill',
  'budew',
  'chansey',
  'chingling',
  'cleffa',
  'golbat',
  'happiny',
  'igglybuff',
  'munchlax',
  'pichu',
  'riolu',
  'swadloon',
  'togepi',
  'type-null',
  'woobat'
]);
const {
  getEvolutionStoneForTarget,
  getEvolutionStoneCount,
  getLocalEvolutionTimeInfo
} = require('./evolution_items');

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function getPseudoRandomEvolutionLevel(pokemonName, evolutionRow) {
  const seed = normalizeName(pokemonName) + '|' + normalizeName(evolutionRow && evolutionRow.evolved_pokemon);
  let hash = 0;
  for (const ch of seed) {
    hash = ((hash * 31) + ch.charCodeAt(0)) >>> 0;
  }
  return 24 + (hash % 13);
}

function getEvolutionBaseName(pokemonName, forms) {
  const currentName = normalizeName(pokemonName);
  if (!currentName) return '';
  if (!forms || typeof forms !== 'object') return currentName;

  for (const [baseName, variants] of Object.entries(forms)) {
    if (!Array.isArray(variants)) continue;
    if (variants.some((form) => normalizeName(form && form.identifier) === currentName)) {
      return normalizeName(baseName);
    }
  }

  return currentName;
}

function getEvolutionRowsForPokemon(pokemonName, chains, forms) {
  const baseName = getEvolutionBaseName(pokemonName, forms);
  if (!baseName || !chains || !Array.isArray(chains.evolution_chains)) return [];
  return chains.evolution_chains.filter((row) => normalizeName(row.current_pokemon) === baseName);
}

function canUseInstantHappinessEvolution(pokemonName, evolutionRow) {
  const baseName = normalizeName(pokemonName);
  if (!INSTANT_HAPPINESS_EVOLUTION_SPECIES.has(baseName)) return false;
  return normalizeName(evolutionRow && evolutionRow.evolution_method) === 'level-up';
}

function isEeveeTimeEvolutionAllowed(pokemonName, evolutionRow, now) {
  if (normalizeName(pokemonName) !== 'eevee') return true;
  const target = normalizeName(evolutionRow && evolutionRow.evolved_pokemon);
  if (!['espeon', 'umbreon', 'sylveon'].includes(target)) return true;
  const bucket = getLocalEvolutionTimeInfo(now).bucket;
  if (target === 'sylveon') return bucket === 'evening';
  if (target === 'umbreon') return bucket === 'night';
  if (target === 'espeon') return bucket === 'day';
  return true;
}

function isEvolutionRequirementMet(pokemonName, currentLevel, evolutionRow, options) {
  const opts = options || {};
  if (!evolutionRow) return false;
  const method = normalizeName(evolutionRow.evolution_method);
  if (!isEeveeTimeEvolutionAllowed(pokemonName, evolutionRow, opts.now)) return false;
  if (method === 'use-item') {
    const stoneName = getEvolutionStoneForTarget(evolutionRow.evolved_pokemon);
    const levelNeeded = getPseudoRandomEvolutionLevel(pokemonName, evolutionRow);
    if (!stoneName) {
      return Number(currentLevel) >= levelNeeded;
    }
    return Number(currentLevel) >= levelNeeded && getEvolutionStoneCount(opts.data, stoneName) > 0;
  }
  if (canUseInstantHappinessEvolution(pokemonName, evolutionRow)) return true;
  if (method === 'level-up' || method === 'other') {
    const levelNeeded = Number(evolutionRow.evolution_level) || 1;
    return Number(currentLevel) >= levelNeeded;
  }
  return false;
}

function getReadyEvolutionRows(pokemonName, currentLevel, chains, forms, options) {
  return getEvolutionRowsForPokemon(pokemonName, chains, forms).filter((row) =>
    isEvolutionRequirementMet(pokemonName, currentLevel, row, options)
  );
}

module.exports = {
  INSTANT_HAPPINESS_EVOLUTION_SPECIES,
  getEvolutionBaseName,
  getEvolutionRowsForPokemon,
  getPseudoRandomEvolutionLevel,
  isEvolutionRequirementMet,
  getReadyEvolutionRows
};
