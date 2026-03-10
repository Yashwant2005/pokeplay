function registerAddBandCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.command('add_band',async ctx => {  
  if(admins.includes(ctx.from.id)){  
  const amount = ctx.message.text.split(' ')[1]  
  const rarity = ctx.message.text.split(' ')[2]  
  if(!rarity || !amount){  
  return  
  }  
  gma = amount*1  
  rar = rarity*1  
  }  
  })
}

module.exports = registerAddBandCommand;

