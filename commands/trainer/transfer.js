function registerTransferCommand(bot, deps) {
  const { check, getUserData, saveUserData2, sendMessage, trainerlevel, he } = deps;
  bot.command('transfer',check ,async ctx => {
  
  const data = await getUserData(ctx.from.id)
  
  const reply = ctx.message.reply_to_message
  
  if(!reply || reply.from.id == ctx.from.id){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'Reply to a *User* to send *PokeCoins* 💷',{reply_to_message_id:ctx.message.message_id})
  
  return
  
  }
  
  const data2 = await getUserData(reply.from.id)
  
  if(!data2.inv){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*Start your journey now*',{reply_to_message_id:reply.message_id,
  
  reply_markup:{inline_keyboard:[[
  
  {text:'Start My Journey',url:'t.me/'+bot.botInfo.username+'?start=start',}]]}})
  
  return
  
  }
  
  const matchingLevels = Object.keys(trainerlevel).filter(level => data.inv.exp >= trainerlevel[level]);
  
  const level = matchingLevels.length > 0 ? parseInt(matchingLevels[matchingLevels.length - 1]) : undefined;
  
  if(level<7){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'You Have To Reach *7 Level* To Transfer PokeCoins 💷',{reply_to_message_id:ctx.message.message_id})
  
  return
  
  }
  
  const amount = Math.max(Math.floor(ctx.message.text.split(' ')[1]),1)
  
  if(!amount){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'Give a amount of *PokeCoins* 💷 Also',{reply_to_message_id:ctx.message.message_id})
  
  return
  
  }
  
  if(data.inv.pc < amount){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'You not have enough *PokeCoins* 💷',{reply_to_message_id:ctx.message.message_id})
  
  return
  
  }
  
  data.inv.pc -= amount
  
  data2.inv.pc += amount
  
  await saveUserData2(ctx.from.id,data)
  
  await saveUserData2(reply.from.id,data2)
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'HTML'},'Sent <b>'+amount+'</b> 💷 to <b>'+he.encode(reply.from.first_name)+'</b>',{reply_to_message_id:ctx.message.message_id})
  
  await sendMessage(ctx,-1003069884900,'#transfer\n\n<b>'+he.encode(ctx.from.first_name)+'</b> (<code>'+ctx.from.id+'</code>) sent <code>'+amount+'</code> 💷 to <b>'+he.encode(reply.from.first_name)+'</b> (<code>'+reply.from.id+'</code>)',{parse_mode:'HTML'})
  
  })
}

module.exports = registerTransferCommand;

