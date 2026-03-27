function registerOpenCommand(bot, deps) {
  const { sendMessage } = deps;
  bot.command('open',async ctx => {
  
  if(ctx.chat.type!='private'){
  
  return
  
  }
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*Opening Keyboard.....*',{reply_markup:{keyboard:[['/hunt','/close']],resize_keyboard:true}})
  
  })
}

module.exports = registerOpenCommand;

