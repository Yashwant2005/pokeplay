function register_082_trtns(bot, deps) {
  const { getUserData, saveUserData2, editMessage, loadMessageData, pokes, dmoves, word, c, plevel, emojis, saveMessageData } = deps;
  bot.action(/trtns_/,async ctx => {
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
const frmove = ctx.callbackQuery.data.split('_')[4]
const data = await getUserData(ctx.from.id)
const pk = data.pokes.filter((poke)=>poke.pass == pass)[0]
if(!pk){
ctx.answerCbQuery('You Not Have This Poke')
return
}
if(pk.moves.length < 4){
pk.moves.push(m)
await saveUserData2(ctx.from.id,data)
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'The *Move Tutor* has tought *'+c(pk.name)+'* a new move *'+c(dmoves[String(m)].name)+'* '+emojis[dmoves[String(m)].type]+'',{parse_mode:'markdown'})
const mdata = await loadMessageData();
delete mdata.tutor[String(ctx.callbackQuery.message.message_id)]
await saveMessageData(mdata)
}else{
const move = ctx.callbackQuery.data.split('_')[4]
if(!move){
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
if(!pk.moves.includes(parseInt(move))){
ctx.answerCbQuery('Your Poke Does Not Know This Move')
return
}
const index = pk.moves.indexOf(parseInt(move));

if (index !== -1) {
  pk.moves[index] = parseInt(m);
await saveUserData2(ctx.from.id,data)
const mdata = await loadMessageData();
delete mdata.tutor[String(ctx.callbackQuery.message.message_id)]
await saveMessageData(mdata)
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'The *Move Tutor* has tought *'+c(pk.name)+'* a new move *'+c(dmoves[m].name)+'* '+emojis[dmoves[String(m)].type]+'',{parse_mode:'markdown'})
}
}
})
}

module.exports = register_082_trtns;

