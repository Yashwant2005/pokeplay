function registerUfbCommand(bot, deps) {
  const { sendMessage, banList2, saveBanList, admins } = deps;
  bot.command('ufb', async (ctx) => {
  
      const adminId = ctx.from.id;
  
      if (admins.includes(adminId)) { // Replace YOUR_ADMIN_ID with the actual adm>
  
  const reply = ctx.message.reply_to_message
  
  if(reply){
  
  var userId = String(reply.from.id)
  
  }else{
  
  var userId = ctx.message.text.split(' ')[1];
  
  }
  
          if (userId && (banList2.includes(String(userId)))) {
  
              const targetId = String(userId);
              for (let i = banList2.length - 1; i >= 0; i -= 1) {
                if (String(banList2[i]) === targetId) banList2.splice(i, 1);
              }
  
              saveBanList();
  
              await sendMessage(ctx,ctx.chat.id,`User ${userId} has unbanned.`);
  
  await sendMessage(ctx,-1003069884900,'*#BANUNBANLOG* \n`'+ctx.from.first_name+'` *UnBanned* `'+userId+'`',{parse_mode:'markdown'})
  
  } else {
  
  await sendMessage(ctx,ctx.chat.id,'Invalid user ID or user not banned.');
  
          }
  
  }
  
  });
}

module.exports = registerUfbCommand;
