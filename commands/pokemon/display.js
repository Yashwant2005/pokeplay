function registerDisplayCommand(bot, deps) {
  const { commands, getUserData, sendMessage, c } = deps;
  commands.set('display',async (ctx) => {
  
  if (ctx.message.chat.type != 'private') {
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'Use this command in *Private* to change pokemon *Display Detail.*',{reply_to_message_id:ctx.message.message_id,reply_markup:{inline_keyboard:[[{text:'Change',url:'t.me/'+bot.botInfo.username+'?start=display'}]]}})
  
      return;
  
    }
  
  const data = await getUserData(ctx.from.id)
  
  if(!data.inv){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*Start your journey now*',{reply_to_message_id:ctx.message.message_id,
  
  reply_markup:{inline_keyboard:[[
  
  {text:'Start My Journey',url:'t.me/PokePlayBot?start=start',}]]}})
  
  return
  
  }
  
  const items = ['none','level','nature','type','type-symbol','category','iv-points','ev-points','hp-points','attack-points','defense-points',
  
  'special-attack-points','special-defense-points','speed-points','total-points']
  
  const inlineKeyboard = [];
  
    let row = [];
  
  let msg = '*Which Pokemom Detail You Wanna Display?*\n'
  
  for (let i = 0; i < items.length; i++) {
  
  msg += '\n*'+(i+1)+'.* '+c(items[i])+''
  
    row.push({
  
      text: `${i + 1}`,
  
      callback_data: `display_${items[i]}`,
  
    });
  
  
  
    if ((i + 1) % 4 === 0 || i === items.length - 1) {
  
      inlineKeyboard.push(row);
  
      row = [];
  
    }
  
  }
  
  if(!data.extra){
  
  data.extra = {}
  
  }
  
  const dis = data.extra.display ? data.extra.display : 'None'
  
  msg += '\n\n*Currently Displaying :* '+c(dis)+''
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},msg,{reply_markup:{inline_keyboard:inlineKeyboard}})
  
  })
}

module.exports = registerDisplayCommand;

