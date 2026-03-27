function register_041_crncl(bot, deps) {
  const { editMessage } = deps;
  bot.action('crncl',async ctx => {
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,'Cancelled')
})
}

module.exports = register_041_crncl;

