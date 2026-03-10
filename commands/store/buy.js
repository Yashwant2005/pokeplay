function registerBuyCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.command('buy',check,check2,async ctx => {  
  const messageData = await loadMessageData();  
  if(messageData.battle.includes(ctx.from.id)) {  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'You Are In A *Battle*',{reply_to_message_id:ctx.message.message_id})  
  return  
  }  
    
  const item2 = ctx.message.text.split(' ')[1]  
  if(!item2){  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*Usage:* /buy <item>',{reply_to_message_id:ctx.message.message_id})  
  return  
  }  
  const data = await getUserData(ctx.from.id)  
  if(item2.toLowerCase()=='card10'){  
  if(data.inv.pc < 1000){  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*You not have enough PokeCoins💷*',{reply_to_message_id:ctx.message.message_id})  
  return  
  }  
  if(!data.extra.unlocks){  
  data.extra.unlocks = []  
  }  
  if(data.extra.unlocks.includes('10')){  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'You already have bought *Template 10*',{reply_to_message_id:ctx.message.message_id})  
  return  
  }  
  data.extra.unlocks.push('10')  
  data.inv.pc -= 1000  
  await saveUserData2(ctx.from.id,data)  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'Bought *Template 10* For *1000* PokeCoins 💷',{reply_to_message_id:ctx.message.message_id})  
  await sendMessage(ctx,-1003069884900,'#buy\n\n<b>'+he.encode(ctx.from.first_name)+'</b> (<code>'+ctx.from.id+'</code>) bought <code>Template 10</code>',  
  {parse_mode:'HTML'})  
  return  
  }  
  if(item2.toLowerCase()=='key' || ctx.message.text.split(' ').slice(1).join(' ').toLowerCase()== 'key stone'){  
  const matchingLevels = Object.keys(trainerlevel).filter(level => data.inv.exp >= trainerlevel[level]);  
  const level = matchingLevels.length > 0 ? parseInt(matchingLevels[matchingLevels.length - 1]) : undefined;  
  if(level<25){  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'You Have To Reach *25 Level* To Buy Key Stone',{parse_mode:'markdown',reply_to_message_id:ctx.message.message_id})  
  return  
  }  
  if(data.inv.pc < 5000){  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*You not have enough PokeCoins💷*',{reply_to_message_id:ctx.message.message_id})  
  return  
  }  
  if(data.inv.ring){  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'You already have bought *Key Stone*',{reply_to_message_id:ctx.message.message_id})  
  return  
  }  
  data.inv.ring = true  
  data.inv.pc -= 5000  
  await saveUserData2(ctx.from.id,data)  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'Bought *Key Stone* For *5000* PokeCoins 💷',{reply_to_message_id:ctx.message.message_id})  
  await sendMessage(ctx,-1003069884900,'#buy\n\n<b>'+he.encode(ctx.from.first_name)+'</b> (<code>'+ctx.from.id+'</code>) bought <code>Mega Ring</code>',  
  {parse_mode:'HTML'})  
  return  
  }  
  if(item2.toLowerCase().includes('tm')){  
  const num = item2.toLowerCase().replace('tm','')  
  const matchingLevels = Object.keys(trainerlevel).filter(level => data.inv.exp >= trainerlevel[level]);  
  const level = matchingLevels.length > 0 ? parseInt(matchingLevels[matchingLevels.length - 1]) : undefined;  
  if(level < 35){  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'You Have To Reach *35 Level* To Unlock TMs Store',{parse_mode:'markdown',reply_to_message_id:ctx.message.message_id})  
  return  
  }  
  if(!tms.tmnumber[String(num)] || !tmprices.buy[String(num)]){  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*Invalid TM*',{reply_to_message_id:ctx.message.message_id})  
  return  
  }  
  if(!data.tms){  
  data.tms = {}  
  }  
  if(!data.tms[String(num)]){  
  data.tms[String(num)] = 0  
  }  
  const price = tmprices.buy[String(num)]  
  if(data.inv.pc < price){  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*You not have enough PokeCoins💷*',{reply_to_message_id:ctx.message.message_id})  
  return  
  }  
  data.tms[String(num)] += 1  
  data.inv.pc -= price  
  await saveUserData2(ctx.from.id,data)  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'Bought *TM'+num+'* For *'+price+'* PokeCoins 💷',{reply_to_message_id:ctx.message.message_id})  
  await sendMessage(ctx,-1003069884900,'#buy\n\n<b>'+he.encode(ctx.from.first_name)+'</b> (<code>'+ctx.from.id+'</code>) bought <code>TM'+num+'</code>',{parse_mode:'HTML'})  
  return  
  }  
  const Store2 = {  
  "vitamin":100,  
  "candy":100,  
  "berry":75  
  }  
  const amount = Math.max(Math.floor(ctx.message.text.split(' ')[2]),0)  
  if(!amount){  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*Usage:* /buy <item> <amount>',{reply_to_message_id:ctx.message.message_id})  
  return  
  }  
  if(isNaN(amount)){  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*Invalid amount*',{reply_to_message_id:ctx.message.message_id})  
  return  
  }  
  for(const item in Store2){  
  if(item2.toLowerCase()== item){  
  const price = Store2[item]  
  const pay = amount*price  
  if(pay>data.inv.pc){  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*You not have enough PokeCoins💷*',{reply_to_message_id:ctx.message.message_id})  
  return  
  }  
  data.inv.pc -= pay  
  if(!data.inv[item]){  
  data.inv[item] = 0  
  }  
  data.inv[item] += amount  
  await saveUserData2(ctx.from.id,data)  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'Bought *'+amount+'* '+c(item)+' for *'+pay+'* PokeCoins 💷',{reply_to_message_id:ctx.message.message_id})  
  await sendMessage(ctx,-1003069884900,'#buy\n\n<b>'+he.encode(ctx.from.first_name)+'</b> (<code>'+ctx.from.id+'</code>) bought <code>'+amount+' '+c(item)+'</code>',{parse_mode:'HTML'})  
  return  
  }  
  }  
  let Store = {  
  "regular":15,  
  "great":25,  
  "ultra":40,  
  "repeat":50,  
  "beast":100,  
  "quick":65,  
  "net":45,  
  "nest":55  
  }  
  if(ctx.from.id==6663592560){  
  Store["master"] = 1  
  }  
  for(const item in Store){  
  if(item2.toLowerCase()== item){  
  const price = Store[item]  
  const pay = amount*price  
  if(pay>data.inv.pc){  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*You not have enough PokeCoins💷*',{reply_to_message_id:ctx.message.message_id})  
  return  
  }  
  data.inv.pc -= pay  
  if(!data.balls){  
  data.balls = {}  
  }  
  if(!data.balls[item]){  
  data.balls[item] = 0  
  }  
  data.balls[item] += amount  
  await saveUserData2(ctx.from.id,data)  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'Bought *'+amount+'* '+c(item)+' Balls for *'+pay+'* PokeCoins 💷',{reply_to_message_id:ctx.message.message_id})  
  await sendMessage(ctx,-1003069884900,'#buy\n\n<b>'+he.encode(ctx.from.first_name)+'</b> (<code>'+ctx.from.id+'</code>) bought <code>'+amount+' '+c(item)+'</code>',{parse_mode:'HTML'})  
  return  
  }  
  }  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*Invalid item*',{reply_to_message_id:ctx.message.message_id})  
  })
}

module.exports = registerBuyCommand;

