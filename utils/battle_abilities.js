const { getArceusPlateType } = require('./held_item_shop');

const STAT_KEYS = ['attack', 'defense', 'special_attack', 'special_defense', 'speed', 'accuracy', 'evasion'];
const MAIN_BATTLE_STATS = ['attack', 'defense', 'special_attack', 'special_defense', 'speed'];
const WIND_MOVE_NAMES = new Set([
  'air cutter',
  'air slash',
  'bleakwind storm',
  'fairy wind',
  'gust',
  'heat wave',
  'hurricane',
  'icy wind',
  'ominous wind',
  'petal blizzard',
  'razor wind',
  'silver wind',
  'springtide storm',
  'tailwind',
  'twister',
  'whirlwind'
]);
const NORMAL_MOVE_TYPE_OVERRIDE_ABILITIES = {
  aerilate: 'flying',
  galvanize: 'electric',
  dragonize: 'dragon'
};

function normalizeAbilityName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/armour/g, 'armor')
    .replace(/-+/g, '-')
    .trim();
}

function normalizeMoveName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[_\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getAbilityWeatherOverride(abilityName) {
  return normalizeAbilityName(abilityName) === 'mega-sol' ? 'sun' : '';
}

function titleCaseHyphenated(value) {
  return String(value || '')
    .split('-')
    .map((part) => part ? part.charAt(0).toUpperCase() + part.slice(1) : part)
    .join(' ');
}

function clampStage(stage) {
  return Math.max(-6, Math.min(6, Number(stage) || 0));
}

function getStageMultiplier(stage) {
  if (stage >= 0) return (2 + stage) / 2;
  return 2 / (2 - stage);
}

function applyStageToStat(baseValue, stage) {
  return Math.max(1, Math.floor(Number(baseValue || 0) * getStageMultiplier(Number(stage) || 0)));
}

function getStageVerb(delta) {
  const magnitude = Math.abs(delta);
  if (delta > 0) {
    if (magnitude >= 3) return 'rose drastically';
    if (magnitude === 2) return 'rose sharply';
    return 'rose';
  }
  if (magnitude >= 3) return 'fell drastically';
  if (magnitude === 2) return 'fell harshly';
  return 'fell';
}

function getStatLabel(stat, c) {
  if (stat === 'special_attack') return 'Special Attack';
  if (stat === 'special_defense') return 'Special Defense';
  return typeof c === 'function' ? c(stat) : stat;
}

function ensureBattleStatStages(battleData) {
  if (!battleData.statStages || typeof battleData.statStages !== 'object') {
    battleData.statStages = {};
  }
  return battleData.statStages;
}

function ensurePokemonStatStages(battleData, key) {
  const all = ensureBattleStatStages(battleData);
  if (!all[key] || typeof all[key] !== 'object') {
    all[key] = { attack: 0, defense: 0, special_attack: 0, special_defense: 0, speed: 0, accuracy: 0, evasion: 0 };
  }
  for (const stat of STAT_KEYS) {
    if (typeof all[key][stat] !== 'number') all[key][stat] = 0;
  }
  return all[key];
}

function ensureAbilityState(battleData) {
  if (!battleData.abilityState || typeof battleData.abilityState !== 'object') {
    battleData.abilityState = {};
  }
  const state = battleData.abilityState;
  if (!state.entryOnce || typeof state.entryOnce !== 'object') state.entryOnce = {};
  if (!state.battleBond || typeof state.battleBond !== 'object') state.battleBond = {};
  return state;
}

function ensureBattleHeldItems(battleData) {
  if (!battleData.heldItems || typeof battleData.heldItems !== 'object') {
    battleData.heldItems = {};
  }
  return battleData.heldItems;
}

function ensureConsumedHeldItems(battleData) {
  if (!battleData.consumedHeldItems || typeof battleData.consumedHeldItems !== 'object') {
    battleData.consumedHeldItems = {};
  }
  return battleData.consumedHeldItems;
}

function getBattleHeldItemName(options) {
  const { battleData, pass, heldItem } = options || {};
  const normalizedPass = String(pass || '');
  const heldItems = battleData ? ensureBattleHeldItems(battleData) : {};
  const consumed = battleData ? ensureConsumedHeldItems(battleData) : {};
  if (normalizedPass && heldItem !== undefined) {
    heldItems[normalizedPass] = normalizeHeldItemName(heldItem);
  }
  if (normalizedPass && consumed[normalizedPass]) {
    return 'none';
  }
  return normalizeHeldItemName(normalizedPass ? heldItems[normalizedPass] : heldItem);
}

function consumeBattleHeldItem(options) {
  const { battleData, pass, heldItem } = options || {};
  if (!battleData || !pass) return false;
  const current = getBattleHeldItemName({ battleData, pass, heldItem });
  if (!current || current === 'none') return false;
  ensureConsumedHeldItems(battleData)[String(pass)] = true;
  return true;
}

function getBattleWeatherName(battleData) {
  return String(battleData && battleData.weather || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .trim();
}

function isWeatherNegatingAbility(abilityName) {
  const ability = normalizeAbilityName(abilityName);
  return ability === 'air-lock' || ability === 'cloud-nine';
}

function hasWeatherNegationActive(abilities) {
  return Array.isArray(abilities) && abilities.some((ability) => isWeatherNegatingAbility(ability));
}

function setBattleWeatherNegationState(options) {
  const { battleData, activeAbilities, sourcePokemonName, sourceAbilityName, c } = options || {};
  if (!battleData) return { active: false, message: '' };
  let rawWeather = normalizeWeatherName(getBattleWeatherName(battleData));
  const previous = !!battleData.weatherNegated;
  const active = Array.isArray(activeAbilities) && activeAbilities.some((ability) => isWeatherNegatingAbility(ability));
  battleData.weatherNegated = active;
  let message = '';
  const abilities = Array.isArray(activeAbilities) ? activeAbilities.map((ability) => normalizeAbilityName(ability)) : [];
  const primalAbilityByWeather = {
    'extreme-sun': 'desolate-land',
    'heavy-rain': 'primordial-sea',
    'strong-winds': 'delta-stream'
  };
  if (primalAbilityByWeather[rawWeather] && !abilities.includes(primalAbilityByWeather[rawWeather])) {
    battleData.weather = '';
    battleData.weatherTurns = 0;
    battleData.weatherByPass = '';
    message += '\n-> The <b>' + getWeatherDisplayName(rawWeather) + '</b> faded.';
    rawWeather = '';
  }
  if (!previous && active && rawWeather && isWeatherNegatingAbility(sourceAbilityName)) {
    message += '\n-> <b>' + c(sourcePokemonName) + '</b>\'s <b>' + titleCaseHyphenated(sourceAbilityName) + '</b> activated!';
    message += '\n-> The effects of weather disappeared.';
  }
  return { active, message };
}

function getEffectiveWeatherName(battleData) {
  if (battleData && battleData.weatherNegated) return '';
  return normalizeWeatherName(getBattleWeatherName(battleData));
}

function getDisplayedWeatherState(battleData) {
  const weather = normalizeWeatherName(getBattleWeatherName(battleData));
  return {
    weather,
    negated: !!(battleData && battleData.weatherNegated && weather)
  };
}

function normalizeWeatherName(value) {
  const weather = String(value || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!weather) return '';
  if (weather === 'sun' || weather === 'sunny' || weather === 'harsh sunlight' || weather === 'sunlight') return 'sun';
  if (weather === 'extremely harsh sunlight') return 'extreme-sun';
  if (weather === 'rain' || weather === 'rainy') return 'rain';
  if (weather === 'heavy rain') return 'heavy-rain';
  if (weather === 'hail') return 'snow';
  if (weather === 'snow') return 'snow';
  if (weather === 'sandstorm') return 'sandstorm';
  if (weather === 'fog') return 'fog';
  if (weather === 'strong winds') return 'strong-winds';
  if (weather === 'shadow sky' || weather === 'shadowy aura') return 'shadow-sky';
  return weather.replace(/\s+/g, '-');
}

function getWeatherDisplayName(weatherName) {
  const weather = normalizeWeatherName(weatherName);
  if (weather === 'extreme-sun') return 'Extremely Harsh Sunlight';
  if (weather === 'heavy-rain') return 'Heavy Rain';
  if (weather === 'strong-winds') return 'Strong Winds';
  if (weather === 'sun') return 'Harsh Sunlight';
  if (weather === 'rain') return 'Rain';
  if (weather === 'sandstorm') return 'Sandstorm';
  if (weather === 'snow') return 'Snowstorm';
  if (weather === 'fog') return 'Fog';
  if (weather === 'shadow-sky') return 'Shadow Sky';
  return titleCaseHyphenated(weather);
}

function getWeatherDurationFromItem(moveName, heldItem) {
  const move = normalizeMoveName(moveName);
  const item = normalizeHeldItemName(heldItem);
  if ((move === 'sunny day' || move === 'max flare') && item === 'heat-rock') return 8;
  if ((move === 'rain dance' || move === 'max geyser') && item === 'damp-rock') return 8;
  if ((move === 'sandstorm' || move === 'max rockfall') && item === 'smooth-rock') return 8;
  if ((move === 'hail' || move === 'max hailstorm' || move === 'snowscape' || move === 'chilly reception') && item === 'icy-rock') return 8;
  return 5;
}

function getWeatherCreatedByMove(moveName) {
  const move = normalizeMoveName(moveName);
  if (move === 'sunny day' || move === 'max flare') return 'sun';
  if (move === 'rain dance' || move === 'max geyser') return 'rain';
  if (move === 'sandstorm' || move === 'max rockfall') return 'sandstorm';
  if (move === 'hail' || move === 'max hailstorm') return 'snow';
  if (move === 'snowscape' || move === 'chilly reception') return 'snow';
  if (move === 'shadow sky') return 'shadow-sky';
  if (move === 'defog') return 'clear';
  return '';
}

function applyWeatherByMove(options) {
  const { battleData, moveName, pass, pokemonName, heldItem, c, didHit } = options || {};
  if (!battleData) return { changed: false, message: '' };
  const move = normalizeMoveName(moveName);
  if (!move) return { changed: false, message: '' };
  if (['max flare', 'max geyser', 'max hailstorm', 'max rockfall'].includes(move) && !didHit) {
    return { changed: false, message: '' };
  }

  const createdWeather = getWeatherCreatedByMove(move);
  const currentWeather = normalizeWeatherName(getBattleWeatherName(battleData));
  const lockedWeather = new Set(['extreme-sun', 'heavy-rain', 'strong-winds']);
  const standardWeatherMoves = new Set(['sunny day', 'rain dance', 'sandstorm', 'hail', 'snowscape']);
  if (lockedWeather.has(currentWeather) && standardWeatherMoves.has(move)) {
    return {
      changed: false,
      message: '\n-> But the current weather is too powerful to be changed!'
    };
  }
  if (createdWeather === 'clear') {
    if (currentWeather === 'fog') {
      battleData.weather = '';
      battleData.weatherTurns = 0;
      battleData.weatherByPass = '';
      return {
        changed: true,
        message: '\n-> <b>' + c(pokemonName) + '</b>\'s <b>Defog</b> blew away the fog!'
      };
    }
    return { changed: false, message: '' };
  }
  if (!createdWeather) return { changed: false, message: '' };
  if (createdWeather === currentWeather) {
    return {
      changed: false,
      message: '\n-> But <b>' + getWeatherDisplayName(createdWeather) + '</b> is already active!'
    };
  }

  const duration = getWeatherDurationFromItem(move, heldItem);
  battleData.weather = createdWeather;
  battleData.weatherTurns = duration;
  battleData.weatherByPass = String(pass || '');
  return {
    changed: true,
    message: '\n-> <b>' + c(pokemonName) + '</b> changed the weather to <b>' + getWeatherDisplayName(createdWeather) + '</b> for <b>' + duration + '</b> turns!'
  };
}

function getWeatherMovePowerMultiplier(options) {
  const { battleData, moveName, moveType, abilityName } = options || {};
  const weather = getAbilityWeatherOverride(abilityName) || getEffectiveWeatherName(battleData);
  const move = normalizeMoveName(moveName);
  const type = String(moveType || '').toLowerCase();
  if (move === 'weather ball' && weather && weather !== 'strong-winds') {
    return 2;
  }
  if (weather === 'sun' || weather === 'extreme-sun') {
    if (type === 'fire') return 1.5;
    if (type === 'water') return 0.5;
  }
  if (weather === 'rain' || weather === 'heavy-rain') {
    if (type === 'water') return 1.5;
    if (type === 'fire') return 0.5;
  }
  if (['rain', 'sandstorm', 'snow', 'fog', 'shadow-sky'].includes(weather) && (move === 'solar beam' || move === 'solar blade')) {
    return 0.5;
  }
  return 1;
}

function getWeatherAccuracyInfo(options) {
  const { battleData, moveName, baseAccuracy, abilityName } = options || {};
  const weather = getAbilityWeatherOverride(abilityName) || getEffectiveWeatherName(battleData);
  const move = normalizeMoveName(moveName);
  const base = Number(baseAccuracy);
  if (!Number.isFinite(base)) {
    return { skipAccuracyCheck: false, accuracy: baseAccuracy };
  }
  if (weather === 'snow' && move === 'blizzard') {
    return { skipAccuracyCheck: true, accuracy: 100 };
  }
  if (weather === 'rain' && ['thunder', 'hurricane', 'bleakwind storm', 'wildbolt storm', 'sandsear storm'].includes(move)) {
    return { skipAccuracyCheck: true, accuracy: 100 };
  }
  if (weather === 'sun' && (move === 'thunder' || move === 'hurricane')) {
    return { skipAccuracyCheck: false, accuracy: 50 };
  }
  if (weather === 'fog') {
    return { skipAccuracyCheck: false, accuracy: Math.max(1, Math.floor(base * 0.6)) };
  }
  return { skipAccuracyCheck: false, accuracy: base };
}

function getWeatherAccuracyMultiplierForTarget(options) {
  const { battleData, abilityName } = options || {};
  const weather = getEffectiveWeatherName(battleData);
  const ability = normalizeAbilityName(abilityName);
  if (weather === 'snow' && ability === 'snow-cloak') {
    return 0.8;
  }
  return 1;
}

function getWeatherRecoveryRatio(options) {
  const { battleData, moveName, abilityName } = options || {};
  const weather = getAbilityWeatherOverride(abilityName) || getEffectiveWeatherName(battleData);
  const move = normalizeMoveName(moveName);
  if (move === 'shore up') {
    return weather === 'sandstorm' ? (2 / 3) : 0.5;
  }
  if (move === 'synthesis' || move === 'morning sun' || move === 'moonlight') {
    if (weather === 'strong-winds') return 0.5;
    if (weather === 'sun' || weather === 'extreme-sun') return 2 / 3;
    if (weather) return 0.25;
    return 0.5;
  }
  return 0;
}

function suppressesWeatherByPrimalLock(weatherName) {
  return ['extreme-sun', 'heavy-rain', 'strong-winds'].includes(normalizeWeatherName(weatherName));
}

function getWeatherSuppressedMoveMessage(options) {
  const { battleData, moveType, moveCategory, pokemonName, moveName, c } = options || {};
  const weather = getEffectiveWeatherName(battleData);
  const type = String(moveType || '').toLowerCase();
  const category = String(moveCategory || '').toLowerCase();
  if (category === 'status') return '';
  if (weather === 'extreme-sun' && type === 'water') {
    return '\n-> <b>' + c(pokemonName) + '</b>\'s <b>' + c(moveName) + '</b> evaporated in the <b>Extremely Harsh Sunlight</b>!';
  }
  if (weather === 'heavy-rain' && type === 'fire') {
    return '\n-> <b>' + c(pokemonName) + '</b>\'s <b>' + c(moveName) + '</b> was doused by the <b>Heavy Rain</b>!';
  }
  return '';
}

function getStrongWindsEffectiveness(options) {
  const { battleData, moveType, pokemonTypes, effectiveness } = options || {};
  const weather = getEffectiveWeatherName(battleData);
  const types = (pokemonTypes || []).map((type) => String(type || '').toLowerCase());
  const type = String(moveType || '').toLowerCase();
  const effValue = Number(effectiveness);
  
  // No adjustment if not Strong Winds or target isn't Flying type
  if (weather !== 'strong-winds' || !types.includes('flying') || !Number.isFinite(effValue)) {
    return effValue;
  }
  
  const inverseBattle = !!(battleData && battleData.set && battleData.set.inverseBattle);
  const flyingWeaknessTypes = inverseBattle
    ? ['bug', 'fighting', 'grass', 'ground']
    : ['electric', 'ice', 'rock'];
  
  // Move must be super-effective against Flying to be affected by Delta Stream
  if (!flyingWeaknessTypes.includes(type)) {
    return effValue;
  }
  
  // Delta Stream blocks super-effective moves against Flying
  // This means:
  // - If move is 2x against Flying but countered by other type (e.g., 0.5x Dragon), result is 0.5 * 2 = 1
  // - After blocking Flying: should be 0.5 (just the Dragon resistance)
  // - If move is 4x (super-effective on both Flying and something), becomes 2x (just other type)
  
  // When combined effectiveness is 1 but move IS super-effective against Flying,
  // it means there's a resistance to the other type that cancels the Flying advantage
  if (effValue === 1) {
    return 0.5;  // Show as "not very effective" (blocked Flying advantage, showing other type's resistance)
  }
  
  // If already super-effective overall (2x or 4x), reduce by factor of 2
  if (effValue === 2) return 0.5;   // Was 2x with Flying advantage
  if (effValue === 4) return 1;     // Was 4x (super on both types)
  if (effValue === 0.25) return 0.125;  // Rare edge case: 4x resistance blocked to show 2x resistance
  
  return effValue;
}

function getGrowthStageChange(battleData, abilityName) {
  return (getAbilityWeatherOverride(abilityName) || getEffectiveWeatherName(battleData)) === 'sun' ? 2 : 1;
}

function canUseAuroraVeilWeather(battleData) {
  const weather = getEffectiveWeatherName(battleData);
  return weather === 'snow';
}

function getWeatherDefenseMultiplier(options) {
  const { battleData, moveCategory, pokemonTypes } = options || {};
  const weather = getEffectiveWeatherName(battleData);
  const types = (pokemonTypes || []).map((type) => String(type || '').toLowerCase());
  if (weather === 'sandstorm' && moveCategory === 'special' && types.includes('rock')) {
    return 1.5;
  }
  if (weather === 'snow' && moveCategory === 'physical' && types.includes('ice')) {
    return 1.5;
  }
  return 1;
}

function isWeatherDamageImmune(options) {
  const { weatherName, pokemonTypes, abilityName, heldItem, pokemonName } = options || {};
  const weather = normalizeWeatherName(weatherName);
  const ability = normalizeAbilityName(abilityName);
  const item = normalizeHeldItemName(heldItem);
  const types = (pokemonTypes || []).map((type) => String(type || '').toLowerCase());
  if (item === 'safety-goggles') return true;
  if (ability === 'magic-guard' || ability === 'overcoat') return true;
  if (weather === 'sandstorm') {
    if (types.includes('rock') || types.includes('ground') || types.includes('steel')) return true;
    if (ability === 'sand-veil' || ability === 'sand-rush' || ability === 'sand-force') return true;
  }
  if (weather === 'snow') {
    if (types.includes('ice')) return true;
    if (ability === 'snow-cloak' || ability === 'ice-body' || ability === 'slush-rush') return true;
  }
  if (weather === 'shadow-sky' && getBaseSpeciesName(pokemonName) === 'shadow') return true;
  return false;
}

function applyWeatherEndTurn(options) {
  const { battleData, pass, pokemonName, pokemonTypes, abilityName, heldItem, maxHp, c } = options || {};
  if (!battleData || !pass || !maxHp) return { message: '', damage: 0 };
  const weather = getEffectiveWeatherName(battleData);
  const ability = normalizeAbilityName(abilityName);
  if (weather === 'snow' && ability === 'ice-body') {
    const isCurrentSide = String(pass) === String(battleData && battleData.c);
    const hpKey = isCurrentSide ? 'chp' : 'ohp';
    const teamKey = isCurrentSide ? 'tem' : 'tem2';
    const currentHp = Math.max(0, Number(battleData[hpKey]) || 0);
    const maxHealth = Math.max(1, Number(maxHp) || 1);
    if (currentHp <= 0 || currentHp >= maxHealth) return { message: '', damage: 0 };
    const healed = Math.min(Math.max(1, Math.floor(maxHealth / 16)), maxHealth - currentHp);
    battleData[hpKey] = currentHp + healed;
    if (!battleData[teamKey] || typeof battleData[teamKey] !== 'object') battleData[teamKey] = {};
    battleData[teamKey][pass] = battleData[hpKey];
    return {
      message: '\n-> <b>' + c(pokemonName) + '</b>\'s <b>Ice Body</b> restored <code>' + healed + '</code> HP in the <b>Snowstorm</b>!',
      damage: 0
    };
  }
  if (!['sandstorm', 'shadow-sky'].includes(weather)) return { message: '', damage: 0 };

  const isCurrentSide = String(pass) === String(battleData && battleData.c);
  const hpKey = isCurrentSide ? 'chp' : 'ohp';
  const teamKey = isCurrentSide ? 'tem' : 'tem2';
  const currentHp = Math.max(0, Number(battleData[hpKey]) || 0);
  if (currentHp <= 0) return { message: '', damage: 0 };

  const types = getEffectivePokemonTypes({
    pokemonName,
    pokemonTypes,
    heldItem: getBattleHeldItemName({ battleData, pass, heldItem }),
    abilityName
  });
  if (isWeatherDamageImmune({
    weatherName: weather,
    pokemonTypes: types,
    abilityName,
    heldItem: getBattleHeldItemName({ battleData, pass, heldItem }),
    pokemonName
  })) {
    return { message: '', damage: 0 };
  }

  const taken = Math.min(Math.max(1, Math.floor(Number(maxHp) / 16)), currentHp);
  battleData[hpKey] = Math.max(0, currentHp - taken);
  if (!battleData[teamKey] || typeof battleData[teamKey] !== 'object') battleData[teamKey] = {};
  battleData[teamKey][pass] = battleData[hpKey];
  return {
    message: '\n-> <b>' + c(pokemonName) + '</b> was buffeted by <b>' + getWeatherDisplayName(weather) + '</b> and lost <code>' + taken + '</code> HP!',
    damage: taken
  };
}

function advanceBattleWeather(battleData, c) {
  if (!battleData) return { message: '' };
  const weather = getEffectiveWeatherName(battleData);
  const turns = Number(battleData.weatherTurns) || 0;
  if (!weather || turns <= 0) return { message: '' };
  battleData.weatherTurns = Math.max(0, turns - 1);
  if (battleData.weatherTurns > 0) {
    return { message: '' };
  }
  battleData.weather = '';
  battleData.weatherByPass = '';
  return {
    message: '\n-> The <b>' + getWeatherDisplayName(weather) + '</b> faded.'
  };
}

function getBaseSpeciesName(pokemonName) {
  return String(pokemonName || '').toLowerCase().split('-')[0];
}

function canSkipChargeByWeather(options) {
  const { battleData, moveName, abilityName } = options || {};
  const move = normalizeMoveName(moveName);
  const weather = getAbilityWeatherOverride(abilityName) || getEffectiveWeatherName(battleData);
  if ((move === 'solar beam' || move === 'solar blade') && (weather === 'sun' || weather === 'sunny' || weather === 'harsh sunlight')) {
    return true;
  }
  if (move === 'electro shot' && (weather === 'rain' || weather === 'rainy')) {
    return true;
  }
  return false;
}

function getPowerHerbInfo(options) {
  const { battleData, pass, heldItem, moveName, abilityName } = options || {};
  const item = getBattleHeldItemName({ battleData, pass, heldItem });
  const move = normalizeMoveName(moveName);
  const chargeEligible = new Set([
    'bounce',
    'dig',
    'dive',
    'electro shot',
    'fly',
    'freeze shock',
    'geomancy',
    'ice burn',
    'meteor beam',
    'phantom force',
    'razor wind',
    'shadow force',
    'skull bash',
    'sky attack',
    'solar beam',
    'solar blade'
  ]);
  const active = item === 'power-herb' && move !== 'sky drop' && chargeEligible.has(move) && !canSkipChargeByWeather({ battleData, moveName, abilityName });
  return {
    active,
    heldItem: item
  };
}

function applyWhiteHerbIfNeeded(options) {
  const { battleData, pass, pokemonName, c } = options || {};
  if (!battleData || !pass) return { activated: false, message: '' };
  const heldItem = getBattleHeldItemName({ battleData, pass });
  if (heldItem !== 'white-herb') {
    return { activated: false, message: '' };
  }

  const stages = ensurePokemonStatStages(battleData, pass);
  const negativeStats = STAT_KEYS.filter((stat) => (Number(stages[stat]) || 0) < 0);
  if (negativeStats.length < 1) {
    return { activated: false, message: '' };
  }

  for (const stat of negativeStats) {
    stages[stat] = 0;
  }
  ensureConsumedHeldItems(battleData)[String(pass)] = true;

  let message = '\n-> <b>' + c(pokemonName) + '</b>\'s <b>White Herb</b> activated!';
  for (const stat of negativeStats) {
    message += '\n-> <b>' + c(pokemonName) + '</b>\'s <b>' + getStatLabel(stat, c) + '</b> returned to normal!';
  }
  return { activated: true, message };
}

function getHighestStatKey(stats) {
  let bestStat = 'attack';
  let bestValue = Number.NEGATIVE_INFINITY;
  for (const stat of MAIN_BATTLE_STATS) {
    const value = Number(stats && stats[stat]) || 0;
    if (value > bestValue) {
      bestValue = value;
      bestStat = stat;
    }
  }
  return bestStat;
}

function isWindMove(moveName) {
  return WIND_MOVE_NAMES.has(normalizeMoveName(moveName));
}

function shouldApplyReactiveLoweringAbility(abilityName) {
  return abilityName === 'competitive' || abilityName === 'defiant';
}

function blocksOpponentStatLowering(abilityName) {
  return abilityName === 'clear-body' || abilityName === 'white-smoke' || abilityName === 'full-metal-body';
}

function applyStageChanges(options) {
  const {
    battleData,
    pass,
    pokemonName,
    abilityName,
    changes,
    c,
    fromOpponent,
    deferWhiteHerb
  } = options;
  const normalizedAbility = normalizeAbilityName(abilityName);
  const stages = ensurePokemonStatStages(battleData, pass);
  const heldItem = getBattleHeldItemName({ battleData, pass });
  const deltas = [];
  let message = '';
  let blockedLoweringLogged = false;

  for (const change of changes || []) {
    if (!change || !change.stat || !change.delta) continue;
    const blockedByAbility = blocksOpponentStatLowering(normalizedAbility);
    const blockedByClearAmulet = heldItem === 'clear-amulet';
    if (fromOpponent && change.delta < 0 && (blockedByAbility || blockedByClearAmulet)) {
      if (!blockedLoweringLogged) {
        const blockerName = blockedByClearAmulet ? 'Clear Amulet' : titleCaseHyphenated(abilityName || normalizedAbility);
        message += '\n-> <b>' + c(pokemonName) + '</b>\'s <b>' + blockerName + '</b> activated!';
        blockedLoweringLogged = true;
      }
      continue;
    }
    const actualDeltaIntent = normalizedAbility === 'contrary' ? change.delta * -1 : change.delta;
    const previous = stages[change.stat] || 0;
    const next = clampStage(previous + actualDeltaIntent);
    const actualDelta = next - previous;
    stages[change.stat] = next;
    deltas.push({ stat: change.stat, delta: actualDelta });
    if (actualDelta !== 0) {
      message += '\n-> <b>' + c(pokemonName) + '</b>\'s <b>' + getStatLabel(change.stat, c) + '</b> ' + getStageVerb(actualDelta) + '!';
    }
  }

  if (fromOpponent && shouldApplyReactiveLoweringAbility(normalizedAbility) && deltas.some((entry) => entry.delta < 0)) {
    if (normalizedAbility === 'competitive') {
      const followUp = applyStageChanges({
        battleData,
        pass,
        pokemonName,
        abilityName: '',
        changes: [{ stat: 'special_attack', delta: 2 }],
        c,
        fromOpponent: false
      });
      message += followUp.message;
      deltas.push(...followUp.deltas);
    }
    if (normalizedAbility === 'defiant') {
      const followUp = applyStageChanges({
        battleData,
        pass,
        pokemonName,
        abilityName: '',
        changes: [{ stat: 'attack', delta: 2 }],
        c,
        fromOpponent: false
      });
      message += followUp.message;
      deltas.push(...followUp.deltas);
    }
  }

  if (!deferWhiteHerb && deltas.some((entry) => entry && entry.delta < 0)) {
    message += applyWhiteHerbIfNeeded({ battleData, pass, pokemonName, c }).message;
  }

  return { message, deltas };
}

function applyOpportunistCopy(options) {
  const { battleData, pass, pokemonName, abilityName, copiedDeltas, c } = options;
  if (normalizeAbilityName(abilityName) !== 'opportunist') {
    return { message: '', deltas: [] };
  }
  const positive = (copiedDeltas || []).filter((entry) => entry && entry.delta > 0);
  if (positive.length < 1) return { message: '', deltas: [] };
  return applyStageChanges({
    battleData,
    pass,
    pokemonName,
    abilityName,
    changes: positive.map((entry) => ({ stat: entry.stat, delta: entry.delta })),
    c,
    fromOpponent: false
  });
}

function getEntryBoostStat(abilityName) {
  const ability = normalizeAbilityName(abilityName);
  if (ability === 'intrepid-sword') return 'attack';
  if (ability === 'dauntless-shield') return 'defense';
  if (ability === 'embody-aspect') return 'speed';
  if (ability === 'embody-aspect-hearthflame') return 'attack';
  if (ability === 'embody-aspect-cornerstone') return 'defense';
  if (ability === 'embody-aspect-wellspring') return 'special_defense';
  if (ability === 'embody-aspect-teal') return 'speed';
  return '';
}

function applyEntryAbility(options) {
  const { battleData, pass, pokemonName, abilityName, heldItem, selfStats, opponentStats, opponentPass, opponentName, opponentAbility, partyHpMap, c } = options;
  const ability = normalizeAbilityName(abilityName);
  const item = getBattleHeldItemName({ battleData, pass, heldItem });
  const baseSpecies = String(pokemonName || '').toLowerCase().split('-')[0];
  const state = ensureAbilityState(battleData);
  let message = '';
  let deltas = [];

  const oncePerBattleKey = String(pass) + ':' + ability;
  const entryBoostStat = getEntryBoostStat(ability);
  if (entryBoostStat) {
    if ((ability === 'intrepid-sword' || ability === 'dauntless-shield') && state.entryOnce[oncePerBattleKey]) {
      return { message, deltas };
    }
    const applied = applyStageChanges({
      battleData,
      pass,
      pokemonName,
      abilityName,
      changes: [{ stat: entryBoostStat, delta: 1 }],
      c,
      fromOpponent: false
    });
    message += applied.message;
    deltas = deltas.concat(applied.deltas);
    if (ability === 'intrepid-sword' || ability === 'dauntless-shield') {
      state.entryOnce[oncePerBattleKey] = true;
    }
  }

  if (ability === 'download' && opponentStats) {
    const foeDefense = Number(opponentStats.defense || 0);
    const foeSpecialDefense = Number(opponentStats.special_defense || 0);
    const stat = foeSpecialDefense <= foeDefense ? 'special_attack' : 'attack';
    const applied = applyStageChanges({
      battleData,
      pass,
      pokemonName,
      abilityName,
      changes: [{ stat, delta: 1 }],
      c,
      fromOpponent: false
    });
    message += applied.message;
    deltas = deltas.concat(applied.deltas);
  }

  if (ability === 'intimidate' && opponentPass && opponentName) {
    const applied = applyStageChanges({
      battleData,
      pass: opponentPass,
      pokemonName: opponentName,
      abilityName: opponentAbility,
      changes: [{ stat: 'attack', delta: -1 }],
      c,
      fromOpponent: true
    });
    if (applied.deltas.some((entry) => entry && entry.delta !== 0)) {
      message += '\n-> <b>' + c(pokemonName) + '</b>\'s <b>Intimidate</b> activated!';
      message += applied.message;
      deltas = deltas.concat(applied.deltas);
    }
  }

  if (ability === 'supreme-overlord') {
    const info = getSupremeOverlordInfo({ abilityName, partyHpMap, activePass: pass });
    if (info.active) {
      message += '\n-> <b>' + c(pokemonName) + '</b>\'s <b>Supreme Overlord</b> activated!';
    }
  }

  const currentWeather = normalizeWeatherName(getBattleWeatherName(battleData));
  if (suppressesWeatherByPrimalLock(currentWeather) && ['drought', 'drizzle', 'sand-stream', 'snow-warning'].includes(ability)) {
    message += '\n-> <b>' + c(pokemonName) + '</b>\'s <b>' + titleCaseHyphenated(abilityName) + '</b> failed because the current weather is too strong!';
    return { message, deltas };
  }

  if (ability === 'drought') {
    const duration = item === 'heat-rock' ? 8 : 5;
    battleData.weather = 'sun';
    battleData.weatherTurns = duration;
    battleData.weatherByPass = String(pass || '');
    message += '\n-> <b>' + c(pokemonName) + '</b>\'s <b>Drought</b> intensified the sun for <b>' + duration + '</b> turns!';
  }

  if (ability === 'drizzle') {
    const duration = item === 'damp-rock' ? 8 : 5;
    battleData.weather = 'rain';
    battleData.weatherTurns = duration;
    battleData.weatherByPass = String(pass || '');
    message += '\n-> <b>' + c(pokemonName) + '</b>\'s <b>Drizzle</b> made it rain for <b>' + duration + '</b> turns!';
  }

  if (ability === 'desolate-land') {
    if (currentWeather === 'extreme-sun') return { message, deltas };
    battleData.weather = 'extreme-sun';
    battleData.weatherTurns = 0;
    battleData.weatherByPass = String(pass || '');
    message += '\n-> <b>' + c(pokemonName) + '</b>\'s <b>Desolate Land</b> created <b>Extremely Harsh Sunlight</b>!';
  }

  if (ability === 'primordial-sea') {
    if (currentWeather === 'heavy-rain') return { message, deltas };
    battleData.weather = 'heavy-rain';
    battleData.weatherTurns = 0;
    battleData.weatherByPass = String(pass || '');
    message += '\n-> <b>' + c(pokemonName) + '</b>\'s <b>Primordial Sea</b> summoned <b>Heavy Rain</b>!';
  }

  if (ability === 'delta-stream') {
    if (currentWeather === 'strong-winds') return { message, deltas };
    battleData.weather = 'strong-winds';
    battleData.weatherTurns = 0;
    battleData.weatherByPass = String(pass || '');
    message += '\n-> <b>' + c(pokemonName) + '</b>\'s <b>Delta Stream</b> whipped up <b>Strong Winds</b>!';
  }

  if (ability === 'snow-warning') {
    const duration = item === 'icy-rock' ? 8 : 5;
    battleData.weather = 'snow';
    battleData.weatherTurns = duration;
    battleData.weatherByPass = String(pass || '');
    message += '\n-> <b>' + c(pokemonName) + '</b>\'s <b>Snow Warning</b> whipped up a <b>Snowstorm</b> for <b>' + duration + '</b> turns!';
  }

  if (item === 'tatsugiri-lunchbox' && baseSpecies === 'dondozo') {
    const applied = applyStageChanges({
      battleData,
      pass,
      pokemonName,
      abilityName: '',
      changes: [
        { stat: 'attack', delta: 2 },
        { stat: 'defense', delta: 2 },
        { stat: 'special_attack', delta: 2 },
        { stat: 'special_defense', delta: 2 },
        { stat: 'speed', delta: 2 }
      ],
      c,
      fromOpponent: false
    });
    if (applied.deltas.some((entry) => entry && entry.delta !== 0)) {
      consumeBattleHeldItem({ battleData, pass, heldItem });
      if (!state.tatsugiriLunchboxTurn || typeof state.tatsugiriLunchboxTurn !== 'object') {
        state.tatsugiriLunchboxTurn = {};
      }
      state.tatsugiriLunchboxTurn[String(pass)] = true;
      message += '\n-> <b>' + c(pokemonName) + '</b>\'s <b>Tatsugiri Lunchbox</b> activated!';
      message += applied.message;
    }
    deltas = deltas.concat(applied.deltas);
  }

  return { message, deltas };
}

function getAbsorbMoveEffect(options) {
  const { abilityName, moveType, moveName } = options;
  const ability = normalizeAbilityName(abilityName);
  const type = String(moveType || '').toLowerCase();
  const normalizedMove = normalizeMoveName(moveName);

  if (ability === 'lightning-rod' && type === 'electric') {
    return { blocked: true, changes: [{ stat: 'special_attack', delta: 1 }] };
  }
  if (ability === 'motor-drive' && type === 'electric') {
    return { blocked: true, changes: [{ stat: 'speed', delta: 1 }] };
  }
  if (ability === 'sap-sipper' && type === 'grass') {
    return { blocked: true, changes: [{ stat: 'attack', delta: 1 }] };
  }
  if (ability === 'storm-drain' && type === 'water') {
    return { blocked: true, changes: [{ stat: 'special_attack', delta: 1 }] };
  }
  if (ability === 'well-baked-body' && type === 'fire') {
    return { blocked: true, changes: [{ stat: 'defense', delta: 2 }] };
  }
  if (ability === 'wind-rider' && isWindMove(normalizedMove)) {
    return { blocked: true, changes: [{ stat: 'attack', delta: 1 }] };
  }

  return { blocked: false, changes: [] };
}

function applyAbsorbMoveAbility(options) {
  const { battleData, pass, pokemonName, abilityName, moveType, moveName, c } = options;
  const effect = getAbsorbMoveEffect({ abilityName, moveType, moveName });
  if (!effect.blocked) return { blocked: false, message: '', deltas: [] };
  const applied = applyStageChanges({
    battleData,
    pass,
    pokemonName,
    abilityName,
    changes: effect.changes,
    c,
    fromOpponent: false
  });
  return { blocked: true, message: applied.message, deltas: applied.deltas };
}

function getPinchAbilityInfo(options) {
  const { abilityName, moveType, currentHp, maxHp } = options || {};
  const ability = normalizeAbilityName(abilityName);
  const type = String(moveType || '').toLowerCase();
  const hpNow = Number(currentHp);
  const hpMax = Number(maxHp);
  const abilityTypeMap = {
    blaze: 'fire',
    overgrow: 'grass',
    torrent: 'water'
  };
  const boostType = abilityTypeMap[ability];
  if (!boostType) {
    return { active: false, multiplier: 1, abilityName: ability, abilityLabel: titleCaseHyphenated(abilityName || 'none'), boostType: '' };
  }
  if (!Number.isFinite(hpNow) || !Number.isFinite(hpMax) || hpMax <= 0) {
    return { active: false, multiplier: 1, abilityName: ability, abilityLabel: titleCaseHyphenated(abilityName || 'none'), boostType };
  }
  const hpConditionMet = hpNow * 3 <= hpMax;
  const moveTypeMatches = !type || type === boostType;
  const active = hpConditionMet && moveTypeMatches;
  return {
    active,
    multiplier: active ? 1.5 : 1,
    abilityName: ability,
    abilityLabel: titleCaseHyphenated(abilityName || ability),
    boostType
  };
}

function getPinchPowerMultiplier(options) {
  return getPinchAbilityInfo(options).multiplier;
}

function getTechnicianPowerInfo(options) {
  const { abilityName, movePower } = options || {};
  const ability = normalizeAbilityName(abilityName);
  const power = Number(movePower);
  const active = ability === 'technician' && Number.isFinite(power) && power > 0 && power <= 60;
  return {
    active,
    multiplier: active ? 1.5 : 1,
    abilityName: ability,
    abilityLabel: titleCaseHyphenated(abilityName || ability)
  };
}

function getInfiltratorInfo(options) {
  const { abilityName, moveName } = options || {};
  const ability = normalizeAbilityName(abilityName);
  const normalizedMove = normalizeMoveName(moveName);
  const blockedMoves = new Set(['transform', 'sky drop']);
  const active = ability === 'infiltrator' && !blockedMoves.has(normalizedMove);
  return {
    active,
    abilityName: ability,
    abilityLabel: titleCaseHyphenated(abilityName || ability)
  };
}

function getGoodAsGoldInfo(options) {
  const { abilityName } = options || {};
  const ability = normalizeAbilityName(abilityName);
  const active = ability === 'good-as-gold';
  return {
    active,
    abilityName: ability,
    abilityLabel: titleCaseHyphenated(abilityName || ability)
  };
}

function getLevitateInfo(options) {
  const { abilityName } = options || {};
  const ability = normalizeAbilityName(abilityName);
  const active = ability === 'levitate';
  return {
    active,
    abilityName: ability,
    abilityLabel: titleCaseHyphenated(abilityName || ability)
  };
}

function getAirBalloonInfo(options) {
  const { battleData, pass, heldItem } = options || {};
  const item = getBattleHeldItemName({ battleData, pass, heldItem });
  const active = item === 'air-balloon';
  return {
    active,
    heldItem: item,
    itemLabel: 'Air Balloon'
  };
}

function getUnawareInfo(options) {
  const { abilityName } = options || {};
  const ability = normalizeAbilityName(abilityName);
  const active = ability === 'unaware';
  return {
    active,
    abilityName: ability,
    abilityLabel: titleCaseHyphenated(abilityName || ability)
  };
}

function getUnawareBattleModifiers(options) {
  const {
    attackerAbility,
    defenderAbility,
    moveCategory,
    attackerStages,
    defenderStages
  } = options || {};
  const attackerInfo = getUnawareInfo({ abilityName: attackerAbility });
  const defenderInfo = getUnawareInfo({ abilityName: defenderAbility });
  const category = String(moveCategory || '').toLowerCase();
  const attackStageKey = category === 'special' ? 'special_attack' : 'attack';
  const defenseStageKey = category === 'special' ? 'special_defense' : 'defense';
  const atkStages = attackerStages || {};
  const defStages = defenderStages || {};
  const defenderStatStage = Number(defStages[defenseStageKey]) || 0;
  const attackerStatStage = Number(atkStages[attackStageKey]) || 0;
  const defenderEvasionStage = Number(defStages.evasion) || 0;
  const attackerAccuracyStage = Number(atkStages.accuracy) || 0;

  return {
    attackStage: defenderInfo.active ? 0 : attackerStatStage,
    defenseStage: attackerInfo.active ? 0 : defenderStatStage,
    accuracyStage: defenderInfo.active ? 0 : attackerAccuracyStage,
    evasionStage: attackerInfo.active ? 0 : defenderEvasionStage,
    attackerActivated: attackerInfo.active && (defenderStatStage !== 0 || defenderEvasionStage !== 0),
    defenderActivated: defenderInfo.active && (attackerStatStage !== 0 || attackerAccuracyStage !== 0)
  };
}

function getStabInfo(options) {
  const { abilityName, moveType, pokemonTypes } = options || {};
  const ability = normalizeAbilityName(abilityName);
  const type = String(moveType || '').toLowerCase();
  const ownTypes = Array.isArray(pokemonTypes)
    ? pokemonTypes.map((entry) => String(entry || '').toLowerCase())
    : [];
  const matches = !!type && ownTypes.includes(type);
  const active = matches;
  const multiplier = !matches ? 1 : (ability === 'adaptability' ? 2 : 1.5);
  return {
    active,
    multiplier,
    adaptabilityActive: matches && ability === 'adaptability',
    abilityName: ability,
    abilityLabel: titleCaseHyphenated(abilityName || ability)
  };
}

function normalizeHeldItemName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-');
}

function hasMultitypeFormEffect(options) {
  const { pokemonName, abilityName, heldItem, isTerastallized } = options || {};
  if (isTerastallized) return false;
  if (getBaseSpeciesName(pokemonName) !== 'arceus') return false;
  if (!getArceusPlateType(normalizeHeldItemName(heldItem))) return false;
  const normalizedAbility = normalizeAbilityName(abilityName);
  if (!normalizedAbility) return true;
  return normalizedAbility === 'multitype';
}

function isPowerConstructAbility(abilityName) {
  return normalizeAbilityName(abilityName) === 'power-construct';
}

function getPowerConstructFormChange(options) {
  const { pokemonName, abilityName, currentHp, maxHp } = options || {};
  const ability = normalizeAbilityName(abilityName);
  const normalizedName = String(pokemonName || '').toLowerCase();
  const hpNow = Number(currentHp);
  const hpMax = Number(maxHp);
  const eligibleForms = new Set([
    'zygarde',
    'zygarde-10',
    'zygarde-10-power-construct',
    'zygarde-50',
    'zygarde-50-power-construct'
  ]);
  if (ability !== 'power-construct' || !eligibleForms.has(normalizedName)) {
    return { triggered: false, newPokemonName: normalizedName };
  }
  if (!Number.isFinite(hpNow) || !Number.isFinite(hpMax) || hpNow <= 0 || hpMax <= 0 || hpNow * 2 >= hpMax) {
    return { triggered: false, newPokemonName: normalizedName };
  }
  return {
    triggered: normalizedName !== 'zygarde-complete',
    newPokemonName: 'zygarde-complete'
  };
}

function getArceusPlateFormName(options) {
  const { pokemonName, abilityName, heldItem, isTerastallized } = options || {};
  const baseSpecies = getBaseSpeciesName(pokemonName);
  if (baseSpecies !== 'arceus') return String(pokemonName || '').toLowerCase();
  if (!hasMultitypeFormEffect({ pokemonName, abilityName, heldItem, isTerastallized })) {
    return 'arceus';
  }
  return 'arceus-' + getArceusPlateType(normalizeHeldItemName(heldItem));
}

function getEffectivePokemonDisplayName(options) {
  const { pokemonName, abilityName, heldItem, isTerastallized } = options || {};
  const formName = getArceusPlateFormName({ pokemonName, abilityName, heldItem, isTerastallized });
  return formName || String(pokemonName || '').toLowerCase();
}

function isImmutableAbility(abilityName) {
  const normalized = normalizeAbilityName(abilityName);
  return normalized === 'multitype' || normalized === 'power-construct';
}

function blocksAbilityChangeInteraction(options) {
  const { sourceAbilityName, targetAbilityName } = options || {};
  return isImmutableAbility(sourceAbilityName) || isImmutableAbility(targetAbilityName);
}

function canRemoveHeldItemByEffect(options) {
  const { pokemonName, abilityName, heldItem, effectName } = options || {};
  const effect = normalizeMoveName(effectName).replace(/\s+/g, '-');
  const blockedEffects = new Set(['thief', 'covet', 'trick', 'switcheroo', 'knock-off']);
  if (blockedEffects.has(effect) && hasMultitypeFormEffect({ pokemonName, abilityName, heldItem })) {
    return false;
  }
  return true;
}

function getEffectivePokemonTypes(options) {
  const { pokemonName, pokemonTypes, heldItem, abilityName, isTerastallized } = options || {};
  const ownTypes = Array.isArray(pokemonTypes)
    ? pokemonTypes.map((entry) => String(entry || '').toLowerCase()).filter(Boolean)
    : [];
  const baseSpecies = getBaseSpeciesName(pokemonName);
  const plateType = getArceusPlateType(normalizeHeldItemName(heldItem));
  if (baseSpecies === 'arceus' && plateType && hasMultitypeFormEffect({ pokemonName, abilityName, heldItem, isTerastallized })) {
    return [plateType];
  }
  return ownTypes;
}

function getEffectiveMoveName(options) {
  const { moveName } = options || {};
  return moveName;
}

function getEffectiveMoveType(options) {
  const { pokemonName, heldItem, abilityName, isTerastallized, moveName, moveType, battleData } = options || {};
  const normalizedMove = normalizeMoveName(moveName);
  const baseSpecies = getBaseSpeciesName(pokemonName);
  const rawType = String(moveType || '').toLowerCase();
  const ability = normalizeAbilityName(abilityName);
  const weather = getAbilityWeatherOverride(abilityName) || normalizeWeatherName(getBattleWeatherName(battleData));
  const plateType = getArceusPlateType(normalizeHeldItemName(heldItem));
  if (normalizedMove === 'judgment' && baseSpecies === 'arceus' && plateType && hasMultitypeFormEffect({ pokemonName, abilityName, heldItem, isTerastallized })) {
    return plateType;
  }
  if (normalizedMove === 'weather ball') {
    if (weather === 'sun') return 'fire';
    if (weather === 'rain') return 'water';
    if (weather === 'sandstorm') return 'rock';
    if (weather === 'hail' || weather === 'snow') return 'ice';
  }
  if (rawType === 'normal' && NORMAL_MOVE_TYPE_OVERRIDE_ABILITIES[ability]) {
    return NORMAL_MOVE_TYPE_OVERRIDE_ABILITIES[ability];
  }
  return rawType;
}

function canPokemonStillEvolve(pokemonName, evolutionChains) {
  const current = String(pokemonName || '').toLowerCase();
  const chains = evolutionChains && Array.isArray(evolutionChains.evolution_chains)
    ? evolutionChains.evolution_chains
    : [];
  return chains.some((row) => String(row.current_pokemon || '').toLowerCase() === current);
}

function getHeldItemStatMultipliers(options) {
  const { pokemonName, heldItem, evolutionChains } = options || {};
  const current = String(pokemonName || '').toLowerCase();
  const baseSpecies = current.split('-')[0];
  const item = normalizeHeldItemName(heldItem);
  const canEvolve = canPokemonStillEvolve(current, evolutionChains);
  const plateType = getArceusPlateType(item);
  return {
    attack: item === 'choice-band' ? 1.5 : (baseSpecies === 'pikachu' && item === 'light-ball' ? 2 : 1),
    special_attack: item === 'choice-specs' ? 1.5 : (baseSpecies === 'pikachu' && item === 'light-ball' ? 2 : 1),
    defense: item === 'eviolite' && canEvolve ? 1.5 : 1,
    special_defense: (item === 'eviolite' && canEvolve) || item === 'assault-vest' ? 1.5 : 1,
    speed: item === 'choice-scarf' ? 1.5 : 1,
    damageMultiplier: item === 'life-orb' ? (5324 / 4096) : 1,
    recoveryMultiplier: item === 'big-root' ? (5324 / 4096) : 1,
    lightBallActive: baseSpecies === 'pikachu' && item === 'light-ball',
    evioliteActive: item === 'eviolite' && canEvolve,
    assaultVestActive: item === 'assault-vest',
    bigRootActive: item === 'big-root',
    lifeOrbActive: item === 'life-orb',
    choiceBandActive: item === 'choice-band',
    choiceSpecsActive: item === 'choice-specs',
    choiceScarfActive: item === 'choice-scarf',
    choiceItemActive: item === 'choice-band' || item === 'choice-specs' || item === 'choice-scarf',
    plateType,
    plateBoostMultiplier: plateType ? 1.2 : 1,
    arceusPlateActive: baseSpecies === 'arceus' && !!plateType,
    heldItem: item
  };
}

function getSupremeOverlordInfo(options) {
  const { abilityName, partyHpMap, activePass } = options || {};
  const ability = normalizeAbilityName(abilityName);
  if (ability !== 'supreme-overlord') {
    return { active: false, multiplier: 1, faintedAllies: 0, abilityName: ability, abilityLabel: titleCaseHyphenated(abilityName || ability) };
  }
  const faintedAllies = Math.min(5, Object.keys(partyHpMap || {}).filter((pass) => String(pass) !== String(activePass) && (Number(partyHpMap[pass]) || 0) <= 0).length);
  return {
    active: faintedAllies > 0,
    multiplier: 1 + (faintedAllies * 0.1),
    faintedAllies,
    abilityName: ability,
    abilityLabel: titleCaseHyphenated(abilityName || ability)
  };
}

function getAttackStatMultiplier(abilityName, moveCategory) {
  const ability = normalizeAbilityName(abilityName);
  const category = String(moveCategory || '').toLowerCase();
  if (category !== 'physical') return 1;
  if (ability === 'huge-power' || ability === 'pure-power') return 2;
  return 1;
}

const DIRECT_DAMAGE_MOVE_NAMES = new Set([
  'dragon rage',
  'endeavor',
  'final gambit',
  'nature s madness',
  'nature\'s madness',
  'night shade',
  'ruination',
  'seismic toss',
  'sonic boom',
  'super fang'
]);

function isDirectDamageMove(moveName) {
  return DIRECT_DAMAGE_MOVE_NAMES.has(normalizeMoveName(moveName));
}

const NON_CONTACT_PHYSICAL_MOVE_NAMES = new Set([
  'accelerock',
  'beat up',
  'bolt beak',
  'bonemerang',
  'bone rush',
  'bullet seed',
  'crabhammer',
  'diamond storm',
  'drill run',
  'earthquake',
  'fissure',
  'high horsepower',
  'hyperspace fury',
  'hyperspace hole',
  'ice shard',
  'icicle crash',
  'icicle spear',
  'pin missile',
  'poltergeist',
  'pyro ball',
  'rage fist',
  'rock blast',
  'rock slide',
  'rock throw',
  'rock tomb',
  'scale shot',
  'smack down',
  'spirit shackle',
  'stone axe',
  'stone edge',
  'triple arrows',
  'twineedle',
  'water shuriken'
]);

const CONTACT_SPECIAL_MOVE_NAMES = new Set([
  'draining kiss'
]);

const SHARPNESS_MOVE_NAMES = new Set([
  'cut',
  'razor leaf',
  'slash',
  'fury cutter',
  'air cutter',
  'aerial ace',
  'leaf blade',
  'night slash',
  'air slash',
  'x-scissor',
  'psycho cut',
  'cross poison',
  'sacred sword',
  'razor shell',
  'secret sword',
  'solar blade',
  'behemoth blade',
  'stone axe',
  'ceaseless edge',
  'population bomb',
  'kowtow cleave',
  'psyblade',
  'bitter blade',
  'aqua cutter',
  'mighty cleave',
  'tachyon cutter'
]);

function moveMakesContact(moveName, moveCategory) {
  const normalizedMove = normalizeMoveName(moveName);
  const category = String(moveCategory || '').toLowerCase();
  if (CONTACT_SPECIAL_MOVE_NAMES.has(normalizedMove)) return true;
  if (category !== 'physical') return false;
  return !NON_CONTACT_PHYSICAL_MOVE_NAMES.has(normalizedMove);
}

function getBattleMovePower(options) {
  const { battleData, pass, pokemonName, moveName, moveType, movePower, heldItem, abilityName } = options || {};
  const rawPower = Number(movePower);
  if (!Number.isFinite(rawPower) || rawPower <= 0) return rawPower;
  const normalizedMove = normalizeMoveName(moveName);
  const baseSpecies = String(pokemonName || '').toLowerCase().split('-')[0];
  const state = ensureAbilityState(battleData);
  const item = getBattleHeldItemName({ battleData, pass, heldItem });
  const ability = normalizeAbilityName(abilityName);
  const effectiveMoveType = getEffectiveMoveType({ pokemonName, heldItem: item, moveName, moveType, battleData });
  const plateType = getArceusPlateType(item);
  if (normalizedMove === 'order up' && baseSpecies === 'dondozo' && state.tatsugiriLunchboxTurn && state.tatsugiriLunchboxTurn[String(pass)]) {
    return 160;
  }
  const effectiveWeather = getEffectiveWeatherName(battleData);
  if (normalizedMove === 'weather ball' && effectiveWeather && effectiveWeather !== 'strong-winds') {
    return Math.max(1, Math.floor(rawPower * 2));
  }
  if (plateType && effectiveMoveType === plateType) {
    return Math.max(1, Math.floor(rawPower * 1.2));
  }
  if (ability === 'sharpness' && SHARPNESS_MOVE_NAMES.has(normalizedMove)) {
    return Math.max(1, Math.floor(rawPower * 1.5));
  }
  return rawPower;
}

function applyShadowShieldReduction(options) {
  const { abilityName, currentHp, maxHp, incomingDamage, moveName, pokemonName, c } = options || {};
  const ability = normalizeAbilityName(abilityName);
  const hpNow = Number(currentHp);
  const hpMax = Number(maxHp);
  const damage = Math.max(0, Number(incomingDamage) || 0);
  if (ability !== 'shadow-shield' || !Number.isFinite(hpNow) || !Number.isFinite(hpMax) || hpNow <= 0 || hpMax <= 0) {
    return { damage, activated: false, message: '' };
  }
  if (hpNow !== hpMax || isDirectDamageMove(moveName)) {
    return { damage, activated: false, message: '' };
  }
  const reducedDamage = Math.max(0, Math.floor(damage / 2));
  return {
    damage: reducedDamage,
    activated: reducedDamage !== damage,
    message: reducedDamage !== damage
      ? '\n-> <b>' + c(pokemonName) + '</b>\'s <b>Shadow Shield</b> weakened the attack!'
      : ''
  };
}

function applyMultiscaleReduction(options) {
  const { abilityName, currentHp, maxHp, incomingDamage, pokemonName, c } = options || {};
  const ability = normalizeAbilityName(abilityName);
  const hpNow = Number(currentHp);
  const hpMax = Number(maxHp);
  const damage = Math.max(0, Number(incomingDamage) || 0);
  if (ability !== 'multiscale' || !Number.isFinite(hpNow) || !Number.isFinite(hpMax) || hpNow <= 0 || hpMax <= 0) {
    return { damage, activated: false, message: '' };
  }
  if (hpNow !== hpMax) {
    return { damage, activated: false, message: '' };
  }
  const reducedDamage = Math.max(0, Math.floor(damage / 2));
  return {
    damage: reducedDamage,
    activated: reducedDamage !== damage,
    message: reducedDamage !== damage
      ? '\n-> <b>' + c(pokemonName) + '</b>\'s <b>Multiscale</b> activated!'
      : ''
  };
}

function applySturdySurvival(options) {
  const { abilityName, currentHp, maxHp, incomingDamage, pokemonName, c } = options || {};
  const ability = normalizeAbilityName(abilityName);
  const hpNow = Number(currentHp);
  const hpMax = Number(maxHp);
  const damage = Math.max(0, Number(incomingDamage) || 0);
  if (ability !== 'sturdy' || !Number.isFinite(hpNow) || !Number.isFinite(hpMax) || hpNow <= 0 || hpMax <= 0) {
    return { damage, activated: false, message: '' };
  }
  if (hpNow !== hpMax || damage < hpNow) {
    return { damage, activated: false, message: '' };
  }
  const reducedDamage = Math.max(0, hpNow - 1);
  return {
    damage: reducedDamage,
    activated: true,
    message: '\n-> <b>' + c(pokemonName) + '</b>\'s <b>Sturdy</b> let it hang on with <b>1 HP</b>!'
  };
}

function applyFocusSashSurvival(options) {
  const { battleData, pass, heldItem, currentHp, maxHp, incomingDamage, pokemonName, moveName, c } = options || {};
  const item = getBattleHeldItemName({ battleData, pass, heldItem });
  const hpNow = Number(currentHp);
  const hpMax = Number(maxHp);
  const damage = Math.max(0, Number(incomingDamage) || 0);
  const normalizedMove = normalizeMoveName(moveName);
  if (item !== 'focus-sash' || !Number.isFinite(hpNow) || !Number.isFinite(hpMax) || hpNow <= 0 || hpMax <= 0) {
    return { damage, activated: false, message: '' };
  }
  if (normalizedMove === 'future sight' || normalizedMove === 'doom desire') {
    return { damage, activated: false, message: '' };
  }
  if (hpNow !== hpMax || damage < hpNow) {
    return { damage, activated: false, message: '' };
  }
  consumeBattleHeldItem({ battleData, pass, heldItem });
  return {
    damage: Math.max(0, hpNow - 1),
    activated: true,
    message: '\n-> <b>' + c(pokemonName) + '</b>\'s <b>Focus Sash</b> activated!\n-> <b>' + c(pokemonName) + '</b> hung on with <b>1 HP</b>!'
  };
}

function applyWeakArmorOnHit(options) {
  const { battleData, pass, pokemonName, abilityName, moveCategory, damageDealt, c, deferWhiteHerb } = options || {};
  const ability = normalizeAbilityName(abilityName);
  const category = String(moveCategory || '').toLowerCase();
  if (damageDealt <= 0 || ability !== 'weak-armor' || category !== 'physical') {
    return { message: '', deltas: [] };
  }
  const applied = applyStageChanges({
    battleData,
    pass,
    pokemonName,
    abilityName,
    changes: [{ stat: 'defense', delta: -1 }, { stat: 'speed', delta: 2 }],
    c,
    fromOpponent: false,
    deferWhiteHerb
  });
  if (applied.deltas.some((entry) => entry && entry.delta !== 0)) {
    applied.message = '\n-> <b>' + c(pokemonName) + '</b>\'s <b>Weak Armor</b> activated!' + applied.message;
  }
  return applied;
}

function applyStaminaOnHit(options) {
  const { battleData, pass, pokemonName, abilityName, damageDealt, c } = options || {};
  const ability = normalizeAbilityName(abilityName);
  if (damageDealt <= 0 || ability !== 'stamina') {
    return { message: '', deltas: [] };
  }
  const applied = applyStageChanges({
    battleData,
    pass,
    pokemonName,
    abilityName,
    changes: [{ stat: 'defense', delta: 1 }],
    c,
    fromOpponent: false
  });
  if (applied.deltas.some((entry) => entry && entry.delta !== 0)) {
    applied.message = '\n-> <b>' + c(pokemonName) + '</b>\'s <b>Stamina</b> activated!' + applied.message;
  }
  return applied;
}

function applyOnDamageTakenAbilities(options) {
  const {
    battleData,
    pass,
    pokemonName,
    attackerPass,
    attackerName,
    abilityName,
    heldItem,
    attackerAbility,
    moveName,
    typeEffectiveness,
    moveType,
    moveCategory,
    attackerMaxHp,
    hpBefore,
    hpAfter,
    maxHp,
    damageDealt,
    c
  } = options;
  const ability = normalizeAbilityName(abilityName);
  const type = String(moveType || '').toLowerCase();
  const category = String(moveCategory || '').toLowerCase();
  let message = '';
  let deltas = [];
  const crossedHalf = Number(hpBefore) > Math.floor(Number(maxHp || 0) / 2) && Number(hpAfter) > 0 && Number(hpAfter) <= Math.floor(Number(maxHp || 0) / 2);
  const pinchBefore = getPinchAbilityInfo({ abilityName, currentHp: hpBefore, maxHp });
  const pinchAfter = getPinchAbilityInfo({ abilityName, currentHp: hpAfter, maxHp });

  if (damageDealt > 0 && ability === 'steam-engine' && (type === 'fire' || type === 'water')) {
    const applied = applyStageChanges({ battleData, pass, pokemonName, abilityName, changes: [{ stat: 'speed', delta: 6 }], c, fromOpponent: false });
    message += applied.message;
    deltas = deltas.concat(applied.deltas);
  }
  if (damageDealt > 0 && ability === 'thermal-exchange' && type === 'fire') {
    const applied = applyStageChanges({ battleData, pass, pokemonName, abilityName, changes: [{ stat: 'attack', delta: 1 }], c, fromOpponent: false });
    message += applied.message;
    deltas = deltas.concat(applied.deltas);
  }
  if (damageDealt > 0 && ability === 'water-compaction' && type === 'water') {
    const applied = applyStageChanges({ battleData, pass, pokemonName, abilityName, changes: [{ stat: 'defense', delta: 2 }], c, fromOpponent: false });
    message += applied.message;
    deltas = deltas.concat(applied.deltas);
  }
  if (damageDealt > 0 && ability === 'rattled' && (type === 'bug' || type === 'dark' || type === 'ghost')) {
    const applied = applyStageChanges({ battleData, pass, pokemonName, abilityName, changes: [{ stat: 'speed', delta: 1 }], c, fromOpponent: false });
    message += applied.message;
    deltas = deltas.concat(applied.deltas);
  }
  if (damageDealt > 0 && ability === 'justified' && type === 'dark') {
    const applied = applyStageChanges({ battleData, pass, pokemonName, abilityName, changes: [{ stat: 'attack', delta: 1 }], c, fromOpponent: false });
    message += applied.message;
    deltas = deltas.concat(applied.deltas);
  }
  if (crossedHalf && ability === 'berserk') {
    const applied = applyStageChanges({ battleData, pass, pokemonName, abilityName, changes: [{ stat: 'special_attack', delta: 1 }], c, fromOpponent: false });
    message += applied.message;
    deltas = deltas.concat(applied.deltas);
  }
  if (crossedHalf && ability === 'anger-shell') {
    const applied = applyStageChanges({
      battleData,
      pass,
      pokemonName,
      abilityName,
      changes: [
        { stat: 'attack', delta: 1 },
        { stat: 'special_attack', delta: 1 },
        { stat: 'speed', delta: 1 },
        { stat: 'defense', delta: -1 },
        { stat: 'special_defense', delta: -1 }
      ],
      c,
      fromOpponent: false
    });
    message += applied.message;
    deltas = deltas.concat(applied.deltas);
  }
  if (!pinchBefore.active && pinchAfter.active) {
    message += '\n-> <b>' + c(pokemonName) + '</b>\'s <b>' + pinchAfter.abilityLabel + '</b> activated! Its ' + c(pinchAfter.boostType) + '-type moves are now stronger.';
  }

  const held = getBattleHeldItemName({ battleData, pass, heldItem });
  const effectiveness = Number(typeEffectiveness) || 0;
  const attackerAbilityName = normalizeAbilityName(attackerAbility);
  const directDamage = isDirectDamageMove(moveName);
  const contraryIgnored = attackerAbilityName === 'mold-breaker';
  if (held === 'weakness-policy' && damageDealt > 0 && effectiveness > 1 && !directDamage) {
    const stages = ensurePokemonStatStages(battleData, pass);
    const contraryThresholdBlocked = ability === 'contrary' && !contraryIgnored
      && (Number(stages.attack) || 0) <= -6
      && (Number(stages.special_attack) || 0) <= -6;
    const normalThresholdBlocked = !(ability === 'contrary' && !contraryIgnored)
      && (Number(stages.attack) || 0) >= 6
      && (Number(stages.special_attack) || 0) >= 6;
    if (!contraryThresholdBlocked && !normalThresholdBlocked) {
      const applied = applyStageChanges({
        battleData,
        pass,
        pokemonName,
        abilityName: contraryIgnored ? '' : abilityName,
        changes: [{ stat: 'attack', delta: 2 }, { stat: 'special_attack', delta: 2 }],
        c,
        fromOpponent: false
      });
      if (applied.deltas.some((entry) => entry && entry.delta !== 0)) {
        consumeBattleHeldItem({ battleData, pass, heldItem });
        message += '\n-> <b>' + c(pokemonName) + '</b>\'s <b>Weakness Policy</b> activated!' + applied.message;
        deltas = deltas.concat(applied.deltas);
      }
    }
  }

  if (held === 'rocky-helmet' && damageDealt > 0 && moveMakesContact(moveName, moveCategory)) {
    const attackerIsCurrent = String(attackerPass) === String(battleData.c);
    const attackerHpKey = attackerIsCurrent ? 'chp' : 'ohp';
    const attackerBefore = Math.max(0, Number(battleData[attackerHpKey]) || 0);
    const helmetDamage = Math.max(1, Math.floor((Number(attackerMaxHp) || 0) / 6));
    const taken = Math.min(helmetDamage, attackerBefore);
    if (taken > 0) {
      battleData[attackerHpKey] = Math.max(0, attackerBefore - taken);
      if (attackerIsCurrent) {
        if (battleData.tem && Object.prototype.hasOwnProperty.call(battleData.tem, attackerPass)) {
          battleData.tem[attackerPass] = Math.max(0, (battleData.tem[attackerPass] || attackerBefore) - taken);
        }
        if (battleData.team && Object.prototype.hasOwnProperty.call(battleData.team, attackerPass)) {
          battleData.team[attackerPass] = Math.max(0, (battleData.team[attackerPass] || attackerBefore) - taken);
        }
      } else {
        if (battleData.tem2 && Object.prototype.hasOwnProperty.call(battleData.tem2, attackerPass)) {
          battleData.tem2[attackerPass] = Math.max(0, (battleData.tem2[attackerPass] || attackerBefore) - taken);
        }
        if (battleData.ot && Object.prototype.hasOwnProperty.call(battleData.ot, attackerPass)) {
          battleData.ot[attackerPass] = Math.max(0, (battleData.ot[attackerPass] || attackerBefore) - taken);
        }
      }
      message += '\n-> <b>' + c(pokemonName) + '</b>\'s <b>Rocky Helmet</b> activated!';
      message += '\n-> <b>' + c(attackerName) + '</b> lost <code>' + taken + '</code> HP from <b>Rocky Helmet</b>!';
    }
  }

  return { message, deltas };
}

function getKoAbilityChanges(abilityName, stats) {
  const ability = normalizeAbilityName(abilityName);
  if (ability === 'moxie' || ability === 'chilling-neigh' || ability === 'as-one-glastrier') {
    return [{ stat: 'attack', delta: 1 }];
  }
  if (ability === 'grim-neigh' || ability === 'as-one-spectrier' || ability === 'soul-heart') {
    return [{ stat: 'special_attack', delta: 1 }];
  }
  if (ability === 'beast-boost') {
    return [{ stat: getHighestStatKey(stats), delta: 1 }];
  }
  return [];
}

function applyKoAbility(options) {
  const { battleData, pass, pokemonName, abilityName, stats, c } = options;
  const ability = normalizeAbilityName(abilityName);
  const state = ensureAbilityState(battleData);
  let message = '';
  let deltas = [];

  const direct = getKoAbilityChanges(ability, stats);
  if (direct.length > 0) {
    const applied = applyStageChanges({ battleData, pass, pokemonName, abilityName, changes: direct, c, fromOpponent: false });
    if (applied.deltas.some((entry) => entry && entry.delta !== 0)) {
      const namedKoAbilities = new Set([
        'beast-boost',
        'moxie',
        'chilling-neigh',
        'grim-neigh',
        'as-one-glastrier',
        'as-one-spectrier',
        'soul-heart'
      ]);
      if (namedKoAbilities.has(ability)) {
        applied.message = '\n-> <b>' + c(pokemonName) + '</b>\'s <b>' + titleCaseHyphenated(abilityName) + '</b> activated!' + applied.message;
      }
    }
    message += applied.message;
    deltas = deltas.concat(applied.deltas);
  }

  if (ability === 'battle-bond' && !state.battleBond[String(pass)]) {
    state.battleBond[String(pass)] = true;
    const applied = applyStageChanges({
      battleData,
      pass,
      pokemonName,
      abilityName,
      changes: [{ stat: 'attack', delta: 1 }, { stat: 'special_attack', delta: 1 }, { stat: 'speed', delta: 1 }],
      c,
      fromOpponent: false
    });
    message += applied.message;
    deltas = deltas.concat(applied.deltas);
  }

  return { message, deltas };
}

function applyEndTurnAbility(options) {
  const { battleData, pass, pokemonName, abilityName, heldItem, maxHp, c } = options;
  const ability = normalizeAbilityName(abilityName);
  const state = ensureAbilityState(battleData);
  let message = '';
  let deltas = [];

  if (state.tatsugiriLunchboxTurn && state.tatsugiriLunchboxTurn[String(pass)]) {
    const reverted = applyStageChanges({
      battleData,
      pass,
      pokemonName,
      abilityName: '',
      changes: [
        { stat: 'attack', delta: -2 },
        { stat: 'defense', delta: -2 },
        { stat: 'special_attack', delta: -2 },
        { stat: 'special_defense', delta: -2 },
        { stat: 'speed', delta: -2 }
      ],
      c,
      fromOpponent: false
    });
    if (reverted.deltas.some((entry) => entry && entry.delta !== 0)) {
      message += '\n-> <b>' + c(pokemonName) + '</b>\'s <b>Tatsugiri Lunchbox</b> wore off!';
      message += reverted.message;
      deltas = deltas.concat(reverted.deltas);
    }
    delete state.tatsugiriLunchboxTurn[String(pass)];
  }

  if (!ability) return { message, deltas };

  if (ability === 'speed-boost') {
    const turnState = battleData && battleData.turnAbilityState && typeof battleData.turnAbilityState === 'object'
      ? battleData.turnAbilityState
      : {};
    const skipMap = turnState.skipSpeedBoost && typeof turnState.skipSpeedBoost === 'object' ? turnState.skipSpeedBoost : {};
    const failedEscapeMap = turnState.failedEscape && typeof turnState.failedEscape === 'object' ? turnState.failedEscape : {};
    if (skipMap[String(pass)] || failedEscapeMap[String(pass)]) {
      return { message, deltas };
    }
    const applied = applyStageChanges({ battleData, pass, pokemonName, abilityName, changes: [{ stat: 'speed', delta: 1 }], c, fromOpponent: false });
    if (applied.deltas.some((entry) => entry && entry.delta !== 0)) {
      applied.message = '\n-> <b>' + c(pokemonName) + '</b>\'s <b>Speed Boost</b> activated!' + applied.message;
    }
    return { message: message + applied.message, deltas: deltas.concat(applied.deltas) };
  }

  if (ability === 'moody') {
    const stages = ensurePokemonStatStages(battleData, pass);
    const upPool = MAIN_BATTLE_STATS.filter((stat) => (stages[stat] || 0) < 6);
    const downPoolBase = MAIN_BATTLE_STATS.filter((stat) => (stages[stat] || 0) > -6);
    let raisedStat = '';

    if (upPool.length > 0) {
      raisedStat = upPool[Math.floor(Math.random() * upPool.length)];
      const raised = applyStageChanges({ battleData, pass, pokemonName, abilityName, changes: [{ stat: raisedStat, delta: 2 }], c, fromOpponent: false });
      message += raised.message;
      deltas = deltas.concat(raised.deltas);
    }

    const downPool = downPoolBase.filter((stat) => stat !== raisedStat);
    if (downPool.length > 0) {
      const loweredStat = downPool[Math.floor(Math.random() * downPool.length)];
      const lowered = applyStageChanges({ battleData, pass, pokemonName, abilityName, changes: [{ stat: loweredStat, delta: -1 }], c, fromOpponent: false });
      message += lowered.message;
      deltas = deltas.concat(lowered.deltas);
    }

    return { message, deltas };
  }

  const item = getBattleHeldItemName({ battleData, pass, heldItem });
  if (item === 'leftovers' && Number(maxHp) > 0) {
    const isCurrentSide = String(pass) === String(battleData && battleData.c);
    const hpKey = isCurrentSide ? 'chp' : 'ohp';
    const teamKey = isCurrentSide ? 'tem' : 'tem2';
    const currentHp = Math.max(0, Number(battleData && battleData[hpKey]) || 0);
    const maxHealth = Math.max(1, Number(maxHp) || 1);
    if (currentHp <= 0 || currentHp >= maxHealth) {
      return { message, deltas };
    }
    const healAmount = Math.max(1, Math.floor(maxHealth / 16));
    const healed = Math.min(healAmount, maxHealth - currentHp);
    battleData[hpKey] = currentHp + healed;
    if (!battleData[teamKey] || typeof battleData[teamKey] !== 'object') battleData[teamKey] = {};
    battleData[teamKey][pass] = battleData[hpKey];
    return {
      message: message + '\n-> <b>' + c(pokemonName) + '</b>\'s <b>Leftovers</b> activated!\n-> <b>' + c(pokemonName) + '</b> restored <code>' + healed + '</code> HP!',
      deltas
    };
  }

  return { message, deltas };
}

function applyBlunderPolicy(options) {
  const { battleData, pass, pokemonName, heldItem, moveName, c } = options || {};
  const item = getBattleHeldItemName({ battleData, pass, heldItem });
  const normalizedMove = normalizeMoveName(moveName);
  if (item !== 'blunder-policy') {
    return { message: '', deltas: [] };
  }
  const blockedMoves = new Set(['sheer cold', 'fissure', 'guillotine', 'horn drill', 'triple kick', 'triple axel', 'population bomb']);
  if (blockedMoves.has(normalizedMove)) {
    return { message: '', deltas: [] };
  }
  const applied = applyStageChanges({
    battleData,
    pass,
    pokemonName,
    abilityName: '',
    changes: [{ stat: 'speed', delta: 2 }],
    c,
    fromOpponent: false
  });
  if (applied.deltas.some((entry) => entry && entry.delta !== 0)) {
    consumeBattleHeldItem({ battleData, pass, heldItem });
    applied.message = '\n-> <b>' + c(pokemonName) + '</b>\'s <b>Blunder Policy</b> activated!' + applied.message;
  }
  return applied;
}

module.exports = {
  STAT_KEYS,
  advanceBattleWeather,
  applyAbsorbMoveAbility,
  applyEndTurnAbility,
  applyEntryAbility,
  applyKoAbility,
  applyOnDamageTakenAbilities,
  applyWeatherByMove,
  applyWeatherEndTurn,
  applyBlunderPolicy,
  applyMultiscaleReduction,
  applyFocusSashSurvival,
  applyWhiteHerbIfNeeded,
  applyShadowShieldReduction,
  applyOpportunistCopy,
  applyStaminaOnHit,
  applyWeakArmorOnHit,
  applyStageChanges,
  applyStageToStat,
  canUseAuroraVeilWeather,
  clampStage,
  ensureAbilityState,
  ensureBattleStatStages,
  ensureBattleHeldItems,
  ensureConsumedHeldItems,
  ensurePokemonStatStages,
  applySturdySurvival,
  canSkipChargeByWeather,
  consumeBattleHeldItem,
  getAttackStatMultiplier,
  getBattleHeldItemName,
  getBattleMovePower,
  getEffectiveMoveName,
  getBattleWeatherName,
  getDisplayedWeatherState,
  getEffectiveWeatherName,
  getGrowthStageChange,
  getEffectivePokemonDisplayName,
  getEffectiveMoveType,
  getEffectivePokemonTypes,
  getPowerConstructFormChange,
  getPowerHerbInfo,
  getGoodAsGoldInfo,
  getAirBalloonInfo,
  getPinchAbilityInfo,
  getPinchPowerMultiplier,
  getInfiltratorInfo,
  getLevitateInfo,
  getHeldItemStatMultipliers,
  getStabInfo,
  getSupremeOverlordInfo,
  getTechnicianPowerInfo,
  getWeatherAccuracyInfo,
  getWeatherAccuracyMultiplierForTarget,
  getWeatherDefenseMultiplier,
  getWeatherDisplayName,
  getWeatherMovePowerMultiplier,
  getWeatherRecoveryRatio,
  getWeatherSuppressedMoveMessage,
  hasWeatherNegationActive,
  isWeatherNegatingAbility,
  setBattleWeatherNegationState,
  getStrongWindsEffectiveness,
  getUnawareBattleModifiers,
  getUnawareInfo,
  getHighestStatKey,
  getStageMultiplier,
  getStageVerb,
  getStatLabel,
  isDirectDamageMove,
  isImmutableAbility,
  isPowerConstructAbility,
  isWindMove,
  blocksAbilityChangeInteraction,
  canRemoveHeldItemByEffect,
  moveMakesContact,
  normalizeAbilityName,
  normalizeHeldItemName,
  normalizeMoveName
};
