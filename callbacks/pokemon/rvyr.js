function register_084_rvyr(bot, deps) {
  const { getUserData, saveUserData2, editMessage, stat, c, safari } = deps;
  bot.action(/rvyr_/,async ctx => {
const stat = ctx.callbackQuery.data.split('_')[1]
const data = await getUserData(ctx.from.id)
if(data.balls.safari && data.balls.safari > 0){
ctx.answerCbQuery('You are in safari zone')
return
}
if(data.extra.evhunt && data.extra.evhunt > 0){
ctx.answerCbQuery('You are already doing a ev hunt')
return
}
if(data.inv.pc < 50){
ctx.answerCbQuery('Not enough pokecoins')
return
}
data.inv.pc -= 50
data.extra.evhunt = 75
data.extra.evh = stat
await saveUserData2(ctx.from.id,data)
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'Your *'+c(stat)+' EV* training has *Started.*',{parse_mode:'markdown'})
})
}

module.exports = register_084_rvyr;

