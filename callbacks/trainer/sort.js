function register_072_sort(bot, deps) {
  const { getUserData, saveUserData2, editMessage, c, sort } = deps;
  async function renderSortMenu(ctx, messageId) {
    const data = await getUserData(ctx.from.id)
    if(!data.extra){
      data.extra = {}
    }
    if(!data.extra.sort){
      data.extra.sort = 'none'
    }
    if(!data.extra.sort_order){
      data.extra.sort_order = 'desc'
    }
    await saveUserData2(ctx.from.id,data)

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

      if ((i+ 1) % 4 === 0 || i === items.length - 1) {
        inlineKeyboard.push(row);
        row = [];
      }
    }

    const dis = data.extra.sort ? data.extra.sort : 'None'
    const ord = data.extra.sort_order == 'asc' ? 'Ascending' : 'Descending'
    msg += '\n\n*Currently Sorting :* '+c(dis)+''
    msg += '\n*Order :* '+ord+''
    inlineKeyboard.push([{text:'Order: '+ord,callback_data:'sortorder_toggle'}])

    await editMessage('text',ctx,ctx.chat.id,messageId,msg,{reply_markup:{inline_keyboard:inlineKeyboard},parse_mode:'markdown'})
  }

  bot.action(/sort_/,async ctx => {
    const item = ctx.callbackQuery.data.split('_')[1]
    const data = await getUserData(ctx.from.id)
    if(!data.extra){
      data.extra = {}
    }
    if(!data.extra.sort){
      data.extra.sort = 'none'
    }
    if(!data.extra.sort_order){
      data.extra.sort_order = 'desc'
    }
    if(data.extra.sort!=item){
      data.extra.sort = item
      await saveUserData2(ctx.from.id,data)
    }
    await renderSortMenu(ctx,ctx.callbackQuery.message.message_id)
  })

  bot.action('sortorder_toggle',async ctx => {
    const data = await getUserData(ctx.from.id)
    if(!data.extra){
      data.extra = {}
    }
    if(!data.extra.sort_order || data.extra.sort_order=='desc'){
      data.extra.sort_order = 'asc'
    }else{
      data.extra.sort_order = 'desc'
    }
    await saveUserData2(ctx.from.id,data)
    await renderSortMenu(ctx,ctx.callbackQuery.message.message_id)
  })
}

module.exports = register_072_sort;
