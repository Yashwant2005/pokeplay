const { getBattleMovePower, getBattleTerrainName, getDisplayedWeatherState, getEffectiveMoveType, getPinchAbilityInfo, getTerrainDisplayName, getWeatherDisplayName } = require('../../utils/battle_abilities');

function register_017_pokemon(bot, deps) {
  const { getUserData, editMessage, loadBattleData, pokes, dmoves, c, he, pokestats, plevel, Stats, battlec, emojis, Bar } = deps;
  bot.action(/pokemon_/,async ctx => {
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
const bword = ctx.callbackQuery.data.split('_')[1]
let battleData = {};
    try {
      battleData = loadBattleData(bword);
    } catch (error) {
      battleData = {};
    }
const data = await getUserData(ctx.from.id)
const p = data.pokes.filter((poke)=>poke.pass==battleData.c)[0]
if(!battleData || !battleData.c || !battleData.team || !battleData.name || !p || !pokestats[p.name] || !pokes[battleData.name]){
  await ctx.answerCbQuery('Battle desynced. Reopen battle.', { show_alert: true })
  return
}
const clevel = plevel(p.name,p.exp)
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
const key = [{text:'⬅️ Back',callback_data:'btl_'+bword+''}]
rows.push(key)
const op = pokes[battleData.name]
const uname = he.encode(ctx.from.first_name)
let msg = '\n\n<b>wild</b> '+c(battleData.name)+' ['+c(op.types.join(' / '))+']'
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
const terrainState = getBattleTerrainName(battleData)
if(terrainState){
msg += '\n<b>Terrain :</b> '+getTerrainDisplayName(terrainState)
if((battleData.terrainTurns || 0) > 0){
msg += ' ('+battleData.terrainTurns+' turns left)'
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
msg += '\n\n<i>Choose Which Poke Send For Battle:</i>'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'HTML',reply_markup:{inline_keyboard:rows}})
})
}

module.exports = register_017_pokemon;

