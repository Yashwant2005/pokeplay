function register_054_lrtme(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/lrtme_/,check2q,async ctx => {
const id = ctx.callbackQuery.data.split('_')[2]
if(ctx.from.id!=id){
return
}
const tm = ctx.callbackQuery.data.split('_')[1]
const m = tms.tmnumber[tm]
const pass = ctx.callbackQuery.data.split('_')[3]
const data = await getUserData(ctx.from.id)
const pk = data.pokes.filter((poke)=>poke.pass == pass)[0]
if(!pk){
ctx.answerCbQuery('You Not Have This Poke')
return
}
if(!data.tms){
data.tms={}
}
if(!data.tms[tm] || data.tms[tm] < 1){
ctx.answerCbQuery('You Does Not Have This TM')
return
}
if(pk.moves.length < 4){
pk.moves.push(m)
data.tms[tm] -= 1
await saveUserData2(ctx.from.id,data)
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'*'+c(pk.name)+'* Learnt *'+c(dmoves[String(m)].name)+'* '+emojis[dmoves[String(m)].type]+'',{parse_mode:'markdown'})
}else{
const move = ctx.callbackQuery.data.split('_')[4]
if(!pk.moves.includes(parseInt(move))){
ctx.answerCbQuery('Your Poke Does Not Know This Move')
return
}
const index = pk.moves.indexOf(parseInt(move));

if (index !== -1) {
data.tms[tm] -= 1
  pk.moves[index] = parseInt(m);
await saveUserData2(ctx.from.id,data)
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'*'+c(pk.name)+'* Has Learnt *'+c(dmoves[m].name)+'* '+emojis[dmoves[String(m)].type]+'',{parse_mode:'markdown'})
}
}
})
}

module.exports = register_054_lrtme;

