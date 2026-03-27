function register_056_tsejl(bot, deps) {
  const { getUserData, saveUserData2, editMessage, tms, tmprices } = deps;
  const getTmSellLp = (tm) => {
    const sellValue = Number(tmprices.sell[String(tm)] || 0)
    // Convert legacy PC sell value to LP with a stable ratio.
    return Math.max(1, Math.round(sellValue / 20))
  }
  bot.action(/tsejl_/,async ctx => {
const parts = String(ctx.callbackQuery.data || '').split('_')
const id = parts[parts.length - 1]
if(ctx.from.id!=id){
return
}
const tm = parts[1]
const lp = getTmSellLp(tm)
const data = await getUserData(ctx.from.id)
if(!data.tms){
data.tms={}
}
if(!Number.isFinite(data.inv.league_points)) data.inv.league_points = 0
if(!data.tms[tm] || data.tms[tm] < 1){
ctx.answerCbQuery('You Does Not Have This TM')
return
}
data.tms[tm] -= 1
data.inv.league_points += lp
await saveUserData2(ctx.from.id,data)
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'Sold *TM'+tm+'* For *'+lp+' League Points*',{parse_mode:'markdown'})
})
}

module.exports = register_056_tsejl;

