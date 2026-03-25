function register_042_mhusz(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/mhusz_/,check2q,async ctx => {
const move = ctx.callbackQuery.data.split('_')[1]
const pass = ctx.callbackQuery.data.split('_')[3]
const mid = ctx.callbackQuery.data.split('_')[2]
const time = ctx.callbackQuery.data.split('_')[4]
const data = await getUserData(ctx.from.id)
console.log(pass)
const poke = data.pokes.filter((poke)=> poke.pass == pass)[0]
if(!poke){
ctx.answerCbQuery('You Not Have This Poke AnyMore')
return
}
const queryTime = Number(time)
const timeDifference = Date.now() - (Number.isFinite(queryTime) ? queryTime : Date.now());
console.log(timeDifference)
if(!poke.moves.includes(parseInt(move))){
ctx.answerCbQuery('Your Poke Does Not Know This Move')
return
}
if(poke.moves.includes(parseInt(mid))){
ctx.answerCbQuery('This move is already learned.')
return
}
const index = poke.moves.indexOf(parseInt(move));

if (index !== -1) {
  poke.moves[index] = parseInt(mid);
await saveUserData2(ctx.from.id,data)
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'*'+c(poke.name)+'* Has Learnt *'+c(dmoves[mid].name)+'*',{parse_mode:'markdown'})
const mdata = await loadMessageData();
if(mdata.moves[ctx.callbackQuery.message.message_id]){
delete mdata.moves[ctx.callbackQuery.message.message_id]
await saveMessageData(mdata)
}
}
})
}

module.exports = register_042_mhusz;

