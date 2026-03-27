function registerSortCommand(bot, deps) {
  const { commands, getUserData, saveUserData2, sendMessage, c, sort } = deps;
  commands.set('sort',async ctx => {
  
  if (ctx.message.chat.type != 'private') {
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'Use this command in *Private* to change pokemon *Sort Method.*',{reply_to_message_id:ctx.message.message_id,reply_markup:{inline_keyboard:[[{text:'Change',url:'t.me/'+bot.botInfo.username+'?start=sort'}]]}})
  
      return;
  
    }
  
  const data = await getUserData(ctx.from.id)
  
  if(!data.inv){
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},'*Start your journey now*',{reply_to_message_id:ctx.message.message_id,
  
  reply_markup:{inline_keyboard:[[
  
  {text:'Start My Journey',url:'t.me/PokePlayBot?start=start',}]]}})
  
  return
  
  }
  
  const items = ['order-caught','name','pokedex-number','level','category','iv-points','ev-points','hp-points','attack-points','defense-points',
  
  'special-attack-points','special-defense-points','speed-points','total-points']
  
  const inlineKeyboard = [];
  
    let row = [];
  
  let msg = '*How Would You Like To Sort Your Pokemons?*\n'
  
  for (let i = 0; i < items.length; i++) {
  
  msg += '\n*'+(i+1)+'.* '+c(items[i])+''
  
    row.push({
  
      text: `${i + 1}`,
  
      callback_data: `sort_${items[i]}`,
  
    });
  
  
  
    if ((i + 1) % 4 === 0 || i === items.length - 1) {
  
      inlineKeyboard.push(row);
  
      row = [];
  
    }
  
  }
  
  if(!data.extra){
  
  data.extra = {}
  
  }
  if(!data.extra.sort_order){
  data.extra.sort_order = 'desc'
  await saveUserData2(ctx.from.id,data)
  }
  
  const dis = data.extra.sort ? data.extra.sort : 'None'
  const ord = data.extra.sort_order == 'asc' ? 'Ascending' : 'Descending'
  
  msg += '\n\n*Currently Sorting :* '+c(dis)+''
  msg += '\n*Order :* '+ord+''
  inlineKeyboard.push([{text:'Order: '+ord,callback_data:'sortorder_toggle'}])
  
  await sendMessage(ctx,ctx.chat.id,{parse_mode:'markdown'},msg,{reply_markup:{inline_keyboard:inlineKeyboard}})
  
  })
}

module.exports = registerSortCommand;
