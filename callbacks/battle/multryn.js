function register_058_multryn(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/multryn_/,async ctx => {
if (battlec[ctx.chat.id] && Date.now() - battlec[ctx.chat.id] < 1600) {

  ctx.answerCbQuery('Try Again');
  return;
}
battlec[ctx.chat.id] = Date.now();
const bword = ctx.callbackQuery.data.split('_')[1]
let battleData = {};
    try {
      battleData = JSON.parse(fs.readFileSync('./data/battle/'+bword+'.json', 'utf8'));
} catch (error) {
      battleData = {};
    }
if(ctx.from.id!=battleData.cid && ctx.from.id!=battleData.oid){
ctx.answerCbQuery();
return
}
if(!battleData.runs){
battleData.runs = []
}
if(battleData.runs.includes(ctx.from.id)){
ctx.answerCbQuery('You Have Already Escapped Waiting For Opponent')
}else{
battleData.runs.push(ctx.from.id)
ctx.answerCbQuery('Waiting For Opponent To Run')
await fs.writeFileSync('./data/battle/' +bword+ '.json', JSON.stringify(battleData, null, 2));
}
if(battleData.runs.includes(parseInt(battleData.cid)) && battleData.runs.includes(parseInt(battleData.oid))){
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'Both Player Choosed To *Escape* Battle',{parse_mode:'markdown'})
const messageData = await loadMessageData();
messageData.battle = messageData.battle.filter((chats)=> chats!==parseInt(messageData[bword].turn) && chats!==parseInt(messageData[bword].oppo))
delete messageData[bword];
await saveMessageData(messageData);
}
})
}

module.exports = register_058_multryn;

