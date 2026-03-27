function register_052_tundse(bot, deps) {
  const { check2q, getUserData, editMessage, tms, pokes, dmoves, word, c, plevel, emojis } = deps;
  bot.action(/tundse_/,check2q,async ctx => {
const id = ctx.callbackQuery.data.split('_')[2]
if(ctx.from.id!=id){
return
}
const tm = ctx.callbackQuery.data.split('_')[1]
const m = tms.tmnumber[tm]
const pass = ctx.callbackQuery.data.split('_')[3]
const data = await getUserData(ctx.from.id)
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
if(pk.moves.length < 4){
let msg = 'Are You Sure To Your <b>'+c(pk.name)+'</b> (<b>Lv.</b> '+plevel(pk.name,pk.exp)+')'
const move2 = dmoves[String(m)]
msg += '\n\n<b>Learn New Move:</b>'
msg += '\n• <b>'+c(move2.name)+'</b> ['+c(move2.type)+' '+emojis[move2.type]+']\n<b>Power:</b> '+move2.power+'<b>, Accuracy:</b> '+move2.accuracy+' ('+c(move2.category.charAt(0))+')'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'HTML',reply_markup:{inline_keyboard:[[{text:'Confirm',callback_data:'lrtme_'+tm+'_'+id+'_'+pass+''},{text:'Cancel',callback_data:'crncl'}]]}})
}else{
let msg = '<b>Pokemon :</b> '+c(pk.name)+' (Lv. '+plevel(pk.name,pk.exp)+')\n\n'
const moves = []
for(const move2 of pk.moves){
let move = dmoves[move2]
msg += '• <b>'+c(move.name)+'</b> ['+c(move.type)+' '+emojis[move.type]+']\n<b>Power:</b> '+move.power+', <b>Accuracy:</b> '+move.accuracy+'% <i>('+c(move.category.charAt(0))+')</i>\n'
moves.push(move2)
}
msg += '\n<i>Which Move Should Be Forgotten?</i>'

const buttons = moves.map((word) => ({ text: c(dmoves[word].name), callback_data: 'frgtm_'+word+'_'+tm+'_'+id+'_'+pass+'' }));
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'HTML',reply_markup:{inline_keyboard:rows}})
}
})
}

module.exports = register_052_tundse;

