function register_080_trlr(bot, deps) {
  const { getUserData, editMessage, pokes, dmoves, word, c, plevel, emojis } = deps;
  bot.action(/trlr_/,async ctx => {
const m = ctx.callbackQuery.data.split('_')[1]
const d = ctx.callbackQuery.data.split('_')[2]
const pass = ctx.callbackQuery.data.split('_')[3]
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
const data = await getUserData(ctx.from.id)
const pk = data.pokes.filter((poke)=>poke.pass == pass)[0]
if(!pk){
ctx.answerCbQuery('You Not Have This Poke')
return
}
if(pk.moves.length < 4){
let msg = 'Are You Sure To Your <b>'+c(pk.name)+'</b> (<b>Lv.</b> '+plevel(pk.name,pk.exp)+')'
const move2 = dmoves[String(m)]
msg += '\n\n<b>Learn New Move By The Move Tutor:</b>'
msg += '\n• <b>'+c(move2.name)+'</b> ['+c(move2.type)+' '+emojis[move2.type]+']\n<b>Power:</b> '+move2.power+'<b>, Accuracy:</b> '+move2.accuracy+' ('+c(move2.category.charAt(0))+')'
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'HTML',reply_markup:{inline_keyboard:[[{text:'Confirm',callback_data:'trtns_'+m+'_'+d+'_'+pass+''},{text:'No',callback_data:'tyrt_'+m+'_'+d+''}]]}})
}else{
let msg = '<b>Pokemon :</b> '+c(pk.name)+' (Lv. '+plevel(pk.name,pk.exp)+')\n\n'
const moves = []
for(const move2 of pk.moves){
let move = dmoves[move2]
msg += '• <b>'+c(move.name)+'</b> ['+c(move.type)+' '+emojis[move.type]+']\n<b>Power:</b> '+move.power+', <b>Accuracy:</b> '+move.accuracy+'% <i>('+c(move.category.charAt(0))+')</i>\n'
moves.push(move2)
}
msg += '\n<i>Your Pokemon Already Knows 4 Moves, Which Move Should Be Forgotten To Know New One?</i>'

const buttons = moves.map((word) => ({ text: c(dmoves[word].name), callback_data: 'tryfrg_'+word+'_'+m+'_'+d+'_'+pass+'' }));
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }
  rows.push([{text:'Cancel', callback_data:'tyrt_'+m+'_'+d+''}]) 
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'HTML',reply_markup:{inline_keyboard:rows}})
}
})
}

module.exports = register_080_trlr;

