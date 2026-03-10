function registerReferralCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.command('referral',check,async ctx => {  
  const data = await getUserData(ctx.from.id)  
  if(!data.extra.refer){  
  data.extra.refer = []  
  }  
  const msg = `**Hey Pokemon Fans, Introducing Pokemon Bot In Which Kanto, Jhoto, Hoenn, Hisui, Unova, Kalos , Alola, Galar And Paldea Region There.**  
  **• You Can Catch Legendary Pokes Too And Battle With Your Friends.**  
  **• All Pokemon Data Are Related To Gen 7 & 8 & 9. You Can Enjoy This Bot Given Below.**  
  **• Click On My Link To Get Bonus Of 1000 Pokecoins.**  
    
  __• Start your Pokemon journey now and hunt for Pokemon and battle with your friends.__  
  **https://t.me/${bot.botInfo.username}?start=ref_${ctx.from.id}**  
    
  **Updates Channel :-** @PokePlayGame  
  **Main Chat :-** @PokePlayChat  
    
  **Thank You ~ ( ╹▽╹ )**`;  
    
  const encodedUrl = encodeURIComponent(msg);  
    
  if(ctx.chat.type=='private'){  
  var key = [[{text:'Share Url',url:'tg://msg_url?text=' + encodedUrl},{text:'Get Url',callback_data:'refurl_'+ctx.from.id}]];  
    
  }else{  
  var key = [[{text:'Get Url',callback_data:'refurl_'+ctx.from.id+''}]]  
  }  
    
  const rf = data.refers || 0  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},`Share your below *Referral Link* with your friends and receive a reward of *500 PC 💷* for every player invited who reaches *Level 20.*  
    
  *Also:*  
  • Every *3 Refer*, you will get *5 Random Balls*  
  • Every *8 Refer*, you will get *1 TM* and *1k PC 💷* and *1 Safari Pass*  
  • Every *13 Refer*, you will get *3 TM* and *3k PC 💷* and *1 Safari Pass*  
  • Every *22 Refer*, you will get *1 Transfomational Item* and *1 Legendary Poke* and *1 Master Ball*  
    
  *Successfully Invited :* ${rf}`,{reply_to_message_id:ctx.message.message_id,reply_markup:{inline_keyboard:key}})  
    
  })
}

module.exports = registerReferralCommand;

