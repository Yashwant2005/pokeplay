function register_009_run(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  const { revertTrackedFormsOnBattleEnd } = require('../../utils/battle_forms');
  bot.action(/run_/,async ctx => {
let battleData = {};
try {
  const bword = ctx.callbackQuery.data.split('_')[1]
  battleData = loadBattleData(bword);
} catch (error) {
  battleData = {};
}
const messageData = await loadMessageData();
if(messageData[ctx.from.id]) {
messageData.battle = messageData.battle.filter((chats)=> String(chats) !== String(ctx.from.id))
delete messageData[ctx.from.id];
await saveMessageData(messageData)
}
const data = await getUserData(ctx.from.id)
if (battleData && battleData.powerConstructOriginal && Array.isArray(data.pokes)) {
  for (const pass of Object.keys(battleData.powerConstructOriginal)) {
    const poke = data.pokes.find((entry) => String(entry.pass) === String(pass))
    if (poke) {
      poke.name = battleData.powerConstructOriginal[pass]
    }
  }
}
revertTrackedFormsOnBattleEnd(battleData, data)
data.extra.hunting = false
await saveUserData2(ctx.from.id,data)
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'Successfully Escaped')
})
}

module.exports = register_009_run;

