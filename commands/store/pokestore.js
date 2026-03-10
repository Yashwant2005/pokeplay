function registerPokestoreCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.command('pokestore',async ctx => {  
  const store2 = ['buy','tms','sell']  
  const store = store2.filter((storeitem)=>storeitem!='buy')  
  const buttons = store.map((word) => ({ text: c(word), callback_data: 'store_'+word+'_'+ctx.from.id+'' }));  
    const rows = [];  
    for (let i = 0; i < buttons.length; i += 2) {  
      rows.push(buttons.slice(i, i + 2));  
    }  
    
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},`*Welcome To Poke Store (Buy Section) 🏦 :-  
    
  ★ PokeBalls :-  
  • Regular Ball -* 15 💷  
  *• Great Ball -* 25 💷  
  *• Ultra Ball -* 40 💷  
  *• Repeat Ball -* 50 💷  
  *• Beast Ball -* 100 💷  
  *• Quick Ball -* 65 💷  
  *• Net Ball -* 45 💷  
  *• Nest Ball -* 55 💷  
    
  *★ Items :-*  
  *• Candy -* 100 💷  
  *• Berry -* 75 💷  
  *• Vitamin -* 100 💷  
  *• Key Stone -* 5000 💷  
    
  *Example :-*  
  • /buy regular 1  
  • /buy nest 5  
  • /buy candy 3  
  • /buy key  
    
  _Use /pokeballs To Get Details About PokeBalls._  
  _Use /buy To Buy From PokeStore_`,{reply_to_message_id:ctx.message.message_id,reply_markup:{inline_keyboard:rows}})  
  })
}

module.exports = registerPokestoreCommand;

