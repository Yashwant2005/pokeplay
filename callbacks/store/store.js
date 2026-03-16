function register_043_store(bot, deps) {
  Object.assign(globalThis, deps, { bot });
  const {
    getDaysUntilWeeklyReset,
    getTmLpPrice,
    getWeeklyTmShop,
    refreshWeeklyTmShop,
    hasPurchasedSlotThisWeek,
    markPurchasedSlotThisWeek,
  } = require('../../utils/weekly_tm_shop');

  const buildWeeklyTmMessage = (ctx, data, page) => {
    const shop = getWeeklyTmShop(data, ctx.from.id, tms, tmprices)
    const total = shop.selection.length
    const perPage = 5
    const maxPage = Math.max(1, Math.ceil(total / perPage))
    const safePage = Math.min(maxPage, Math.max(1, Number(page || 1)))
    const start = (safePage - 1) * perPage
    const view = shop.selection.slice(start, start + perPage)
    const boughtCount = shop.selection.filter((tm) => hasPurchasedSlotThisWeek(data, tm)).length
    const daysLeft = getDaysUntilWeeklyReset(shop.weekKey)
    const lines = []
    lines.push('<b>【 TMS 】</b>')
    lines.push('')

    let idx = start + 1
    for (const t of view) {
      const m = tms.tmnumber[String(t)]
      if (!m) continue
      const lp = getTmLpPrice(t, tmprices)
      const bought = hasPurchasedSlotThisWeek(data, t)
      lines.push('<b>TM #'+String(t).padStart(3, '0')+'</b>')
      lines.push(c(dmoves[m].name))
      lines.push('────────────')
      lines.push('Type: '+emojis[dmoves[m].type]+' '+c(dmoves[m].type))
      lines.push('Category: '+c(dmoves[m].category))
      lines.push('Power: '+dmoves[m].power)
      lines.push('Accuracy: '+dmoves[m].accuracy)
      lines.push('Price: '+lp+' ⭐'+(bought ? ' [Bought]' : ''))
      lines.push('')
      idx += 1
    }

    if(!Number.isFinite(data.inv.pc)) data.inv.pc = 0
    if(!Number.isFinite(data.inv.league_points)) data.inv.league_points = 0
    lines.push('Store expires in '+daysLeft+' day'+(daysLeft === 1 ? '' : 's'))
    lines.push('Your PokeCoins: '+data.inv.pc+' 💷')
    lines.push('Your League Points: '+data.inv.league_points+' ⭐')
    lines.push('Page '+safePage+'/'+maxPage+' | Bought: '+boughtCount+'/10')

    return {
      text: lines.join('\n'),
      shop,
      page: safePage,
      maxPage,
    }
  }

  const buildWeeklyTmKeyboard = (ctx, data, shop, page, maxPage) => {
    const perPage = 5
    const start = (page - 1) * perPage
    const view = shop.selection.slice(start, start + perPage)
    const buyRows = []
    const row = []
    for (const t of view) {
      const bought = hasPurchasedSlotThisWeek(data, t)
      const label = bought ? 'TM'+t+'✓' : 'TM'+t
      const cb = bought
        ? 'crncl'
        : 'tmbuylp_'+t+'_'+ctx.from.id
      row.push({text: label, callback_data: cb})
    }
    if(row.length > 0) buyRows.push(row)

    buyRows.push([
      {text:'<',callback_data:'store_tms_'+ctx.from.id+'_'+Math.max(1, page-1)},
      {text:'Page '+page+'/'+maxPage,callback_data:'crncl'},
      {text:'>',callback_data:'store_tms_'+ctx.from.id+'_'+Math.min(maxPage, page+1)}
    ])

    buyRows.push([{text:'Refresh Weekly TMs (10000 PC)',callback_data:'tmrefresh_'+ctx.from.id}])

    const store2 = ['buy','tms','sell']
    const store = store2.filter((storeitem)=>storeitem!='tms')
    const buttons = store.map((word) => ({ text: c(word), callback_data: 'store_'+word+'_'+ctx.from.id+'' }))
    for (let i = 0; i < buttons.length; i += 2) {
      buyRows.push(buttons.slice(i, i + 2))
    }
    return buyRows
  }

  bot.action(/store_/,async ctx => {
const item = ctx.callbackQuery.data.split('_')[1]
const id = ctx.callbackQuery.data.split('_')[2]
if(ctx.from.id!=id){
return
}
if(item=='sell'){
const store2 = ['buy','tms','sell']
const store = store2.filter((storeitem)=>storeitem!=item)
const buttons = store.map((word) => ({ text: c(word), callback_data: 'store_'+word+'_'+ctx.from.id+'' }));
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,`*Welcome To Poke Store (Sell Section) 🏦 :-

★ PokeBalls :-
• Regular Ball -* 7 💷
*• Great Ball -* 12 💷
*• Ultra Ball -* 20 💷 
*• Repeat Ball -* 25 💷
*• Beast Ball -* 50 💷
*• Quick Ball -* 40 💷
*• Net Ball -* 25 💷
*• Nest Ball -* 30 💷
*• Friend Ball -* 25 💷
*• Level Ball -* 25 💷
*• Moon Ball -* 35 💷
*• Sport Ball -* 15 💷
*• Luxury Ball -* 10 💷
*• Premier Ball -* 8 💷
*• Park Ball -* 75 💷
*• Master Ball -* 3000 💷

*★ Items :-*
*• Candy -* 50 💷
*• Berry -* 40 💷
*• Vitamin -* 50 💷
*• Item -* 5000 💷

*Example :-*
• /sell regular 1
• /sell candy 1
• /sell items
• /sell master 1

_Use /pokeballs To Get Details About PokeBalls._
_Use /sell To Sell Item To PokeStore_`,{parse_mode:'markdown',
reply_markup:{inline_keyboard:rows}})
}

if(item=='buy'){
const store2 = ['buy','tms','sell']
const store = store2.filter((storeitem)=>storeitem!=item)
const buttons = store.map((word) => ({ text: c(word), callback_data: 'store_'+word+'_'+ctx.from.id+'' }));
  const rows = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,`*Welcome To Poke Store (Buy Section) 🏦 :-

★ PokeBalls :-
• Regular Ball -* 15 💷
*• Great Ball -* 25 💷
*• Ultra Ball -* 40 💷
*• Repeat Ball -* 50 💷@
*• Beast Ball -* 100 💷
*• Quick Ball -* 65 💷
*• Net Ball -* 45 💷
*• Nest Ball -* 55 💷

*★ Items :-*
*• Candy -* 100 💷
*• Berry -* 75 💷
*• Vitamin -* 100 💷
*• OmniRing -* 5000 💷

*Example :-*
• /buy regular 1
• /buy nest 5
• /buy candy 3
• /buy key

_Use /pokeballs To Get Details About PokeBalls._
_Use /buy To Buy From PokeStore_`,{parse_mode:'markdown',
reply_markup:{inline_keyboard:rows}})
}
if(item=='tms'){
const page = ctx.callbackQuery.data.split('_')[3]*1 || 1
const userData = await getUserData(ctx.from.id)
if(!userData.tms) userData.tms = {}
const built = buildWeeklyTmMessage(ctx, userData, page)
const key = buildWeeklyTmKeyboard(ctx, userData, built.shop, built.page, built.maxPage)
await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,built.text,{parse_mode:'html',reply_markup:{inline_keyboard:key}})
}
})

  bot.action(/tmrefresh_/, async ctx => {
    const id = ctx.callbackQuery.data.split('_')[1]
    if(ctx.from.id!=id){
      return
    }

    const data = await getUserData(ctx.from.id)
    if(!Number.isFinite(data.inv.pc)) data.inv.pc = 0
    if(data.inv.pc < 10000){
      ctx.answerCbQuery('Need 10000 PokeCoins to refresh weekly TMs', {show_alert:true})
      return
    }

    data.inv.pc -= 10000
    if(!data.tms) data.tms = {}
    refreshWeeklyTmShop(data, ctx.from.id, tms, tmprices)
    await saveUserData2(ctx.from.id, data)

    const built = buildWeeklyTmMessage(ctx, data, 1)
    const key = buildWeeklyTmKeyboard(ctx, data, built.shop, built.page, built.maxPage)
    await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,built.text,{parse_mode:'html',reply_markup:{inline_keyboard:key}})
    ctx.answerCbQuery('Weekly TM list refreshed')
  })

  bot.action(/tmbuylp_/, async ctx => {
    const parts = ctx.callbackQuery.data.split('_')
    const tm = String(parts[1])
    const id = parts[2]
    if(ctx.from.id!=id){
      return
    }

    const data = await getUserData(ctx.from.id)
    if(!data.tms) data.tms = {}
    const shop = getWeeklyTmShop(data, ctx.from.id, tms, tmprices)
    if(!shop.selection.includes(tm)){
      ctx.answerCbQuery('This TM is not in your weekly list', {show_alert:true})
      return
    }

    if(hasPurchasedSlotThisWeek(data, tm)){
      ctx.answerCbQuery('This weekly TM slot is already used', {show_alert:true})
      return
    }

    if(!Number.isFinite(data.inv.league_points)) data.inv.league_points = 0
    const lp = getTmLpPrice(tm, tmprices)
    if(data.inv.league_points < lp){
      ctx.answerCbQuery('Not enough League Points', {show_alert:true})
      return
    }

    data.inv.league_points -= lp
    data.tms[tm] = Number(data.tms[tm] || 0) + 1
    markPurchasedSlotThisWeek(data, tm)
    await saveUserData2(ctx.from.id, data)

    const built = buildWeeklyTmMessage(ctx, data, 1)
    const key = buildWeeklyTmKeyboard(ctx, data, built.shop, built.page, built.maxPage)
    await editMessage('text',ctx,ctx.chat.id,ctx.callbackQuery.message.message_id,built.text,{parse_mode:'html',reply_markup:{inline_keyboard:key}})
    ctx.answerCbQuery('Bought TM'+tm+' for '+lp+' LP')
  })
}

module.exports = register_043_store;

