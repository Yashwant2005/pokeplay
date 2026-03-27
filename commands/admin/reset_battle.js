function registerResetBattleCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.command('reset_battle',async ctx => {
  
  const data = await loadMessageData()
  
  if(data.battle.some(id => String(id) === String(ctx.from.id))){
  
  for(const a in data){
  
  if(data[a].times && (data[a].turn == ctx.from.id || data[a].oppo == ctx.from.id)){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'Your One *Multiplayer Battle* Is Going On',{reply_to_message_id:ctx.message.message_id})
  
  return
  
  }
  
  }
  
  if(data[ctx.from.id]){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'Your One *Hunt Battle* Is Going On',{reply_to_message_id:ctx.message.message_id})
  
  return
  
  }
  
  data.battle = data.battle.filter((u)=>u!==ctx.from.id)
  
  await saveMessageData(data)
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'Your *Battle Bug* Has Fixed.',{reply_to_message_id:ctx.message.message_id})
  
  }else{
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'Your *Battle Bug* Doesn\'t Seems Active.',{reply_to_message_id:ctx.message.message_id})
  
  }
  
  })
}

module.exports = registerResetBattleCommand;

