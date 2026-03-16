function register_046_syr(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  const getStoneSell = (stoneName) => {
    const poke = stones[stoneName] ? stones[stoneName].pokemon : ''
    const rate = Number(catch_rates[poke] || 190)
    if(rate <= 45) return { lp: 120, tier: 'Ultra Rare' }
    if(rate <= 75) return { lp: 90, tier: 'Rare' }
    if(rate <= 120) return { lp: 70, tier: 'Uncommon' }
    return { lp: 50, tier: 'Common' }
  }
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
const meta = getStoneSell(it)
if(!Number.isFinite(data.inv.league_points)) data.inv.league_points = 0
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'Successfully *Sold* your *'+c(it)+'* ('+meta.tier+') for *'+meta.lp+' League Points*',{parse_mode:'markdown', link_preview_options:{show_above_text:true, url: stones[data.inv.stones[item*1]].image}})
await sendMessage(ctx,-1003069884900,'#sell\n\n<b>'+he.encode(ctx.from.first_name)+'</b> (<code>'+ctx.from.id+'</code>) sold <code>'+c(it)+'</code>'
,{parse_mode:'HTML'})
data.inv.stones.splice(item*1,1)
data.inv.league_points += meta.lp
await saveUserData2(ctx.from.id,data)
})
}

module.exports = register_046_syr;

