const { getRandomAbilityForPokemon } = require('../../utils/pokemon_ability');
const {
  applyAbsorbMoveAbility,
  applyEndTurnAbility,
  applyKoAbility,
  applyOnDamageTakenAbilities,
  applyStageToStat,
  ensurePokemonStatStages
} = require('../../utils/battle_abilities');
const {
  claimTrainerRankRewards,
  getTrainerLevel
} = require('../../utils/trainer_rank_rewards');

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
const move2 = dmoves[battleData.omoves[Math.floor(Math.random()*battleData.omoves.length)].id]
const p = data.pokes.filter((poke)=>poke.pass==battleData.c)[0]
if(!move1 || !move2 || !p){
  ctx.answerCbQuery('Battle desynced. Use /reset_battle.')
  return
}
const base = pokestats[battleData.name]
const base2 = pokestats[p.name]
const uname = he.encode(ctx.from.first_name)
const stats2 = await Stats(base,battleData.ivs,battleData.evs,c(battleData.nat),battleData.level)
const clevel = plevel(p.name,p.exp)
const stats = await Stats(base2,p.ivs,p.evs,c(p.nature),clevel)
const opponentPass = battleData.opass || 'wild-opponent'
battleData.opass = opponentPass
if(!battleData.oability){
  battleData.oability = getRandomAbilityForPokemon(battleData.name, pokes)
}
const playerAbility = p.ability || 'none'
const wildAbility = battleData.oability || 'none'
const playerStages = ensurePokemonStatStages(battleData, p.pass)
const wildStages = ensurePokemonStatStages(battleData, opponentPass)
const t1 = pokes[battleData.name].types[0]
const t2 = pokes[battleData.name].types[1] ? c(pokes[battleData.name].types[1]) : null
const eff1 = await eff(c(move1.type),c(t1),t2)
const t3 = pokes[p.name].types[0]
const t4 = pokes[p.name].types[1] ? c(pokes[p.name].types[1]) : null
const eff2 = await eff(c(move2.type),c(t3),t4)
let a = move1.category == 'special'
  ? applyStageToStat(stats.special_attack, playerStages.special_attack)
  : applyStageToStat(stats.attack, playerStages.attack)
let d = move1.category == 'special'
  ? applyStageToStat(stats2.special_defense, wildStages.special_defense)
  : applyStageToStat(stats2.defense, wildStages.defense)
let a2 = move2.category == 'special'
  ? applyStageToStat(stats2.special_attack, wildStages.special_attack)
  : applyStageToStat(stats2.attack, wildStages.attack)
let d2 = move2.category == 'special'
  ? applyStageToStat(stats.special_defense, playerStages.special_defense)
  : applyStageToStat(stats.defense, playerStages.defense)
const isPerfectCrit1 = PERFECT_CRIT_MOVES.has(normalizeMoveName(move1.name))
const isPerfectCrit2 = PERFECT_CRIT_MOVES.has(normalizeMoveName(move2.name))
const isHighCritMove1 = HIGH_CRIT_RATIO_MOVES.has(normalizeMoveName(move1.name))
const isHighCritMove2 = HIGH_CRIT_RATIO_MOVES.has(normalizeMoveName(move2.name))
const didCrit1 = isPerfectCrit1 || (isHighCritMove1 && Math.random() < HIGH_CRIT_RATIO_CHANCE)
const didCrit2 = isPerfectCrit2 || (isHighCritMove2 && Math.random() < HIGH_CRIT_RATIO_CHANCE)
const isOhko1 = OHKO_MOVES.has(normalizeMoveName(move1.name))
const isOhko2 = OHKO_MOVES.has(normalizeMoveName(move2.name))
let damage = calc(a,d,clevel,move1.power,eff1)
let damage2 = calc(a2,d2,battleData.level,move2.power,eff2)
let ohkoFailed1 = false
let ohkoFailed2 = false
if (isOhko1) {
  const targetTypes = (pokes[battleData.name]?.types || []).map((t) => String(t).toLowerCase())
  const userTypes = (pokes[p.name]?.types || []).map((t) => String(t).toLowerCase())
  const sheerColdBlocked = normalizeMoveName(move1.name) == 'sheer cold' && targetTypes.includes('ice') && !userTypes.includes('ice')
  const chance = getOhkoHitChance(clevel, battleData.level)
  if (clevel < battleData.level || sheerColdBlocked || Math.random() * 100 >= chance) {
    damage = 0
    ohkoFailed1 = true
  } else {
    damage = battleData.ochp
  }
}
if (isOhko2) {
  const targetTypes = (pokes[p.name]?.types || []).map((t) => String(t).toLowerCase())
  const userTypes = (pokes[battleData.name]?.types || []).map((t) => String(t).toLowerCase())
  const sheerColdBlocked = normalizeMoveName(move2.name) == 'sheer cold' && targetTypes.includes('ice') && !userTypes.includes('ice')
  const chance = getOhkoHitChance(battleData.level, clevel)
  if (battleData.level < clevel || sheerColdBlocked || Math.random() * 100 >= chance) {
    damage2 = 0
    ohkoFailed2 = true
  } else {
    damage2 = battleData.chp
  }
}
if(didCrit1 && damage > 0){
  damage = Math.max(1, Math.floor(damage * CRIT_DAMAGE_MULTIPLIER))
}
if(didCrit2 && damage2 > 0){
  damage2 = Math.max(1, Math.floor(damage2 * CRIT_DAMAGE_MULTIPLIER))
}
const wildAbsorb = applyAbsorbMoveAbility({
  battleData,
  pass: opponentPass,
  pokemonName: battleData.name,
  abilityName: wildAbility,
  moveType: move1.type,
  moveName: move1.name,
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
  moveType: move2.type,
  moveName: move2.name,
  c
})
if(playerAbsorb.blocked){
  damage2 = 0
}
const playerHpBeforeHit = battleData.chp
const wildHpBeforeHit = battleData.ochp
battleData.chp = Math.max((battleData.chp-damage2),0)
battleData.team[battleData.c] = Math.max((battleData.team[battleData.c]-damage2),0)
battleData.ochp = Math.max((battleData.ochp-damage),0)
battleData.ot[battleData.name] = Math.max((battleData.ot[battleData.name]-damage),0)
let ms2 = '➩ <b>'+c(p.name)+'</b> Used <b>'+c(move1.name)+'</b> And Dealt <b>'+c(battleData.name)+'</b> <code>'+damage+'</code> HP.'
if(ohkoFailed1){
  ms2 = '➩ <b>'+c(p.name)+'</b> Used <b>'+c(move1.name)+'</b> but it failed.'
}
if(didCrit1 && damage > 0){
  ms2 += '\n<b>✶ A critical hit!</b>'
}
ms2 += wildAbsorb.message
const recoil = getRecoilDamage(move1.name, damage, stats.hp)
if(recoil > 0){
const selfBefore = battleData.chp
const recoilTaken = Math.min(recoil, selfBefore)
battleData.chp = Math.max(0, selfBefore - recoilTaken)
battleData.team[battleData.c] = Math.max(0, (battleData.team[battleData.c] || selfBefore) - recoilTaken)
ms2 += '\n<b>✶ '+c(p.name)+'</b> Was Hurt By Recoil And Lost <code>'+recoilTaken+'</code> HP.'
}
if(SELF_FAINT_MOVES.has(normalizeMoveName(move1.name)) && battleData.chp > 0){
battleData.chp = 0
battleData.team[battleData.c] = 0
ms2 += '\n<b>✶ '+c(p.name)+'</b> Fainted After Using <b>'+c(move1.name)+'</b>.'
}
const wildReactive = applyOnDamageTakenAbilities({
  battleData,
  pass: opponentPass,
  pokemonName: battleData.name,
  abilityName: wildAbility,
  moveType: move1.type,
  moveCategory: move1.category,
  hpBefore: wildHpBeforeHit,
  hpAfter: battleData.ochp,
  maxHp: battleData.ohp,
  damageDealt: damage,
  c
})
ms2 += wildReactive.message
if(battleData.ochp < 1){
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
let enemyAttackAbilityMsg = playerAbsorb.message
if(ohkoFailed2){
  enemyAttackAbilityMsg += '\n<b>✶ '+c(battleData.name)+'</b> used <b>'+c(move2.name)+'</b> but it failed.'
}
if(didCrit2 && damage2 > 0){
  enemyAttackAbilityMsg += '\n<b>✶ A critical hit!</b>'
}
const playerReactive = applyOnDamageTakenAbilities({
  battleData,
  pass: p.pass,
  pokemonName: p.name,
  abilityName: playerAbility,
  moveType: move2.type,
  moveCategory: move2.category,
  hpBefore: playerHpBeforeHit,
  hpAfter: battleData.chp,
  maxHp: stats.hp,
  damageDealt: damage2,
  c
})
enemyAttackAbilityMsg += playerReactive.message
if(battleData.chp < 1){
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
await saveBattleData(bword, battleData);
if(!ohkoFailed1 && eff1 == 0){
ms2 += '\n<b>✶ It\'s 0x effective!</b>'
}else if(!ohkoFailed1 && eff1 == 0.5){
ms2 += '\n<b>✶ It\'s not very effective...</b>'
}else if(!ohkoFailed1 && eff1 == 2){
ms2 += '\n<b>✶ It\'s super effective!</b>'
}else if(!ohkoFailed1 && eff1 == 4){
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
const ai = Math.floor(battleData.level/10)+1
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
const base2 = pokestats[p.name]
const stats = await Stats(base2,p.ivs,p.evs,c(p.nature),clevel)
const key = []
rows.push(key)
const op = pokes[battleData.name]
const uname = he.encode(ctx.from.first_name)
let msg = '\n\n<b>wild</b> '+c(battleData.name)+' ['+c(op.types.join(' / '))+']'
msg += '\n<b>Level :</b> '+battleData.level+' | <b>HP :</b> '+battleData.ochp+'/'+battleData.ohp+''
msg += '\n<code>'+Bar(battleData.ohp,battleData.ochp)+'</code>'
msg += '\n\n<b>Turn :</b> <code>'+uname+'</code>'
const p2 = pokes[p.name]
msg += '\n<b>'+c(p.name)+'</b> ['+c(p2.types.join(' / '))+']'
msg += '\n<b>Level :</b> '+clevel+' | <b>HP :</b> '+battleData.chp+'/'+stats.hp+''
msg += '\n<code>'+Bar(stats.hp,battleData.chp)+'</code>'
msg += '\n\n<b>Moves :</b>'
const moves = []
for(const move2 of p.moves){
const move = dmoves[move2]
msg += '\n<b>'+c(move.name)+'</b>['+c(move.type)+' '+emojis[move.type]+']\n<b>Power:</b> '+move.power+'<b>, Accuracy:</b> '+move.accuracy+' ('+c(move.category.charAt(0))+')'
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
await saveUserData2(ctx.from.id,data)
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'<b>'+c(battleData.name)+'</b> Used <b>'+c(move2.name)+'</b> And Dealt <b>'+c(p.name)+'</b> <code>'+damage2+'</code> HP.'+enemyAttackAbilityMsg+'\n\n- <b>'+c(p.name)+'</b> has fainted And You Got <b>Defeated</b>.',{parse_mode:'html'})
return
}
}

const playerEndTurn = applyEndTurnAbility({
  battleData,
  pass: p.pass,
  pokemonName: p.name,
  abilityName: playerAbility,
  c
})
const wildEndTurn = applyEndTurnAbility({
  battleData,
  pass: opponentPass,
  pokemonName: battleData.name,
  abilityName: wildAbility,
  c
})
enemyAttackAbilityMsg += playerEndTurn.message + wildEndTurn.message
await saveBattleData(bword, battleData)

const op = pokes[battleData.name]
let msg = '➩ <b>'+c(battleData.name)+'</b> Used <b>'+c(move2.name)+'</b> And Dealt <b>'+c(p.name)+'</b> <code>'+damage2+'</code> HP.'
msg += enemyAttackAbilityMsg
if(!ohkoFailed2 && eff2 == 0){
msg += '\n<b>✶ It\'s 0x effective!</b>'
}else if(!ohkoFailed2 && eff2 == 0.5){
msg += '\n<b>✶ It\'s not very effective...</b>'
}else if(!ohkoFailed2 && eff2 == 2){
msg += '\n<b>✶ It\'s super effective!</b>'
}else if(!ohkoFailed2 && eff2 == 4){
msg += '\n<b>✶ It\'s incredibly super effective!</b>'
}
msg += '\n\n<b>wild</b> '+c(battleData.name)+' ['+c(op.types.join(' / '))+']'
msg += '\n<b>Level :</b> '+battleData.level+' | <b>HP :</b> '+battleData.ochp+'/'+battleData.ohp+''
msg += '\n<code>'+Bar(battleData.ohp,battleData.ochp)+'</code>'
msg += '\n\n<b>Turn :</b> <code>'+uname+'</code>'
const p2 = pokes[p.name]
msg += '\n<b>'+c(p.name)+'</b> ['+c(p2.types.join(' / '))+']'
msg += '\n<b>Level :</b> '+clevel+' | <b>HP :</b> '+battleData.chp+'/'+stats.hp+''
msg += '\n<code>'+Bar(stats.hp,battleData.chp)+'</code>'
msg += '\n\n<b>Moves :</b>'
const moves = []
for(const move2 of p.moves){
let move = dmoves[move2]
msg += '\n• <b>'+c(move.name)+'</b> ['+c(move.type)+' '+emojis[move.type]+']\n<b>Power:</b> '+move.power+'<b>, Accuracy:</b> '+move.accuracy+' ('+c(move.category.charAt(0))+')'
moves.push(''+move2+'')
}
msg += '\n\n<i>Choose Your Next Move:</i>'
const buttons = moves.map((word) => ({ text: c(dmoves[word].name), callback_data: 'atk_'+word+'_'+bword+'' }));
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


