function registerHiCommand(bot, deps) {
  const { sendMessage } = deps;
  bot.command('hi',async ctx => {
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'hello',{reply_to_message_id:ctx.message.message_id})
  
  })
}

module.exports = registerHiCommand;

