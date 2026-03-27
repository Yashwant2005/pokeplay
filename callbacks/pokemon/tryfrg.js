function register_081_tryfrg(bot, deps) {
  const { getUserData, editMessage, pokes, dmoves, c, plevel, emojis } = deps;
  bot.action(/tryfrg_/,async ctx => {
const frmove = ctx.callbackQuery.data.split('_')[1]
const m = ctx.callbackQuery.data.split('_')[2]
const d = ctx.callbackQuery.data.split('_')[3]
const queryTime = new Date(d)
const options = {
timeZone: 'Asia/Kolkata',
month: 'numeric',
day: 'numeric',
hour: 'numeric',
minute: 'numeric',
  hour12: true,
};
const currentTime = new Date().toLocaleString('en-US', options)
const timeDifference = new Date(currentTime) - queryTime;
if(timeDifference > 900000){
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'Unfortunately, Timeout For *15 Min* Has Over & *Move Tutor* has gone, you *Missed* opportunity to teach your pokemon *'+c(dmoves[m].name)+'*',{parse_mode:'markdown'})
return
}
const pass = ctx.callbackQuery.data.split('_')[4]
const data = await getUserData(ctx.from.id)
const pk = data.pokes.filter((poke)=>poke.pass == pass)[0]
if(!pk){
ctx.answerCbQuery('You Not Have This Poke')
return
}
const poke = pk
let msg = 'Are You Sure To Your <b>'+c(poke.name)+'</b> (<b>Lv.</b> '+plevel(poke.name,poke.exp)+')\n\n'
msg += '<b>Forget The Move:</b>'
const move = dmoves[String(frmove)]
const move2 = dmoves[String(m)]
msg += '\n• <b>'+c(move.name)+'</b> ['+c(move.type)+' '+emojis[move.type]+']\n<b>Power:</b> '+move.power+'<b>, Accuracy:</b> '+move.accuracy+' ('+c(move.category.charAt(0))+')'
msg += '\n\n<b>And Learn The Move:</b>'
msg += '\n• <b>'+c(move2.name)+'</b> ['+c(move2.type)+' '+emojis[move2.type]+']\n<b>Power:</b> '+move2.power+'<b>, Accuracy:</b> '+move2.accuracy+' ('+c(move2.category.charAt(0))+')'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'HTML',reply_markup:{inline_keyboard:[[{text:'Confirm',callback_data:'trtns_'+m+'_'+d+'_'+pass+'_'+frmove+''},{text:'No',callback_data:'trlr_'+m+'_'+d+'_'+pass+''}]]}})
})
}

module.exports = register_081_tryfrg;

