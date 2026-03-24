const {
  applyAbsorbMoveAbility: applyAbilityAbsorbMove,
  applyStageChanges,
  applyMultiscaleReduction,
  applyShadowShieldReduction,
  applyStaminaOnHit,
  applySturdySurvival,
  applyFocusSashSurvival,
  applyWeakArmorOnHit,
  applyWhiteHerbIfNeeded,
  applyEndTurnAbility: applyAbilityEndTurn,
  applyEntryAbility: applyAbilityEntry,
  applyWeatherByMove,
  applyWeatherEndTurn,
  advanceBattleWeather,
  consumeBattleHeldItem,
  canUseAuroraVeilWeather,
  getAttackStatMultiplier,
  getBattleHeldItemName,
  getBattleMovePower,
  getEffectiveMoveName,
  getBattleWeatherName,
  getDisplayedWeatherState,
  getEffectiveWeatherName,
  getEffectivePokemonDisplayName,
  getEffectiveMoveType,
  getEffectivePokemonTypes,
  getPowerConstructFormChange,
  getAirBalloonInfo,
  getGoodAsGoldInfo,
  getHeldItemStatMultipliers,
  getInfiltratorInfo,
  getLevitateInfo,
  getPinchAbilityInfo,
  getPinchPowerMultiplier,
  getPowerHerbInfo,
  getStabInfo,
  getSupremeOverlordInfo,
  getTechnicianPowerInfo,
  getUnawareBattleModifiers,
  getWeatherAccuracyInfo,
  getWeatherAccuracyMultiplierForTarget,
  getWeatherDefenseMultiplier,
  getWeatherDisplayName,
  getWeatherMovePowerMultiplier,
  getWeatherRecoveryRatio,
  getWeatherSuppressedMoveMessage,
  setBattleWeatherNegationState,
  getStrongWindsEffectiveness,
  getGrowthStageChange,
  isDirectDamageMove,
  normalizeAbilityName,
  applyBlunderPolicy,
  applyKoAbility: applyAbilityKo,
  applyOnDamageTakenAbilities: applyAbilityOnDamageTaken
} = require('../../utils/battle_abilities');
const { syncBattleFormAndAbility } = require('../../utils/battle_forms');
const { getSanitizedHeldItemForPokemon } = require('../../utils/pokemon_item_rules');
const { getGigantamaxFormName, getDisplayPokemonSymbol } = require('../../utils/gmax_utils');
const { getDynamaxLevel } = require('../../utils/dynamax_level');
const { getBattleBaseStats, activateImpersonateForPass, getImpersonateTargetName } = require('../../utils/battle_impersonate');

const ABILITY_BY_FORM = (() => {
  try {
    return require('../../data/pokemon_abilities_cache.json') || {};
  } catch (error) {
    return {};
  }
})();

function registerBattleCallbacks(bot, deps) {
  const {
    getUserData,
    editMessage,
    loadBattleData,
    saveBattleData,
    fs,
    c,
    pokes,
    pokestats,
    plevel,
    Stats,
    battlec,
    spawn,
    shiny,
    events,
    dmoves,
    emojis,
    loadMessageData,
    saveMessageData,
    saveUserData2,
    incexp,
    incexp2,
    stones,
    Bar,
    eff,
    calc,
    getStatusTag,
    ensureBattleStatus,
    getBattleStatus,
    canPokemonAct,
    getMoveStatusEffect,
    isStatusImmune,
    setBattleStatus,
    getStatusLabel,
    applyDefenderResidualDamage,
    getSpeedWithStatus,
    sendMessage,
    tutors,
    word,
    bot: botInstance,
    he,
    chains
  } = deps;

  const botRef = botInstance || bot;
  const battleDebug = process.env.BATTLE_DEBUG === '1';
  function dbg(label, data) {
    if (!battleDebug) return;
    try {
      // Use stderr so it still prints when QUIET_LOGS disables console.log
      console.error('[BATTLE]', label, typeof data === 'string' ? data : JSON.stringify(data));
    } catch (e) {
      console.error('[BATTLE]', label);
    }
  }

  function ensureBattleDynamaxState(battleData) {
    if (!battleData.dynamaxState || typeof battleData.dynamaxState !== 'object') {
      battleData.dynamaxState = {};
    }
    return battleData.dynamaxState;
  }

  function ensureBattleDynamaxUsed(battleData) {
    if (!battleData.dynamaxUsed || typeof battleData.dynamaxUsed !== 'object') {
      battleData.dynamaxUsed = {};
    }
    return battleData.dynamaxUsed;
  }

  function getBattleDynamaxState(battleData, pass) {
    const all = ensureBattleDynamaxState(battleData);
    return all[String(pass)] || null;
  }

  function hasBattleOmniRing(userData) {
    return !!(userData && userData.inv && (userData.inv.omniring || userData.inv.ring || userData.inv.gmax_band));
  }

  function getBattleDynamaxMultiplier(pokemon) {
    const level = getDynamaxLevel(pokemon);
    return 1 + (level * 0.1);
  }

  function getBattleDisplayedMaxHp(battleData, pokemon, baseMaxHp) {
    const state = getBattleDynamaxState(battleData, pokemon && pokemon.pass);
    if (!state) return baseMaxHp;
    return Math.max(1, Math.round(baseMaxHp * (state.multiplier || 1)));
  }

  function normalizeDisplayedHp(currentHp, maxHp) {
    return Math.max(0, Math.min(maxHp, Math.round(currentHp || 0)));
  }

  function ensureBattleSleepTurns(battleData) {
    if (!battleData.sleepTurns || typeof battleData.sleepTurns !== 'object') {
      battleData.sleepTurns = {};
    }
    return battleData.sleepTurns;
  }

  function clearBattleMajorStatus(battleData, pass) {
    const existingStatus = getBattleStatus(battleData, pass);
    setBattleStatus(battleData, pass, null);
    const sleepTurns = ensureBattleSleepTurns(battleData);
    delete sleepTurns[pass];
    return existingStatus;
  }

  function setBattleSleepStatus(battleData, pass, turns) {
    setBattleStatus(battleData, pass, 'sleep');
    ensureBattleSleepTurns(battleData)[pass] = Math.max(1, Number(turns) || 2);
  }

  function healBattlePokemon({ battleData, pass, maxHp, amount, hpKey, tempKey }) {
    const healAmount = Math.max(0, Math.floor(Number(amount) || 0));
    const hpBefore = Math.max(0, Number(battleData[hpKey]) || 0);
    if (healAmount <= 0 || hpBefore >= maxHp) {
      return 0;
    }
    const nextHp = Math.min(maxHp, hpBefore + healAmount);
    const healed = Math.max(0, nextHp - hpBefore);
    battleData[hpKey] = nextHp;
    if (!battleData[tempKey] || typeof battleData[tempKey] !== 'object') {
      battleData[tempKey] = {};
    }
    battleData[tempKey][pass] = Math.min(maxHp, Math.max(0, (battleData[tempKey][pass] || hpBefore) + healed));
    return healed;
  }

  const HALF_HEAL_STATUS_MOVES = new Set(['heal order', 'milk drink', 'recover', 'roost', 'slack off', 'soft-boiled']);

  function normalizeBattleSettings(settings) {
    const next = settings && typeof settings === 'object' ? settings : {};
    next.allow_regions = Array.isArray(next.allow_regions) ? next.allow_regions : [];
    next.ban_regions = Array.isArray(next.ban_regions) ? next.ban_regions : [];
    next.allow_types = Array.isArray(next.allow_types) ? next.allow_types : [];
    next.ban_types = Array.isArray(next.ban_types) ? next.ban_types : [];
    return next;
  }

  function isBattleGigantamaxPokemon(pokemon) {
    if (!pokemon) return false;
    if (getDisplayPokemonSymbol(pokemon) !== '✘') return false;
    return !!getGigantamaxFormName(pokemon.name);
  }

  const MAX_MOVE_NAMES = {
    normal: 'Max Strike',
    fire: 'Max Flare',
    water: 'Max Geyser',
    electric: 'Max Lightning',
    grass: 'Max Overgrowth',
    ice: 'Max Hailstorm',
    fighting: 'Max Knuckle',
    poison: 'Max Ooze',
    ground: 'Max Quake',
    flying: 'Max Airstream',
    psychic: 'Max Mindstorm',
    bug: 'Max Flutterby',
    rock: 'Max Rockfall',
    ghost: 'Max Phantasm',
    dragon: 'Max Wyrmwind',
    dark: 'Max Darkness',
    steel: 'Max Steelspike',
    fairy: 'Max Starfall'
  };

  const Z_CRYSTAL_TYPES = {
    normalium: 'normal',
    'normalium-z': 'normal',
    firium: 'fire',
    'firium-z': 'fire',
    waterium: 'water',
    'waterium-z': 'water',
    electrium: 'electric',
    'electrium-z': 'electric',
    grassium: 'grass',
    'grassium-z': 'grass',
    icium: 'ice',
    'icium-z': 'ice',
    fightinium: 'fighting',
    'fightinium-z': 'fighting',
    poisonium: 'poison',
    'poisonium-z': 'poison',
    groundium: 'ground',
    'groundium-z': 'ground',
    flyinium: 'flying',
    'flyinium-z': 'flying',
    psychium: 'psychic',
    'psychium-z': 'psychic',
    buginium: 'bug',
    'buginium-z': 'bug',
    rockium: 'rock',
    'rockium-z': 'rock',
    ghostium: 'ghost',
    'ghostium-z': 'ghost',
    dragonium: 'dragon',
    'dragonium-z': 'dragon',
    darkinium: 'dark',
    'darkinium-z': 'dark',
    steelium: 'steel',
    'steelium-z': 'steel',
    fairium: 'fairy',
    'fairium-z': 'fairy',
    aloraichium: 'electric',
    'aloraichium-z': 'electric',
    decidium: 'ghost',
    'decidium-z': 'ghost',
    eevium: 'normal',
    'eevium-z': 'normal',
    incinium: 'dark',
    'incinium-z': 'dark',
    kommonium: 'dragon',
    'kommonium-z': 'dragon',
    lunalium: 'ghost',
    'lunalium-z': 'ghost',
    lycanium: 'rock',
    'lycanium-z': 'rock',
    marshadium: 'ghost',
    'marshadium-z': 'ghost',
    mewnium: 'psychic',
    'mewnium-z': 'psychic',
    mewtwonium: 'psychic',
    'mewtwonium-z': 'psychic',
    'mewtwonium-z-x': 'psychic',
    'mewtwonium-z-y': 'psychic',
    mimikium: 'ghost',
    'mimikium-z': 'ghost',
    pikanium: 'electric',
    'pikanium-z': 'electric',
    pikashunium: 'electric',
    'pikashunium-z': 'electric',
    primarium: 'water',
    'primarium-z': 'water',
    snorlium: 'normal',
    'snorlium-z': 'normal',
    solganium: 'steel',
    'solganium-z': 'steel',
    tapunium: 'fairy',
    'tapunium-z': 'fairy',
    ultranecrozium: 'psychic',
    'ultranecrozium-z': 'psychic'
  };

  const Z_MOVE_NAMES = {
    normal: 'Breakneck Blitz',
    fire: 'Inferno Overdrive',
    water: 'Hydro Vortex',
    electric: 'Gigavolt Havoc',
    grass: 'Bloom Doom',
    ice: 'Subzero Slammer',
    fighting: 'All-Out Pummeling',
    poison: 'Acid Downpour',
    ground: 'Tectonic Rage',
    flying: 'Supersonic Skystrike',
    psychic: 'Shattered Psyche',
    bug: 'Savage Spin-Out',
    rock: 'Continental Crush',
    ghost: 'Never-Ending Nightmare',
    dragon: 'Devastating Drake',
    dark: 'Black Hole Eclipse',
    steel: 'Corkscrew Crash',
    fairy: 'Twinkle Tackle'
  };

  function getMaxMoveName(moveType, moveCategory) {
    if (String(moveCategory || '').toLowerCase() === 'status') return 'Max Guard';
    return MAX_MOVE_NAMES[String(moveType || '').toLowerCase()] || 'Max Strike';
  }

  function ensureBattleZMoveReadyState(battleData) {
    if (!battleData.zMoveReady || typeof battleData.zMoveReady !== 'object') {
      battleData.zMoveReady = {};
    }
    return battleData.zMoveReady;
  }

  function ensureBattleZMoveUsedState(battleData) {
    if (!battleData.zMoveUsed || typeof battleData.zMoveUsed !== 'object') {
      battleData.zMoveUsed = {};
    }
    return battleData.zMoveUsed;
  }

  function normalizeZCrystalName(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[_\s]+/g, '-')
      .replace(/-+/g, '-');
  }

  function getEquippedTrainerZCrystal(userData) {
    if (!userData) return '';
    return normalizeZCrystalName(
      (userData.extra && (userData.extra.equippedZCrystal || userData.extra.zCrystal || userData.extra.zcrystal))
      || (userData.inv && (userData.inv.equipped_zcrystal || userData.inv.equippedZCrystal || userData.inv.zcrystal || userData.inv.z_crystal))
      || ''
    );
  }

  function getZCrystalType(zCrystalName) {
    return Z_CRYSTAL_TYPES[normalizeZCrystalName(zCrystalName)] || '';
  }

  function getZMoveName(moveType) {
    return Z_MOVE_NAMES[String(moveType || '').toLowerCase()] || 'Breakneck Blitz';
  }

  function getZMovePower(movePower) {
    const base = Number(movePower) || 0;
    if (base <= 0) return 0;
    return Math.max(100, Math.floor(base * 1.8));
  }

  function canUseBattleZMoveForMove({ battleData, userData, pokemon, move }) {
    if (!battleData || !userData || !pokemon || !move) return false;
    if (String(move.category || '').toLowerCase() === 'status' || !move.power) return false;
    const crystalType = getZCrystalType(getEquippedTrainerZCrystal(userData));
    if (!crystalType) return false;
    const effectiveType = getEffectiveMoveType({
      battleData,
      pokemonName: pokemon.name,
      abilityName: pokemon.ability,
      heldItem: getBattleHeldItemName({ battleData, pass: pokemon.pass, heldItem: pokemon.held_item }),
      moveName: move.name,
      moveType: move.type
    }) || move.type;
    return String(effectiveType || '').toLowerCase() === crystalType;
  }

  function canBattlePokemonUseAnyZMove({ battleData, userData, pokemon }) {
    if (!battleData || !userData || !pokemon) return false;
    return Array.isArray(pokemon.moves) && pokemon.moves.some((moveId) => {
      const move = dmoves[moveId];
      return canUseBattleZMoveForMove({ battleData, userData, pokemon, move });
    });
  }

  function getDisplayedBattleMove({ battleData, pokemon, move, userData, userId, forceZMove }) {
    if (!pokemon || !move) return move;
    const readyKey = userId || (userData && (userData.id || userData.user_id));
    const zMoveReady = !!(forceZMove || (readyKey && ensureBattleZMoveReadyState(battleData)[String(readyKey)]));
    if (zMoveReady && userData && canUseBattleZMoveForMove({ battleData, userData, pokemon, move })) {
      const heldItem = getBattleHeldItemName({ battleData, pass: pokemon.pass, heldItem: pokemon.held_item });
      const effectiveType = getEffectiveMoveType({
        battleData,
        pokemonName: pokemon.name,
        abilityName: pokemon.ability,
        heldItem,
        moveName: move.name,
        moveType: move.type
      }) || move.type;
      return { ...move, name: getZMoveName(effectiveType), type: effectiveType, power: getZMovePower(move.power), isZMove: true };
    }
    const state = getBattleDynamaxState(battleData, pokemon.pass);
    if (!state) return move;
    const heldItem = getBattleHeldItemName({ battleData, pass: pokemon.pass, heldItem: pokemon.held_item });
    const effectiveType = getEffectiveMoveType({
      battleData,
      pokemonName: pokemon.name,
      abilityName: pokemon.ability,
      heldItem,
      moveName: move.name,
      moveType: move.type
    }) || move.type;
    return { ...move, name: getMaxMoveName(effectiveType, move.category), type: effectiveType };
  }

  function scaleBattleCurrentHpUp(currentHp, multiplier) {
    return Math.max(1, Math.round((currentHp || 0) * multiplier));
  }

  function scaleBattleCurrentHpDown(currentHp, multiplier, baseMaxHp) {
    return Math.max(0, Math.min(baseMaxHp, Math.round((currentHp || 0) / multiplier)));
  }

  async function revertBattleDynamaxForPass({ battleData, pass, userData, currentHpKey, teamKey }) {
    const state = getBattleDynamaxState(battleData, pass);
    if (!state) return '';
    const pokemon = userData && (userData.pokes || []).find((poke) => String(poke.pass) === String(pass));
    if (!pokemon || !pokestats[pokemon.name]) {
      delete ensureBattleDynamaxState(battleData)[String(pass)];
      return '';
    }
    const stats = await Stats(pokestats[pokemon.name], pokemon.ivs, pokemon.evs, c(pokemon.nature), plevel(pokemon.name, pokemon.exp));
    if (currentHpKey && typeof battleData[currentHpKey] === 'number') {
      battleData[currentHpKey] = scaleBattleCurrentHpDown(battleData[currentHpKey], state.multiplier || 1, stats.hp);
    }
    if (teamKey && battleData[teamKey] && typeof battleData[teamKey][pass] === 'number') {
      battleData[teamKey][pass] = scaleBattleCurrentHpDown(battleData[teamKey][pass], state.multiplier || 1, stats.hp);
    }
    delete ensureBattleDynamaxState(battleData)[String(pass)];
    return '\n-> <b>' + c(pokemon.name) + '</b> returned to normal size.';
  }

  function hitBattleCooldown(ctx, ms = 2000) {
    const now = Date.now();
    const chatKey = ctx && ctx.chat ? ctx.chat.id : undefined;
    const userId = ctx && ctx.from ? ctx.from.id : undefined;
    const userKey = 'u_' + String(userId);
    const chatLimited = chatKey !== undefined && battlec[chatKey] && now - battlec[chatKey] < ms;
    const userLimited = userId !== undefined && battlec[userKey] && now - battlec[userKey] < ms;
    if (chatLimited || userLimited) return true;
    if (chatKey !== undefined) battlec[chatKey] = now;
    if (userId !== undefined) battlec[userKey] = now;
    return false;
  }

  const safeName = (raw) => {
    const txt = String(raw || "Trainer");
    if (he && typeof he.decode === "function" && typeof he.encode === "function") {
      return he.encode(he.decode(txt));
    }
    return txt;
  };

  const displayName = (data, fallbackId) => {
    if (!data || !data.inv) return safeName(fallbackId);
    return safeName(data.inv.name || data.inv.username || data.inv.id || fallbackId);
  };

  function normalizeMoveName(moveName) {
    return String(moveName || '')
      .toLowerCase()
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function formatAbilityLabel(abilityName) {
    return String(abilityName || 'none')
      .split('-')
      .map((part) => part ? part.charAt(0).toUpperCase() + part.slice(1) : part)
      .join(' ');
  }

  function pokemonKnowsMoveByName(pokemon, moveName) {
    const target = normalizeMoveName(moveName);
    return Array.isArray(pokemon && pokemon.moves) && pokemon.moves.some((moveId) => {
      const move = dmoves[moveId];
      return move && normalizeMoveName(move.name) === target;
    });
  }

  function getAbilityActivationMessage(pokemonName, abilityLabel) {
    return '\n-> <b>' + c(pokemonName) + '</b>\'s <b>' + abilityLabel + '</b> activated!';
  }

  function isOpponentTargetingStatusMove(move, moveName) {
    const normalizedMove = normalizeMoveName(moveName || (move && move.name));
    if (normalizedMove === 'leech seed') return true;
    const statusEffect = getMoveStatusEffect(move);
    if (statusEffect) return true;
    const effects = MOVE_STAT_EFFECTS[normalizedMove] || [];
    return effects.some((effect) => effect && effect.target === 'target');
  }

  function getUnawareActivationMessages(options) {
    const { attackerName, defenderName, unawareModifiers } = options || {};
    if (!unawareModifiers) return '';
    let message = '';
    if (unawareModifiers.attackerActivated) {
      message += getAbilityActivationMessage(attackerName, 'Unaware');
    }
    if (unawareModifiers.defenderActivated) {
      message += getAbilityActivationMessage(defenderName, 'Unaware');
    }
    return message;
  }

  function getDisplayedMovePower(move, abilityName, currentHp, maxHp, battleDataArg, pass, pokemonName) {
    const effectiveMoveName = getEffectiveMoveName({
      pokemonName,
      heldItem: getBattleHeldItemName({ battleData: battleDataArg, pass }),
      moveName: move && move.name
    });
    const effectiveMoveType = getEffectiveMoveType({
      battleData: battleDataArg,
      pokemonName,
      abilityName,
      heldItem: getBattleHeldItemName({ battleData: battleDataArg, pass }),
      moveName: effectiveMoveName || (move && move.name),
      moveType: move && move.type
    });
    const rawPower = getBattleMovePower({
      battleData: battleDataArg,
      pass,
      pokemonName,
      moveName: move && move.name,
      moveType: effectiveMoveType,
      movePower: move && move.power
    });
    const weatherAdjustedPower = Number.isFinite(rawPower) && rawPower > 0
      ? Math.max(1, Math.floor(rawPower * getWeatherMovePowerMultiplier({ battleData: battleDataArg, moveName: effectiveMoveName || (move && move.name), moveType: effectiveMoveType })))
      : rawPower;
    if (!Number.isFinite(weatherAdjustedPower) || weatherAdjustedPower <= 0) return move && move.power;
    const technicianInfo = getTechnicianPowerInfo({
      abilityName,
      movePower: weatherAdjustedPower
    });
    const pinchInfo = getPinchAbilityInfo({
      abilityName,
      moveType: effectiveMoveType,
      currentHp,
      maxHp
    });
    const totalMultiplier = technicianInfo.multiplier * pinchInfo.multiplier;
    if (totalMultiplier === 1) return weatherAdjustedPower;
    const labels = [];
    if (technicianInfo.active) labels.push('x' + technicianInfo.multiplier + ' ' + technicianInfo.abilityLabel);
    if (pinchInfo.active) labels.push('x' + pinchInfo.multiplier + ' ' + pinchInfo.abilityLabel);
    return Math.max(1, Math.floor(weatherAdjustedPower * totalMultiplier)) + ' (' + labels.join(', ') + ')';
  }

  async function applyPowerConstructEndTurn(options) {
    const {
      battleData,
      pass,
      pokemon,
      ownerData,
      maxHp,
      currentHpKey,
      teamKey
    } = options || {};
    if (!battleData || !pass || !pokemon) return '';

    const change = getPowerConstructFormChange({
      pokemonName: pokemon.name,
      abilityName: pokemon.ability,
      currentHp: battleData[currentHpKey],
      maxHp
    });
    if (!change.triggered || !pokestats[change.newPokemonName]) return '';

    const currentHp = Math.max(0, Number(battleData[currentHpKey]) || 0);
    const lostHp = Math.max(0, Number(maxHp || 0) - currentHp);
    if (!battleData.powerConstructOriginal || typeof battleData.powerConstructOriginal !== 'object') {
      battleData.powerConstructOriginal = {};
    }
    if (!battleData.powerConstructOriginal[String(pass)]) {
      battleData.powerConstructOriginal[String(pass)] = pokemon.name;
    }

    pokemon.name = change.newPokemonName;
    const level = plevel(pokemon.name, pokemon.exp);
    const newStats = await Stats(pokestats[pokemon.name], pokemon.ivs, pokemon.evs, c(pokemon.nature), level);
    const newMaxHp = Math.max(1, Number(newStats.hp) || 1);
    const newCurrentHp = Math.max(1, Math.min(newMaxHp, newMaxHp - lostHp));
    battleData[currentHpKey] = newCurrentHp;
    if (!battleData[teamKey] || typeof battleData[teamKey] !== 'object') battleData[teamKey] = {};
    battleData[teamKey][pass] = newCurrentHp;
    if (ownerData) {
      const idx = (ownerData.pokes || []).findIndex((entry) => String(entry.pass) === String(pass));
      if (idx >= 0) ownerData.pokes[idx].name = pokemon.name;
    }

    return '\n-> <b>' + c(change.newPokemonName) + '</b>\'s <b>Power Construct</b> activated!\n-> It transformed into <b>Zygarde Complete</b>!';
  }

  function revertPowerConstructFormsOnBattleEnd(battleData, userData) {
    if (!battleData || !battleData.powerConstructOriginal || !userData || !Array.isArray(userData.pokes)) return;
    for (const [pass, originalName] of Object.entries(battleData.powerConstructOriginal)) {
      const poke = userData.pokes.find((entry) => String(entry.pass) === String(pass));
      if (poke) {
        poke.name = originalName;
      }
    }
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
        poke.name = 'zygarde';
      }
    }
  }

  function ensureTurnAbilityState(battleData) {
    if (!battleData.turnAbilityState || typeof battleData.turnAbilityState !== 'object') {
      battleData.turnAbilityState = {};
    }
    if (!battleData.turnAbilityState.skipSpeedBoost || typeof battleData.turnAbilityState.skipSpeedBoost !== 'object') {
      battleData.turnAbilityState.skipSpeedBoost = {};
    }
    if (!battleData.turnAbilityState.failedEscape || typeof battleData.turnAbilityState.failedEscape !== 'object') {
      battleData.turnAbilityState.failedEscape = {};
    }
    return battleData.turnAbilityState;
  }

  function applyDefenderDamageWithSturdy(options) {
    const {
      battleData,
      damage,
      defenderAbility,
      defenderName,
      defenderMaxHp,
      moveName
    } = options;
    const shieldResult = applyShadowShieldReduction({
      abilityName: defenderAbility,
      currentHp: battleData.ohp,
      maxHp: defenderMaxHp,
      incomingDamage: damage,
      moveName,
      pokemonName: defenderName,
      c
    });
    const multiscaleResult = applyMultiscaleReduction({
      abilityName: defenderAbility,
      currentHp: battleData.ohp,
      maxHp: defenderMaxHp,
      incomingDamage: shieldResult.damage,
      pokemonName: defenderName,
      c
    });
    const sturdyResult = applySturdySurvival({
      abilityName: defenderAbility,
      currentHp: battleData.ohp,
      maxHp: defenderMaxHp,
      incomingDamage: multiscaleResult.damage,
      pokemonName: defenderName,
      c
    });
    const actualDamage = Math.min(Math.max(0, sturdyResult.damage), battleData.ohp);
    battleData.ohp = Math.max(battleData.ohp - actualDamage, 0);
    battleData.tem2[battleData.o] = Math.max((battleData.tem2[battleData.o] || 0) - actualDamage, 0);
    return {
      damage: actualDamage,
      message: shieldResult.message + multiscaleResult.message + sturdyResult.message,
      activated: shieldResult.activated || multiscaleResult.activated || sturdyResult.activated
    };
  }

  const NO_CONSECUTIVE_USE_MOVES = new Set([
    'blast burn',
    'eternabeam',
    'frenzy plant',
    'giga impact',
    'hydro cannon',
    'hyper beam',
    'meteor assault',
    'prismatic laser',
    'roar of time',
    'rock wrecker',
    'shadow half',
    'blood moon',
    'gigaton hammer'
  ]);

  const PERFECT_CRIT_MOVES = new Set([
    'flower trick',
    'frost breath',
    'storm throw',
    'surging strikes',
    'wicked blow',
    'zippy zap'
  ]);

  const HIGH_CRIT_RATIO_MOVES = new Set([
    '10,000,000 volt thunderbolt',
    '10 000 000 volt thunderbolt',
    '10000000 volt thunderbolt',
    'aeroblast',
    'air cutter',
    'aqua cutter',
    'attack order',
    'blaze kick',
    'crabhammer',
    'cross chop',
    'cross poison',
    'dire claw',
    'drill run',
    'esper wing',
    'ivy cudgel',
    'karate chop',
    'leaf blade',
    'night slash',
    'plasma fists',
    'poison tail',
    'psycho cut',
    'razor leaf',
    'razor wind',
    'shadow blast',
    'shadow claw',
    'sky attack',
    'slash',
    'snipe shot',
    'spacial rend',
    'stone edge',
    'triple arrows'
  ]);

  const CRIT_DAMAGE_MULTIPLIER = 1.5;
  const HIGH_CRIT_RATIO_CHANCE = 0.125;
  const OHKO_MOVES = new Set([
    'fissure',
    'guillotine',
    'horn drill',
    'sheer cold'
  ]);
  const MINIMIZE_PUNISH_MOVES = new Set([
    'astonish',
    'body slam',
    'double iron bash',
    'dragon rush',
    'extrasensory',
    'flying press',
    'heat crash',
    'heavy slam',
    'malicious moonsault',
    'needle arm',
    'phantom force',
    'shadow force',
    'steamroller',
    'stomp'
  ]);
  const MINIMIZE_PUNISH_MULTIPLIER = 2;
  const CHARGING_TURN_MOVES = new Set([
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
    'sky drop',
    'solar beam',
    'solar blade'
  ]);
  const CHARGE_START_STAT_MOVES = new Set(['electro shot', 'meteor beam', 'skull bash']);
  const SEMI_INVULNERABLE_CHARGE_MOVES = new Set([
    'bounce',
    'dig',
    'dive',
    'fly',
    'phantom force',
    'shadow force',
    'sky drop'
  ]);
  const CAN_HIT_SEMI_INVULNERABLE_MOVES = new Set([
    'bide',
    'earthquake',
    'fissure',
    'gust',
    'helping hand',
    'hurricane',
    'magnitude',
    'sky uppercut',
    'smack down',
    'surf',
    'swift',
    'thousand arrows',
    'thunder',
    'toxic',
    'twister',
    'whirlpool',
    'whirlwind'
  ]);

  const VARIABLE_MULTI_HIT_MOVES = new Set([
    'arm thrust',
    'barrage',
    'bone rush',
    'bullet seed',
    'comet punch',
    'double slap',
    'fury attack',
    'fury swipes',
    'icicle spear',
    'pin missile',
    'rock blast',
    'scale shot',
    'spike cannon',
    'tail slap',
    'water shuriken'
  ]);

  const FIXED_MULTI_HIT_MOVES = {
    'beat up': 2,
    'bonemerang': 2,
    'double hit': 2,
    'double iron bash': 2,
    'double kick': 2,
    'dragon darts': 2,
    'dual chop': 2,
    'dual wingbeat': 2,
    'gear grind': 2,
    'population bomb': 10,
    'surging strikes': 3,
    'tachyon cutter': 2,
    'triple axel': 3,
    'triple dive': 3,
    'triple kick': 3,
    'twin beam': 2,
    'twineedle': 2
  };

  function getMultiHitCount(moveName) {
    if (FIXED_MULTI_HIT_MOVES[moveName]) return FIXED_MULTI_HIT_MOVES[moveName];
    if (!VARIABLE_MULTI_HIT_MOVES.has(moveName)) return 1;

    // Gen V+ style weighted roll for 2-5 hit moves.
    const roll = Math.random();
    if (roll < 0.375) return 2;
    if (roll < 0.75) return 3;
    if (roll < 0.875) return 4;
    return 5;
  }

  function ensureBattleChargingState(battleData) {
    if (!battleData.chargingState || typeof battleData.chargingState !== 'object') {
      battleData.chargingState = {};
    }
    return battleData.chargingState;
  }

  function getChargingStateForPass(battleData, pass) {
    const all = ensureBattleChargingState(battleData);
    return all[String(pass)] || null;
  }

  function setChargingStateForPass(battleData, pass, moveId, moveName) {
    const all = ensureBattleChargingState(battleData);
    all[String(pass)] = { moveId: String(moveId), moveName: String(moveName || '') };
  }

  function clearChargingStateForPass(battleData, pass) {
    const all = ensureBattleChargingState(battleData);
    delete all[String(pass)];
  }

  function ensureSemiInvulnerableState(battleData) {
    if (!battleData.semiInvulnerableState || typeof battleData.semiInvulnerableState !== 'object') {
      battleData.semiInvulnerableState = {};
    }
    return battleData.semiInvulnerableState;
  }

  function getSemiInvulnerableStateForPass(battleData, pass) {
    const all = ensureSemiInvulnerableState(battleData);
    return all[String(pass)] || null;
  }

  function setSemiInvulnerableStateForPass(battleData, pass, moveName) {
    const all = ensureSemiInvulnerableState(battleData);
    all[String(pass)] = { moveName: String(moveName || '') };
  }

  function clearSemiInvulnerableStateForPass(battleData, pass) {
    const all = ensureSemiInvulnerableState(battleData);
    delete all[String(pass)];
  }

  function isSemiInvulnerableAvoidedMove(battleData, defenderPass, moveCategory, moveName) {
    const st = getSemiInvulnerableStateForPass(battleData, defenderPass);
    if (!st || !st.moveName) return false;
    if (CAN_HIT_SEMI_INVULNERABLE_MOVES.has(moveName)) return false;
    return String(moveCategory || '').toLowerCase() !== 'status';
  }

  function getChargingTurnMessage(pokemonName, moveName) {
    const byMove = {
      fly: 'flew up high!',
      bounce: 'sprang up high!',
      dig: 'dug underground!',
      dive: 'hid underwater!',
      'phantom force': 'vanished instantly!',
      'shadow force': 'vanished into the shadows!',
      'sky drop': 'took to the sky!'
    };
    const suffix = byMove[moveName] || 'began charging power!';
    return '\n-> <b>' + c(pokemonName) + '</b> ' + suffix;
  }

  function getSemiInvulnerableAvoidMessage(defenderName, moveName) {
    const byMove = {
      fly: 'is high in the sky',
      bounce: 'is high in the sky',
      dig: 'is underground',
      dive: 'is underwater',
      'phantom force': 'has vanished',
      'shadow force': 'has vanished',
      'sky drop': 'is airborne'
    };
    const where = byMove[moveName] || 'is semi-invulnerable';
    return '\n-> <b>' + c(defenderName) + '</b> avoided the attack because it ' + where + '!';
  }

  function getOhkoHitChance(attackerLevel, defenderLevel) {
    const chance = 30 + (Number(attackerLevel) - Number(defenderLevel));
    return Math.max(0, Math.min(100, chance));
  }

  function ensureBattleScreens(battleData) {
    if (!battleData.screens || typeof battleData.screens !== 'object') {
      battleData.screens = {};
    }
    return battleData.screens;
  }

  function ensureSideScreens(battleData, sideId) {
    const all = ensureBattleScreens(battleData);
    const key = String(sideId);
    if (!all[key] || typeof all[key] !== 'object') {
      all[key] = { reflect: 0, lightScreen: 0, auroraVeil: 0 };
    }
    const side = all[key];
    if (typeof side.reflect !== 'number') side.reflect = 0;
    if (typeof side.lightScreen !== 'number') side.lightScreen = 0;
    if (typeof side.auroraVeil !== 'number') side.auroraVeil = 0;
    return side;
  }

  function applyScreenSetupByMove(moveName, battleData, sideId, didHit) {
    const side = ensureSideScreens(battleData, sideId);
    if (moveName === 'reflect' || (moveName === 'baddy bad' && didHit)) {
      side.reflect = 5;
      return '\n-> Reflect went up on the user\'s side!';
    }
    if (moveName === 'light screen' || (moveName === 'glitzy glow' && didHit)) {
      side.lightScreen = 5;
      return '\n-> Light Screen went up on the user\'s side!';
    }
    if ((moveName === 'aurora veil' || (moveName === 'g max resonance' && didHit)) && canUseAuroraVeilWeather(battleData)) {
      side.auroraVeil = 5;
      return '\n-> Aurora Veil went up on the user\'s side!';
    }
    if (moveName === 'aurora veil' || moveName === 'g max resonance') {
      return '\n-> But Aurora Veil can only be set during hail or snow!';
    }
    return '';
  }

  function applyScreenRemovalByMove(moveName, battleData, defenderSideId, didHit) {
    const removers = new Set([
      'brick break',
      'defog',
      'g max wind rage',
      'psychic fangs',
      'raging bull',
      'shadow shed'
    ]);
    if (!didHit || !removers.has(moveName)) return '';
    const side = ensureSideScreens(battleData, defenderSideId);
    if (side.reflect <= 0 && side.lightScreen <= 0 && side.auroraVeil <= 0) return '';
    side.reflect = 0;
    side.lightScreen = 0;
    side.auroraVeil = 0;
    return '\n-> The opposing side\'s screens were shattered!';
  }

  function getScreenDamageMultiplier(battleData, defenderSideId, moveCategory, attackerAbility, moveName) {
    const side = ensureSideScreens(battleData, defenderSideId);
    const infiltratorInfo = getInfiltratorInfo({ abilityName: attackerAbility, moveName });
    if (infiltratorInfo.active && (side.auroraVeil > 0 || side.reflect > 0 || side.lightScreen > 0)) return 1;
    if (side.auroraVeil > 0) return 0.5;
    if (String(moveCategory || '').toLowerCase() === 'physical' && side.reflect > 0) return 0.5;
    if (String(moveCategory || '').toLowerCase() === 'special' && side.lightScreen > 0) return 0.5;
    return 1;
  }

  function getInfiltratorBypassMessage(battleData, defenderSideId, moveCategory, attackerAbility, attackerName, moveName) {
    const side = ensureSideScreens(battleData, defenderSideId);
    const infiltratorInfo = getInfiltratorInfo({ abilityName: attackerAbility, moveName });
    if (!infiltratorInfo.active) return '';
    const blockedByScreens =
      side.auroraVeil > 0 ||
      (String(moveCategory || '').toLowerCase() === 'physical' && side.reflect > 0) ||
      (String(moveCategory || '').toLowerCase() === 'special' && side.lightScreen > 0);
    if (!blockedByScreens) return '';
    return '\n-> <b>' + c(attackerName) + '</b>\'s <b>Infiltrator</b> activated!';
  }

  function tickScreensForTurn(battleData) {
    const all = ensureBattleScreens(battleData);
    for (const key of Object.keys(all)) {
      const side = ensureSideScreens(battleData, key);
      if (side.reflect > 0) side.reflect -= 1;
      if (side.lightScreen > 0) side.lightScreen -= 1;
      if (side.auroraVeil > 0) side.auroraVeil -= 1;
    }
  }

  function ensureBattleMinimizeState(battleData) {
    if (!battleData.minimized || typeof battleData.minimized !== 'object') {
      battleData.minimized = {};
    }
    return battleData.minimized;
  }

  function isPokemonMinimized(battleData, pass) {
    const all = ensureBattleMinimizeState(battleData);
    return all[String(pass)] === true;
  }

  function setPokemonMinimized(battleData, pass, value) {
    const all = ensureBattleMinimizeState(battleData);
    all[String(pass)] = !!value;
  }

  // Helper: build PvP battle message + keyboard with Showdown-style hidden moves
  const buildPvpMsg = (prefix, battleData, attacker, defender, p1, p2, stats1, stats2, bword, isGroup) => {
    const p1HeldItem = getBattleHeldItemName({ battleData, pass: p1.pass, heldItem: p1.held_item });
    const p2HeldItem = getBattleHeldItemName({ battleData, pass: p2.pass, heldItem: p2.held_item });
    const p1Types = getEffectivePokemonTypes({ pokemonName: p1.name, pokemonTypes: pokes[p1.name]?.types || [], heldItem: p1HeldItem, abilityName: p1.ability });
    const p2Types = getEffectivePokemonTypes({ pokemonName: p2.name, pokemonTypes: pokes[p2.name]?.types || [], heldItem: p2HeldItem, abilityName: p2.ability });
    const p1DisplayName = getEffectivePokemonDisplayName({ pokemonName: p1.name, abilityName: p1.ability, heldItem: p1HeldItem });
    const p2DisplayName = getEffectivePokemonDisplayName({ pokemonName: p2.name, abilityName: p2.ability, heldItem: p2HeldItem });
    const p1DynamaxState = getBattleDynamaxState(battleData, p1.pass);
    const p2DynamaxState = getBattleDynamaxState(battleData, p2.pass);
    const p1MaxHp = getBattleDisplayedMaxHp(battleData, p1, stats2.hp);
    const p2MaxHp = getBattleDisplayedMaxHp(battleData, p2, stats1.hp);
    const p1CurrentHp = normalizeDisplayedHp(battleData.chp, p1MaxHp);
    const p2CurrentHp = normalizeDisplayedHp(battleData.ohp, p2MaxHp);
    const p1TransformTag = p1DynamaxState ? (p1DynamaxState.isGmax ? ' <b>[Gigantamax]</b>' : ' <b>[Dynamax]</b>') : '';
    const p2TransformTag = p2DynamaxState ? (p2DynamaxState.isGmax ? ' <b>[Gigantamax]</b>' : ' <b>[Dynamax]</b>') : '';
    const hideTurn = battleData.switchLock && String(battleData.switchLock) === String(battleData.cid);
    const hideOpp = battleData.switchLock && String(battleData.switchLock) === String(battleData.oid);
    let msg = prefix || '';
    msg += '\n\n<b>Opponent :</b> <a href="tg://user?id='+battleData.oid+'"><b>'+displayName(defender,battleData.oid)+'</b></a>';
    if (hideOpp) {
      msg += '\n<b>???</b> [???]';
      msg += '\n<b>Level :</b> ?? | <b>HP :</b> ??/??';
      msg += '\n<code>??????????</code>';
    } else {
      msg += '\n<b>'+c(p2DisplayName)+'</b>'+p2TransformTag+' ['+c(p2Types.join(' / '))+']'+getStatusTag(battleData, battleData.o);
      msg += '\n<b>Level :</b> '+plevel(p2.name,p2.exp)+' | <b>HP :</b> '+p2CurrentHp+'/'+p2MaxHp+'';
      msg += '\n<code>'+Bar(p2MaxHp,p2CurrentHp)+'</code>';
      if (p2DynamaxState) {
        msg += '\n<b>Turns Left :</b> '+p2DynamaxState.turnsLeft;
      }
    }
    msg += '\n\n<b>Turn :</b> <a href="tg://user?id='+battleData.cid+'"><b>'+displayName(attacker,battleData.cid)+'</b></a>';
    if (hideTurn) {
      msg += '\n<b>???</b> [???]';
      msg += '\n<b>Level :</b> ?? | <b>HP :</b> ??/??';
      msg += '\n<code>??????????</code>';
    } else {
      msg += '\n<b>'+c(p1DisplayName)+'</b>'+p1TransformTag+' ['+c(p1Types.join(' / '))+']'+getStatusTag(battleData, battleData.c);
      msg += '\n<b>Level :</b> '+plevel(p1.name,p1.exp)+' | <b>HP :</b> '+p1CurrentHp+'/'+p1MaxHp+'';
      msg += '\n<code>'+Bar(p1MaxHp,p1CurrentHp)+'</code>';
      if (p1DynamaxState) {
        msg += '\n<b>Turns Left :</b> '+p1DynamaxState.turnsLeft;
      }
    }
    const weatherState = getDisplayedWeatherState(battleData);
    if (weatherState.weather) {
      msg += '\n<b>Weather :</b> '+getWeatherDisplayName(weatherState.weather);
      if ((battleData.weatherTurns || 0) > 0) {
        msg += ' ('+battleData.weatherTurns+' turns left)';
      }
      if (weatherState.negated) {
        msg += ' <i>(effects negated)</i>';
      }
    }

    // Revealed moves (moves already used - visible to everyone)
    const usedMoves = battleData.usedMoves || {};
    const p1UsedMoves = usedMoves[battleData.c] || [];
    const showAllMovesInGroup = !isGroup || battleData.tempBattle === true;
    if (showAllMovesInGroup && !hideTurn) {
      msg += '\n\n<b>Moves :</b>';
      for (const move2 of p1.moves) {
        let move = dmoves[move2];
        const shownPower = getDisplayedMovePower(move, p1.ability, battleData.chp, stats2.hp, battleData, p1.pass, p1.name);
        const shownType = getEffectiveMoveType({ battleData, pokemonName: p1.name, abilityName: p1.ability, heldItem: getBattleHeldItemName({ battleData, pass: p1.pass }), moveName: move.name, moveType: move.type }) || move.type;
        msg += '\n- <b>'+c(move.name)+'</b> ['+c(shownType)+' '+(emojis[shownType] || '')+']\n<b>Power:</b> '+shownPower+'<b>, Accuracy:</b> '+move.accuracy+' ('+c(move.category.charAt(0))+')';
      }
    } else if (isGroup && p1UsedMoves.length > 0 && !hideTurn) {
      msg += '\n\n<b>Revealed Moves :</b>';
      for (const mid of p1UsedMoves) {
        const mv = dmoves[mid];
        if (mv) {
          const displayMove = getDisplayedBattleMove({ battleData, pokemon: p1, move: mv, userData: attacker, userId: battleData.cid });
          const shownPower = getDisplayedMovePower(mv, p1.ability, battleData.chp, stats2.hp, battleData, p1.pass, p1.name);
          const shownType = getEffectiveMoveType({ battleData, pokemonName: p1.name, abilityName: p1.ability, heldItem: getBattleHeldItemName({ battleData, pass: p1.pass }), moveName: mv.name, moveType: mv.type }) || mv.type;
          msg += '\n- <b>'+c(mv.name)+'</b> ['+c(shownType)+' '+(emojis[shownType] || '')+'] <b>Power:</b> '+shownPower+' <b>Acc:</b> '+mv.accuracy+' ('+c(mv.category.charAt(0))+')';
        }
      }
    }

    let img = (pokes[p1.name] && pokes[p1.name].front_default_image) || '';
    const imSh = shiny.filter((poke)=>poke.name==p1.name)[0];
    if (events[p1.name] && p1.symbol == '🪅') img = events[p1.name];
    if (imSh && p1.symbol=='✨') img = imSh.shiny_url;

    let ext = {};
    ext = { link_preview_options: { is_disabled: true } };

    const moves = p1.moves.map(m => ''+m+'');
    let rows = [];
    // Row 1: 4 move buttons in a single row
    let moveButtons = [];
    if (showAllMovesInGroup) {
      moveButtons = moves.map((word) => ({ text: c(dmoves[word].name), callback_data: 'multimo_'+word+'_'+bword+'_'+battleData.cid+'' }));
    } else {
      // Showdown-style: 4 buttons where used moves show real name, unused show ???
      moveButtons = moves.map((word) => {
        const isRevealed = p1UsedMoves.includes(word);
        return { text: isRevealed ? c(dmoves[word].name) : '???', callback_data: 'multimo_'+word+'_'+bword+'_'+battleData.cid+'' };
      });
    }
    if (moveButtons.length < 1) {
      moveButtons.push({ text: 'No Moves', callback_data: 'empty' });
    }
    rows.push(moveButtons);

    // Row 2: 5 switch buttons (other alive pokes)
    const switchButtons = [];
    if (battleData.set.switch) {
      let idx = 1;
      for (const pass of Object.keys(battleData.tem || {})) {
        if (String(pass) === String(battleData.c)) continue;
        if ((battleData.tem[pass] || 0) > 0) {
          switchButtons.push({ text: String(idx), callback_data: 'multidne_' + pass + '_' + bword + '_' + battleData.cid + '_change' });
          idx++;
        }
        if (switchButtons.length >= 5) break;
      }
    }
    if (switchButtons.length > 0) {
      rows.push(switchButtons);
    }

    // Row 3: View Moves + Escape + View Team
    rows.push([
      { text: 'View Moves', callback_data: 'multivwmv_'+bword+'_'+battleData.cid+'' },
      { text: 'Escape', callback_data: 'multryn_'+bword+'_multi' },
      { text: 'View Team', callback_data: 'viewteam_'+bword+'_'+battleData.cid+'' }
    ]);

    if (!attacker.inv.stones) attacker.inv.stones = [];
    const isstone = [...new Set(attacker.inv.stones)].filter(stone => stones[stone]?.pokemon === p1.name && stone !== 'jade-orb');
    const isRayquazaWithDragonAscent = p1
      && String(p1.name || '').toLowerCase() === 'rayquaza'
      && pokemonKnowsMoveByName(p1, 'dragon ascent');
    if (!isRayquazaWithDragonAscent && battleData.set.key_item && isstone.length > 0 && attacker.extra && Object.keys(attacker.extra.megas||{}).length == 0 && (attacker.inv.omniring || attacker.inv.ring)) {
      const rows5 = isstone.map(i => ({text:'Use '+c(i)+'',callback_data:'megtst_'+i+'_'+bword+''}));
      rows.push(rows5);
    }
    const battleDynamaxUsed = ensureBattleDynamaxUsed(battleData);
    const canUseDynamax = hasBattleOmniRing(attacker)
      && !battleDynamaxUsed[String(battleData.cid)]
      && !p1DynamaxState
      && Object.keys(attacker.extra && attacker.extra.megas || {}).length === 0;
    const zMoveReady = !!ensureBattleZMoveReadyState(battleData)[String(battleData.cid)];
    const zMoveUsed = !!ensureBattleZMoveUsedState(battleData)[String(battleData.cid)];
    const canUseZMove = !zMoveUsed
      && !p1DynamaxState
      && (!attacker.extra || !attacker.extra.megas || Object.keys(attacker.extra.megas).length === 0)
      && canBattlePokemonUseAnyZMove({ battleData, userData: attacker, pokemon: p1 });
    if (canUseZMove) {
      rows.push([{ text: zMoveReady ? 'Z-Move Ready' : 'Z-Move', callback_data: 'zmovetst_' + bword }]);
    }
    if (canUseDynamax) {
      rows.push([{ text: isBattleGigantamaxPokemon(p1) ? 'Gigantamax' : 'Dynamax', callback_data: 'dyntst_' + bword }]);
    }

    // Bag/Pokemon buttons removed per new UI layout

    return { msg, keyboard: { inline_keyboard: rows }, ext };
  };

  // Helper to swap turns between cid and oid contexts
  function fullSwap(bd) {
    const cc = bd.c; const cc2 = bd.chp; const cc3 = bd.cid; const cc4 = bd.tem; const cc5 = bd.la;
    bd.c = bd.o; bd.chp = bd.ohp; bd.cid = bd.oid; bd.tem = bd.tem2; bd.la = bd.la2;
    bd.o = cc; bd.ohp = cc2; bd.oid = cc3; bd.tem2 = cc4; bd.la2 = cc5;
  }

  function getMovePriority(moveName, moveCategory, abilityName) {
    const name = String(moveName || '').toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
    const category = String(moveCategory || '').toLowerCase();
    const ability = normalizeAbilityName(abilityName);

    const PRIORITY_BY_MOVE = {
      // Increased priority moves
      'accelerock': 1,
      'ally switch': 2,
      'aqua jet': 1,
      'baby doll eyes': 1,
      'baneful bunker': 4,
      'bide': 1,
      'bullet punch': 1,
      'burning bulwark': 4,
      'crafty shield': 3,
      'detect': 4,
      'endure': 4,
      'extreme speed': 2,
      'fake out': 3,
      'feint': 2,
      'first impression': 2,
      'follow me': 2,
      'grassy glide': 1,
      'helping hand': 5,
      'ice shard': 1,
      'ion deluge': 1,
      'jet punch': 1,
      'king s shield': 4,
      'mach punch': 1,
      'magic coat': 4,
      'obstruct': 4,
      'powder': 1,
      'protect': 4,
      'quick attack': 1,
      'quick guard': 3,
      'rage powder': 2,
      'shadow sneak': 1,
      'silk trap': 4,
      'snatch': 4,
      'spiky shield': 4,
      'spotlight': 3,
      'sucker punch': 1,
      'thunderclap': 1,
      'upper hand': 3,
      'vacuum wave': 1,
      'water shuriken': 1,
      'wide guard': 3,
      'zippy zap': 2,

      // Decreased priority moves
      'avalanche': -4,
      'beak blast': -3,
      'circle throw': -6,
      'counter': -5,
      'dragon tail': -6,
      'focus punch': -3,
      'magic room': -7,
      'mirror coat': -5,
      'revenge': -4,
      'roar': -6,
      'shell trap': -3,
      'teleport': -6,
      'trick room': -7,
      'vital throw': -1,
      'whirlwind': -6,
      'wonder room': -7
    };

    const basePriority = PRIORITY_BY_MOVE[name] ?? 0;
    return basePriority + (ability === 'prankster' && category === 'status' ? 1 : 0);
  }

const DRAIN_MOVE_RATIOS = {
  'absorb': 0.5,
  'bitter blade': 0.5,
  'bouncy bubble': 0.5,
  'drain punch': 0.5,
  'giga drain': 0.5,
  'horn leech': 0.5,
  'leech life': 0.5,
  'matcha gotcha': 0.5,
  'mega drain': 0.5,
  'parabolic charge': 0.5,
  'draining kiss': 0.75,
  'dream eater': 0.5,
  'oblivion wing': 0.75
};

function getDrainRatio(moveName) {
  return DRAIN_MOVE_RATIOS[moveName] || 0;
}

const RECOIL_MOVE_RULES = {
  'brave bird': { ratio: 1 / 3 },
  'double edge': { ratio: 1 / 3 },
  'flare blitz': { ratio: 1 / 3 },
  'head charge': { ratio: 1 / 4 },
  'head smash': { ratio: 1 / 2 },
  'light of ruin': { ratio: 1 / 2 },
  'shadow end': { ratio: 1 / 2 },
  'shadow rush': { ratio: 1 / 4 },
  'struggle': { maxHpRatio: 1 / 4 },
  'submission': { ratio: 1 / 4 },
  'take down': { ratio: 1 / 4 },
  'volt tackle': { ratio: 1 / 3 },
  'wave crash': { ratio: 1 / 3 },
  'wild charge': { ratio: 1 / 4 },
  'wood hammer': { ratio: 1 / 3 }
};

function getRecoilDamage(moveName, damageDealt, attackerMaxHp) {
  const rule = RECOIL_MOVE_RULES[moveName];
  if (!rule) return 0;
  if (rule.maxHpRatio) return Math.max(1, Math.floor(attackerMaxHp * rule.maxHpRatio));
  if (damageDealt > 0 && rule.ratio) return Math.max(1, Math.floor(damageDealt * rule.ratio));
  return 0;
}

const CRASH_DAMAGE_MOVES = new Set([
  'axe kick',
  'high jump kick',
  'jump kick',
  'supercell slam'
]);

function getCrashDamage(moveName, attackerMaxHp) {
  if (!CRASH_DAMAGE_MOVES.has(moveName)) return 0;
  return Math.max(1, Math.floor(attackerMaxHp / 2));
}

const SELF_FAINT_MOVES = new Set([
  'explosion',
  'final gambit',
  'healing wish',
  'lunar dance',
  'memento',
  'misty explosion',
  'self destruct'
]);

function applySelfFaintAfterMove(moveName, moveLabel, battleData, attackerPass, attackerName) {
  if (!SELF_FAINT_MOVES.has(moveName)) return '';
  const selfBefore = Math.max(0, battleData.chp || 0);
  if (selfBefore <= 0) return '';
  battleData.chp = 0;
  if (!battleData.tem || typeof battleData.tem !== 'object') battleData.tem = {};
  battleData.tem[attackerPass] = 0;
  return '\n-> <b>'+c(attackerName)+'</b> fainted after using <b>'+c(moveLabel)+'</b>!';
}

function ensureEntryHazards(battleData) {
  if (!battleData.entryHazards || typeof battleData.entryHazards !== 'object') {
    battleData.entryHazards = {};
  }
  return battleData.entryHazards;
}

function ensureSideEntryHazards(battleData, sideId) {
  const all = ensureEntryHazards(battleData);
  const key = String(sideId);
  if (!all[key] || typeof all[key] !== 'object') {
    all[key] = { spikes: 0, toxicSpikes: 0, stealthRock: false, stickyWeb: false, steelSurge: false };
  }
  const side = all[key];
  if (typeof side.spikes !== 'number') side.spikes = 0;
  if (typeof side.toxicSpikes !== 'number') side.toxicSpikes = 0;
  if (typeof side.stealthRock !== 'boolean') side.stealthRock = false;
  if (typeof side.stickyWeb !== 'boolean') side.stickyWeb = false;
  if (typeof side.steelSurge !== 'boolean') side.steelSurge = false;
  return side;
}

function clearSideEntryHazards(battleData, sideId) {
  const side = ensureSideEntryHazards(battleData, sideId);
  const hadAny = side.spikes > 0 || side.toxicSpikes > 0 || side.stealthRock || side.stickyWeb || side.steelSurge;
  side.spikes = 0;
  side.toxicSpikes = 0;
  side.stealthRock = false;
  side.stickyWeb = false;
  side.steelSurge = false;
  return hadAny;
}

function applyEntryHazardSetupByMove(moveName, battleData, targetSideId, didHit) {
  if (!didHit) return '';
  const side = ensureSideEntryHazards(battleData, targetSideId);

  if (moveName === 'spikes' || moveName === 'ceaseless edge') {
    if (side.spikes >= 3) return '\n-> But Spikes cannot be stacked further!';
    side.spikes += 1;
    return '\n-> Spikes were scattered on the opposing side! (Layer ' + side.spikes + '/3)';
  }
  if (moveName === 'toxic spikes') {
    if (side.toxicSpikes >= 2) return '\n-> But Toxic Spikes cannot be stacked further!';
    side.toxicSpikes += 1;
    return '\n-> Toxic Spikes were scattered on the opposing side! (Layer ' + side.toxicSpikes + '/2)';
  }
  if (moveName === 'stealth rock' || moveName === 'stone axe' || moveName === 'g max stonesurge') {
    if (side.stealthRock) return '\n-> But pointed stones are already surrounding the opposing side!';
    side.stealthRock = true;
    return '\n-> Pointed stones float around the opposing side!';
  }
  if (moveName === 'g max steelsurge') {
    if (side.steelSurge) return '\n-> But metal spikes are already surrounding the opposing side!';
    side.steelSurge = true;
    return '\n-> Metal spikes now surround the opposing side!';
  }
  if (moveName === 'sticky web') {
    if (side.stickyWeb) return '\n-> But a Sticky Web is already on the opposing side!';
    side.stickyWeb = true;
    return '\n-> A Sticky Web was laid out on the opposing side!';
  }

  return '';
}

function applyEntryHazardRemovalByMove(moveName, battleData, selfSideId, opposingSideId, didHit) {
  if (moveName === 'defog') {
    const removedSelf = clearSideEntryHazards(battleData, selfSideId);
    const removedOpp = clearSideEntryHazards(battleData, opposingSideId);
    return (removedSelf || removedOpp) ? '\n-> Defog blew away all entry hazards from both sides!' : '';
  }

  if (!didHit) return '';

  if (moveName === 'g max wind rage') {
    const removedSelf = clearSideEntryHazards(battleData, selfSideId);
    const removedOpp = clearSideEntryHazards(battleData, opposingSideId);
    return (removedSelf || removedOpp) ? '\n-> G-Max Wind Rage removed all entry hazards from both sides!' : '';
  }
  if (moveName === 'rapid spin' || moveName === 'mortal spin' || moveName === 'tidy up') {
    const removedSelf = clearSideEntryHazards(battleData, selfSideId);
    return removedSelf ? '\n-> Entry hazards on your side were cleared!' : '';
  }

  return '';
}

  function isGroundedForEntryHazards(battleData, pass, pokemonName, abilityName, heldItem) {
    const types = getEffectivePokemonTypes({
      pokemonName,
      pokemonTypes: pokes[pokemonName]?.types || [],
      heldItem: getBattleHeldItemName({ battleData, pass, heldItem })
    });
    const levitateInfo = getLevitateInfo({ abilityName });
    const airBalloonInfo = getAirBalloonInfo({ battleData, pass, heldItem });
    return !types.includes('flying') && !levitateInfo.active && !airBalloonInfo.active;
  }

async function applyEntryHazardsOnSwitch({ battleData, sideId, pass, pokemonName, abilityName, maxHp }) {
  const side = ensureSideEntryHazards(battleData, sideId);
  let out = '';
  let currentHp = Math.max(0, battleData.chp);
  const types = getEffectivePokemonTypes({
    pokemonName,
    pokemonTypes: pokes[pokemonName]?.types || [],
    heldItem: getBattleHeldItemName({ battleData, pass })
  });
  const type1 = types[0] ? c(types[0]) : null;
  const type2 = types[1] ? c(types[1]) : null;
  const grounded = isGroundedForEntryHazards(battleData, pass, pokemonName, abilityName, getBattleHeldItemName({ battleData, pass }));

  const applyLoss = (raw, label) => {
    if (!raw || raw <= 0 || currentHp <= 0) return;
    const taken = Math.min(raw, currentHp);
    currentHp = Math.max(0, currentHp - taken);
    out += '\n-> <b>' + c(pokemonName) + '</b> was hurt by ' + label + ' and lost <code>' + taken + '</code> HP!';
  };

  if (side.stealthRock && type1) {
    const effRock = await eff('Rock', type1, type2);
    if (effRock > 0) applyLoss(Math.max(1, Math.floor((maxHp / 8) * effRock)), 'Stealth Rock');
  }

  if (side.steelSurge && type1) {
    const effSteel = await eff('Steel', type1, type2);
    if (effSteel > 0) applyLoss(Math.max(1, Math.floor((maxHp / 8) * effSteel)), 'Steel Surge');
  }

  if (grounded && side.spikes > 0) {
    const spikeRatio = side.spikes >= 3 ? 1 / 4 : side.spikes === 2 ? 1 / 6 : 1 / 8;
    applyLoss(Math.max(1, Math.floor(maxHp * spikeRatio)), 'Spikes');
  }

  if (grounded && side.stickyWeb && currentHp > 0) {
    const stickyWebApplied = applyStageChanges({
      battleData,
      pass,
      pokemonName,
      abilityName,
      changes: [{ stat: 'speed', delta: -1 }],
      c,
      fromOpponent: true
    });
    if (stickyWebApplied.deltas.some((entry) => entry && entry.delta < 0)) {
      out += '\n-> <b>' + c(pokemonName) + '</b> got caught in Sticky Web and its <b>Speed</b> fell!';
    } else {
      out += stickyWebApplied.message;
    }
  }

  if (grounded && side.toxicSpikes > 0 && currentHp > 0) {
    const loweredTypes = types.map((t) => String(t).toLowerCase());
    if (loweredTypes.includes('poison')) {
      side.toxicSpikes = 0;
      out += '\n-> <b>' + c(pokemonName) + '</b> absorbed the Toxic Spikes!';
    } else {
      const existingStatus = getBattleStatus(battleData, pass);
      if (!existingStatus && !isStatusImmune('poison', types)) {
        const toxStatus = side.toxicSpikes >= 2 ? 'badly_poisoned' : 'poison';
        setBattleStatus(battleData, pass, toxStatus);
        out += '\n-> <b>' + c(pokemonName) + '</b> was ' + (toxStatus === 'badly_poisoned' ? 'badly poisoned' : 'poisoned') + ' by Toxic Spikes!';
      }
    }
  }

  battleData.chp = currentHp;
  if (!battleData.tem) battleData.tem = {};
  battleData.tem[pass] = currentHp;
  return out;
}

const STAT_KEYS = ['attack', 'defense', 'special_attack', 'special_defense', 'speed', 'accuracy', 'evasion'];

const MOVE_STAT_EFFECTS = {
  'growl': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'aurora beam': [{ target: 'target', stat: 'attack', stages: -1, chance: 0.1 }],
  'baby doll eyes': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'bitter malice': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'breaking swipe': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'charm': [{ target: 'target', stat: 'attack', stages: -2, chance: 1 }],
  'chilling water': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'feather dance': [{ target: 'target', stat: 'attack', stages: -2, chance: 1 }],
  'lunge': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'max wyrmwind': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'memento': [{ target: 'target', stat: 'attack', stages: -2, chance: 1 }, { target: 'target', stat: 'special_attack', stages: -2, chance: 1 }],
  'noble roar': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }, { target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'parting shot': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }, { target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'captivate': [{ target: 'target', stat: 'special_attack', stages: -2, chance: 1 }],
  'confide': [{ target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'eerie impulse': [{ target: 'target', stat: 'special_attack', stages: -2, chance: 1 }],
  'max flutterby': [{ target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'play nice': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'play rough': [{ target: 'target', stat: 'attack', stages: -1, chance: 0.1 }],
  'springtide storm': [{ target: 'target', stat: 'attack', stages: -1, chance: 0.3 }],
  'strength sap': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'mist ball': [{ target: 'target', stat: 'special_attack', stages: -1, chance: 0.5 }],
  'tearful look': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }, { target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'tickle': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }, { target: 'target', stat: 'defense', stages: -1, chance: 1 }],
  'trop kick': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'venom drench': [
    { target: 'target', stat: 'attack', stages: -1, chance: 1, whenTargetStatusIn: ['poison', 'badly_poisoned'] },
    { target: 'target', stat: 'special_attack', stages: -1, chance: 1, whenTargetStatusIn: ['poison', 'badly_poisoned'] },
    { target: 'target', stat: 'speed', stages: -1, chance: 1, whenTargetStatusIn: ['poison', 'badly_poisoned'] }
  ],
  'tail whip': [{ target: 'target', stat: 'defense', stages: -1, chance: 1 }],
  'leer': [{ target: 'target', stat: 'defense', stages: -1, chance: 1 }],
  'screech': [{ target: 'target', stat: 'defense', stages: -2, chance: 1 }],
  'acid': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.1 }],
  'crunch': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.2 }],
  'crush claw': [{ target: 'target', stat: 'defense', stages: -1, chance: 0.5 }],
  'fire lash': [{ target: 'target', stat: 'defense', stages: -1, chance: 1 }],
  'grav apple': [{ target: 'target', stat: 'defense', stages: -1, chance: 1 }],
  'iron tail': [{ target: 'target', stat: 'defense', stages: -1, chance: 0.3 }],
  'liquidation': [{ target: 'target', stat: 'defense', stages: -1, chance: 0.2 }],
  'max phantasm': [{ target: 'target', stat: 'defense', stages: -1, chance: 1 }],
  'octolock': [{ target: 'target', stat: 'defense', stages: -1, chance: 1 }, { target: 'target', stat: 'special_defense', stages: -1, chance: 1 }],
  'razor shell': [{ target: 'target', stat: 'defense', stages: -1, chance: 0.5 }],
  'rock smash': [{ target: 'target', stat: 'defense', stages: -1, chance: 0.5 }],
  'shadow bone': [{ target: 'target', stat: 'defense', stages: -1, chance: 0.2 }],
  'shadow down': [{ target: 'target', stat: 'defense', stages: -1, chance: 1 }],
  'spicy extract': [{ target: 'target', stat: 'attack', stages: 2, chance: 1 }, { target: 'target', stat: 'defense', stages: -2, chance: 1 }],
  'thunderous kick': [{ target: 'target', stat: 'defense', stages: -1, chance: 1 }],
  'triple arrows': [{ target: 'target', stat: 'defense', stages: -1, chance: 0.5 }],
  'metal sound': [{ target: 'target', stat: 'special_defense', stages: -2, chance: 1 }],
  'fake tears': [{ target: 'target', stat: 'special_defense', stages: -2, chance: 1 }],
  'acid spray': [{ target: 'target', stat: 'special_defense', stages: -2, chance: 1 }],
  'apple acid': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 1 }],
  'psychic': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.1 }],
  'shadow ball': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.2 }],
  'bug buzz': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.1 }],
  'earth power': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.1 }],
  'energy ball': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.1 }],
  'flash cannon': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.1 }],
  'focus blast': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.1 }],
  'lumina crash': [{ target: 'target', stat: 'special_defense', stages: -2, chance: 1 }],
  'luster purge': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.5 }],
  'max darkness': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 1 }],
  'seed flare': [{ target: 'target', stat: 'special_defense', stages: -2, chance: 0.4 }],
  'snarl': [{ target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'skitter smack': [{ target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'spirit break': [{ target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'struggle bug': [{ target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'mystical fire': [{ target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'moonblast': [{ target: 'target', stat: 'special_attack', stages: -1, chance: 0.3 }],
  'string shot': [{ target: 'target', stat: 'speed', stages: -2, chance: 1 }],
  'bleakwind storm': [{ target: 'target', stat: 'speed', stages: -1, chance: 0.3 }],
  'scary face': [{ target: 'target', stat: 'speed', stages: -2, chance: 1 }],
  'constrict': [{ target: 'target', stat: 'speed', stages: -1, chance: 0.1 }],
  'cotton spore': [{ target: 'target', stat: 'speed', stages: -2, chance: 1 }],
  'drum beating': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'icy wind': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'glaciate': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'electroweb': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'g max foam burst': [{ target: 'target', stat: 'speed', stages: -2, chance: 1 }],
  'bulldoze': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'max strike': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'mud shot': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'pounce': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'rock tomb': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'low sweep': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'bubble': [{ target: 'target', stat: 'speed', stages: -1, chance: 0.1 }],
  'bubble beam': [{ target: 'target', stat: 'speed', stages: -1, chance: 0.1 }],
  'silk trap': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'sticky web': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'syrup bomb': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'tar shot': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'toxic thread': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'sand attack': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 1 }],
  'smokescreen': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 1 }],
  'kinesis': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 1 }],
  'flash': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 1 }],
  'mud slap': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 1 }],
  'leaf tornado': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 0.5 }],
  'mirror shot': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 0.3 }],
  'mud bomb': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 0.3 }],
  'muddy water': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 0.3 }],
  'night daze': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 0.4 }],
  'octazooka': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 0.5 }],
  'secret power': [{ target: 'target', randomFrom: ['attack', 'defense', 'special_attack', 'accuracy', 'speed'], stages: -1, chance: 0.3 }],
  'sweet scent': [{ target: 'target', stat: 'evasion', stages: -1, chance: 1 }],
  'defog': [{ target: 'target', stat: 'evasion', stages: -1, chance: 1 }],
  'g max tartness': [{ target: 'target', stat: 'evasion', stages: -1, chance: 1 }],
  'shadow mist': [{ target: 'target', stat: 'evasion', stages: -1, chance: 1 }],
  'swords dance': [{ target: 'self', stat: 'attack', stages: 2, chance: 1 }],
  'howl': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }],
  'meditate': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }],
  'sharpen': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }],
  'bulk up': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'defense', stages: 1, chance: 1 }],
  'dragon dance': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'acupressure': [{ target: 'self', randomStat: true, stages: 2, chance: 1 }],
  'coil': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'defense', stages: 1, chance: 1 }, { target: 'self', stat: 'accuracy', stages: 1, chance: 1 }],
  'gravity': [],
  'work up': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'special_attack', stages: 1, chance: 1 }],
  'growth': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'special_attack', stages: 1, chance: 1 }],
  'shift gear': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'speed', stages: 2, chance: 1 }],
  'harden': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }],
  'withdraw': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }],
  'defense curl': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }],
  'iron defense': [{ target: 'self', stat: 'defense', stages: 2, chance: 1 }],
  'acid armor': [{ target: 'self', stat: 'defense', stages: 2, chance: 1 }],
  'cotton guard': [{ target: 'self', stat: 'defense', stages: 3, chance: 1 }],
  'cosmic power': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: 1, chance: 1 }],
  'nasty plot': [{ target: 'self', stat: 'special_attack', stages: 2, chance: 1 }],
  'calm mind': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: 1, chance: 1 }],
  'tail glow': [{ target: 'self', stat: 'special_attack', stages: 3, chance: 1 }],
  'charge beam': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 0.7 }],
  'fiery dance': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 0.5 }],
  'electro shot': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 1 }],
  'geomancy': [{ target: 'self', stat: 'special_attack', stages: 2, chance: 1 }, { target: 'self', stat: 'special_defense', stages: 2, chance: 1 }, { target: 'self', stat: 'speed', stages: 2, chance: 1 }],
  'max ooze': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 1 }],
  'meteor beam': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 1 }],
  'mystical power': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 1 }],
  'take heart': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: 1, chance: 1 }],
  'torch song': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 1 }],
  'amnesia': [{ target: 'self', stat: 'special_defense', stages: 2, chance: 1 }],
  'aromatic mist': [{ target: 'self', stat: 'special_defense', stages: 1, chance: 1 }],
  'charge': [{ target: 'self', stat: 'special_defense', stages: 1, chance: 1 }],
  'max quake': [{ target: 'self', stat: 'special_defense', stages: 1, chance: 1 }],
  'quiver dance': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: 1, chance: 1 }, { target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'agility': [{ target: 'self', stat: 'speed', stages: 2, chance: 1 }],
  'rock polish': [{ target: 'self', stat: 'speed', stages: 2, chance: 1 }],
  'autotomize': [{ target: 'self', stat: 'speed', stages: 2, chance: 1 }],
  'flame charge': [{ target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'aqua step': [{ target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'aura wheel': [{ target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'esper wing': [{ target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'max airstream': [{ target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'rapid spin': [{ target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'trailblaze': [{ target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'double team': [{ target: 'self', stat: 'evasion', stages: 1, chance: 1 }],
  'minimize': [{ target: 'self', stat: 'evasion', stages: 2, chance: 1 }],
  'hone claws': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'accuracy', stages: 1, chance: 1 }],
  'close combat': [{ target: 'self', stat: 'defense', stages: -1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: -1, chance: 1 }],
  'armor cannon': [{ target: 'self', stat: 'defense', stages: -1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: -1, chance: 1 }],
  'clanging scales': [{ target: 'self', stat: 'defense', stages: -1, chance: 1 }],
  'dragon ascent': [{ target: 'self', stat: 'defense', stages: -1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: -1, chance: 1 }],
  'headlong rush': [{ target: 'self', stat: 'defense', stages: -1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: -1, chance: 1 }],
  'hyperspace fury': [{ target: 'self', stat: 'defense', stages: -1, chance: 1 }],
  'scale shot': [{ target: 'self', stat: 'defense', stages: -1, chance: 1 }, { target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'superpower': [{ target: 'self', stat: 'attack', stages: -1, chance: 1 }, { target: 'self', stat: 'defense', stages: -1, chance: 1 }],
  'tera blast': [{ target: 'self', statByMoveCategory: { physical: 'attack', special: 'special_attack' }, stages: -1, chance: 1 }],
  'hammer arm': [{ target: 'self', stat: 'speed', stages: -1, chance: 1 }],
  'ice hammer': [{ target: 'self', stat: 'speed', stages: -1, chance: 1 }],
  'spin out': [{ target: 'self', stat: 'speed', stages: -2, chance: 1 }],
  'curse': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'defense', stages: 1, chance: 1 }, { target: 'self', stat: 'speed', stages: -1, chance: 1 }],
  'v create': [{ target: 'self', stat: 'defense', stages: -1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: -1, chance: 1 }, { target: 'self', stat: 'speed', stages: -1, chance: 1 }],
  'overheat': [{ target: 'self', stat: 'special_attack', stages: -2, chance: 1 }],
  'make it rain': [{ target: 'self', stat: 'special_attack', stages: -1, chance: 1 }],
  'leaf storm': [{ target: 'self', stat: 'special_attack', stages: -2, chance: 1 }],
  'draco meteor': [{ target: 'self', stat: 'special_attack', stages: -2, chance: 1 }],
  'psycho boost': [{ target: 'self', stat: 'special_attack', stages: -2, chance: 1 }],
  'fleur cannon': [{ target: 'self', stat: 'special_attack', stages: -2, chance: 1 }],
  'shell smash': [
    { target: 'self', stat: 'attack', stages: 2, chance: 1 },
    { target: 'self', stat: 'special_attack', stages: 2, chance: 1 },
    { target: 'self', stat: 'speed', stages: 2, chance: 1 },
    { target: 'self', stat: 'defense', stages: -1, chance: 1 },
    { target: 'self', stat: 'special_defense', stages: -1, chance: 1 }
  ],
  // All-or-nothing 10% all-stats boost
  'ancient power': [
    { target: 'self', stat: 'attack', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'defense', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'special_attack', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'special_defense', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'speed', stages: 1, chance: 0.1, chanceGroup: 'A' }
  ],
  'silver wind': [
    { target: 'self', stat: 'attack', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'defense', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'special_attack', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'special_defense', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'speed', stages: 1, chance: 0.1, chanceGroup: 'A' }
  ],
  'ominous wind': [
    { target: 'self', stat: 'attack', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'defense', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'special_attack', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'special_defense', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'speed', stages: 1, chance: 0.1, chanceGroup: 'A' }
  ],
  // Guaranteed all-stats boosts
  'clangorous soulblaze': [
    { target: 'self', stat: 'attack', stages: 1, chance: 1 },
    { target: 'self', stat: 'defense', stages: 1, chance: 1 },
    { target: 'self', stat: 'special_attack', stages: 1, chance: 1 },
    { target: 'self', stat: 'special_defense', stages: 1, chance: 1 },
    { target: 'self', stat: 'speed', stages: 1, chance: 1 }
  ],
  'extreme evoboost': [
    { target: 'self', stat: 'attack', stages: 2, chance: 1 },
    { target: 'self', stat: 'defense', stages: 2, chance: 1 },
    { target: 'self', stat: 'special_attack', stages: 2, chance: 1 },
    { target: 'self', stat: 'special_defense', stages: 2, chance: 1 },
    { target: 'self', stat: 'speed', stages: 2, chance: 1 }
  ],
  'no retreat': [
    { target: 'self', stat: 'attack', stages: 1, chance: 1 },
    { target: 'self', stat: 'defense', stages: 1, chance: 1 },
    { target: 'self', stat: 'special_attack', stages: 1, chance: 1 },
    { target: 'self', stat: 'special_defense', stages: 1, chance: 1 },
    { target: 'self', stat: 'speed', stages: 1, chance: 1 }
  ],
  // Single/partial attack boosts
  'max knuckle': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }],
  'metal claw': [{ target: 'self', stat: 'attack', stages: 1, chance: 0.1 }],
  'meteor mash': [{ target: 'self', stat: 'attack', stages: 1, chance: 0.2 }],
  'order up': [{ target: 'self', randomFrom: ['attack', 'defense', 'special_attack'], stages: 1, chance: 1 }],
  'power-up punch': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }],
  'rage': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }],
  'tidy up': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'victory dance': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'defense', stages: 1, chance: 1 }, { target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  // HP-cost boosts: handled specially in executeStandardMove
  'belly drum': [],
  'clangorous soul': [],
  'fillet away': [],
  // Post-KO boost: handled specially in executeStandardMove
  'fell stinger': [],
  // Raise user defense
  'barrier': [{ target: 'self', stat: 'defense', stages: 2, chance: 1 }],
  'defend order': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: 1, chance: 1 }],
  'diamond storm': [{ target: 'self', stat: 'defense', stages: 2, chance: 0.5 }],
  'flower shield': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }],
  'max steelspike': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }],
  'psyshield bash': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }],
  'shelter': [{ target: 'self', stat: 'defense', stages: 2, chance: 1 }],
  'skull bash': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }],
  'steel wing': [{ target: 'self', stat: 'defense', stages: 1, chance: 0.1 }],
  'stockpile': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: 1, chance: 1 }],
  'stuff cheeks': [{ target: 'self', stat: 'defense', stages: 2, chance: 1 }]
};


function ensureBattleStatStages(battleData) {
  if (!battleData.statStages || typeof battleData.statStages !== 'object') {
    battleData.statStages = {};
  }
  return battleData.statStages;
}

function ensurePokemonStatStages(battleData, pass) {
  const all = ensureBattleStatStages(battleData);
  if (!all[pass] || typeof all[pass] !== 'object') {
    all[pass] = { attack: 0, defense: 0, special_attack: 0, special_defense: 0, speed: 0, accuracy: 0, evasion: 0 };
  }
  const keys = ['attack', 'defense', 'special_attack', 'special_defense', 'speed', 'accuracy', 'evasion'];
  for (const key of keys) {
    if (typeof all[pass][key] !== 'number') all[pass][key] = 0;
  }
  return all[pass];
}

function getStageMultiplier(stage) {
  if (stage >= 0) return (2 + stage) / 2;
  return 2 / (2 - stage);
}

function applyStageToStat(baseValue, stage) {
  return Math.max(1, Math.floor(baseValue * getStageMultiplier(stage)));
}

function getEffectiveSpeed(baseSpeed, battleData, pass, abilityName) {
  const statusAdjusted = getSpeedWithStatus(baseSpeed, battleData, pass);
  const stages = ensurePokemonStatStages(battleData, pass);
  let speed = applyStageToStat(statusAdjusted, stages.speed);
  const heldItemInfo = getHeldItemStatMultipliers({
    heldItem: getBattleHeldItemName({ battleData, pass })
  });
  speed = Math.max(1, Math.floor(speed * (heldItemInfo.speed || 1)));
  if (getEffectiveWeatherName(battleData) === 'snow' && normalizeAbilityName(abilityName) === 'slush-rush') {
    speed = Math.max(1, Math.floor(speed * 2));
  }
  return speed;
}

function getModifiedAccuracy(baseAccuracy, attackerAccuracyStage, defenderEvasionStage, battleData, defenderAbility) {
  const netStage = (attackerAccuracyStage || 0) - (defenderEvasionStage || 0);
  const acc = Math.floor(baseAccuracy * getStageMultiplier(netStage) * getWeatherAccuracyMultiplierForTarget({ battleData, abilityName: defenderAbility }));
  return Math.max(1, Math.min(100, acc));
}

function clampStage(stage) {
  return Math.max(-6, Math.min(6, stage));
}

function getStageVerb(delta) {
  const mag = Math.abs(delta);
  if (delta > 0) {
    if (mag >= 3) return 'rose drastically';
    if (mag === 2) return 'rose sharply';
    return 'rose';
  }
  if (mag >= 3) return 'fell drastically';
  if (mag === 2) return 'fell harshly';
  return 'fell';
}

function getStatLabel(stat) {
  if (stat === 'special_attack') return 'Special Attack';
  if (stat === 'special_defense') return 'Special Defense';
  return c(stat);
}

function expandEffectStats(effect) {
  if (effect.stat === 'special') return ['special_attack', 'special_defense'];
  return [effect.stat];
}

function applyMoveStatEffects({ battleData, moveName, moveCategory, attackerName, defenderName, attackerPass, defenderPass, attackerAbility, defenderAbility, targetAlive }) {
  const effects = MOVE_STAT_EFFECTS[moveName] || [];
  const resolvedMoveCategory = String(moveCategory || '').toLowerCase();
  if (!effects.length) return '';

  const resolvedChanceGroups = {};
  for (const effect of effects) {
    if (effect.chanceGroup !== undefined && !(effect.chanceGroup in resolvedChanceGroups)) {
      resolvedChanceGroups[effect.chanceGroup] = Math.random() <= (effect.chance ?? 1);
    }
  }

  let out = '';
  let pendingBatch = null;

  function flushPendingBatch() {
    if (!pendingBatch || !pendingBatch.changes || pendingBatch.changes.length < 1) return;
    out += applyStageChanges({
      battleData,
      pass: pendingBatch.targetPass,
      pokemonName: pendingBatch.targetName,
      abilityName: pendingBatch.targetAbility,
      changes: pendingBatch.changes,
      c,
      fromOpponent: pendingBatch.fromOpponent
    }).message;
    pendingBatch = null;
  }

  for (const effect of effects) {
    if (effect.chanceGroup !== undefined) {
      if (!resolvedChanceGroups[effect.chanceGroup]) continue;
    } else {
      if (Math.random() > (effect.chance ?? 1)) continue;
    }
    if (effect.target === 'target' && !targetAlive) continue;
    if (effect.target === 'target' && Array.isArray(effect.whenTargetStatusIn) && effect.whenTargetStatusIn.length > 0) {
      const tStatus = getBattleStatus(battleData, defenderPass);
      if (!tStatus || !effect.whenTargetStatusIn.includes(tStatus)) continue;
    }

    const targetPass = effect.target === 'self' ? attackerPass : defenderPass;
    const targetName = effect.target === 'self' ? attackerName : defenderName;
    const targetAbility = effect.target === 'self' ? attackerAbility : defenderAbility;
    const stages = ensurePokemonStatStages(battleData, targetPass);

    if (effect.randomStat) {
      flushPendingBatch();
      const allStats = ['attack', 'defense', 'special_attack', 'special_defense', 'speed', 'accuracy', 'evasion'];
      const eligible = allStats.filter(s => (stages[s] || 0) < 6);
      if (eligible.length > 0) {
        const statKey = eligible[Math.floor(Math.random() * eligible.length)];
        out += applyStageChanges({
          battleData,
          pass: targetPass,
          pokemonName: targetName,
          abilityName: targetAbility,
          changes: [{ stat: statKey, delta: effect.stages }],
          c,
          fromOpponent: effect.target === 'target'
        }).message;
      }
      continue;
    }

    if (effect.randomFrom) {
      flushPendingBatch();
      const increasing = (effect.stages || 0) >= 0;
      const pool = effect.randomFrom.filter(s => increasing ? (stages[s] || 0) < 6 : (stages[s] || 0) > -6);
      if (pool.length > 0) {
        const statKey = pool[Math.floor(Math.random() * pool.length)];
        out += applyStageChanges({
          battleData,
          pass: targetPass,
          pokemonName: targetName,
          abilityName: targetAbility,
          changes: [{ stat: statKey, delta: effect.stages }],
          c,
          fromOpponent: effect.target === 'target'
        }).message;
      }
      continue;
    }

    const effectStats = effect.statByMoveCategory ? [effect.statByMoveCategory[resolvedMoveCategory]].filter(Boolean) : expandEffectStats(effect);
    const fromOpponent = effect.target === 'target';
    const changes = effectStats.map((statKey) => ({ stat: statKey, delta: effect.stages }));

    if (
      pendingBatch &&
      pendingBatch.targetPass === targetPass &&
      pendingBatch.targetName === targetName &&
      pendingBatch.targetAbility === targetAbility &&
      pendingBatch.fromOpponent === fromOpponent
    ) {
      pendingBatch.changes.push(...changes);
    } else {
      flushPendingBatch();
      pendingBatch = {
        targetPass,
        targetName,
        targetAbility,
        fromOpponent,
        changes: [...changes]
      };
    }
  }
  flushPendingBatch();
  return out;
}

  async function resolveQueuedActions(ctx, battleData, bword) {
    if (!battleData.queuedActions || battleData.queuedActions.length < 2) return false;

    const action1 = battleData.queuedActions[0];
    const action2 = battleData.queuedActions[1];
    battleData.bideCycle = (battleData.bideCycle || 0) + 1;
    dbg('resolve:start', { bword, a1: action1, a2: action2, cid: battleData.cid, oid: battleData.oid, c: battleData.c, o: battleData.o, qlen: battleData.queuedActions.length });
    battleData.queuedActions = []; // Clear queue for next turn
    if (battleData.switchLock) battleData.switchLock = null;
    if (battleData.switchPending) {
      delete battleData.switchPending[String(action1.cid)];
      if (action2) delete battleData.switchPending[String(action2.cid)];
      if (Object.keys(battleData.switchPending).length < 1) delete battleData.switchPending;
    }

    const actions = [action1, action2].filter(Boolean);
    const switchActions = actions.filter(a => a.type === 'switch');
    const moveActions = actions.filter(a => a.type !== 'switch');

    const megaLogs = [];
    const applyPendingMegaForAction = async (act) => {
      if (!act || !battleData.pendingMega) return;
      const pending = battleData.pendingMega[String(act.cid)];
      if (!pending) return;
      // If player chose a switch, do not apply mega for this turn.
      if (act.type === 'switch') {
        delete battleData.pendingMega[String(act.cid)];
        return;
      }
      const stoneId = pending.stone;
      const stone = stones[stoneId];
      if (!stone) {
        delete battleData.pendingMega[String(act.cid)];
        return;
      }
      const user = await getUserData(act.cid);
      const pke = user && user.pokes ? user.pokes.filter(pk => pk.pass == act.c)[0] : null;
      const { normalizeStoneKey, normalizePokemonName } = require('../../utils/stone_alias');
      if (!pke || normalizeStoneKey(pke.held_item || '', stones) !== normalizeStoneKey(stoneId, stones) || normalizePokemonName(stone.pokemon) != normalizePokemonName(pke.name)) {
        delete battleData.pendingMega[String(act.cid)];
        return;
      }
      if (!user.extra) user.extra = {};
      if (!user.extra.megas) user.extra.megas = {};
      if (!battleData.megas) battleData.megas = {};
      if (user.extra.megas[pke.pass]) {
        delete battleData.pendingMega[String(act.cid)];
        return;
      }
      const oldName = pke.name;
      user.extra.megas[pke.pass] = pke.name;
      battleData.megas[pke.pass] = pke.name;
      if (!battleData.megaUsedByCid) battleData.megaUsedByCid = {};
      battleData.megaUsedByCid[String(act.cid)] = true;
      pke.name = stone.mega;
      await saveUserData2(act.cid, user);
      delete battleData.pendingMega[String(act.cid)];
      megaLogs.push('<b>'+c(oldName)+'</b> has transformed into <b>'+c(pke.name)+'</b>');
    };

    for (const act of actions) {
      await applyPendingMegaForAction(act);
    }

    // Bide locks the move choice until it is released.
    if (!battleData.bideState || typeof battleData.bideState !== 'object') {
      battleData.bideState = {};
    }
    for (const act of moveActions) {
      if (battleData.bideState[act.c] && battleData.bideState[act.c].moveId) {
        act.id = battleData.bideState[act.c].moveId;
      }
      const chargingState = getChargingStateForPass(battleData, act.c);
      if (chargingState && chargingState.moveId) {
        act.id = chargingState.moveId;
      }
    }

    let speedA = 0;
    let speedB = 0;
    let pkA = null;
    let pkB = null;
    if (moveActions.length === 2) {
      const usrA = await getUserData(action1.cid);
      const usrB = await getUserData(action2.cid);
      pkA = usrA.pokes.filter(p => p.pass == action1.c)[0];
      pkB = usrB.pokes.filter(p => p.pass == action2.c)[0];
      if (!pkA || !pkB) {
        dbg('resolve:speed_missing_poke', { bword, pkA: !!pkA, pkB: !!pkB, a1: action1, a2: action2 });
        // Keep going; we'll fall back to priority/random ordering below.
        speedA = 0;
        speedB = 0;
      } else {
        const stA = await Stats(pokestats[pkA.name], pkA.ivs, pkA.evs, c(pkA.nature), plevel(pkA.name, pkA.exp));
        const stB = await Stats(pokestats[pkB.name], pkB.ivs, pkB.evs, c(pkB.nature), plevel(pkB.name, pkB.exp));

        speedA = getEffectiveSpeed(stA.speed, battleData, action1.c, pkA && pkA.ability);
        speedB = getEffectiveSpeed(stB.speed, battleData, action2.c, pkB && pkB.ability);
      }
    }

    let orderedActions = [];
    if (moveActions.length === 1) {
      orderedActions = [moveActions[0]];
    } else if (moveActions.length === 2) {
      const mv1 = dmoves[action1.id];
      const mv2 = dmoves[action2.id];
      const pri1 = mv1 ? getMovePriority(mv1.name, mv1.category, pkA && pkA.ability) : 0;
      const pri2 = mv2 ? getMovePriority(mv2.name, mv2.category, pkB && pkB.ability) : 0;
      if (!mv1 || !mv2) {
        dbg('resolve:missing_move_data', { bword, mv1: !!mv1, mv2: !!mv2, a1: action1, a2: action2 });
      }

      if (pri1 > pri2) { orderedActions = [action1, action2]; }
      else if (pri2 > pri1) { orderedActions = [action2, action1]; }
      else {
        if (speedA > speedB) { orderedActions = [action1, action2]; }
        else if (speedB > speedA) { orderedActions = [action2, action1]; }
        else { orderedActions = (Math.random() < 0.5) ? [action1, action2] : [action2, action1]; }
      }
    }
    const isSingleMoveTurn = moveActions.length < 2;

    if (!battleData.turnHits) battleData.turnHits = {};
    battleData.turnHits = {}; // Reset at start of turn
    battleData.turnAbilityState = { skipSpeedBoost: {}, failedEscape: {} };

    let turnLogs = "\n\n<b>Turn Summary:</b>";
    if (megaLogs.length > 0) {
      turnLogs += '\n' + megaLogs.join('\n');
    }

  async function applySwitchAction(act) {
      if (!act || !act.pass) return;
      if (String(battleData.cid) !== String(act.cid)) {
        fullSwap(battleData);
      }
      delete ensureBattleZMoveReadyState(battleData)[String(act.cid)];
      const previousPass = battleData.c;
      const attacker = await getUserData(battleData.cid);
      const defender = await getUserData(battleData.oid);
      const p12 = attacker.pokes.filter((poke)=>poke.pass==act.pass)[0];
      const opposingPokemon = defender.pokes.filter((poke)=>poke.pass==battleData.o)[0];
      let previousEntryStats = null;
      if (p12) {
        previousEntryStats = await Stats(
          getBattleBaseStats({ battleData, pass: p12.pass, pokemonName: p12.name, abilityName: p12.ability, pokestats }),
          p12.ivs,
          p12.evs,
          c(p12.nature),
          plevel(p12.name, p12.exp)
        );
        activateImpersonateForPass({ battleData, pass: p12.pass, pokemonName: p12.name, abilityName: p12.ability });
        syncBattleFormAndAbility({ battleData, pokemon: p12, pass: act.pass });
      }
      battleData.c = act.pass;
      ensureTurnAbilityState(battleData).skipSpeedBoost[String(act.pass)] = true;
      if (!battleData.lastMoveByPass || typeof battleData.lastMoveByPass !== 'object') {
        battleData.lastMoveByPass = {};
      }
      delete battleData.lastMoveByPass[String(previousPass)];
      if (!battleData.choiceLockedMoves || typeof battleData.choiceLockedMoves !== 'object') {
        battleData.choiceLockedMoves = {};
      }
      delete battleData.choiceLockedMoves[String(previousPass)];
      turnLogs += await revertBattleDynamaxForPass({
        battleData,
        pass: previousPass,
        userData: attacker,
        currentHpKey: 'chp',
        teamKey: 'tem'
      });
      // Switching out ends Bide for the Pokemon that left the field.
      if (battleData.bideState && battleData.bideState[previousPass]) {
        delete battleData.bideState[previousPass];
      }
      clearChargingStateForPass(battleData, previousPass);
      clearSemiInvulnerableStateForPass(battleData, previousPass);
      setPokemonMinimized(battleData, previousPass, false);
      if (p12) {
        const switchedStats = await Stats(getBattleBaseStats({ battleData, pass: p12.pass, pokemonName: p12.name, abilityName: p12.ability, pokestats }), p12.ivs, p12.evs, c(p12.nature), plevel(p12.name, p12.exp));
        const oldMaxHp = previousEntryStats ? Math.max(1, Number(previousEntryStats.hp) || 1) : Math.max(1, Number(battleData.tem[act.pass]) || 1);
        const storedHp = Math.max(0, Number(battleData.tem[act.pass]) || 0);
        const scaledHp = storedHp > 0 ? Math.max(1, Math.min(switchedStats.hp, Math.round((storedHp / oldMaxHp) * switchedStats.hp))) : 0;
        battleData.tem[act.pass] = scaledHp;
        battleData.chp = scaledHp;
        turnLogs += '\n-> <b>' + c(p12.name) + '</b> came for battle.';
        const switchImpersonateTarget = getImpersonateTargetName({ battleData, pass: p12.pass, pokemonName: p12.name, abilityName: p12.ability });
        if (switchImpersonateTarget) {
          turnLogs += '\n-> <b>' + c(p12.name) + '</b>\'s <b>Impersonate</b> copied <b>' + c(switchImpersonateTarget) + '</b>!';
        }
        if (getAirBalloonInfo({ battleData, pass: p12.pass, heldItem: p12.held_item }).active) {
          turnLogs += '\n-> <b>' + c(p12.name) + '</b>\'s <b>Air Balloon</b> is floating it above the ground!';
        }
        turnLogs += await applyEntryHazardsOnSwitch({
          battleData,
          sideId: battleData.cid,
          pass: act.pass,
          pokemonName: p12.name,
          abilityName: p12.ability,
          maxHp: switchedStats.hp
        });
        if (opposingPokemon) {
          const opposingStats = await Stats(pokestats[opposingPokemon.name], opposingPokemon.ivs, opposingPokemon.evs, c(opposingPokemon.nature), plevel(opposingPokemon.name, opposingPokemon.exp));
          turnLogs += applyAbilityEntry({
            battleData,
            pass: p12.pass,
            pokemonName: p12.name,
            abilityName: p12.ability,
            heldItem: p12.held_item,
            selfStats: switchedStats,
            opponentStats: opposingStats,
            opponentPass: battleData.o,
            opponentName: opposingPokemon.name,
            opponentAbility: opposingPokemon.ability,
            partyHpMap: battleData.tem,
            c
          }).message;
          turnLogs += setBattleWeatherNegationState({
            battleData,
            activeAbilities: [p12.ability, opposingPokemon.ability],
            sourcePokemonName: p12.name,
            sourceAbilityName: p12.ability,
            c
          }).message;
        }
      }
    }

    // Function to execute one standard attack in current context (battleData.cid attacking battleData.oid)
    async function executeStandardMove(act) {
      if (battleData.chp <= 0 || battleData.ohp <= 0) return; // attacker or defender fainted

      const move = dmoves[act.id];
      let attacker = await getUserData(battleData.cid);
      let defender = await getUserData(battleData.oid);
      let p = attacker.pokes.filter((poke)=>poke.pass==battleData.c)[0];
      let op = defender.pokes.filter((poke)=>poke.pass==battleData.o)[0];
      const attackerAbility = p && p.ability ? p.ability : 'none';
      const defenderAbility = op && op.ability ? op.ability : 'none';
      if (!move || !move.type || !p || !op || !pokes[p.name] || !pokes[op.name]) {
        return;
      }
      let moveLabel;
      try {
        moveLabel = getBattleMoveLabel(move, p, battleData, battleData.c);
      } catch (e) {
        moveLabel = move && move.name ? move.name : 'Unknown Move';
      }
      const moveName = normalizeMoveName(moveLabel);
      const hitsMinimizedBonus = MINIMIZE_PUNISH_MOVES.has(moveName) && isPokemonMinimized(battleData, battleData.o);
      const moveKey = move ? String(act.id) : null;
      let didAttemptMove = false;
      const isCounterMove = ['counter', 'mirror coat', 'metal burst', 'comeuppance'].includes(moveName);
      let base1 = pokestats[p.name];
      let base2 = pokestats[op.name];
      if(!base1 || !base2){
        return;
      }
      let level1 = plevel(p.name, p.exp);
      let level2 = plevel(op.name, op.exp);
      let stats1 = await Stats(base1, p.ivs, p.evs, c(p.nature), level1);
      let stats2 = await Stats(base2, op.ivs, op.evs, c(op.nature), level2);

      const attackerHeldItemName = getBattleHeldItemName({ battleData, pass: battleData.c, heldItem: p.held_item });
      const defenderHeldItemName = getBattleHeldItemName({ battleData, pass: battleData.o, heldItem: op.held_item });
      const effectiveMoveType = getEffectiveMoveType({ battleData, pokemonName: p.name, heldItem: attackerHeldItemName, moveName: move.name, moveType: move.type });
      const defenderTypes = getEffectivePokemonTypes({ pokemonName: op.name, pokemonTypes: pokes[op.name].types || [], heldItem: defenderHeldItemName });

      // Check type effectiveness
      const type3 = defenderTypes[0];
      const type4 = defenderTypes[1] ? c(defenderTypes[1]) : null;
      let eff1 = 1;
      if (battleData.set.type_effects) { eff1 = await eff(c(effectiveMoveType), c(type3), type4); }
      const defenderLevitateInfo = getLevitateInfo({ abilityName: defenderAbility });
      const defenderAirBalloonInfo = getAirBalloonInfo({ battleData, pass: battleData.o, heldItem: op.held_item });
      const groundBlockedMove = (defenderLevitateInfo.active || defenderAirBalloonInfo.active) && String(effectiveMoveType || '').toLowerCase() === 'ground';
      if (groundBlockedMove) eff1 = 0;

      const atkStages = ensurePokemonStatStages(battleData, battleData.c);
      const defStages = ensurePokemonStatStages(battleData, battleData.o);
      const unawareModifiers = getUnawareBattleModifiers({
        attackerAbility,
        defenderAbility,
        moveCategory: move.category,
        attackerStages: atkStages,
        defenderStages: defStages
      });
      const unawareMessage = getUnawareActivationMessages({
        attackerName: p.name,
        defenderName: op.name,
        unawareModifiers
      });
      const supremeOverlordInfo = getSupremeOverlordInfo({
        abilityName: attackerAbility,
        partyHpMap: battleData.tem,
        activePass: battleData.c
      });
      const attackerHeldItemInfo = getHeldItemStatMultipliers({
        pokemonName: p.name,
        heldItem: getBattleHeldItemName({ battleData, pass: battleData.c, heldItem: p.held_item }),
        evolutionChains: chains
      });
      const defenderHeldItemInfo = getHeldItemStatMultipliers({
        pokemonName: op.name,
        heldItem: getBattleHeldItemName({ battleData, pass: battleData.o, heldItem: op.held_item }),
        evolutionChains: chains
      });

      let atk = applyStageToStat(stats1.attack, unawareModifiers.attackStage);
      let def2 = applyStageToStat(stats2.defense, unawareModifiers.defenseStage);
      if (move.category == 'special') {
        atk = applyStageToStat(stats1.special_attack, unawareModifiers.attackStage);
        def2 = applyStageToStat(stats2.special_defense, unawareModifiers.defenseStage);
      } else {
        atk = Math.max(1, Math.floor(atk * getAttackStatMultiplier(attackerAbility, move.category)));
      }
      if (move.category == 'special') {
        atk = Math.max(1, Math.floor(atk * attackerHeldItemInfo.special_attack));
        def2 = Math.max(1, Math.floor(def2 * defenderHeldItemInfo.special_defense));
      } else {
        atk = Math.max(1, Math.floor(atk * attackerHeldItemInfo.attack));
        def2 = Math.max(1, Math.floor(def2 * defenderHeldItemInfo.defense));
      }
      def2 = Math.max(1, Math.floor(def2 * getWeatherDefenseMultiplier({
        battleData,
        moveCategory: move.category,
        pokemonTypes: getEffectivePokemonTypes({ pokemonName: op.name, pokemonTypes: pokes[op.name]?.types || [], heldItem: defenderHeldItemName, abilityName: defenderAbility })
      })));
      atk = Math.max(1, Math.floor(atk * supremeOverlordInfo.multiplier));
      if (move.category == 'physical' && getBattleStatus(battleData, battleData.c) === 'burn') {
        atk = Math.max(1, Math.floor(atk / 2));
      }

      let msgLocal = "";
      let blockedByGoodAsGold = false;

      // ActState (Frozen, Asleep, Paralyzed etc)
      ensureBattleStatus(battleData); // verify status conditions haven't cleared
      const actState = canPokemonAct(battleData, battleData.c, p.name);
      const chargingState = getChargingStateForPass(battleData, battleData.c);
      const isChargeReleaseTurn = !!(chargingState && String(chargingState.moveId) === String(act.id));
      const powerHerbInfo = getPowerHerbInfo({
        battleData,
        pass: battleData.c,
        heldItem: p.held_item,
        moveName
      });
      const isImmediateChargeTurn = actState.canAct && !isChargeReleaseTurn && powerHerbInfo.active;
      if (!actState.canAct && isChargeReleaseTurn) {
        clearChargingStateForPass(battleData, battleData.c);
        clearSemiInvulnerableStateForPass(battleData, battleData.c);
      }

      if (!actState.canAct) {
        msgLocal += "\n" + actState.msg;
      } else {
        didAttemptMove = true;
        if (isChargeReleaseTurn) {
          clearChargingStateForPass(battleData, battleData.c);
          clearSemiInvulnerableStateForPass(battleData, battleData.c);
          msgLocal += '\n-> <b>'+c(p.name)+'</b> unleashed <b>'+c(move.name)+'</b>!';
        } else if (isImmediateChargeTurn) {
          msgLocal += getChargingTurnMessage(p.name, moveName);
          if (CHARGE_START_STAT_MOVES.has(moveName)) {
            msgLocal += applyMoveStatEffects({
              battleData,
              moveName,
              moveCategory: move.category,
              attackerName: p.name,
              defenderName: op.name,
              attackerPass: battleData.c,
              defenderPass: battleData.o,
              attackerAbility,
              defenderAbility,
              targetAlive: battleData.ohp > 0
            });
          }
          consumeBattleHeldItem({ battleData, pass: battleData.c, heldItem: p.held_item });
          msgLocal += '\n-> <b>'+c(p.name)+'</b>\'s <b>Power Herb</b> activated!';
          msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b> immediately!';
        }
      }

      if (actState.canAct && moveName === 'bide') {
        // Bide bypasses accuracy/evasion checks
        if (!battleData.bideState) battleData.bideState = {};
        if (!battleData.bideState[battleData.c]) {
          // Bide stores for exactly 2 turns, then retaliates.
          battleData.bideState[battleData.c] = { turnsLeft: 1, damage: 0, moveId: act.id, lastAttacker: null, lastProcessedCycle: battleData.bideCycle };
          msgLocal += '\n-> <b>'+c(p.name)+'</b> is storing energy!';
        } else {
          let bState = battleData.bideState[battleData.c];
          if (bState.lastProcessedCycle === battleData.bideCycle) {
            msgLocal += '\n-> <b>'+c(p.name)+'</b> is storing energy!';
          } else if (isSingleMoveTurn) {
            // Do not progress Bide countdown on single-action turns (e.g. switch/faint flows).
            bState.lastProcessedCycle = battleData.bideCycle;
            msgLocal += '\n-> <b>'+c(p.name)+'</b> is storing energy!';
          } else if (bState.turnsLeft > 1) {
            bState.turnsLeft -= 1;
            bState.lastProcessedCycle = battleData.bideCycle;
            msgLocal += '\n-> <b>'+c(p.name)+'</b> is storing energy!';
          } else {
            bState.lastProcessedCycle = battleData.bideCycle;
            if (bState.damage === 0) {
              msgLocal += '\n-> <b>'+c(p.name)+'</b> unleashed its energy... but it failed!';
            } else {
              var damage = Math.min(bState.damage * 2, battleData.ohp);
              const sturdyDamage = applyDefenderDamageWithSturdy({
                battleData,
                damage,
                defenderAbility,
                defenderName: op.name,
                defenderMaxHp: stats2.hp,
                moveName
              });
              damage = sturdyDamage.damage;
              battleData.turnHits[battleData.o] = { damage: damage, category: move.category || 'physical', from: battleData.c, move: moveName };
              if (battleData.bideState && battleData.bideState[battleData.o]) {
                battleData.bideState[battleData.o].damage += damage;
                battleData.bideState[battleData.o].lastAttacker = battleData.c;
              }
              msgLocal += '\n-> <b>'+c(p.name)+'</b> unleashed its energy! It dealt <code>'+damage+'</code> HP to <b>'+c(op.name)+'</b>';
              msgLocal += sturdyDamage.message;
            }
            delete battleData.bideState[battleData.c];
          }
        }
      } else if (actState.canAct && isCounterMove) {
        // Counterattack moves only succeed if this Pokemon was hit earlier this turn.
        const lastHit = battleData.turnHits[battleData.c];
        const wasHitByCurrentFoe = lastHit && String(lastHit.from) === String(battleData.o);
        if (!lastHit || lastHit.damage === 0 || !wasHitByCurrentFoe) {
          msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b> but it failed!';
        } else if (moveName === 'counter' && lastHit.category !== 'physical') {
          msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b> but it failed!';
        } else if (moveName === 'mirror coat' && lastHit.category !== 'special') {
          msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b> but it failed!';
        } else {
          const multiplier = (moveName === 'metal burst' || moveName === 'comeuppance') ? 1.5 : 2;
          var damage = Math.min(Math.max(Math.floor(lastHit.damage * multiplier), 1), battleData.ohp);
          const sturdyDamage = applyDefenderDamageWithSturdy({
            battleData,
            damage,
            defenderAbility,
            defenderName: op.name,
            defenderMaxHp: stats2.hp,
            moveName
          });
          damage = sturdyDamage.damage;
          battleData.turnHits[battleData.o] = { damage: damage, category: move.category || 'physical', from: battleData.c, move: moveName };
          if (battleData.bideState && battleData.bideState[battleData.o]) {
            battleData.bideState[battleData.o].damage += damage;
            battleData.bideState[battleData.o].lastAttacker = battleData.c;
          }
          msgLocal += '\n-> <b>'+c(p.name)+'</b> retaliated with <b>'+c(move.name)+'</b> and dealt <code>'+damage+'</code> HP to <b>'+c(op.name)+'</b>';
          msgLocal += sturdyDamage.message;
        }
      } else if (actState.canAct && !isChargeReleaseTurn && !isImmediateChargeTurn && CHARGING_TURN_MOVES.has(moveName)) {
        setChargingStateForPass(battleData, battleData.c, act.id, moveName);
        if (SEMI_INVULNERABLE_CHARGE_MOVES.has(moveName)) {
          setSemiInvulnerableStateForPass(battleData, battleData.c, moveName);
        }
        msgLocal += getChargingTurnMessage(p.name, moveName);
        if (CHARGE_START_STAT_MOVES.has(moveName)) {
          msgLocal += applyMoveStatEffects({
            battleData,
            moveName,
            moveCategory: move.category,
            attackerName: p.name,
            defenderName: op.name,
            attackerPass: battleData.c,
            defenderPass: battleData.o,
            attackerAbility,
            defenderAbility,
            targetAlive: battleData.ohp > 0
          });
        }
      } else if (actState.canAct) {
        if (isSemiInvulnerableAvoidedMove(battleData, battleData.o, move.category, moveName)) {
          const opSemi = getSemiInvulnerableStateForPass(battleData, battleData.o);
          msgLocal += getSemiInvulnerableAvoidMessage(op.name, opSemi ? opSemi.moveName : '');
        } else {
        const weatherAccuracy = getWeatherAccuracyInfo({ battleData, moveName, baseAccuracy: move.accuracy });
        const bypassAccuracyCheck = moveName === 'bind' || hitsMinimizedBonus || weatherAccuracy.skipAccuracyCheck;
        const isStatusMove = String(move.category || '').toLowerCase() === 'status';
        const hasAccuracyCheck = !bypassAccuracyCheck && !isStatusMove && move.accuracy !== null && move.accuracy !== undefined;
        const accValue = hasAccuracyCheck ? getModifiedAccuracy(Number(weatherAccuracy.accuracy), unawareModifiers.accuracyStage, unawareModifiers.evasionStage, battleData, defenderAbility) : 100;
        if (hasAccuracyCheck && Math.random() * 100 > accValue) {
          msgLocal += unawareMessage;
          msgLocal += '\n-> <b>'+c(p.name)+'</b> <b>'+c(move.name)+'</b> has missed.';
          msgLocal += applyBlunderPolicy({
            battleData,
            pass: battleData.c,
            pokemonName: p.name,
            heldItem: p.held_item,
            moveName,
            c
          }).message;
          const crash = getCrashDamage(moveName, stats1.hp);
          if (crash > 0) {
            const selfBefore = battleData.chp;
            const crashTaken = Math.min(crash, selfBefore);
            battleData.chp = Math.max(0, selfBefore - crashTaken);
            battleData.tem[battleData.c] = Math.max(0, (battleData.tem[battleData.c] || selfBefore) - crashTaken);
            msgLocal += '\n-> <b>'+c(p.name)+'</b> crashed and lost <code>'+crashTaken+'</code> HP!';
          }
        } else if (hasAccuracyCheck && !isStatusMove && Math.random() < 0.05) {
          msgLocal += unawareMessage;
          msgLocal += '\n-> <b>'+c(op.name)+'</b> Dodged <b>'+c(p.name)+'</b>\'s <b>'+c(move.name)+'</b>';
          const crash = getCrashDamage(moveName, stats1.hp);
          if (crash > 0) {
            const selfBefore = battleData.chp;
            const crashTaken = Math.min(crash, selfBefore);
            battleData.chp = Math.max(0, selfBefore - crashTaken);
            battleData.tem[battleData.c] = Math.max(0, (battleData.tem[battleData.c] || selfBefore) - crashTaken);
            msgLocal += '\n-> <b>'+c(p.name)+'</b> crashed and lost <code>'+crashTaken+'</code> HP!';
          }
        } else {
          if (moveName === 'leech seed') {
            if (!battleData.leechSeed || typeof battleData.leechSeed !== 'object') {
              battleData.leechSeed = {};
            }
            const defenderTypes = getEffectivePokemonTypes({ pokemonName: op.name, pokemonTypes: pokes[op.name]?.types || [], heldItem: defenderHeldItemName }).map((t) => String(t).toLowerCase());
            if (defenderTypes.includes('grass')) {
              msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b> but it failed!';
            } else if (battleData.leechSeed[battleData.o]) {
              msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b> but it failed!';
            } else {
              battleData.leechSeed[battleData.o] = battleData.c;
              msgLocal += '\n-> <b>'+c(p.name)+'</b> planted a seed on <b>'+c(op.name)+'</b>!';
            }
          } else if ((move.category == 'status' || !move.power) && !OHKO_MOVES.has(moveName)) {
            const goodAsGoldInfo = getGoodAsGoldInfo({ abilityName: defenderAbility });
            if (goodAsGoldInfo.active && isOpponentTargetingStatusMove(move, moveName)) {
              blockedByGoodAsGold = true;
              msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b>.';
              msgLocal += getAbilityActivationMessage(op.name, 'Good As Gold');
              msgLocal += unawareMessage;
              msgLocal += '\n-> It had no effect on <b>'+c(op.name)+'</b>!';
            } else {
              msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b>.';
              msgLocal += unawareMessage;
              msgLocal += applyMoveStatEffects({
                battleData,
                moveName,
                moveCategory: move.category,
                attackerName: p.name,
                defenderName: op.name,
                attackerPass: battleData.c,
                defenderPass: battleData.o,
                attackerAbility,
                defenderAbility,
                targetAlive: battleData.ohp > 0
              });
              msgLocal += applyEntryHazardSetupByMove(moveName, battleData, battleData.oid, true);
              msgLocal += applyEntryHazardRemovalByMove(moveName, battleData, battleData.cid, battleData.oid, true);

              if (moveName === 'strength sap') {
                const targetStages = ensurePokemonStatStages(battleData, battleData.o);
                const targetAtk = applyStageToStat(stats2.attack, targetStages.attack);
                const healAmount = Math.max(1, Math.floor(targetAtk * (attackerHeldItemInfo.recoveryMultiplier || 1)));
                const hpBefore = battleData.chp;
                battleData.chp = Math.min(stats1.hp, battleData.chp + healAmount);
                const healed = Math.max(0, battleData.chp - hpBefore);
                battleData.tem[battleData.c] = Math.min(stats1.hp, Math.max(0, (battleData.tem[battleData.c] || hpBefore) + healed));
                if (healed > 0) {
                  msgLocal += '\n-> <b>'+c(p.name)+'</b> restored <code>'+healed+'</code> HP with <b>'+c(move.name)+'</b>!';
                }
              }

              if (moveName === 'belly drum') {
              const bdHalf = Math.floor(stats1.hp / 2);
              if (battleData.chp > bdHalf) {
                battleData.chp -= bdHalf;
                battleData.tem[battleData.c] = Math.max(0, (battleData.tem[battleData.c] || battleData.chp) - bdHalf);
                const bdStages = ensurePokemonStatStages(battleData, battleData.c);
                const bdTarget = attackerAbility === 'contrary' ? -6 : 6;
                const bdDelta = bdTarget - (bdStages.attack || 0);
                if (bdDelta !== 0) {
                  msgLocal += applyStageChanges({
                    battleData,
                    pass: battleData.c,
                    pokemonName: p.name,
                    abilityName: attackerAbility,
                    changes: [{ stat: 'attack', delta: bdDelta }],
                    c,
                    fromOpponent: false
                  }).message;
                }
                msgLocal += '\n-> <b>'+c(p.name)+'</b> cut its own HP to maximize Attack!';
              } else {
                msgLocal += '\n-> But it failed!';
              }
              }

              if (moveName === 'clangorous soul') {
              const csThird = Math.floor(stats1.hp / 3);
              if (battleData.chp > csThird) {
                battleData.chp = Math.max(1, battleData.chp - csThird);
                battleData.tem[battleData.c] = Math.max(1, (battleData.tem[battleData.c] || battleData.chp + csThird) - csThird);
                msgLocal += applyStageChanges({
                  battleData,
                  pass: battleData.c,
                  pokemonName: p.name,
                  abilityName: attackerAbility,
                  changes: ['attack','defense','special_attack','special_defense','speed'].map((stat) => ({ stat, delta: 1 })),
                  c,
                  fromOpponent: false
                }).message;
                msgLocal += '\n-> <b>'+c(p.name)+'</b> cut its HP to power itself up!';
              } else {
                msgLocal += '\n-> But it failed!';
              }
              }

              if (moveName === 'fillet away') {
              const faHalf = Math.floor(stats1.hp / 2);
              if (battleData.chp > faHalf) {
                battleData.chp -= faHalf;
                battleData.tem[battleData.c] = Math.max(0, (battleData.tem[battleData.c] || battleData.chp) - faHalf);
                msgLocal += applyStageChanges({
                  battleData,
                  pass: battleData.c,
                  pokemonName: p.name,
                  abilityName: attackerAbility,
                  changes: [{ stat: 'attack', delta: 2 }, { stat: 'special_attack', delta: 2 }, { stat: 'speed', delta: 2 }],
                  c,
                  fromOpponent: false
                }).message;
                msgLocal += '\n-> <b>'+c(p.name)+'</b> cut its HP to sharpen all its senses!';
              } else {
                msgLocal += '\n-> But it failed!';
              }
              }

              if (moveName === 'growth') {
                const growthDelta = getGrowthStageChange(battleData);
                msgLocal += applyStageChanges({
                  battleData,
                  pass: battleData.c,
                  pokemonName: p.name,
                  abilityName: attackerAbility,
                  changes: [{ stat: 'attack', delta: growthDelta }, { stat: 'special_attack', delta: growthDelta }],
                  c,
                  fromOpponent: false
                }).message;
              }

              if (HALF_HEAL_STATUS_MOVES.has(moveName)) {
                const healed = healBattlePokemon({
                  battleData,
                  pass: battleData.c,
                  maxHp: stats1.hp,
                  amount: Math.max(1, Math.floor(stats1.hp / 2) * (attackerHeldItemInfo.recoveryMultiplier || 1)),
                  hpKey: 'chp',
                  tempKey: 'tem'
                });
                if (healed > 0) {
                  msgLocal += '\n-> <b>'+c(p.name)+'</b> restored <code>'+healed+'</code> HP with <b>'+c(move.name)+'</b>!';
                }
              }

              if (moveName === 'rest') {
                if (battleData.chp >= stats1.hp || getBattleStatus(battleData, battleData.c) === 'sleep') {
                  msgLocal += '\n-> But it failed!';
                } else {
                  const healed = healBattlePokemon({
                    battleData,
                    pass: battleData.c,
                    maxHp: stats1.hp,
                    amount: stats1.hp,
                    hpKey: 'chp',
                    tempKey: 'tem'
                  });
                  setBattleSleepStatus(battleData, battleData.c, 2);
                  msgLocal += '\n-> <b>'+c(p.name)+'</b> fell asleep and restored <code>'+healed+'</code> HP with <b>'+c(move.name)+'</b>!';
                }
              }

              if (moveName === 'lunar blessing') {
                const healed = healBattlePokemon({
                  battleData,
                  pass: battleData.c,
                  maxHp: stats1.hp,
                  amount: Math.max(1, Math.floor(stats1.hp / 2) * (attackerHeldItemInfo.recoveryMultiplier || 1)),
                  hpKey: 'chp',
                  tempKey: 'tem'
                });
                const clearedStatus = clearBattleMajorStatus(battleData, battleData.c);
                if (healed > 0) {
                  msgLocal += '\n-> <b>'+c(p.name)+'</b> restored <code>'+healed+'</code> HP with <b>'+c(move.name)+'</b>!';
                }
                if (clearedStatus) {
                  msgLocal += '\n-> <b>'+c(p.name)+'</b> was cured of <b>'+getStatusLabel(clearedStatus)+'</b>.';
                }
              }

              if (moveName === 'purify') {
                const targetStatus = getBattleStatus(battleData, battleData.o);
                if (!targetStatus) {
                  msgLocal += '\n-> But it failed!';
                } else {
                  clearBattleMajorStatus(battleData, battleData.o);
                  msgLocal += '\n-> <b>'+c(op.name)+'</b> was cured of <b>'+getStatusLabel(targetStatus)+'</b>.';
                  const healed = healBattlePokemon({
                    battleData,
                    pass: battleData.c,
                    maxHp: stats1.hp,
                    amount: Math.max(1, Math.floor(stats1.hp / 2) * (attackerHeldItemInfo.recoveryMultiplier || 1)),
                    hpKey: 'chp',
                    tempKey: 'tem'
                  });
                  if (healed > 0) {
                    msgLocal += '\n-> <b>'+c(p.name)+'</b> restored <code>'+healed+'</code> HP with <b>'+c(move.name)+'</b>!';
                  }
                }
              }

              if (moveName === 'synthesis' || moveName === 'morning sun' || moveName === 'moonlight' || moveName === 'shore up') {
                const recoveryRatio = getWeatherRecoveryRatio({ battleData, moveName });
                if (recoveryRatio > 0) {
                  const healed = healBattlePokemon({
                    battleData,
                    pass: battleData.c,
                    maxHp: stats1.hp,
                    amount: Math.max(1, Math.floor(stats1.hp * recoveryRatio * (attackerHeldItemInfo.recoveryMultiplier || 1))),
                    hpKey: 'chp',
                    tempKey: 'tem'
                  });
                  if (healed > 0) {
                    msgLocal += '\n-> <b>'+c(p.name)+'</b> restored <code>'+healed+'</code> HP with <b>'+c(move.name)+'</b>!';
                  }
                }
              }

              if (moveName === 'minimize') {
                setPokemonMinimized(battleData, battleData.c, true);
              }

              msgLocal += applyScreenSetupByMove(moveName, battleData, battleData.cid, true);
              msgLocal += applyScreenRemovalByMove(moveName, battleData, battleData.oid, true);
              msgLocal += applyWeatherByMove({
                battleData,
                moveName,
                pass: battleData.c,
                pokemonName: p.name,
                heldItem: p.held_item,
                c,
                didHit: true
              }).message;

              msgLocal += applySelfFaintAfterMove(moveName, moveLabel, battleData, battleData.c, p.name);
            }
          } else {
            const absorbedByAbility = applyAbilityAbsorbMove({
              battleData,
              pass: battleData.o,
              pokemonName: op.name,
              abilityName: defenderAbility,
              moveType: effectiveMoveType,
              moveName: moveLabel,
              c
            });
            if (absorbedByAbility.blocked) {
              msgLocal += '\n-> <b>'+c(op.name)+'</b> nullified <b>'+c(move.name)+'</b>.';
              msgLocal += absorbedByAbility.message;
            } else {
            const weatherSuppressedMessage = getWeatherSuppressedMoveMessage({
              battleData,
              moveType: effectiveMoveType,
              moveCategory: move.category,
              pokemonName: p.name,
              moveName: moveLabel,
              c
            });
            if (moveName === 'dream eater' && getBattleStatus(battleData, battleData.o) !== 'sleep') {
              msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b> but it failed!';
            } else if (weatherSuppressedMessage) {
              msgLocal += weatherSuppressedMessage;
            } else {
              const defenderHpBeforeHit = battleData.ohp;
              const pinchPowerMult = getPinchPowerMultiplier({
                abilityName: attackerAbility,
                moveType: effectiveMoveType,
                currentHp: battleData.chp,
                maxHp: stats1.hp
              });
              // Fix: Always declare battleMove before use to avoid TDZ errors
              let battleMove = move;
              // If a different battleMove is set earlier in the logic, it will be used; otherwise, defaults to move
              const technicianInfo = getTechnicianPowerInfo({
                abilityName: attackerAbility,
                movePower: battleMove.power || move.power
              });
              const boostedPower = Math.max(1, Math.floor(getBattleMovePower({
                battleData,
                pass: battleData.c,
                pokemonName: p.name,
                abilityName: attackerAbility,
                moveName,
                moveType: effectiveMoveType,
                movePower: battleMove.power || move.power
              }) * getWeatherMovePowerMultiplier({ battleData, moveName, moveType: effectiveMoveType }) * pinchPowerMult * technicianInfo.multiplier));
              const stabInfo = getStabInfo({
                abilityName: attackerAbility,
                moveType: effectiveMoveType,
                pokemonTypes: getEffectivePokemonTypes({ pokemonName: p.name, pokemonTypes: pokes[p.name]?.types || [], heldItem: attackerHeldItemName })
              });
              var damage = Math.min(Math.max(0, Math.floor(calc(atk, def2, level1, boostedPower, eff1) * stabInfo.multiplier)), battleData.ohp);
              const lifeOrbBoostActive = attackerHeldItemInfo.lifeOrbActive && !isDirectDamageMove(moveName);
              if (lifeOrbBoostActive && damage > 0) {
                damage = Math.min(Math.max(1, Math.floor(damage * attackerHeldItemInfo.damageMultiplier)), battleData.ohp);
              }
              let ohkoFailed = false;
              if (OHKO_MOVES.has(moveName)) {
                const attackerTypes = getEffectivePokemonTypes({ pokemonName: p.name, pokemonTypes: pokes[p.name]?.types || [], heldItem: attackerHeldItemName }).map((t) => String(t).toLowerCase());
                const defenderTypes = getEffectivePokemonTypes({ pokemonName: op.name, pokemonTypes: pokes[op.name]?.types || [], heldItem: defenderHeldItemName }).map((t) => String(t).toLowerCase());
                const sheerColdBlocked = moveName === 'sheer cold' && defenderTypes.includes('ice') && !attackerTypes.includes('ice');
                const ohkoChance = getOhkoHitChance(level1, level2);
                if (level1 < level2 || sheerColdBlocked || Math.random() * 100 >= ohkoChance) {
                  damage = 0;
                  ohkoFailed = true;
                } else {
                  damage = battleData.ohp;
                }
              }
              if (!ohkoFailed && hitsMinimizedBonus && damage > 0) {
                damage = Math.min(Math.max(1, Math.floor(damage * MINIMIZE_PUNISH_MULTIPLIER)), battleData.ohp);
              }
              const isPerfectCrit = PERFECT_CRIT_MOVES.has(moveName);
              const isHighCritMove = HIGH_CRIT_RATIO_MOVES.has(moveName);
              let hitCount = (!ohkoFailed && damage > 0) ? getMultiHitCount(moveName) : 1;
              let critHits = 0;
              let staminaMessage = '';
              let weakArmorMessage = '';
              let shieldMessage = '';
              let sturdyMessage = '';
              let multiscaleMessage = '';
              let levitateMessage = '';
              if (!ohkoFailed && damage > 0 && !OHKO_MOVES.has(moveName)) {
                let totalDamage = 0;
                let landedHits = 0;
                for (let h = 0; h < hitCount; h += 1) {
                  const remainingHp = battleData.ohp - totalDamage;
                  if (remainingHp <= 0) break;

                  let hitDamage = damage;
                  const didHitCrit = isPerfectCrit || (isHighCritMove && Math.random() < HIGH_CRIT_RATIO_CHANCE);
                  if (didHitCrit) {
                    critHits += 1;
                    hitDamage = Math.max(1, Math.floor(hitDamage * CRIT_DAMAGE_MULTIPLIER));
                  } else {
                    const screenMult = getScreenDamageMultiplier(battleData, battleData.oid, move.category, attackerAbility, moveName);
                    if (screenMult < 1) {
                      hitDamage = Math.max(1, Math.floor(hitDamage * screenMult));
                    }
                  }

                  const shieldResult = applyShadowShieldReduction({
                    abilityName: defenderAbility,
                    currentHp: remainingHp,
                    maxHp: stats2.hp,
                    incomingDamage: hitDamage,
                    moveName,
                    pokemonName: op.name,
                    c
                  });
                  hitDamage = shieldResult.damage;
                  if (shieldResult.activated && !shieldMessage) {
                    shieldMessage = shieldResult.message;
                  }
                  const multiscaleResult = applyMultiscaleReduction({
                    abilityName: defenderAbility,
                    currentHp: remainingHp,
                    maxHp: stats2.hp,
                    incomingDamage: hitDamage,
                    pokemonName: op.name,
                    c
                  });
                  hitDamage = multiscaleResult.damage;
                  if (multiscaleResult.activated && !multiscaleMessage) {
                    multiscaleMessage = multiscaleResult.message;
                  }
                  const sturdyResult = applySturdySurvival({
                    abilityName: defenderAbility,
                    currentHp: remainingHp,
                    maxHp: stats2.hp,
                    incomingDamage: hitDamage,
                    pokemonName: op.name,
                    c
                  });
                  hitDamage = sturdyResult.damage;
                  if (sturdyResult.activated && !sturdyMessage) {
                    sturdyMessage = sturdyResult.message;
                  }
                  const focusSashResult = applyFocusSashSurvival({
                    battleData,
                    pass: battleData.o,
                    heldItem: op.held_item,
                    currentHp: remainingHp,
                    maxHp: stats2.hp,
                    incomingDamage: hitDamage,
                    pokemonName: op.name,
                    moveName,
                    c
                  });
                  hitDamage = focusSashResult.damage;
                  if (focusSashResult.activated && !sturdyMessage) {
                    sturdyMessage = focusSashResult.message;
                  }
                  hitDamage = Math.min(hitDamage, remainingHp);
                  totalDamage += hitDamage;
                  landedHits += 1;
                  staminaMessage += applyStaminaOnHit({
                    battleData,
                    pass: battleData.o,
                    pokemonName: op.name,
                    abilityName: defenderAbility,
                    damageDealt: hitDamage,
                    c
                  }).message;
                  weakArmorMessage += applyWeakArmorOnHit({
                    battleData,
                    pass: battleData.o,
                    pokemonName: op.name,
                    abilityName: defenderAbility,
                    moveCategory: move.category,
                    damageDealt: hitDamage,
                    c,
                    deferWhiteHerb: hitCount > 1
                  }).message;
                }
                if (hitCount > 1) {
                  weakArmorMessage += applyWhiteHerbIfNeeded({
                    battleData,
                    pass: battleData.o,
                    pokemonName: op.name,
                    c
                  }).message;
                }
                hitCount = landedHits;
                damage = totalDamage;
              }
              if (OHKO_MOVES.has(moveName) && damage > 0) {
                const sturdyDamage = applyDefenderDamageWithSturdy({
                  battleData,
                  damage,
                  defenderAbility,
                  defenderName: op.name,
                  defenderMaxHp: stats2.hp,
                  moveName
                });
                damage = sturdyDamage.damage;
                const focusSashDamage = applyFocusSashSurvival({
                  battleData,
                  pass: battleData.o,
                  heldItem: op.held_item,
                  currentHp: battleData.ohp,
                  maxHp: stats2.hp,
                  incomingDamage: damage,
                  pokemonName: op.name,
                  moveName,
                  c
                });
                damage = focusSashDamage.damage;
                staminaMessage += applyStaminaOnHit({
                  battleData,
                  pass: battleData.o,
                  pokemonName: op.name,
                  abilityName: defenderAbility,
                  damageDealt: damage,
                  c
                }).message;
                sturdyMessage += sturdyDamage.message + focusSashDamage.message;
              } else {
                battleData.ohp = Math.max((battleData.ohp - damage), 0);
                battleData.tem2[battleData.o] = Math.max((battleData.tem2[battleData.o] - damage), 0);
              }
              if (ohkoFailed) {
                msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b> but it failed!';
              } else {
                msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b> and dealt <code>'+damage+'</code> HP to <b>'+c(op.name)+'</b>';
                msgLocal += unawareMessage;
                if (groundBlockedMove && defenderLevitateInfo.active) {
                  levitateMessage = '\n-> <b>'+c(op.name)+'</b>\'s <b>Levitate</b> activated!';
                }
                if (groundBlockedMove && defenderAirBalloonInfo.active) {
                  levitateMessage += '\n-> <b>'+c(op.name)+'</b>\'s <b>Air Balloon</b> activated!';
                }
                msgLocal += getInfiltratorBypassMessage(battleData, battleData.oid, move.category, attackerAbility, p.name, moveName);
                if (pinchPowerMult > 1) {
                  msgLocal += '\n-> <b>'+c(p.name)+'</b>\'s <b>'+c(formatAbilityLabel(attackerAbility))+'</b> boosted its '+c(effectiveMoveType)+'-type move!';
                }
                msgLocal += staminaMessage;
                if (technicianInfo.active) {
                  msgLocal += '\n-> <b>'+c(p.name)+'</b>\'s <b>Technician</b> activated!';
                }
                if (stabInfo.adaptabilityActive && damage > 0) {
                  msgLocal += '\n-> <b>'+c(p.name)+'</b>\'s <b>Adaptability</b> activated!';
                }
                if (supremeOverlordInfo.active && damage > 0) {
                  msgLocal += '\n-> <b>'+c(p.name)+'</b>\'s <b>Supreme Overlord</b> activated!';
                }
                msgLocal += weakArmorMessage;
                msgLocal += shieldMessage;
                msgLocal += multiscaleMessage;
                msgLocal += sturdyMessage;
                msgLocal += levitateMessage;
                if (defenderAirBalloonInfo.active && damage > 0 && (move.category === 'physical' || move.category === 'special')) {
                  consumeBattleHeldItem({ battleData, pass: battleData.o, heldItem: op.held_item });
                  msgLocal += '\n-> <b>'+c(op.name)+'</b>\'s <b>Air Balloon</b> popped!';
                }
                if (hitCount > 1) {
                  msgLocal += '\n-> It hit <b>'+hitCount+'</b> times!';
                }
              }
              if (!ohkoFailed && critHits > 0 && damage > 0) {
                msgLocal += '\n-> <b>A critical hit!</b>';
              }

              if (eff1 === 0) {
                const crash = getCrashDamage(moveName, stats1.hp);
                if (crash > 0) {
                  const selfBefore = battleData.chp;
                  const crashTaken = Math.min(crash, selfBefore);
                  battleData.chp = Math.max(0, selfBefore - crashTaken);
                  battleData.tem[battleData.c] = Math.max(0, (battleData.tem[battleData.c] || selfBefore) - crashTaken);
                  msgLocal += '\n-> <b>'+c(p.name)+'</b> crashed and lost <code>'+crashTaken+'</code> HP!';
                }
              }

              const drainRatio = getDrainRatio(moveName);
              if (drainRatio > 0 && damage > 0) {
                const healRaw = Math.max(1, Math.floor(damage * drainRatio));
                const adjustedDrain = Math.max(1, Math.floor(healRaw * (attackerHeldItemInfo.recoveryMultiplier || 1)));
                const liquidOozeActive = normalizeAbilityName(defenderAbility) === 'liquid-ooze';
                if (liquidOozeActive) {
                  const prevHp = battleData.chp;
                  const oozeDamage = Math.min(adjustedDrain, prevHp);
                  battleData.chp = Math.max(0, prevHp - oozeDamage);
                  battleData.tem[battleData.c] = Math.max(0, (battleData.tem[battleData.c] || prevHp) - oozeDamage);
                  msgLocal += '\n-> <b>'+c(op.name)+'</b>\'s <b>Liquid Ooze</b> activated!';
                  msgLocal += '\n-> <b>'+c(p.name)+'</b> lost <code>'+oozeDamage+'</code> HP!';
                } else {
                  const prevHp = battleData.chp;
                  battleData.chp = Math.min(stats1.hp, battleData.chp + adjustedDrain);
                  const healed = Math.max(0, battleData.chp - prevHp);
                  battleData.tem[battleData.c] = Math.min(stats1.hp, Math.max(0, (battleData.tem[battleData.c] || prevHp) + healed));
                  if (healed > 0) {
                    msgLocal += '\n-> <b>'+c(p.name)+'</b> drained <code>'+healed+'</code> HP!';
                  }
                }
              }

              const recoil = getRecoilDamage(moveName, damage, stats1.hp);
              if (recoil > 0) {
                const selfBefore = battleData.chp;
                const recoilTaken = Math.min(recoil, selfBefore);
                battleData.chp = Math.max(0, selfBefore - recoilTaken);
                battleData.tem[battleData.c] = Math.max(0, (battleData.tem[battleData.c] || selfBefore) - recoilTaken);
                msgLocal += '\n-> <b>'+c(p.name)+'</b> was hurt by recoil and lost <code>'+recoilTaken+'</code> HP!';
              }
              msgLocal += applySelfFaintAfterMove(moveName, moveLabel, battleData, battleData.c, p.name);
              if (attackerHeldItemInfo.lifeOrbActive && move.category !== 'status' && !ohkoFailed && moveName !== 'fling' && battleData.chp > 0) {
                const selfBefore = battleData.chp;
                const lifeOrbDamage = Math.max(1, Math.floor(stats1.hp / 10));
                const taken = Math.min(lifeOrbDamage, selfBefore);
                battleData.chp = Math.max(0, selfBefore - taken);
                battleData.tem[battleData.c] = Math.max(0, (battleData.tem[battleData.c] || selfBefore) - taken);
                msgLocal += '\n-> <b>'+c(p.name)+'</b>\'s <b>Life Orb</b> activated!';
                msgLocal += '\n-> <b>'+c(p.name)+'</b> lost <code>'+taken+'</code> HP from its <b>Life Orb</b>!';
              }
              msgLocal += applyEntryHazardSetupByMove(moveName, battleData, battleData.oid, damage > 0);
              msgLocal += applyEntryHazardRemovalByMove(moveName, battleData, battleData.cid, battleData.oid, damage > 0);
              msgLocal += applyScreenSetupByMove(moveName, battleData, battleData.cid, damage > 0);
              msgLocal += applyScreenRemovalByMove(moveName, battleData, battleData.oid, damage > 0);

              // Record hit for counter-attacks and accumulate bide damage
              battleData.turnHits[battleData.o] = { damage: damage, category: move.category, from: battleData.c, move: moveName };
              if (battleData.bideState && battleData.bideState[battleData.o]) {
                battleData.bideState[battleData.o].damage += damage;
                battleData.bideState[battleData.o].lastAttacker = battleData.c;
              }

              if (!ohkoFailed && eff1 == 0) msgLocal += '\n<b>* It\'s 0x effective!</b>';
              else if (!ohkoFailed && eff1 == 0.5) msgLocal += '\n<b>* It\'s not very effective...</b>';
              else if (!ohkoFailed && eff1 == 2) msgLocal += '\n<b>* It\'s super effective!</b>';
              else if (!ohkoFailed && eff1 == 4) msgLocal += '\n<b>* It\'s incredibly super effective!</b>';

              if (damage > 0) {
                msgLocal += applyMoveStatEffects({
                  battleData,
                  moveName,
                  moveCategory: move.category,
                  attackerName: p.name,
                  defenderName: op.name,
                  attackerPass: battleData.c,
                  defenderPass: battleData.o,
                  attackerAbility,
                  defenderAbility,
                  targetAlive: battleData.ohp > 0
                });
                if (moveName === 'fell stinger' && battleData.ohp <= 0) {
                  msgLocal += applyStageChanges({
                    battleData,
                    pass: battleData.c,
                    pokemonName: p.name,
                    abilityName: attackerAbility,
                    changes: [{ stat: 'attack', delta: 3 }],
                    c,
                    fromOpponent: false
                  }).message;
                }
              }
              msgLocal += applyAbilityOnDamageTaken({
                battleData,
                pass: battleData.o,
                pokemonName: op.name,
                attackerPass: battleData.c,
                attackerName: p.name,
                abilityName: defenderAbility,
                heldItem: op.held_item,
                attackerAbility,
                moveName,
                typeEffectiveness: eff1,
                moveType: effectiveMoveType,
                moveCategory: move.category,
                attackerMaxHp: stats1.hp,
                hpBefore: defenderHpBeforeHit,
                hpAfter: battleData.ohp,
                maxHp: stats2.hp,
                damageDealt: damage,
                c
              }).message;
              if (battleData.ohp <= 0) {
                const remainingDefenderMons = Object.keys(battleData.tem2 || {}).filter((pass) => battleData.tem2[pass] > 0);
                if (remainingDefenderMons.length > 0 || normalizeAbilityName(attackerAbility) !== 'beast-boost') {
                  msgLocal += applyAbilityKo({
                    battleData,
                    pass: battleData.c,
                    pokemonName: p.name,
                    abilityName: attackerAbility,
                    stats: stats1,
                    c
                  }).message;
                }
              }
            }
            }
          }

          // Status condition inflictions
          const statusEffect = getMoveStatusEffect(move);
          if (statusEffect && battleData.ohp > 0 && !blockedByGoodAsGold) {
            const existingStatus = getBattleStatus(battleData, battleData.o);
            const defenderTypes = getEffectivePokemonTypes({ pokemonName: op.name, pokemonTypes: pokes[op.name]?.types || [], heldItem: defenderHeldItemName });
            if (!existingStatus && !isStatusImmune(statusEffect.status, defenderTypes) && Math.random() < statusEffect.chance) {
              setBattleStatus(battleData, battleData.o, statusEffect.status);
              msgLocal += '\n-> <b>'+c(op.name)+'</b> is now <b>'+getStatusLabel(statusEffect.status)+'</b>.';
            }
          }
        }
        }
      }

      msgLocal += applyDefenderResidualDamage(battleData, battleData.o, op.name, stats2.hp);

      // Leech Seed: seeded target loses HP, and the source recovers HP (single-battle context).
      if (battleData.leechSeed && battleData.leechSeed[battleData.o] && String(battleData.leechSeed[battleData.o]) === String(battleData.c) && battleData.ohp > 0) {
        const leechDamage = Math.max(1, Math.floor(stats2.hp / 8));
        const drained = Math.min(leechDamage, battleData.ohp);
        battleData.ohp = Math.max(0, battleData.ohp - drained);
        battleData.tem2[battleData.o] = Math.max(0, battleData.tem2[battleData.o] - drained);

        msgLocal += '\n-> <b>'+c(op.name)+'</b> had its energy sapped by Leech Seed and lost <code>'+drained+'</code> HP.';
        const adjustedLeech = Math.max(1, Math.floor(drained * (attackerHeldItemInfo.recoveryMultiplier || 1)));
        const liquidOozeActive = normalizeAbilityName(defenderAbility) === 'liquid-ooze';
        if (liquidOozeActive) {
          const hpBefore = battleData.chp;
          const oozeDamage = Math.min(adjustedLeech, hpBefore);
          battleData.chp = Math.max(0, hpBefore - oozeDamage);
          battleData.tem[battleData.c] = Math.max(0, (battleData.tem[battleData.c] || hpBefore) - oozeDamage);
          msgLocal += '\n-> <b>'+c(op.name)+'</b>\'s <b>Liquid Ooze</b> activated!';
          msgLocal += '\n-> <b>'+c(p.name)+'</b> lost <code>'+oozeDamage+'</code> HP from Leech Seed!';
        } else {
          const hpBefore = battleData.chp;
          battleData.chp = Math.min(stats1.hp, battleData.chp + adjustedLeech);
          const healed = Math.max(0, battleData.chp - hpBefore);
          battleData.tem[battleData.c] = Math.min(stats1.hp, Math.max(0, (battleData.tem[battleData.c] || hpBefore) + healed));
          if (healed > 0) {
            msgLocal += '\n-> <b>'+c(p.name)+'</b> restored <code>'+healed+'</code> HP from Leech Seed.';
          }
        }
      }

      if (didAttemptMove && moveKey) {
        if (!battleData.lastMoveByPass || typeof battleData.lastMoveByPass !== 'object') {
          battleData.lastMoveByPass = {};
        }
        battleData.lastMoveByPass[String(battleData.c)] = moveKey;
        if (!battleData.choiceLockedMoves || typeof battleData.choiceLockedMoves !== 'object') {
          battleData.choiceLockedMoves = {};
        }
        if (attackerHeldItemInfo.choiceItemActive) {
          battleData.choiceLockedMoves[String(battleData.c)] = moveKey;
        } else {
          delete battleData.choiceLockedMoves[String(battleData.c)];
        }
      }

      // Reveal Used Move
      if (!battleData.usedMoves) battleData.usedMoves = {};
      if (!battleData.usedMoves[battleData.c]) battleData.usedMoves[battleData.c] = [];
      if (!battleData.usedMoves[battleData.c].includes(act.id)) battleData.usedMoves[battleData.c].push(act.id);

      turnLogs += msgLocal;
    }

    if (switchActions.length > 0) {
      for (const act of actions) {
        if (act.type === 'switch') {
          await applySwitchAction(act);
        }
      }
      dbg('resolve:after_switches', { bword, cid: battleData.cid, oid: battleData.oid, c: battleData.c, o: battleData.o });
      if (moveActions.length === 1) {
        if (String(battleData.cid) !== String(moveActions[0].cid)) {
          fullSwap(battleData);
        }
        await executeStandardMove(moveActions[0]);
      }
    } else {
      if (String(battleData.cid) !== String(orderedActions[0].cid)) {
        fullSwap(battleData);
      }
      await executeStandardMove(orderedActions[0]);

      if (battleData.ohp > 0 && battleData.chp > 0) { // both must be alive
        fullSwap(battleData); // Context swap so opponent becomes Attacker
        await executeStandardMove(orderedActions[1]);
      }
    }

    // What if someone fainted?
    if (battleData.chp <= 0 || battleData.ohp <= 0) {
      if (battleData.ohp <= 0 && battleData.chp > 0) {
        fullSwap(battleData); // ensure cid points to the fainted pokemon so UI logic works below
      }
    } else {
      // Nobody fainted, just pick the next selector.
      fullSwap(battleData);
    }

    if (battleData.chp > 0 && battleData.ohp > 0) {
      const endTurnAttacker = await getUserData(battleData.cid);
      const endTurnDefender = await getUserData(battleData.oid);
      const endTurnCurrent = endTurnAttacker.pokes.filter((poke)=>poke.pass==battleData.c)[0];
      const endTurnOther = endTurnDefender.pokes.filter((poke)=>poke.pass==battleData.o)[0];
      const endTurnCurrentStats = endTurnCurrent
        ? await Stats(pokestats[endTurnCurrent.name], endTurnCurrent.ivs, endTurnCurrent.evs, c(endTurnCurrent.nature), plevel(endTurnCurrent.name, endTurnCurrent.exp))
        : null;
      const endTurnOtherStats = endTurnOther
        ? await Stats(pokestats[endTurnOther.name], endTurnOther.ivs, endTurnOther.evs, c(endTurnOther.nature), plevel(endTurnOther.name, endTurnOther.exp))
        : null;
      if (endTurnCurrent) {
        turnLogs += applyAbilityEndTurn({
          battleData,
          pass: battleData.c,
          pokemonName: endTurnCurrent.name,
          abilityName: endTurnCurrent.ability,
          heldItem: endTurnCurrent.held_item,
          maxHp: endTurnCurrentStats ? endTurnCurrentStats.hp : 0,
          c
        }).message;
        turnLogs += await applyPowerConstructEndTurn({
          battleData,
          pass: battleData.c,
          pokemon: endTurnCurrent,
          ownerData: endTurnAttacker,
          maxHp: endTurnCurrentStats ? endTurnCurrentStats.hp : 0,
          currentHpKey: 'chp',
          teamKey: 'tem'
        });
        turnLogs += applyWeatherEndTurn({
          battleData,
          pass: battleData.c,
          pokemonName: endTurnCurrent.name,
          pokemonTypes: pokes[endTurnCurrent.name]?.types || [],
          abilityName: endTurnCurrent.ability,
          heldItem: endTurnCurrent.held_item,
          maxHp: endTurnCurrentStats ? endTurnCurrentStats.hp : 0,
          c
        }).message;
      }
      if (endTurnOther) {
        turnLogs += applyAbilityEndTurn({
          battleData,
          pass: battleData.o,
          pokemonName: endTurnOther.name,
          abilityName: endTurnOther.ability,
          heldItem: endTurnOther.held_item,
          maxHp: endTurnOtherStats ? endTurnOtherStats.hp : 0,
          c
        }).message;
        turnLogs += await applyPowerConstructEndTurn({
          battleData,
          pass: battleData.o,
          pokemon: endTurnOther,
          ownerData: endTurnDefender,
          maxHp: endTurnOtherStats ? endTurnOtherStats.hp : 0,
          currentHpKey: 'ohp',
          teamKey: 'tem2'
        });
        turnLogs += applyWeatherEndTurn({
          battleData,
          pass: battleData.o,
          pokemonName: endTurnOther.name,
          pokemonTypes: pokes[endTurnOther.name]?.types || [],
          abilityName: endTurnOther.ability,
          heldItem: endTurnOther.held_item,
          maxHp: endTurnOtherStats ? endTurnOtherStats.hp : 0,
          c
        }).message;
      }
      turnLogs += advanceBattleWeather(battleData, c).message;
      for (const info of [
        { pass: battleData.c, userData: endTurnAttacker, currentHpKey: 'chp', teamKey: 'tem' },
        { pass: battleData.o, userData: endTurnDefender, currentHpKey: 'ohp', teamKey: 'tem2' }
      ]) {
        const state = getBattleDynamaxState(battleData, info.pass);
        if (!state) continue;
        state.turnsLeft = Math.max(0, Number(state.turnsLeft || 0) - 1);
        if (state.turnsLeft <= 0) {
          turnLogs += await revertBattleDynamaxForPass({
            battleData,
            pass: info.pass,
            userData: info.userData,
            currentHpKey: info.currentHpKey,
            teamKey: info.teamKey
          });
        }
      }
      await saveUserData2(battleData.cid, endTurnAttacker);
      await saveUserData2(battleData.oid, endTurnDefender);
    }

    tickScreensForTurn(battleData);

    await saveBattleData(bword, battleData);
    dbg('resolve:done', { bword, cid: battleData.cid, oid: battleData.oid, c: battleData.c, o: battleData.o, chp: battleData.chp, ohp: battleData.ohp });

    const attacker = await getUserData(battleData.cid)
    const defender = await getUserData(battleData.oid)
    const p1 = attacker.pokes.filter((poke)=>poke.pass==battleData.c)[0]
    const p2 = defender.pokes.filter((poke)=>poke.pass==battleData.o)[0]
    setBattleWeatherNegationState({
      battleData,
      activeAbilities: [p1 && p1.ability, p2 && p2.ability]
    });
    const pp = pokes[p1.name]
    const pp2 = pokes[p2.name]
    const base1 = pokestats[p2.name]
    const base2 = pokestats[p1.name]
    const level1 = plevel(p2.name,p2.exp)
    const level2 = plevel(p1.name,p1.exp)
    const stats1 = await Stats(base1,p2.ivs,p2.evs,c(p2.nature),level1)
    const stats2 = await Stats(base2,p1.ivs,p1.evs,c(p1.nature),level2)

    let msg = turnLogs;

    const messageData = await loadMessageData();
    messageData[bword] = { chat:ctx.chat.id,mid: ctx.callbackQuery.message.message_id, times: Date.now(),turn:battleData.cid,oppo:battleData.oid };
    await saveMessageData(messageData);

    if(battleData.chp < 1){
      msg += '\n\n<b>'+c(p1.name)+'</b> has fainted. Choose your next pokemon.'
      if(!battleData.set.sandbox){
        await incexp(defender,p2,attacker,p1,ctx,battleData,bot)
        await incexp2(attacker,p1,defender,p2,ctx,battleData,bot)
      }
      const av = []
      const al = []
      let b = 1
      for(const pok in battleData.tem){
        if(battleData.tem[pok] > 0){
          const ppe = attacker.pokes.filter((poke)=>poke.pass == pok)[0]
          av.push({name:b,pass:pok})
          al.push(pok)
        }else{
          av.push({name:b+' (0 HP)',pass:pok})
        }
        b++;
      }
      if(al.length < 1){
        const rewardLp = 50
        if(!Number.isFinite(defender.inv.league_points)){
          defender.inv.league_points = 0
        }
        defender.inv.league_points += rewardLp
        if(!defender.inv.win){
          defender.inv.win = 0
        }
        defender.inv.win += 1
        if(!attacker.inv.lose){
          attacker.inv.lose = 0
        }
        attacker.inv.lose += 1
        if(battleData.tempBattle && battleData.tempTeams){
          const t1 = battleData.tempTeams[battleData.cid] || []
          const t2 = battleData.tempTeams[battleData.oid] || []
          attacker.pokes = (attacker.pokes || []).filter(p => !t1.includes(p.pass))
          defender.pokes = (defender.pokes || []).filter(p => !t2.includes(p.pass))
          if(attacker.extra && attacker.extra.temp_battle){
            delete attacker.extra.temp_battle[bword]
          }
          if(defender.extra && defender.extra.temp_battle){
            delete defender.extra.temp_battle[bword]
          }
        }
        revertPowerConstructFormsOnBattleEnd(battleData, attacker)
        revertPowerConstructFormsOnBattleEnd(battleData, defender)
        revertTrackedFormsOnBattleEnd(battleData, attacker)
        revertTrackedFormsOnBattleEnd(battleData, defender)
        await saveUserData2(battleData.cid,attacker)
        await saveUserData2(battleData.oid,defender)
        const messageData = await loadMessageData();
        messageData.battle = messageData.battle.filter((chats)=> chats!==parseInt(messageData[bword].turn) && chats!==parseInt(messageData[bword].oppo))
        delete messageData[bword];
        await saveMessageData(messageData);
        await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'<b>'+c(p1.name)+' </b>has fainted.\n<a href="tg://user?id='+battleData.cid+'"><b>'+displayName(attacker,battleData.cid)+'</b></a> lost against <a href="tg://user?id='+battleData.oid+'"><b>'+displayName(defender,battleData.oid)+'</b></a>.\n+'+rewardLp+' LP ⭐',{parse_mode:'HTML'})
        if(Math.random()< 0.00005){
          const idr = (Math.random()<0.5) ? battleData.oid : battleData.cid
          const dr = await getUserData(idr)
          await sendMessage(ctx,ctx.chat.id,{parse_mode:'HTML'},'<a href="tg://user?id='+idr+'"><b>'+displayName(dr,idr)+'</b></a>, A <b>Move Tutor</b> was watching your match. He wants to <b>Teach</b> one of your <b>Pokemon</b> a <b>Move.</b>',{reply_markup:{inline_keyboard:[[{text:'Go',url:'t.me/'+bot.botInfo.username+''}]]}})
          const options = {
            timeZone: 'Asia/Kolkata',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true,
          };

          const d = new Date().toLocaleString('en-US', options)
          const my = String(tutors[Math.floor(Math.random()*tutors.length)])
          const m77 = await sendMessage(ctx,idr,'While you were <b>Battling</b> with a trainer, An expert <b>Move Tutor</b> saw your battle very interestingly. He Impressed with your <b>Battle</b> experience and strategy. He wants to <b>Teach</b> your any of <b>Pokemon</b> a move. It will be available only for next <b>15 Minutes.</b>\n\n✦ <b>'+c(dmoves[my].name)+'</b> ['+c(dmoves[my].type)+' '+emojis[dmoves[my].type]+']\n<b>Power:</b> '+dmoves[my].power+', <b>Accuracy:</b> '+dmoves[my].accuracy+' (<i>'+c(dmoves[my].category)+'</i>) \n\n• Click below to <b>Select</b> pokemon to teach <b>'+c(dmoves[my].name)+'</b>',{parse_mode:'html',reply_markup:{inline_keyboard:[[{text:'Select',callback_data:'tyrt_'+my+'_'+d+''}]]}})
          const mdata = await loadMessageData();
          if(!mdata.tutor){
            mdata.tutor = {}
          }
          mdata.tutor[m77.message_id] = {chat:idr,tdy:d,mv:dmoves[my].name}
          await saveMessageData(mdata)
        }
      }else{
        const buttons = av.map((poke) => ({ text: poke.name, callback_data: 'multidne_' + poke.pass + '_' + bword + '_'+battleData.cid+'_fainted' }));
        while (buttons.length < 6) {
          buttons.push({ text: '  ', callback_data: 'empty' });
        }
        const rows = [[{text:'View Team',callback_data:'viewteam_'+bword+'_'+battleData.cid+''}]];
        for (let i = 0; i < buttons.length; i += 2) {
          rows.push(buttons.slice(i, i + 2));
        }
        await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'HTML',reply_markup:{inline_keyboard:rows}})
        return true;
      }
      return true;
    }
    const isGroupMmo = ctx.chat.type !== 'private';
    const pvpMmo = buildPvpMsg(msg, battleData, attacker, defender, p1, p2, stats1, stats2, bword, isGroupMmo);
    await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,pvpMmo.msg,{parse_mode:'HTML',reply_markup:pvpMmo.keyboard,...pvpMmo.ext})
    return true;
  }

bot.action(/sytbr_/,async ctx => {
const id = ctx.callbackQuery.data.split('_')[1]
const rid = ctx.callbackQuery.data.split('_')[2]
const bword = ctx.callbackQuery.data.split('_')[3]
if(ctx.from.id==id){
const bt = ['max-poke','min-/-max-6l','min-/-max-level','switch','form-change','sandbox-mode','random-mode','preview-mode','types-lock','regions-lock','type-efficiency','dual-type','save-settings']
const buttons = bt.map((word) => ({ text: '• '+c(word), callback_data: 'stbtlsyt_'+word+'_'+id+'_'+rid+'_'+bword+'' }));
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_back_'+id+'_'+rid+'_'+bword+''})
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
}
const d1 = await getUserData(id)
const d2 = await getUserData(rid)
await editMessage('markup',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,{inline_keyboard:rows})
}
})
bot.action(/stbtlsyt_/,async ctx => {
const word = ctx.callbackQuery.data.split('_')[1]
const id = ctx.callbackQuery.data.split('_')[2]
const rid = ctx.callbackQuery.data.split('_')[3]
const bword = ctx.callbackQuery.data.split('_')[4]
if(ctx.from.id!=id){
return
}
let settings3 = {};
    try {
      settings3 = loadBattleData(bword);
} catch (error) {
      settings3 = {};
    }
settings3.set = normalizeBattleSettings(settings3.set)
const settings = settings3.set
const d1 = await getUserData(id)
const d2 = await getUserData(rid)
const challanger = displayName(d1, id)
const challanged = displayName(d2, rid)
let msg = '⚔️ <a href="tg://user?id='+id+'"><b>'+challanger+'</b></a> Has Challenged <a href="tg://user?id='+rid+'"><b>'+challanged+'</b></a>\n'
let f = false
let msg2 = ''
if(word=='maxs'){
const m = ctx.callbackQuery.data.split('_')[5]
settings.max_poke = parseInt(m*1)
if(settings.max_poke < settings.min_6l){
settings.min_6l = settings.max_poke
}
}
if(word=='min6l'){
const m = ctx.callbackQuery.data.split('_')[5]
settings.min_6l = parseInt(m*1)
if(settings.min_6l > settings.max_6l){
settings.max_6l = 6
}
if(settings.max_poke < settings.min_6l){
settings.max_poke = settings.min_6l
}
}
if(word=='max6l'){
const m = ctx.callbackQuery.data.split('_')[5]
settings.max_6l = parseInt(m*1)
if(settings.min_6l > settings.max_6l){
settings.min_6l = 0
}
}
if(word=='minlv'){
const m = ctx.callbackQuery.data.split('_')[5]
settings.min_level = parseInt(m*1)
if(settings.max_level < settings.min_level){
settings.max_level = 100
}
}
if(word=='maxlv'){
const m = ctx.callbackQuery.data.split('_')[5]
settings.max_level = parseInt(m*1)
if(settings.min_level > settings.max_level){
settings.min_level = 1
}
}
if(word=='switch'){
settings.switch = (settings.switch==true) ? false : true
}
if(word=='type-efficiency'){
settings.type_effects = (settings.type_effects==true) ? false : true
}
if(word=='form-change'){
settings.key_item = (settings.key_item==true) ? false : true
}
if(word=='sandbox-mode'){
settings.sandbox = (settings.sandbox==true) ? false : true
}
if(word=='preview-mode'){
if(settings.preview=='Upper'){
settings.preview = 'Down'
}else if(settings.preview=='Down'){
settings.preview = 'no'
}else if(settings.preview=='no'){
settings.preview = 'Upper'
}else{
settings.preview = 'Upper'
}
}
if(word=='random-mode'){
settings.random = (settings.random==true) ? false : true
}
if(word=='pin-mode'){
settings.pin = (settings.pin==true) ?false : true
}
if(word=='dual-type'){
settings.dual_type = (settings.dual_type==true) ?false : true
}
if(word=='allowty'){
const ty = ctx.callbackQuery.data.split('_')[5]
if(settings.allow_types.includes(ty)){
settings.allow_types = settings.allow_types.filter((ty2)=>ty2!=ty)
}else{
settings.allow_types.push(ty)
if(settings.allow_types.length > 4){
ctx.answerCbQuery('Max 4 Types can be only allowed.')
return
}
}
settings.ban_types = []
}
if(word=='banty'){
const ty = ctx.callbackQuery.data.split('_')[5]
if(settings.ban_types.includes(ty)){
settings.ban_types = settings.ban_types.filter((ty2)=>ty2!=ty)
}else{
settings.ban_types.push(ty)
if(settings.ban_types.length > 4){
ctx.answerCbQuery('Max 4 Types can be banned.')
return
}
}
settings.allow_types = []
}
if(word=='allowrg'){
const ty = ctx.callbackQuery.data.split('_')[5]
if(settings.allow_regions.includes(ty)){
settings.allow_regions = settings.allow_regions.filter((ty2)=>ty2!=ty)
}else{
settings.allow_regions.push(ty)
if(settings.allow_regions.length > 4){
ctx.answerCbQuery('Max 4 Regions can be only allowed.')
return
}
}
settings.ban_regions = []
}
if(word=='banrg'){
const ty = ctx.callbackQuery.data.split('_')[5]
if(settings.ban_regions.includes(ty)){
settings.ban_regions = settings.ban_regions.filter((ty2)=>ty2!=ty)
}else{
settings.ban_regions.push(ty)
if(settings.ban_regions.length > 4){
ctx.answerCbQuery('Max 4 regions can be banned.')
return
}
}
settings.allow_regions = []
}
for (let key in settings3.users) {
    settings3.users[key] = false;
  }
await saveBattleData(bword, settings3);
if(settings.max_poke < 6){
f = true
msg2 += '\n<b>• Max number of pokemon:</b> '+settings.max_poke+''
}
if(settings.min_6l > 0 || settings.max_6l < 6){
f = true
msg2 += '\n<b>• Number of legendaries:</b> '+settings.min_6l+'-'+settings.max_6l+''
}
if(settings.min_level > 1 || settings.max_level < 100){
f = true
msg2 += '\n<b>• Level gap of pokemon:</b> '+settings.min_level+'-'+settings.max_level+''
}
if(!settings.switch){
f = true
msg2 += '\n<b>• Switching pokemon:</b> Disabled'
}
if(!settings.key_item){
f = true
msg2 += '\n<b>• Form Changing:</b> Disabled'
}
if(settings.sandbox){
f = true
msg2 += '\n<b>• Sandbox mode:</b> Enabled'
}
if(settings.random){
f = true
msg2 += '\n<b>• Random mode:</b> Enabled'
}
if(settings.preview && settings.preview!= 'no'){
f = true
msg2 += '\n<b>• Preview mode:</b> '+settings.preview+''
}
if(settings.pin){
f = true
msg2 += '\n<b>• Pin mode:</b> Enabled'
}
if(!settings.type_effects){
f = true
msg2 += '\n<b>• Type efficiency:</b> Disabled'
}
if(!settings.dual_type){
f = true
msg2 += '\n<b>• Dual Types:</b> Disabled'
}
if(settings.allow_regions.length > 0){
f = true
msg2 += '\n<b>• Only regions:</b> ['+c(settings.allow_regions.join(' , '))+']'
}
if(settings.ban_regions.length > 0){
f = true
msg2 += '\n<b>• Banned regions:</b> ['+c(settings.ban_regions.join(' , '))+']'
}
if(settings.ban_types.length > 0){
f = true
msg2 += '\n<b>• Banned types:</b> ['+c(settings.ban_types.join(' , '))+']'
}
if(settings.allow_types.length > 0){
f = true
msg2 += '\n<b>• Types:</b> ['+c(settings.allow_types.join(' , '))+']'
}

if(settings3.users[id]){
var em1 = '✅'
}else{
var em1 = '❌'
}
if(settings3.users[rid]){
var em2 = '✅'
}else{
var em2 = '❌'
}

if(f){
msg += msg2
msg += '\n\n-> <a href="tg://user?id='+id+'"><b>'+challanger+'</b></a> : '+em1+'\n-> <a href="tg://user?id='+rid+'"><b>'+challanged+'</b></a> : '+em2+''
}else{
msg += '\n\n-> <a href="tg://user?id='+id+'"><b>'+challanger+'</b></a> : '+em1+'\n-> <a href="tg://user?id='+rid+'"><b>'+challanged+'</b></a> : '+em2+''
}
if(word=='ban-regions'){
const bt = ['kanto', 'jhoto', 'hoenn', 'sinnoh', 'unova', 'kalos', 'alola', 'galar', 'paldea']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_banrg_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_regions-lock_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 4) {
    rows.push(buttons.slice(i, i + 4));
}
msg += '\n\nSelect <b>Banned Regions</b> of pokemon in each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='allow-regions'){
const bt = ['kanto', 'jhoto', 'hoenn', 'sinnoh', 'unova', 'kalos', 'alola', 'galar', 'paldea']
const buttons = bt.map((word) => ({ text: settings.allow_types.includes(word) ? c(word)+' ✅' : c(word), callback_data: 'stbtlsyt_allowrg_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_regions-lock_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 4) {
    rows.push(buttons.slice(i, i + 4));
}
msg += '\n\nSelect <b>Allow Only Regions</b> of pokemon in each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}

if(word=='regions-lock'){
const bt = ['ban-regions','allow-regions']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_'+word+'_'+id+'_'+rid+'_'+bword+'' }));
  const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_bac_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
}
msg += '\n\nSelect to <b>Ban / Allow Regions</b> of pokemon in each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='allowrg'){
const bt = ['kanto', 'jhoto', 'hoenn', 'sinnoh', 'unova', 'kalos', 'alola', 'galar', 'paldea']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_allowrg_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_regions-lock_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 4) {
    rows.push(buttons.slice(i, i + 4));
}
msg += '\n\nSelect <b>Allow Only Regions</b> of pokemon in each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='banrg'){
const bt = ['kanto', 'jhoto', 'hoenn', 'sinnoh', 'unova', 'kalos', 'alola', 'galar', 'paldea']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_banrg_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_regions-lock_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 4) {
    rows.push(buttons.slice(i, i + 4));
}
msg += '\n\nSelect <b>Banned Regions</b> of pokemon in each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='allowty'){
const bt = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost',  'dragon', 'dark', 'steel', 'fairy']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_allowty_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_types-lock_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 4) {
    rows.push(buttons.slice(i, i + 4));
}
msg += '\n\nSelect <b>Allow Only Types</b> of pokemon in each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='banty'){
const bt = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_banty_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_types-lock_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 4) {
    rows.push(buttons.slice(i, i + 4));
}
msg += '\n\nSelect <b>Banned Types</b> of pokemon in each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='max-poke'){
const bt = ['1','2','3','4','5','6']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_maxs_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
  const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_bac_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 3) {
    rows.push(buttons.slice(i, i + 3));
}
msg += '\n\nSelect <b>Max Number</b> of pokemon each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='min-/-max-6l'){
const bt = ['min-6l','max-6l']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_'+word+'_'+id+'_'+rid+'_'+bword+'' }));
  const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_bac_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
}
msg += '\n\nSelect <b>Min / Max Legendaries</b> of pokemon each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='ban-types'){
const bt = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_banty_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_types-lock_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 4) {
    rows.push(buttons.slice(i, i + 4));
}
msg += '\n\nSelect <b>Banned Types</b> of pokemon in each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='allow-types'){
const bt = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost',  'dragon', 'dark', 'steel', 'fairy']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_allowty_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_types-lock_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 4) {
    rows.push(buttons.slice(i, i + 4));
}
msg += '\n\nSelect <b>Allow Only Types</b> of pokemon in each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}



if(word=='types-lock'){
const bt = ['ban-types','allow-types']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_'+word+'_'+id+'_'+rid+'_'+bword+'' }));
  const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_bac_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
}
msg += '\n\nSelect to <b>Ban / Allow Types</b> of pokemon in each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='regions-lock'){
const bt = ['ban-regions','allow-regions']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_'+word+'_'+id+'_'+rid+'_'+bword+'' }));
  const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_bac_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
}
msg += '\n\nSelect to <b>Ban / Allow Regionss</b> of pokemon in each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='min-/-max-level'){
const bt = ['min-level','max-level']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_'+word+'_'+id+'_'+rid+'_'+bword+'' }));
  const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_bac_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
}
msg += '\n\nSelect <b>Min / Max Level</b> of each pokemon in team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='min-level'){
const bt = ['1-10','11-20','21-30','31-40','41-50','51-60','61-70','71-80','81-90','91-100']
const buttons = bt.map((word) => ({ text: word, callback_data: 'stbtlsyt_minlevel_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
  const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_min-/-max-level_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 3) {
    rows.push(buttons.slice(i, i + 3));
}
msg += '\n\nSelect <b>Min Level</b> of each pokemon in team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='maxlevel'){
const yu = ctx.callbackQuery.data.split('_')[5]
const bt = Array.from({ length: (yu.split('-')[1]*1-yu.split('-')[0]*1+1)}, (_, i) => (i + yu.split('-')[0]*1).toString());
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_maxlv_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
  const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_max-level_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 5) {
    rows.push(buttons.slice(i, i + 5));
}
msg += '\n\nSelect <b>Max Level</b> of each pokemon of teams can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='minlevel'){
const yu = ctx.callbackQuery.data.split('_')[5]
const bt = Array.from({ length: (yu.split('-')[1]*1-yu.split('-')[0]*1+1)}, (_, i) => (i + yu.split('-')[0]*1).toString());
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_minlv_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
  const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_min-level_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 5) {
    rows.push(buttons.slice(i, i + 5));
}
msg += '\n\nSelect <b>Min Level</b> of each pokemon of teams can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='max-level'){
const bt = ['1-10','11-20','21-30','31-40','41-50','51-60','61-70','71-80','81-90','91-100']
const buttons = bt.map((word) => ({ text: word, callback_data: 'stbtlsyt_maxlevel_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
  const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_min-/-max-level_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 3) {
    rows.push(buttons.slice(i, i + 3));
}
msg += '\n\nSelect <b>Max Level</b> of each pokemon in team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}

if(word=='min-6l'){
const bt = ['0','1','2','3','4','5','6']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_min6l_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
  const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_min-/-max-6l_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 3) {
    rows.push(buttons.slice(i, i + 3));
}
msg += '\n\nSelect <b>Min Legendaries</b> of pokemon each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='max-6l'){
const bt = ['0','1','2','3','4','5','6']
const buttons = bt.map((word) => ({ text: c(word), callback_data: 'stbtlsyt_max6l_'+id+'_'+rid+'_'+bword+'_'+word+'' }));
  const rows = [];
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_min-/-max-6l_'+id+'_'+rid+'_'+bword+''})
  for (let i = 0; i < buttons.length; i += 3) {
    rows.push(buttons.slice(i, i + 3));
}
msg += '\n\nSelect <b>Max Legendaries</b> of pokemon each team can have.'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
return
}
if(word=='save-settings'){
const data = await getUserData(ctx.from.id)
data.settings = settings
await saveUserData2(ctx.from.id,data)
ctx.answerCbQuery('Settings Saved!')
return
}
if(word=='back'){
var rows = [[{text:'Agree ✅',callback_data:'battle_'+id+'_'+rid+'_'+bword+''},{text:'Reject ❌',callback_data:'reject_'+id+'_'+rid+'_'+bword+''}],[{text:'Battle Settings ⚔️',callback_data:'sytbr_'+id+'_'+rid+'_'+bword+''}]]
}else{
msg += '\n\nUse /settings to get more info about battle settings.'
const bt = ['max-poke','min-/-max-6l','min-/-max-level','switch','form-change','sandbox-mode','random-mode','preview-mode','types-lock','regions-lock','type-efficiency','dual-type','save-settings']
const buttons = bt.map((word) => ({ text: '• '+c(word), callback_data: 'stbtlsyt_'+word+'_'+id+'_'+rid+'_'+bword+'' }));
buttons.push({text:'🔙 Back',callback_data:'stbtlsyt_back_'+id+'_'+rid+'_'+bword+''})
  var rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
}
}
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'html',reply_markup:{inline_keyboard:rows}})
})
bot.action(/battle_/,async ctx => {
if (hitBattleCooldown(ctx)) {
  await ctx.answerCbQuery('On cooldown 2 sec');
  return;
}
const id1 = ctx.callbackQuery.data.split('_')[1]
const id2 = ctx.callbackQuery.data.split('_')[2]
if(String(ctx.from.id) !== String(id2)){
if(String(ctx.from.id) === String(id1)){
ctx.answerCbQuery('Waiting for opponent to accept')
}else{
ctx.answerCbQuery('Not your challenge')
}
return
}
const mdata = await loadMessageData();
if(Array.isArray(mdata.battle) && mdata.battle.includes(parseInt(ctx.from.id))){
ctx.answerCbQuery('You Are In A Battle')
return
}
const bword = ctx.callbackQuery.data.split('_')[3]
let battleData = {};
    try {
      battleData = loadBattleData(bword);
} catch (error) {
      battleData = {};
    }
battleData.set = normalizeBattleSettings(battleData.set)
const otherPendingUserId = Object.keys(battleData.users || {}).filter((id)=> String(id) != String(ctx.from.id))[0]
if(otherPendingUserId && Array.isArray(mdata.battle) && mdata.battle.includes(parseInt(otherPendingUserId))){
ctx.answerCbQuery('Opponent Is In A Battle')
return
}
if(battleData.users && battleData.users[ctx.from.id]){
ctx.answerCbQuery('Wait For Opponent To Accept')
return
}
  const data = await getUserData(id1);
  const data2 = await getUserData(id2);
  if(!data || !Array.isArray(data.pokes) || !data.inv || !data.teams){
  ctx.answerCbQuery('One of the players has no battle data. Ask them to /start and set a team.',{show_alert:true})
  return
  }
  if(!data2 || !Array.isArray(data2.pokes) || !data2.inv || !data2.teams){
  ctx.answerCbQuery('One of the players has no battle data. Ask them to /start and set a team.',{show_alert:true})
  return
  }
  let pokes1 = []
  let pokes2 = []
  const useTempTeams = battleData.tempTeams && battleData.tempTeams[id1] && battleData.tempTeams[id2];
  if(!useTempTeams && !battleData.set.random){
  const team1 = data.teams[data.inv.team]
  const team2 = data2.teams[data2.inv.team]
  if(!Array.isArray(team1) || team1.length < 1 || !Array.isArray(team2) || team2.length < 1){
  ctx.answerCbQuery('Both players must have a valid team selected to accept the battle.',{show_alert:true})
  return
  }
  }
  if(useTempTeams){
  pokes1 = battleData.tempTeams[id1]
  pokes2 = battleData.tempTeams[id2]
  }else if(battleData.set.random){
  pokes1 = data.pokes.map(p => p.pass)
  pokes2 = data2.pokes.map(p => p.pass)
  }else{
  pokes1 = data.teams[data.inv.team]
  pokes2 = data2.teams[data2.inv.team]
  }
  const skipTempFilters = useTempTeams && battleData.tempBattle;
  if(!skipTempFilters && (battleData.set.min_level > 1 || battleData.set.max_level < 100)){
  pokes1 = pokes1.filter(p=> {
  const pk = data.pokes.find(pok=>pok.pass == p)
  return pk && plevel(pk.name,pk.exp) >= battleData.set.min_level*1 && plevel(pk.name,pk.exp) <= battleData.set.max_level*1
  })
  pokes2 = pokes2.filter(p=> {
const pk = data2.pokes.find(pok=>pok.pass == p)
return pk && plevel(pk.name,pk.exp) >= battleData.set.min_level*1 && plevel(pk.name,pk.exp) <= battleData.set.max_level*1
})
}
  if(!skipTempFilters && !battleData.set.dual_type){
  pokes1 = pokes1.filter(p=> {
  const pk = data.pokes.find(pok=>pok.pass == p)
  return pk && pokes[pk.name].types.length == 1
  })
  pokes2 = pokes2.filter(p=> {
const pk = data2.pokes.find(pok=>pok.pass == p)
return pk && pokes[pk.name].types.length == 1
})
}
  if(!skipTempFilters && battleData.set.allow_types.length > 0){
  pokes1 = pokes1.filter(p=> {
  const pk = data.pokes.find(pok=>pok.pass == p)
  return pk && pokes[pk.name].types.every(type => battleData.set.allow_types.includes(type))
  })
  pokes2 = pokes2.filter(p=> {
const pk = data2.pokes.find(pok=>pok.pass == p)
return pk && pokes[pk.name].types.every(type => battleData.set.allow_types.includes(type))
})
}
  if(!skipTempFilters && battleData.set.ban_types.length > 0){
  pokes1 = pokes1.filter(p=> {
  const pk = data.pokes.find(pok=>pok.pass == p)
  return pk && pokes[pk.name].types.every(type => !battleData.set.ban_types.includes(type))
  })
  pokes2 = pokes2.filter(p=> {
const pk = data2.pokes.find(pok=>pok.pass == p)
return pk && pokes[pk.name].types.every(type => !battleData.set.ban_types.includes(type))
})
}
const prg = {
  "kanto": {
    "start": 1,
    "end": 151
  },
  "johto": {
    "start": 152,
    "end": 251
  },
  "hoenn": {
    "start": 252,
    "end": 386
  },
  "sinnoh": {
    "start": 387,
    "end": 493
  },
  "unova": {
    "start": 494,
    "end": 649
  },
  "kalos": {
    "start": 650,
    "end": 721
  },
  "alola": {
    "start": 722,
    "end": 809
  },
  "galar": {
    "start": 810,
    "end": 898
  },
  "paldea": {
     "start":899,
     "end":1025
  }
}

 if(!skipTempFilters && battleData.set.allow_regions.length > 0){
 pokes1 = pokes1.filter(p => {
 const pk = data.pokes.find(pok=>pok.pass == p)
 return pk && battleData.set.allow_regions.some(region => (pokes[pk.name].pokedex_number >= prg[region].start && pokes[pk.name].pokedex_number <= prg[region].end) || (pk.name.includes(region)))
 })
 pokes2 = pokes2.filter(p => {
const pk = data2.pokes.find(pok=>pok.pass == p)
return pk && battleData.set.allow_regions.some(region => (pokes[pk.name].pokedex_number >= prg[region].start && pokes[pk.name].pokedex_number <= prg[region].end) || (pk.name.includes(region)))
})
}
 if(!skipTempFilters && battleData.set.ban_regions.length > 0){
 pokes1 = pokes1.filter(p => {
 const pk = data.pokes.find(pok=>pok.pass == p)
 return pk && !battleData.set.ban_regions.some(region => (pokes[pk.name].pokedex_number >= prg[region].start && pokes[pk.name].pokedex_number <= prg[region].end) || (pk.name.includes(region)))
 })
 pokes2 = pokes2.filter(p => {
const pk = data2.pokes.find(pok=>pok.pass == p)
return pk && !battleData.set.ban_regions.some(region => (pokes[pk.name].pokedex_number >= prg[region].start && pokes[pk.name].pokedex_number <= prg[region].end) || (pk.name.includes(region)))
})
}
 if(battleData.set.random && !useTempTeams){
const pk2 = []
const pk1 = []
const ls = pokes1.filter(p => {
const pk = data.pokes.find(pok=>pok.pass == p)
const tag = String(spawn[pk?.name] || '').toLowerCase()
return pk && (tag== 'legendry' || tag== 'legendary' || tag == 'mythical')
})
const ls2 = pokes2.filter(p => {
const pk = data2.pokes.find(pok=>pok.pass == p)
const tag = String(spawn[pk?.name] || '').toLowerCase()
return pk && (tag== 'legendry' || tag== 'legendary' || tag == 'mythical')
})
var pk2b = []
var pk1b = []
for(let i = 0; i < battleData.set.max_6l; i++){
const ls22 = ls2.filter(p => !pk2b.includes(p))
const ls1 = ls.filter(p => !pk1b.includes(p))
pk2b.push(ls22[Math.floor(Math.random() * ls22.length)])
pk1b.push(ls1[Math.floor(Math.random()* ls1.length)])
}
for(let i = 0; i < battleData.set.min_6l; i++){
const pk2bb = pk2b.filter(p => !pk2.includes(p))
const pk1bb = pk1b.filter(p => !pk1.includes(p))
pk2.push(pk2bb[Math.floor(Math.random() * pk2bb.length)])
pk1.push(pk1bb[Math.floor(Math.random()* pk1bb.length)])
}
for(let i = pk1.length; i < 6; i++){
const ls5 = pk1.filter(p => {
const pk = data.pokes.find(pok=>pok.pass == p)
const tag = String(spawn[pk?.name] || '').toLowerCase()
return pk && (tag== 'legendry' || tag== 'legendary' || tag == 'mythical')
})
if(ls5.length >= battleData.set.max_6l){
pokes1 = pokes1.filter(p => {
const pk = data.pokes.find(pok=>pok.pass == p)
return pk && spawn[pk.name].toLowerCase() !== 'legendry' && spawn[pk.name].toLowerCase()!== 'legendary' && spawn[pk.name].toLowerCase() !== 'mythical'
})
}
const rns = pokes1.filter((p)=>!pk1.includes(p))
const rnd = rns[Math.floor(Math.random() * rns.length)]
if(rnd){
pk1.push(rnd)
}
}
for(let i = pk2.length; i < 6; i++){
const ls5 = pk2.filter(p => {
const pk = data2.pokes.find(pok=>pok.pass == p)
const tag = String(spawn[pk?.name] || '').toLowerCase()
return pk && (tag== 'legendry' || tag== 'legendary' || tag == 'mythical')
})
if(ls5.length >= battleData.set.max_6l){
pokes2 = pokes2.filter(p => {
const pk = data2.pokes.find(pok=>pok.pass == p)
return pk && spawn[pk.name].toLowerCase() !== 'legendry' && spawn[pk.name].toLowerCase()!== 'legendary' && spawn[pk.name].toLowerCase() !== 'mythical'
})
}
const rns2 = pokes2.filter((p)=>!pk2.includes(p))
const rnd2 = rns2[Math.floor(Math.random()*rns2.length)]
if(rnd2){
pk2.push(rnd2)
}
}
pokes1 = pk1
pokes2 = pk2
}

pokes1 = pokes1.slice(0,battleData.set.max_poke*1)
pokes2 = pokes2.slice(0,battleData.set.max_poke*1)

battleData.users[ctx.from.id] = true
const leng = pokes1.filter(p => {
const pk = data.pokes.find(pok=>pok.pass == p)
const tag = String(spawn[pk?.name] || '').toLowerCase()
return pk && (tag== 'legendry' || tag== 'legendary' || tag == 'mythical')
})
const leng2 = pokes2.filter(p => {
const pk = data2.pokes.find(pok=>pok.pass == p)
const tag = String(spawn[pk?.name] || '').toLowerCase()
return pk && (tag== 'legendry' || tag== 'legendary' || tag == 'mythical')
})
if(pokes1.length < 1 || leng.length < battleData.set.min_6l || leng.length > battleData.set.max_6l){
battleData.users[id1] = false
}
if(pokes2.length < 1 || leng2.length < battleData.set.min_6l || leng2.length > battleData.set.max_6l){
battleData.users[id2] = false
}
 if(!battleData.users[ctx.from.id]){
 ctx.answerCbQuery('A valid team for this battle could not be formed')
 return
 }
await saveBattleData(bword, battleData);
if(Object.values(battleData.users).every(value => value === true)){
const mdata = await loadMessageData();
if(mdata.battle.includes(parseInt(id2))){
ctx.answerCbQuery('You Are In A Battle')
return
}
if(mdata.battle.includes(parseInt(id1))){
ctx.answerCbQuery('Opponent Is In A Battle')
return
}
var la = {}
var tem = {}
let spe = {}
const heldItems = {}
for(const p of pokes1){
const pk = data.pokes.filter((poke)=> poke.pass == p)
if(pk[0]){
    const base = getBattleBaseStats({ battleData, pass: pk[0].pass, pokemonName: pk[0].name, abilityName: pk[0].ability, pokestats })
const clevel = plevel(pk[0].name,pk[0].exp)
const stats = await Stats(base,pk[0].ivs,pk[0].evs,c(pk[0].nature),clevel)
la[pk[0].pass] = clevel
tem[pk[0].pass] = stats.hp
spe[pk[0].pass] = stats.speed
heldItems[pk[0].pass] = getSanitizedHeldItemForPokemon(pk[0], pk[0].held_item)
}
}
var la2 = {}
var tem2 = {}
let spe2 = {}
for(const p of pokes2){
const pk = data2.pokes.filter((poke)=> poke.pass == p)
if(pk[0]){
    const base = getBattleBaseStats({ battleData, pass: pk[0].pass, pokemonName: pk[0].name, abilityName: pk[0].ability, pokestats })
const clevel = plevel(pk[0].name,pk[0].exp)
const stats = await Stats(base,pk[0].ivs,pk[0].evs,c(pk[0].nature),clevel)
la2[pk[0].pass] = clevel
tem2[pk[0].pass] = stats.hp
spe2[pk[0].pass] = stats.speed
heldItems[pk[0].pass] = getSanitizedHeldItemForPokemon(pk[0], pk[0].held_item)
}
}
const user1poke = data.pokes.filter((poke)=>poke.pass==pokes1[0])[0]
const user2poke = data2.pokes.filter((poke)=>poke.pass==pokes2[0])[0]
if(!user1poke || !user2poke || !pokestats[user1poke?.name] || !pokestats[user2poke?.name]){
  try{
    const mdata = await loadMessageData();
    if(Array.isArray(mdata.battle)){
      mdata.battle = mdata.battle.filter((id)=> id !== parseInt(id1) && id !== parseInt(id2))
      await saveMessageData(mdata);
    }
  }catch(e){}
  ctx.answerCbQuery('Battle data invalid. Try again.');
  return
}
const base1 = pokestats[user1poke.name]
const base2 = pokestats[user2poke.name]
  ensureBattleStatus(battleData)
  const p1Lead = Object.keys(spe)[0]
  const p2Lead = Object.keys(spe2)[0]
  const speed1 = getEffectiveSpeed(spe[p1Lead], battleData, p1Lead, user1poke && user1poke.ability)
  const speed2 = getEffectiveSpeed(spe2[p2Lead], battleData, p2Lead, user2poke && user2poke.ability)
  const result = speed1 > speed2 ? p1Lead : p2Lead;
if(result in tem){
battleData.c = Object.keys(tem)[0]
battleData.chp = tem[battleData.c]
battleData.o = Object.keys(tem2)[0]
battleData.ohp = tem2[battleData.o]
battleData.cid = id1
battleData.oid = id2
battleData.tem = tem
battleData.la = la
battleData.tem2 = tem2
battleData.la2 = la2
battleData.heldItems = heldItems
battleData.ot = {}
battleData.ot[battleData.name] = battleData.ohp
}else if(result in tem2){
battleData.c = Object.keys(tem2)[0]
battleData.chp = tem2[battleData.c]
battleData.o = Object.keys(tem)[0]
battleData.ohp = tem[battleData.o]
battleData.cid = id2
battleData.oid = id1
battleData.tem = tem2
battleData.la = la2
battleData.tem2 = tem
battleData.la2 = la
battleData.heldItems = heldItems
battleData.ot = {}
battleData.ot[battleData.name] = battleData.ohp
}
await saveBattleData(bword, battleData);
const attacker = await getUserData(battleData.cid)
const defender = await getUserData(battleData.oid)
const p = attacker.pokes.filter((poke)=>poke.pass==battleData.c)[0]
const p2 = defender.pokes.filter((poke)=>poke.pass==battleData.o)[0]
if (p) {
syncBattleFormAndAbility({ battleData, pokemon: p, pass: p.pass })
}
if (p2) {
syncBattleFormAndAbility({ battleData, pokemon: p2, pass: p2.pass })
}
const pp = pokes[p.name]
const pp2 = pokes[p2.name]
if (!battleData.usedMoves) battleData.usedMoves = {};
const leadImpersonate1 = p ? activateImpersonateForPass({ battleData, pass: p.pass, pokemonName: p.name, abilityName: p.ability }) : ''
const leadImpersonate2 = p2 ? activateImpersonateForPass({ battleData, pass: p2.pass, pokemonName: p2.name, abilityName: p2.ability }) : ''
const initStats1 = await Stats(pokestats[p2.name], p2.ivs, p2.evs, c(p2.nature), plevel(p2.name, p2.exp));
const initStats2 = await Stats(pokestats[p.name], p.ivs, p.evs, c(p.nature), plevel(p.name, p.exp));
let initPrefix = '<b>* The Pokemon battle commences!</b>';
if (leadImpersonate1) {
  initPrefix += '\n-> <b>' + c(user1poke.name) + '</b>\'s <b>Impersonate</b> copied <b>' + c(leadImpersonate1) + '</b>!';
}
if (leadImpersonate2) {
  initPrefix += '\n-> <b>' + c(user2poke.name) + '</b>\'s <b>Impersonate</b> copied <b>' + c(leadImpersonate2) + '</b>!';
}
if (getAirBalloonInfo({ battleData, pass: p.pass, heldItem: p.held_item }).active) {
  initPrefix += '\n-> <b>' + c(p.name) + '</b>\'s <b>Air Balloon</b> is floating it above the ground!';
}
if (getAirBalloonInfo({ battleData, pass: p2.pass, heldItem: p2.held_item }).active) {
  initPrefix += '\n-> <b>' + c(p2.name) + '</b>\'s <b>Air Balloon</b> is floating it above the ground!';
}
initPrefix += applyAbilityEntry({
  battleData,
  pass: p.pass,
  pokemonName: p.name,
  abilityName: p.ability,
  heldItem: p.held_item,
  selfStats: initStats2,
  opponentStats: initStats1,
  opponentPass: p2.pass,
  opponentName: p2.name,
  opponentAbility: p2.ability,
  partyHpMap: battleData.tem,
  c
}).message;
initPrefix += applyAbilityEntry({
  battleData,
  pass: p2.pass,
  pokemonName: p2.name,
  abilityName: p2.ability,
  heldItem: p2.held_item,
  selfStats: initStats1,
  opponentStats: initStats2,
  opponentPass: p.pass,
  opponentName: p.name,
  opponentAbility: p.ability,
  partyHpMap: battleData.tem2,
  c
}).message;
initPrefix += setBattleWeatherNegationState({
  battleData,
  activeAbilities: [p.ability, p2.ability]
}).message;
const isGroupInit = ctx.chat.type !== 'private';
const pvpInit = buildPvpMsg(initPrefix, battleData, attacker, defender, p, p2, initStats1, initStats2, bword, isGroupInit);
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,pvpInit.msg,{parse_mode:'HTML',reply_markup:pvpInit.keyboard,...pvpInit.ext})
const messageData = await loadMessageData();
messageData.battle.push(parseInt(battleData.cid))
messageData.battle.push(parseInt(battleData.oid))
    messageData[bword] = { chat:ctx.chat.id,mid: ctx.callbackQuery.message.message_id, times: Date.now(), turn:battleData.cid, oppo:battleData.oid };
    await saveMessageData(messageData);
}else{
let msg = '⚔️ <a href="tg://user?id='+id1+'"><b>'+displayName(data,id1)+'</b></a> Has Challenged <a href="tg://user?id='+id2+'"><b>'+displayName(data2,id2)+'</b></a>\n'
let msg2 = ''
const settings = normalizeBattleSettings(battleData.set)
if(settings.max_poke < 6){
f = true
msg2 += '\n<b>• Max number of pokemon:</b> '+settings.max_poke+''
}
if(settings.min_6l > 0 || settings.max_6l < 6){
f = true
msg2 += '\n<b>• Number of legendaries:</b> '+settings.min_6l+'-'+settings.max_6l+''
}
if(settings.min_level > 1 || settings.max_level < 100){
f = true
msg2 += '\n<b>• Level gap of pokemon:</b> '+settings.min_level+'-'+settings.max_level+''
}
if(!settings.switch){
f = true
msg2 += '\n<b>• Switching pokemon:</b> Disabled'
}
if(!settings.key_item){
f = true
msg2 += '\n<b>• Form Changing:</b> Disabled'
}
if(settings.sandbox){
f = true
msg2 += '\n<b>• Sandbox mode:</b> Enabled'
}
if(settings.random){
f = true
msg2 += '\n<b>• Random mode:</b> Enabled'
}
if(settings.preview && settings.preview != 'no'){
f = true
msg2 += '\n<b>• Preview mode:</b> '+settings.preview+''
}
if(settings.pin){
f = true
msg2 += '\n<b>• Pin mode:</b> Enabled'
}
if(!settings.type_effects){
f = true
msg2 += '\n<b>• Type efficiency:</b> Disabled'
}
if(!settings.dual_type){
f = true
msg2 += '\n<b>• Dual Types:</b> Disabled'
}
if(settings.allow_regions.length > 0){
f = true
msg2 += '\n<b>• Only regions:</b> ['+c(settings.allow_regions.join(' , '))+']'
}
if(settings.ban_regions.length > 0){
f = true
msg2 += '\n<b>• Banned regions:</b> ['+c(settings.ban_regions.join(' , '))+']'
}
if(settings.ban_types.length > 0){
f = true
msg2 += '\n<b>• Banned types:</b> ['+c(settings.ban_types.join(' , '))+']'
}
if(settings.allow_types.length > 0){
f = true
msg2 += '\n<b>• Types:</b> ['+c(settings.allow_types.join(' , '))+']'
}
if(battleData.users[id1]){
var em1 = '✅'
}else{
var em1 = '❌'
}
if(battleData.users[id2]){
var em2 = '✅'
}else{
var em2 = '❌'
}
if(f){
msg += msg2
 msg += '\n\n-> <a href="tg://user?id='+id1+'"><b>'+displayName(data,id1)+'</b></a> : '+em1+'\n-> <a href="tg://user?id='+id2+'"><b>'+displayName(data2,id2)+'</b></a> : '+em2+''
}else{
 msg += '\n\n-> <a href="tg://user?id='+id1+'"><b>'+displayName(data,id1)+'</b></a> : '+em1+'\n-> <a href="tg://user?id='+id2+'"><b>'+displayName(data2,id2)+'</b></a> : '+em2+''
}
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'HTML',reply_markup:{inline_keyboard:[[{text:'Agree ✅',callback_data:'battle_'+id1+'_'+id2+'_'+bword+''},{text:'Reject ❌',callback_data:'reject_'+id1+'_'+id2+'_'+bword+''}],[{text:'Battle Settings ⚔️',callback_data:'sytbr_'+id1+'_'+id2+'_'+bword+''}]]}})
}
})

bot.action(/multimo_/, async ctx => {
if (hitBattleCooldown(ctx)) {
  await ctx.answerCbQuery('On cooldown 2 sec');
  return;
}
const moveid = ctx.callbackQuery.data.split('_')[1]
const bword = ctx.callbackQuery.data.split('_')[2]
const id = ctx.callbackQuery.data.split('_')[3]
if(ctx.from.id!=id){
  ctx.answerCbQuery('Not Your Turn')
  return
}
let battleData = {};
try {
  battleData = loadBattleData(bword);
} catch (error) {
  battleData = {};
}
battleData.set = normalizeBattleSettings(battleData.set)
dbg('multimo:click', { bword, from: ctx.from.id, turnId: id, moveid, cid: battleData.cid, oid: battleData.oid, c: battleData.c, o: battleData.o, qlen: battleData.queuedActions ? battleData.queuedActions.length : 0, switchLock: battleData.switchLock || null, switchPending: battleData.switchPending ? Object.keys(battleData.switchPending) : [] });
const selectedMove = dmoves[moveid];
const selectedMoveName = normalizeMoveName(selectedMove?.name);
const actingUser = await getUserData(ctx.from.id);
const actingPokemon = actingUser && Array.isArray(actingUser.pokes)
  ? actingUser.pokes.find((poke) => String(poke.pass) === String(battleData.c))
  : null;
const zMoveReadyState = ensureBattleZMoveReadyState(battleData);
const zMoveUsedState = ensureBattleZMoveUsedState(battleData);
const wantsZMove = !!zMoveReadyState[String(ctx.from.id)];
const selectedCanUseZMove = wantsZMove && canUseBattleZMoveForMove({ battleData, userData: actingUser, pokemon: actingPokemon, move: selectedMove });
const actingHeldItemInfo = getHeldItemStatMultipliers({
  pokemonName: actingPokemon && actingPokemon.name,
  heldItem: getBattleHeldItemName({
    battleData,
    pass: battleData.c,
    heldItem: actingPokemon && actingPokemon.held_item
  }),
  evolutionChains: chains
});
if (actingHeldItemInfo.assaultVestActive && selectedMove && selectedMove.category === 'status' && selectedMoveName !== 'me first') {
  ctx.answerCbQuery(c((actingPokemon && actingPokemon.name) || 'This Pokemon') + ' cannot select status moves because of Assault Vest!', { show_alert: true });
  return;
}
if (!battleData.choiceLockedMoves || typeof battleData.choiceLockedMoves !== 'object') {
  battleData.choiceLockedMoves = {};
}
const lockedMoveId = String(battleData.choiceLockedMoves[String(battleData.c)] || '');
if (actingHeldItemInfo.choiceItemActive && lockedMoveId && lockedMoveId !== String(moveid)) {
  const lockedMove = dmoves[lockedMoveId];
  const heldItemLabel = String(actingHeldItemInfo.heldItem || 'choice item')
    .split('-')
    .map((part) => part ? part.charAt(0).toUpperCase() + part.slice(1) : part)
    .join(' ');
  const lockedMoveLabel = lockedMove ? getBattleMoveLabel(lockedMove, actingPokemon, battleData, battleData.c) : 'its locked move';
  ctx.answerCbQuery(c((actingPokemon && actingPokemon.name) || 'This Pokemon') + ' is locked into ' + c(lockedMoveLabel) + ' by ' + heldItemLabel + '!', { show_alert: true });
  return;
}
if (NO_CONSECUTIVE_USE_MOVES.has(selectedMoveName)) {
  if (!battleData.lastMoveByPass || typeof battleData.lastMoveByPass !== 'object') {
    battleData.lastMoveByPass = {};
  }
  const previousMoveId = String(battleData.lastMoveByPass[String(battleData.c)] || '');
  if (previousMoveId && previousMoveId === String(moveid)) {
    ctx.answerCbQuery('You cannot use this move twice in a row!');
    return;
  }
}
if (wantsZMove && !selectedCanUseZMove) {
  ctx.answerCbQuery('Choose a move that matches your equipped Z-Crystal.', { show_alert: true });
  return;
}
// 1. Queue the Move Action
if (!battleData.queuedActions) battleData.queuedActions = [];
if (!battleData.queuedActions.some(act => String(act.cid) === String(ctx.from.id))) {
  if (selectedCanUseZMove) {
    zMoveUsedState[String(ctx.from.id)] = true;
    delete zMoveReadyState[String(ctx.from.id)];
  }
  battleData.queuedActions.push({
    cid: ctx.from.id,
    c: battleData.c,
    type: 'move',
    id: moveid,
    useZMove: !!selectedCanUseZMove
  });
  ctx.answerCbQuery('Action locked!');
} else {
  // Edge case: User clicked a second time
  ctx.answerCbQuery('You already selected your action!');
  return;
}

// Rehydrate any pending switch if it somehow dropped from queue
if (battleData.switchPending) {
  for (const [cid, info] of Object.entries(battleData.switchPending)) {
    if (!battleData.queuedActions.some(act => String(act.cid) === String(cid))) {
      const pass = (info && typeof info === 'object') ? info.pass : info;
      const cpass = (info && typeof info === 'object' && info.c) ? info.c : battleData.c;
      battleData.queuedActions.push({
        cid: cid,
        c: cpass,
        type: 'switch',
        pass: pass
      });
    }
  }
}
dbg('multimo:queued', { bword, q: battleData.queuedActions });

// 2. Wait for Opponent OR Resolve
const singleActionTurn = false;
if (!singleActionTurn && battleData.queuedActions.length < 2) {
    // Only we have chosen. Swap UI so opponent can choose.
    fullSwap(battleData);
    await saveBattleData(bword, battleData);

const attacker = await getUserData(battleData.cid);
const defender = await getUserData(battleData.oid);
const p1 = attacker.pokes.filter((poke) => poke.pass == battleData.c)[0]
const p2 = defender.pokes.filter((poke) => poke.pass == battleData.o)[0]
if (!p1 || !p2) {
  dbg('multimo:wait_missing_pokes', { bword, cid: battleData.cid, oid: battleData.oid, c: battleData.c, o: battleData.o });
  return;
}
const base1 = pokestats[p2.name]
const base2 = pokestats[p1.name]
    const level1 = plevel(p2.name, p2.exp)
    const level2 = plevel(p1.name, p1.exp)
    const stats1 = await Stats(base1, p2.ivs, p2.evs, c(p2.nature), level1)
    const stats2 = await Stats(base2, p1.ivs, p1.evs, c(p1.nature), level2)

    let msg = `<b>* ${displayName(defender, battleData.oid)} has locked in an action!</b>\n`
    msg += `<b>Waiting for ${displayName(attacker, battleData.cid)} to select...</b>`

const isGroupMmo = ctx.chat.type !== 'private';
const pvpMmo = buildPvpMsg(msg, battleData, attacker, defender, p1, p2, stats1, stats2, bword, isGroupMmo);
await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, pvpMmo.msg, { parse_mode: 'HTML', reply_markup: pvpMmo.keyboard, ...pvpMmo.ext })
 dbg('multimo:waiting', { bword, nextTurn: battleData.cid });
     return;
 }
 
 // 3. Both have chosen: resolve immediately using the queued actions.
 dbg('multimo:resolving', { bword, qlen: battleData.queuedActions.length });
 await resolveQueuedActions(ctx, battleData, bword);
 return;
 
 function getMovePriority(moveName, moveCategory, abilityName) {
   const name = String(moveName || '').toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  const category = String(moveCategory || '').toLowerCase();
  const ability = normalizeAbilityName(abilityName);

  const PRIORITY_BY_MOVE = {
    // Increased priority moves
    'accelerock': 1,
    'ally switch': 2,
    'aqua jet': 1,
    'baby doll eyes': 1,
    'baneful bunker': 4,
    'bide': 1,
    'bullet punch': 1,
    'burning bulwark': 4,
    'crafty shield': 3,
    'detect': 4,
    'endure': 4,
    'extreme speed': 2,
    'fake out': 3,
    'feint': 2,
    'first impression': 2,
    'follow me': 2,
    'grassy glide': 1,
    'helping hand': 5,
    'ice shard': 1,
    'ion deluge': 1,
    'jet punch': 1,
    'king s shield': 4,
    'mach punch': 1,
    'magic coat': 4,
    'obstruct': 4,
    'powder': 1,
    'protect': 4,
    'quick attack': 1,
    'quick guard': 3,
    'rage powder': 2,
    'shadow sneak': 1,
    'silk trap': 4,
    'snatch': 4,
    'spiky shield': 4,
    'spotlight': 3,
    'sucker punch': 1,
    'thunderclap': 1,
    'upper hand': 3,
    'vacuum wave': 1,
    'water shuriken': 1,
    'wide guard': 3,
    'zippy zap': 2,

    // Decreased priority moves
    'avalanche': -4,
    'beak blast': -3,
    'circle throw': -6,
    'counter': -5,
    'dragon tail': -6,
    'focus punch': -3,
    'magic room': -7,
    'mirror coat': -5,
    'revenge': -4,
    'roar': -6,
    'shell trap': -3,
    'teleport': -6,
    'trick room': -7,
    'vital throw': -1,
    'whirlwind': -6,
    'wonder room': -7
  };

  const basePriority = PRIORITY_BY_MOVE[name] ?? 0;
  return basePriority + (ability === 'prankster' && category === 'status' ? 1 : 0);
}

const DRAIN_MOVE_RATIOS = {
  'absorb': 0.5,
  'bitter blade': 0.5,
  'bouncy bubble': 0.5,
  'drain punch': 0.5,
  'giga drain': 0.5,
  'horn leech': 0.5,
  'leech life': 0.5,
  'matcha gotcha': 0.5,
  'mega drain': 0.5,
  'parabolic charge': 0.5,
  'draining kiss': 0.75,
  'dream eater': 0.5,
  'oblivion wing': 0.75
};

function getDrainRatio(moveName) {
  return DRAIN_MOVE_RATIOS[moveName] || 0;
}

const RECOIL_MOVE_RULES = {
  'brave bird': { ratio: 1 / 3 },
  'double edge': { ratio: 1 / 3 },
  'flare blitz': { ratio: 1 / 3 },
  'head charge': { ratio: 1 / 4 },
  'head smash': { ratio: 1 / 2 },
  'light of ruin': { ratio: 1 / 2 },
  'shadow end': { ratio: 1 / 2 },
  'shadow rush': { ratio: 1 / 4 },
  'struggle': { maxHpRatio: 1 / 4 },
  'submission': { ratio: 1 / 4 },
  'take down': { ratio: 1 / 4 },
  'volt tackle': { ratio: 1 / 3 },
  'wave crash': { ratio: 1 / 3 },
  'wild charge': { ratio: 1 / 4 },
  'wood hammer': { ratio: 1 / 3 }
};

function getRecoilDamage(moveName, damageDealt, attackerMaxHp) {
  const rule = RECOIL_MOVE_RULES[moveName];
  if (!rule) return 0;
  if (rule.maxHpRatio) return Math.max(1, Math.floor(attackerMaxHp * rule.maxHpRatio));
  if (damageDealt > 0 && rule.ratio) return Math.max(1, Math.floor(damageDealt * rule.ratio));
  return 0;
}

const CRASH_DAMAGE_MOVES = new Set([
  'axe kick',
  'high jump kick',
  'jump kick',
  'supercell slam'
]);

function getCrashDamage(moveName, attackerMaxHp) {
  if (!CRASH_DAMAGE_MOVES.has(moveName)) return 0;
  return Math.max(1, Math.floor(attackerMaxHp / 2));
}

const SELF_FAINT_MOVES = new Set([
  'explosion',
  'final gambit',
  'healing wish',
  'lunar dance',
  'memento',
  'misty explosion',
  'self destruct'
]);

function applySelfFaintAfterMove(moveName, moveLabel, battleData, attackerPass, attackerName) {
  if (!SELF_FAINT_MOVES.has(moveName)) return '';
  const selfBefore = Math.max(0, battleData.chp || 0);
  if (selfBefore <= 0) return '';
  battleData.chp = 0;
  if (!battleData.tem || typeof battleData.tem !== 'object') battleData.tem = {};
  battleData.tem[attackerPass] = 0;
  return '\n-> <b>'+c(attackerName)+'</b> fainted after using <b>'+c(moveLabel)+'</b>!';
}

const STAT_KEYS = ['attack', 'defense', 'special_attack', 'special_defense', 'speed', 'accuracy', 'evasion'];

const MOVE_STAT_EFFECTS = {
  'growl': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'aurora beam': [{ target: 'target', stat: 'attack', stages: -1, chance: 0.1 }],
  'baby doll eyes': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'bitter malice': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'breaking swipe': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'charm': [{ target: 'target', stat: 'attack', stages: -2, chance: 1 }],
  'chilling water': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'feather dance': [{ target: 'target', stat: 'attack', stages: -2, chance: 1 }],
  'lunge': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'max wyrmwind': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'memento': [{ target: 'target', stat: 'attack', stages: -2, chance: 1 }, { target: 'target', stat: 'special_attack', stages: -2, chance: 1 }],
  'noble roar': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }, { target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'parting shot': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }, { target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'captivate': [{ target: 'target', stat: 'special_attack', stages: -2, chance: 1 }],
  'confide': [{ target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'eerie impulse': [{ target: 'target', stat: 'special_attack', stages: -2, chance: 1 }],
  'max flutterby': [{ target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'play nice': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'play rough': [{ target: 'target', stat: 'attack', stages: -1, chance: 0.1 }],
  'springtide storm': [{ target: 'target', stat: 'attack', stages: -1, chance: 0.3 }],
  'strength sap': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'mist ball': [{ target: 'target', stat: 'special_attack', stages: -1, chance: 0.5 }],
  'tearful look': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }, { target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'tickle': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }, { target: 'target', stat: 'defense', stages: -1, chance: 1 }],
  'trop kick': [{ target: 'target', stat: 'attack', stages: -1, chance: 1 }],
  'venom drench': [
    { target: 'target', stat: 'attack', stages: -1, chance: 1, whenTargetStatusIn: ['poison', 'badly_poisoned'] },
    { target: 'target', stat: 'special_attack', stages: -1, chance: 1, whenTargetStatusIn: ['poison', 'badly_poisoned'] },
    { target: 'target', stat: 'speed', stages: -1, chance: 1, whenTargetStatusIn: ['poison', 'badly_poisoned'] }
  ],
  'tail whip': [{ target: 'target', stat: 'defense', stages: -1, chance: 1 }],
  'leer': [{ target: 'target', stat: 'defense', stages: -1, chance: 1 }],
  'screech': [{ target: 'target', stat: 'defense', stages: -2, chance: 1 }],
  'acid': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.1 }],
  'crunch': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.2 }],
  'crush claw': [{ target: 'target', stat: 'defense', stages: -1, chance: 0.5 }],
  'fire lash': [{ target: 'target', stat: 'defense', stages: -1, chance: 1 }],
  'grav apple': [{ target: 'target', stat: 'defense', stages: -1, chance: 1 }],
  'iron tail': [{ target: 'target', stat: 'defense', stages: -1, chance: 0.3 }],
  'liquidation': [{ target: 'target', stat: 'defense', stages: -1, chance: 0.2 }],
  'max phantasm': [{ target: 'target', stat: 'defense', stages: -1, chance: 1 }],
  'octolock': [{ target: 'target', stat: 'defense', stages: -1, chance: 1 }, { target: 'target', stat: 'special_defense', stages: -1, chance: 1 }],
  'razor shell': [{ target: 'target', stat: 'defense', stages: -1, chance: 0.5 }],
  'rock smash': [{ target: 'target', stat: 'defense', stages: -1, chance: 0.5 }],
  'shadow bone': [{ target: 'target', stat: 'defense', stages: -1, chance: 0.2 }],
  'shadow down': [{ target: 'target', stat: 'defense', stages: -1, chance: 1 }],
  'spicy extract': [{ target: 'target', stat: 'attack', stages: 2, chance: 1 }, { target: 'target', stat: 'defense', stages: -2, chance: 1 }],
  'thunderous kick': [{ target: 'target', stat: 'defense', stages: -1, chance: 1 }],
  'triple arrows': [{ target: 'target', stat: 'defense', stages: -1, chance: 0.5 }],
  'metal sound': [{ target: 'target', stat: 'special_defense', stages: -2, chance: 1 }],
  'fake tears': [{ target: 'target', stat: 'special_defense', stages: -2, chance: 1 }],
  'acid spray': [{ target: 'target', stat: 'special_defense', stages: -2, chance: 1 }],
  'apple acid': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 1 }],
  'psychic': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.1 }],
  'shadow ball': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.2 }],
  'bug buzz': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.1 }],
  'earth power': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.1 }],
  'energy ball': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.1 }],
  'flash cannon': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.1 }],
  'focus blast': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.1 }],
  'lumina crash': [{ target: 'target', stat: 'special_defense', stages: -2, chance: 1 }],
  'luster purge': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 0.5 }],
  'max darkness': [{ target: 'target', stat: 'special_defense', stages: -1, chance: 1 }],
  'seed flare': [{ target: 'target', stat: 'special_defense', stages: -2, chance: 0.4 }],
  'snarl': [{ target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'skitter smack': [{ target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'spirit break': [{ target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'struggle bug': [{ target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'mystical fire': [{ target: 'target', stat: 'special_attack', stages: -1, chance: 1 }],
  'moonblast': [{ target: 'target', stat: 'special_attack', stages: -1, chance: 0.3 }],
  'string shot': [{ target: 'target', stat: 'speed', stages: -2, chance: 1 }],
  'bleakwind storm': [{ target: 'target', stat: 'speed', stages: -1, chance: 0.3 }],
  'scary face': [{ target: 'target', stat: 'speed', stages: -2, chance: 1 }],
  'constrict': [{ target: 'target', stat: 'speed', stages: -1, chance: 0.1 }],
  'cotton spore': [{ target: 'target', stat: 'speed', stages: -2, chance: 1 }],
  'drum beating': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'icy wind': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'glaciate': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'electroweb': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'g max foam burst': [{ target: 'target', stat: 'speed', stages: -2, chance: 1 }],
  'bulldoze': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'max strike': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'mud shot': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'pounce': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'rock tomb': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'low sweep': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'bubble': [{ target: 'target', stat: 'speed', stages: -1, chance: 0.1 }],
  'bubble beam': [{ target: 'target', stat: 'speed', stages: -1, chance: 0.1 }],
  'silk trap': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'sticky web': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'syrup bomb': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'tar shot': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'toxic thread': [{ target: 'target', stat: 'speed', stages: -1, chance: 1 }],
  'sand attack': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 1 }],
  'smokescreen': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 1 }],
  'kinesis': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 1 }],
  'flash': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 1 }],
  'mud slap': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 1 }],
  'leaf tornado': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 0.5 }],
  'mirror shot': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 0.3 }],
  'mud bomb': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 0.3 }],
  'muddy water': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 0.3 }],
  'night daze': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 0.4 }],
  'octazooka': [{ target: 'target', stat: 'accuracy', stages: -1, chance: 0.5 }],
  'secret power': [{ target: 'target', randomFrom: ['attack', 'defense', 'special_attack', 'accuracy', 'speed'], stages: -1, chance: 0.3 }],
  'sweet scent': [{ target: 'target', stat: 'evasion', stages: -1, chance: 1 }],
  'defog': [{ target: 'target', stat: 'evasion', stages: -1, chance: 1 }],
  'g max tartness': [{ target: 'target', stat: 'evasion', stages: -1, chance: 1 }],
  'shadow mist': [{ target: 'target', stat: 'evasion', stages: -1, chance: 1 }],
  'swords dance': [{ target: 'self', stat: 'attack', stages: 2, chance: 1 }],
  'howl': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }],
  'meditate': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }],
  'sharpen': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }],
  'bulk up': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'defense', stages: 1, chance: 1 }],
  'dragon dance': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'acupressure': [{ target: 'self', randomStat: true, stages: 2, chance: 1 }],
  'coil': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'defense', stages: 1, chance: 1 }, { target: 'self', stat: 'accuracy', stages: 1, chance: 1 }],
  'gravity': [],
  'work up': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'special_attack', stages: 1, chance: 1 }],
  'growth': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'special_attack', stages: 1, chance: 1 }],
  'shift gear': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'speed', stages: 2, chance: 1 }],
  'harden': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }],
  'withdraw': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }],
  'defense curl': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }],
  'iron defense': [{ target: 'self', stat: 'defense', stages: 2, chance: 1 }],
  'acid armor': [{ target: 'self', stat: 'defense', stages: 2, chance: 1 }],
  'cotton guard': [{ target: 'self', stat: 'defense', stages: 3, chance: 1 }],
  'cosmic power': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: 1, chance: 1 }],
  'nasty plot': [{ target: 'self', stat: 'special_attack', stages: 2, chance: 1 }],
  'calm mind': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: 1, chance: 1 }],
  'tail glow': [{ target: 'self', stat: 'special_attack', stages: 3, chance: 1 }],
  'charge beam': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 0.7 }],
  'fiery dance': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 0.5 }],
  'electro shot': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 1 }],
  'geomancy': [{ target: 'self', stat: 'special_attack', stages: 2, chance: 1 }, { target: 'self', stat: 'special_defense', stages: 2, chance: 1 }, { target: 'self', stat: 'speed', stages: 2, chance: 1 }],
  'max ooze': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 1 }],
  'meteor beam': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 1 }],
  'mystical power': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 1 }],
  'take heart': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: 1, chance: 1 }],
  'torch song': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 1 }],
  'amnesia': [{ target: 'self', stat: 'special_defense', stages: 2, chance: 1 }],
  'aromatic mist': [{ target: 'self', stat: 'special_defense', stages: 1, chance: 1 }],
  'charge': [{ target: 'self', stat: 'special_defense', stages: 1, chance: 1 }],
  'max quake': [{ target: 'self', stat: 'special_defense', stages: 1, chance: 1 }],
  'quiver dance': [{ target: 'self', stat: 'special_attack', stages: 1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: 1, chance: 1 }, { target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'agility': [{ target: 'self', stat: 'speed', stages: 2, chance: 1 }],
  'rock polish': [{ target: 'self', stat: 'speed', stages: 2, chance: 1 }],
  'autotomize': [{ target: 'self', stat: 'speed', stages: 2, chance: 1 }],
  'flame charge': [{ target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'aqua step': [{ target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'aura wheel': [{ target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'esper wing': [{ target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'max airstream': [{ target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'rapid spin': [{ target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'trailblaze': [{ target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'double team': [{ target: 'self', stat: 'evasion', stages: 1, chance: 1 }],
  'minimize': [{ target: 'self', stat: 'evasion', stages: 2, chance: 1 }],
  'hone claws': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'accuracy', stages: 1, chance: 1 }],
  'close combat': [{ target: 'self', stat: 'defense', stages: -1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: -1, chance: 1 }],
  'armor cannon': [{ target: 'self', stat: 'defense', stages: -1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: -1, chance: 1 }],
  'clanging scales': [{ target: 'self', stat: 'defense', stages: -1, chance: 1 }],
  'dragon ascent': [{ target: 'self', stat: 'defense', stages: -1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: -1, chance: 1 }],
  'headlong rush': [{ target: 'self', stat: 'defense', stages: -1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: -1, chance: 1 }],
  'hyperspace fury': [{ target: 'self', stat: 'defense', stages: -1, chance: 1 }],
  'scale shot': [{ target: 'self', stat: 'defense', stages: -1, chance: 1 }, { target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'superpower': [{ target: 'self', stat: 'attack', stages: -1, chance: 1 }, { target: 'self', stat: 'defense', stages: -1, chance: 1 }],
  'tera blast': [{ target: 'self', statByMoveCategory: { physical: 'attack', special: 'special_attack' }, stages: -1, chance: 1 }],
  'hammer arm': [{ target: 'self', stat: 'speed', stages: -1, chance: 1 }],
  'ice hammer': [{ target: 'self', stat: 'speed', stages: -1, chance: 1 }],
  'spin out': [{ target: 'self', stat: 'speed', stages: -2, chance: 1 }],
  'curse': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'defense', stages: 1, chance: 1 }, { target: 'self', stat: 'speed', stages: -1, chance: 1 }],
  'v create': [{ target: 'self', stat: 'defense', stages: -1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: -1, chance: 1 }, { target: 'self', stat: 'speed', stages: -1, chance: 1 }],
  'overheat': [{ target: 'self', stat: 'special_attack', stages: -2, chance: 1 }],
  'make it rain': [{ target: 'self', stat: 'special_attack', stages: -1, chance: 1 }],
  'leaf storm': [{ target: 'self', stat: 'special_attack', stages: -2, chance: 1 }],
  'draco meteor': [{ target: 'self', stat: 'special_attack', stages: -2, chance: 1 }],
  'psycho boost': [{ target: 'self', stat: 'special_attack', stages: -2, chance: 1 }],
  'fleur cannon': [{ target: 'self', stat: 'special_attack', stages: -2, chance: 1 }],
  'shell smash': [
    { target: 'self', stat: 'attack', stages: 2, chance: 1 },
    { target: 'self', stat: 'special_attack', stages: 2, chance: 1 },
    { target: 'self', stat: 'speed', stages: 2, chance: 1 },
    { target: 'self', stat: 'defense', stages: -1, chance: 1 },
    { target: 'self', stat: 'special_defense', stages: -1, chance: 1 }
  ],
  // All-or-nothing 10% all-stats boost
  'ancient power': [
    { target: 'self', stat: 'attack', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'defense', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'special_attack', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'special_defense', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'speed', stages: 1, chance: 0.1, chanceGroup: 'A' }
  ],
  'silver wind': [
    { target: 'self', stat: 'attack', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'defense', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'special_attack', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'special_defense', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'speed', stages: 1, chance: 0.1, chanceGroup: 'A' }
  ],
  'ominous wind': [
    { target: 'self', stat: 'attack', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'defense', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'special_attack', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'special_defense', stages: 1, chance: 0.1, chanceGroup: 'A' },
    { target: 'self', stat: 'speed', stages: 1, chance: 0.1, chanceGroup: 'A' }
  ],
  // Guaranteed all-stats boosts
  'clangorous soulblaze': [
    { target: 'self', stat: 'attack', stages: 1, chance: 1 },
    { target: 'self', stat: 'defense', stages: 1, chance: 1 },
    { target: 'self', stat: 'special_attack', stages: 1, chance: 1 },
    { target: 'self', stat: 'special_defense', stages: 1, chance: 1 },
    { target: 'self', stat: 'speed', stages: 1, chance: 1 }
  ],
  'extreme evoboost': [
    { target: 'self', stat: 'attack', stages: 2, chance: 1 },
    { target: 'self', stat: 'defense', stages: 2, chance: 1 },
    { target: 'self', stat: 'special_attack', stages: 2, chance: 1 },
    { target: 'self', stat: 'special_defense', stages: 2, chance: 1 },
    { target: 'self', stat: 'speed', stages: 2, chance: 1 }
  ],
  'no retreat': [
    { target: 'self', stat: 'attack', stages: 1, chance: 1 },
    { target: 'self', stat: 'defense', stages: 1, chance: 1 },
    { target: 'self', stat: 'special_attack', stages: 1, chance: 1 },
    { target: 'self', stat: 'special_defense', stages: 1, chance: 1 },
    { target: 'self', stat: 'speed', stages: 1, chance: 1 }
  ],
  // Single/partial attack boosts
  'max knuckle': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }],
  'metal claw': [{ target: 'self', stat: 'attack', stages: 1, chance: 0.1 }],
  'meteor mash': [{ target: 'self', stat: 'attack', stages: 1, chance: 0.2 }],
  'order up': [{ target: 'self', randomFrom: ['attack', 'defense', 'special_attack'], stages: 1, chance: 1 }],
  'power-up punch': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }],
  'rage': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }],
  'tidy up': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  'victory dance': [{ target: 'self', stat: 'attack', stages: 1, chance: 1 }, { target: 'self', stat: 'defense', stages: 1, chance: 1 }, { target: 'self', stat: 'speed', stages: 1, chance: 1 }],
  // HP-cost boosts: handled specially in executeStandardMove
  'belly drum': [],
  'clangorous soul': [],
  'fillet away': [],
  // Post-KO boost: handled specially in executeStandardMove
  'fell stinger': [],
  // Raise user defense
  'barrier': [{ target: 'self', stat: 'defense', stages: 2, chance: 1 }],
  'defend order': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: 1, chance: 1 }],
  'diamond storm': [{ target: 'self', stat: 'defense', stages: 2, chance: 0.5 }],
  'flower shield': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }],
  'max steelspike': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }],
  'psyshield bash': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }],
  'shelter': [{ target: 'self', stat: 'defense', stages: 2, chance: 1 }],
  'skull bash': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }],
  'steel wing': [{ target: 'self', stat: 'defense', stages: 1, chance: 0.1 }],
  'stockpile': [{ target: 'self', stat: 'defense', stages: 1, chance: 1 }, { target: 'self', stat: 'special_defense', stages: 1, chance: 1 }],
  'stuff cheeks': [{ target: 'self', stat: 'defense', stages: 2, chance: 1 }]
};

function normalizeMoveName(moveName) {
  return String(moveName || '').toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function ensureBattleStatStages(battleData) {
  if (!battleData.statStages || typeof battleData.statStages !== 'object') {
    battleData.statStages = {};
  }
  return battleData.statStages;
}

function ensurePokemonStatStages(battleData, pass) {
  const all = ensureBattleStatStages(battleData);
  if (!all[pass] || typeof all[pass] !== 'object') {
    all[pass] = { attack: 0, defense: 0, special_attack: 0, special_defense: 0, speed: 0, accuracy: 0, evasion: 0 };
  }
  const keys = ['attack', 'defense', 'special_attack', 'special_defense', 'speed', 'accuracy', 'evasion'];
  for (const key of keys) {
    if (typeof all[pass][key] !== 'number') all[pass][key] = 0;
  }
  return all[pass];
}

function getStageMultiplier(stage) {
  if (stage >= 0) return (2 + stage) / 2;
  return 2 / (2 - stage);
}

function applyStageToStat(baseValue, stage) {
  return Math.max(1, Math.floor(baseValue * getStageMultiplier(stage)));
}

function getEffectiveSpeed(baseSpeed, battleData, pass, abilityName) {
  const statusAdjusted = getSpeedWithStatus(baseSpeed, battleData, pass);
  const stages = ensurePokemonStatStages(battleData, pass);
  let speed = applyStageToStat(statusAdjusted, stages.speed);
  const heldItemInfo = getHeldItemStatMultipliers({
    heldItem: getBattleHeldItemName({ battleData, pass })
  });
  speed = Math.max(1, Math.floor(speed * (heldItemInfo.speed || 1)));
  if (getEffectiveWeatherName(battleData) === 'snow' && normalizeAbilityName(abilityName) === 'slush-rush') {
    speed = Math.max(1, Math.floor(speed * 2));
  }
  return speed;
}

function getModifiedAccuracy(baseAccuracy, attackerAccuracyStage, defenderEvasionStage, battleData, defenderAbility) {
  const netStage = (attackerAccuracyStage || 0) - (defenderEvasionStage || 0);
  const acc = Math.floor(baseAccuracy * getStageMultiplier(netStage) * getWeatherAccuracyMultiplierForTarget({ battleData, abilityName: defenderAbility }));
  return Math.max(1, Math.min(100, acc));
}

function clampStage(stage) {
  return Math.max(-6, Math.min(6, stage));
}

function getStageVerb(delta) {
  const mag = Math.abs(delta);
  if (delta > 0) {
    if (mag >= 3) return 'rose drastically';
    if (mag === 2) return 'rose sharply';
    return 'rose';
  }
  if (mag >= 3) return 'fell drastically';
  if (mag === 2) return 'fell harshly';
  return 'fell';
}

function getStatLabel(stat) {
  if (stat === 'special_attack') return 'Special Attack';
  if (stat === 'special_defense') return 'Special Defense';
  return c(stat);
}

function expandEffectStats(effect) {
  if (effect.stat === 'special') return ['special_attack', 'special_defense'];
  return [effect.stat];
}

function applyMoveStatEffects({ battleData, moveName, moveCategory, attackerName, defenderName, attackerPass, defenderPass, attackerAbility, defenderAbility, targetAlive }) {
  const effects = MOVE_STAT_EFFECTS[moveName] || [];
  const resolvedMoveCategory = String(moveCategory || '').toLowerCase();
  if (!effects.length) return '';

  const resolvedChanceGroups = {};
  for (const effect of effects) {
    if (effect.chanceGroup !== undefined && !(effect.chanceGroup in resolvedChanceGroups)) {
      resolvedChanceGroups[effect.chanceGroup] = Math.random() <= (effect.chance ?? 1);
    }
  }

  let out = '';
  let pendingBatch = null;

  function flushPendingBatch() {
    if (!pendingBatch || !pendingBatch.changes || pendingBatch.changes.length < 1) return;
    out += applyStageChanges({
      battleData,
      pass: pendingBatch.targetPass,
      pokemonName: pendingBatch.targetName,
      abilityName: pendingBatch.targetAbility,
      changes: pendingBatch.changes,
      c,
      fromOpponent: pendingBatch.fromOpponent
    }).message;
    pendingBatch = null;
  }

  for (const effect of effects) {
    if (effect.chanceGroup !== undefined) {
      if (!resolvedChanceGroups[effect.chanceGroup]) continue;
    } else {
      if (Math.random() > (effect.chance ?? 1)) continue;
    }
    if (effect.target === 'target' && !targetAlive) continue;
    if (effect.target === 'target' && Array.isArray(effect.whenTargetStatusIn) && effect.whenTargetStatusIn.length > 0) {
      const tStatus = getBattleStatus(battleData, defenderPass);
      if (!tStatus || !effect.whenTargetStatusIn.includes(tStatus)) continue;
    }

    const targetPass = effect.target === 'self' ? attackerPass : defenderPass;
    const targetName = effect.target === 'self' ? attackerName : defenderName;
    const targetAbility = effect.target === 'self' ? attackerAbility : defenderAbility;
    const stages = ensurePokemonStatStages(battleData, targetPass);

    if (effect.randomStat) {
      flushPendingBatch();
      const allStats = ['attack', 'defense', 'special_attack', 'special_defense', 'speed', 'accuracy', 'evasion'];
      const eligible = allStats.filter(s => (stages[s] || 0) < 6);
      if (eligible.length > 0) {
        const statKey = eligible[Math.floor(Math.random() * eligible.length)];
        out += applyStageChanges({
          battleData,
          pass: targetPass,
          pokemonName: targetName,
          abilityName: targetAbility,
          changes: [{ stat: statKey, delta: effect.stages }],
          c,
          fromOpponent: effect.target === 'target'
        }).message;
      }
      continue;
    }

    if (effect.randomFrom) {
      flushPendingBatch();
      const increasing = (effect.stages || 0) >= 0;
      const pool = effect.randomFrom.filter(s => increasing ? (stages[s] || 0) < 6 : (stages[s] || 0) > -6);
      if (pool.length > 0) {
        const statKey = pool[Math.floor(Math.random() * pool.length)];
        out += applyStageChanges({
          battleData,
          pass: targetPass,
          pokemonName: targetName,
          abilityName: targetAbility,
          changes: [{ stat: statKey, delta: effect.stages }],
          c,
          fromOpponent: effect.target === 'target'
        }).message;
      }
      continue;
    }

    const effectStats = effect.statByMoveCategory ? [effect.statByMoveCategory[resolvedMoveCategory]].filter(Boolean) : expandEffectStats(effect);
    const fromOpponent = effect.target === 'target';
    const changes = effectStats.map((statKey) => ({ stat: statKey, delta: effect.stages }));

    if (
      pendingBatch &&
      pendingBatch.targetPass === targetPass &&
      pendingBatch.targetName === targetName &&
      pendingBatch.targetAbility === targetAbility &&
      pendingBatch.fromOpponent === fromOpponent
    ) {
      pendingBatch.changes.push(...changes);
    } else {
      flushPendingBatch();
      pendingBatch = {
        targetPass,
        targetName,
        targetAbility,
        fromOpponent,
        changes: [...changes]
      };
    }
  }
  flushPendingBatch();
  return out;
}

if (!battleData.bideState) battleData.bideState = {};
if (battleData.bideState[action1.c]) { action1.id = battleData.bideState[action1.c].moveId; }
if (action2 && battleData.bideState[action2.c]) { action2.id = battleData.bideState[action2.c].moveId; }
const chargingState1 = getChargingStateForPass(battleData, action1.c);
if (chargingState1 && chargingState1.moveId) { action1.id = chargingState1.moveId; }
if (action2) {
  const chargingState2 = getChargingStateForPass(battleData, action2.c);
  if (chargingState2 && chargingState2.moveId) { action2.id = chargingState2.moveId; }
}
battleData.bideCycle = (battleData.bideCycle || 0) + 1;

// Use the unified resolver for standard two-action turns so ability hooks stay consistent.
if (!singleActionTurn) {
  await resolveQueuedActions(ctx, battleData, bword);
  return;
}

// If a switch is queued in this turn, delegate to unified resolver (handles switch-first flow)
if (!singleActionTurn && (action1.type === 'switch' || (action2 && action2.type === 'switch'))) {
  await resolveQueuedActions(ctx, battleData, bword);
  return;
}

let orderedActions = [];
if (singleActionTurn) {
  orderedActions = [action1];
} else {
  const mv1 = dmoves[action1.id];
  const mv2 = dmoves[action2.id];
  if (!mv1 || !mv2) {
    await resolveQueuedActions(ctx, battleData, bword);
    return;
  }
  const usrA = await getUserData(action1.cid);
  const usrB = await getUserData(action2.cid);
  const pkA = usrA.pokes.filter((p) => p.pass == action1.c)[0];
  const pkB = usrB.pokes.filter((p) => p.pass == action2.c)[0];
  const pri1 = getMovePriority(mv1.name, mv1.category, pkA && pkA.ability);
  const pri2 = getMovePriority(mv2.name, mv2.category, pkB && pkB.ability);

  if (pri1 > pri2) { orderedActions = [action1, action2]; }
  else if (pri2 > pri1) { orderedActions = [action2, action1]; }
  else {
      if (speedA > speedB) { orderedActions = [action1, action2]; }
      else if (speedB > speedA) { orderedActions = [action2, action1]; }
      else { orderedActions = (Math.random() < 0.5) ? [action1, action2] : [action2, action1]; }
  }
}

if (!battleData.turnHits) battleData.turnHits = {};
battleData.turnHits = {}; // Reset at start of turn
battleData.turnAbilityState = { skipSpeedBoost: {}, failedEscape: {} };
const isSingleMoveTurn = singleActionTurn || orderedActions.length < 2;

let turnLogs = "\n\n<b>Turn Summary:</b>";

// Ensure context points to who needs to act first
if (String(battleData.cid) !== String(orderedActions[0].cid)) {
    fullSwap(battleData);
}

// Function to execute one standard attack in current context (battleData.cid attacking battleData.oid)
async function executeStandardMove(act) {
    if (battleData.chp <= 0 || battleData.ohp <= 0) return; // attacker or defender fainted

    const move = dmoves[act.id];
    let attacker = await getUserData(battleData.cid);
    let defender = await getUserData(battleData.oid);
    let p = attacker.pokes.filter((poke)=>poke.pass==battleData.c)[0];
    let op = defender.pokes.filter((poke)=>poke.pass==battleData.o)[0];
    const attackerAbility = p && p.ability ? p.ability : 'none';
    const defenderAbility = op && op.ability ? op.ability : 'none';
    if (!move || !move.type || !p || !op || !pokes[p.name] || !pokes[op.name]) {
      return;
    }
    const attackerHeldItemName = getBattleHeldItemName({ battleData, pass: battleData.c, heldItem: p.held_item });
    const defenderHeldItemName = getBattleHeldItemName({ battleData, pass: battleData.o, heldItem: op.held_item });
    let moveLabel;
    try {
      moveLabel = getBattleMoveLabel(move, p, battleData, battleData.c);
    } catch (e) {
      moveLabel = move && move.name ? move.name : 'Unknown Move';
    }
    const moveName = normalizeMoveName(moveLabel);
    const hitsMinimizedBonus = MINIMIZE_PUNISH_MOVES.has(moveName) && isPokemonMinimized(battleData, battleData.o);
    const isCounterMove = ['counter', 'mirror coat', 'metal burst', 'comeuppance'].includes(moveName);
    let base1 = getBattleBaseStats(p, battleData, battleData.c);
    let base2 = getBattleBaseStats(op, battleData, battleData.o);
    let level1 = plevel(p.name, p.exp);
    let level2 = plevel(op.name, op.exp);
    let stats1 = await Stats(base1, p.ivs, p.evs, c(p.nature), level1);
    let stats2 = await Stats(base2, op.ivs, op.evs, c(op.nature), level2);
    
    const effectiveMoveType = getEffectiveMoveType({ battleData, pokemonName: p.name, heldItem: attackerHeldItemName, moveName: move.name, moveType: move.type });
    const defenderTypes = getEffectivePokemonTypes({ pokemonName: op.name, pokemonTypes: pokes[op.name].types || [], heldItem: defenderHeldItemName });

    // Check type effectiveness
    const type3 = defenderTypes[0];
    const type4 = defenderTypes[1] ? c(defenderTypes[1]) : null;
    let eff1 = 1;
    if (battleData.set.type_effects) { eff1 = await eff(c(effectiveMoveType), c(type3), type4); }
    eff1 = getStrongWindsEffectiveness({ battleData, moveType: effectiveMoveType, pokemonTypes: defenderTypes, effectiveness: eff1 });
    const defenderLevitateInfo = getLevitateInfo({ abilityName: defenderAbility });
    const defenderAirBalloonInfo = getAirBalloonInfo({ battleData, pass: battleData.o, heldItem: op.held_item });
    const groundBlockedMove = (defenderLevitateInfo.active || defenderAirBalloonInfo.active) && String(effectiveMoveType || '').toLowerCase() === 'ground';
    if (groundBlockedMove) eff1 = 0;
    
    const atkStages = ensurePokemonStatStages(battleData, battleData.c);
    const defStages = ensurePokemonStatStages(battleData, battleData.o);
    const unawareModifiers = getUnawareBattleModifiers({
      attackerAbility,
      defenderAbility,
      moveCategory: move.category,
      attackerStages: atkStages,
      defenderStages: defStages
    });
    const unawareMessage = getUnawareActivationMessages({
      attackerName: p.name,
      defenderName: op.name,
      unawareModifiers
    });
      const supremeOverlordInfo = getSupremeOverlordInfo({
        abilityName: attackerAbility,
        partyHpMap: battleData.tem,
        activePass: battleData.c
      });
      const attackerHeldItemInfo = getHeldItemStatMultipliers({
        pokemonName: p.name,
        heldItem: getBattleHeldItemName({ battleData, pass: battleData.c, heldItem: p.held_item }),
        evolutionChains: chains
      });
      const defenderHeldItemInfo = getHeldItemStatMultipliers({
        pokemonName: op.name,
        heldItem: getBattleHeldItemName({ battleData, pass: battleData.o, heldItem: op.held_item }),
        evolutionChains: chains
      });

    let atk = applyStageToStat(stats1.attack, unawareModifiers.attackStage);
    let def2 = applyStageToStat(stats2.defense, unawareModifiers.defenseStage);
    if (move.category == 'special') {
      atk = applyStageToStat(stats1.special_attack, unawareModifiers.attackStage);
      def2 = applyStageToStat(stats2.special_defense, unawareModifiers.defenseStage);
    } else {
      atk = Math.max(1, Math.floor(atk * getAttackStatMultiplier(attackerAbility, move.category)));
    }
    if (move.category == 'special') {
      atk = Math.max(1, Math.floor(atk * attackerHeldItemInfo.special_attack));
      def2 = Math.max(1, Math.floor(def2 * defenderHeldItemInfo.special_defense));
    } else {
      atk = Math.max(1, Math.floor(atk * attackerHeldItemInfo.attack));
      def2 = Math.max(1, Math.floor(def2 * defenderHeldItemInfo.defense));
    }
    def2 = Math.max(1, Math.floor(def2 * getWeatherDefenseMultiplier({
      battleData,
      moveCategory: move.category,
      pokemonTypes: getEffectivePokemonTypes({ pokemonName: op.name, pokemonTypes: pokes[op.name]?.types || [], heldItem: defenderHeldItemName, abilityName: defenderAbility })
    })));
    atk = Math.max(1, Math.floor(atk * supremeOverlordInfo.multiplier));
    if (move.category == 'physical' && getBattleStatus(battleData, battleData.c) === 'burn') {
        atk = Math.max(1, Math.floor(atk / 2));
    }
    
    let msgLocal = "";
    let blockedByGoodAsGold = false;
    
    // ActState (Frozen, Asleep, Paralyzed etc)
    ensureBattleStatus(battleData); // verify status conditions haven't cleared
    const actState = canPokemonAct(battleData, battleData.c, p.name);
    const chargingState = getChargingStateForPass(battleData, battleData.c);
    const isChargeReleaseTurn = !!(chargingState && String(chargingState.moveId) === String(act.id));
    const powerHerbInfo = getPowerHerbInfo({
      battleData,
      pass: battleData.c,
      heldItem: p.held_item,
      moveName
    });
    const isImmediateChargeTurn = actState.canAct && !isChargeReleaseTurn && powerHerbInfo.active;
    if (!actState.canAct && isChargeReleaseTurn) {
      clearChargingStateForPass(battleData, battleData.c);
      clearSemiInvulnerableStateForPass(battleData, battleData.c);
    }
    
    if (!actState.canAct) {
        msgLocal += "\n" + actState.msg;
    } else if (isChargeReleaseTurn) {
      clearChargingStateForPass(battleData, battleData.c);
      clearSemiInvulnerableStateForPass(battleData, battleData.c);
      msgLocal += '\n-> <b>'+c(p.name)+'</b> unleashed <b>'+c(moveLabel)+'</b>!';
    } else if (isImmediateChargeTurn) {
      msgLocal += getChargingTurnMessage(p.name, moveName);
      if (CHARGE_START_STAT_MOVES.has(moveName)) {
        msgLocal += applyMoveStatEffects({
          battleData,
          moveName,
          moveCategory: move.category,
          attackerName: p.name,
          defenderName: op.name,
          attackerPass: battleData.c,
          defenderPass: battleData.o,
          attackerAbility,
          defenderAbility,
          targetAlive: battleData.ohp > 0
        });
      }
      consumeBattleHeldItem({ battleData, pass: battleData.c, heldItem: p.held_item });
      msgLocal += '\n-> <b>'+c(p.name)+'</b>\'s <b>Power Herb</b> activated!';
      msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(moveLabel)+'</b> immediately!';
    } else if (moveName === 'bide') {
        // Bide bypasses accuracy/evasion checks
        if (!battleData.bideState) battleData.bideState = {};
        if (!battleData.bideState[battleData.c]) {
      // Bide stores for exactly 2 turns, then retaliates.
      battleData.bideState[battleData.c] = { turnsLeft: 2, damage: 0, moveId: act.id, lastAttacker: null, lastProcessedCycle: battleData.bideCycle };
            msgLocal += '\n-> <b>'+c(p.name)+'</b> is storing energy!';
        } else {
            let bState = battleData.bideState[battleData.c];
        if (bState.lastProcessedCycle === battleData.bideCycle) {
          msgLocal += '\n-> <b>'+c(p.name)+'</b> is storing energy!';
        } else if (isSingleMoveTurn) {
          // Do not progress countdown on one-sided turns.
          bState.lastProcessedCycle = battleData.bideCycle;
          msgLocal += '\n-> <b>'+c(p.name)+'</b> is storing energy!';
        } else if (bState.turnsLeft > 1) {
                bState.turnsLeft -= 1;
                bState.lastProcessedCycle = battleData.bideCycle;
                msgLocal += '\n-> <b>'+c(p.name)+'</b> is storing energy!';
            } else {
                bState.lastProcessedCycle = battleData.bideCycle;
                if (bState.damage === 0) {
                    msgLocal += '\n-> <b>'+c(p.name)+'</b> unleashed its energy... but it failed!';
                } else {
                    var damage = Math.min(bState.damage * 2, battleData.ohp);
                    const sturdyDamage = applyDefenderDamageWithSturdy({
                      battleData,
                      damage,
                      defenderAbility,
                      defenderName: op.name,
                      defenderMaxHp: stats2.hp,
                      moveName
                    });
                    damage = sturdyDamage.damage;
                  battleData.turnHits[battleData.o] = { damage: damage, category: move.category || 'physical', from: battleData.c, move: moveName };
                  if (battleData.bideState && battleData.bideState[battleData.o]) {
                    battleData.bideState[battleData.o].damage += damage;
                    battleData.bideState[battleData.o].lastAttacker = battleData.c;
                  }
                    msgLocal += '\n-> <b>'+c(p.name)+'</b> unleashed its energy! It dealt <code>'+damage+'</code> HP to <b>'+c(op.name)+'</b>';
                    msgLocal += sturdyDamage.message;
                }
                delete battleData.bideState[battleData.c];
            }
        }
          } else if (CHARGING_TURN_MOVES.has(moveName) && !isImmediateChargeTurn) {
            setChargingStateForPass(battleData, battleData.c, act.id, moveName);
            if (SEMI_INVULNERABLE_CHARGE_MOVES.has(moveName)) {
              setSemiInvulnerableStateForPass(battleData, battleData.c, moveName);
            }
            msgLocal += getChargingTurnMessage(p.name, moveName);
            if (CHARGE_START_STAT_MOVES.has(moveName)) {
              msgLocal += applyMoveStatEffects({
                battleData,
                moveName,
                moveCategory: move.category,
                attackerName: p.name,
                defenderName: op.name,
                attackerPass: battleData.c,
                defenderPass: battleData.o,
                attackerAbility,
                defenderAbility,
                targetAlive: battleData.ohp > 0
              });
            }
          } else if (isCounterMove) {
            // Counterattack moves only succeed if this Pokemon was hit earlier this turn.
            const lastHit = battleData.turnHits[battleData.c];
            const wasHitByCurrentFoe = lastHit && String(lastHit.from) === String(battleData.o);
            if (!lastHit || lastHit.damage === 0 || !wasHitByCurrentFoe) {
              msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(moveLabel)+'</b> but it failed!';
            } else if (moveName === 'counter' && lastHit.category !== 'physical') {
              msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(moveLabel)+'</b> but it failed!';
            } else if (moveName === 'mirror coat' && lastHit.category !== 'special') {
              msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(moveLabel)+'</b> but it failed!';
            } else {
              const multiplier = (moveName === 'metal burst' || moveName === 'comeuppance') ? 1.5 : 2;
              var damage = Math.min(Math.max(Math.floor(lastHit.damage * multiplier), 1), battleData.ohp);
              const sturdyDamage = applyDefenderDamageWithSturdy({
                battleData,
                damage,
                defenderAbility,
                defenderName: op.name,
                defenderMaxHp: stats2.hp,
                moveName
              });
              damage = sturdyDamage.damage;
              battleData.turnHits[battleData.o] = { damage: damage, category: move.category || 'physical', from: battleData.c, move: moveName };
              if (battleData.bideState && battleData.bideState[battleData.o]) {
                battleData.bideState[battleData.o].damage += damage;
                battleData.bideState[battleData.o].lastAttacker = battleData.c;
              }
              msgLocal += '\n-> <b>'+c(p.name)+'</b> retaliated with <b>'+c(moveLabel)+'</b> and dealt <code>'+damage+'</code> HP to <b>'+c(op.name)+'</b>';
              msgLocal += sturdyDamage.message;
            }
          } else {
        if (isSemiInvulnerableAvoidedMove(battleData, battleData.o, move.category, moveName)) {
          const opSemi = getSemiInvulnerableStateForPass(battleData, battleData.o);
          msgLocal += getSemiInvulnerableAvoidMessage(op.name, opSemi ? opSemi.moveName : '');
        } else {
        const weatherAccuracy = getWeatherAccuracyInfo({ battleData, moveName, baseAccuracy: move.accuracy });
        const bypassAccuracyCheck = moveName === 'bind' || hitsMinimizedBonus || weatherAccuracy.skipAccuracyCheck;
        const isStatusMove = String(move.category || '').toLowerCase() === 'status';
        const hasAccuracyCheck = !bypassAccuracyCheck && !isStatusMove && move.accuracy !== null && move.accuracy !== undefined;
        const accValue = hasAccuracyCheck ? getModifiedAccuracy(Number(weatherAccuracy.accuracy), unawareModifiers.accuracyStage, unawareModifiers.evasionStage, battleData, defenderAbility) : 100;
        if (hasAccuracyCheck && Math.random() * 100 > accValue) {
        msgLocal += unawareMessage;
        msgLocal += '\n-> <b>'+c(p.name)+'</b> <b>'+c(moveLabel)+'</b> has missed.';
        msgLocal += applyBlunderPolicy({
          battleData,
          pass: battleData.c,
          pokemonName: p.name,
          heldItem: p.held_item,
          moveName,
          c
        }).message;
            const crash = getCrashDamage(moveName, stats1.hp);
            if (crash > 0) {
              const selfBefore = battleData.chp;
              const crashTaken = Math.min(crash, selfBefore);
              battleData.chp = Math.max(0, selfBefore - crashTaken);
              battleData.tem[battleData.c] = Math.max(0, (battleData.tem[battleData.c] || selfBefore) - crashTaken);
              msgLocal += '\n-> <b>'+c(p.name)+'</b> crashed and lost <code>'+crashTaken+'</code> HP!';
            }
    } else if (hasAccuracyCheck && !isStatusMove && Math.random() < 0.05) {
        msgLocal += unawareMessage;
        msgLocal += '\n-> <b>'+c(op.name)+'</b> Dodged <b>'+c(p.name)+'</b>\'s <b>'+c(moveLabel)+'</b>';
            const crash = getCrashDamage(moveName, stats1.hp);
            if (crash > 0) {
              const selfBefore = battleData.chp;
              const crashTaken = Math.min(crash, selfBefore);
              battleData.chp = Math.max(0, selfBefore - crashTaken);
              battleData.tem[battleData.c] = Math.max(0, (battleData.tem[battleData.c] || selfBefore) - crashTaken);
              msgLocal += '\n-> <b>'+c(p.name)+'</b> crashed and lost <code>'+crashTaken+'</code> HP!';
            }
    } else {
            if (moveName === 'leech seed') {
              if (!battleData.leechSeed || typeof battleData.leechSeed !== 'object') {
                battleData.leechSeed = {};
              }
              const defenderTypes = getEffectivePokemonTypes({ pokemonName: op.name, pokemonTypes: pokes[op.name]?.types || [], heldItem: defenderHeldItemName }).map((t) => String(t).toLowerCase());
              if (defenderTypes.includes('grass')) {
                msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b> but it failed!';
              } else if (battleData.leechSeed[battleData.o]) {
                msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(moveLabel)+'</b> but it failed!';
              } else {
                battleData.leechSeed[battleData.o] = battleData.c;
                msgLocal += '\n-> <b>'+c(p.name)+'</b> planted a seed on <b>'+c(op.name)+'</b>!';
              }
            } else if ((move.category == 'status' || !move.power) && !OHKO_MOVES.has(moveName)) {
            const goodAsGoldInfo = getGoodAsGoldInfo({ abilityName: defenderAbility });
            if (goodAsGoldInfo.active && isOpponentTargetingStatusMove(move, moveName)) {
              blockedByGoodAsGold = true;
              msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b>.';
              msgLocal += getAbilityActivationMessage(op.name, 'Good As Gold');
              msgLocal += unawareMessage;
              msgLocal += '\n-> It had no effect on <b>'+c(op.name)+'</b>!';
            } else {
            msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b>.';
            msgLocal += unawareMessage;
            msgLocal += applyMoveStatEffects({
              battleData,
              moveName,
              moveCategory: move.category,
              attackerName: p.name,
              defenderName: op.name,
              attackerPass: battleData.c,
              defenderPass: battleData.o,
              attackerAbility,
              defenderAbility,
              targetAlive: battleData.ohp > 0
            });
            msgLocal += applyEntryHazardSetupByMove(moveName, battleData, battleData.oid, true);
            msgLocal += applyEntryHazardRemovalByMove(moveName, battleData, battleData.cid, battleData.oid, true);

            if (moveName === 'strength sap') {
              const targetStages = ensurePokemonStatStages(battleData, battleData.o);
              const targetAtk = applyStageToStat(stats2.attack, targetStages.attack);
              const healAmount = Math.max(1, Math.floor(targetAtk * (attackerHeldItemInfo.recoveryMultiplier || 1)));
              const hpBefore = battleData.chp;
              battleData.chp = Math.min(stats1.hp, battleData.chp + healAmount);
              const healed = Math.max(0, battleData.chp - hpBefore);
              battleData.tem[battleData.c] = Math.min(stats1.hp, Math.max(0, (battleData.tem[battleData.c] || hpBefore) + healed));
              if (healed > 0) {
                msgLocal += '\n-> <b>'+c(p.name)+'</b> restored <code>'+healed+'</code> HP with <b>'+c(moveLabel)+'</b>!';
              }
            }

            if (moveName === 'belly drum') {
              const bdHalf = Math.floor(stats1.hp / 2);
              if (battleData.chp > bdHalf) {
                battleData.chp -= bdHalf;
                battleData.tem[battleData.c] = Math.max(0, (battleData.tem[battleData.c] || battleData.chp) - bdHalf);
                const bdStages = ensurePokemonStatStages(battleData, battleData.c);
                const bdTarget = attackerAbility === 'contrary' ? -6 : 6;
                const bdDelta = bdTarget - (bdStages.attack || 0);
                if (bdDelta !== 0) {
                  msgLocal += applyStageChanges({
                    battleData,
                    pass: battleData.c,
                    pokemonName: p.name,
                    abilityName: attackerAbility,
                    changes: [{ stat: 'attack', delta: bdDelta }],
                    c,
                    fromOpponent: false
                  }).message;
                }
                msgLocal += '\n-> <b>'+c(p.name)+'</b> cut its own HP to maximize Attack!';
              } else {
                msgLocal += '\n-> But it failed!';
              }
            }

            if (moveName === 'clangorous soul') {
              const csThird = Math.floor(stats1.hp / 3);
              if (battleData.chp > csThird) {
                battleData.chp = Math.max(1, battleData.chp - csThird);
                battleData.tem[battleData.c] = Math.max(1, (battleData.tem[battleData.c] || battleData.chp + csThird) - csThird);
                msgLocal += applyStageChanges({
                  battleData,
                  pass: battleData.c,
                  pokemonName: p.name,
                  abilityName: attackerAbility,
                  changes: ['attack','defense','special_attack','special_defense','speed'].map((stat) => ({ stat, delta: 1 })),
                  c,
                  fromOpponent: false
                }).message;
                msgLocal += '\n-> <b>'+c(p.name)+'</b> cut its HP to power itself up!';
              } else {
                msgLocal += '\n-> But it failed!';
              }
            }

            if (moveName === 'fillet away') {
              const faHalf = Math.floor(stats1.hp / 2);
              if (battleData.chp > faHalf) {
                battleData.chp -= faHalf;
                battleData.tem[battleData.c] = Math.max(0, (battleData.tem[battleData.c] || battleData.chp) - faHalf);
                msgLocal += applyStageChanges({
                  battleData,
                  pass: battleData.c,
                  pokemonName: p.name,
                  abilityName: attackerAbility,
                  changes: [{ stat: 'attack', delta: 2 }, { stat: 'special_attack', delta: 2 }, { stat: 'speed', delta: 2 }],
                  c,
                  fromOpponent: false
                }).message;
                msgLocal += '\n-> <b>'+c(p.name)+'</b> cut its HP to sharpen all its senses!';
              } else {
                msgLocal += '\n-> But it failed!';
              }
            }

            if (moveName === 'growth') {
              const growthDelta = getGrowthStageChange(battleData);
              msgLocal += applyStageChanges({
                battleData,
                pass: battleData.c,
                pokemonName: p.name,
                abilityName: attackerAbility,
                changes: [{ stat: 'attack', delta: growthDelta }, { stat: 'special_attack', delta: growthDelta }],
                c,
                fromOpponent: false
              }).message;
            }

            if (HALF_HEAL_STATUS_MOVES.has(moveName)) {
              const healed = healBattlePokemon({
                battleData,
                pass: battleData.c,
                maxHp: stats1.hp,
                amount: Math.max(1, Math.floor(stats1.hp / 2) * (attackerHeldItemInfo.recoveryMultiplier || 1)),
                hpKey: 'chp',
                tempKey: 'tem'
              });
              if (healed > 0) {
                msgLocal += '\n-> <b>'+c(p.name)+'</b> restored <code>'+healed+'</code> HP with <b>'+c(moveLabel)+'</b>!';
              }
            }

            if (moveName === 'rest') {
              if (battleData.chp >= stats1.hp || getBattleStatus(battleData, battleData.c) === 'sleep') {
                msgLocal += '\n-> But it failed!';
              } else {
                const healed = healBattlePokemon({
                  battleData,
                  pass: battleData.c,
                  maxHp: stats1.hp,
                  amount: stats1.hp,
                  hpKey: 'chp',
                  tempKey: 'tem'
                });
                setBattleSleepStatus(battleData, battleData.c, 2);
                msgLocal += '\n-> <b>'+c(p.name)+'</b> fell asleep and restored <code>'+healed+'</code> HP with <b>'+c(moveLabel)+'</b>!';
              }
            }

            if (moveName === 'lunar blessing') {
              const healed = healBattlePokemon({
                battleData,
                pass: battleData.c,
                maxHp: stats1.hp,
                amount: Math.max(1, Math.floor(stats1.hp / 2) * (attackerHeldItemInfo.recoveryMultiplier || 1)),
                hpKey: 'chp',
                tempKey: 'tem'
              });
              const clearedStatus = clearBattleMajorStatus(battleData, battleData.c);
              if (healed > 0) {
                msgLocal += '\n-> <b>'+c(p.name)+'</b> restored <code>'+healed+'</code> HP with <b>'+c(moveLabel)+'</b>!';
              }
              if (clearedStatus) {
                msgLocal += '\n-> <b>'+c(p.name)+'</b> was cured of <b>'+getStatusLabel(clearedStatus)+'</b>.';
              }
            }

            if (moveName === 'purify') {
              const targetStatus = getBattleStatus(battleData, battleData.o);
              if (!targetStatus) {
                msgLocal += '\n-> But it failed!';
              } else {
                clearBattleMajorStatus(battleData, battleData.o);
                msgLocal += '\n-> <b>'+c(op.name)+'</b> was cured of <b>'+getStatusLabel(targetStatus)+'</b>.';
                const healed = healBattlePokemon({
                  battleData,
                  pass: battleData.c,
                  maxHp: stats1.hp,
                  amount: Math.max(1, Math.floor(stats1.hp / 2) * (attackerHeldItemInfo.recoveryMultiplier || 1)),
                  hpKey: 'chp',
                  tempKey: 'tem'
                });
                if (healed > 0) {
                  msgLocal += '\n-> <b>'+c(p.name)+'</b> restored <code>'+healed+'</code> HP with <b>'+c(moveLabel)+'</b>!';
                }
              }
            }

            if (moveName === 'synthesis' || moveName === 'morning sun' || moveName === 'moonlight' || moveName === 'shore up') {
              const recoveryRatio = getWeatherRecoveryRatio({ battleData, moveName });
              if (recoveryRatio > 0) {
                const healed = healBattlePokemon({
                  battleData,
                  pass: battleData.c,
                  maxHp: stats1.hp,
                  amount: Math.max(1, Math.floor(stats1.hp * recoveryRatio * (attackerHeldItemInfo.recoveryMultiplier || 1))),
                  hpKey: 'chp',
                  tempKey: 'tem'
                });
                if (healed > 0) {
                  msgLocal += '\n-> <b>'+c(p.name)+'</b> restored <code>'+healed+'</code> HP with <b>'+c(moveLabel)+'</b>!';
                }
              }
            }

            if (moveName === 'minimize') {
              setPokemonMinimized(battleData, battleData.c, true);
            }

            msgLocal += applyScreenSetupByMove(moveName, battleData, battleData.cid, true);
            msgLocal += applyScreenRemovalByMove(moveName, battleData, battleData.oid, true);
            msgLocal += applyWeatherByMove({
              battleData,
              moveName,
              pass: battleData.c,
              pokemonName: p.name,
              heldItem: p.held_item,
              c,
              didHit: true
            }).message;

            msgLocal += applySelfFaintAfterMove(moveName, moveLabel, battleData, battleData.c, p.name);
            }
        } else {
              const weatherSuppressedMessage = getWeatherSuppressedMoveMessage({
                battleData,
                moveType: effectiveMoveType,
                moveCategory: move.category,
                pokemonName: p.name,
                moveName: moveLabel,
                c
              });
              if (moveName === 'dream eater' && getBattleStatus(battleData, battleData.o) !== 'sleep') {
                msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b> but it failed!';
              } else if (weatherSuppressedMessage) {
                msgLocal += weatherSuppressedMessage;
              } else {
            const pinchPowerMult = getPinchPowerMultiplier({
              abilityName: attackerAbility,
              moveType: effectiveMoveType,
              currentHp: battleData.chp,
              maxHp: stats1.hp
            });
            const technicianInfo = getTechnicianPowerInfo({
              abilityName: attackerAbility,
              movePower: move.power
            });
            const boostedPower = Math.max(1, Math.floor(getBattleMovePower({
              battleData,
              pass: battleData.c,
              pokemonName: p.name,
              abilityName: attackerAbility,
              moveName,
              moveType: effectiveMoveType,
              movePower: move.power
            }) * getWeatherMovePowerMultiplier({ battleData, moveName, moveType: effectiveMoveType }) * pinchPowerMult * technicianInfo.multiplier));
            const stabInfo = getStabInfo({
              abilityName: attackerAbility,
              moveType: effectiveMoveType,
              pokemonTypes: getEffectivePokemonTypes({ pokemonName: p.name, pokemonTypes: pokes[p.name]?.types || [], heldItem: attackerHeldItemName })
            });
            var damage = Math.min(Math.max(0, Math.floor(calc(atk, def2, level1, boostedPower, eff1) * stabInfo.multiplier)), battleData.ohp);
            const lifeOrbBoostActive = attackerHeldItemInfo.lifeOrbActive && !isDirectDamageMove(moveName);
            if (lifeOrbBoostActive && damage > 0) {
              damage = Math.min(Math.max(1, Math.floor(damage * attackerHeldItemInfo.damageMultiplier)), battleData.ohp);
            }
            let ohkoFailed = false;
            if (OHKO_MOVES.has(moveName)) {
              const attackerTypes = getEffectivePokemonTypes({ pokemonName: p.name, pokemonTypes: pokes[p.name]?.types || [], heldItem: attackerHeldItemName }).map((t) => String(t).toLowerCase());
              const defenderTypes = getEffectivePokemonTypes({ pokemonName: op.name, pokemonTypes: pokes[op.name]?.types || [], heldItem: defenderHeldItemName }).map((t) => String(t).toLowerCase());
              const sheerColdBlocked = moveName === 'sheer cold' && defenderTypes.includes('ice') && !attackerTypes.includes('ice');
              const ohkoChance = getOhkoHitChance(level1, level2);
              if (level1 < level2 || sheerColdBlocked || Math.random() * 100 >= ohkoChance) {
                damage = 0;
                ohkoFailed = true;
              } else {
                damage = battleData.ohp;
              }
            }
            if (!ohkoFailed && hitsMinimizedBonus && damage > 0) {
              damage = Math.min(Math.max(1, Math.floor(damage * MINIMIZE_PUNISH_MULTIPLIER)), battleData.ohp);
            }
            const isPerfectCrit = PERFECT_CRIT_MOVES.has(moveName);
            const isHighCritMove = HIGH_CRIT_RATIO_MOVES.has(moveName);
              let hitCount = (!ohkoFailed && damage > 0) ? getMultiHitCount(moveName) : 1;
              let critHits = 0;
              let staminaMessage = '';
              let weakArmorMessage = '';
              let shieldMessage = '';
              let sturdyMessage = '';
              let multiscaleMessage = '';
              let levitateMessage = '';
              if (!ohkoFailed && damage > 0 && !OHKO_MOVES.has(moveName)) {
              let totalDamage = 0;
              let landedHits = 0;
              for (let h = 0; h < hitCount; h += 1) {
                const remainingHp = battleData.ohp - totalDamage;
                if (remainingHp <= 0) break;

                let hitDamage = damage;
                const didHitCrit = isPerfectCrit || (isHighCritMove && Math.random() < HIGH_CRIT_RATIO_CHANCE);
                if (didHitCrit) {
                  critHits += 1;
                  hitDamage = Math.max(1, Math.floor(hitDamage * CRIT_DAMAGE_MULTIPLIER));
                } else {
                  const screenMult = getScreenDamageMultiplier(battleData, battleData.oid, move.category, attackerAbility, moveName);
                  if (screenMult < 1) {
                    hitDamage = Math.max(1, Math.floor(hitDamage * screenMult));
                  }
                }

                  const shieldResult = applyShadowShieldReduction({
                    abilityName: defenderAbility,
                  currentHp: remainingHp,
                  maxHp: stats2.hp,
                  incomingDamage: hitDamage,
                  moveName,
                  pokemonName: op.name,
                  c
                });
                  hitDamage = shieldResult.damage;
                  if (shieldResult.activated && !shieldMessage) {
                    shieldMessage = shieldResult.message;
                  }
                  const multiscaleResult = applyMultiscaleReduction({
                    abilityName: defenderAbility,
                    currentHp: remainingHp,
                    maxHp: stats2.hp,
                    incomingDamage: hitDamage,
                    pokemonName: op.name,
                    c
                  });
                  hitDamage = multiscaleResult.damage;
                  if (multiscaleResult.activated && !multiscaleMessage) {
                    multiscaleMessage = multiscaleResult.message;
                  }
                const sturdyResult = applySturdySurvival({
                  abilityName: defenderAbility,
                  currentHp: remainingHp,
                  maxHp: stats2.hp,
                  incomingDamage: hitDamage,
                  pokemonName: op.name,
                  c
                });
                hitDamage = sturdyResult.damage;
                if (sturdyResult.activated && !sturdyMessage) {
                  sturdyMessage = sturdyResult.message;
                }
                const focusSashResult = applyFocusSashSurvival({
                  battleData,
                  pass: battleData.o,
                  heldItem: op.held_item,
                  currentHp: remainingHp,
                  maxHp: stats2.hp,
                  incomingDamage: hitDamage,
                  pokemonName: op.name,
                  moveName,
                  c
                });
                hitDamage = focusSashResult.damage;
                if (focusSashResult.activated && !sturdyMessage) {
                  sturdyMessage = focusSashResult.message;
                }
                hitDamage = Math.min(hitDamage, remainingHp);
                totalDamage += hitDamage;
                landedHits += 1;
                staminaMessage += applyStaminaOnHit({
                  battleData,
                  pass: battleData.o,
                  pokemonName: op.name,
                  abilityName: defenderAbility,
                  damageDealt: hitDamage,
                  c
                }).message;
                weakArmorMessage += applyWeakArmorOnHit({
                  battleData,
                  pass: battleData.o,
                  pokemonName: op.name,
                  abilityName: defenderAbility,
                  moveCategory: move.category,
                  damageDealt: hitDamage,
                  c,
                  deferWhiteHerb: hitCount > 1
                }).message;
              }
              if (hitCount > 1) {
                weakArmorMessage += applyWhiteHerbIfNeeded({
                  battleData,
                  pass: battleData.o,
                  pokemonName: op.name,
                  c
                }).message;
              }
              hitCount = landedHits;
              damage = totalDamage;
            }
            if (OHKO_MOVES.has(moveName) && damage > 0) {
              const sturdyDamage = applyDefenderDamageWithSturdy({
                battleData,
                damage,
                defenderAbility,
                defenderName: op.name,
                defenderMaxHp: stats2.hp,
                moveName
              });
              damage = sturdyDamage.damage;
              const focusSashDamage = applyFocusSashSurvival({
                battleData,
                pass: battleData.o,
                heldItem: op.held_item,
                currentHp: battleData.ohp,
                maxHp: stats2.hp,
                incomingDamage: damage,
                pokemonName: op.name,
                moveName,
                c
              });
              damage = focusSashDamage.damage;
              staminaMessage += applyStaminaOnHit({
                battleData,
                pass: battleData.o,
                pokemonName: op.name,
                abilityName: defenderAbility,
                damageDealt: damage,
                c
              }).message;
              sturdyMessage += sturdyDamage.message + focusSashDamage.message;
            } else {
              battleData.ohp = Math.max((battleData.ohp - damage), 0);
              battleData.tem2[battleData.o] = Math.max((battleData.tem2[battleData.o] - damage), 0);
            }
              if (ohkoFailed) {
                msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(moveLabel)+'</b> but it failed!';
              } else {
                msgLocal += '\n-> <b>'+c(p.name)+'</b> used <b>'+c(move.name)+'</b> and dealt <code>'+damage+'</code> HP to <b>'+c(op.name)+'</b>';
                msgLocal += unawareMessage;
                if (groundBlockedMove && defenderLevitateInfo.active) {
                  levitateMessage = '\n-> <b>'+c(op.name)+'</b>\'s <b>Levitate</b> activated!';
                }
                if (groundBlockedMove && defenderAirBalloonInfo.active) {
                  levitateMessage += '\n-> <b>'+c(op.name)+'</b>\'s <b>Air Balloon</b> activated!';
                }
                msgLocal += getInfiltratorBypassMessage(battleData, battleData.oid, move.category, attackerAbility, p.name, moveName);
                if (pinchPowerMult > 1) {
                  msgLocal += '\n-> <b>'+c(p.name)+'</b>\'s <b>'+c(formatAbilityLabel(attackerAbility))+'</b> boosted its '+c(effectiveMoveType)+'-type move!';
                }
                msgLocal += staminaMessage;
                if (technicianInfo.active) {
                  msgLocal += '\n-> <b>'+c(p.name)+'</b>\'s <b>Technician</b> activated!';
                }
                if (stabInfo.adaptabilityActive && damage > 0) {
                  msgLocal += '\n-> <b>'+c(p.name)+'</b>\'s <b>Adaptability</b> activated!';
                }
                if (supremeOverlordInfo.active && damage > 0) {
                  msgLocal += '\n-> <b>'+c(p.name)+'</b>\'s <b>Supreme Overlord</b> activated!';
                }
                msgLocal += weakArmorMessage;
                msgLocal += shieldMessage;
                msgLocal += multiscaleMessage;
                msgLocal += sturdyMessage;
                msgLocal += levitateMessage;
                if (defenderAirBalloonInfo.active && damage > 0 && (move.category === 'physical' || move.category === 'special')) {
                  consumeBattleHeldItem({ battleData, pass: battleData.o, heldItem: op.held_item });
                  msgLocal += '\n-> <b>'+c(op.name)+'</b>\'s <b>Air Balloon</b> popped!';
                }
                if (hitCount > 1) {
                  msgLocal += '\n-> It hit <b>'+hitCount+'</b> times!';
                }
            }
            if (!ohkoFailed && critHits > 0 && damage > 0) {
              msgLocal += '\n-> <b>A critical hit!</b>';
            }

              if (eff1 === 0) {
                const crash = getCrashDamage(moveName, stats1.hp);
                if (crash > 0) {
                  const selfBefore = battleData.chp;
                  const crashTaken = Math.min(crash, selfBefore);
                  battleData.chp = Math.max(0, selfBefore - crashTaken);
                  battleData.tem[battleData.c] = Math.max(0, (battleData.tem[battleData.c] || selfBefore) - crashTaken);
                  msgLocal += '\n-> <b>'+c(p.name)+'</b> crashed and lost <code>'+crashTaken+'</code> HP!';
                }
              }

              const drainRatio = getDrainRatio(moveName);
              if (drainRatio > 0 && damage > 0) {
                const healRaw = Math.max(1, Math.floor(damage * drainRatio));
                const adjustedDrain = Math.max(1, Math.floor(healRaw * (attackerHeldItemInfo.recoveryMultiplier || 1)));
                const liquidOozeActive = normalizeAbilityName(defenderAbility) === 'liquid-ooze';
                if (liquidOozeActive) {
                  const prevHp = battleData.chp;
                  const oozeDamage = Math.min(adjustedDrain, prevHp);
                  battleData.chp = Math.max(0, prevHp - oozeDamage);
                  battleData.tem[battleData.c] = Math.max(0, (battleData.tem[battleData.c] || prevHp) - oozeDamage);
                  msgLocal += '\n-> <b>'+c(op.name)+'</b>\'s <b>Liquid Ooze</b> activated!';
                  msgLocal += '\n-> <b>'+c(p.name)+'</b> lost <code>'+oozeDamage+'</code> HP!';
                } else {
                  const prevHp = battleData.chp;
                  battleData.chp = Math.min(stats1.hp, battleData.chp + adjustedDrain);
                  const healed = Math.max(0, battleData.chp - prevHp);
                  battleData.tem[battleData.c] = Math.min(stats1.hp, Math.max(0, (battleData.tem[battleData.c] || prevHp) + healed));
                  if (healed > 0) {
                    msgLocal += '\n-> <b>'+c(p.name)+'</b> drained <code>'+healed+'</code> HP!';
                  }
                }
              }

              const recoil = getRecoilDamage(moveName, damage, stats1.hp);
              if (recoil > 0) {
                const selfBefore = battleData.chp;
                const recoilTaken = Math.min(recoil, selfBefore);
                battleData.chp = Math.max(0, selfBefore - recoilTaken);
                battleData.tem[battleData.c] = Math.max(0, (battleData.tem[battleData.c] || selfBefore) - recoilTaken);
                msgLocal += '\n-> <b>'+c(p.name)+'</b> was hurt by recoil and lost <code>'+recoilTaken+'</code> HP!';
              }
              msgLocal += applySelfFaintAfterMove(moveName, moveLabel, battleData, battleData.c, p.name);
              if (attackerHeldItemInfo.lifeOrbActive && move.category !== 'status' && !ohkoFailed && moveName !== 'fling' && battleData.chp > 0) {
                const selfBefore = battleData.chp;
                const lifeOrbDamage = Math.max(1, Math.floor(stats1.hp / 10));
                const taken = Math.min(lifeOrbDamage, selfBefore);
                battleData.chp = Math.max(0, selfBefore - taken);
                battleData.tem[battleData.c] = Math.max(0, (battleData.tem[battleData.c] || selfBefore) - taken);
                msgLocal += '\n-> <b>'+c(p.name)+'</b>\'s <b>Life Orb</b> activated!';
                msgLocal += '\n-> <b>'+c(p.name)+'</b> lost <code>'+taken+'</code> HP from its <b>Life Orb</b>!';
              }
              msgLocal += applyEntryHazardSetupByMove(moveName, battleData, battleData.oid, damage > 0);
              msgLocal += applyEntryHazardRemovalByMove(moveName, battleData, battleData.cid, battleData.oid, damage > 0);
              msgLocal += applyScreenSetupByMove(moveName, battleData, battleData.cid, damage > 0);
              msgLocal += applyScreenRemovalByMove(moveName, battleData, battleData.oid, damage > 0);
            
            // Record hit for counter-attacks and accumulate bide damage
              battleData.turnHits[battleData.o] = { damage: damage, category: move.category, from: battleData.c, move: moveName };
            if (battleData.bideState && battleData.bideState[battleData.o]) {
                battleData.bideState[battleData.o].damage += damage;
                battleData.bideState[battleData.o].lastAttacker = battleData.c;
            }
            
            if (!ohkoFailed && eff1 == 0) msgLocal += '\n<b>* It\'s 0x effective!</b>';
            else if (!ohkoFailed && eff1 == 0.5) msgLocal += '\n<b>* It\'s not very effective...</b>';
            else if (!ohkoFailed && eff1 == 2) msgLocal += '\n<b>* It\'s super effective!</b>';
            else if (!ohkoFailed && eff1 == 4) msgLocal += '\n<b>* It\'s incredibly super effective!</b>';

            if (damage > 0) {
                msgLocal += applyMoveStatEffects({
                  battleData,
                  moveName,
                  moveCategory: move.category,
                  attackerName: p.name,
                  defenderName: op.name,
                  attackerPass: battleData.c,
                  defenderPass: battleData.o,
                  attackerAbility,
                  defenderAbility,
                  targetAlive: battleData.ohp > 0
                });
              if (moveName === 'fell stinger' && battleData.ohp <= 0) {
                msgLocal += applyStageChanges({
                  battleData,
                  pass: battleData.c,
                  pokemonName: p.name,
                  abilityName: attackerAbility,
                  changes: [{ stat: 'attack', delta: 3 }],
                  c,
                  fromOpponent: false
                }).message;
              }
            }
            msgLocal += applyAbilityOnDamageTaken({
              battleData,
              pass: battleData.o,
              pokemonName: op.name,
              attackerPass: battleData.c,
              attackerName: p.name,
              abilityName: defenderAbility,
              heldItem: op.held_item,
              attackerAbility,
              moveName,
              typeEffectiveness: eff1,
              moveType: effectiveMoveType,
              moveCategory: move.category,
              attackerMaxHp: stats1.hp,
              hpBefore: defenderHpBeforeHit,
              hpAfter: battleData.ohp,
              maxHp: stats2.hp,
              damageDealt: damage,
              c
            }).message;
            if (battleData.ohp <= 0) {
              const remainingDefenderMons = Object.keys(battleData.tem2 || {}).filter((pass) => battleData.tem2[pass] > 0);
              if (remainingDefenderMons.length > 0 || normalizeAbilityName(attackerAbility) !== 'beast-boost') {
                msgLocal += applyAbilityKo({
                  battleData,
                  pass: battleData.c,
                  pokemonName: p.name,
                  abilityName: attackerAbility,
                  stats: stats1,
                  c
                }).message;
              }
            }
            }
        }
        
        // Status condition inflictions
        const statusEffect = getMoveStatusEffect(move);
        if (statusEffect && battleData.ohp > 0 && !blockedByGoodAsGold) {
            const existingStatus = getBattleStatus(battleData, battleData.o);
            const defenderTypes = getEffectivePokemonTypes({ pokemonName: op.name, pokemonTypes: pokes[op.name]?.types || [], heldItem: defenderHeldItemName });
            if (!existingStatus && !isStatusImmune(statusEffect.status, defenderTypes) && Math.random() < statusEffect.chance) {
                setBattleStatus(battleData, battleData.o, statusEffect.status);
                msgLocal += '\n-> <b>'+c(op.name)+'</b> is now <b>'+getStatusLabel(statusEffect.status)+'</b>.';
            }
        }
        }
    }
      }
    
    msgLocal += applyDefenderResidualDamage(battleData, battleData.o, op.name, stats2.hp);

    // Leech Seed: seeded target loses HP, and the source recovers HP (single-battle context).
    if (battleData.leechSeed && battleData.leechSeed[battleData.o] && String(battleData.leechSeed[battleData.o]) === String(battleData.c) && battleData.ohp > 0) {
      const leechDamage = Math.max(1, Math.floor(stats2.hp / 8));
      const drained = Math.min(leechDamage, battleData.ohp);
      battleData.ohp = Math.max(0, battleData.ohp - drained);
      battleData.tem2[battleData.o] = Math.max(0, battleData.tem2[battleData.o] - drained);

      msgLocal += '\n-> <b>'+c(op.name)+'</b> had its energy sapped by Leech Seed and lost <code>'+drained+'</code> HP.';
      const adjustedLeech = Math.max(1, Math.floor(drained * (attackerHeldItemInfo.recoveryMultiplier || 1)));
      const liquidOozeActive = normalizeAbilityName(defenderAbility) === 'liquid-ooze';
      if (liquidOozeActive) {
        const hpBefore = battleData.chp;
        const oozeDamage = Math.min(adjustedLeech, hpBefore);
        battleData.chp = Math.max(0, hpBefore - oozeDamage);
        battleData.tem[battleData.c] = Math.max(0, (battleData.tem[battleData.c] || hpBefore) - oozeDamage);
        msgLocal += '\n-> <b>'+c(op.name)+'</b>\'s <b>Liquid Ooze</b> activated!';
        msgLocal += '\n-> <b>'+c(p.name)+'</b> lost <code>'+oozeDamage+'</code> HP from Leech Seed!';
      } else {
        const hpBefore = battleData.chp;
        battleData.chp = Math.min(stats1.hp, battleData.chp + adjustedLeech);
        const healed = Math.max(0, battleData.chp - hpBefore);
        battleData.tem[battleData.c] = Math.min(stats1.hp, Math.max(0, (battleData.tem[battleData.c] || hpBefore) + healed));
        if (healed > 0) {
          msgLocal += '\n-> <b>'+c(p.name)+'</b> restored <code>'+healed+'</code> HP from Leech Seed.';
        }
      }
    }
    
    // Reveal Used Move
    if (!battleData.usedMoves) battleData.usedMoves = {};
    if (!battleData.usedMoves[battleData.c]) battleData.usedMoves[battleData.c] = [];
    if (!battleData.usedMoves[battleData.c].includes(act.id)) battleData.usedMoves[battleData.c].push(act.id);
    
    turnLogs += msgLocal;
}

await executeStandardMove(orderedActions[0]);

// Ensure second action executes correctly
if (!singleActionTurn && battleData.ohp > 0 && battleData.chp > 0) { // both must be alive
    fullSwap(battleData); // Context swap so opponent becomes Attacker
    await executeStandardMove(orderedActions[1]);
} 

// What if someone fainted?
if (battleData.chp <= 0 || battleData.ohp <= 0) {
    if (battleData.ohp <= 0 && battleData.chp > 0) {
        fullSwap(battleData); // ensure cid points to the fainted pokemon so UI logic works below
    }
} else {
    // Nobody fainted, just pick the next selector. 
    fullSwap(battleData); 
}

tickScreensForTurn(battleData);
await saveBattleData(bword, battleData);

const attacker = await getUserData(battleData.cid)
const defender = await getUserData(battleData.oid)
const p1 = attacker.pokes.filter((poke)=>poke.pass==battleData.c)[0]
const p2 = defender.pokes.filter((poke)=>poke.pass==battleData.o)[0]
const pp = pokes[p1.name]
const pp2 = pokes[p2.name]
const base1 = pokestats[p2.name]
const base2 = pokestats[p1.name]
const level1 = plevel(p2.name,p2.exp)
const level2 = plevel(p1.name,p1.exp)
const stats1 = await Stats(base1,p2.ivs,p2.evs,c(p2.nature),level1)
const stats2 = await Stats(base2,p1.ivs,p1.evs,c(p1.nature),level2)

let msg = turnLogs;

const messageData = await loadMessageData();
messageData[bword] = { chat:ctx.chat.id,mid: ctx.callbackQuery.message.message_id, times: Date.now(),turn:battleData.cid,oppo:battleData.oid };
await saveMessageData(messageData);

if(battleData.chp < 1){
msg += '\n\n<b>'+c(p1.name)+'</b> has fainted. Choose your next pokemon.'
if(!battleData.set.sandbox){
await incexp(defender,p2,attacker,p1,ctx,battleData,bot)
await incexp2(attacker,p1,defender,p2,ctx,battleData,bot)
}
const av = []
const al = []
let b = 1
for(const pok in battleData.tem){
if(battleData.tem[pok] > 0){
const ppe = attacker.pokes.filter((poke)=>poke.pass == pok)[0]
av.push({name:b,pass:pok})
al.push(pok)
}else{
av.push({name:b+' (0 HP)',pass:pok})
}
b++;
}
 if(al.length < 1){
  const rewardLp = 50
  if(!Number.isFinite(defender.inv.league_points)){
  defender.inv.league_points = 0
  }
  defender.inv.league_points += rewardLp
  if(!defender.inv.win){
defender.inv.win = 0
}
defender.inv.win += 1
  if(!attacker.inv.lose){
  attacker.inv.lose = 0
  }
  attacker.inv.lose += 1
  if(battleData.tempBattle && battleData.tempTeams){
  const t1 = battleData.tempTeams[battleData.cid] || []
  const t2 = battleData.tempTeams[battleData.oid] || []
  attacker.pokes = (attacker.pokes || []).filter(p => !t1.includes(p.pass))
  defender.pokes = (defender.pokes || []).filter(p => !t2.includes(p.pass))
  if(attacker.extra && attacker.extra.temp_battle){
  delete attacker.extra.temp_battle[bword]
  }
  if(defender.extra && defender.extra.temp_battle){
  delete defender.extra.temp_battle[bword]
  }
  }
  revertPowerConstructFormsOnBattleEnd(battleData, attacker)
  revertPowerConstructFormsOnBattleEnd(battleData, defender)
  revertTrackedFormsOnBattleEnd(battleData, attacker)
  revertTrackedFormsOnBattleEnd(battleData, defender)
  await saveUserData2(battleData.cid,attacker)
  await saveUserData2(battleData.oid,defender)
const messageData = await loadMessageData();
messageData.battle = messageData.battle.filter((chats)=> chats!==parseInt(messageData[bword].turn) && chats!==parseInt(messageData[bword].oppo))
delete messageData[bword];
await saveMessageData(messageData);
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'<b>'+c(p1.name)+' </b>has fainted.\n<a href="tg://user?id='+battleData.cid+'"><b>'+displayName(attacker,battleData.cid)+'</b></a> lost against <a href="tg://user?id='+battleData.oid+'"><b>'+displayName(defender,battleData.oid)+'</b></a>.\n+'+rewardLp+' LP ⭐',{parse_mode:'HTML'})
if(Math.random()< 0.00005){
const idr = (Math.random()<0.5) ? battleData.oid : battleData.cid
const dr = await getUserData(idr)
await sendMessage(ctx,ctx.chat.id,{parse_mode:'HTML'},'<a href="tg://user?id='+idr+'"><b>'+displayName(dr,idr)+'</b></a>, A <b>Move Tutor</b> was watching your match. He wants to <b>Teach</b> one of your <b>Pokemon</b> a <b>Move.</b>',{reply_markup:{inline_keyboard:[[{text:'Go',url:'t.me/'+bot.botInfo.username+''}]]}})
const options = {
  timeZone: 'Asia/Kolkata',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hour12: true,
};

const d = new Date().toLocaleString('en-US', options)
const my = String(tutors[Math.floor(Math.random()*tutors.length)])
const m77 = await sendMessage(ctx,idr,'While you were <b>Battling</b> with a trainer, An expert <b>Move Tutor</b> saw your battle very interestingly. He Impressed with your <b>Battle</b> experience and strategy. He wants to <b>Teach</b> your any of <b>Pokemon</b> a move. It will be available only for next <b>15 Minutes.</b>\n\n✦ <b>'+c(dmoves[my].name)+'</b> ['+c(dmoves[my].type)+' '+emojis[dmoves[my].type]+']\n<b>Power:</b> '+dmoves[my].power+', <b>Accuracy:</b> '+dmoves[my].accuracy+' (<i>'+c(dmoves[my].category)+'</i>) \n\n• Click below to <b>Select</b> pokemon to teach <b>'+c(dmoves[my].name)+'</b>',{parse_mode:'html',reply_markup:{inline_keyboard:[[{text:'Select',callback_data:'tyrt_'+my+'_'+d+''}]]}})
const mdata = await loadMessageData();
if(!mdata.tutor){
mdata.tutor = {}
}
mdata.tutor[m77.message_id] = {chat:idr,tdy:d,mv:dmoves[my].name}
await saveMessageData(mdata)
}
}else{
const buttons = av.map((poke) => ({ text: poke.name, callback_data: 'multidne_' + poke.pass + '_' + bword + '_'+battleData.cid+'_fainted' }));
while (buttons.length < 6) {
  buttons.push({ text: '  ', callback_data: 'empty' });
}
const rows = [[{text:'View Team',callback_data:'viewteam_'+bword+'_'+battleData.cid+''}]];
for (let i = 0; i < buttons.length; i += 2) {
  rows.push(buttons.slice(i, i + 2));
}
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'HTML',reply_markup:{inline_keyboard:rows}})
return
}
return
}
const isGroupMmo = ctx.chat.type !== 'private';
const pvpMmo = buildPvpMsg(msg, battleData, attacker, defender, p1, p2, stats1, stats2, bword, isGroupMmo);
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,pvpMmo.msg,{parse_mode:'HTML',reply_markup:pvpMmo.keyboard,...pvpMmo.ext})
})
bot.action(/multichanpok_/,async ctx => {
if (hitBattleCooldown(ctx)) {
  await ctx.answerCbQuery('On cooldown 2 sec');
  return;
}
const bword = ctx.callbackQuery.data.split('_')[1]
const id = ctx.callbackQuery.data.split('_')[2]
if(ctx.from.id!=id){
ctx.answerCbQuery('Not Your Turn')
return
}
let battleData = {};
    try {
      battleData = loadBattleData(bword);
} catch (error) {
      battleData = {};
    }
battleData.set = normalizeBattleSettings(battleData.set)
if(!battleData.set.switch){
ctx.answerCbQuery('Switch is diabled')
return
}
const attacker = await getUserData(battleData.cid)
const defender = await getUserData(battleData.oid)
const p1 = attacker.pokes.filter((poke)=>poke.pass==battleData.c)[0]
const p2 = defender.pokes.filter((poke)=>poke.pass==battleData.o)[0]
const pp = pokes[p1.name]
const pp2 = pokes[p2.name]
const base1 = pokestats[p2.name]
const base2 = pokestats[p1.name]
const level1 = plevel(p2.name,p2.exp)
const level2 = plevel(p1.name,p1.exp)
const stats1 = await Stats(base1,p2.ivs,p2.evs,c(p2.nature),level1)
const stats2 = await Stats(base2,p1.ivs,p1.evs,c(p1.nature),level2)
let msg = '\n\n<b>Opponent :</b> <a href="tg://user?id='+battleData.oid+'"><b>'+displayName(defender,battleData.oid)+'</b></a>'
msg += '\n<b>'+c(p2.name)+'</b> ['+c(pp2.types.join(' / '))+']'+getStatusTag(battleData, battleData.o)
msg += '\n<b>Level :</b> '+plevel(p2.name,p2.exp)+' | <b>HP :</b> '+battleData.ohp+'/'+stats1.hp+''
msg += '\n<code>'+Bar(stats1.hp,battleData.ohp)+'</code>'
 msg += '\n\n<b>Turn :</b> <a href="tg://user?id='+battleData.cid+'"><b>'+displayName(attacker,battleData.cid)+'</b></a>'
msg += '\n<b>'+c(p1.name)+'</b> ['+c(pp.types.join(' / '))+']'+getStatusTag(battleData, battleData.c)
msg += '\n<b>Level :</b> '+plevel(p1.name,p1.exp)+' | <b>HP :</b> '+battleData.chp+'/'+stats2.hp+''
msg += '\n<code>'+Bar(stats2.hp,battleData.chp)+'</code>'
msg += '\n\n<i>Choose another pokemon for battle.</i>'
const av = []
let b = 1
let al = []
for(const pok in battleData.tem){
if(battleData.tem[pok] > 0){
const ppe = attacker.pokes.filter((poke)=>poke.pass == pok)[0]
av.push({name:b,pass:pok})
al.push(pok)
}else{
av.push({name:b+' (0 HP)',pass:pok})
}
b++;
}
const buttons = av.map((poke) => ({ text: poke.name, callback_data: 'multidne_' + poke.pass + '_' + bword + '_'+battleData.cid+'_change' }));
while (buttons.length < 6) {
  buttons.push({ text: '  ', callback_data: 'empty' });
}
const rows = [[{text:'View Team',callback_data:'viewteam_'+bword+'_'+battleData.cid+''}]];
for (let i = 0; i < buttons.length; i += 2) {
  rows.push(buttons.slice(i, i + 2));
}
rows.push([{text:'⬅️ Back',callback_data:'multibttle_'+bword+'_'+battleData.cid+''}])
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'HTML',reply_markup:{inline_keyboard:rows}})
})
bot.action(/multibttle_/,async ctx => {
if (hitBattleCooldown(ctx)) {
  await ctx.answerCbQuery('On cooldown 2 sec');
  return;
}
const bword = ctx.callbackQuery.data.split('_')[1]
const id = ctx.callbackQuery.data.split('_')[2]
if(ctx.from.id!=id){
ctx.answerCbQuery('Not Your Turn')
return
}
let battleData = {};
    try {
      battleData = loadBattleData(bword);
} catch (error) {
      battleData = {};
    }
const attacker = await getUserData(battleData.cid)
const defender = await getUserData(battleData.oid)
const p1 = attacker.pokes.filter((poke)=>poke.pass==battleData.c)[0]
const p2 = defender.pokes.filter((poke)=>poke.pass==battleData.o)[0]
const base1 = pokestats[p2.name]
const base2 = pokestats[p1.name]
const level1 = plevel(p2.name,p2.exp)
const level2 = plevel(p1.name,p1.exp)
const stats1 = await Stats(base1,p2.ivs,p2.evs,c(p2.nature),level1)
const stats2 = await Stats(base2,p1.ivs,p1.evs,c(p1.nature),level2)
const isGroupBtl = ctx.chat.type !== 'private';
const pvpBtl = buildPvpMsg('', battleData, attacker, defender, p1, p2, stats1, stats2, bword, isGroupBtl);
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,pvpBtl.msg,{parse_mode:'HTML',reply_markup:pvpBtl.keyboard,...pvpBtl.ext})
})
bot.action(/zmovetst_/,async ctx => {
if (hitBattleCooldown(ctx)) {
  await ctx.answerCbQuery('On cooldown 2 sec');
  return;
}
const bword = ctx.callbackQuery.data.split('_')[1]
let battleData = {};
    try {
      battleData = loadBattleData(bword);
} catch (error) {
      battleData = {};
    }
if(ctx.from.id!=battleData.cid){
ctx.answerCbQuery('Not Your Turn')
return
}
const attacker = await getUserData(battleData.cid)
const defender = await getUserData(battleData.oid)
const p1 = attacker.pokes.filter((poke)=>poke.pass==battleData.c)[0]
const p2 = defender.pokes.filter((poke)=>poke.pass==battleData.o)[0]
if(!p1 || !p2){
ctx.answerCbQuery('Battle desynced')
return
}
if(ensureBattleZMoveUsedState(battleData)[String(battleData.cid)]){
ctx.answerCbQuery('Z-Move already used')
return
}
if(!canBattlePokemonUseAnyZMove({ battleData, userData: attacker, pokemon: p1 })){
ctx.answerCbQuery('No matching move for equipped Z-Crystal')
return
}
const ready = ensureBattleZMoveReadyState(battleData)
ready[String(battleData.cid)] = !ready[String(battleData.cid)]
await saveBattleData(bword, battleData);
const base1 = getBattleBaseStats({ battleData, pass: p2.pass, pokemonName: p2.name, abilityName: p2.ability, pokestats })
const base2 = getBattleBaseStats({ battleData, pass: p1.pass, pokemonName: p1.name, abilityName: p1.ability, pokestats })
const level1 = plevel(p2.name,p2.exp)
const level2 = plevel(p1.name,p1.exp)
const stats1 = await Stats(base1,p2.ivs,p2.evs,c(p2.nature),level1)
const stats2 = await Stats(base2,p1.ivs,p1.evs,c(p1.nature),level2)
const isGroupZ = ctx.chat.type !== 'private';
const prefix = ready[String(battleData.cid)]
  ? '<b>'+c(p1.name)+'</b> is charged with Z-Power!'
  : '<b>'+c(p1.name)+'</b> is no longer preparing a Z-Move.'
const pvpZ = buildPvpMsg(prefix, battleData, attacker, defender, p1, p2, stats1, stats2, bword, isGroupZ);
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,pvpZ.msg,{parse_mode:'HTML',reply_markup:pvpZ.keyboard,...pvpZ.ext})
})
bot.action(/dyntst_/,async ctx => {
if (hitBattleCooldown(ctx)) {
  await ctx.answerCbQuery('On cooldown 2 sec');
  return;
}
const bword = ctx.callbackQuery.data.split('_')[1]
let battleData = {};
    try {
      battleData = loadBattleData(bword);
} catch (error) {
      battleData = {};
    }
if(ctx.from.id!=battleData.cid){
ctx.answerCbQuery('Not Your Turn')
return
}
const attacker = await getUserData(battleData.cid)
if(!hasBattleOmniRing(attacker)){
ctx.answerCbQuery('You need OmniRing')
return
}
if(ensureBattleDynamaxUsed(battleData)[String(battleData.cid)]){
ctx.answerCbQuery('Dynamax already used')
return
}
const pke = attacker.pokes.filter((pk)=>pk.pass == battleData.c)[0]
if(!pke || !pokestats[pke.name]){
ctx.answerCbQuery('Battle desynced')
return
}
if(getBattleDynamaxState(battleData, pke.pass)){
ctx.answerCbQuery('Already transformed')
return
}
const stats = await Stats(pokestats[pke.name],pke.ivs,pke.evs,c(pke.nature),plevel(pke.name,pke.exp))
const multiplier = getBattleDynamaxMultiplier(pke)
const boostedMaxHp = Math.max(1, Math.round(stats.hp * multiplier))
const boostedHp = normalizeDisplayedHp(scaleBattleCurrentHpUp(battleData.chp || 1, multiplier), boostedMaxHp)
ensureBattleDynamaxState(battleData)[String(pke.pass)] = {
  turnsLeft: 4,
  multiplier,
  isGmax: isBattleGigantamaxPokemon(pke)
}
ensureBattleDynamaxUsed(battleData)[String(battleData.cid)] = true
battleData.chp = boostedHp
if(!battleData.tem){
  battleData.tem = {}
}
battleData.tem[pke.pass] = boostedHp
await saveBattleData(bword, battleData);
const defender = await getUserData(battleData.oid)
const p1 = attacker.pokes.filter((poke)=>poke.pass==battleData.c)[0]
const p2 = defender.pokes.filter((poke)=>poke.pass==battleData.o)[0]
const base1 = getBattleBaseStats({ battleData, pass: p2.pass, pokemonName: p2.name, abilityName: p2.ability, pokestats })
const base2 = getBattleBaseStats({ battleData, pass: p1.pass, pokemonName: p1.name, abilityName: p1.ability, pokestats })
const level1 = plevel(p2.name,p2.exp)
const level2 = plevel(p1.name,p1.exp)
const stats1 = await Stats(base1,p2.ivs,p2.evs,c(p2.nature),level1)
const stats2 = await Stats(base2,p1.ivs,p1.evs,c(p1.nature),level2)
const isGroupDyn = ctx.chat.type !== 'private';
const formLabel = isBattleGigantamaxPokemon(p1) ? 'Gigantamax' : 'Dynamax'
const pvpDyn = buildPvpMsg('<b>'+c(p1.name)+'</b> transformed into <b>'+formLabel+'</b> form!', battleData, attacker, defender, p1, p2, stats1, stats2, bword, isGroupDyn);
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,pvpDyn.msg,{parse_mode:'HTML',reply_markup:pvpDyn.keyboard,...pvpDyn.ext})
})
bot.action(/megtst_/,async ctx => {
if (hitBattleCooldown(ctx)) {
  await ctx.answerCbQuery('On cooldown 2 sec');
  return;
}
const stone5 = ctx.callbackQuery.data.split('_')[1]
const bword = ctx.callbackQuery.data.split('_')[2]
let battleData = {};
    try {
      battleData = loadBattleData(bword);
} catch (error) {
      battleData = {};
    }
if(ctx.from.id!=battleData.cid){
ctx.answerCbQuery('Not Your Turn')
return
}
const stone = stones[stone5]
const d2b = await getUserData(battleData.cid)
const pke = d2b.pokes.filter((pk)=>pk.pass == battleData.c)[0]
if(!pke){
ctx.answerCbQuery('Battle desynced')
return
}
const previousFormName = pke.name
let megaFormName = ''
if (stone5 === 'rayquaza-dragon-ascent') {
  if (String(pke.name || '').toLowerCase() !== 'rayquaza' || !pokemonKnowsMoveByName(pke, 'dragon ascent')) {
    ctx.answerCbQuery('Rayquaza must know Dragon Ascent')
    return
  }
  megaFormName = 'rayquaza-mega'
} else {
  const stone = stones[stone5]
  if (!stone || stone5 === 'jade-orb') {
    ctx.answerCbQuery('That mega item cannot be used')
    return
  }
  if(stone.pokemon!=pke.name){
    return
  }
  megaFormName = stone.mega
}
if(!d2b.extra){
  d2b.extra = {}
}
if(!d2b.extra.megas){
d2b.extra.megas = {}
}
if(!battleData.megas){
battleData.megas = {}
}
battleData.megas[pke.pass] = pke.name
d2b.extra.megas[pke.pass] = pke.name
pke.name = stone.mega
await saveUserData2(ctx.from.id,d2b)
const pass = battleData.c
const atta = await getUserData(battleData.cid)
const deffa = await getUserData(battleData.oid)
const p12 = atta.pokes.filter((poke)=>poke.pass==pass)[0]
let msg = '<b>'+c(p12.name)+'</b> has transformed into <b>'+c(megaFormName)+'</b>'
const p22 = deffa.pokes.filter((poke)=>poke.pass==battleData.o)[0]
const base12 = pokestats[p22.name]
const base22 = pokestats[p12.name]
const level12 = plevel(p22.name,p22.exp)
const level22 = plevel(p12.name,p12.exp)
const stats12 = await Stats(base12,p22.ivs,p22.evs,c(p22.nature),level12) 
const stats22 = await Stats(base22,p12.ivs,p12.evs,c(p12.nature),level22)
msg += await applyEntryHazardsOnSwitch({
  battleData,
  sideId: battleData.cid,
  pass: pass,
  pokemonName: p12.name,
  abilityName: p12.ability,
  maxHp: stats22.hp
})
const speed12 = getEffectiveSpeed(stats12.speed, battleData, p22.pass, p22 && p22.ability)
const speed22 = getEffectiveSpeed(stats22.speed, battleData, p12.pass, p12 && p12.ability)
const result = speed12 > speed22 ? p22.pass : p12.pass
if(result in battleData.tem2){
const cc = battleData.c
const cc2 = battleData.chp
const cc3 = battleData.cid
const cc4 = battleData.tem
const cc5 = battleData.la
battleData.c = battleData.o
battleData.chp = battleData.ohp
battleData.cid = battleData.oid
battleData.tem = battleData.tem2
battleData.la = battleData.la2
battleData.o = cc
battleData.ohp = cc2
battleData.oid = cc3
battleData.tem2 = cc4
battleData.la2 = cc5
}
const dl = await getUserData(battleData.cid)
const p169 = dl.pokes.filter((poke)=>poke.pass==battleData.c)[0]
msg += '\n<b>'+c(p169.name)+'</b> <i>speed advantage allows to move first</i>'
await saveBattleData(bword, battleData);
const attacker = await getUserData(battleData.cid)
const defender = await getUserData(battleData.oid)
const p1 = attacker.pokes.filter((poke)=>poke.pass==battleData.c)[0]
const p2 = defender.pokes.filter((poke)=>poke.pass==battleData.o)[0]
const megaMsg = '<b>'+c(p1.name)+'</b> has transformed into <b>'+c(megaFormName)+'</b>\n<i>Mega Evolution does not consume your turn. Choose a move.</i>'
const base1 = getBattleBaseStats({ battleData, pass: p2.pass, pokemonName: p2.name, abilityName: p2.ability, pokestats })
const base2 = getBattleBaseStats({ battleData, pass: p1.pass, pokemonName: p1.name, abilityName: p1.ability, pokestats })
const level1 = plevel(p2.name,p2.exp)
const level2 = plevel(p1.name,p1.exp)
const stats1 = await Stats(base1,p2.ivs,p2.evs,c(p2.nature),level1)
const stats2 = await Stats(base2,p1.ivs,p1.evs,c(p1.nature),level2)
const isGroupMeg = ctx.chat.type !== 'private';
const pvpMeg = buildPvpMsg(megaMsg, battleData, attacker, defender, p1, p2, stats1, stats2, bword, isGroupMeg);
let img2 = pokes[p12.name].front_default_image
const im2 = shiny.filter((poke)=>poke.name==p12.name)[0]
if(im2 && p12.symbol=='✨'){
  img2=im2.shiny_url
}
await sendMessage(ctx,ctx.chat.id,img2,{caption:'*'+c(p12.name)+'* has transformed into *'+c(pke.name)+'*.',parse_mode:'markdown',reply_to_message_id:ctx.callbackQuery.message.message_id})
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,pvpMeg.msg,{parse_mode:'HTML',reply_markup:pvpMeg.keyboard,...pvpMeg.ext})
})

bot.action(/multidne_/,async ctx => {
if (hitBattleCooldown(ctx)) {
  await ctx.answerCbQuery('On cooldown 2 sec');
  return;
}
const pass = ctx.callbackQuery.data.split('_')[1]
const bword = ctx.callbackQuery.data.split('_')[2]
const id = ctx.callbackQuery.data.split('_')[3]
const prop = ctx.callbackQuery.data.split('_')[4]
if(ctx.from.id!=id){
ctx.answerCbQuery('Not Your Turn')
return
}
let battleData = {};
    try {
      battleData = loadBattleData(bword);
} catch (error) {
      battleData = {};
    }
dbg('multidne:click', { bword, from: ctx.from.id, turnId: id, pass, prop, cid: battleData.cid, oid: battleData.oid, c: battleData.c, o: battleData.o, qlen: battleData.queuedActions ? battleData.queuedActions.length : 0, switchPending: battleData.switchPending ? Object.keys(battleData.switchPending) : [] });
if(battleData.tem[pass] < 1){
ctx.answerCbQuery('This Poke Is Ded')
return
}
if(battleData.c==pass){
ctx.answerCbQuery('This Poke Is Already Batteling')
return
}

if(prop == 'change'){
  if (!battleData.queuedActions) battleData.queuedActions = [];
  if (!battleData.queuedActions.some(act => String(act.cid) === String(ctx.from.id))) {
    battleData.queuedActions.push({
      cid: ctx.from.id,
      c: battleData.c,
      type: 'switch',
      pass: pass
    });
    if (!battleData.switchPending) battleData.switchPending = {};
    battleData.switchPending[String(ctx.from.id)] = { pass, c: battleData.c };
    ctx.answerCbQuery('Action locked!');
  } else {
    ctx.answerCbQuery('You already selected your action!');
    return;
  }
  dbg('multidne:queued', { bword, q: battleData.queuedActions, switchPending: battleData.switchPending ? Object.keys(battleData.switchPending) : [] });

  if (battleData.queuedActions.length < 2) {
    fullSwap(battleData);
    await saveBattleData(bword, battleData);

    const attacker = await getUserData(battleData.cid);
    const defender = await getUserData(battleData.oid);
    const p1 = attacker.pokes.filter((poke) => poke.pass == battleData.c)[0]
    const p2 = defender.pokes.filter((poke) => poke.pass == battleData.o)[0]
    const base1 = pokestats[p2.name]
    const base2 = pokestats[p1.name]
    const level1 = plevel(p2.name, p2.exp)
    const level2 = plevel(p1.name, p1.exp)
    const stats1 = await Stats(base1, p2.ivs, p2.evs, c(p2.nature), level1)
    const stats2 = await Stats(base2, p1.ivs, p1.evs, c(p1.nature), level2)

    let msg = `<b>* ${displayName(defender, battleData.oid)} has locked in an action!</b>\n`
    msg += `<b>Waiting for ${displayName(attacker, battleData.cid)} to select...</b>`

    const isGroupMmo = ctx.chat.type !== 'private';
    const pvpMmo = buildPvpMsg(msg, battleData, attacker, defender, p1, p2, stats1, stats2, bword, isGroupMmo);
    await editMessage('text', ctx, ctx.chat.id, ctx.callbackQuery.message.message_id, pvpMmo.msg, { parse_mode: 'HTML', reply_markup: pvpMmo.keyboard, ...pvpMmo.ext })
    return
  }

  dbg('multidne:resolving', { bword });
  await resolveQueuedActions(ctx, battleData, bword);
  return
}

const previousBattlePass = battleData.c
battleData.c = pass
battleData.chp = battleData.tem[pass]
if (!battleData.choiceLockedMoves || typeof battleData.choiceLockedMoves !== 'object') {
  battleData.choiceLockedMoves = {};
}
delete battleData.choiceLockedMoves[String(previousBattlePass)];
delete battleData.choiceLockedMoves[String(pass)];
const atta = await getUserData(battleData.cid)
const deffa = await getUserData(battleData.oid)
const p12 = atta.pokes.filter((poke)=>poke.pass==pass)[0]
if (p12) {
syncBattleFormAndAbility({ battleData, pokemon: p12, pass: p12.pass })
}
let msg = '<b>'+c(p12.name)+'</b> came for battle'
if (prop == 'change') {
  msg = '<b>A Pokemon was switched in.</b>'
}
if (getAirBalloonInfo({ battleData, pass: p12.pass, heldItem: p12.held_item }).active) {
  msg += '\n<b>'+c(p12.name)+'</b>\'s <b>Air Balloon</b> is floating it above the ground!'
}
const p22 = deffa.pokes.filter((poke)=>poke.pass==battleData.o)[0]
const base12 = getBattleBaseStats(p22, battleData, p22.pass)
const base22 = getBattleBaseStats(p12, battleData, p12.pass)
const level12 = plevel(p22.name,p22.exp)
const level22 = plevel(p12.name,p12.exp)
const stats12 = await Stats(base12,p22.ivs,p22.evs,c(p22.nature),level12) 
const stats22 = await Stats(base22,p12.ivs,p12.evs,c(p12.nature),level22)
msg += applyAbilityEntry({
  battleData,
  pass: p12.pass,
  pokemonName: p12.name,
  abilityName: p12.ability,
  heldItem: p12.held_item,
  selfStats: stats22,
  opponentStats: stats12,
  opponentPass: battleData.o,
  opponentName: p22.name,
  opponentAbility: p22.ability,
  partyHpMap: battleData.tem,
  c
}).message
const speed12 = getEffectiveSpeed(stats12.speed, battleData, p22.pass, p22 && p22.ability)
const speed22 = getEffectiveSpeed(stats22.speed, battleData, p12.pass, p12 && p12.ability)
const result = speed12 > speed22 ? p22.pass : p12.pass
if(prop == 'fainted'){
if(result in battleData.tem2){
const cc = battleData.c
const cc2 = battleData.chp
const cc3 = battleData.cid
const cc4 = battleData.tem
const cc5 = battleData.la
battleData.c = battleData.o
battleData.chp = battleData.ohp
battleData.cid = battleData.oid
battleData.tem = battleData.tem2
battleData.la = battleData.la2
battleData.o = cc
battleData.ohp = cc2
battleData.oid = cc3
battleData.tem2 = cc4
battleData.la2 = cc5
}
const dl = await getUserData(battleData.cid)
const p169 = dl.pokes.filter((poke)=>poke.pass==battleData.c)[0]
msg += '\n<b>'+c(p169.name)+'</b> <i>speed advantage allows to move first</i>'
}
if(prop == 'change'){
battleData.switchLock = battleData.cid
battleData.queuedActions = [];
const cc = battleData.c
const cc2 = battleData.chp
const cc3 = battleData.cid
const cc4 = battleData.tem
const cc5 = battleData.la
battleData.c = battleData.o
battleData.chp = battleData.ohp
battleData.cid = battleData.oid
battleData.tem = battleData.tem2
battleData.la = battleData.la2
battleData.o = cc
battleData.ohp = cc2
battleData.oid = cc3
battleData.tem2 = cc4
battleData.la2 = cc5
}
await saveBattleData(bword, battleData);
const attacker = await getUserData(battleData.cid)
const defender = await getUserData(battleData.oid)
const p1 = attacker.pokes.filter((poke)=>poke.pass==battleData.c)[0]
const p2 = defender.pokes.filter((poke)=>poke.pass==battleData.o)[0]
const pp = pokes[p1.name]
const pp2 = pokes[p2.name]
const base1 = pokestats[p2.name]
const base2 = pokestats[p1.name]
const level1 = plevel(p2.name,p2.exp)
const level2 = plevel(p1.name,p1.exp)
const stats1 = await Stats(base1,p2.ivs,p2.evs,c(p2.nature),level1)
const stats2 = await Stats(base2,p1.ivs,p1.evs,c(p1.nature),level2)
const isGroupDne = ctx.chat.type !== 'private';
const pvpDne = buildPvpMsg(msg, battleData, attacker, defender, p1, p2, stats1, stats2, bword, isGroupDne);
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,pvpDne.msg,{parse_mode:'HTML',reply_markup:pvpDne.keyboard,...pvpDne.ext})
})

// Handler: "View Moves" shows ALL moves as a popup alert to the current player only (Showdown-style)
bot.action(/multivwmv_/,async ctx => {
const bword2 = ctx.callbackQuery.data.split('_')[1]
const turnId2 = ctx.callbackQuery.data.split('_')[2]
if (String(ctx.from.id) !== String(turnId2)) {
  ctx.answerCbQuery('❌ Not your turn!')
  return
}
let battleData2 = {};
try {
  battleData2 = loadBattleData(bword2);
} catch(e) { battleData2 = {}; }
const attacker2 = await getUserData(battleData2.cid)
const p1v = attacker2.pokes.filter((poke)=>poke.pass==battleData2.c)[0]
if (!p1v) { ctx.answerCbQuery('Battle error'); return; }
// Build move list text for the popup
let popupText = '🗡️ Your Moves:'
for (const mid of p1v.moves) {
  const mv = dmoves[mid]
  if (mv) {
    const displayMove = getDisplayedBattleMove({ battleData: battleData2, pokemon: p1v, move: mv, userData: attacker2, userId: battleData2.cid })
    const power = mv.power ?? '?'
    const acc = mv.accuracy ?? '?'
    const shownType = getEffectiveMoveType({
      battleData: battleData2,
      pokemonName: p1v.name,
      abilityName: p1v.ability,
      heldItem: getBattleHeldItemName({ battleData: battleData2, pass: p1v.pass, heldItem: p1v.held_item }),
      moveName: mv.name,
      moveType: mv.type
    }) || mv.type
    popupText += '\n• ' + c(mv.name) + ' [' + c(shownType) + '] P:' + power + ' A:' + acc
  }
}
if (popupText.length > 195) popupText = popupText.substring(0, 195) + '...';
await ctx.answerCbQuery(popupText, { show_alert: true })
})

/*
// Inline action menu: show moves + escape + pokemon
bot.action(/multiact_/, async ctx => {
if (battlec[ctx.chat.id] && Date.now() - battlec[ctx.chat.id] < 1600) {
  ctx.answerCbQuery('Try Again');
  return;
}
battlec[ctx.chat.id] = Date.now();
const bword2 = ctx.callbackQuery.data.split('_')[1]
const turnId2 = ctx.callbackQuery.data.split('_')[2]
if (String(ctx.from.id) !== String(turnId2)) {
  ctx.answerCbQuery('Not your turn!');
  return
}
let battleData2 = {};
try {
  battleData2 = loadBattleData(bword2);
} catch(e) { battleData2 = {}; }
const attacker2 = await getUserData(battleData2.cid)
const defender2 = await getUserData(battleData2.oid)
const p1v = attacker2.pokes.filter((poke)=>poke.pass==battleData2.c)[0]
const p2v = defender2.pokes.filter((poke)=>poke.pass==battleData2.o)[0]
if (!p1v || !p2v) { ctx.answerCbQuery('Battle error'); return; }
const base1v = getBattleBaseStats(p2v, battleData, p2v.pass)
const base2v = getBattleBaseStats(p1v, battleData, p1v.pass)
const level1v = plevel(p2v.name,p2v.exp)
const level2v = plevel(p1v.name,p1v.exp)
const stats1v = await Stats(base1v,p2v.ivs,p2v.evs,c(p2v.nature),level1v)
const stats2v = await Stats(base2v,p1v.ivs,p1v.evs,c(p1v.nature),level2v)
const isGroupAct = ctx.chat.type !== 'private';
const pvpAct = buildPvpMsg('', battleData2, attacker2, defender2, p1v, p2v, stats1v, stats2v, bword2, isGroupAct);

const usedMoves2 = battleData2.usedMoves || {};
const p1UsedMoves2 = usedMoves2[battleData2.c] || [];
const moveButtons = p1v.moves.map((word) => {
  const isRevealed = p1UsedMoves2.includes(String(word));
  const label = (isGroupAct && !isRevealed) ? '???' : c(dmoves[word].name);
  return { text: label, callback_data: 'multimo_'+word+'_'+bword2+'_'+battleData2.cid+'' };
});
while(moveButtons.length < 4) { moveButtons.push({text:'  ',callback_data:'empty'}); }
const rows = [];
for (let i = 0; i < moveButtons.length; i += 2) { rows.push(moveButtons.slice(i,i+2)); }
rows.push([{text:'Bag',callback_data:'multybg_'+bword2+''},{text:'Escape',callback_data:'multryn_'+bword2+'_multi'}]);
rows.push([{text:'Pokemon',callback_data:'multichanpok_'+bword2+'_'+battleData2.cid+''}]);
rows.push([{text:'⬅️ Back',callback_data:'multibttle_'+bword2+'_'+battleData2.cid+''}]);

await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,pvpAct.msg,{parse_mode:'HTML',reply_markup:{inline_keyboard:rows},...pvpAct.ext})
})
*/
}

module.exports = registerBattleCallbacks;










