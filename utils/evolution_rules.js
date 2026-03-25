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

const REGIONAL_FORM_TAGS = ['alola', 'galar', 'hisui', 'paldea'];
const BLOCKED_EVOLUTION_FORM_TOKENS = [
  'ash',
  'battle-bond',
  'busted',
  'complete',
  'crowned',
  'eternamax',
  'gmax',
  'mega',
  'origin',
  'primal',
  'starter',
  'totem',
  'zen'
];

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function splitTokens(value) {
  return normalizeName(value).split('-').filter(Boolean);
}

function getCurrentFormEntry(pokemonName, forms) {
  const target = normalizeName(pokemonName);
  if (!target || !forms || typeof forms !== 'object') return null;

  for (const variants of Object.values(forms)) {
    if (!Array.isArray(variants)) continue;
    const match = variants.find((entry) => normalizeName(entry && entry.identifier) === target);
    if (match) return match;
  }

  return null;
}

function getFormTokensFromEntry(entry) {
  return splitTokens(entry && entry.form_identifier);
}

function isBattleOnlyForm(entry) {
  return normalizeName(entry && entry.is_battle_only) === '1';
}

function isBlockedEvolutionTarget(entry) {
  const id = normalizeName(entry && entry.identifier);
  const form = normalizeName(entry && entry.form_identifier);
  return BLOCKED_EVOLUTION_FORM_TOKENS.some((token) => id.includes(token) || form.includes(token));
}

function getRegionalTag(tokens) {
  return REGIONAL_FORM_TAGS.find((tag) => tokens.includes(tag)) || '';
}

function getComparableFormTokens(tokens) {
  return tokens.filter((token) =>
    token
    && !REGIONAL_FORM_TAGS.includes(token)
    && token !== 'standard'
    && !BLOCKED_EVOLUTION_FORM_TOKENS.includes(token)
  );
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

function resolveEvolutionTargetIdentifier(currentName, evolvedPokemon, forms) {
  const speciesKey = normalizeName(evolvedPokemon);
  const candidates = Array.isArray(forms && forms[speciesKey])
    ? forms[speciesKey].filter((entry) => !isBattleOnlyForm(entry) && !isBlockedEvolutionTarget(entry))
    : [];

  if (!candidates.length) return speciesKey;

  const currentEntry = getCurrentFormEntry(currentName, forms);
  const currentTokens = currentEntry ? getFormTokensFromEntry(currentEntry) : splitTokens(currentName);
  const currentRegionalTag = getRegionalTag(currentTokens);
  const currentComparableTokens = new Set(getComparableFormTokens(currentTokens));

  let best = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const candidate of candidates) {
    const identifier = normalizeName(candidate && candidate.identifier);
    const formIdentifier = normalizeName(candidate && candidate.form_identifier);
    const candidateTokens = getFormTokensFromEntry(candidate);
    const candidateRegionalTag = getRegionalTag(candidateTokens);
    const candidateComparableTokens = getComparableFormTokens(candidateTokens);

    let score = 0;

    if (currentRegionalTag) {
      score += candidateRegionalTag === currentRegionalTag ? 500 : -250;
    } else if (candidateRegionalTag) {
      score -= 150;
    }

    for (const token of candidateComparableTokens) {
      if (currentComparableTokens.has(token)) score += 120;
    }

    if (!formIdentifier) score += 220;
    if (formIdentifier === 'standard') score += 180;
    if (currentRegionalTag && formIdentifier === currentRegionalTag + '-standard') score += 180;
    if (normalizeName(candidate && candidate.is_default) === '1') score += 40;

    const formOrder = Number(candidate && candidate.form_order);
    if (Number.isFinite(formOrder)) {
      score -= formOrder / 1000;
    }

    if (score > bestScore) {
      bestScore = score;
      best = identifier;
    }
  }

  return best || speciesKey;
}

module.exports = {
  INSTANT_HAPPINESS_EVOLUTION_SPECIES,
  getEvolutionBaseName,
  getEvolutionRowsForPokemon,
  getPseudoRandomEvolutionLevel,
  isEvolutionRequirementMet,
  getReadyEvolutionRows,
  resolveEvolutionTargetIdentifier
};
