function registerPokeballsCommand(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  bot.command('pokeballs',async ctx => {  
  const balls = JSON.parse(fs.readFileSync('data/balls.json', 'utf8'));  
  const bt = Object.keys(balls)  
  const buttons = bt.map((word) => ({ text: c(word), callback_data: 'pkbl:'+word+':'+ctx.from.id+'' }))  
    const rows = [];  
    for (let i = 0; i < buttons.length; i += 4) {  
      rows.push(buttons.slice(i, i + 4));  
  }  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'Here is the list of following *PokeBalls* available in *PokePlay.*',{reply_to_message_id:ctx.message.message_id,reply_markup:{inline_keyboard:rows}})  
  })
}

module.exports = registerPokeballsCommand;

