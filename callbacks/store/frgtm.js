function register_053_frgtm(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/frgtm_/,check2q,async ctx => {
const id = ctx.callbackQuery.data.split('_')[3]
if(ctx.from.id!=id){
return
}
const tm = ctx.callbackQuery.data.split('_')[2]
const m = tms.tmnumber[tm]
const pass = ctx.callbackQuery.data.split('_')[4]
const data = await getUserData(ctx.from.id)
const move9 = ctx.callbackQuery.data.split('_')[1]
const pk = data.pokes.filter((poke)=>poke.pass == pass)[0]
if(!pk){
ctx.answerCbQuery('You Not Have This Poke')
return
}
if(!data.tms){
data.tms={}
}
if(!data.tms[tm] || data.tms[tm] < 1){
ctx.answerCbQuery('You Does Not Have This TM')
return
}
const poke = pk
let msg = 'Are You Sure To Your <b>'+c(poke.name)+'</b> (<b>Lv.</b> '+plevel(poke.name,poke.exp)+')\n\n'
msg += '<b>Forget The Move:</b>'
const move = dmoves[String(move9)]
const move2 = dmoves[String(m)]
msg += '\n• <b>'+c(move.name)+'</b> ['+c(move.type)+' '+emojis[move.type]+']\n<b>Power:</b> '+move.power+'<b>, Accuracy:</b> '+move.accuracy+' ('+c(move.category.charAt(0))+')'
msg += '\n\n<b>And Learn The Move:</b>'
msg += '\n• <b>'+c(move2.name)+'</b> ['+c(move2.type)+' '+emojis[move2.type]+']\n<b>Power:</b> '+move2.power+'<b>, Accuracy:</b> '+move2.accuracy+' ('+c(move2.category.charAt(0))+')'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'HTML',reply_markup:{inline_keyboard:[[{text:'Confirm',callback_data:'lrtme_'+tm+'_'+id+'_'+pass+'_'+move9+''},{text:'Cancel',callback_data:'crncl'}]]}})
})
}

module.exports = register_053_frgtm;

