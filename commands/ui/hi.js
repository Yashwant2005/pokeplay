function registerHiCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.command('hi',async ctx => {  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'hello',{reply_to_message_id:ctx.message.message_id})  
  })
}

module.exports = registerHiCommand;

