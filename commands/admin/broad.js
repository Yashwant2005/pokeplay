function registerBroadCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.command('broad', async (ctx) => {  
  if(!admins.includes(ctx.from.id)){  
  return  
  }  
    const message = ctx.message.reply_to_message  
    if (!message) {  
      return await sendMessage(ctx,ctx.chat.id,'Please reply to a message to use this command.');  
    }  
    
    // Start the message forwarding process  
    forwardMessageToAllUsers(ctx, message.message_id,message.chat.id);  
  });
}

module.exports = registerBroadCommand;

