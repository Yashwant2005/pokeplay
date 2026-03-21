const { getRandomAbilityForPokemon } = require('../../utils/pokemon_ability');
const {
  applyMultiscaleReduction,
  applyAbsorbMoveAbility,
  applyShadowShieldReduction,
  applyEndTurnAbility,
  applyStaminaOnHit,
  applySturdySurvival,
  applyFocusSashSurvival,
  applyWeakArmorOnHit,
  applyWhiteHerbIfNeeded,
  applyWeatherByMove,
  applyWeatherEndTurn,
  advanceBattleWeather,
  consumeBattleHeldItem,
  getAttackStatMultiplier,
  getBattleHeldItemName,
  getBattleMovePower,
  getEffectiveMoveName,
  getBattleWeatherName,
  getEffectiveWeatherName,
  getEffectivePokemonDisplayName,
  getEffectiveMoveType,
  getEffectivePokemonTypes,
  getPowerConstructFormChange,
  getAirBalloonInfo,
  getHeldItemStatMultipliers,
  getLevitateInfo,
  getPinchAbilityInfo,
  getPinchPowerMultiplier,
  getStabInfo,
  getSupremeOverlordInfo,
  getTechnicianPowerInfo,
  getUnawareBattleModifiers,
  getWeatherDefenseMultiplier,
  getWeatherMovePowerMultiplier,
  getWeatherSuppressedMoveMessage,
  setBattleWeatherNegationState,
  getStrongWindsEffectiveness,
  isDirectDamageMove,
  normalizeAbilityName,
  applyKoAbility,
  applyOnDamageTakenAbilities,
  applyStageToStat,
  ensurePokemonStatStages
} = require('../../utils/battle_abilities');
const {
  claimTrainerRankRewards,
  getTrainerLevel
} = require('../../utils/trainer_rank_rewards');
const {
  syncBattleFormAndAbility,
  revertTrackedFormsOnBattleEnd
} = require('../../utils/battle_forms');

function register_012_atk(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/atk_/,async ctx => {
const now = Date.now();
const chatKey = ctx.chat && ctx.chat.id;
const userId = ctx.from && ctx.from.id;
const userKey = 'u_' + String(userId);
const chatLimited = chatKey !== undefined && battlec[chatKey] && now - battlec[chatKey] < 2000;
const userLimited = userId !== undefined && battlec[userKey] && now - battlec[userKey] < 2000;
if (chatLimited || userLimited) {
  await ctx.answerCbQuery('On cooldown 2 sec');
  return;
}
if (chatKey !== undefined) battlec[chatKey] = now;
if (userId !== undefined) battlec[userKey] = now;
const move = ctx.callbackQuery.data.split('_')[1]
const bword = ctx.callbackQuery.data.split('_')[2]
const normalizeMoveName = (moveName) => String(moveName || '').toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
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
}
const PERFECT_CRIT_MOVES = new Set([
  'flower trick',
  'frost breath',
  'storm throw',
  'surging strikes',
  'wicked blow',
  'zippy zap'
])
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
])
const CRIT_DAMAGE_MULTIPLIER = 1.5
const HIGH_CRIT_RATIO_CHANCE = 0.125
const OHKO_MOVES = new Set([
  'fissure',
  'guillotine',
  'horn drill',
  'sheer cold'
])
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
])
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
}
const getMultiHitCount = (moveName) => {
  if (FIXED_MULTI_HIT_MOVES[moveName]) return FIXED_MULTI_HIT_MOVES[moveName]
  if (!VARIABLE_MULTI_HIT_MOVES.has(moveName)) return 1
  const roll = Math.random()
  if (roll < 0.375) return 2
  if (roll < 0.75) return 3
  if (roll < 0.875) return 4
  return 5
}
const SELF_FAINT_MOVES = new Set([
  'explosion',
  'final gambit',
  'healing wish',
  'lunar dance',
  'memento',
  'misty explosion',
  'self destruct'
])
const getRecoilDamage = (moveName, damageDealt, attackerMaxHp) => {
  const rule = RECOIL_MOVE_RULES[normalizeMoveName(moveName)]
  if (!rule) return 0
  if (rule.maxHpRatio) return Math.max(1, Math.floor(attackerMaxHp * rule.maxHpRatio))
  if (damageDealt > 0 && rule.ratio) return Math.max(1, Math.floor(damageDealt * rule.ratio))
  return 0
}
const getOhkoHitChance = (attackerLevel, defenderLevel) => {
  const chance = 30 + (Number(attackerLevel) - Number(defenderLevel))
  return Math.max(0, Math.min(100, chance))
}
const formatAbilityLabel = (abilityName) => String(abilityName || 'none')
  .split('-')
  .map((part) => part ? part.charAt(0).toUpperCase() + part.slice(1) : part)
  .join(' ')
const getDisplayedMoveType = (move, battleDataArg, pass, pokemonName, heldItem) => {
  const effectiveMoveName = getEffectiveMoveName({
    pokemonName,
    heldItem: getBattleHeldItemName({ battleData: battleDataArg, pass, heldItem }),
    moveName: move && move.name
  });
  return getEffectiveMoveType({
    battleData: battleDataArg,
    pokemonName,
    heldItem: getBattleHeldItemName({ battleData: battleDataArg, pass, heldItem }),
    moveName: effectiveMoveName || (move && move.name),
    moveType: move && move.type
  }) || String(move && move.type || '').toLowerCase()
}
const getDisplayedMovePower = (move, abilityName, currentHp, maxHp, battleDataArg, pass, pokemonName) => {
  const effectiveMoveName = getEffectiveMoveName({
    pokemonName,
    heldItem: getBattleHeldItemName({ battleData: battleDataArg, pass }),
    moveName: move && move.name
  });
  const effectiveMoveType = getDisplayedMoveType(move, battleDataArg, pass, pokemonName)
  const rawPower = getBattleMovePower({
    battleData: battleDataArg,
    pass,
    pokemonName,
    moveName: effectiveMoveName || (move && move.name),
    moveType: effectiveMoveType,
    movePower: move && move.power
  })
  const weatherAdjustedPower = Number.isFinite(rawPower) && rawPower > 0
    ? Math.max(1, Math.floor(rawPower * getWeatherMovePowerMultiplier({ battleData: battleDataArg, moveName: effectiveMoveName || (move && move.name), moveType: effectiveMoveType })))
    : rawPower
  if (!Number.isFinite(weatherAdjustedPower) || weatherAdjustedPower <= 0) return move && move.power
  const technicianInfo = getTechnicianPowerInfo({
    abilityName,
    movePower: weatherAdjustedPower
  })
  const pinchInfo = getPinchAbilityInfo({
    abilityName,
    moveType: effectiveMoveType,
    currentHp,
    maxHp
  })
  const totalMultiplier = technicianInfo.multiplier * pinchInfo.multiplier
  if (totalMultiplier === 1) return weatherAdjustedPower
  const labels = []
  if (technicianInfo.active) labels.push('x' + technicianInfo.multiplier + ' ' + technicianInfo.abilityLabel)
  if (pinchInfo.active) labels.push('x' + pinchInfo.multiplier + ' ' + pinchInfo.abilityLabel)
  return Math.max(1, Math.floor(weatherAdjustedPower * totalMultiplier)) + ' (' + labels.join(', ') + ')'
}
const revertPowerConstructFormsOnBattleEnd = (battleDataArg, userData) => {
  if (!battleDataArg || !battleDataArg.powerConstructOriginal || !userData || !Array.isArray(userData.pokes)) return
  for (const pass of Object.keys(battleDataArg.powerConstructOriginal)) {
    const poke = userData.pokes.find((entry) => String(entry.pass) === String(pass))
    if (poke) {
      poke.name = battleDataArg.powerConstructOriginal[pass]
    }
  }
}
const applyPowerConstructEndTurn = async ({ battleDataArg, pass, pokemon, maxHp, currentHpKey, maxHpKey, teamKey, teamEntryKey, userData }) => {
  const change = getPowerConstructFormChange({
    pokemonName: pokemon && pokemon.name,
    abilityName: pokemon && pokemon.ability,
    currentHp: battleDataArg && battleDataArg[currentHpKey],
    maxHp
  })
  if (!change.triggered || !pokemon || !pokestats[change.newPokemonName]) return ''
  const currentHp = Math.max(0, Number(battleDataArg[currentHpKey]) || 0)
  const lostHp = Math.max(0, Number(maxHp || 0) - currentHp)
  if (!battleDataArg.powerConstructOriginal || typeof battleDataArg.powerConstructOriginal !== 'object') {
    battleDataArg.powerConstructOriginal = {}
  }
  if (!battleDataArg.powerConstructOriginal[String(pass)]) {
    battleDataArg.powerConstructOriginal[String(pass)] = pokemon.name
  }
  const oldName = pokemon.name
  pokemon.name = change.newPokemonName
  const level = plevel(pokemon.name, pokemon.exp)
  const newStats = await Stats(pokestats[pokemon.name], pokemon.ivs, pokemon.evs, c(pokemon.nature), level)
  const newMaxHp = Math.max(1, Number(newStats.hp) || 1)
  const newCurrentHp = Math.max(1, Math.min(newMaxHp, newMaxHp - lostHp))
  battleDataArg[currentHpKey] = newCurrentHp
  if (maxHpKey) {
    battleDataArg[maxHpKey] = newMaxHp
  }
  if (!battleDataArg[teamKey] || typeof battleDataArg[teamKey] !== 'object') battleDataArg[teamKey] = {}
  if (!userData && currentHpKey === 'ochp' && oldName && Object.prototype.hasOwnProperty.call(battleDataArg[teamKey], oldName)) {
    delete battleDataArg[teamKey][oldName]
  }
  const resolvedTeamEntryKey = !userData && currentHpKey === 'ochp' ? pokemon.name : (teamEntryKey || pass)
  battleDataArg[teamKey][resolvedTeamEntryKey] = newCurrentHp
  if (userData && Array.isArray(userData.pokes)) {
    const found = userData.pokes.find((entry) => String(entry.pass) === String(pass))
    if (found) found.name = pokemon.name
  } else if (currentHpKey === 'ochp') {
    battleDataArg.name = pokemon.name
  }
  return '\n<b>✶ '+c(change.newPokemonName)+'</b>\'s <b>Power Construct</b> activated!\n<b>✶ It transformed into Zygarde Complete!</b>'
}
let battleData = {};
    try {
      battleData = loadBattleData(bword);
    } catch (error) {
      battleData = {};
    }
const data = await getUserData(ctx.from.id)
if(!battleData || !battleData.c || !battleData.name || !battleData.omoves || battleData.omoves.length < 1){
  ctx.answerCbQuery('Battle expired. Start again.')
  return
}
const move1 = dmoves[move]
const p = data.pokes.filter((poke)=>poke.pass==battleData.c)[0]
if(!move1 || !p){
  ctx.answerCbQuery('Battle desynced. Use /reset_battle.')
  return
}
const base = pokestats[battleData.name]
const base2 = pokestats[p.name]
const uname = he.encode(ctx.from.first_name)
const opponentPass = battleData.opass || 'wild-opponent'
battleData.opass = opponentPass
if(!battleData.oability){
  battleData.oability = getRandomAbilityForPokemon(battleData.name, pokes)
}
const playerAbility = p.ability || 'none'
const wildAbility = battleData.oability || 'none'
setBattleWeatherNegationState({
  battleData,
  activeAbilities: [playerAbility, wildAbility]
})
const wildHeldItemInfo = getHeldItemStatMultipliers({
  pokemonName: battleData.name,
  heldItem: getBattleHeldItemName({ battleData, pass: opponentPass, heldItem: battleData.oheld_item }),
  evolutionChains: chains
})
const playerHeldItemName = getBattleHeldItemName({ battleData, pass: p.pass, heldItem: p.held_item })
const wildHeldItemName = getBattleHeldItemName({ battleData, pass: opponentPass, heldItem: battleData.oheld_item })
const playerStatsName = getEffectivePokemonDisplayName({ pokemonName: p.name, abilityName: playerAbility, heldItem: playerHeldItemName })
const wildStatsName = getEffectivePokemonDisplayName({ pokemonName: battleData.name, abilityName: wildAbility, heldItem: wildHeldItemName })
const base = pokestats[wildStatsName] || pokestats[battleData.name]
const base2 = pokestats[playerStatsName] || pokestats[p.name]
const stats2 = await Stats(base,battleData.ivs,battleData.evs,c(battleData.nat),battleData.level)
const clevel = plevel(p.name,p.exp)
const stats = await Stats(base2,p.ivs,p.evs,c(p.nature),clevel)
const wildMovePool = wildHeldItemInfo.assaultVestActive
  ? battleData.omoves.filter((row) => {
      const mv = dmoves[row.id]
      const normalizedName = normalizeMoveName(mv && mv.name)
      return mv && (mv.category !== 'status' || normalizedName === 'me first')
    })
  : battleData.omoves
const move2 = dmoves[(wildMovePool[Math.floor(Math.random() * wildMovePool.length)] || battleData.omoves[Math.floor(Math.random() * battleData.omoves.length)]).id]
const playerMoveLabel = getEffectiveMoveName({ pokemonName: p.name, heldItem: playerHeldItemName, moveName: move1.name }) || move1.name
const wildMoveLabel = getEffectiveMoveName({ pokemonName: battleData.name, heldItem: wildHeldItemName, moveName: move2.name }) || move2.name
const playerMoveName = normalizeMoveName(playerMoveLabel)
const wildMoveName = normalizeMoveName(wildMoveLabel)
const playerStages = ensurePokemonStatStages(battleData, p.pass)
const wildStages = ensurePokemonStatStages(battleData, opponentPass)
const playerUnawareModifiers = getUnawareBattleModifiers({
  attackerAbility: playerAbility,
  defenderAbility: wildAbility,
  moveCategory: move1.category,
  attackerStages: playerStages,
  defenderStages: wildStages
})
const playerSupremeOverlordInfo = getSupremeOverlordInfo({
  abilityName: playerAbility,
  partyHpMap: battleData.team,
  activePass: p.pass
})
const playerHeldItemInfo = getHeldItemStatMultipliers({
  pokemonName: p.name,
  heldItem: getBattleHeldItemName({ battleData, pass: p.pass, heldItem: p.held_item }),
  evolutionChains: chains
})
const wildUnawareModifiers = getUnawareBattleModifiers({
  attackerAbility: wildAbility,
  defenderAbility: playerAbility,
  moveCategory: move2.category,
  attackerStages: wildStages,
  defenderStages: playerStages
})
let playerUnawareMessage = ''
if (playerUnawareModifiers.attackerActivated) {
  playerUnawareMessage += '\n<b>✶ '+c(p.name)+'</b>\'s <b>Unaware</b> activated!'
}
if (playerUnawareModifiers.defenderActivated) {
  playerUnawareMessage += '\n<b>✶ '+c(battleData.name)+'</b>\'s <b>Unaware</b> activated!'
}
let wildUnawareMessage = ''
if (wildUnawareModifiers.attackerActivated) {
  wildUnawareMessage += '\n<b>✶ '+c(battleData.name)+'</b>\'s <b>Unaware</b> activated!'
}
if (wildUnawareModifiers.defenderActivated) {
  wildUnawareMessage += '\n<b>✶ '+c(p.name)+'</b>\'s <b>Unaware</b> activated!'
}
const playerMoveType = getEffectiveMoveType({ battleData, pokemonName: p.name, heldItem: playerHeldItemName, moveName: move1.name, moveType: move1.type })
const wildMoveType = getEffectiveMoveType({ battleData, pokemonName: battleData.name, heldItem: wildHeldItemName, moveName: move2.name, moveType: move2.type })
const wildTypes = getEffectivePokemonTypes({ pokemonName: battleData.name, pokemonTypes: pokes[battleData.name]?.types || [], heldItem: wildHeldItemName, abilityName: wildAbility })
const playerTypes = getEffectivePokemonTypes({ pokemonName: p.name, pokemonTypes: pokes[p.name]?.types || [], heldItem: playerHeldItemName, abilityName: playerAbility })
const wildDisplayName = getEffectivePokemonDisplayName({ pokemonName: battleData.name, abilityName: wildAbility, heldItem: wildHeldItemName })
const playerDisplayName = getEffectivePokemonDisplayName({ pokemonName: p.name, abilityName: playerAbility, heldItem: playerHeldItemName })
const t1 = wildTypes[0]
const t2 = wildTypes[1] ? c(wildTypes[1]) : null
const eff1 = await eff(c(playerMoveType),c(t1),t2)
const t3 = playerTypes[0]
const t4 = playerTypes[1] ? c(playerTypes[1]) : null
const eff2 = await eff(c(wildMoveType),c(t3),t4)
const wildLevitateInfo = getLevitateInfo({ abilityName: wildAbility })
const playerLevitateInfo = getLevitateInfo({ abilityName: playerAbility })
const wildAirBalloonInfo = getAirBalloonInfo({ battleData, pass: opponentPass, heldItem: battleData.oheld_item })
const playerAirBalloonInfo = getAirBalloonInfo({ battleData, pass: p.pass, heldItem: p.held_item })
const playerGroundBlocked = (wildLevitateInfo.active || wildAirBalloonInfo.active) && String(playerMoveType || '').toLowerCase() == 'ground'
const wildGroundBlocked = (playerLevitateInfo.active || playerAirBalloonInfo.active) && String(wildMoveType || '').toLowerCase() == 'ground'
const adjustedEff1 = getStrongWindsEffectiveness({ battleData, moveType: playerMoveType, pokemonTypes: wildTypes, effectiveness: eff1 })
const adjustedEff2 = getStrongWindsEffectiveness({ battleData, moveType: wildMoveType, pokemonTypes: playerTypes, effectiveness: eff2 })
const finalEff1 = playerGroundBlocked ? 0 : adjustedEff1
const finalEff2 = wildGroundBlocked ? 0 : adjustedEff2
let a = move1.category == 'special'
  ? applyStageToStat(stats.special_attack, playerUnawareModifiers.attackStage)
  : applyStageToStat(stats.attack, playerUnawareModifiers.attackStage)
let d = move1.category == 'special'
  ? applyStageToStat(stats2.special_defense, playerUnawareModifiers.defenseStage)
  : applyStageToStat(stats2.defense, playerUnawareModifiers.defenseStage)
let a2 = move2.category == 'special'
  ? applyStageToStat(stats2.special_attack, wildUnawareModifiers.attackStage)
  : applyStageToStat(stats2.attack, wildUnawareModifiers.attackStage)
if (move1.category == 'physical') {
  a = Math.max(1, Math.floor(a * getAttackStatMultiplier(playerAbility, move1.category)))
}
if (move1.category == 'special') {
  a = Math.max(1, Math.floor(a * playerHeldItemInfo.special_attack))
  d = Math.max(1, Math.floor(d * wildHeldItemInfo.special_defense))
} else {
  a = Math.max(1, Math.floor(a * playerHeldItemInfo.attack))
  d = Math.max(1, Math.floor(d * wildHeldItemInfo.defense))
}
d = Math.max(1, Math.floor(d * getWeatherDefenseMultiplier({
  battleData,
  moveCategory: move1.category,
  pokemonTypes: wildTypes
})))
a = Math.max(1, Math.floor(a * playerSupremeOverlordInfo.multiplier))
if (move2.category == 'physical') {
  a2 = Math.max(1, Math.floor(a2 * getAttackStatMultiplier(wildAbility, move2.category)))
}
let d2 = move2.category == 'special'
  ? applyStageToStat(stats.special_defense, wildUnawareModifiers.defenseStage)
  : applyStageToStat(stats.defense, wildUnawareModifiers.defenseStage)
if (move2.category == 'special') {
  a2 = Math.max(1, Math.floor(a2 * wildHeldItemInfo.special_attack))
  d2 = Math.max(1, Math.floor(d2 * playerHeldItemInfo.special_defense))
} else {
  a2 = Math.max(1, Math.floor(a2 * wildHeldItemInfo.attack))
  d2 = Math.max(1, Math.floor(d2 * playerHeldItemInfo.defense))
}
const isPerfectCrit1 = PERFECT_CRIT_MOVES.has(playerMoveName)
const isPerfectCrit2 = PERFECT_CRIT_MOVES.has(wildMoveName)
const isHighCritMove1 = HIGH_CRIT_RATIO_MOVES.has(playerMoveName)
const isHighCritMove2 = HIGH_CRIT_RATIO_MOVES.has(wildMoveName)
const isOhko1 = OHKO_MOVES.has(playerMoveName)
const isOhko2 = OHKO_MOVES.has(wildMoveName)
const playerPinchMult = getPinchPowerMultiplier({
  abilityName: playerAbility,
  moveType: playerMoveType,
  currentHp: battleData.chp,
  maxHp: stats.hp
})
const playerTechnicianInfo = getTechnicianPowerInfo({
  abilityName: playerAbility,
  movePower: move1.power
})
const wildPinchMult = getPinchPowerMultiplier({
  abilityName: wildAbility,
  moveType: wildMoveType,
  currentHp: battleData.ochp,
  maxHp: battleData.ohp
})
const wildTechnicianInfo = getTechnicianPowerInfo({
  abilityName: wildAbility,
  movePower: move2.power
})
const playerBasePower = getBattleMovePower({ battleData, pass: p.pass, pokemonName: p.name, heldItem: playerHeldItemName, moveName: playerMoveLabel, moveType: playerMoveType, movePower: move1.power })
const wildBasePower = getBattleMovePower({ battleData, pass: opponentPass, pokemonName: battleData.name, heldItem: wildHeldItemName, moveName: wildMoveLabel, moveType: wildMoveType, movePower: move2.power })
const playerPower = move1.category === 'status' || !move1.power
  ? 0
  : Math.max(1, Math.floor(Number(playerBasePower || 0) * getWeatherMovePowerMultiplier({ battleData, moveName: playerMoveLabel, moveType: playerMoveType }) * playerPinchMult * playerTechnicianInfo.multiplier))
const wildPower = move2.category === 'status' || !move2.power
  ? 0
  : Math.max(1, Math.floor(Number(wildBasePower || 0) * getWeatherMovePowerMultiplier({ battleData, moveName: wildMoveLabel, moveType: wildMoveType }) * wildPinchMult * wildTechnicianInfo.multiplier))
const playerStabInfo = getStabInfo({
  abilityName: playerAbility,
  moveType: playerMoveType,
  pokemonTypes: playerTypes
})
const wildStabInfo = getStabInfo({
  abilityName: wildAbility,
  moveType: wildMoveType,
  pokemonTypes: wildTypes
})
let damage = move1.category === 'status' || !move1.power
  ? 0
  : Math.max(0, Math.floor(calc(a,d,clevel,playerPower,finalEff1) * playerStabInfo.multiplier))
let damage2 = move2.category === 'status' || !move2.power
  ? 0
  : Math.max(0, Math.floor(calc(a2,d2,battleData.level,wildPower,finalEff2) * wildStabInfo.multiplier))
const playerLifeOrbBoostActive = playerHeldItemInfo.lifeOrbActive && !isDirectDamageMove(playerMoveName)
const wildLifeOrbBoostActive = wildHeldItemInfo.lifeOrbActive && !isDirectDamageMove(wildMoveName)
if(playerLifeOrbBoostActive && damage > 0){
  damage = Math.max(1, Math.floor(damage * playerHeldItemInfo.damageMultiplier))
}
if(wildLifeOrbBoostActive && damage2 > 0){
  damage2 = Math.max(1, Math.floor(damage2 * wildHeldItemInfo.damageMultiplier))
}
let ohkoFailed1 = false
let ohkoFailed2 = false
if (isOhko1) {
  const targetTypes = wildTypes.map((t) => String(t).toLowerCase())
  const userTypes = playerTypes.map((t) => String(t).toLowerCase())
  const sheerColdBlocked = playerMoveName == 'sheer cold' && targetTypes.includes('ice') && !userTypes.includes('ice')
  const chance = getOhkoHitChance(clevel, battleData.level)
  if (clevel < battleData.level || sheerColdBlocked || Math.random() * 100 >= chance) {
    damage = 0
    ohkoFailed1 = true
  } else {
    damage = battleData.ochp
  }
}
if (isOhko2) {
  const targetTypes = playerTypes.map((t) => String(t).toLowerCase())
  const userTypes = wildTypes.map((t) => String(t).toLowerCase())
  const sheerColdBlocked = wildMoveName == 'sheer cold' && targetTypes.includes('ice') && !userTypes.includes('ice')
  const chance = getOhkoHitChance(battleData.level, clevel)
  if (battleData.level < clevel || sheerColdBlocked || Math.random() * 100 >= chance) {
    damage2 = 0
    ohkoFailed2 = true
  } else {
    damage2 = battleData.chp
  }
}
let hitCount1 = (!ohkoFailed1 && damage > 0) ? getMultiHitCount(playerMoveName) : 1
let hitCount2 = (!ohkoFailed2 && damage2 > 0) ? getMultiHitCount(wildMoveName) : 1
let critHits1 = 0
let critHits2 = 0
let wildShieldMessage = ''
let playerShieldMessage = ''
let wildMultiscaleMessage = ''
let playerMultiscaleMessage = ''
let wildSturdyMessage = ''
let playerSturdyMessage = ''
let wildLevitateMessage = playerGroundBlocked ? '\n<b>✶ '+c(battleData.name)+'</b>\'s <b>Levitate</b> activated!' : ''
let playerLevitateMessage = wildGroundBlocked ? '\n<b>✶ '+c(p.name)+'</b>\'s <b>Levitate</b> activated!' : ''
if(playerGroundBlocked && wildAirBalloonInfo.active){
  wildLevitateMessage += '\n<b>✶ '+c(battleData.name)+'</b>\'s <b>Air Balloon</b> activated!'
}
if(wildGroundBlocked && playerAirBalloonInfo.active){
  playerLevitateMessage += '\n<b>✶ '+c(p.name)+'</b>\'s <b>Air Balloon</b> activated!'
}
let wildStaminaMessage = ''
let playerStaminaMessage = ''
let wildWeakArmorMessage = ''
let playerWeakArmorMessage = ''
const playerWeatherSuppressedMessage = getWeatherSuppressedMoveMessage({ battleData, moveType: playerMoveType, moveCategory: move1.category, pokemonName: p.name, moveName: playerMoveLabel, c })
const wildWeatherSuppressedMessage = getWeatherSuppressedMoveMessage({ battleData, moveType: wildMoveType, moveCategory: move2.category, pokemonName: battleData.name, moveName: wildMoveLabel, c })
if(playerWeatherSuppressedMessage){
  damage = 0
}
if(wildWeatherSuppressedMessage){
  damage2 = 0
}
if(!ohkoFailed1 && damage > 0 && !isOhko1){
  let totalDamage1 = 0
  let landedHits1 = 0
  for(let h=0; h<hitCount1; h+=1){
    const remainingHp1 = battleData.ochp - totalDamage1
    if(remainingHp1 <= 0) break
    let hitDamage1 = damage
    const didHitCrit1 = isPerfectCrit1 || (isHighCritMove1 && Math.random() < HIGH_CRIT_RATIO_CHANCE)
    if(didHitCrit1){
      critHits1 += 1
      hitDamage1 = Math.max(1, Math.floor(hitDamage1 * CRIT_DAMAGE_MULTIPLIER))
    }
    const shieldResult1 = applyShadowShieldReduction({
      abilityName: wildAbility,
      currentHp: remainingHp1,
      maxHp: battleData.ohp,
      incomingDamage: hitDamage1,
      moveName: playerMoveLabel,
      pokemonName: battleData.name,
      c
    })
    hitDamage1 = shieldResult1.damage
    if(shieldResult1.activated && !wildShieldMessage){
      wildShieldMessage = shieldResult1.message
    }
    const multiscaleResult1 = applyMultiscaleReduction({
      abilityName: wildAbility,
      currentHp: remainingHp1,
      maxHp: battleData.ohp,
      incomingDamage: hitDamage1,
      pokemonName: battleData.name,
      c
    })
    hitDamage1 = multiscaleResult1.damage
    if(multiscaleResult1.activated && !wildMultiscaleMessage){
      wildMultiscaleMessage = multiscaleResult1.message
    }
    const sturdyResult1 = applySturdySurvival({
      abilityName: wildAbility,
      currentHp: remainingHp1,
      maxHp: battleData.ohp,
      incomingDamage: hitDamage1,
      pokemonName: battleData.name,
      c
    })
    hitDamage1 = sturdyResult1.damage
    if(sturdyResult1.activated && !wildSturdyMessage){
      wildSturdyMessage = sturdyResult1.message
    }
    const focusSashResult1 = applyFocusSashSurvival({
      battleData,
      pass: opponentPass,
      heldItem: battleData.oheld_item,
      currentHp: remainingHp1,
      maxHp: battleData.ohp,
      incomingDamage: hitDamage1,
      pokemonName: battleData.name,
      moveName: playerMoveLabel,
      c
    })
    hitDamage1 = focusSashResult1.damage
    if(focusSashResult1.activated && !wildSturdyMessage){
      wildSturdyMessage = focusSashResult1.message
    }
    hitDamage1 = Math.min(hitDamage1, remainingHp1)
    totalDamage1 += hitDamage1
    landedHits1 += 1
    const stamina1 = applyStaminaOnHit({
      battleData,
      pass: opponentPass,
      pokemonName: battleData.name,
      abilityName: wildAbility,
      damageDealt: hitDamage1,
      c
    })
    wildStaminaMessage += stamina1.message
    const weakArmor1 = applyWeakArmorOnHit({
      battleData,
      pass: opponentPass,
      pokemonName: battleData.name,
      abilityName: wildAbility,
      moveCategory: move1.category,
      damageDealt: hitDamage1,
      c,
      deferWhiteHerb: hitCount1 > 1
    })
    wildWeakArmorMessage += weakArmor1.message
  }
  if(hitCount1 > 1){
    wildWeakArmorMessage += applyWhiteHerbIfNeeded({
      battleData,
      pass: opponentPass,
      pokemonName: battleData.name,
      c
    }).message
  }
  damage = totalDamage1
  hitCount1 = landedHits1
}
if(!ohkoFailed2 && damage2 > 0 && !isOhko2){
  let totalDamage2 = 0
  let landedHits2 = 0
  for(let h=0; h<hitCount2; h+=1){
    const remainingHp2 = battleData.chp - totalDamage2
    if(remainingHp2 <= 0) break
    let hitDamage2 = damage2
    const didHitCrit2 = isPerfectCrit2 || (isHighCritMove2 && Math.random() < HIGH_CRIT_RATIO_CHANCE)
    if(didHitCrit2){
      critHits2 += 1
      hitDamage2 = Math.max(1, Math.floor(hitDamage2 * CRIT_DAMAGE_MULTIPLIER))
    }
    const shieldResult2 = applyShadowShieldReduction({
      abilityName: playerAbility,
      currentHp: remainingHp2,
      maxHp: stats.hp,
      incomingDamage: hitDamage2,
      moveName: wildMoveLabel,
      pokemonName: p.name,
      c
    })
    hitDamage2 = shieldResult2.damage
    if(shieldResult2.activated && !playerShieldMessage){
      playerShieldMessage = shieldResult2.message
    }
    const multiscaleResult2 = applyMultiscaleReduction({
      abilityName: playerAbility,
      currentHp: remainingHp2,
      maxHp: stats.hp,
      incomingDamage: hitDamage2,
      pokemonName: p.name,
      c
    })
    hitDamage2 = multiscaleResult2.damage
    if(multiscaleResult2.activated && !playerMultiscaleMessage){
      playerMultiscaleMessage = multiscaleResult2.message
    }
    const sturdyResult2 = applySturdySurvival({
      abilityName: playerAbility,
      currentHp: remainingHp2,
      maxHp: stats.hp,
      incomingDamage: hitDamage2,
      pokemonName: p.name,
      c
    })
    hitDamage2 = sturdyResult2.damage
    if(sturdyResult2.activated && !playerSturdyMessage){
      playerSturdyMessage = sturdyResult2.message
    }
    const focusSashResult2 = applyFocusSashSurvival({
      battleData,
      pass: p.pass,
      heldItem: p.held_item,
      currentHp: remainingHp2,
      maxHp: stats.hp,
      incomingDamage: hitDamage2,
      pokemonName: p.name,
      moveName: wildMoveLabel,
      c
    })
    hitDamage2 = focusSashResult2.damage
    if(focusSashResult2.activated && !playerSturdyMessage){
      playerSturdyMessage = focusSashResult2.message
    }
    hitDamage2 = Math.min(hitDamage2, remainingHp2)
    totalDamage2 += hitDamage2
    landedHits2 += 1
    const stamina2 = applyStaminaOnHit({
      battleData,
      pass: p.pass,
      pokemonName: p.name,
      abilityName: playerAbility,
      damageDealt: hitDamage2,
      c
    })
    playerStaminaMessage += stamina2.message
    const weakArmor2 = applyWeakArmorOnHit({
      battleData,
      pass: p.pass,
      pokemonName: p.name,
      abilityName: playerAbility,
      moveCategory: move2.category,
      damageDealt: hitDamage2,
      c,
      deferWhiteHerb: hitCount2 > 1
    })
    playerWeakArmorMessage += weakArmor2.message
  }
  if(hitCount2 > 1){
    playerWeakArmorMessage += applyWhiteHerbIfNeeded({
      battleData,
      pass: p.pass,
      pokemonName: p.name,
      c
    }).message
  }
  damage2 = totalDamage2
  hitCount2 = landedHits2
}
const wildAbsorb = applyAbsorbMoveAbility({
  battleData,
  pass: opponentPass,
  pokemonName: battleData.name,
  abilityName: wildAbility,
  moveType: playerMoveType,
  moveName: playerMoveLabel,
  c
})
if(wildAbsorb.blocked){
  damage = 0
}
const playerAbsorb = applyAbsorbMoveAbility({
  battleData,
  pass: p.pass,
  pokemonName: p.name,
  abilityName: playerAbility,
  moveType: wildMoveType,
  moveName: wildMoveLabel,
  c
})
if(playerAbsorb.blocked){
  damage2 = 0
}
const playerHpBeforeHit = battleData.chp
const wildHpBeforeHit = battleData.ochp
if(!wildAbsorb.blocked && isOhko1 && damage > 0){
  const shieldResult1 = applyShadowShieldReduction({
    abilityName: wildAbility,
    currentHp: battleData.ochp,
    maxHp: battleData.ohp,
    incomingDamage: damage,
    moveName: playerMoveLabel,
    pokemonName: battleData.name,
    c
  })
  damage = shieldResult1.damage
  if(shieldResult1.activated) wildShieldMessage = shieldResult1.message
  const multiscaleResult1 = applyMultiscaleReduction({
    abilityName: wildAbility,
    currentHp: battleData.ochp,
    maxHp: battleData.ohp,
    incomingDamage: damage,
    pokemonName: battleData.name,
    c
  })
  damage = multiscaleResult1.damage
  if(multiscaleResult1.activated) wildMultiscaleMessage = multiscaleResult1.message
  const sturdyResult1 = applySturdySurvival({
    abilityName: wildAbility,
    currentHp: battleData.ochp,
    maxHp: battleData.ohp,
    incomingDamage: damage,
    pokemonName: battleData.name,
    c
  })
  damage = sturdyResult1.damage
  if(sturdyResult1.activated) wildSturdyMessage = sturdyResult1.message
  const focusSashResult1 = applyFocusSashSurvival({
    battleData,
    pass: opponentPass,
    heldItem: battleData.oheld_item,
    currentHp: battleData.ochp,
    maxHp: battleData.ohp,
    incomingDamage: damage,
    pokemonName: battleData.name,
    moveName: playerMoveLabel,
    c
  })
  damage = focusSashResult1.damage
  if(focusSashResult1.activated) wildSturdyMessage = focusSashResult1.message
  wildStaminaMessage += applyStaminaOnHit({
    battleData,
    pass: opponentPass,
    pokemonName: battleData.name,
    abilityName: wildAbility,
    damageDealt: damage,
    c
  }).message
}
if(!playerAbsorb.blocked && isOhko2 && damage2 > 0){
  const shieldResult2 = applyShadowShieldReduction({
    abilityName: playerAbility,
    currentHp: battleData.chp,
    maxHp: stats.hp,
    incomingDamage: damage2,
    moveName: wildMoveLabel,
    pokemonName: p.name,
    c
  })
  damage2 = shieldResult2.damage
  if(shieldResult2.activated) playerShieldMessage = shieldResult2.message
  const multiscaleResult2 = applyMultiscaleReduction({
    abilityName: playerAbility,
    currentHp: battleData.chp,
    maxHp: stats.hp,
    incomingDamage: damage2,
    pokemonName: p.name,
    c
  })
  damage2 = multiscaleResult2.damage
  if(multiscaleResult2.activated) playerMultiscaleMessage = multiscaleResult2.message
  const sturdyResult2 = applySturdySurvival({
    abilityName: playerAbility,
    currentHp: battleData.chp,
    maxHp: stats.hp,
    incomingDamage: damage2,
    pokemonName: p.name,
    c
  })
  damage2 = sturdyResult2.damage
  if(sturdyResult2.activated) playerSturdyMessage = sturdyResult2.message
  const focusSashResult2 = applyFocusSashSurvival({
    battleData,
    pass: p.pass,
    heldItem: p.held_item,
    currentHp: battleData.chp,
    maxHp: stats.hp,
    incomingDamage: damage2,
    pokemonName: p.name,
    moveName: wildMoveLabel,
    c
  })
  damage2 = focusSashResult2.damage
  if(focusSashResult2.activated) playerSturdyMessage = focusSashResult2.message
  playerStaminaMessage += applyStaminaOnHit({
    battleData,
    pass: p.pass,
    pokemonName: p.name,
    abilityName: playerAbility,
    damageDealt: damage2,
    c
  }).message
}
battleData.chp = Math.max((battleData.chp-damage2),0)
battleData.team[battleData.c] = Math.max((battleData.team[battleData.c]-damage2),0)
battleData.ochp = Math.max((battleData.ochp-damage),0)
battleData.ot[battleData.name] = Math.max((battleData.ot[battleData.name]-damage),0)
let ms2 = '➩ <b>'+c(p.name)+'</b> Used <b>'+c(playerMoveLabel)+'</b> And Dealt <b>'+c(battleData.name)+'</b> <code>'+damage+'</code> HP.'
if(ohkoFailed1){
  ms2 = '➩ <b>'+c(p.name)+'</b> Used <b>'+c(playerMoveLabel)+'</b> but it failed.'
}
if(!ohkoFailed1 && (move1.category === 'status' || !move1.power)){
  ms2 = 'âž© <b>'+c(p.name)+'</b> Used <b>'+c(playerMoveLabel)+'</b>.'
}
ms2 += playerUnawareMessage
ms2 += playerWeatherSuppressedMessage
if(!ohkoFailed1 && playerPinchMult > 1){
  ms2 += '\n<b>✶ '+c(p.name)+'</b>\'s <b>'+c(formatAbilityLabel(playerAbility))+'</b> boosted its '+c(playerMoveType)+'-type move!'
}
if(!ohkoFailed1 && playerTechnicianInfo.active){
  ms2 += '\n<b>✶ '+c(p.name)+'</b>\'s <b>Technician</b> activated!'
}
if(!ohkoFailed1 && playerStabInfo.adaptabilityActive && damage > 0){
  ms2 += '\n<b>âœ¶ '+c(p.name)+'</b>\'s <b>Adaptability</b> activated!'
}
if(!ohkoFailed1 && playerSupremeOverlordInfo.active && damage > 0){
  ms2 += '\n<b>âœ¶ '+c(p.name)+'</b>\'s <b>Supreme Overlord</b> activated!'
}
if(critHits1 > 0 && damage > 0){
  ms2 += '\n<b>✶ A critical hit!</b>'
}
if(!ohkoFailed1 && hitCount1 > 1 && damage > 0){
  ms2 += '\n<b>✶ It hit '+hitCount1+' times!</b>'
}
ms2 += wildAbsorb.message
ms2 += wildStaminaMessage
ms2 += wildWeakArmorMessage
ms2 += wildShieldMessage
ms2 += wildMultiscaleMessage
ms2 += wildSturdyMessage
ms2 += wildLevitateMessage
if(damage > 0 && (move1.category == 'physical' || move1.category == 'special') && wildAirBalloonInfo.active){
consumeBattleHeldItem({ battleData, pass: opponentPass, heldItem: battleData.oheld_item })
ms2 += '\n<b>✶ '+c(battleData.name)+'</b>\'s <b>Air Balloon</b> popped!'
}
const recoil = getRecoilDamage(playerMoveLabel, damage, stats.hp)
if(recoil > 0){
const selfBefore = battleData.chp
const recoilTaken = Math.min(recoil, selfBefore)
battleData.chp = Math.max(0, selfBefore - recoilTaken)
battleData.team[battleData.c] = Math.max(0, (battleData.team[battleData.c] || selfBefore) - recoilTaken)
ms2 += '\n<b>✶ '+c(p.name)+'</b> Was Hurt By Recoil And Lost <code>'+recoilTaken+'</code> HP.'
}
if(SELF_FAINT_MOVES.has(playerMoveName) && battleData.chp > 0){
battleData.chp = 0
battleData.team[battleData.c] = 0
ms2 += '\n<b>✶ '+c(p.name)+'</b> Fainted After Using <b>'+c(playerMoveLabel)+'</b>.'
}
if(playerHeldItemInfo.lifeOrbActive && move1.category !== 'status' && !ohkoFailed1 && playerMoveName !== 'fling' && battleData.chp > 0){
const selfBefore = battleData.chp
const lifeOrbDamage = Math.max(1, Math.floor(stats.hp / 10))
const taken = Math.min(lifeOrbDamage, selfBefore)
battleData.chp = Math.max(0, selfBefore - taken)
battleData.team[battleData.c] = Math.max(0, (battleData.team[battleData.c] || selfBefore) - taken)
ms2 += '\n<b>✶ '+c(p.name)+'</b>\'s <b>Life Orb</b> activated!'
ms2 += '\n<b>✶ '+c(p.name)+'</b> lost <code>'+taken+'</code> HP from its <b>Life Orb</b>.'
}
const wildReactive = applyOnDamageTakenAbilities({
  battleData,
  pass: opponentPass,
  pokemonName: battleData.name,
  attackerPass: p.pass,
  attackerName: p.name,
  abilityName: wildAbility,
  heldItem: battleData.oheld_item,
  attackerAbility: playerAbility,
  moveName: playerMoveLabel,
  typeEffectiveness: finalEff1,
  moveType: playerMoveType,
  moveCategory: move1.category,
  attackerMaxHp: stats.hp,
  hpBefore: wildHpBeforeHit,
  hpAfter: battleData.ochp,
  maxHp: battleData.ohp,
  damageDealt: damage,
  c
})
ms2 += wildReactive.message
ms2 += applyWeatherByMove({
  battleData,
  moveName: playerMoveLabel,
  pass: p.pass,
  pokemonName: p.name,
  heldItem: p.held_item,
  c,
  didHit: damage > 0
}).message
if(battleData.ochp < 1){
  if (playerMoveName == 'fell stinger') {
    ms2 += applyStageChanges({
      battleData,
      pass: p.pass,
      pokemonName: p.name,
      abilityName: playerAbility,
      changes: [{ stat: 'attack', delta: 3 }],
      c,
      fromOpponent: false
    }).message
  }
  const remainingOpponents = Object.keys(battleData.ot || {}).filter((pk) => battleData.ot[pk] > 0)
  if (remainingOpponents.length > 0 || normalizeAbilityName(playerAbility) !== 'beast-boost') {
    const playerKoBoost = applyKoAbility({
      battleData,
      pass: p.pass,
      pokemonName: p.name,
      abilityName: playerAbility,
      stats,
      c
    })
    ms2 += playerKoBoost.message
  }
}
let enemyAttackAbilityMsg = playerAbsorb.message
if(ohkoFailed2){
  enemyAttackAbilityMsg += '\n<b>✶ '+c(battleData.name)+'</b> used <b>'+c(wildMoveLabel)+'</b> but it failed.'
}
if(!ohkoFailed2 && (move2.category === 'status' || !move2.power)){
  enemyAttackAbilityMsg += '\n<b>âœ¶ '+c(battleData.name)+'</b> used <b>'+c(wildMoveLabel)+'</b>.'
}
enemyAttackAbilityMsg += wildUnawareMessage
enemyAttackAbilityMsg += wildWeatherSuppressedMessage
if(!ohkoFailed2 && wildPinchMult > 1){
  enemyAttackAbilityMsg += '\n<b>✶ '+c(battleData.name)+'</b>\'s <b>'+c(formatAbilityLabel(wildAbility))+'</b> boosted its '+c(wildMoveType)+'-type move!'
}
if(!ohkoFailed2 && wildTechnicianInfo.active){
  enemyAttackAbilityMsg += '\n<b>✶ '+c(battleData.name)+'</b>\'s <b>Technician</b> activated!'
}
if(!ohkoFailed2 && wildStabInfo.adaptabilityActive && damage2 > 0){
  enemyAttackAbilityMsg += '\n<b>âœ¶ '+c(battleData.name)+'</b>\'s <b>Adaptability</b> activated!'
}
if(critHits2 > 0 && damage2 > 0){
  enemyAttackAbilityMsg += '\n<b>✶ A critical hit!</b>'
}
if(!ohkoFailed2 && hitCount2 > 1 && damage2 > 0){
  enemyAttackAbilityMsg += '\n<b>✶ It hit '+hitCount2+' times!</b>'
}
const playerReactive = applyOnDamageTakenAbilities({
  battleData,
  pass: p.pass,
  pokemonName: p.name,
  attackerPass: opponentPass,
  attackerName: battleData.name,
  abilityName: playerAbility,
  heldItem: p.held_item,
  attackerAbility: wildAbility,
  moveName: wildMoveLabel,
  typeEffectiveness: finalEff2,
  moveType: wildMoveType,
  moveCategory: move2.category,
  attackerMaxHp: battleData.ohp,
  hpBefore: playerHpBeforeHit,
  hpAfter: battleData.chp,
  maxHp: stats.hp,
  damageDealt: damage2,
  c
})
enemyAttackAbilityMsg += playerReactive.message
enemyAttackAbilityMsg += playerStaminaMessage
enemyAttackAbilityMsg += playerWeakArmorMessage
enemyAttackAbilityMsg += playerShieldMessage
enemyAttackAbilityMsg += playerMultiscaleMessage
enemyAttackAbilityMsg += playerSturdyMessage
enemyAttackAbilityMsg += playerLevitateMessage
if(damage2 > 0 && (move2.category == 'physical' || move2.category == 'special') && playerAirBalloonInfo.active){
consumeBattleHeldItem({ battleData, pass: p.pass, heldItem: p.held_item })
enemyAttackAbilityMsg += '\n<b>✶ '+c(p.name)+'</b>\'s <b>Air Balloon</b> popped!'
}
if(battleData.chp < 1){
  if (wildMoveName == 'fell stinger') {
    enemyAttackAbilityMsg += applyStageChanges({
      battleData,
      pass: opponentPass,
      pokemonName: battleData.name,
      abilityName: wildAbility,
      changes: [{ stat: 'attack', delta: 3 }],
      c,
      fromOpponent: false
    }).message
  }
  const remainingPlayerMons = Object.keys(battleData.team || {}).filter((pass) => battleData.team[pass] > 0)
  if (remainingPlayerMons.length > 0 || normalizeAbilityName(wildAbility) !== 'beast-boost') {
    const wildKoBoost = applyKoAbility({
      battleData,
      pass: opponentPass,
      pokemonName: battleData.name,
      abilityName: wildAbility,
      stats: stats2,
      c
    })
    enemyAttackAbilityMsg += wildKoBoost.message
  }
}
if(wildHeldItemInfo.lifeOrbActive && move2.category !== 'status' && !ohkoFailed2 && wildMoveName !== 'fling' && battleData.ochp > 0){
const selfBefore = battleData.ochp
const lifeOrbDamage = Math.max(1, Math.floor(battleData.ohp / 10))
const taken = Math.min(lifeOrbDamage, selfBefore)
battleData.ochp = Math.max(0, selfBefore - taken)
battleData.ot[battleData.name] = Math.max(0, (battleData.ot[battleData.name] || selfBefore) - taken)
enemyAttackAbilityMsg += '\n<b>✶ '+c(battleData.name)+'</b>\'s <b>Life Orb</b> activated!'
enemyAttackAbilityMsg += '\n<b>✶ '+c(battleData.name)+'</b> lost <code>'+taken+'</code> HP from its <b>Life Orb</b>.'
}
enemyAttackAbilityMsg += applyWeatherByMove({
  battleData,
  moveName: wildMoveLabel,
  pass: opponentPass,
  pokemonName: battleData.name,
  heldItem: battleData.oheld_item,
  c,
  didHit: damage2 > 0
}).message
await saveBattleData(bword, battleData);
if(!ohkoFailed1 && finalEff1 == 0){
ms2 += '\n<b>✶ It\'s 0x effective!</b>'
}else if(!ohkoFailed1 && finalEff1 == 0.5){
ms2 += '\n<b>✶ It\'s not very effective...</b>'
}else if(!ohkoFailed1 && finalEff1 == 2){
ms2 += '\n<b>✶ It\'s super effective!</b>'
}else if(!ohkoFailed1 && finalEff1 == 4){
ms2 += '\n<b>✶ It\'s incredibly super effective!</b>'
}
if(battleData.ochp < 1){
const baseexp = expdata.filter((poke)=> poke.name == battleData.name)[0]
const g = growth_rates[p.name]
const exp69 = chart[g.growth_rate]["100"]
const clevel = battleData.la[p.pass]
if(baseexp && clevel!=100){
const ee = await calcexp(baseexp.baseExp,battleData.level,clevel)
p.exp = Math.min((p.exp+ee),exp69)
var l2 = await plevel(p.name,p.exp)
const evo = chains.evolution_chains.filter((chain)=>chain.current_pokemon==p.name)[0]
if(evo && evo.evolution_level && evo.evolution_method == 'level-up' && evo.evolution_level <= l2 &&  evo.evolution_level > clevel){
if(ctx.chat.type!='private'){
await sendMessage(ctx,ctx.chat.id,{parse_mode:'HTML'},'<a href="tg://user?id='+ctx.from.id+'"><b>'+uname+'</b></a> Your Pokemon <b>'+c(p.name)+'</b> Is Ready To Evolve',{reply_markup:{inline_keyboard:[[{text:'Evolve',url:'t.me/'+bot.botInfo.username+''}]]}})
}
await sendMessage(ctx,ctx.from.id,'*'+c(p.name)+'* Is Ready To Evolve',{parse_mode:'markdown',reply_markup:{inline_keyboard:[[{text:'Evolve',callback_data:'evy_'+p.name+'_'+p.pass+''}]]}})
}
if((l2-clevel)!= 0){
const moves = pokemoves[p.name]
const moves2 = moves.moves_info.filter((move)=> move.learn_method == 'level-up' && move.level_learned_at > clevel && move.level_learned_at <= l2 && dmoves[move.id].power && dmoves[move.id].accuracy && dmoves[move.id].category != 'status')
if(moves2.length > 0){
for(const m of moves2){
if(!p.moves.includes(m.id)){
if(p.moves.length < 4){
p.moves.push(m.id)
await saveUserData2(ctx.from.id,data)
await sendMessage(ctx,ctx.from.id,'<b>'+c(p.name)+'</b> (<b>Lv.</b> '+l2+') Has Learnt A New Move <b>'+c(dmoves[m.id].name)+'</b> ['+c(dmoves[m.id].type)+' '+emojis[dmoves[m.id].type]+'].',{parse_mode:'HTML'})
}else{
const options = {
  timeZone: 'Asia/Kolkata',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hour12: true,
};
if(ctx.chat.type!='private'){
await sendMessage(ctx,ctx.chat.id,{parse_mode:'HTML'},'<a href="tg://user?id='+ctx.from.id+'"><b>'+data.inv.name+'</b></a>, <b>'+c(p2.name)+'</b> (<b>Lv.</b> '+(currentLevel+1)+') Wants To Learn A New Move',{reply_markup:{inline_keyboard:[[{text:'Go',url:'t.me/'+bot.botInfo.username+''}]]}})
}
const d = new Date().toLocaleString('en-US', options)
const mdata = await loadMessageData();
const m77 = await sendMessage(ctx,ctx.from.id,'<b>'+c(p.name)+'</b> (<b>Lv.</b> '+l2+') Wants To Learn A New Move <b>'+c(dmoves[m.id].name)+'</b> ['+c(dmoves[m.id].type)+' '+emojis[dmoves[m.id].type]+'].\n\nBut <b>'+c(p.name)+'</b> Already Knows 4 Moves He Have To Forget One Move To Learn <b>'+c(dmoves[m.id].name)+'</b>\n<i>You Have 15 Min To Choose.</i>',{reply_markup:{inline_keyboard:[[{text:'Go Next',callback_data:'lrn_'+p.pass+'_'+m.id+'_'+d+''}]]},parse_mode:'HTML'})
if(!mdata.moves){
mdata.moves = {}
}
mdata.moves[m77.message_id] = {chat:ctx.from.id,td:d,poke:p.name,move:dmoves[m.id].name}
await saveMessageData(mdata)
}
}
}
}
}
await saveUserData2(ctx.from.id,data)
}
const data99 = pokes[battleData.name]
let highestEv = { stat: "", value: 0 };

    const evYield = data99.ev_yield;
    evYield.forEach(([stat, value]) => {
      if (value > highestEv.value) {
        highestEv = { stat, value };
      }
    });
if(highestEv.stat=='special-attack'){
highestEv.stat = 'special_attack'
}
if(highestEv.stat=='special-defense'){
highestEv.stat = 'special_defense'
}
const t2 = calculateTotal(p.evs)
if((p.evs[highestEv.stat]+highestEv.value) < 252 && (t2+highestEv.value) < 510 && clevel*1!=100){
p.evs[highestEv.stat] = Math.min((highestEv.value+p.evs[highestEv.stat]),252)
await saveUserData2(ctx.from.id,data)
}
const al = Object.keys(battleData.ot).filter((pk) => battleData.ot[pk] > 0) 
if(al.length < 1){
const ai = 200
if(!data.inv.pc){
data.inv.pc = 0
}
data.inv.pc += ai
if(!data.inv.exp){
data.inv.exp = 0
}
const oldTrainerLevel = getTrainerLevel(data, trainerlevel, 100)
const ei = Math.floor(Math.random()*700)+200
data.inv.exp += ei
const newTrainerLevel = getTrainerLevel(data, trainerlevel, 100)
let rankSummary = null
if(newTrainerLevel > oldTrainerLevel){
  rankSummary = claimTrainerRankRewards(data, { trainerlevel, tms, stones })
}
data.extra.hunting = false
revertPowerConstructFormsOnBattleEnd(battleData, data)
revertTrackedFormsOnBattleEnd(battleData, data)
await saveUserData2(ctx.from.id,data)
const messageData = await loadMessageData();
if(messageData[ctx.from.id]) {
delete messageData[ctx.from.id];
}
messageData.battle = messageData.battle.filter((chats) => chats !== ctx.from.id)
await saveMessageData(messageData)
let finalMsg = '*'+c(battleData.name)+'* Has Been Fainted\n+'+ai+' 💷\n+'+ei+' Trainer EXP'
if(rankSummary && rankSummary.levelsToClaim > 0){
  finalMsg += '\n\n*Trainer Rank Levelup!* '
  finalMsg += '\nLevel '+oldTrainerLevel+' -> '+newTrainerLevel
  finalMsg += '\n\n*Rewards:*'
  if(rankSummary.rewards.pc > 0) finalMsg += '\n- '+rankSummary.rewards.pc+' PokeCoins 💷'
  if(rankSummary.rewards.lp > 0) finalMsg += '\n- '+rankSummary.rewards.lp+' League Points ⭐'
  if(rankSummary.rewards.ht > 0) finalMsg += '\n- '+rankSummary.rewards.ht+' Holowear Tickets 🎟️'
  if(rankSummary.rewards.battleBoxes > 0) finalMsg += '\n- '+rankSummary.rewards.battleBoxes+' Battle Box 🎁'
}
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,finalMsg,{parse_mode:'markdown'})
return
}else{
	const nu = battleData.name
battleData.name = al[Math.floor(Math.random() *al.length) ]
battleData.ohp = battleData.ot[battleData.c]
ms2 += '\n\n<b>'+c(nu)+'</b> has fainted. <b>'+c(battleData.name) +'</b> came for battle. '
return
}
return
}
ms2 += '\n\n<b><i>'+c(battleData.name) +' is attacking....</i></b> '
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,ms2,{parse_mode:'html'})
await sleep(3000)
if(battleData.chp < 1){
const baseexp = expdata.filter((poke)=> poke.name == battleData.name)[0]
const g = growth_rates[p.name]
const exp69 = chart[g.growth_rate]["100"]
const clevel = battleData.la[p.pass]
if(baseexp && clevel!=100){
const ee = Math.floor(await calcexp(baseexp.baseExp,battleData.level,clevel)/5.5) 
p.exp = Math.min((p.exp+ee),exp69)
var l2 = await plevel(p.name,p.exp)
const evo = chains.evolution_chains.filter((chain)=>chain.current_pokemon==p.name)[0]
if(evo && evo.evolution_level && evo.evolution_method == 'level-up' && evo.evolution_level <= l2 &&  evo.evolution_level > clevel){
if(ctx.chat.type!='private'){
await sendMessage(ctx,ctx.chat.id,{parse_mode:'HTML'},'<a href="tg://user?id='+ctx.from.id+'"><b>'+uname+'</b></a> Your Pokemon <b>'+c(p.name)+'</b> Is Ready To Evolve',{reply_markup:{inline_keyboard:[[{text:'Evolve',url:'t.me/'+bot.botInfo.username+''}]]}})
}
await sendMessage(ctx,ctx.from.id,'*'+c(p.name)+'* Is Ready To Evolve',{parse_mode:'markdown',reply_markup:{inline_keyboard:[[{text:'Evolve',callback_data:'evy_'+p.name+'_'+p.pass+''}]]}})
}
if((l2-clevel)!= 0){
const moves = pokemoves[p.name]
const moves2 = moves.moves_info.filter((move)=> move.learn_method == 'level-up' && move.level_learned_at > clevel && move.level_learned_at <= l2 && dmoves[move.id].power && dmoves[move.id].accuracy && dmoves[move.id].category != 'status')
if(moves2.length > 0){
for(const m of moves2){
if(!p.moves.includes(m.id)){
if(p.moves.length < 4){
p.moves.push(m.id)
await saveUserData2(ctx.from.id,data)
await sendMessage(ctx,ctx.from.id,'<b>'+c(p.name)+'</b> (<b>Lv.</b> '+l2+') Has Learnt A New Move <b>'+c(dmoves[m.id].name)+'</b> ['+c(dmoves[m.id].type)+' '+emojis[dmoves[m.id].type]+'].',{parse_mode:'HTML'})
}else{
const options = {
  timeZone: 'Asia/Kolkata',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hour12: true,
};
if(ctx.chat.type!='private'){
await sendMessage(ctx,ctx.chat.id,{parse_mode:'HTML'},'<a href="tg://user?id='+ctx.from.id+'"><b>'+data.inv.name+'</b></a>, <b>'+c(p2.name)+'</b> (<b>Lv.</b> '+(currentLevel+1)+') Wants To Learn A New Move',{reply_markup:{inline_keyboard:[[{text:'Go',url:'t.me/'+bot.botInfo.username+''}]]}})
}
const d = new Date().toLocaleString('en-US', options)
const mdata = await loadMessageData();
const m77 = await sendMessage(ctx,ctx.from.id,'<b>'+c(p.name)+'</b> (<b>Lv.</b> '+l2+') Wants To Learn A New Move <b>'+c(dmoves[m.id].name)+'</b> ['+c(dmoves[m.id].type)+' '+emojis[dmoves[m.id].type]+'].\n\nBut <b>'+c(p.name)+'</b> Already Knows 4 Moves He Have To Forget One Move To Learn <b>'+c(dmoves[m.id].name)+'</b>\n<i>You Have 15 Min To Choose.</i>',{reply_markup:{inline_keyboard:[[{text:'Go Next',callback_data:'lrn_'+p.pass+'_'+m.id+'_'+d+''}]]},parse_mode:'HTML'})
if(!mdata.moves){
mdata.moves = {}
}
mdata.moves[m77.message_id] = {chat:ctx.from.id,td:d,poke:p.name,move:dmoves[m.id].name}
await saveMessageData(mdata)
}
}
}
}
}
await saveUserData2(ctx.from.id,data)
}
let av2 = []
for(const p in battleData.team){
if(battleData.team[p] > 0){
av2.push(p)
}
}
if(av2.length > 0){
const av = [];
for (const p in battleData.team) {
  const al = data.pokes.filter((poke) => poke.pass == p)[0];
  if (al) {
    av.push({ name: p, displayText: '' + c(al.name) + ' (' + battleData.team[p] + ' HP)' });
  }
}

const buttons = av.map((poke) => ({ text: poke.displayText, callback_data: 'snd_' + poke.name + '_' + bword + '' }));
while (buttons.length < 6) {
  buttons.push({ text: 'empty', callback_data: 'empty' });
}

const rows = [];
for (let i = 0; i < buttons.length; i += 2) {
  rows.push(buttons.slice(i, i + 2));
}
const base2 = pokestats[playerStatsName] || pokestats[p.name]
const stats = await Stats(base2,p.ivs,p.evs,c(p.nature),clevel)
const key = []
rows.push(key)
const op = pokes[battleData.name]
const uname = he.encode(ctx.from.first_name)
let msg = '\n\n<b>wild</b> '+c(wildDisplayName)+' ['+c(wildTypes.join(' / '))+']'
msg += '\n<b>Level :</b> '+battleData.level+' | <b>HP :</b> '+battleData.ochp+'/'+battleData.ohp+''
msg += '\n<code>'+Bar(battleData.ohp,battleData.ochp)+'</code>'
msg += '\n\n<b>Turn :</b> <code>'+uname+'</code>'
const p2 = pokes[p.name]
msg += '\n<b>'+c(playerDisplayName)+'</b> ['+c(playerTypes.join(' / '))+']'
msg += '\n<b>Level :</b> '+clevel+' | <b>HP :</b> '+battleData.chp+'/'+stats.hp+''
msg += '\n<code>'+Bar(stats.hp,battleData.chp)+'</code>'
msg += '\n\n<b>Moves :</b>'
const moves = []
 for(const move2 of p.moves){
 const move = dmoves[move2]
 const displayMoveName = getEffectiveMoveName({
   pokemonName: p.name,
   heldItem: getBattleHeldItemName({ battleData, pass: p.pass }),
   moveName: move && move.name
 }) || (move && move.name);
 const shownPower = getDisplayedMovePower(move, playerAbility, battleData.chp, stats.hp, battleData, p.pass, p.name)
 const shownType = getDisplayedMoveType(move, battleData, p.pass, p.name)
 msg += '\n<b>'+c(displayMoveName)+'</b>['+c(shownType)+' '+(emojis[shownType] || '')+']\n<b>Power:</b> '+shownPower+'<b>, Accuracy:</b> '+move.accuracy+' ('+c(move.category.charAt(0))+')'
 moves.push(''+move2+'')
 }
msg += '\n\n<i>Choose Which Poke Send For Battle:</i>'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'HTML',reply_markup:{inline_keyboard:rows}})
return
}else{
const messageData = await loadMessageData();
if(messageData[ctx.from.id]) {
messageData.battle = messageData.battle.filter((chats)=> chats!== ctx.from.id)
delete messageData[ctx.from.id];
await saveMessageData(messageData)
}
data.extra.hunting = false
revertPowerConstructFormsOnBattleEnd(battleData, data)
revertTrackedFormsOnBattleEnd(battleData, data)
await saveUserData2(ctx.from.id,data)
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'<b>'+c(wildDisplayName)+'</b> Used <b>'+c(wildMoveLabel)+'</b> And Dealt <b>'+c(playerDisplayName)+'</b> <code>'+damage2+'</code> HP.'+enemyAttackAbilityMsg+'\n\n- <b>'+c(playerDisplayName)+'</b> has fainted And You Got <b>Defeated</b>.',{parse_mode:'html'})
return
}
}

const playerEndTurn = applyEndTurnAbility({
  battleData,
  pass: p.pass,
  pokemonName: p.name,
  abilityName: playerAbility,
  heldItem: p.held_item,
  maxHp: stats.hp,
  c
})
const wildEndTurn = applyEndTurnAbility({
  battleData,
  pass: opponentPass,
  pokemonName: battleData.name,
  abilityName: wildAbility,
  heldItem: battleData.oheld_item,
  maxHp: battleData.ohp,
  c
})
enemyAttackAbilityMsg += playerEndTurn.message + wildEndTurn.message
enemyAttackAbilityMsg += await applyPowerConstructEndTurn({
  battleDataArg: battleData,
  pass: p.pass,
  pokemon: p,
  maxHp: stats.hp,
  currentHpKey: 'chp',
  teamKey: 'team',
  teamEntryKey: p.pass,
  userData: data
})
enemyAttackAbilityMsg += applyWeatherEndTurn({
  battleData,
  pass: p.pass,
  pokemonName: p.name,
  pokemonTypes: playerTypes,
  abilityName: playerAbility,
  heldItem: p.held_item,
  maxHp: stats.hp,
  c
}).message
enemyAttackAbilityMsg += await applyPowerConstructEndTurn({
  battleDataArg: battleData,
  pass: opponentPass,
  pokemon: { name: battleData.name, ability: wildAbility, exp: 0, ivs: battleData.ivs, evs: battleData.evs, nature: battleData.nat },
  maxHp: battleData.ohp,
  currentHpKey: 'ochp',
  maxHpKey: 'ohp',
  teamKey: 'ot'
})
enemyAttackAbilityMsg += applyWeatherEndTurn({
  battleData,
  pass: opponentPass,
  pokemonName: battleData.name,
  pokemonTypes: pokes[battleData.name]?.types || wildTypes,
  abilityName: wildAbility,
  heldItem: battleData.oheld_item,
  maxHp: battleData.ohp,
  c
}).message
enemyAttackAbilityMsg += advanceBattleWeather(battleData, c).message
await saveUserData2(ctx.from.id, data)
await saveBattleData(bword, battleData)
const postPlayerStats = await Stats(pokestats[playerStatsName] || pokestats[p.name], p.ivs, p.evs, c(p.nature), plevel(p.name, p.exp))
const wildDisplayNameAfter = getEffectivePokemonDisplayName({
  pokemonName: battleData.name,
  abilityName: wildAbility,
  heldItem: wildHeldItemName
})
const wildTypesAfter = getEffectivePokemonTypes({
  pokemonName: battleData.name,
  abilityName: wildAbility,
  heldItem: wildHeldItemName
})
const playerDisplayNameAfter = getEffectivePokemonDisplayName({
  pokemonName: p.name,
  abilityName: playerAbility,
  heldItem: playerHeldItemName
})
const playerTypesAfter = getEffectivePokemonTypes({
  pokemonName: p.name,
  abilityName: playerAbility,
  heldItem: playerHeldItemName
})

const op = pokes[battleData.name]
let msg = '➩ <b>'+c(battleData.name)+'</b> Used <b>'+c(wildMoveLabel)+'</b> And Dealt <b>'+c(p.name)+'</b> <code>'+damage2+'</code> HP.'
msg += enemyAttackAbilityMsg
if(!ohkoFailed2 && finalEff2 == 0){
msg += '\n<b>✶ It\'s 0x effective!</b>'
}else if(!ohkoFailed2 && finalEff2 == 0.5){
msg += '\n<b>✶ It\'s not very effective...</b>'
}else if(!ohkoFailed2 && finalEff2 == 2){
msg += '\n<b>✶ It\'s super effective!</b>'
}else if(!ohkoFailed2 && finalEff2 == 4){
msg += '\n<b>✶ It\'s incredibly super effective!</b>'
}
msg += '\n\n<b>wild</b> '+c(wildDisplayNameAfter)+' ['+c(wildTypesAfter.join(' / '))+']'
msg += '\n<b>Level :</b> '+battleData.level+' | <b>HP :</b> '+battleData.ochp+'/'+battleData.ohp+''
msg += '\n<code>'+Bar(battleData.ohp,battleData.ochp)+'</code>'
msg += '\n\n<b>Turn :</b> <code>'+uname+'</code>'
msg += '\n<b>'+c(playerDisplayNameAfter)+'</b> ['+c(playerTypesAfter.join(' / '))+']'
msg += '\n<b>Level :</b> '+clevel+' | <b>HP :</b> '+battleData.chp+'/'+postPlayerStats.hp+''
msg += '\n<code>'+Bar(postPlayerStats.hp,battleData.chp)+'</code>'
msg += '\n\n<b>Moves :</b>'
const moves = []
for(const move2 of p.moves){
let move = dmoves[move2]
const shownPower = getDisplayedMovePower(move, playerAbility, battleData.chp, stats.hp, battleData, p.pass, p.name)
msg += '\n• <b>'+c(move.name)+'</b> ['+c(move.type)+' '+emojis[move.type]+']\n<b>Power:</b> '+shownPower+'<b>, Accuracy:</b> '+move.accuracy+' ('+c(move.category.charAt(0))+')'
moves.push(''+move2+'')
}
msg += '\n\n<i>Choose Your Next Move:</i>'
  const buttons = moves.map((word) => {
    const moveInfo = dmoves[word];
    if(!moveInfo || !moveInfo.name){
      return null;
    }
    const displayMoveName = getEffectiveMoveName({
      pokemonName: p.name,
      heldItem: getBattleHeldItemName({ battleData, pass: p.pass }),
      moveName: moveInfo.name
    }) || moveInfo.name;
    return { text: c(displayMoveName), callback_data: 'atk_'+word+'_'+bword+'' };
  }).filter(Boolean);
while(buttons.length < 4){
buttons.push({text:'  ',callback_data:'empty'})
}
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }
const key2 = [{text:'Bag',callback_data:'bag_'+bword+''},{text:'Escape',callback_data:'run_'+bword+''},{text:'Pokemon',callback_data:'pokemon_'+bword+''}]
const isstone = [...new Set(data.inv.stones)].filter(stone => stones[stone]?.pokemon === p.name)
rows.push(key2)
  const keyboard = {
    inline_keyboard: rows,key2
  };
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'HTML',reply_markup:keyboard})
const messageData = await loadMessageData();
    messageData[ctx.chat.id] = { mid: ctx.callbackQuery.message.message_id, timestamp: Date.now(),id:ctx.from.id };
    await saveMessageData(messageData);
})
}

module.exports = register_012_atk;

