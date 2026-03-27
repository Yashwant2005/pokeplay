function register_045_syllity(bot, deps) {
  const { check2q, getUserData, editMessage, stones, c, catch_rates } = deps;
  const getStoneSell = (stoneName) => {
    const poke = stones[stoneName] ? stones[stoneName].pokemon : ''
    const rate = Number(catch_rates[poke] || 190)
    if(rate <= 45) return { lp: 120, tier: 'Ultra Rare' }
    if(rate <= 75) return { lp: 90, tier: 'Rare' }
    if(rate <= 120) return { lp: 70, tier: 'Uncommon' }
    return { lp: 50, tier: 'Common' }
  }
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
const meta = getStoneSell(data.inv.stones[item*1])
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'Are You Sure To Sell Your *'+c(data.inv.stones[item*1])+'* ('+meta.tier+') For *'+meta.lp+' League Points*',{parse_mode:'markdown',reply_markup:{inline_keyboard:[[{text:'Yes',callback_data:'syr_'+item+'_'+ctx.from.id+''},{text:'No',callback_data:'dlt_'+ctx.from.id+''}]]}, link_preview_options:{show_above_text:true, url: stones[data.inv.stones[item*1]].image}})
})
}

module.exports = register_045_syllity;

