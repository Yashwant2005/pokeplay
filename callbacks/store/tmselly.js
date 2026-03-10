function register_055_tmselly(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/tmselly_/,async ctx => {
const id = ctx.callbackQuery.data.split('_')[3]
if(ctx.from.id!=id){
return
}
const price = ctx.callbackQuery.data.split('_')[2]
const tm = ctx.callbackQuery.data.split('_')[1]
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'Are You Sure To *Sell* *TM'+tm+'* For *'+price+'* PokeCoins 💷 ?',{parse_mode:'markdown',reply_markup:{inline_keyboard:[[{text:'Yes',callback_data:'tsejl_'+tm+'_'+price+'_'+id+''},{text:'Cancel',callback_data:'crncl'}]]}})
})
}

module.exports = register_055_tmselly;

