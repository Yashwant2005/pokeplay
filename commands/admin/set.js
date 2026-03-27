function registerSetCommand(bot, deps) {
  const { sendMessage, fs, appr } = deps;
  bot.command('set',async ctx => {
  
  if(appr.includes(ctx.from.id)){
  
  const bslls = JSON.parse(fs.readFileSync('data/balls.json', 'utf8'));
  
  const name = ctx.message.text.split(' ')[1]
  
  const link = ctx.message.text.split(' ')[2]
  
  if(!name || !link){
  
  await sendMessage(ctx,ctx.chat.id,'Wrong Format')
  
  return
  
  }
  
  if(!bslls[name]){
  
  await sendMessage(ctx,ctx.chat.id,'Wrong Name')
  
  return
  
  }
  
  bslls[name].image = link
  
  fs.writeFileSync('./data/balls.json', JSON.stringify(bslls,null,2), 'utf8');
  
  await sendMessage(ctx,ctx.chat.id,'done')
  
  }
  
  })
}

module.exports = registerSetCommand;

