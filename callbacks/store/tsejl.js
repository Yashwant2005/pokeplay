function register_056_tsejl(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/tsejl_/,async ctx => {
const id = ctx.callbackQuery.data.split('_')[3]
if(ctx.from.id!=id){
return
}
const price = ctx.callbackQuery.data.split('_')[2]*1
const tm = ctx.callbackQuery.data.split('_')[1]
const data = await getUserData(ctx.from.id)
if(!data.tms){
data.tms={}
}
if(!data.tms[tm] || data.tms[tm] < 1){
ctx.answerCbQuery('You Does Not Have This TM')
return
}
data.tms[tm] -= 1
data.inv.pc += price
await saveUserData2(ctx.from.id,data)
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'Sold *TM'+tm+'* For *'+price+'* PokeCoins 💷',{parse_mode:'markdown'})
})
}

module.exports = register_056_tsejl;

