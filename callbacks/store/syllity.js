function register_045_syllity(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/syllity_/,check2q,async ctx => {
const id = ctx.callbackQuery.data.split('_')[2]
if(ctx.from.id!=id){
return
}
const data = await getUserData(ctx.from.id)
const item = ctx.callbackQuery.data.split('_')[1]*1
if(!data.inv.stones[item*1]){
ctx.answerCbQuery('Something Went Wrong With This Stone')
return
}
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'Are You Sure To Sell Your *'+c(data.inv.stones[item*1])+'* For *5000 PokeCoinS* 💷',{parse_mode:'markdown',reply_markup:{inline_keyboard:[[{text:'Yes',callback_data:'syr_'+item+'_'+ctx.from.id+''},{text:'No',callback_data:'dlt_'+ctx.from.id+''}]]}, link_preview_options:{show_above_text:true, url: stones[data.inv.stones[item*1]].image}})
})
}

module.exports = register_045_syllity;

