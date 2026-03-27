let isBroadcasting = false;

function registerBroadCommand(bot, deps) {
  const { sendMessage, admins, forwardMessageToAllUsers } = deps;
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
    await sendMessage(ctx, ctx.chat.id, 'Broadcast started in background.');
    forwardMessageToAllUsers(ctx, message.message_id, message.chat.id)
      .catch((error) => {
        console.error('Broadcast failed:', error);
      })
      .finally(() => {
        isBroadcasting = false;
      });
  });
}

module.exports = registerBroadCommand;

