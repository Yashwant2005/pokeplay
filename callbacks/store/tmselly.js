function register_055_tmselly(bot, deps) {
  const { editMessage, tmprices } = deps;
  const getTmSellLp = (tm) => {
    const sellValue = Number(tmprices.sell[String(tm)] || 0)
    // Convert legacy VP-era sell value to LP with a stable ratio.
    return Math.max(1, Math.round(sellValue / 20))
  }
  bot.action(/tmselly_/,async ctx => {
const parts = String(ctx.callbackQuery.data || '').split('_')
const id = parts[parts.length - 1]
if(ctx.from.id!=id){
return
}
const tm = parts[1]
const lp = getTmSellLp(tm)
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'Are You Sure To *Sell* *TM'+tm+'* For *'+lp+' League Points* ?',{parse_mode:'markdown',reply_markup:{inline_keyboard:[[{text:'Yes',callback_data:'tsejl_'+tm+'_'+id+''},{text:'Cancel',callback_data:'crncl'}]]}})
})
}

module.exports = register_055_tmselly;


