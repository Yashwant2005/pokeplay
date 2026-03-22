function register_035_vyast(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/vyast:/,async ctx => {
const id = ctx.callbackQuery.data.split(':')[2]
if(ctx.from.id!=id){
return
}
const data = await getUserData(ctx.from.id)
const item = ctx.callbackQuery.data.split(':')[1]
const sts = [...new Set(data.inv.stones)]
const stone = /^\d+$/.test(String(item)) ? sts[Number(item)] : String(item || '').toLowerCase()
if(!stone || !stones[stone]){
ctx.answerCbQuery('Item not found')
return
}
const counts = data.inv.stones.reduce((count, word) => word.toLowerCase() === stone ? count + 1 : count, 0);
u = ''
if(!data.inv.omniring && !data.inv.ring && !data.inv.gmax_band){
u = '(_OmniRing Required_)'
}
const msg = 'This item known as *'+c(stone)+'*\n• This *Transformational Item* can transform *'+c(stones[stone].pokemon)+'* into *'+c(stones[stone].mega)+'* in a battle '+u+'.\n\n*Total Owned:* '+counts+''
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'markdown',reply_markup:{inline_keyboard:[[{text:'Back',callback_data:'poag_transformational_'+ctx.from.id+''}]]},link_preview_options:{url:stones[stone].image,show_above_text:true}})
})
}

module.exports = register_035_vyast;

