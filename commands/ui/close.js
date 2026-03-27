function registerCloseCommand(bot, deps) {
  const { session, sendMessage } = deps;
  bot.command('close',async ctx => {
  
  ctx.session.key = false
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*Closing Keyboard...*',{reply_markup:{remove_keyboard:true}})
  
  })
}

module.exports = registerCloseCommand;

