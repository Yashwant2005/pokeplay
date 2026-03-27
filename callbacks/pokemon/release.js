function register_085_release(bot, deps) {
  const { check2q, getUserData, editMessage, pokes, c, calculateTotal, plevel } = deps;
  bot.action(/release_/,check2q,async ctx => {
const pass = ctx.callbackQuery.data.split('_')[1]
const id = ctx.callbackQuery.data.split('_')[2]
const data = await getUserData(ctx.from.id)
const poke = data.pokes.filter((p)=>p.pass===pass)[0]
if(id!=ctx.from.id){
ctx.answerCbQuery()
return
}
if(!poke){
ctx.answerCbQuery('Poke not found', { show_alert: true })
return
}
const p2 = poke
await editMessage('caption',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'Are you sure you wanna *Release* your *'+c(p2.name)+'* (*Lv.* '+plevel(p2.name,p2.exp)+')\n*Nature:* '+c(p2.nature)+' , *Total IVs:* '+calculateTotal(p2.ivs)+' , *Total EVs:* '+calculateTotal(p2.evs)+'',{parse_mode:'markdown',reply_markup:{inline_keyboard:[[{text:'Yes',callback_data:'relst_'+p2.pass+'_'+ctx.from.id+''},{text:'No',callback_data:'dlt_'+ctx.from.id+''}]]}})
})
}

module.exports = register_085_release;

