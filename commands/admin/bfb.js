function registerBfbCommand(bot, deps) {
  const { sendMessage, banList2, saveBanList, admins35 } = deps;
  bot.command('bfb', async (ctx) => {
  
      const adminId = ctx.from.id;
  
      if (admins35.includes(adminId)) { // Replace YOUR_ADMIN_ID with the actual adm>
  
  const reply = ctx.message.reply_to_message
  
  if(reply){
  
  var userId = reply.from.id
  
  }else{
  
  var userId = ctx.message.text.split(' ')[1];
  
  if(isNaN(userId)){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*Give User ID Not Username Etc.*')
  
  return
  
  }
  
  }
  
          if (userId && !banList2.includes(userId) && !banList2.includes(String(userId),)) {
  
              banList2.push(String(userId));
  
              saveBanList();
  
              await sendMessage(ctx,ctx.chat.id,`User ${userId} has banned`);
  
  await sendMessage(ctx,-1003069884900,'*#BANUNBANLOG* \n`'+ctx.from.first_name+'` *Banned* `'+userId+'`',{parse_mode:'markdown'})
  
          } else {
  
              await sendMessage(ctx,ctx.chat.id,'Invalid user ID or user already banned.');
  
          }
  
      }
  
  });
}

module.exports = registerBfbCommand;

