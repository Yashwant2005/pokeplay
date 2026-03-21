const DEFAULT_POKESTATS = (() => {
  try {
    return require('../data/pokemon_base_stats_info2.json') || {};
  } catch (error) {
    return {};
  }
})();

const IMPERSONATE_TARGETS = [
  'vaporeon',
  'jolteon',
  'flareon',
  'espeon',
  'umbreon',
  'leafeon',
  'glaceon',
  'sylveon'
];

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function normalizeAbility(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-');
}

function isImpersonateEevee(pokemonName, abilityName) {
  const name = normalizeName(pokemonName);
  const ability = normalizeAbility(abilityName);
  return (name === 'eevee' || name === 'eevee-starter') && ability === 'impersonate';
}

function ensureImpersonateState(battleData) {
  if (!battleData.impersonateState || typeof battleData.impersonateState !== 'object') {
    battleData.impersonateState = {};
  }
  return battleData.impersonateState;
}

function activateImpersonateForPass(options) {
  const { battleData, pass, pokemonName, abilityName } = options || {};
  if (!battleData || !pass) return '';
  const state = ensureImpersonateState(battleData);
  const key = String(pass);
  if (!isImpersonateEevee(pokemonName, abilityName)) {
    delete state[key];
    return '';
  }
  state[key] = IMPERSONATE_TARGETS[Math.floor(Math.random() * IMPERSONATE_TARGETS.length)];
  return state[key];
}

function getImpersonateTargetName(options) {
  const { battleData, pass, pokemonName, abilityName } = options || {};
  if (!battleData || !pass || !isImpersonateEevee(pokemonName, abilityName)) return '';
  const state = ensureImpersonateState(battleData);
  const key = String(pass);
  if (!state[key]) {
    return activateImpersonateForPass({ battleData, pass, pokemonName, abilityName });
  }
  return state[key];
}

function getBattleBaseStats(options) {
  const { battleData, pass, pokemonName, abilityName, pokestats } = options || {};
  const statsMap = pokestats || DEFAULT_POKESTATS;
  const normalizedName = normalizeName(pokemonName);
  const base = statsMap[normalizedName];
  if (!base) return base;
  if (!isImpersonateEevee(normalizedName, abilityName)) return base;
  const targetName = getImpersonateTargetName({ battleData, pass, pokemonName: normalizedName, abilityName });
  const targetBase = statsMap[targetName];
  if (!targetBase) return base;
  return {
    ...base,
    hp: Math.floor(Number(base.hp || 0) + (Number(targetBase.hp || 0) / 2)),
    attack: Math.floor(Number(base.attack || 0) + (Number(targetBase.attack || 0) / 2)),
    defense: Math.floor(Number(base.defense || 0) + (Number(targetBase.defense || 0) / 2)),
    special_attack: Math.floor(Number(base.special_attack || 0) + (Number(targetBase.special_attack || 0) / 2)),
    special_defense: Math.floor(Number(base.special_defense || 0) + (Number(targetBase.special_defense || 0) / 2)),
    speed: Math.floor(Number(base.speed || 0) + (Number(targetBase.speed || 0) / 2))
  };
}

module.exports = {
  activateImpersonateForPass,
  getBattleBaseStats,
  getImpersonateTargetName
};
