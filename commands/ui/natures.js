function registerNaturesCommand(bot, deps) {
  const { sendMessage, chart } = deps;
  bot.command('natures',async ctx => {
  
  await sendMessage(ctx,ctx.chat.id,'https://graph.org/file/6ef6229eae43a84f188c1.jpg',{caption:'All available *Pokemon Natures* chart',parse_mode:'markdown',reply_to_message_id:ctx.message.message_id})
  
  })
}

module.exports = registerNaturesCommand;

