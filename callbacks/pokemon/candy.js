function register_066_candy(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/candy_/,check2q,async ctx => {
const pass = ctx.callbackQuery.data.split('_')[1]
const id = ctx.callbackQuery.data.split('_')[2]
const data = await getUserData(ctx.from.id)
const poke = data.pokes.filter((p)=>p.pass===pass)[0]
if(id!=ctx.from.id){
ctx.answerCbQuery()
return
}
if(!poke){
ctx.answerCbQuery('Poke not found')
return
}
const p2 = poke
const g = growth_rates[p2.name]
const exp = chart[g.growth_rate]
const matchingLevels = Object.keys(exp).filter(level => p2.exp >= exp[level]);
    const currentLevel = matchingLevels.length > 0 ? parseInt(matchingLevels[matchingLevels.length - 1]) : undefined;
if(!data.inv.candy){
data.inv.candy = 0
}
if(data.inv.candy < 1){
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'You are out of *Candies 🍬*',{parse_mode:'markdown'})
return
}
if(currentLevel*1 > 99){
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'*'+c(p2.name)+'* has already reached *100* level',{parse_mode:'markdown'})
return
}
data.inv.candy -= 1
p2.exp = exp[currentLevel+1]
await saveUserData2(ctx.from.id,data)
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'You gave 1 candy 🍬 to *'+c(p2.name)+'*\n*Level:* '+currentLevel+' --> '+(currentLevel+1)+'',{parse_mode:'markdown',reply_markup:{inline_keyboard:[[{text:'+1 Candy 🍬',callback_data:'candy_'+p2.pass+'_'+ctx.from.id+''}]]}})
const evo = chains.evolution_chains.filter((chain)=>chain.current_pokemon==p2.name)[0]
if(evo && evo.evolution_level && evo.evolution_method == 'level-up' && evo.evolution_level <= (currentLevel+1) && evo.evolution_level > currentLevel){
if(ctx.chat.type!='private'){
await sendMessage(ctx,ctx.chat.id,{parse_mode:'HTML'},'<a href="tg://user?id='+ctx.from.id+'"><b>'+data.inv.name+'</b></a> Your Pokemon <b>'+c(p2.name)+'</b> Is Ready To Evolve',{reply_markup:{inline_keyboard:[[{text:'Evolve',url:'t.me/'+bot.botInfo.username+''}]]}})
}
await sendMessage(ctx,ctx.from.id,'*'+c(p2.name)+'* Is Ready To Evolve',{parse_mode:'markdown',reply_markup:{inline_keyboard:[[{text:'Evolve',callback_data:'evy_'+p2.name+'_'+p2.pass+''}]]}})
}
if(((currentLevel+1)-currentLevel)!= 0){
const moves = pokemoves[p2.name]
const moves2 = moves.moves_info.filter((move)=> move.learn_method == 'level-up' && move.level_learned_at > currentLevel && move.level_learned_at <= (currentLevel+1) && dmoves[move.id].power && dmoves[move.id].accuracy && dmoves[move.id].category != 'status')
if(moves2.length > 0){
for(const m of moves2){
if(p2.moves.length < 4){
p2.moves.push(m.id)
await saveUserData2(ctx.from.id,data)
await sendMessage(ctx,ctx.from.id,'<b>'+c(p2.name)+'</b> (<b>Lv.</b> '+(currentLevel+1)+') Has Learnt A New Move <b>'+c(dmoves[m.id].name)+'</b> ['+c(dmoves[m.id].type)+' '+emojis[dmoves[m.id].type]+'].',{parse_mode:'HTML'})
}else{
const options = {
  timeZone: 'Asia/Kolkata',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  hour12: true,
};

const d = new Date().toLocaleString('en-US', options)
if(ctx.chat.type!='private'){
await sendMessage(ctx,ctx.chat.id,{parse_mode:'HTML'},'<a href="tg://user?id='+ctx.from.id+'"><b>'+data.inv.name+'</b></a>, <b>'+c(p2.name)+'</b> (<b>Lv.</b> '+(currentLevel+1)+') Wants To Learn A New Move',{reply_markup:{inline_keyboard:[[{text:'Go',url:'t.me/'+bot.botInfo.username+''}]]}})
}
const mdata = await loadMessageData();
const m77 = await sendMessage(ctx,ctx.from.id,'<b>'+c(p2.name)+'</b> (<b>Lv.</b> '+(currentLevel+1)+') Wants To Learn A New Move <b>'+c(dmoves[m.id].name)+'</b> ['+c(dmoves[m.id].type)+' '+emojis[dmoves[m.id].type]+'].\n\nBut <b>'+c(p2.name)+'</b> Already Knows 4 Moves He Have To Forget One Move To Learn <b>'+c(dmoves[m.id].name)+'</b>\n<i>You Have 15 Min To Choose.</i>',{reply_markup:{inline_keyboard:[[{text:'Go Next',callback_data:'lrn_'+p2.pass+'_'+m.id+'_'+d+''}]]},parse_mode:'HTML'})
if(!mdata.moves){
mdata.moves = {}
}
mdata.moves[m77.message_id] = {chat:ctx.from.id,td:d,poke:p2.name,move:dmoves[m.id].name}
await saveMessageData(mdata)
}
}
}
}
await saveUserData2(ctx.from.id,data)
})
}

module.exports = register_066_candy;

