function register_058_multryn(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/multryn_/,async ctx => {
const now = Date.now();
const chatKey = ctx.chat && ctx.chat.id;
const userId = ctx.from && ctx.from.id;
const userKey = 'u_' + String(userId);
const chatLimited = chatKey !== undefined && battlec[chatKey] && now - battlec[chatKey] < 2000;
const userLimited = userId !== undefined && battlec[userKey] && now - battlec[userKey] < 2000;
if (chatLimited || userLimited) {
  await ctx.answerCbQuery('On cooldown 2 sec');
  return;
}
if (chatKey !== undefined) battlec[chatKey] = now;
if (userId !== undefined) battlec[userKey] = now;
const bword = ctx.callbackQuery.data.split('_')[1]
let battleData = {};
    try {
      battleData = loadBattleData(bword);
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
await saveBattleData(bword, battleData);
}
if(battleData.runs.includes(parseInt(battleData.cid)) && battleData.runs.includes(parseInt(battleData.oid))){
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'Both Player Choosed To *Escape* Battle',{parse_mode:'markdown'})
if(battleData.tempBattle && battleData.tempTeams){
  const t1 = battleData.tempTeams[battleData.cid] || [];
  const t2 = battleData.tempTeams[battleData.oid] || [];
  const u1 = await getUserData(battleData.cid);
  const u2 = await getUserData(battleData.oid);
  u1.pokes = (u1.pokes || []).filter(p => !t1.includes(p.pass));
  u2.pokes = (u2.pokes || []).filter(p => !t2.includes(p.pass));
  if(u1.extra && u1.extra.temp_battle){
    delete u1.extra.temp_battle[bword];
  }
  if(u2.extra && u2.extra.temp_battle){
    delete u2.extra.temp_battle[bword];
  }
  await saveUserData2(battleData.cid, u1);
  await saveUserData2(battleData.oid, u2);
}
const messageData = await loadMessageData();
messageData.battle = messageData.battle.filter((chats)=> chats!==parseInt(messageData[bword].turn) && chats!==parseInt(messageData[bword].oppo))
delete messageData[bword];
await saveMessageData(messageData);
}
})
}

module.exports = register_058_multryn;

