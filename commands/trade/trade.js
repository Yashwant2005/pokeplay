function registerTradeCommand(bot, deps) {
  const { check, getUserData, sendMessage, loadMessageData } = deps;
  bot.command('trade',check,async ctx => {
  
  const data = await getUserData(ctx.from.id)
  
  const reply = ctx.message.reply_to_message
  
  if(!reply || reply.from.id==ctx.from.id){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'Reply to a *User* to trade pokemon with them.',{reply_to_message_id:ctx.message.message_id})
  
  return
  
  }
  
  const mdata = await loadMessageData();
  
  if(mdata.battle.some(id => String(id) === String(ctx.from.id))){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'You Are In A *Battle*',{reply_to_message_id:ctx.message.message_id})
  
  return
  
  }
  
  if(mdata.battle.some(id => String(id) === String(reply.from.id))){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'Opponent Is In A *Battle*',{reply_to_message_id:ctx.message.message_id})
  
  return
  
  }
  
  
  
  const data2 = await getUserData(reply.from.id)
  
  if(!data2.inv){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*Start your journey now*',{reply_to_message_id:reply.message_id,
  
  reply_markup:{inline_keyboard:[[
  
  {text:'Start My Journey',url:'t.me/'+bot.botInfo.username+'?start=start',}]]}})
  
  return
  
  }
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'HTML'},'<a href="tg://user?id='+ctx.from.id+'"><b>'+data.inv.name+'</b></a> Wants To Trade A Pokemon With <a href = "tg://user?id='+reply.from.id+'"><b>'+data2.inv.name+'</b></a>.\n\n<a href = "tg://user?id='+reply.from.id+'"><b>'+data2.inv.name+'</b></a> do you accept it?',{reply_to_message_id:ctx.message.reply_to_message.message_id,reply_markup:{inline_keyboard:[[{text:'Accept',callback_data:'trade_'+ctx.from.id+'_'+reply.from.id+''},{text:'Decline',callback_data:'tradc_'+ctx.from.id+'_'+reply.from.id+''}]]}})
  
  })
}

module.exports = registerTradeCommand;

