function register_039_lrn(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/lrn_/,check2q,async ctx => {
const pass = ctx.callbackQuery.data.split('_')[1]
const mid = ctx.callbackQuery.data.split('_')[2]
const time = ctx.callbackQuery.data.split('_')[3]
const data = await getUserData(ctx.from.id)
const poke = data.pokes.filter((poke)=> poke.pass == pass)[0]
if(!poke){
ctx.answerCbQuery('You Not Have This Poke AnyMore')
return
}
const queryTime = Number(time)
if(!Number.isFinite(queryTime)){
ctx.answerCbQuery('Invalid request.')
return
}
const timeDifference = Date.now() - queryTime;
console.log(timeDifference)
if(timeDifference > 900000){
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'Unfortunately, Timeout For *15 Min* Has Over & *'+c(poke.name)+'* Did Not Learnt *'+c(dmoves[mid].name)+'*',{parse_mode:'markdown'})
return
}
let msg = '<b>Pokemon :</b> '+c(poke.name)+' (Lv. '+plevel(poke.name,poke.exp)+')\n\n'
const moves = []
for(const move2 of poke.moves){
let move = dmoves[move2]
msg += '• <b>'+c(move.name)+'</b> ['+c(move.type)+' '+emojis[move.type]+']\n<b>Power:</b> '+move.power+', <b>Accuracy:</b> '+move.accuracy+'% <i>('+c(move.category.charAt(0))+')</i>\n'
moves.push(move2)
}
msg += '\n<i>Which Move Should Be Forgotten?</i>'

const buttons = moves.map((word) => ({ text: c(dmoves[word].name), callback_data: 'elr_'+word+'_'+pass+'_'+mid+'_'+time+'' }));
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,msg,{parse_mode:'HTML',reply_markup:{inline_keyboard:rows}})
})
}

module.exports = register_039_lrn;

