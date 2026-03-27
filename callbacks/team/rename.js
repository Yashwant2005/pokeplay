function register_023_rename(bot, deps) {
  const { userState, sendMessage } = deps;
  bot.action(/rename_/,async ctx => {
const team = ctx.callbackQuery.data.split('_')[1]
ctx.deleteMessage();
const message = await sendMessage(ctx,ctx.chat.id,'Tell A New Name For *Team '+team+'*',{parse_mode:'markdown',reply_markup:{force_reply:true}})
const userData = {
      messageId: message,
      teamn: team // You can set the name to whatever you like
    };
    userState.set(ctx.from.id, userData);
  });
}

module.exports = register_023_rename;

