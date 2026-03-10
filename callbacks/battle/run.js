function register_009_run(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.action(/run_/,async ctx => {
const messageData = await loadMessageData();
if(messageData[ctx.from.id]) {
messageData.battle = messageData.battle.filter((chats)=> chats !==ctx.from.id)
delete messageData[ctx.from.id];
await saveMessageData(messageData)
}
const data = await getUserData(ctx.from.id)
data.extra.hunting = false
await saveUserData2(ctx.from.id,data)
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'Successfully Escaped')
})
}

module.exports = register_009_run;

