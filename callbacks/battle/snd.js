const { applyEntryAbility, getBattleMovePower, getDisplayedWeatherState, getEffectiveMoveType, getPinchAbilityInfo, getWeatherDisplayName, setBattleWeatherNegationState } = require('../../utils/battle_abilities');
const { syncBattleFormAndAbility } = require('../../utils/battle_forms');

function register_018_snd(bot, deps) {
  const { getUserData, editMessage, loadBattleData, saveBattleData, pokes, dmoves, word, c, he, pokestats, plevel, Stats, battlec, emojis, Bar } = deps;
  bot.action(/snd_/,async ctx => {
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
const bword = ctx.callbackQuery.data.split('_')[2]
let battleData = {};
    try {
      battleData = loadBattleData(bword);
    } catch (error) {
      battleData = {};
    }
const data = await getUserData(ctx.from.id)
const ps = ctx.callbackQuery.data.split('_')[1]
if(!battleData || !battleData.team || !battleData.name || !pokes[battleData.name]){
ctx.answerCbQuery('Battle desynced. Reopen battle.', { show_alert: true })
return
}
if(battleData.team[ps] < 1){
ctx.answerCbQuery('This Poke Has Died')
return
}
const p = data.pokes.filter((poke)=>poke.pass==ps)[0]
if(!p){
ctx.answerCbQuery('Poke Not Found In Database')
return
}
if(!pokestats[p.name]){
ctx.answerCbQuery('Pokemon data missing.', { show_alert: true })
return
}
syncBattleFormAndAbility({ battleData, pokemon: p, pass: p.pass, pokestats })

battleData.c = ps
battleData.chp = battleData.team[ps]
await saveBattleData(bword, battleData);
const uname = he.encode(ctx.from.first_name)
const clevel = plevel(p.name,p.exp)
const op = pokes[battleData.name]
const base2 = pokestats[p.name]
const baseWild = pokestats[battleData.name]
const stats = await Stats(base2,p.ivs,p.evs,c(p.nature),clevel)
const wildStats = await Stats(baseWild,battleData.ivs,battleData.evs,c(battleData.nat),battleData.level)
const entryAbility = applyEntryAbility({
  battleData,
  pass: p.pass,
  pokemonName: p.name,
  abilityName: p.ability,
  heldItem: p.held_item,
  selfStats: stats,
  opponentStats: wildStats,
  opponentPass: battleData.opass,
  opponentName: battleData.name,
  opponentAbility: battleData.oability,
  c
})
const weatherNegation = setBattleWeatherNegationState({
  battleData,
  activeAbilities: [p.ability, battleData.oability],
  sourcePokemonName: p.name,
  sourceAbilityName: p.ability,
  c
})
await saveBattleData(bword, battleData);
let msg = '<i> Sent '+p.name+' For Battle</i>'
msg += entryAbility.message
msg += weatherNegation.message
msg += '\n\n<b>wild</b> '+c(battleData.name)+' ['+c(op.types.join(' / '))+']'
msg += '\n<b>Level :</b> '+battleData.level+' | <b>HP :</b> '+battleData.ochp+'/'+battleData.ohp+''
msg += '\n<code>'+Bar(battleData.ohp,battleData.ochp)+'</code>'
const weatherState = getDisplayedWeatherState(battleData)
if(weatherState.weather){
msg += '\n<b>Weather :</b> '+getWeatherDisplayName(weatherState.weather)
if((battleData.weatherTurns || 0) > 0){
msg += ' ('+battleData.weatherTurns+' turns left)'
}
if(weatherState.negated){
msg += ' <i>(effects negated)</i>'
}
}
msg += '\n\n<b>Turn :</b> <code>'+uname+'</code>'
const p2 = pokes[p.name]
msg += '\n<b>'+c(p.name)+'</b> ['+c(p2.types.join(' / '))+']'
msg += '\n<b>Level :</b> '+clevel+' | <b>HP :</b> '+battleData.chp+'/'+stats.hp+''
msg += '\n<code>'+Bar(stats.hp,battleData.chp)+'</code>'
msg += '\n\n<b>Moves :</b>'
const moves = []
for(const move2 of p.moves){
let move = dmoves[move2]
if(!move) continue
const rawPower = getBattleMovePower({ battleData, pass: p.pass, pokemonName: p.name, abilityName: p.ability, moveName: move && move.name, movePower: move && move.power })
const shownType = getEffectiveMoveType({ battleData, pokemonName: p.name, abilityName: p.ability, heldItem: p.held_item, moveName: move && move.name, moveType: move && move.type }) || move.type
const pinchInfo = getPinchAbilityInfo({ abilityName: p.ability, moveType: move && move.type, currentHp: battleData.chp, maxHp: stats.hp })
const shownPower = Number.isFinite(rawPower) && rawPower > 0 && pinchInfo.active
  ? rawPower + ' (x' + pinchInfo.multiplier + ' ' + pinchInfo.abilityLabel + ')'
  : move.power
msg += '\n<b>'+c(move.name)+'</b>['+c(shownType)+' '+(emojis[shownType] || '')+']\n<b>Power:</b> '+shownPower+'<b>, Accuracy:</b> '+move.accuracy+' ('+c(move.category.charAt(0))+')'
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
rows.push(key2)
  const keyboard = {
    inline_keyboard: rows,key2
  };
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'HTML',reply_markup:keyboard})
})
}

module.exports = register_018_snd;

