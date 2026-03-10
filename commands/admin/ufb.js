function registerUfbCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });
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
              banList2 = banList2.filter((id) => id !== userId);  
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

