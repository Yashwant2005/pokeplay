function register_012_atk(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/atk_/,async ctx => {
if (battlec[ctx.chat.id] && Date.now() - battlec[ctx.chat.id] < 1600) {

  ctx.answerCbQuery('Try Again');
  return;
}
battlec[ctx.chat.id] = Date.now();
const move = ctx.callbackQuery.data.split('_')[1]
const bword = ctx.callbackQuery.data.split('_')[2]
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
let a = stats.attack
let d = stats2.defense
let a2 = stats2.attack
let d2 = stats.defense
const t1 = pokes[battleData.name].types[0]
const t2 = pokes[battleData.name].types[1] ? c(pokes[battleData.name].types[1]) : null
const eff1 = await eff(c(move1.type),c(t1),t2)
const t3 = pokes[p.name].types[0]
const t4 = pokes[p.name].types[1] ? c(pokes[p.name].types[1]) : null
const eff2 = await eff(c(move2.type),c(t3),t4)
if(move1.category=='special' || move2.category == 'special'){
a = stats.special_attack
d = stats2.special_defense
a2 = stats2.special_attack
d2 = stats.special_defense
}
const damage = calc(a,d,clevel,move1.power,eff1)
const damage2 = calc(a2,d2,battleData.level,move2.power,eff2)
battleData.chp = Math.max((battleData.chp-damage2),0)
battleData.team[battleData.c] = Math.max((battleData.team[battleData.c]-damage2),0)
battleData.ochp -= damage
battleData.ot[battleData.name] -= damage
await saveBattleData(bword, battleData);
let ms2 = '➩ <b>'+c(p.name)+'</b> Used <b>'+c(move1.name)+'</b> And Dealt <b>'+c(battleData.name)+'</b> <code>'+damage+'</code> HP.'
if(eff1 == 0){
ms2 += '\n<b>✶ It\'s 0x effective!</b>'
}else if(eff1 == 0.5){
ms2 += '\n<b>✶ It\'s not very effective...</b>'
}else if(eff1 == 2){
ms2 += '\n<b>✶ It\'s super effective!</b>'
}else if(eff1 == 4){
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
const ei = Math.floor(Math.random()*700)+200
data.inv.exp += ei
data.extra.hunting = false
await saveUserData2(ctx.from.id,data)
const messageData = await loadMessageData();
if(messageData[ctx.from.id]) {
delete messageData[ctx.from.id];
}
messageData.battle = messageData.battle.filter((chats) => chats !== ctx.from.id)
await saveMessageData(messageData)
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'*'+c(battleData.name)+'* Has Been Fainted\n+'+ai+' 💷',{parse_mode:'markdown'})
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
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'<b>'+c(battleData.name)+'</b> Used <b>'+c(move2.name)+'</b> And Dealt <b>'+c(p.name)+'</b> <code>'+damage2+'</code> HP.\n\n- <b>'+c(p.name)+'</b> has fainted And You Got <b>Defeated</b>.',{parse_mode:'html'})
return
}
}

const op = pokes[battleData.name]
let msg = '➩ <b>'+c(battleData.name)+'</b> Used <b>'+c(move2.name)+'</b> And Dealt <b>'+c(p.name)+'</b> <code>'+damage2+'</code> HP.'
if(eff1 == 0){
msg += '\n<b>✶ It\'s 0x effective!</b>'
}else if(eff1 == 0.5){
msg += '\n<b>✶ It\'s not very effective...</b>'
}else if(eff1 == 2){
msg += '\n<b>✶ It\'s super effective!</b>'
}else if(eff1 == 4){
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


