const { normalizeAbilityName, getBattleHeldItemName } = require('./battle_abilities');

const ABILITY_BY_FORM = (() => {
  try {
    return require('../data/pokemon_abilities_cache.json') || {};
  } catch (error) {
    return {};
  }
})();

function normalizeHeldItemForForm(value) {
  return String(value || 'none')
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function getItemDrivenFormName(pokemonName, heldItemName) {
  const normalizedName = String(pokemonName || '').toLowerCase();
  const item = normalizeHeldItemForForm(heldItemName);
  if (normalizedName === 'zacian' || normalizedName === 'zacian-crowned') {
    return item === 'rusted-sword' ? 'zacian-crowned' : 'zacian';
  }
  if (normalizedName === 'zamazenta' || normalizedName === 'zamazenta-crowned') {
    return item === 'rusted-shield' ? 'zamazenta-crowned' : 'zamazenta';
  }
  if (normalizedName === 'groudon' || normalizedName === 'groudon-primal') {
    return item === 'red-orb' ? 'groudon-primal' : 'groudon';
  }
  if (normalizedName === 'kyogre' || normalizedName === 'kyogre-primal') {
    return item === 'blue-orb' ? 'kyogre-primal' : 'kyogre';
  }
  return normalizedName;
}

function getCanonicalFormAbility(pokemonName, fallbackAbility) {
  const normalizedName = String(pokemonName || '').toLowerCase();
  const pool = ABILITY_BY_FORM[normalizedName];
  if (Array.isArray(pool) && pool.length > 0) {
    return String(pool[0]);
  }
  return String(fallbackAbility || 'none');
}

function ensureBattleFormStateTracker(battleData) {
  if (!battleData.formState || typeof battleData.formState !== 'object') {
    battleData.formState = {};
  }
  if (!battleData.formState.originalName || typeof battleData.formState.originalName !== 'object') {
    battleData.formState.originalName = {};
  }
  if (!battleData.formState.originalAbility || typeof battleData.formState.originalAbility !== 'object') {
    battleData.formState.originalAbility = {};
  }
  return battleData.formState;
}

function syncBattleFormAndAbility(options) {
  const { battleData, pokemon, pass, heldItem, forceName, pokestats } = options || {};
  if (!battleData || !pokemon || !pass || !pokestats) return false;

  const tracker = ensureBattleFormStateTracker(battleData);
  const passKey = String(pass);
  const normalizedCurrent = String(pokemon.name || '').toLowerCase();
  const keyItemEnabled = !battleData.set || battleData.set.key_item !== false;
  const heldItemName = heldItem !== undefined
    ? heldItem
    : getBattleHeldItemName({ battleData, pass, heldItem: pokemon.held_item });

  let desiredName = normalizedCurrent;
  if (forceName && pokestats[String(forceName).toLowerCase()]) {
    desiredName = String(forceName).toLowerCase();
  } else if (keyItemEnabled) {
    desiredName = getItemDrivenFormName(normalizedCurrent, heldItemName);
  }

  let changed = false;
  if (desiredName && desiredName !== normalizedCurrent && pokestats[desiredName]) {
    if (!tracker.originalName[passKey]) tracker.originalName[passKey] = normalizedCurrent;
    if (!tracker.originalAbility[passKey]) tracker.originalAbility[passKey] = pokemon.ability;
    pokemon.name = desiredName;
    changed = true;
  }

  const activeName = String(pokemon.name || '').toLowerCase();
  const shouldSyncAbility =
    !!forceName ||
    changed ||
    /-mega|-primal|-crowned|zygarde-complete/.test(activeName);

  if (shouldSyncAbility) {
    const canonicalAbility = getCanonicalFormAbility(activeName, pokemon.ability);
    if (normalizeAbilityName(canonicalAbility) !== normalizeAbilityName(pokemon.ability)) {
      if (!tracker.originalAbility[passKey]) tracker.originalAbility[passKey] = pokemon.ability;
      pokemon.ability = canonicalAbility;
      changed = true;
    }
  }

  return changed;
}

function revertTrackedFormsOnBattleEnd(battleData, userData) {
  if (!battleData || !battleData.formState || !userData || !Array.isArray(userData.pokes)) return;
  const state = battleData.formState;
  const originalName = state.originalName || {};
  const originalAbility = state.originalAbility || {};
  const passKeys = new Set([...Object.keys(originalName), ...Object.keys(originalAbility)]);
  for (const pass of passKeys) {
    const poke = userData.pokes.find((entry) => String(entry.pass) === String(pass));
    if (!poke) continue;
    if (originalName[pass]) poke.name = originalName[pass];
    if (originalAbility[pass]) poke.ability = originalAbility[pass];
  }

  for (const poke of userData.pokes) {
    if (String(poke && poke.name || '').toLowerCase() === 'zygarde-complete') {
      poke.name = 'zygarde-50';
    }
  }
}

module.exports = {
  syncBattleFormAndAbility,
  revertTrackedFormsOnBattleEnd,
  getItemDrivenFormName,
  getCanonicalFormAbility
};
