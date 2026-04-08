const { cleanupTempBattleForUsers, clearBattleMessageState } = require('../../utils/temp_battle_cleanup');

function register_058_multryn(bot, deps) {
  const { getUserData, saveUserData2, editMessage, loadMessageData, loadBattleData, saveBattleData, battlec, saveMessageData } = deps;
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
if(String(ctx.from.id)!=String(battleData.cid) && String(ctx.from.id)!=String(battleData.oid)){
ctx.answerCbQuery();
return
}
if(!battleData.runs){
battleData.runs = []
}
battleData.runs = battleData.runs.map((id) => String(id))
const runnerId = String(ctx.from.id)
if(battleData.runs.includes(runnerId)){
ctx.answerCbQuery('You Have Already Escapped Waiting For Opponent')
}else{
battleData.runs.push(runnerId)
ctx.answerCbQuery('Waiting For Opponent To Run')
await saveBattleData(bword, battleData);
}
if(battleData.runs.includes(String(battleData.cid)) && battleData.runs.includes(String(battleData.oid))){
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'Both Player Choosed To *Escape* Battle',{parse_mode:'markdown'})
await cleanupTempBattleForUsers({ battleData, bword, getUserData, saveUserData2 });
await clearBattleMessageState({ bword, loadMessageData, saveMessageData });
await saveBattleData(bword, {});
}
})
}

module.exports = register_058_multryn;

