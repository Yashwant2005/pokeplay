let isBroadcasting = false;

function registerBroadCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.command('broad', async (ctx) => {  
  if(!admins.includes(ctx.from.id)){  
  return  
  }  
    if (isBroadcasting) {
      await sendMessage(ctx, ctx.chat.id, 'A broadcast is already running. Please wait.');
      return;
    }

    const message = ctx.message.reply_to_message
    if (!message) {  
      return await sendMessage(ctx,ctx.chat.id,'Please reply to a message to use this command.');  
    }  
    
    // Start the message forwarding process  
    isBroadcasting = true;
    try {
      await sendMessage(ctx, ctx.chat.id, 'Broadcast started.');
      await forwardMessageToAllUsers(ctx, message.message_id, message.chat.id);
    } finally {
      isBroadcasting = false;
    }
  });
}

module.exports = registerBroadCommand;

