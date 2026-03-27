const { cleanupTempBattleForUsers, clearBattleMessageState } = require('../../utils/temp_battle_cleanup');

function register_057_reject(bot, deps) {
  const { getUserData, saveUserData2, editMessage, loadMessageData, loadBattleData, saveBattleData, he, saveMessageData } = deps;
  bot.action(/reject_/,async ctx => {
const parts = ctx.callbackQuery.data.split('_')
const id1 = parts[1]
const id2 = parts[2]
const bword = parts[3]
if(ctx.from.id!=id2 && ctx.from.id!=id1){
ctx.answerCbQuery();
return
}
if(bword){
  try {
    const battleData = loadBattleData(bword);
    await cleanupTempBattleForUsers({ battleData, bword, userIds: [id1, id2], getUserData, saveUserData2 });
    await clearBattleMessageState({ bword, loadMessageData, saveMessageData });
    await saveBattleData(bword, {});
  } catch (e) {
    // ignore missing battle file
  }
}
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'This challenge has been rejected by <a href="tg://user?id='+ctx.from.id+'"><b>'+he.encode(ctx.from.first_name)+'</b></a>',{parse_mode:'HTML'})
})
}

module.exports = register_057_reject;

