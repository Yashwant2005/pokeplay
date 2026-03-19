function register_086_relst(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/relst_/,async ctx => {
const pass = ctx.callbackQuery.data.split('_')[1]
const id = ctx.callbackQuery.data.split('_')[2]
if(ctx.from.id!=id){
return
}
const data = await getUserData(ctx.from.id)
const pk = data.pokes.filter(pk=>pk.pass==pass)[0]
if(!pk){
ctx.answerCbQuery('You dont have this poke', {show_alert:true})
return
}
data.pokes = data.pokes.filter(pk=>pk.pass!=pass)
await saveUserData2(ctx.from.id,data)
await editMessage('caption',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'Successfully Released *'+c(pk.name)+'*',{parse_mode:'markdown'})
})
}

module.exports = register_086_relst;

