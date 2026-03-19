function register_040_elr(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/elr_/,check2q,async ctx => {
const move9 = ctx.callbackQuery.data.split('_')[1]
const pass = ctx.callbackQuery.data.split('_')[2]
const mid = ctx.callbackQuery.data.split('_')[3]
const time = ctx.callbackQuery.data.split('_')[4]
const data = await getUserData(ctx.from.id)
const poke = data.pokes.filter((poke)=> poke.pass == pass)[0]
if(!poke){
ctx.answerCbQuery('You Not Have This Poke AnyMore')
return
}
const queryTime = Number(time)
const timeDifference = Date.now() - (Number.isFinite(queryTime) ? queryTime : Date.now());
console.log(timeDifference)
let msg = 'Are You Sure To Your <b>'+c(poke.name)+'</b> (<b>Lv.</b> '+plevel(poke.name,poke.exp)+')\n\n'
msg += '<b>Forget The Move:</b>'
const move = dmoves[String(move9)]
const move2 = dmoves[String(mid)]
msg += '\n• <b>'+c(move.name)+'</b> ['+c(move.type)+' '+emojis[move.type]+']\n<b>Power:</b> '+move.power+'<b>, Accuracy:</b> '+move.accuracy+' ('+c(move.category.charAt(0))+')'
msg += '\n\n<b>And Learn The Move:</b>'
msg += '\n• <b>'+c(move2.name)+'</b> ['+c(move2.type)+' '+emojis[move2.type]+']\n<b>Power:</b> '+move2.power+'<b>, Accuracy:</b> '+move2.accuracy+' ('+c(move2.category.charAt(0))+')'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'HTML',reply_markup:{inline_keyboard:[[{text:'Confirm',callback_data:'mhusz_'+move9+'_'+mid+'_'+pass+'_'+time+''},{text:'Cancel',callback_data:'lrn_'+pass+'_'+mid+'_'+time+''}]]}})
})
}

module.exports = register_040_elr;

