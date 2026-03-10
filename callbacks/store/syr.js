function register_046_syr(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/syr_/,async ctx => {
const id = ctx.callbackQuery.data.split('_')[2]
if(ctx.from.id!=id){
return
}
const data = await getUserData(ctx.from.id)
const item = ctx.callbackQuery.data.split('_')[1]
if(ctx.session.itm && ctx.session.itm != ctx.callbackQuery.message.message_id){
ctx.answerCbQuery('This query is old. Try using command again to sell stone',{show_alert:true})
return
}
if(!data.inv.stones[item*1]){
ctx.answerCbQuery('Something Went Wrong With This Stone')
return
}
const it = data.inv.stones[item*1]
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'Successfully *Sold* your *'+c(it)+'* for *5000 PokeCoins* 💷',{parse_mode:'markdown', link_preview_options:{show_above_text:true, url: stones[data.inv.stones[item*1]].image}})
await sendMessage(ctx,-1003069884900,'#sell\n\n<b>'+he.encode(ctx.from.first_name)+'</b> (<code>'+ctx.from.id+'</code>) sold <code>'+c(it)+'</code>'
,{parse_mode:'HTML'})
data.inv.stones.splice(item*1,1)
data.inv.pc += 5000
await saveUserData2(ctx.from.id,data)
})
}

module.exports = register_046_syr;

