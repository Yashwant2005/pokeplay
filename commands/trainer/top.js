function registerTopCommand(bot, deps) {
  const { sendMessage, admins, getAllUserData, getTopUsers } = deps;
  bot.command('top', async (ctx) => {
  
  if(!admins.includes(ctx.from.id)){
  
  return
  
  }
  
    if (ctx.message.chat.type != 'private') {
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*Use in private to get top users list*',{reply_to_message_id:ctx.message.message_id})
  
      return;
  
    }
  
    const allUserData = await getAllUserData();
  
  
  
    if (allUserData.length > 0) {
  
      const attribute = 'vp'
  
      const topUsers = await getTopUsers(allUserData, attribute, 5); // Change '10' to the desired number of top users
  
  
  
      let text = `Top <b>5 Users</b>\n\n`;
  
      topUsers.forEach((userData, index) => {
  
        text += `<b>#${index + 1}:</b>\n`;
  
        text += `<b>User:</b> ${userData.data.inv.name}\n`;
  
        text += `<b>Victory Points:</b> ${userData.data.inv[attribute] || 0}\n\n`;
  
      });
  
  
  
      await sendMessage(ctx,ctx.chat.id,{parse_mode:'HTML'},text)
  
    } else {
  
      await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'No user data found.');
  
    }
  
  });
}

module.exports = registerTopCommand;

