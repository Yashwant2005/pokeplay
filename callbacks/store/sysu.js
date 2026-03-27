function register_036_sysu(bot, deps) {
  const { getUserData, editMessage, c } = deps;
  bot.action(/sysu:/,async ctx => {
const id = ctx.callbackQuery.data.split(':')[2]
if(ctx.from.id!=id){
return
}
const data = await getUserData(ctx.from.id)
const item = ctx.callbackQuery.data.split(':')[1]
if(item=='omniring'){
var img = 'https://graph.org/file/0f09364d4e44755595dea.jpg'
var des = 'This *Special Item* enables both *Mega Evolution* and *Gigantamax* in battle when compatible conditions are met.'
}
var msg = 'This Item knows as *'+c(item)+'*\n• '+des+''
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'markdown',reply_markup:{inline_keyboard:[[{text:'Back',callback_data:'poag_special_'+ctx.from.id+''}]]},link_preview_options:{url:img,show_above_text:true}})
})
}

module.exports = register_036_sysu;

