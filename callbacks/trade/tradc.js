function register_060_tradc(bot, deps) {
  const { editMessage, he } = deps;
  bot.action(/tradc_/,async ctx => {
const id1 = ctx.callbackQuery.data.split('_')[1]
const id2 = ctx.callbackQuery.data.split('_')[2]
if(ctx.from.id!=id1 && ctx.from.id!=id2){
ctx.answerCbQuery()
return
}
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'This trade has been cancelled by <a href = "tg://user?id='+ctx.from.id+'"><b>'+he.encode(ctx.from.first_name)+'</b></a>.',{parse_mode:'html'})
})
}

module.exports = register_060_tradc;

